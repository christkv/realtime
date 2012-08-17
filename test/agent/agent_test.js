var fs = require('fs'),
  Agent = require('../../agent/lib/agent').Agent;

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

  // Create an Agent
  var agent = new Agent(cfg);

  // try { fs.unlingSync("./tmp/agent_test.conf"); } catch(err) {};
  // // Save to file
  // fs.writeFileSync("./tmp/agent_test.conf", JSON.stringify(cfg, null, 2), 'ascii');
  test.done();
}