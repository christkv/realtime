var WSServer = require('./api/ws_server').WSServer
  , cluster = require('cluster')
  , express = require('express')
  , mongodb = require('mongodb')
  , Db = mongodb.Db
  , Server = mongodb.Server
  , app = express()
  , format = require('util').format
  , http = require('http');

// Config
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.bodyParser());
app.use(express.cookieParser("some_-==+secret98_"));
app.use(express.methodOverride());
app.use(express.static(__dirname + '/../../public'));
app.use(express.logger({ format: ':method :url' }));

// All configuration options
var apiServerSettings = { host: 'localhost', port: 9090 }
// Web app configuration options
var appServerSettings = { host: 'localhost', port: 8080 }
// MongoDB settings
var mongodbSettings = { dbname: 'realtime', config: new Server("localhost", 27017) };
// Cluster options
var clusterSettings = { fork: 2 }

/***********************************************************************
 * Boot up the API Webservice server, including the handling of any forked
 * socket resources
 ***********************************************************************/
var _startAPIServer = function _startAPIServer(settings, db) {
  // If we are not a master start a server worker, master only watches over
  // the child processes to increase robustness in case of worker death
  if(!cluster.isMaster) {
    // Setup the http server for the incoming api calls, does not respond to normal http
    var server = http.createServer(function(request, response) {
      response.writeHead(404);
      response.end();
    });

    server.listen(settings.port, settings.host, function() {
      console.log(format('%s Server is listening on port %s:%s', new Date(), settings.host, settings.port));
    });

    // Create a responding server
    var wsServer = new WSServer(server, db);
    wsServer.on("connect", function() {
      console.log("========================================= connect");
    });

    // Start the server
    wsServer.start();
  }
}

/***********************************************************************
 * Boot up the Mongodb connection
 ***********************************************************************/
var _startMongoDBConnection = function _startMongoDBConnection(settings, callback) {
  // If we are not a master start a server worker, master only watches over
  // the child processes to increase robustness in case of worker death
  if(!cluster.isMaster) {
    new Db(settings.dbname, settings.config).open(callback);
  }
}

/***********************************************************************
 * Boot up the Front of the house or the webapp if you may
 ***********************************************************************/
var _startApplicationServer = function _startApplicationServer(settings, db) {
  // If we are not a master start a server worker, master only watches over
  // the child processes to increase robustness in case of worker death
  if(!cluster.isMaster) {

  }
}

/***********************************************************************
 * Handle clustering options
 ***********************************************************************/
var _handleClustering = function _handleClustering(settings) {
  // Fork any children
  if(cluster.isMaster) {
    // Message handler
    var _messageHandler = function(message) {
      console.log("========================================= message");
      console.dir(message)
    }

    // Fork workers
    for(var i = 0; i < settings.fork; i++) {
      // Fork a worker
      var worker = cluster.fork();
      // Add handler for any messages
      worker.on('message', _messageHandler);
    }

    // If a process dies for a new one
    cluster.on('death', function(worker) {
      console.log('worker ' + worker.pid + ' died');
      cluster.fork();
    });
  }
}

/***********************************************************************
 * Start up the application
 ***********************************************************************/

// Spawn any need children
_handleClustering(clusterSettings);
// Handle the setup of the server
_startMongoDBConnection(mongodbSettings, function(err, db) {
  if(err) throw err;
  // Start API server
  _startAPIServer(apiServerSettings, db);
  // Start the Application Server
  _startApplicationServer(appServerSettings, db);
});
