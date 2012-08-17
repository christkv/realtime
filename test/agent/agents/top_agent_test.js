var top_agent = require('../../../agent/lib/agents/top_agent'),
  fs = require('fs');

exports.setUp = function(callback) {
  return callback();
}

exports.tearDown = function(callback) {
  callback();
}

/**
 * @ignore
 */
exports['Should correctly retrieve top results for localhost'] = function(test) {
  // Create an agent
  var top = top_agent.build();
  var index = 0;
  // Add listener to the agent
  top.on("data", function(data) {
    test.ok(data.processes);
    // Stop agent
    top.stop();
    // Signal test done
    test.done();
  });

  top.on("end", function(code) {
    test.equal(0, code);
  });

  top.on("error", function(err) {
  });

  // Start agent
  top.start();
}

/**
 * @ignore
 */
exports['Should parse osx top'] = function(test) {
  var topText = fs.readFileSync("./test/agent/agents/top/osx_top.log", 'ascii');
  // Create an agent
  var top = top_agent.build('darwin');
  var result = top._parseTopEntry(top, topText);
  test.equal(107, result.processes.length)
  test.done();
}

/**
 * @ignore
 */
exports['Should parse linux top'] = function(test) {
  var topText = fs.readFileSync("./test/agent/agents/top/debian_top.log", 'ascii');
  // Create an agent
  var top = top_agent.build('linux');
  var result = top._parseTopEntry(top, topText);
  test.equal(72, result.processes.length)
  test.done();
}
