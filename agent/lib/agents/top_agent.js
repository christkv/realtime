var EventEmitter = require('events').EventEmitter,
  util = require("util"),
  spawn = require('child_process').spawn,
  exec = require('child_process').exec,
  format = require('util').format,
  BaseAgent = require("./base_agent").BaseAgent;

var _buildAgent = function _buildAgent(platform, config, logger) {
  var arch = process.arch;
  platform = platform ? platform : process.platform;

  // Set up the platform
  if(typeof platform == 'object') {
    logger = config;
    config = platform;
    platform = process.platform;
  }

  if("darwin" == platform) {
    return new OSXTopAgent(config, logger);
  } else if("linux" == platform) {
    return new LinuxTopAgent(config, logger);
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var OSXTopAgent = function OSXTopAgent(config, logger) {
  BaseAgent.call(this);
  // Save config settings
  this.logger = logger;
  this.config = config;
  this._singleRun = true;
}

util.inherits(OSXTopAgent, BaseAgent);

OSXTopAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  // Split up the lines
  var lines = data.trim().split(/\n/);
  var parsingData = false;
  var object = {os:'osx', 'ts': new Date().toString(), processes: []};

  // Parse the lines
  for(var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    if(line.indexOf('Processes:') != -1) {
      var cleanvalues = line.split('Processes:')[1].trim().split(/, */);
      object.processes_stats = {
        total: parseInt(cleanvalues[0].split(/ +/)[0], 10),
        running: parseInt(cleanvalues[1].split(/ +/)[0], 10),
        stuck: parseInt(cleanvalues[2].split(/ +/)[0], 10),
        sleeping: parseInt(cleanvalues[3].split(/ +/)[0], 10),
        threads: parseInt(cleanvalues[4].split(/ +/)[0], 10)
      }
    } else if(line.indexOf('Load Avg:') != -1) {
      var cleanvalues = line.split('Load Avg:')[1].trim().split(/, */);
      object.load_avg = cleanvalues.map(function(value) { return parseFloat(value.trim(), 10)});
    } else if(line.indexOf('CPU usage:') != -1) {
      var cleanvalues = line.split('CPU usage:')[1].trim().split(/, */);
      object.cpu_usage = {
        user: parseFloat(cleanvalues[0].split(/ +/)[0].replace(/%/, ''), 10),
        sys: parseFloat(cleanvalues[1].split(/ +/)[0].replace(/%/, ''), 10),
        idle: parseFloat(cleanvalues[2].split(/ +/)[0].replace(/%/, ''), 10)
      }
    } else if(line.indexOf('SharedLibs:') != -1) {
      var cleanvalues = line.split('SharedLibs:')[1].trim().split(/, */);
      object.cpu_usage = {
        resident: {
          value: parseFloat(cleanvalues[0].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[0].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        data: {
          value: parseFloat(cleanvalues[1].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[1].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        linkedit: {
          value: parseFloat(cleanvalues[2].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[2].split(/ +/)[0].split(/[0-9|.]+/)[1]
        }
      }
    } else if(line.indexOf('MemRegions:') != -1) {
      var cleanvalues = line.split('MemRegions:')[1].trim().split(/, */);
      object.mem_regions = {
        total: parseInt(cleanvalues[0].split(/ +/)[0], 10),
        resident: {
          value: parseFloat(cleanvalues[1].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[1].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        private: {
          value: parseFloat(cleanvalues[2].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[2].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        shared: {
          value: parseFloat(cleanvalues[3].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[3].split(/ +/)[0].split(/[0-9|.]+/)[1]
        }
      }
    } else if(line.indexOf('PhysMem:') != -1) {
      var cleanvalues = line.split('PhysMem:')[1].trim().split(/, */);
      object.phys_mem = {
        wired: {
          value: parseFloat(cleanvalues[0].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[0].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        active: {
          value: parseFloat(cleanvalues[1].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[1].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        inactive: {
          value: parseFloat(cleanvalues[2].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[2].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        used: {
          value: parseFloat(cleanvalues[3].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[3].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        free: {
          value: parseFloat(cleanvalues[4].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[4].split(/ +/)[0].split(/[0-9|.]+/)[1]
        }
      }

      // Create total memory object
      object.phys_mem.total = {
        value: (object.phys_mem.used.value + object.phys_mem.free.value),
        unit: object.phys_mem.used.unit
      }
    } else if(line.indexOf('VM:') != -1) {
      var cleanvalues = line.split('VM:')[1].trim().split(/, */);
      object.phys_mem = {
        vsize: {
          value: parseFloat(cleanvalues[0].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[0].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        framework_vsiz: {
          value: parseFloat(cleanvalues[1].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[1].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        pageins: parseInt(cleanvalues[2].split(/ +/)[0].split(/\([0-9|.]+\)/)[0], 10),
        pageouts: parseInt(cleanvalues[3].split(/ +/)[0].split(/\([0-9|.]+\)/)[0], 10)
      }
    } else if(line.indexOf('Swap:') != -1) {
      var cleanvalues = line.split('Swap:')[1].trim().split(/, */);
      object.swap = {
        free: cleanvalues[0].match(/[0-9]+[A-Z|a-z]/g).map(function(value) {
          return {
            value: parseFloat(value.split(/[A-Z|a-z]/)[0], 10),
            unit: value.split(/[0-9]+/)[1]
          };
        })
      }
    } else if(line.indexOf('Purgeable:') != -1) {
      var cleanvalues = line.split('Purgeable:')[1].trim().split(/, */);
      object.purgeable = {
        mem: {
          value: parseFloat(cleanvalues[0].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[0].split(/ +/)[0].split(/[0-9]+/)[1]
        },
        pages: parseFloat(cleanvalues[0].split(/ +/)[1].replace(/\([0-9|.]+\)/, ''), 10),
      }
    } else if(line.indexOf('Networks:') != -1) {
      var cleanvalues = line.split('Networks:')[1].trim().split(/, */);
      object.networks = {
        in: {
          packets: parseInt(cleanvalues[0].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[0], 10),
          size: {
            value: parseFloat(cleanvalues[0].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[1].split(/[A-Z|a-z]/)[0], 10),
            unit: cleanvalues[0].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[1].split(/[0-9|.]+/)[1]
          }
        },
        out: {
          packets: parseInt(cleanvalues[1].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[0], 10),
          size: {
            value: parseFloat(cleanvalues[1].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[1].split(/[A-Z|a-z]/)[0], 10),
            unit: cleanvalues[1].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[1].split(/[0-9|.]+/)[1]
          }
        }
      }
    } else if(line.indexOf('Disks:') != -1) {
      var cleanvalues = line.split('Disks:')[1].trim().split(/, */);
      object.disks = {
        read: {
          pages: parseInt(cleanvalues[0].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[0], 10),
          size: {
            value: parseFloat(cleanvalues[0].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[1].split(/[A-Z|a-z]/)[0], 10),
            unit: cleanvalues[0].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[1].split(/[0-9|.]+/)[1]
          }
        },
        written: {
          pages: parseInt(cleanvalues[1].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[0], 10),
          size: {
            value: parseFloat(cleanvalues[1].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[1].split(/[A-Z|a-z]/)[0], 10),
            unit: cleanvalues[1].match(/[0-9]+\/[0-9]+[A-Z|a-z]/g)[0].split(/\//)[1].split(/[0-9|.]+/)[1]
          }
        }
      }
    } else if(line.indexOf('PID') != -1) {
      // Switch to data parsing
      parsingData = true;
    } else if(parsingData) {
      var cleanvalues = line.trim().split(/ +/)
      // Command is longer than a single word, modify the split
      if(cleanvalues.length > 28) {
        // Remove it
        var command = cleanvalues.splice(1, cleanvalues.length - 28).join(" ");
        // Add it back
        cleanvalues.splice(1, 1, command);
      }

      // Add all the commands
      object.processes.push({
        pid: parseInt(cleanvalues[0].match(/[0-9]+/), 10),
        command: cleanvalues[1].trim(),
        cpu: parseFloat(cleanvalues[2].trim(), 10),
        time: cleanvalues[3].trim(),
        threads: {
          total: parseInt(cleanvalues[4].trim().split(/\//)[0], 10),
          running: parseInt(cleanvalues[4].trim().split(/\//)[1], 10)
        },
        work_queue: parseInt(cleanvalues[5].trim(), 10),
        ports: parseInt(cleanvalues[6].trim().replace(/\+|\-/, ''), 10),
        memory_regions: parseInt(cleanvalues[7].trim().replace(/\+|\-/, ''), 10),
        resident_private_addr_size: {
          value: parseInt(cleanvalues[8].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[8].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1],
        },
        resident_shared_addr_size: {
          value: parseInt(cleanvalues[9].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[9].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1],
        },
        resident_memory_size: {
          value: parseInt(cleanvalues[10].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[10].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1],
        },
        private_address_space_size: {
          value: parseInt(cleanvalues[11].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[11].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1],
        },
        total_memory_size: {
          value: parseInt(cleanvalues[12].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[12].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1],
        },
        process_group_id: parseInt(cleanvalues[13].trim(), 10),
        parent_process_id: parseInt(cleanvalues[14].trim(), 10),
        state: cleanvalues[15].trim(),
        user_id: parseInt(cleanvalues[16].trim(), 10),
        page_faults: parseInt(cleanvalues[17].trim().replace(/\+|\-/, ''), 10),
        copy_on_write_faults: parseInt(cleanvalues[18].trim().replace(/\+|\-/, ''), 10),
        total_mach_messages_sent: parseInt(cleanvalues[19].trim().replace(/\+|\-/, ''), 10),
        total_mach_messages_recv: parseInt(cleanvalues[20].trim().replace(/\+|\-/, ''), 10),
        total_bsd_syscalls: parseInt(cleanvalues[21].trim().replace(/\+|\-/, ''), 10),
        total_mach_syscalls: parseInt(cleanvalues[22].trim().replace(/\+|\-/, ''), 10),
        number_of_context_switches: parseInt(cleanvalues[23].trim().replace(/\+|\-/, ''), 10),
        pageins: parseInt(cleanvalues[24].trim().replace(/\+|\-/, ''), 10),
        private_kernel_memory_size: {
          value: parseInt(cleanvalues[25].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[25].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1],
        },
        shared_kernel_memory_size: {
          value: parseInt(cleanvalues[26].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[26].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1],
        },
        user: cleanvalues[27].trim(),
      });
    }
  }
  // Return the object
  return object;
}

OSXTopAgent.prototype.start = function start() {
  var self = this;
  // Set up and execute the command
  this.agent = exec('top -S -r -l 1',
    function (error, stdout, stderr) {
      if(error !== null) {
        if(self.logger) self.logger.error(format("[top]:agent received error:%s", error.toString()));
        self.emit("error", error);
      } else if(stderr != null && stderr.length > 0) {
        if(self.logger) self.logger.error(format("[top]:agent received error:%s", stderr.toString()));
        self.emit("error", stderr);
      } else {
        var object = self._parseTopEntry(self, stdout);
        if(object) self.emit("data", object);
        self.emit("end", 0);
      }
  });
}

OSXTopAgent.prototype.stop = function stop() {
  try {
    if(this.agent) {
      this.agent.kill('SIGKILL');
    }
  } catch(err) {}
}

/*******************************************************************************
 *  Linux IO Stat agent
 *******************************************************************************/
var LinuxTopAgent = function OSXTopAgent(config, logger) {
  // Inherit the event emitter
  EventEmitter.call(this);
  // Save config settings
  this.logger = logger;
  this.config = config;
  this._singleRun = true;
}

util.inherits(LinuxTopAgent, EventEmitter);

LinuxTopAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  // Split up the lines
  var lines = data.toString().trim().split(/\n/);
  var parsingData = false;
  var object = {os:'linux', 'ts': new Date().toString(), processes: []};

  // Parse the lines
  for(var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    if(line.indexOf('load average:') != -1) {
      var cleanvalues = line.split('load average:')[1].trim().split(/, */);
      object.load_avg = cleanvalues.map(function(value) { return parseFloat(value.trim(), 10)});
    } else if(line.indexOf('Tasks:') != -1) {
      var cleanvalues = line.split('Tasks:')[1].trim().split(/, */);
      object.processes_stats = {
        total: parseInt(cleanvalues[0].split(/ +/)[0], 10),
        running: parseInt(cleanvalues[1].split(/ +/)[0], 10),
        sleeping: parseInt(cleanvalues[3].split(/ +/)[0], 10),
        stuck: parseInt(cleanvalues[2].split(/ +/)[0], 10)
      }
    } else if(line.indexOf('Cpu(s):') != -1) {
      var cleanvalues = line.split('Cpu(s):')[1].trim().split(/, */);
      object.cpu_usage = {
        user: parseFloat(cleanvalues[0].replace(/%[a-z|A-Z]+/, ''), 10),
        sys: parseFloat(cleanvalues[1].replace(/%[a-z|A-Z]+/, ''), 10),
        nice: parseFloat(cleanvalues[2].replace(/%[a-z|A-Z]+/, ''), 10),
        idle: parseFloat(cleanvalues[3].replace(/%[a-z|A-Z]+/, ''), 10),
        io_wait: parseFloat(cleanvalues[4].replace(/%[a-z|A-Z]+/, ''), 10),
        hardware_irq: parseFloat(cleanvalues[5].replace(/%[a-z|A-Z]+/, ''), 10),
        software_irq: parseFloat(cleanvalues[6].replace(/%[a-z|A-Z]+/, ''), 10),
        steal_time: parseFloat(cleanvalues[7].replace(/%[a-z|A-Z]+/, ''), 10),
      }
    } else if(line.indexOf('Mem:') != -1) {
      var cleanvalues = line.split('Mem:')[1].trim().split(/, */);
      object.phys_mem = {
        total: {
          value: parseFloat(cleanvalues[0].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[0].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        used: {
          value: parseFloat(cleanvalues[1].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[1].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        free: {
          value: parseFloat(cleanvalues[2].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[2].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        buffers: {
          value: parseFloat(cleanvalues[3].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[3].split(/ +/)[0].split(/[0-9|.]+/)[1]
        }
      }
    } else if(line.indexOf('Swap:') != -1) {
      var cleanvalues = line.split('Swap:')[1].trim().split(/, */);
      object.swap = {
        total: {
          value: parseFloat(cleanvalues[0].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[0].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        used: {
          value: parseFloat(cleanvalues[1].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[1].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        free: {
          value: parseFloat(cleanvalues[2].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[2].split(/ +/)[0].split(/[0-9|.]+/)[1]
        },
        cached: {
          value: parseFloat(cleanvalues[3].split(/ +/)[0].split(/[A-Z|a-z]/)[0], 10),
          unit: cleanvalues[3].split(/ +/)[0].split(/[0-9|.]+/)[1]
        }
      }
    } else if(line.indexOf('PID') != -1) {
      parsingData = true;
    } else if(parsingData) {
      var cleanvalues = line.trim().split(/ +/)
      // Add all the commands
      object.processes.push({
        pid: parseInt(cleanvalues[0].match(/[0-9]+/), 10),
        user: cleanvalues[1].trim(),
        priority: isNaN(parseInt(cleanvalues[2].match(/[0-9]+/), 10)) ? cleanvalues[2] : parseInt(cleanvalues[2].match(/[0-9]+/), 10),
        nice: isNaN(parseInt(cleanvalues[3].match(/[0-9]+/), 10)) ? cleanvalues[3] : parseInt(cleanvalues[3].match(/[0-9]+/), 10),
        virtual_memory: {
          value: parseInt(cleanvalues[4].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[4].match(/[0-9]+[a-z|A-Z]+/) ? cleanvalues[4].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1] : 'k'
        },
        resident_memory_size: {
          value: parseInt(cleanvalues[5].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[5].match(/[0-9]+[a-z|A-Z]+/) ? cleanvalues[5].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1] : 'k'
        },
        resident_shared_addr_size: {
          value: parseInt(cleanvalues[6].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[6].match(/[0-9]+[a-z|A-Z]+/) ? cleanvalues[6].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1] : 'k'
        },
        state: cleanvalues[7].trim(),
        cpu: parseFloat(cleanvalues[8].trim(), 10),
        resident_private_addr_size: {
          value: parseFloat(cleanvalues[9].trim().replace(/\+|\-/, '').split(/[A-Z][a-z]/)[0], 10),
          unit: cleanvalues[9].match(/[0-9]+[a-z|A-Z]+/) ? cleanvalues[9].trim().replace(/\+|\-/, '').split(/[0-9]+/)[1] : 'k'
        },
        time: cleanvalues[10].trim(),
        command: cleanvalues.slice(11).join(" "),
      });
    }
  }

  return object;
}

LinuxTopAgent.prototype.start = function start() {
  var self = this;
  var allData = '';
  if(this.agent) this.stop();

  var self = this;
  if(this.agent) this.stop();
  // Set up the command
  this.agent = spawn('top', ['-bn1']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
    allData += data;
  });

  this.agent.stderr.on("data", function(data) {
    if(self.logger) self.logger.error(format("[top]:agent received error:%s", data.toString()));
    self.emit("error", data);
  })

  this.agent.on("exit", function(code) {
    var object = self._parseTopEntry(self, allData);
    if(object) self.emit("data", object);
    self.emit("end", code);
  });
}

LinuxTopAgent.prototype.stop = function stop() {
  try {
    if(this.agent) {
      this.agent.kill('SIGKILL');
    }
  } catch(err) {}
}

exports.build = _buildAgent;