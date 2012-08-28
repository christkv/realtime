var async = require('async');

var User = function User(db) {
  this.db = db;
  this.keys = this.db ? this.db.collection('keys') : null;
}

User.prototype.init = function init(callback) {
  var self = this;
  // Create collection and the index
  async.series([
    function(callback) { self.db.createCollection('keys', {safe:true}, callback); },
    // Setup the indexes
    function(callback) { self.db.collection('keys').ensureIndex({api_key: 1}, {safe:true}, callback); },
  ], function(err, results) {
    callback(null, null);
  });
}

User.prototype.fetchSecretKeyByApiKey = function fetchSecretKeyByApiKey(apiKey, callback) {
  if(this.keys) this.keys.findOne({api_key: apiKey}, callback);
}

exports.User = User