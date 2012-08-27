var EventEmitter = require('events').EventEmitter,
  util = require("util");

// The io stat agent, build different models depending on the os
var BaseAgent = function BaseAgent(agent_name) {
  // Used to just inform the listener of the agent to basic stable info
  this.agentInformation = {
      agent: agent_name,
      platform: process.platform,
      arch:process.arch,
      pid: process.pid
    };
}

util.inherits(BaseAgent, EventEmitter);

BaseAgent.prototype.singleRun = function singleRun() {
  return typeof this._singleRun == 'boolean' ? this._singleRun : false;
}

BaseAgent.prototype.emitObject = function(event, object) {
  this.emit(event, {info:this.agentInformation, data: object});
}

exports.BaseAgent = BaseAgent;