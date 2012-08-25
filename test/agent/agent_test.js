var fs = require('fs')
  , http = require('http')
  , Agent = require('../../agent/lib/agent').Agent
  , WSServer = require('../../lib/api/ws_server').WSServer;

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
  // Create a responding server
  var wsServer = new WSServer(server);
  // Listen to one event coming through
  wsServer.on("data", function(data, connection) {
    test.ok(data != null);
    test.ok(connection != null);
    // Shutdown all the connections
    wsServer.stop();
    server.close();
    // Shutdown the agent
    agent.shutdown();

    // Test done
    test.done();
  });
  // Start the server
  wsServer.start();
  // Start the agent
  agent.start();
}