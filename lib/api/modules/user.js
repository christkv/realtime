var async = require('async');

var User = function User(db) {
  this.db = db;
  this.keys = this.db ? this.db.collection('keys') : null;
  this.users = this.db ? this.db.collection('users') : null;
}

User.prototype.init = function init(callback) {
  var self = this;
  // Create collection and the index
  async.series([
    function(callback) { self.db.createCollection('keys', {safe:true}, callback); },
    function(callback) { self.db.createCollection('users', {safe:true}, callback); },
    // Setup the indexes
    function(callback) { self.db.collection('keys').ensureIndex({api_key: 1}, {safe:true}, callback); },
    function(callback) { self.db.collection('users').ensureIndex({api_key: 1}, {safe:true}, callback); },
  ], function(err, results) {
    callback(null, null);
  });
}

User.prototype.subscribeToServer = function subscribeToServer(userId, servers, callback) {
  // Move the servers
  this.users.update({
    _id: userId
  }, {$pushAll: {subscribed: servers}, $pullAll: {unsubscribed: servers}}, {upsert:true, safe:true}, callback);
}

User.prototype.unsubscribeToServer = function unsubscribeToServer(userId, servers, callback) {
  // Move the servers
  this.users.update({
    _id: userId
  }, {$pushAll: {unsubscribed: servers}, $pullAll: {subscribed: servers}}, {upsert:true, safe:true}, callback);
}

User.prototype.fetchListByUserId = function fetchListByUserId(userId, callback) {
  this.users.findOne({_id: userId}, function(err, user) {
    if(err || !user) return callback(err);
    // Let's build the list object and send it
    callback(null, { subscribed: user.subscribed, unsubscribed: user.unsubscribed });
  });
}

User.prototype.addOrUpdateUserServerList = function addOrUpdateUserServerList(data, callback) {
  var self = this;
  // Locate the user for this api_key
  this.users.findOne(
    {
      api_key: data.api_key,
      $or: [
          {'subscribed.address': data.info.net.address},
          {'unsubscribed.address': data.info.net.address}
        ]
    }, function(err, user) {
      if(err) return callback(err, null);
      // Already exists don't insert server
      if(user) return callback(null, null);
      // If no result we might have a user but not the server instance
      self.users.update({api_key: data.api_key}, {$push: {unsubscribed: {
        address: data.info.net.address,
        platform: data.info.platform,
        arch: data.info.arch
      }}}, {upsert:true, safe:true}, callback);
  });
}

User.prototype.locateUserByApiKey = function locateUserByApiKey(apiKey, callback) {
  if(this.users) this.users.findOne({api_key: apiKey});
}

User.prototype.fetchSecretKeyByApiKey = function fetchSecretKeyByApiKey(apiKey, callback) {
  if(this.keys) this.keys.findOne({api_key: apiKey}, callback);
}

exports.User = User