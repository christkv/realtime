(function() {
  Application = function Application() {
  }

  Application.prototype.start = function start() {
    // Boot up the webservice connection
    this.connection = new ConnectionHandler(document.URL, 'stats');
    this.connection.on("message", _handleWebsocketMessage(this));
    this.connection.on("error", _handleWebsocketError(this));
    // Start connection
    this.connection.start();
  }

  // Handle the websocket message
  var _handleWebsocketMessage = function(self) {
    return function(message) {
      console.log("==================== message")
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

  return Application;
})();

/***********************************************************************
 * Start the application
 **********************************************************************/
new Application().start();