var express = require('express')
  , WebSocketServer = require('websocket').server
  , format = require('util').format;

var ApplicationServer = function ApplicationServer(config, db) {
  this.config = config;
  this.db = db;
  this.app = express();

  // Set the application settings
  this.app.set('view engine', 'ejs');
  this.app.set('views', __dirname + '/views');
  this.app.use(express.bodyParser());
  this.app.use(express.cookieParser("some_-==+secret98_"));
  this.app.use(express.methodOverride());
  this.app.use(express.static(__dirname + '/../../public'));
  this.app.use(express.logger({ format: ':method :url' }));
}

ApplicationServer.prototype.start = function start(callback) {
  // All the controllers we are using
  var dashboard = require('./modules/dashboard');

  // Set up the controllers
  this.app.get('/dashboard', dashboard.index(this.db));

  // Keep a reference to the websocket server
  var wsServer = new WebSocketServer({
      httpServer: this.app,
      autoAcceptConnections: false
  });

  console.log(format('%s Server is listening on port %s:%s', new Date(), this.config.host, this.config.port));
  this.app.listen(this.config.port, this.config.host, callback);
}

exports.ApplicationServer = ApplicationServer;