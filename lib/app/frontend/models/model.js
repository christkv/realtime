/**
 * Base Model class used for framework
 **/
var Model = function Model() {
  // default id field
  this.id = 'id';
  // contains all dirty fields
  this._dirty = {};
}

Model.extend = function extend(object) {
  // The creation function
  var createFunction = function(values) {
    // Extend with methods passed
    var newObject = _.extend({}, new Model());
    newObject = _.extend(newObject, object);
    // Set values
    newObject['_values'] = values;
    // Add create function
    newObject.create = createFunction;
    // Return extended Object
    return newObject;
  }
  // Return it for the constructor
  return createFunction;
}

Model.prototype._get = Controller.prototype._get;
Model.prototype._put = Controller.prototype._put;
Model.prototype._post = Controller.prototype._post;
Model.prototype.get = function(field) {
  return field == "id" ? this._values[this.id] : this._values[field];
}

Model.prototype.set = function(field, value) {
  if(field == "id") throw new Error("id cannot be changed on an existing object");
  // Save the field change to the list of dirty fields (including new ones)
  // allows us to do efficient updates on the server
  this._dirty[field] = value;
  // Set the field to the current value
  this._values[field] = value;
}

Model.prototype.fetch = function(callback) {
  if(typeof this['url'] == 'undefined') throw new Error("no url for model defined");
  // Rewrite it key if it does not exist
  if(this._values[this.id]) this._values['id'] = this._values[this.id];
  // Get the final url
  var _url = this.root + (typeof this.url == 'function' ? this.url(this._values) : this.url);
  // Exectue the get
  this._get(_url, this._values, callback);
}

Model.prototype.addError = function(key, error) {
  if(this._validationErrors == null) this._validationErrors = {};
  if(this._validationErrors[key] == null) this._validationErrors[key] = [];
  this._validationErrors[key].push();
}

Model.prototype.clearErrors = function() {
  this._validationErrors = {};
}

Model.prototype.save = function(callback) {
  if(typeof this['url'] == 'undefined') throw new Error("no url for model defined");
  var self = this;
  // Rewrite it key if it does not exist
  if(this._values[this.id]) this._values['id'] = this._values[this.id];
  // Call validate if it exists
  if(typeof this.validate == 'function') {
    if(!this.validate()) return false;
  }

  // Get the final url
  var _url = this.root + (typeof this.url == 'function' ? this.url(this._values) : this.url);
  // Object we are sending
  var object = {
    values: this._values,
    dirty: this._dirty
  }

  // Add the id we have specified
  object[this.id] = this._values['id'];

  // If we have no idea this is a new object
  if(object[this.id] != null) {
    this._put(_url, this._values, object, function(err, data) {
      if(err) return callback(err);
      return callback(null, self);
    });
  } else {
    this._post(this.root, this._values, function(err, data) {
      if(err) return callback(err);
      // Locate the id and add it to the model
      self._values[self.id] = data[self.id];
      // Return the model itself
      callback(null, self);
    });
  }

  return true;
}

/**
 * Application script controllers
 **/
var ScriptModel = Model.extend({
 id: "_id",
 root: "/scripts",

 url: function(values) {
   return "/:id";
 },

 validate: function() {
   console.log("=================================== ScriptModel :: validate");
   return true;
 }
});

var ScriptController = Controller.extend('/scripts', ScriptModel, {
  list: function(callback) {
    // Get the main level script objects
    this._get(callback);
  }
});