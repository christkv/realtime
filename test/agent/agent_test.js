var fs = require('fs')
  , http = require('http')
  , Agent = require('../../agent/lib/agent').Agent
  , WSServer = require('../../lib/api/ws_server').WSServer
  , ObjectID = require('mongodb').ObjectID
  , Server = require('mongodb').Server
  , Db = require('mongodb').Db;

exports.setUp = function(callback) {
  try {
    fs.mkdirSync("./tmp");
  } catch(err) {};
  return callback();
}

exports.tearDown = function(callback) {
  try { fs.unlingSync("./tmp/agent_test.conf"); } catch(err) {};
  try { fs.rmdirSync("./tmp"); } catch(err) {};
  callback();
}

/**
 * @ignore
 */
exports['Should setup agent with config'] = function(test) {
  var cfg = {
    // Host
    host: 'localhost',
    // Port
    port: 9090,
    // API Key (user identifier)
    api_key: '11111111111111111111111111111',
    // Secret key used to encrypt the content for transport
    secret_key: 'abcdefabcdefabcdefabcdefabcdefabcdef',
    // Agents to use
    agents: [
        {
          agent: 'cpu_percents', interval: 1000
        },
        {
          agent: 'cpu_times', interval: 1000
        },
        {
          agent: 'disk_usage', interval: 1000
        },
        {
          agent: 'io_counters', interval: 1000
        },
        {
          agent: 'memory_status', interval: 1000
        },
        {
          agent: 'network_counters', interval: 1000
        },
        {
          agent: 'processes', interval: 1000
        }
      ],
    // Log data to
    log: './tmp/output.log',
    // Number of retries before giving up
    retries: 3
  }

  // Start the server
  var agent = new Agent(cfg);

  // Connect to the mongodb
  new Db("realtime_test", new Server('localhost', 27017)).open(function(err, db) {
    // Create a responding server
    var wsServer = new WSServer({host:'localhost', port:9090}, db);
    // Mock out the fetchKey so we don't use mongodb
    wsServer.user.fetchSecretKeyByApiKey = function(apiKey, callback) {
      callback(null, {_id: new ObjectID(), secret_key:'abcdefabcdefabcdefabcdefabcdefabcdef'});
    }

    // Listen to one event coming through
    wsServer.on("data", function(data, connection) {
      test.ok(data);
      // Shutdown the agent
      agent.shutdown();
      // Shutdown all the connections
      wsServer.stop();
      // Shutdown the db
      db.close();
      // Test done
      test.done();
    });

    // Start the server
    wsServer.start(function() {
      // Start the agent
      agent.start();
    });
  });
}