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
      // console.log(message.info.agent)

      if(message.info && self.componentsByEvents[message.info.agent]) {
        var components = self.componentsByEvents[message.info.agent];
        // console.log(message)
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
// Add some components
application.addComponent(new IOStatThroughputDonut("iostate_write_distribution"));
