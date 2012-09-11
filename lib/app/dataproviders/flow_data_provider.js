var fs = require('fs')
  , inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter;

var FlowDataProvider = function FlowDataProvider(db) {
  EventEmitter.call(this);
  // Save the db
  this.db = db;
  // Get the collection for the flow
  this.collection = this.db.collection("flow");
}

inherits(FlowDataProvider, EventEmitter);

FlowDataProvider.prototype.start = function start(callback) {
  var self = this;
  // Retry function, it's here for the situation where the collection does not exist
  // or if the cursor times out or dies for some reason (this is a new query)
  var tailCursorWithRetry = function() {
    // Send from current point in time
    var currentPointInTime = new Date().getTime();
    // Let's connect to the cursor
    var cursor = self.collection.find({at: {$gte: currentPointInTime}}, {tailable:true, tailableRetryInterval:1000, numberOfRetries:1000});
    var stream = cursor.stream();

    // Pass on the data
    stream.on("data", function(data) {
      // console.log("=========== cursor items:: " + cursor.items.length)
      // console.dir(data)
      process.nextTick(function() {
        self.emit("data", data);
      })
    })

    // Signal end of the cursor
    stream.on("end", function() {
      setTimeout(tailCursorWithRetry, 1000);
    })
  };

  // Start tailing
  tailCursorWithRetry();
  // Return
  callback(null, null)
}

exports.FlowDataProvider = FlowDataProvider;