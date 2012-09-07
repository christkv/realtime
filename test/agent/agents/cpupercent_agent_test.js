var cpupercent_agent = require('../../../agent/lib/agents/psutil/cpupercent_agent'),
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
exports['Should correctly retrieve a result for cpu percents on the host machine'] = function(test) {
  // Create an agent running at interval 0.1
  var agent = cpupercent_agent.build(null, {
    interval: 1000
  });

  agent.on("data", function(data) {
    test.ok(data.data);
    test.ok(data.data.length > 0);

    agent.stop();
    test.done();
  });

  agent.on("end", function(code) {
    test.equal(0, code.data);
  });

  agent.on("error", function(data) {
  });

  agent.start();
}