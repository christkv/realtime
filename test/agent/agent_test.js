var fs = require('fs');

exports.setUp = function(callback) {
  try {
    fs.mkdirSync("./tmp");
  } catch(err) { console.dir(err) }
  return callback();
}

exports.tearDown = function(callback) {
  try { fs.unlingSync("./tmp/agent_test.conf"); } catch(err) {};
  try { fs.rmdirSync("./tmp"); } catch(err) { console.dir(err) }
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
    agents: ['iostat', 'netstat', 'top'],
    // Log data to
    log: './tmp/output.log',
    // Number of retries before giving up
    retries: 3
  }

  try { fs.unlingSync("./tmp/agent_test.conf"); } catch(err) {};
  // Save to file
  fs.writeFileSync("./tmp/agent_test.conf", JSON.stringify(cfg, null, 2), 'ascii');
  test.done();
}