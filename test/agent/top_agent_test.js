var top_agent = require('../../agent/agents/top_agent');

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