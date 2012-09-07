var EventEmitter = require('events').EventEmitter,
  util = require("util"),
  BaseAgent = require("../base_agent").BaseAgent,
  PSUtil = require("psutil").PSUtil;

var _buildAgent = function _buildAgent(platform, config, logger) {
  var arch = process.arch;
  var platform = platform ? platform : process.platform;
  config = config ? config : {};

  // Set up the platform
  if(typeof platform == 'object') {
    logger = config;
    config = platform;
    platform = process.platform;
  }

  if("darwin" == platform || "linux" == platform) {
    return new NetworkCountersAgent(config, logger);
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var NetworkCountersAgent = function NetworkCountersAgent(config, logger) {
  BaseAgent.call(this, 'network_counters');

  this.config = config;
  this.logger = logger;
  this.psutil = new PSUtil();
  // Set running to false
  this.running = false;
  // Default sampling interval
  this.interval = config.interval ? config.interval : 1000;
}

util.inherits(NetworkCountersAgent, BaseAgent);

NetworkCountersAgent.prototype.start = function start() {
  var self = this;
  this.running = true;

  var executeFunction = function() {
    if(self.running) {
      self.psutil.network_io_counters(true, function(err, counters) {
        if(err) {
          self.emitObject("error", err);
        } else {
          self.emitObject("data", counters);
        }

        if(self.running) setTimeout(executeFunction, self.interval);
      });
    } else {
      if(self.running) setTimeout(executeFunction, self.interval);
    }
  }

  setTimeout(executeFunction, self.interval);
}

NetworkCountersAgent.prototype.stop = function stop() {
  this.running = false;
  this.emitObject("end", 0);
}

exports.build = _buildAgent;