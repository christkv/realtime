var iostat_agent = require('../../../agent/agents/iostat_agent'),
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
exports['Should correctly retrieve a result for iostat on the host machine'] = function(test) {
  // Create an agent
  var iostat = iostat_agent.build();
  var index = 0;
  // Add listener to the agent
  iostat.on("data", function(data) {
    test.ok(data.cpu);
    test.ok(data.load_average);
    test.ok(data.disks);
    index = index + 1;
    if(index == 2) {
      // Stop agent
      iostat.stop();
      // Signal test done
      test.done();
    }
  });

  iostat.on("end", function(code) {
    test.equal(0, code);
  });

  iostat.on("error", function(err) {
  });

  // Start agent
  iostat.start();
}

/**
 * @ignore
 */
exports['Should parse osx iostat'] = function(test) {
  var data = fs.readFileSync("./test/agent/agents/iostat/osx_iostat.log", 'ascii');
  // Create an agent
  var agent = iostat_agent.build('darwin');
  var result = agent._parseTopEntry(agent, data);
  test.equal(2, Object.keys(result.disks).length);
  test.done();
}

/**
 * @ignore
 */
exports['Should parse linux iostat'] = function(test) {
  var data = fs.readFileSync("./test/agent/agents/iostat/debian_iostat.log", 'ascii');
  // Create an agent
  var agent = iostat_agent.build('linux');
  var result = agent._parseTopEntry(agent, data)[0];
  test.equal(5, Object.keys(result.disks).length);
  test.done();
}
