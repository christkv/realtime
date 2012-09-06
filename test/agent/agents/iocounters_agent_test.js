var iocounters_agent = require('../../../agent/lib/agents/psutil/iocounters_agent'),
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
exports['Should correctly retrieve a result for iocounters'] = function(test) {
  // Create an agent running at interval 0.1
  var iocounters = iocounters_agent.build(null, {
    interval: 10
  });

  iocounters.on("data", function(data) {
    // console.dir(data)
    test.ok(Object.keys(data.data).length > 0);
    test.ok(typeof data.data[Object.keys(data.data)[0]].read_count == 'number');
    test.ok(typeof data.data[Object.keys(data.data)[0]].write_count == 'number');
    test.ok(typeof data.data[Object.keys(data.data)[0]].read_bytes == 'number');
    test.ok(typeof data.data[Object.keys(data.data)[0]].write_bytes == 'number');
    test.ok(typeof data.data[Object.keys(data.data)[0]].read_time == 'number');
    test.ok(typeof data.data[Object.keys(data.data)[0]].write_time == 'number');
    // Stop the iocounters
    iocounters.stop();
    test.done();
  });

  iocounters.on("end", function(code) {
    test.equal(0, code.data);
  });

  iocounters.on("error", function(data) {

  });

  iocounters.start();
}