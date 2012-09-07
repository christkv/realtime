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
    return new ProcessesAgent(config, logger);
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var ProcessesAgent = function ProcessesAgent(config, logger) {
  BaseAgent.call(this, 'cpu_timers');

  this.config = config;
  this.logger = logger;
  this.psutil = new PSUtil();
  // Set running to false
  this.running = false;
  // Default sampling interval
  this.interval = config.interval ? config.interval : 1000;
}

util.inherits(ProcessesAgent, BaseAgent);

ProcessesAgent.prototype.start = function start() {
  var self = this;
  this.running = true;

  var executeFunction = function() {
    if(self.running) {
      self.psutil.process_list(function(err, processes) {
        if(err) {
          self.emitObject("error", err);
        } else {

          // Decorate the processes
          decorate_processes(processes, function(err, finalProcesses) {
            self.emitObject("data", finalProcesses);
          });
        }

        if(self.running) setTimeout(executeFunction, this.interval);
      });
    } else {
      if(self.running) setTimeout(executeFunction, this.interval);
    }
  }

  setTimeout(executeFunction, this.interval);
}

ProcessesAgent.prototype.stop = function stop() {
  this.running = false;
  this.emitObject("end", 0);
}

var decorate_processes = function decorate_processes(processes, callback) {
  var total = processes.length;

  for(var i = 0; i < processes.length; i++) {
    var execute = function(_process) {
      return function() {
        var parallel_counter = 0;
        var parallel_goal = 4;

        var returnFunction = function() {
          if(parallel_counter >= parallel_goal) {
            total = total - 1;

            if(total == 0) {
              callback(null, processes);
            }
          }
        }

        _process.name(function() {
          parallel_counter = parallel_counter + 1;
          returnFunction();
        });

        _process.exe(function() {
          parallel_counter = parallel_counter + 1;
          returnFunction();
        });

        _process.ppid(function() {
          parallel_counter = parallel_counter + 1;
          returnFunction();
        });

        _process.cpu_times(function() {
          parallel_counter = parallel_counter + 1;
          returnFunction();
        });
      }
    };

    execute(processes[i])();
  }
}

exports.build = _buildAgent;
























