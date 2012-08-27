var EventEmitter = require('events').EventEmitter,
  util = require("util");

// The io stat agent, build different models depending on the os
var BaseAgent = function BaseAgent() {
}

util.inherits(BaseAgent, EventEmitter);

BaseAgent.prototype.singleRun = function singleRun() {
  return typeof this._singleRun == 'boolean' ? this._singleRun : false;
}

BaseAgent.prototype.emitObject = function(event, object) {
  this.emit(event, {info:this.agentInformation, data: object});
}

exports.BaseAgent = BaseAgent;