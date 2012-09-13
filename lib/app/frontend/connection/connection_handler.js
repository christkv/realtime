(function() {
  ConnectionHandler = function ConnectionHandler(uri, channel) {
    EventEmitter.call(this);
    // Save the settings
    this.uri = uri;
    this.channel = channel;
    // Create a proper url
    this.url = "ws://" + this.uri.substr(7).split('/')[0];
    // Contains the session Id
    this.sessionId = null;
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
          // Parse the object
          var object = JSON.parse(event.data);
          // If we have a type use it to emit
          if(object.type) {
            console.log("================================= emit :: " + object.type)
            self.emit(object.type, object);
          } else {
            self.emit('data', object);
          }
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

  /***********************************************************************
   * Protocol for the application
   **********************************************************************/
  ConnectionHandler.prototype.pause = function() {
  }

  ConnectionHandler.prototype.stop = function() {
  }

  ConnectionHandler.prototype.list = function() {
    this.websocket.send(JSON.stringify({
      type: 'list',
      session_id: this.sessionId
    }));
  }

  ConnectionHandler.prototype.subscribe = function(server) {
    console.log("======================================= subscribe")
    console.log(server)

    this.websocket.send(JSON.stringify({
      type: 'subscribe',
      session_id: this.sessionId,
      servers: [
        {
          address: server.address,
          platform: server.platform,
          arch: server.arch
        }
      ]
    }));
  }

  ConnectionHandler.prototype.unsubscribe = function(server) {
    console.log(server)

    this.websocket.send(JSON.stringify({
      type: 'unsubscribe',
      session_id: this.sessionId,
      servers: [
        {
          address: server.address,
          platform: server.platform,
          arch: server.arch
        }
      ]
    }));
  }
})();










