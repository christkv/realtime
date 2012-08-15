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

  iostat.on("end", function(data) {
    test.equal(null, data);
  });

  iostat.on("error", function(err) {
  });

  // Start agent
  iostat.start();
}