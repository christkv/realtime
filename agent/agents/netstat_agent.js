var EventEmitter = require('events').EventEmitter,
  util = require("util"),
  spawn = require('child_process').spawn;

// The io stat agent, build different models depending on the os
var NetstatAgent = function NetstatAgent() {
}

var _buildAgent = function _buildAgent(platform) {
  var arch = process.arch;
  var platform = platform ? platform : process.platform;

  if("darwin" == platform) {
    return new OSXNetstatAgent();
  } else if("linux" == platform) {
    return new LinuxNetstatAgent();
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var OSXNetstatAgent = function OSXNetstatAgent() {
  // Inherit the event emitter
  EventEmitter.call(this);
}

util.inherits(OSXNetstatAgent, EventEmitter);

OSXNetstatAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  // Split up the data
  var lines = data.toString().split(/\n/);
  // Check if we have the first line
  for(var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    // We got the list of disks
    if(line.indexOf('packets') == -1 && line.indexOf('input') == -1 && line.length > 0) {
      var entries = line.trim().split(/ +/);
      var index = 0;
      // Emit the data
      return {
        'os':'osx',
        'ts': new Date().toString(),
        'input': {
          packets: parseInt(entries[index++], 10),
          errs: parseInt(entries[index++], 10),
          bytes: parseInt(entries[index++], 10),
        },
        'output': {
          packets: parseInt(entries[index++], 10),
          errs: parseInt(entries[index++], 10),
          bytes: parseInt(entries[index++], 10),
        },
        'colls': parseInt(entries[index++], 10)
      };
    }
  }
}

OSXNetstatAgent.prototype.start = function start() {
  var self = this;
  if(this.agent) this.stop();
  // Set up the command
  this.agent = spawn('netstat', ['-w', '1']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
    var object = self._parseTopEntry(self, data);
    if(object != null) self.emit("data", object);
  });

  this.agent.stderr.on("data", function(data) {
    self.emit("error", data);
  })

  this.agent.on("exit", function(code) {
    self.emit("end", code);
  });
}

OSXNetstatAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emit("end", 0);
}

//netstat -i -w 1 -e -c
/*******************************************************************************
 *  Linux IO Stat agent
 *******************************************************************************/
var LinuxNetstatAgent = function LinuxNetstatAgent() {
  // Inherit the event emitter
  EventEmitter.call(this);
  // Used to validate keys
  this.keys = {};
  // Current chunk of data
  this.data = [];
}

util.inherits(LinuxNetstatAgent, EventEmitter);

LinuxNetstatAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  // Split up the data
  var lines = data.toString().split(/\n/);
  // The disks available
  var objects = [];
  // var object = {};
  // Check if we have the first line
  for(var i = 0; i < lines.length; i++) {
    if(lines[i].indexOf("Link encap:") != -1) {
      // If the interface is in the key set we are done with one netstat
      var cleanvalues = lines[i].split('Link encap:');//[1].trim().split(/, */);
      if(self.keys[cleanvalues[0].trim()]) {
        // Set object
        var object = {};
        var name = null;
        // Parse all the entries
        for(var j = 0; j < self.data.length; j++) {
          if(self.data[j].indexOf("Link encap:") != -1) {
            var cleanvalues = self.data[j].split('Link encap:');//[1].trim().split(/, */);
            name = cleanvalues[0].trim();
            // Set empty object
            object[name] = {
              'ts': new Date().toString(),
              'input': {},
              'output': {},
              'link_encap': cleanvalues[1].split(/ +/)[0].trim(),
              'hw_addr': cleanvalues[1].split(/ +/)[2] != null ? cleanvalues[1].split(/ +/)[2].trim() : cleanvalues[1].split(/ +/)[1].trim(),
            };
          } else if(self.data[j].indexOf("inet addr:") != -1) {
            var cleanvalues = self.data[j].split(/  /);
            if(name != null) {
              for(var k = 0; k < cleanvalues.length; k++) {
                if(cleanvalues[k].indexOf('inet addr') != -1) {
                  object[name].inet_addr = cleanvalues[k].split(/:/)[1].trim();
                } else if(cleanvalues[k].indexOf('Bcast') != -1) {
                  object[name].bcast = cleanvalues[k].split(/:/)[1].trim();
                } else if(cleanvalues[k].indexOf('Mask') != -1) {
                  object[name].mask = cleanvalues[k].split(/:/)[1].trim();
                }
              }
            }
          } else if(self.data[j].indexOf("RX packets:") != -1) {
            var cleanvalues = self.data[j].split("RX packets:")[1].split(/ +/)
            if(name != null) {
              object[name].input.packets = parseInt(cleanvalues[0].trim(), 10);
              object[name].input.errs = parseInt(cleanvalues[1].split(/:/)[1].trim(), 10);
              object[name].input.dropped = parseInt(cleanvalues[2].split(/:/)[1].trim(), 10);
              object[name].input.overruns = parseInt(cleanvalues[3].split(/:/)[1].trim(), 10);
              object[name].input.frame = parseInt(cleanvalues[4].split(/:/)[1].trim(), 10);
            }
          } else if(self.data[j].indexOf("TX packets:") != -1) {
            var cleanvalues = self.data[j].split("TX packets:")[1].split(/ +/)
            if(name != null) {
              object[name].output.packets = parseInt(cleanvalues[0].trim(), 10);
              object[name].output.errs = parseInt(cleanvalues[1].split(/:/)[1].trim(), 10);
              object[name].output.dropped = parseInt(cleanvalues[2].split(/:/)[1].trim(), 10);
              object[name].output.overruns = parseInt(cleanvalues[3].split(/:/)[1].trim(), 10);
              object[name].output.frame = parseInt(cleanvalues[4].split(/:/)[1].trim(), 10);
            }
          } else if(self.data[j].indexOf("RX bytes:") != -1) {
            var cleanvalues = self.data[j].split("RX bytes:")[1].split(/ +/)
            if(name != null) {
              object[name].input.bytes = parseInt(cleanvalues[0].trim(), 10);
              object[name].output.bytes = parseInt(cleanvalues[4].split(/:/)[1].trim(), 10);
            }
          } else if(self.data[j].indexOf("collisions:") != -1) {
            var cleanvalues = self.data[j].split("collisions:")[1].split(/ +/)
            if(name != null) {
              object[name].colls = parseInt(cleanvalues[0].trim(), 10);
              object[name].txqueuelen = parseInt(cleanvalues[1].trim().split(/:/)[1], 10);
            }
          } else if(self.data[j].indexOf("inet6 addr:") != -1) {
            var cleanvalues = self.data[j].split(/inet6 addr:/)[1].split(/Scope:/)
            if(name != null) {
              object[name].inet_6_addr = cleanvalues[0].trim();
              object[name].scope = cleanvalues[1].trim();
            }
          } else if(self.data[j].indexOf("MTU") != -1) {
            var cleanvalues = self.data[j].split(/MTU:/)
            if(name != null) {
              var temp = cleanvalues[0].trim().split(/ +/);
              object[name].supports = {};
              for(var _i = 0; _i < temp.length; _i++) {
                object[name].supports[temp[_i]] = true;
              }

              // Add the mtu
              object[name].mtu = parseInt(cleanvalues[1].split(/ +/)[0].trim(), 10);
              object[name].metric = parseInt(cleanvalues[1].split(/ +/)[1].split(/:/)[1].trim(), 10);
            }
          }
        }

        // Clear up parsing
        self.data = [];
        self.keys = {};
        // Add object to list
        objects.push(object);
      } else {
        // We found a unknown adapter
        self.keys[cleanvalues[0].trim()] = true;
        // Add to list of data entries
        self.data.push(lines[i]);
      }
    } else {
      self.data.push(lines[i]);
    }
  }
  // Return all objects
  return objects;
}

LinuxNetstatAgent.prototype.start = function start() {
  var self = this;
  if(this.agent) this.stop();
  // Set up the command
  this.agent = spawn('netstat', ['-w', '1']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
    var objects = self._parseTopEntry(self, data);
    for(var i = 0; i < objects.length; i++) {
      self.emit("data", objects[i]);
    }
  });

  this.agent.stderr.on("data", function(data) {
    self.emit("error", data);
  })

  this.agent.on("exit", function(code) {
    self.emit("end", code);
  });
}

LinuxNetstatAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emit("end", 0);
}

exports.build = _buildAgent;