var WSServer = require('./api/ws_server').WSServer
  , cluster = require('cluster')
  , express = require('express')
  , mongodb = require('mongodb')
  , WebSocketServer = require('websocket').server
  , ApplicationServer = require('./app/application_server').ApplicationServer
  , Db = mongodb.Db
  , Server = mongodb.Server
  , app = express()
  , format = require('util').format
  , http = require('http');

var serverhost = "localhost";
// var serverhost = "192.168.0.194";
// All configuration options
var apiServerSettings = { host: serverhost, port: 9090 }
// Web app configuration options
var appServerSettings = { host: serverhost, port: 8080, developer: true }
// MongoDB settings
var mongodbSettings = { dbname: 'realtime', config: new Server("localhost", 27017) };
// Cluster options
var clusterSettings = { fork: 1 }

/***********************************************************************
 * Boot up the API Webservice server, including the handling of any forked
 * socket resources
 ***********************************************************************/
var _startAPIServer = function _startAPIServer(_settings, _db, _callback) {
  // If we are not a master start a server worker, master only watches over
  // the child processes to increase robustness in case of worker death
  if(!cluster.isMaster) {
    // Start the server
    new WSServer(_settings, _db).start(_callback);
  }
}

/***********************************************************************
 * Boot up the Mongodb connection
 ***********************************************************************/
var _startMongoDBConnection = function _startMongoDBConnection(_settings, _callback) {
  // If we are not a master start a server worker, master only watches over
  // the child processes to increase robustness in case of worker death
  if(!cluster.isMaster) {
    new Db(_settings.dbname, _settings.config).open(_callback);
  }
}

/***********************************************************************
 * Boot up the Front of the house or the webapp if you may
 ***********************************************************************/
var _startApplicationServer = function _startApplicationServer(_settings, _db, _callback) {
  // If we are not a master start a server worker, master only watches over
  // the child processes to increase robustness in case of worker death
  if(!cluster.isMaster) {
    new ApplicationServer(_settings, _db).start(_callback)
  }
}

/***********************************************************************
 * Handle clustering options
 ***********************************************************************/
var _handleClustering = function _handleClustering(_settings) {
  // Fork any children
  if(cluster.isMaster) {
    // Message handler
    var _messageHandler = function(message) {
      // console.log("========================================= message");
      // console.dir(message)
    }

    // Fork workers
    for(var i = 0; i < _settings.fork; i++) {
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
  _startAPIServer(apiServerSettings, db, function(err, result) {
    if(err) throw err;

    // Start the Application Server
    _startApplicationServer(appServerSettings, db, function(err, result) {
      if(err) throw err;
    });
  });
});
