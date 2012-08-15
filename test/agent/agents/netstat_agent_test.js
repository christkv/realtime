var netstat_agent = require('../../../agent/agents/netstat_agent');

exports.setUp = function(callback) {
  return callback();
}

exports.tearDown = function(callback) {
  callback();
}

/**
 * @ignore
 */
exports['Should correctly collect netstat data for two ticks'] = function(test) {
  // Create an agent
  var netstat = netstat_agent.build();
  var index = 0;
  // Add listener to the agent
  netstat.on("data", function(data) {
    test.ok(data.input);
    test.ok(data.output);
    test.ok(data.colls != null);
    index = index + 1;
    if(index == 2) {
      // Stop agent
      netstat.stop();
      // Signal test done
      test.done();
    }
  });

  netstat.on("end", function(code) {
    test.equal(0, code);
  });

  netstat.on("error", function(err) {
  });

  // Start agent
  netstat.start();
}