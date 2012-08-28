/**
 * EventEmitter class
 **/
var EventEmitter = function() {
  this._eventHandlers = {};
  this._onceEventHandlers = {};
}

EventEmitter.prototype.on = function(event, callback) {
  if(event == null) throw new Error("A event type not specified");
  if(!typeof callback == 'function') throw new Error("callback must be a function");
  if(this._eventHandlers[event] == null) this._eventHandlers[event] = [];
  this._eventHandlers[event].push(callback);
  return this;
}

EventEmitter.prototype.once = function(event, callback) {
  if(event == null) throw new Error("A event type not specified");
  if(!typeof callback == 'function') throw new Error("callback must be a function");
  if(this._onceEventHandlers[event] == null) this._onceEventHandlers[event] = [];
  this._onceEventHandlers[event].push(callback);
  return this;
}

EventEmitter.prototype.emit = function() {
  try {
    var args = Array.prototype.slice.call(arguments, 0);
    var event = args.length ? args.shift() : null;
    // Throw error if we don't have a event type provided
    if(event == null) throw new Error("No event type provided");

    // Locate all constant event emitters
    if(_.isArray(this._eventHandlers[event])) {
      for(var i = 0; i < this._eventHandlers[event].length; i++) {
        this._eventHandlers[event][i].apply(this, args);
      }
    }

    // Fire all single call event handlers
    if(_.isArray(this._onceEventHandlers[event])) {
      while(this._onceEventHandlers[event].length > 0) {
        this._onceEventHandlers[event].shift().apply(this, args);
      }
    }

    return this;
  } catch(err) {}
}

EventEmitter.prototype.removeListener = function(event, listener) {
  if(event == null) throw new Error("A event type not specified");
  if(!typeof callback == 'function') throw new Error("callback must be a function");
  // Look for the event
  var found = false;
  // If we have an event look for the listener
  if(_.isArray(this._eventHandlers[event])) {
    var events = this._eventHandlers[event];
    // Iterate over all the listeners
    for(var i = 0; i < events.length; i++) {
      if(events[i] === listener) {
        found = true;
        events.slice(i, 1);
        break;
      }
    }
  }

  if(!found && _.isArray(this._onceEventHandlers[event])) {
    var events = this._onceEventHandlers[event];
    // Iterate over all the listeners
    for(var i = 0; i < events.length; i++) {
      if(events[i] === listener) {
        found = true;
        events.slice(i, 1);
        break;
      }
    }
  }

  return this;
}

inherits = function(ctor, superCtor) {
  if(!Object.create) {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

EventEmitter.prototype.removeAllListeners = function(event) {
  if(event == null) {
    this._onceEventHandlers = {};
    this._eventHandlers = {};
    return this;
  }
  // Remove all listeners
  if(this._onceEventHandlers[event] != null) this._onceEventHandlers[event] = null;
  if(this._eventHandlers[event] != null) this._eventHandlers[event] = null;
}

EventEmitter.prototype.listeners = function(event) {
  var listeners = [];

  if(this._onceEventHandlers[event] != null)
    listeners = listeners.concat(this._onceEventHandlers[event]);
  if(this._eventHandlers[event] != null)
    listeners = listeners.concat(this._eventHandlers[event]);
  return listeners;
}
