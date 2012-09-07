var express = require('express')
  , WebSocketServer = require('websocket').server
  , http = require('http')
  , format = require('util').format
  , DummyDataProvider = require('./dataproviders/dummy_data_provider').DummyDataProvider
  , FlowDataProvider = require('./dataproviders/flow_data_provider').FlowDataProvider;

var ApplicationServer = function ApplicationServer(config, db) {
  this.config = config;
  this.db = db;
  this.app = express();
  this.connections = [];

  // Set the application settings
  this.app.set('view engine', 'ejs');
  this.app.set('views', __dirname + '/views');
  this.app.use(express.bodyParser());
  this.app.use(express.cookieParser("some_-==+secret98_"));
  this.app.use(express.methodOverride());
  this.app.use(express.static(__dirname + '/../../public'));
  this.app.use(express.static(__dirname + '/../../lib/app/frontend'));
  this.app.use(express.logger({ format: ':method :url' }));

  // If developer settings let's use a dummy data provider
  if(this.config.developer) {
    // this.flowingDataProvider = new DummyDataProvider(__dirname + "/../../test/testdata");
    this.flowingDataProvider = new FlowDataProvider(this.db);
  }
}

ApplicationServer.prototype.start = function start(callback) {
  var self = this;
  // All the controllers we are using
  var dashboard = require('./modules/dashboard');

  // Set up the controllers
  this.app.get('/dashboard', dashboard.index(this.db));

  // Startup data provider
  this.flowingDataProvider.start(function(err, result) {
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
        // Accept the connection
        var connection = request.accept('stats', request.origin);
        // Create handlers
        connection.on('message', _wsMessageHandler(self, connection))
        connection.on('close', _wsCloseHandler(self, connection));
        // Add connection to list
        self.connections.push(connection);
      });
    });
  });
}

/******************************************************************************
 * Websocket data handlers
 *****************************************************************************/
var _wsMessageHandler = function _wsMessageHandler(self, connection) {
  return function(message) {
  }
}

var _wsCloseHandler = function _wsCloseHandler(self, connection) {
  return function() {
  }
}

/******************************************************************************
 * Provider data handlers
 *****************************************************************************/
var _providerDataHandler = function _providerDataHandler(self) {
  return function(data) {
    for(var i = 0; i < self.connections.length; i++) {
      try {
        self.connections[i].sendUTF(JSON.stringify(data));
      } catch(err) {}
    }
  }
}

var _providerErrorHandler = function _providerErrorHandler(self) {
  return function(err) {
  }
}

exports.ApplicationServer = ApplicationServer;