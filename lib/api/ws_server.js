var WebSocketServer = require('websocket').server
  , EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits;

var WSServer = function WSServer(httpServer, db) {
  EventEmitter.call(this);
  // Contains all the active websocket connections
  this.connections = [];
  this.db = db;
  // Keep a reference to the websocket server
  this.wsServer = new WebSocketServer({
      httpServer: httpServer,
      // You should not use autoAcceptConnections for production
      // applications, as it defeats all standard cross-origin protection
      // facilities built into the protocol and the browser.  You should
      // *always* verify the connection's origin and decide whether or not
      // to accept it.
      autoAcceptConnections: false
  });
}

inherits(WSServer, EventEmitter);

WSServer.prototype.start = function start() {
  var self = this;

  this.wsServer.on('request', function(request) {
    // Accept the connection
    var connection = request.accept('agent', request.origin);
    // Create handlers
    connection.on('message', _messageHandler(self, connection))
    connection.on('close', _closeHandler(self, connection));
    // Add connection to list
    self.connections.push(connection);
    // Emit connect event
    self.emit("connect", connection);
  });
}

WSServer.prototype.stop = function stop() {
  while(this.connections.length > 0) {
    this.connections.pop().close();
  }
}

var _closeHandler = function _closeHandler(self, connection) {
  return function(connection) {
    var connectionIndex = self.connections.indexOf(connection);
    // Remove that connection if it's found
    if(connectionIndex != -1) {
      self.connections.splice(connectionIndex, 1);
    }
    // Emit the close event
    self.emit("close");
  }
}

var _messageHandler = function _messageHandler(self, connection) {
  return function(message) {
    try {
      if(message.type === 'utf8') {
        self.emit("data", JSON.parse(message.utf8Data), connection);
      }
    } catch(err) {
      console.log("====================================================== ERROR");
      console.dir(err);
    }
  }
}

exports.WSServer = WSServer;