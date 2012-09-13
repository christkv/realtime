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

      // Handle the click on the server item
      server.on("click", function(_server) {
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
        $("#server_name").text("Server: " + server.address);
        // Set current server
        self.currentSelectedServer = server.address;
      });
    }
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

  Application.prototype.messages_pause = function(self) {
    return function(message) {
      console.log("=============================================== messages_pause")
    }
  }

  Application.prototype.messages_resume = function(self) {
    return function(message) {
      console.log("=============================================== messages_resume")
    }
  }

  Application.prototype.new_server = function(self) {
    return function(message) {
      console.log("=============================================== new_server")
    }
  }

  Application.prototype.subscribe_ack = function(self) {
    return function(message) {
      console.log("=============================================== subscribe_ack")
    }
  }

  Application.prototype.unsubscribe_ack = function(self) {
    return function(message) {
      console.log("=============================================== unsubscribe_ack")
    }
  }

  Application.prototype.data = function(self) {
    return function(message) {
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
   * Helpers
   **********************************************************************/
  // Set up the application handlers
  var _setupApplicationHandlers = function(self) {
    // Set up the list command handler
    self.connection.on("list", self.list(self));
    self.connection.on("authorized", self.authorized(self));
    self.connection.on("messages_pause", self.messages_pause(self));
    self.connection.on("messages_resume", self.messages_resume(self));
    self.connection.on("new_server", self.new_server(self));
    self.connection.on("subscribe_ack", self.subscribe_ack(self));
    self.connection.on("unsubscribe_ack", self.unsubscribe_ack(self));
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
// // Set up basic cpu component splitting out the individual components
// // into seperate cpu timer graphs
var cpubarsComponent = new CPUBarChart("cpu_percentages", {
  width: 200,
  height: 100,
  labelSize: 30,
  marginLeft: 10,
  barHeight: 30,
  addSubComponents:true,
  subComponentTargetContainer: "cpu_percentages"
});

// // Set up disk io stats for all available disks
var diskIOStatsComponent = new DiskIOStats("io_stats");
var networkIOStatsComponent = new NetworkIOStats("network_stats");
var memoryStatComponent = new MemoryStatsComponent("memory_stats", {
  width: 300,
  height: 200,
  ticks: 4,
  scaleFunction: function(x) { return x/1024/1024; }
});

// Add cpu monitoring graph
application.addComponent(cpubarsComponent);
// Add io counters graph
application.addComponent(diskIOStatsComponent);
application.addComponent(networkIOStatsComponent);
application.addComponent(memoryStatComponent);
// Start the application
application.start();













