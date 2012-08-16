var netstat_agent = require('../../../agent/agents/netstat_agent'),
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
exports['Should correctly collect netstat data for two ticks'] = function(test) {
  // Create an agent
  var netstat = netstat_agent.build();
  var index = 0;
  var done = false;
  // Add listener to the agent
  netstat.on("data", function(data) {
    if(!done) {
      done = true;
      test.ok(data);
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

/**
 * @ignore
 */
exports['Should parse osx netstat'] = function(test) {
  var data = fs.readFileSync("./test/agent/agents/netstat/osx_netstat.log", 'ascii');
  // Create an agent
  var agent = netstat_agent.build('darwin');
  var result = agent._parseTopEntry(agent, data);
  test.done();
}

/**
 * @ignore
 */
exports['Should parse linux netstat'] = function(test) {
  var data = fs.readFileSync("./test/agent/agents/netstat/debian_netstat.log", 'ascii');
  // Create an agent
  var agent = netstat_agent.build('linux');
  var result = agent._parseTopEntry(agent, data);
  test.equal(2, result.length);
  test.ok(result[0].eth1);
  test.ok(result[0].lo);
  test.done();
}
