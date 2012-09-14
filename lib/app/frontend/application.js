(function() {
  Application = function Application() {
    // Contains all the active components
    this.components = [];
    // Components listening to events
    this.componentsByEvents = {};
    // Contains the connection to the server
    this.connection = null;
    // All current servers
    this.servers = [];
    // Current selected server view
    this.currentSelectedServer = null;
  }

  Application.prototype.start = function start() {
    // Boot up the webservice connection
    this.connection = new ConnectionHandler(document.URL, 'stats');
    this.connection.on("error", _handleWebsocketError(this));
    this.connection.on("connect", _handleWebsocketConnect(this));

    // Set up application specific event handler
    _setupApplicationHandlers(this);
    // Set up ui handlers
    _setupUIhandlers(this);

    // Start connection
    this.connection.start();
    return this;
  }

  Application.prototype.addComponent = function(component) {
    // Push to list of components
    this.components.push(component);
    // Add to agent handlers
    var listensTo = component.listensTo();
    // Add the component to the list for all events
    for(var key in listensTo) {
      // Create a list if none
      if(this.componentsByEvents[key] == null) this.componentsByEvents[key] = [];
      // Add the component
      this.componentsByEvents[key].push(component);
    }
  }

  Application.prototype.removeComponent = function(component) {
    var index = this.components.indexOf(component);

    if(index != -1)
      this.components.splice(index, 1);

    // Add to agent handlers
    var listensTo = component.listensTo();
    for(var key in listensTo) {
      index = this.componentsByEvents[key].indexOf(component);

      if(index != -1)
        this.componentsByEvents[key].splice(index, 1);
    }
  }

  /***********************************************************************
   * Application logic
   **********************************************************************/
  Application.prototype.authorized = function(self) {
    return function(message) {
      // Store the session id for the app (used for all outgoing messages)
      if(message && message.session_id) {
        self.connection.sessionId = message.session_id;
        // Fire off a list command to retrieve a list of available servers
        self.connection.list();
      }
    }
  }

  Application.prototype.list = function(self) {
    return function(message) {
      // Clean out all the message from the ul if any
      $('#unsubscribed_list li').remove();
      $('#subscribed_list li').remove();

      // Add the subscriptions nedded
      this.unsubscriptionlist = $('#unsubscribed_list');
      this.unsubscriptionlist.append('<li class="nav-header">Unsubscribed</li>');
      _addServers(self, this.unsubscriptionlist, message.unsubscribed || [], false);

      // Add the subscriptions nedded
      this.subscriptionlist = $('#subscribed_list');
      this.subscriptionlist.append('<li class="nav-header">Subscribed</li>');
      _addServers(self, this.subscriptionlist, message.subscribed || [], true);
    }
  }

  var _addServers = function(self, list, listObjects, subscribed) {
    for(var i = 0; i < listObjects.length; i++) {
      var object = listObjects[i];
      var server = new Server(object.address, object.arch, object.platform, subscribed);
      // Add to the list of servers available
      self.servers.push(server);
      // Render the item
      list.append(server.toListItem());
      // Set up handlers for the server item
      server.setHandlers();
      // Subscribe handler
      server.on("subscribe", function() {
        // Move from unsubscribe to subscribed colum
        var li = $("#unsubscribed_list li[id='" + this.id + "']");
        // Add the li to the subscribed list
        $("#subscribed_list").append(li);
        // Set the item
        $("#unsubscribed_list li").removeClass("active");
        // Fire off a server subscribe message
        self.connection.subscribe(this);
      });

      // Unsubscribe handler
      server.on("unsubscribe", function() {
        // Move from unsubscribe to subscribed colum
        var li = $("#subscribed_list li[id='" + this.id + "']");
        // Add the li to the subscribed list
        $("#unsubscribed_list").append(li);
        // Fire off a server subscribe message
        self.connection.unsubscribe(this);
      });

      // Set the click handler
      var clickHandler = function(serverObject) {
        return function(_server) {
          // Remove all the other items being marked
          $("#subscribed_list li").removeClass("active");
          $("#unsubscribed_list li").removeClass("active");
          // Check in what list we are
          if($("#subscribed_list li[id='" + this.id + "']").length > 0) {
            // if we don't have the class
            if(!$(_server).hasClass("active"))
              $(_server).addClass("active");
          }

          // Set the server name
          $("#server_name").text("Server: " + serverObject.address);
          // Reset the components
          _resetComponents(self);
          // Set current server
          self.currentSelectedServer = serverObject.address;
        }
      }

      // Handle the click on the server item
      server.on("click", clickHandler(server));
    }
  }

  var _resetComponents = function(self) {
    // Adjust the size of the graph ?
    self.removeComponent(self.statisticsComponent)
    // Remove the component physically
    self.statisticsComponent.remove();
    // Create a new one
    self.statisticsComponent = new StatisticsComponent("metrics");
    self.addComponent(self.statisticsComponent);
  }

  var _setServerStatus = function(self, message) {
    // Server addresss
    var serverAddress = message.info.net.address;
    // Set the server up
    for(var i = 0; i < self.servers.length; i++) {
      if(self.servers[i].address == serverAddress) {
        if(self.servers[i].status != "running") self.servers[i].setRunning();
        break;
      }
    }
  }

  // Application.prototype.messages_pause = function(self) {
  //   return function(message) {
  //     console.log("=============================================== messages_pause")
  //   }
  // }

  // Application.prototype.messages_resume = function(self) {
  //   return function(message) {
  //     console.log("=============================================== messages_resume")
  //   }
  // }

  // Application.prototype.new_server = function(self) {
  //   return function(message) {
  //     console.log("=============================================== new_server")
  //   }
  // }

  // Application.prototype.subscribe_ack = function(self) {
  //   return function(message) {
  //     console.log("=============================================== subscribe_ack")
  //   }
  // }

  // Application.prototype.unsubscribe_ack = function(self) {
  //   return function(message) {
  //     console.log("=============================================== unsubscribe_ack")
  //   }
  // }

  Application.prototype.data = function(self) {
    return function(message) {
      // console.log("=========================== agent :: " + message.info.agent)
      // Set server status if applicable
      _setServerStatus(self, message);
      // Check if we have the right server
      if(self.currentSelectedServer != message.info.net.address) return;
      // Message
      if(message.info && self.componentsByEvents[message.info.agent]) {
        var components = self.componentsByEvents[message.info.agent];
        // Route the message to all listening components
        for(var i = 0; i < components.length; i++) {
          components[i].data(message);
        }
      }
    }
  }

  /***********************************************************************
   * Describes a server
   **********************************************************************/
  var Server = function(address, arch, platform, subscribed) {
    EventEmitter.call(this);
    // Set the variables
    this.id = "_server" + Server.counter++;
    this.address = address;
    this.arch = arch
    this.platform = platform
    this.status = null;
    this.subscribed = subscribed
  }

  Server.counter = 0;

  inherits(Server, EventEmitter);

  Server.prototype.listItemContent = function(li) {
    // Add items
    li.push("<a href='#'>");
    li.push("<input type='checkbox' " + (this.subscribed ? "checked" : "") + "/>");
    li.push(this.address);
    // Set the status of the server
    switch(this.status) {
      case null:
        li.push('<img src="/img/knobs/Knob%20Grey.png" width="15" height="15" class="status"/>');
        break;
      case 'running':
        li.push('<img src="/img/knobs/Knob%20Green.png" width="15" height="15" class="status"/>');
        break;
      case 'stopped':
        li.push('<img src="/img/knobs/Knob%20Red.png" width="15" height="15" class="status"/>');
        break;
    }

    // Set status of the server
    switch(this.platform) {
      case 'darwin':
        li.push('<img src="/img/os/osx.png" width="15" height="15" class="os"/>');
        break;
      case 'linux':
        li.push('<img src="/img/os/linux.png" width="15" height="15" class="os"/>');
        break;
    }
    li.push("</a>");
    return li;
  }

  Server.prototype.setHandlers = function() {
    var self = this;
    // The checkbox
    $('#' + this.id + " input[type='checkbox']").change(function(value) {
      // If we have it on we want to subscribe
      if($(this).attr('checked')) {
        self.emit("subscribe");
      } else {
        self.emit("unsubscribe");
      }
    })

    // Select the item by id and then add a click handler to toggle class
    $('#' + this.id).click(function(event) {
      self.emit("click", this);
    });
  }

  Server.prototype.setRunning = function() {
    // Running
    this.status = "running";
    // Now change the image to running
    $('#' + this.id + " img[class='status']").attr("src", "/img/knobs/Knob%20Green.png");
  }

  Server.prototype.toListItem = function() {
    // Build the li
    var li = ["<li id='" + this.id + "'>"];
    li = this.listItemContent(li);
    li.push("</li>");
    // Return
    return li.join("\n");
  }

  /***********************************************************************
   * The statistics component
   **********************************************************************/
  StatisticsComponent = function(target) {
    // Target for the container
    this.target = target;
    // Used to render the component
    this.containerHTML = '<div class="container-fluid">'
          + '<div class="row-fluid">'
          + '<div class="span3">'
          + '<h4>CPU</h4><span id="' + target + '_cpu_percentages"/><span id="' + target + '_cpu_timers"/>'
          + '</div>'
          + '<div class="span5">'
          + '<h4>MEMORY</h4><span id="' + target + '_memory_stats"/>'
          + '</div>'
          + '<div class="span2">'
          + '<h4>DISKS</h4><span id="' + target + '_io_stats"/>'
          + '</div>'
          + '<div class="span2">'
          + '<h4>NETWORK</h4><span id="' + target + '_network_stats"/>'
          + '</div>'
          + '</div>'
          + '</div>';

    // // Add the template
    $("#" + target).html(this.containerHTML);
    // Set up the cpubar components
    this.cpubarsComponent = new CPUBarChart(target + "_cpu_percentages", {
      width: 200, height: 100, labelSize: 30, marginLeft: 10, barHeight: 30,
      addSubComponents:true, subComponentTargetContainer: target + "_cpu_percentages"
    });

    // Set up disk io stats for all available disks
    this.diskIOStatsComponent = new DiskIOStats(target + "_io_stats");
    this.networkIOStatsComponent = new NetworkIOStats(target + "_network_stats");
    this.memoryStatComponent = new MemoryStatsComponent(target + "_memory_stats", {
      width: 300, height: 200, ticks: 4,
      scaleFunction: function(x) { return x/1024/1024; }
    });

    // Just add all the components to an array for simplicity
    this.components = [this.cpubarsComponent, this.diskIOStatsComponent
      , this.networkIOStatsComponent, this.memoryStatComponent];
  }

  StatisticsComponent.prototype.listensTo = function() {
    return { "disk_usage": 1, "cpu_percents": 1, "cpu_times": 1,
      "network_counters": 1,  "memory_status": 1, "io_counters": 1, "processes": 1};
  }

  StatisticsComponent.prototype.remove = function() {
  }

  StatisticsComponent.prototype.data = function(data) {
    // Check what components accept the data and forward it
    var agent = data.info.agent;
    // Message all components
    for(var i = 0; i < this.components.length; i++) {
      if(this.components[i].listensTo()[agent]) {
        this.components[i].data(data);
      }
    }
  }

  /***********************************************************************
   * The processes component
   **********************************************************************/
  ProcessesComponent = function(target) {
    this.rendering = false;
    // Target for the container
    this.target = target;
    // Used to render the component
    this.containerHTML = '<div class="container-fluid">'
          + '<div class="row-fluid">'
          + '<div class="span12">'
          + '<h4>PROCESSES</h4>'
          + '<table class="table">'
          + '<thead>'
          + '<th>PID</th>'
          + '<th>PPID</th>'
          + '<th>COMMAND</th>'
          + '<th>EXE</th>'
          + '</thead>'
          + '<tbody id="' + target + '_processes"/>'
          + '</table>'
          + '</div>'
          + '</div>'
          + '</div>';

    // Add the template
    $("#" + target).html(this.containerHTML);
    // // Set up the cpubar components
    // this.cpubarsComponent = new CPUBarChart(target + "_cpu_percentages", {
    //   width: 200, height: 100, labelSize: 30, marginLeft: 10, barHeight: 30,
    //   addSubComponents:true, subComponentTargetContainer: target + "_cpu_percentages"
    // });

    // // Set up disk io stats for all available disks
    // this.diskIOStatsComponent = new DiskIOStats(target + "_io_stats");
    // this.networkIOStatsComponent = new NetworkIOStats(target + "_network_stats");
    // this.memoryStatComponent = new MemoryStatsComponent(target + "_memory_stats", {
    //   width: 300, height: 200, ticks: 4,
    //   scaleFunction: function(x) { return x/1024/1024; }
    // });

    // // Just add all the components to an array for simplicity
    // this.components = [this.cpubarsComponent, this.diskIOStatsComponent
    //   , this.networkIOStatsComponent, this.memoryStatComponent];
  }

  ProcessesComponent.prototype.listensTo = function() {
    return { "processes": 1};
  }

  ProcessesComponent.prototype.remove = function() {
  }

  ProcessesComponent.prototype.data = function(data) {
    if(!this.rendering) {
      // console.log("=================================== DATA")
      this.rendering = true;
      // console.log(data)
      // Clear out the list
      $("#" + this.target + "_processes").html("");
      var sortedData = data.data.sort(function(a, b) {
        return b.pid - a.pid
      })

      // sortedData = sortedData.slice(0, 10);
      // console.log(sortedData)

      // console.log(sortedData)
      // Let's create the html
      var html = "";
      // Iterate over all the data
      for(var i = 0; i < sortedData.length; i++) {
        // Let's insert all the items
        var item = sortedData[i];
        var exe = item.exe;
        // Split it upp
        if(typeof exe == 'string' && exe.indexOf("/") != -1) {
          exe = exe.split("/").pop();
        }


        // console.log(item)
        // Add it
        html +=  "<tr>"
           + "<td>" + item.pid + "</td>"
           + "<td>" + item.ppid + "</td>"
           + "<td>" + item.name + "</td>"
           + "<td>" + exe + "</td>"
           + "</tr>"
        // console.log("-- " + item._name)

        // $("#" + this.target + "_processes").append(
        //     "<tr>"
        //   + "<td>" + item._name + "</td>"
        //   + "</tr>"
        // )
      }

      // Clear out the list
      $("#" + this.target + "_processes").html(html);
      this.rendering = false;
    }

    // console.log("========================================= process")
    // // Check what components accept the data and forward it
    // var agent = data.info.agent;
    // // Message all components
    // for(var i = 0; i < this.components.length; i++) {
    //   if(this.components[i].listensTo()[agent]) {
    //     this.components[i].data(data);
    //   }
    // }
  }

  /***********************************************************************
   * Helpers
   **********************************************************************/
  // Set up the application handlers
  var _setupApplicationHandlers = function(self) {
    // Set up the list command handler
    self.connection.on("list", self.list(self));
    self.connection.on("authorized", self.authorized(self));
    // self.connection.on("messages_pause", self.messages_pause(self));
    // self.connection.on("messages_resume", self.messages_resume(self));
    // self.connection.on("new_server", self.new_server(self));
    // self.connection.on("subscribe_ack", self.subscribe_ack(self));
    // self.connection.on("unsubscribe_ack", self.unsubscribe_ack(self));
    // Set up data receive message
    self.connection.on("data", self.data(self));
  }

  var _setupUIhandlers = function(self) {
    $('#serverTab a').click(function (e) {
      e.preventDefault();
      $(this).tab('show');
    });
  }

  // Handle initial connect
  var _handleWebsocketConnect = function(self) {
    return function(message) {
      // Send the list command to receive our list of servers
      self.connection.list();
    }
  }

  // Handle websocket errors by attempting a reconnect
  var _handleWebsocketError = function(self) {
    return function() {
      // Stop the connection
      if(self.connection) self.connection.stop();
      // Wait a little bit and attempt a reconnect
      setTimeout(function() {
        // Boot up the webservice connection
        self.connection = new ConnectionHandler(document.URL, 'stats');
        // self.connection.on("message", _handleWebsocketMessage(self));
        self.connection.on("error", _handleWebsocketError(self));
        // Set up the handlers
        _setupApplicationHandlers(self);
        // Start connection
        self.connection.start();
      }, 1000);
    }
  }
})();

/***********************************************************************
 * Start the application
 **********************************************************************/
var application = new Application();
application.statisticsComponent = new StatisticsComponent("metrics");
application.processesComponent = new ProcessesComponent("processes");
// Add the component
application.addComponent(application.statisticsComponent);
application.addComponent(application.processesComponent);
// Start the application
application.start();













