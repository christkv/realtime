(function() {
  ConnectionHandler = function ConnectionHandler(uri, channel) {
    EventEmitter.call(this);
    // Save the settings
    this.uri = uri;
    this.channel = channel;
    // Create a proper url
    this.url = "ws://" + this.uri.substr(7).split('/')[0];
  }

  inherits(ConnectionHandler, EventEmitter);

  ConnectionHandler.prototype.start = function() {
    var self = this;
    // standard one
    var wsCtor = window.WebSocket;
    this.websocket = new wsCtor(this.url, this.channel);
    this.websocket.binaryType = 'arraybuffer';

    this.websocket.onopen = function(event) {
      self.emit("connect");
    }
    this.websocket.onclose = function(event) {
      self.emit("error", event);
    }

    this.websocket.onmessage = function(event) {
      // If we have a message parse and send it
      if(typeof event.data == 'string') {
        try {
          self.emit("message", JSON.parse(event.data));
        } catch(err) {}
      }
    }

    this.websocket.onerror = function(event) {
      self.emit("error", event);
    }
  }

  ConnectionHandler.prototype.stop = function() {
    try {
      // Remove all listeners
      this.removeAllListeners();
      // Close socket
      if(this.websocket) this.websocket.close();
    } catch(err) {}
  }
})();