(function() {
  Application = function Application() {
    // Contains all the active components
    this.components = [];
    // Components listening to events
    this.componentsByEvents = {};
  }

  Application.prototype.start = function start() {
    // Boot up the webservice connection
    this.connection = new ConnectionHandler(document.URL, 'stats');
    this.connection.on("message", _handleWebsocketMessage(this));
    this.connection.on("error", _handleWebsocketError(this));
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

  // Handle the websocket message
  var _handleWebsocketMessage = function(self) {
    return function(message) {

      if(message.info && self.componentsByEvents[message.info.agent]) {
        var components = self.componentsByEvents[message.info.agent];
        // Route the message to all listening components
        for(var i = 0; i < components.length; i++) {
          components[i].data(message);
        }
      }
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
        self.connection.on("message", _handleWebsocketMessage(self));
        self.connection.on("error", _handleWebsocketError(self));
        // Start connection
        self.connection.start();
      }, 1000);
    }
  }
})();

/***********************************************************************
 * Start the application
 **********************************************************************/
var application = new Application().start();

// Set up basic cpu component splitting out the individual components
// into seperate cpu timer graphs
var cpubarChart = new CPUBarChart("cpu_percentages", {
  width: 200,
  height: 100,
  labelSize: 30,
  marginLeft: 10,
  addSubComponents:true
});

// // Set up cpu specific bar chart
// var cpu0SpecificBarChart = new CPUTimesBarChart("cpu_times_0", {
//   width: 200,
//   height: 100,
//   labelSize: 40,
//   marginLeft: 10,
//   data: [{name:"idle", value:0},
//     {name:"nice", value:0},
//     {name:"system", value:0},
//     {name:"user", value:0}]
// });

// Add cpu monitoring graph
application.addComponent(cpubarChart);
// Add io counters graph
application.addComponent(new IOStatThroughputDonut("io_stats"));
// application.addComponent(cpu0SpecificBarChart);















