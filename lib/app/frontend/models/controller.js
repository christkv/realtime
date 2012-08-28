/**
 * Base Controller class used for framework
 **/
var Controller = function Controller() {}

Controller.extend = function extend(base, model, object) {
  return function() {
    if(typeof model == 'undefined') throw new Error("model parameters is an undefined symbol");
    // Extend with methods passed
    var newObject = _.extend({}, new Controller());
    newObject = _.extend(newObject, object);
    // add base url
    newObject._base = base;
    // add related model object to the controller
    newObject._model = model;
    // Return extended Object
    return newObject;
  }
}

Controller.prototype._get = function() {
  var self = this;
  // Unpack the variables
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  url = args.length ? args.shift() : '';
  values = args.length ? args.shift() : {};

  // Map url
  for(var key in values) {
    if(url.indexOf(':' + key) != -1) {
      url = url.replace(new RegExp(':' + key, 'g'), values[key]);
    }
  }

  // final url
  var finalUrl = typeof this['_base'] == 'undefined' ? url : this._base + url;
  // Perform a get query
  $.get(finalUrl, function(data, textStatus, jqxhr) {
    // If we have an error return it
    if(!_.isArray(data) && data['err'] != null) {
      return callback(data, null);
    }

    // Set the model creator
    var _model = typeof self['_model'] == 'undefined' ? self.create : self._model;
    // Return value
    var value = _.isArray(data)
      ? _.map(data, function(value, key) { return _model(value)}) : new _model(data);
    // Return the transformed values
    callback(null, value);
  }, 'json').fail(function(jqXHR, textStatus, errorThrown) {
    callback(errorThrown, null);
  });
}

Controller.prototype._put = function() {
  var self = this;
  // Unpack the variables
  var args = Array.prototype.slice.call(arguments, 0);
  var callback = args.pop();
  var url = args.length ? args.shift() : '';
  var values = args.length ? args.shift() : {};
  var object = args.length ? args.shift() : {};

  // Map url
  for(var key in values) {
    if(url.indexOf(':' + key) != -1) {
      url = url.replace(new RegExp(':' + key, 'g'), values[key]);
    }
  }

  // final url
  var finalUrl = typeof this['_base'] == 'undefined' ? url : this._base + url;
  // Perform a get query
  var request = $.ajax({
    url: finalUrl,
    type: 'PUT',
    dataType: 'json',
    data: object
  })

  request.done(function(data) {
    // If we have an error return it
    if(!_.isArray(data) && data['err'] != null) {
      return callback(data, null);
    } else {
      return callback(null, data);
    }
  });

  request.fail(function(jqXHR, textStatus, errorThrown) {
    callback(errorThrown, null);
  });
}

Controller.prototype._post = function() {
  var self = this;
  // Unpack the variables
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  url = args.length ? args.shift() : '';
  values = args.length ? args.shift() : {};

  // final url
  var finalUrl = typeof this['_base'] == 'undefined' ? url : this._base + url;
  // Perform a get query
  $.post(finalUrl, values, function(data, textStatus, jqxhr) {
    console.log(data)

    // If we have an error return it
    if(!_.isArray(data) && data['err'] != null) {
      return callback(data, null);
    }

    // Return the transformed values
    callback(null, data);
  }, 'json').fail(function(jqXHR, textStatus, errorThrown) {
    callback(errorThrown, null);
  });
}
