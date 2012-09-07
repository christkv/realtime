var diskusage_agent = require('../../../agent/lib/agents/psutil/diskusage_agent'),
  fs = require('fs');

exports.setUp = function(callback) {
  callback();
}

exports.tearDown = function(callback) {
  callback();
}

/**
 * @ignore
 */
exports['Should correctly retrieve a result for disk usage on the host machine'] = function(test) {
  var agent = diskusage_agent.build(null, {
    interval: 10
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