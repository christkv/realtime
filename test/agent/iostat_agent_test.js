var iostat_agent = require('../../agent/agents/iostat_agent');

exports.setUp = function(callback) {
  return callback();
}

exports.tearDown = function(callback) {
  callback();
}

/**
 * @ignore
 */
exports.shouldCorrectlyHandleIllegalDbNames = function(test) {
  // Create an agent
  var iostatAgent = iostat_agent.build();
  // Add listener to the agent
  iostatAgent.on("data", function(data) {
    test.ok(data.cpu);
    test.ok(data.load_average);
    test.ok(data.disks);
    // Stop agent
    iostatAgent.stop();
    // Signal test done
    test.done();
  });

  iostatAgent.on("end", function(data) {
    test.equal(null, data);
  });

  iostatAgent.on("error", function(err) {
  });

  // Start agent
  iostatAgent.start();
}