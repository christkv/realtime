var async = require('async');

var Server = function Server(db) {
  this.db = db;
  this.servers = this.db ? this.db.collection('server') : null;
}

Server.prototype.init = function init(callback) {
  var self = this;
  // Create collection and the index
  async.series([
    function(callback) { self.db.createCollection('server', {safe:true}, callback); },
    // Setup the indexes
    function(callback) { self.db.collection('keys').ensureIndex({api_key: 1, address: 1}, {safe:true}, callback); },
  ], function(err, results) {
    callback(null, null);
  });
}

Server.prototype.addOrUpdateServer = function addOrUpdateServer(data, callback) {
  var self = this;
  // Check if the server exists
  this.servers.findOne({api_key: data.api_key, address: data.info.net.address}, function(err, result) {
    if(err) return callback(err, null);
    if(result) return callback(null);
    // If it does not exist save it
    if(!result) {
      self.servers.insert({
        api_key: data.api_key,
        address: data.info.net.address,
        platform: data.info.platform,
        arch: data.info.arch
      }, {safe:true}, callback);
    }
  });
}

exports.Server = Server