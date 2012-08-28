var async = require('async');

var Data = function Data(db, config) {
  this.db = db;
  this.config = config ? config : { throttle_number: 1000 };
  this.dataCollection = this.db ? this.db.collection('data') : null;
  this.flowCollection = this.db ? this.db.collection('flow') : null;
  // Simple counter allowing us to throttle the number of inserts by using getLastError
  // once in a while
  this.throttleNumber = this.config.throttle_number ? this.config.throttle_number : 0;
  this.currentInsertNumber = 0;
  // Other configs for the data base settings
  this.flowSize = this.config.queue_size ? parseInt(this.config.queue_size, 10) : (1024 * 1000 * 50);
  this.flowMaxDocs = this.config.queue_max_docs ? parseInt(this.config.queue_max_docs, 10) : 1000000;
  // Allow us to set data time to live version 2.2 of mongodb, default to save the data for 7 days
  this.dataTimeToLive = this.config.time_to_live ? parseInt(this.config.time_to_live, 10) : 60 * 60 * 24 * 7;
}

Data.prototype.init = function init(callback) {
  var self = this;
  // Set up all the structures needed
  async.parallel([
    // Setup the collections
    function(callback) { self.db.createCollection('data', {safe:true}, callback); },
    function(callback) { self.db.createCollection('flow', {capped:true, size: self.flowSize, max: self.flowMaxDocs}, callback); }
  ], function(err, results) {
    // Create the indexes
    async.parallel([
      // Setup the indexes
      function(callback) { self.db.collection('data').ensureIndex({at: 1}, {expireAfterSeconds: self.dataTimeToLive, safe:true}, callback); },
      function(callback) { self.db.collection('flow').ensureIndex({at: 1}, {safe:true}, callback); }
    ], function(err, results) {
      callback(null, null);
    });
  });
}

Data.prototype.save = function save(data, callback) {
  if(this.dataCollection) {
    // Let's save the data to the disk doing a getLastError if needed
    if(this.throttleNumber > 0 && this.currentInsertNumber >= this.throttleNumber) {
      // Reset the insert
      this.currentInsertNumber = 0;
      // Save the data (pushing it both to storage and flow)
      this.dataCollection.insert(data, {safe:true}, function() {});
      this.flowCollection.insert(data, {safe:true}, function() {});
    } else {
      this.dataCollection.insert(data);
      this.flowCollection.insert(data);
    }
  }
}

exports.Data = Data;