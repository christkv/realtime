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
    return new DiskUsageAgent(config, logger);
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var DiskUsageAgent = function DiskUsageAgent(config, logger) {
  BaseAgent.call(this, 'cpu_timers');

  this.config = config;
  this.logger = logger;
  this.psutil = new PSUtil();
  // Set running to false
  this.running = false;
  // Default sampling interval
  this.interval = config.interval ? Math.round(config.interval / 1000) : 1;
}

util.inherits(DiskUsageAgent, BaseAgent);

DiskUsageAgent.prototype.start = function start() {
  var self = this;
  this.running = true;

  var executeFunction = function() {
    if(self.running) {
      self.psutil.disk_partitions(false, function(err, partitions) {
        if(err) {
          self.emitObject("error", err);
        } else {
          decorate_partitions(self.psutil, partitions, function(err, finalPartitions) {
            self.emitObject("data", finalPartitions);
          });
        }

        if(self.running) setTimeout(executeFunction, this.interval);
      });
    } else {
      if(self.running) setTimeout(executeFunction, this.interval);
    }
  }

  process.nextTick(executeFunction);
}

DiskUsageAgent.prototype.stop = function stop() {
  this.running = false;
  this.emitObject("end", 0);
}

var decorate_partitions = function decorate_partitions(psUtil, partitions, callback) {
  var total = partitions.length;
  var execute = function(_partition) {
    return function() {
      psUtil.disk_usage(_partition.mountpoint, function(err, result) {
        _partition.usage = result;
        total = total - 1;
        if(total == 0) {
          callback(null, partitions);
        }
      });
    }
  }

  // Decorate all the partitions
  for(var i = 0; i < partitions.length; i++) {
    execute(partitions[i])();
  }
}

exports.build = _buildAgent;












