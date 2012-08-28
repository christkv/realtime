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
    host: '192.168.43.126',
    // Port
    port: 9090,
    // API Key (user identifier)
    api_key: '11111111111111111111111111111',
    // Secret key used to encrypt the content for transport
    secret_key: 'abcdefabcdefabcdefabcdefabcdefabcdef',
    // Agents to use
    agents: [
      {
        agent: 'iostat', interval: 1
      },
      {
        agent: 'netstat', interval: 1
      },
      {
        agent: 'top', interval: 1
      },
      {
        agent: 'mongodb', host: 'localhost', port: 27017, interval: 1
      }],
    // Log data to
    log: './tmp/output.log',
    // Number of retries before giving up
    retries: 3
  }

  // Set up server to use on the app
  var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });

  server.listen(9090, "192.168.43.126", function() {
    console.log((new Date()) + ' Server is listening on port 9090');
  });

  // Start the server
  var agent = new Agent(cfg);

  // Connect to the mongodb
  new Db("realtime_test", new Server('localhost', 27017)).open(function(err, db) {
    // Create a responding server
    var wsServer = new WSServer(server, db);

    // Mock out the fetchKey so we don't use mongodb
    wsServer.user.fetchSecretKeyByApiKey = function(apiKey, callback) {
      callback(null, {_id: new ObjectID(), secret_key:'abcdefabcdefabcdefabcdefabcdefabcdef'});
    }

    // Listen to one event coming through
    wsServer.on("data", function(data, connection) {
      console.log("------------------------------------------------------------")
      console.log("------------------------------------------------------------")
      console.log(JSON.stringify(data, null, 2))

      // test.ok(data != null);
      // test.ok(connection != null);
      // test.ok(data.info != null && typeof data.info == 'object');
      // test.ok(data.data != null && typeof data.data == 'object');
      // test.ok(data.api_key != null && typeof data.api_key == 'string');
      // // Shutdown all the connections
      // wsServer.stop();
      // server.close();
      // // Shutdown the agent
      // agent.shutdown();
      // // Shutdown the db
      // db.close();
      // // Test done
      // test.done();
    });

    // Start the server
    wsServer.start(function() {
      // Start the agent
      agent.start();
    });
  });
}