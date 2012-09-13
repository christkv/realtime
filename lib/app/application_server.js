var express = require('express')
  , WebSocketServer = require('websocket').server
  , async = require('async')
  , http = require('http')
  , fs = require('fs')
  , format = require('util').format
  , User = require('../api/modules/user').User
  , Server = require('../api/modules/server').Server
  , Data = require('../api/modules/data').Data
  , DummyDataProvider = require('./dataproviders/dummy_data_provider').DummyDataProvider
  , FlowDataProvider = require('./dataproviders/flow_data_provider').FlowDataProvider
  , MemoryStore = require('connect').session.MemoryStore;

var ApplicationServer = function ApplicationServer(config, db) {
  this.config = config;
  this.db = db;
  this.app = express();
  this.connections = [];

  // Create a session store
  this.sessionStore = new MemoryStore({ reapInterval:  60000 * 10 });

  // Set the application settings
  this.app.set('view engine', 'ejs');
  this.app.set('views', __dirname + '/views');
  this.app.use(express.bodyParser());
  this.app.use(express.cookieParser("some_-==+secret98_"));
  this.app.use(express.methodOverride());
  this.app.use(express.static(__dirname + '/../../public'));
  this.app.use(express.static(__dirname + '/../../lib/app/frontend'));
  this.app.use(express.logger({ format: ':method :url' }));
  this.app.use(express.cookieParser());
  this.app.use(express.session(
    { secret: "keyboard cat", key: 'connect.sid', store: this.sessionStore}));

  // If developer settings let's use a dummy data provider
  if(this.config.developer) {
    // this.flowingDataProvider = new DummyDataProvider(__dirname + "/../../test/testdata");
    this.flowingDataProvider = new FlowDataProvider(this.db);
  }

  // Modules used for functionality
  this.user = new User(this.db);
  this.data = new Data(this.db);
  this.server = new Server(this.db);
}

ApplicationServer.prototype.start = function start(callback) {
  var self = this;
  // All the controllers we are using
  var dashboard = require('./modules/dashboard');
  // Set up the controllers
  this.app.get('/dashboard', dashboard.index(this.db));

  // Ensure we have the correct data setup for all the collections
  async.parallel([
      function(_callback) { self.data.init(_callback); }
    , function(_callback) { self.user.init(_callback); }
    , function(_callback) { self.flowingDataProvider.start(_callback); }]
    , function(err, results) {
      if(err) return callback(err);

      // Add event listeners to handle data
      self.flowingDataProvider.on("data", _providerDataHandler(self))
      self.flowingDataProvider.on("error", _providerErrorHandler(self))

      // Setup the http server for the incoming api calls, does not respond to normal http
      self.server = http.createServer(self.app);
      // Start up the application server
      console.log(format('%s Server is listening on port %s:%s', new Date(), self.config.host, self.config.port));
      self.server.listen(self.config.port, self.config.host, function(err) {
        if(err) return callback(err);

        // Keep a reference to the websocket server
        self.wsServer = new WebSocketServer({
          httpServer: self.server,
          autoAcceptConnections: false
        });

        // Set up the websocket server handlers
        self.wsServer.on('request', function(request) {
          // console.log("=================================================")
          // Now let's send validate if the user is allowed
          _validateAndSendAuthorizationMessage(self, request, function(err, acceptMessage) {
            if(err) return request.reject(401, "Not authorized or no active session");
            // Accept the connection
            var connection = request.accept('stats', request.origin);
            // Create handlers
            connection.on('message', _wsMessageHandler(self, connection))
            connection.on('close', _wsCloseHandler(self, connection));
            // Send welcome message
            connection.sendUTF(acceptMessage);
            // Add connection to list
            self.connections.push(connection);
          });
        });
      });
  });
}

/******************************************************************************
 * Authentication and Authorization
 *****************************************************************************/
var _validateAndSendAuthorizationMessage = function(self, request, callback) {
  if(request.httpRequest.headers.cookie) {
    // console.log(request.httpRequest.headers.cookie)
    var cookie = parseCookie(request.httpRequest.headers.cookie);
    // Seesion is is made up by s:__id__.__other__
    var sessionId = cookie['connect.sid'].split(/\:/)[1].split(/\./)[0];
    // Use the session id to retrive the session object if any
    self.sessionStore.get(sessionId, function(err, session) {
      if(err || !session) return callback(new Error("not authorized"));
      // Return message to send
      callback(null, JSON.stringify({
        type: 'authorized',
        session_id: sessionId
      }));
    })
  } else {
    return callback(new Error("not authorized"));
  }
}

/******************************************************************************
 * Websocket data handlers
 *****************************************************************************/
var _wsMessageHandler = function _wsMessageHandler(self, connection) {
  return function(message) {
    if(message.type == 'utf8') {
      var object = JSON.parse(message.utf8Data);
      // Ensure we are authorized
      _authorize(self, object, function(err, session) {
        if(err) {
          connection.closeReasonCode = 1008;
          return connection.close();
        }

        // Let's parse the data
        switch(object.type) {
          case 'list':
            _list_handler(self, session, object, connection);
            break;
          case 'subscribe':
            _subscribe_handler(self, session, object, connection);
            break;
          case 'unsubscribe':
            _unsubscribe_handler(self, session, object, connection);
            break;
        }
      })
    }
  }
}

var _wsCloseHandler = function _wsCloseHandler(self, connection) {
  return function() {
    var index = self.connections.indexOf(connection);
    // Remove the connection from the list of connection
    if(index != -1) {
      self.connections.splice(index, 1);
    }
  }
}

var _authorize = function _authorize(self, object, callback) {
  self.sessionStore.get(object.session_id, function(err, session) {
      if(err || !session) {
        return callback(new Error("not authorized"));
      }

      // TODO TODO TODO TODO TODO
      // TODO TODO TODO TODO TODO
      // TODO TODO TODO TODO TODO
      // Hardcode the user id
      self.db.collection('users').findOne({api_key:1}, function(err, result) {
        session.user_id = result._id;
        callback(null, session);
      })
      // session.api_key = 1;

      // Here we should ensure do authentication
      // callback(null, session);
  })
}

/******************************************************************************
 * Message handlers
 *****************************************************************************/
var _list_handler = function _list_handler(self, session, object, connection) {
  // console.log("=========================================== _list_handler")
  // console.dir(session)
  // console.dir(object)
  // Fetch the list by user
  self.user.fetchListByUserId(session.user_id, function(err, list) {
    if(err || !list) return _closeConnection(connection);
    try {
      // Add type off message
      list.type = 'list';
      // Send the list to the user
      connection.sendUTF(JSON.stringify(list));

      // Start listening to all the events for those servers
      if(!connection.listeningTo) connection.listeningTo = {};
      // Add all servers
      for(var i = 0; i < list.subscribed.length; i++) {
        connection.listeningTo[list.subscribed[i].address] = true;
      }

    } catch(err) {
    }
  })
}

var _subscribe_handler = function _subscribe_handler(self, session, object, connection) {
  // console.log("=========================================== _subscribe_handler")
  // console.dir(session)
  // console.dir(object)

  // Ensure all servers are valid
  if(object.servers.length == 0) return _closeConnection(connection);
  // Ensure all server objects have needed fields
  for(var i = 0; i < object.servers.length; i++) {
    if(!object.servers[i].address
      && !object.servers[i].platform
      && !object.servers[i].arch) return _closeConnection(connection);
  }

  // Add the server to the list of user servers
  self.user.subscribeToServer(session.user_id, object.servers, function(err, result) {
    // console.log("=========================================== _subscribe_handler 0")
    // console.dir(err)
    // console.dir(result)

    if(err || result == 0) return _closeConnection(connection);
    try {
      // console.log("=========================================== _subscribe_handler 0:1")
      // Send the list to the user
      connection.sendUTF(JSON.stringify({
        type: 'subscribe_ack',
        servers: object.servers
      }));

      // console.log("=========================================== _subscribe_handler 1")
      // console.dir(connection.listeningTo)

      // Let's start the flow of messages by adding it to the connection
      if(!connection.listeningTo) connection.listeningTo = {};
      // Add all servers
      for(var i = 0; i < object.servers.length; i++) {
        connection.listeningTo[object.servers[i].address] = true;
      }

      // console.log("=========================================== _subscribe_handler 2")
      // console.dir(connection.listeningTo)
    } catch(err) {
      console.dir(err)
    }
  });
}

var _unsubscribe_handler = function _unsubscribe_handler(self, session, object, connection) {
  // console.log("=========================================== _unsubscribe_handler")
  // console.dir(session)
  // console.dir(object)

  // Ensure all servers are valid
  if(object.servers.length == 0) return _closeConnection(connection);
  // Ensure all server objects have needed fields
  for(var i = 0; i < object.servers.length; i++) {
    if(!object.servers[i].address
      && !object.servers[i].platform
      && !object.servers[i].arch) return _closeConnection(connection);
  }

  // Add the server to the list of user servers
  self.user.unsubscribeToServer(session.user_id, object.servers, function(err, result) {
    // console.log("=========================================== _unsubscribe_handler 0")
    // console.dir(err)
    // console.dir(result)

    if(err || result == 0) return _closeConnection(connection);
    try {
      // console.log("=========================================== _unsubscribe_handler 0:1")
      // Send the list to the user
      connection.sendUTF(JSON.stringify({
        type: 'unsubscribe_ack',
        servers: object.servers
      }));

      // console.log("=========================================== _unsubscribe_handler 1")
      // console.dir(connection.listeningTo)

      // Let's start the flow of messages by adding it to the connection
      if(!connection.listeningTo) connection.listeningTo = {};
      // Remove all the connections
      for(var i = 0; i < object.servers.length; i++) {
        delete connection.listeningTo[object.servers[i].address];
      }

      // console.log("=========================================== _unsubscribe_handler 2")
      // console.dir(connection.listeningTo)
    } catch(err) {
      console.dir(err)
    }
  })
}

/******************************************************************************
 * Provider data handlers
 *****************************************************************************/
var _providerDataHandler = function _providerDataHandler(self) {
  return function(data) {
    for(var i = 0; i < self.connections.length; i++) {
      try {
        // console.log("==================================================== connection")
        // console.dir(self.connections[i].listeningTo)
        // Only send messages to connections listening
        if(self.connections[i].listeningTo
            && self.connections[i].listeningTo[data.info.net.address]) {
          self.connections[i].sendUTF(JSON.stringify(data));
        }
      } catch(err) {}
    }
  }
}

var _providerErrorHandler = function _providerErrorHandler(self) {
  return function(err) {
  }
}

/******************************************************************************
 * Utility Methods
 *****************************************************************************/
var _closeConnection = function _closeConnection(connection) {
  connection.closeReasonCode = 1008;
  return connection.close();
}

var parseCookie = function(str){
  var obj = {}
    , pairs = str.split(/[;,] */);
  for (var i = 0, len = pairs.length; i < len; ++i) {
    var pair = pairs[i]
      , eqlIndex = pair.indexOf('=')
      , key = pair.substr(0, eqlIndex).trim().toLowerCase()
      , val = pair.substr(++eqlIndex, pair.length).trim();

    // quoted values
    if ('"' == val[0]) val = val.slice(1, -1);

    // only assign once
    if (undefined == obj[key]) {
      val = val.replace(/\+/g, ' ');
      try {
        obj[key] = decodeURIComponent(val);
      } catch (err) {
        if (err instanceof URIError) {
          obj[key] = val;
        } else {
          throw err;
        }
      }
    }
  }
  return obj;
};


exports.ApplicationServer = ApplicationServer;