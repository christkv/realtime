var WebSocketServer = require('websocket').server
  , EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , crypto = require('crypto')
  , User = require('./modules/user').User;

var WSServer = function WSServer(httpServer, db, config) {
  EventEmitter.call(this);
  // Contains all the active websocket connections
  this.connections = [];
  this.db = db;
  this.config = config ? config : {crypto_algorithm: 'aes256'};
  // Modules used for functionality
  this.user = new User(this.db);
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
        // Data received parse as JSON
        var data = JSON.parse(message.utf8Data);
        // Check if it's an encrypted payload
        if(data.encrypted) {
          // Get the encrypted data and build the object we are sending to the next processing level
          var encryptedData = data.data;
          // Get the secret key for the agent
          self.user.fetchSecretKeyByApiKey(data.api_key, function(err, secretKeyDoc) {
            try {
              // We have a valid key document
              if(!err && secretKeyDoc != null) {
                // Create a cipher
                var cipher = crypto.createDecipher(self.config.crypto_algorithm, secretKeyDoc.secret_key);
                // Update the cipher
                var decryptedData = cipher.update(encryptedData, 'base64', 'utf8');
                decryptedData = decryptedData + cipher.final('utf8');
                // Finished object
                var finalObject = JSON.parse(decryptedData);
                // Add apiKey
                finalObject.api_key = data.api_key;
                // Emit the object
                self.emit("data", finalObject, connection);
              }
            } catch(err) {
              console.log("================================================= CIPHER ERROR");
              console.dir(err);
            }
          });
        } else {
          self.emit("data", data, connection);
        }
      }
    } catch(err) {
      console.log("====================================================== ERROR");
      console.dir(err);
    }
  }
}

exports.WSServer = WSServer;