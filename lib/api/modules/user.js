var User = function User(db) {
  this.db = db;
  this.keys = this.db ? this.db.collection('keys') : null;
}

User.prototype.fetchSecretKeyByApiKey = function fetchSecretKeyByApiKey(apiKey, callback) {
  if(this.keys) this.keys.findOne({api_key: apiKey}, callback);
}

exports.User = User