var EventEmitter = require('events').EventEmitter,
  util = require("util"),
  spawn = require('child_process').spawn;

// The io stat agent, build different models depending on the os
var TopAgent = function NetstatAgent() {
}

var _buildAgent = function _buildAgent(platform) {
  var arch = process.arch;
  var platform = platform ? platform : process.platform;

  if("darwin" == platform) {
    return new OSXTopAgent();
  } else if("linux" == platform) {
    return new LinuxTopAgent();
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var OSXTopAgent = function OSXTopAgent() {
  // Inherit the event emitter
  EventEmitter.call(this);
}

util.inherits(OSXTopAgent, EventEmitter);

var _parseTopEntry = OSXTopAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  // Split up the lines
  var lines = data.trim().split(/\n/);
  var parsingData = false;
  var object = {processes: []};

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
  if(this.agent) this.stop();
  // Current data entry
  var dataEntry = '';
  // Set up the command
  this.agent = spawn('top', ['-S', '-r', '-l', '3']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
    // Save all the data
    dataEntry = dataEntry + data;
  });

  this.agent.stderr.on("data", function(data) {
    self.emit("error", data);
  })

  this.agent.on("exit", function(code) {
    var dataEntries = dataEntry.split('Processes:');
    // Get the last data
    var finalData = 'Processes:' + dataEntries.pop();
    // If we have a valid execution
    if(code == 0) {
      self.emit("data", _parseTopEntry(self, finalData));
    }
    // Emit the end signal
    self.emit("end", code);
  });
}

OSXTopAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emit("end", 0);
}

/*******************************************************************************
 *  Linux IO Stat agent
 *******************************************************************************/
var LinuxTopAgent = function OSXTopAgent() {
  // Inherit the event emitter
  EventEmitter.call(this);
}

util.inherits(LinuxTopAgent, EventEmitter);

var _parseTopEntry = LinuxTopAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  console.log("===================================================================================")
  console.log(data)
}

LinuxTopAgent.prototype.start = function start() {
  var self = this;
  if(this.agent) this.stop();

  // // Set up the command
  // this.agent = spawn('top', ['-S', '-r', '-l', '3']);
  // // Add listeners
  // this.agent.stdout.on("data", function(data) {
  //   // Save all the data
  //   dataEntry = dataEntry + data;
  // });

  // this.agent.stderr.on("data", function(data) {
  //   self.emit("error", data);
  // })

  // this.agent.on("exit", function(code) {
  //   var dataEntries = dataEntry.split('Processes:');
  //   // Get the last data
  //   var finalData = 'Processes:' + dataEntries.pop();
  //   // If we have a valid execution
  //   if(code == 0) {
  //     self.emit("data", _parseTopEntry(self, finalData));
  //   }
  //   // Emit the end signal
  //   self.emit("end", code);
  // });
}

LinuxTopAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emit("end", 0);
}

exports.build = _buildAgent;