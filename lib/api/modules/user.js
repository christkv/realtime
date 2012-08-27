var User = function User(db) {
  this.db = db;
}

User.prototype.fetchSecretKeyByApiKey = function fetchSecretKeyByApiKey(apiKey, callback) {
  var keys = this.db.collection('keys');
  // Return a key
  keys.findOne({api_key: apiKey}, callback);
}

exports.User = User