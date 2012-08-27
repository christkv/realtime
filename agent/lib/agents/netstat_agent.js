var EventEmitter = require('events').EventEmitter,
  util = require("util"),
  spawn = require('child_process').spawn,
  BaseAgent = require("./base_agent").BaseAgent;

var _buildAgent = function _buildAgent(platform, config, logger) {
  var arch = process.arch;
  var platform = platform ? platform : process.platform;

  // Set up the platform
  if(typeof platform == 'object') {
    logger = config;
    config = platform;
    platform = process.platform;
  }

  if("darwin" == platform) {
    return new OSXNetstatAgent(config, logger);
  } else if("linux" == platform) {
    return new LinuxNetstatAgent(config, logger);
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var OSXNetstatAgent = function OSXNetstatAgent(config, logger) {
  BaseAgent.call(this, 'netstat');

  this.config = config;
  this.logger = logger;
  // Used to just inform the listener of the agent to basic stable info
  this.agentInformation = {agent: 'iostat', platform: process.platform, arch:process.arch};
}

util.inherits(OSXNetstatAgent, BaseAgent);

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
    if(object != null) self.emitObject("data", object);
  });

  this.agent.stderr.on("data", function(data) {
    if(self.logger) self.logger.error(format("[netstat]:agent received error:%s", data.toString()));
    self.emitObject("error", data);
  })

  this.agent.on("exit", function(code) {
    self.emitObject("end", code);
  });
}

OSXNetstatAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emitObject("end", 0);
}

/*******************************************************************************
 *  Linux IO Stat agent
 *******************************************************************************/
var LinuxNetstatAgent = function LinuxNetstatAgent(config, logger) {
  BaseAgent.call(this, 'netstat');
  // Save config settings
  this.logger = logger;
  this.config = config;
  // Used to validate keys
  this.keys = {};
  // Current chunk of data
  this.data = '';
  // Used to just inform the listener of the agent to basic stable info
  this.agentInformation = {agent: 'iostat', platform: process.platform, arch:process.arch};
}

util.inherits(LinuxNetstatAgent, BaseAgent);

LinuxNetstatAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  // The disks available
  var objects = [];
  // Add the data to our existing object
  this.data += data;
  // Validate that we have a full set of keys
  var keys = {};
  var devices = this.data.match(/[a-z|A-Z|0-9]+ +Link encap:/g);
  // Find the first duplicate and cut it off from there
  for(var i = 0; i < devices.length; i++) {
    var key = devices[i].split(/ +/)[0];

    if(keys[key] == true) {
      // Locate the index
      var index = this.data.indexOf(devices[i], this.data.indexOf(devices[i]) + 1);
      var data = this.data.substr(0, index);
      this.data = this.data.substr(index);
      // Break up into lines
      var lines = data.split(/\n/);
      // Set object
      keys = {};
      var object = {};
      var name = null;
      // Parse all the entries
      for(var j = 0; j < lines.length; j++) {
        if(lines[j].indexOf("Link encap:") != -1) {
          var cleanvalues = lines[j].split('Link encap:');//[1].trim().split(/, */);
          name = cleanvalues[0].trim();
          // Set empty object
          object[name] = {
            'ts': new Date().toString(),
            'input': {},
            'output': {},
            'link_encap': cleanvalues[1].split(/ +/)[0].trim(),
            'hw_addr': cleanvalues[1].split(/ +/)[2] != null ? cleanvalues[1].split(/ +/)[2].trim() : cleanvalues[1].split(/ +/)[1].trim(),
          };
        } else if(lines[j].indexOf("inet addr:") != -1) {
          var cleanvalues = lines[j].split(/  /);
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
        } else if(lines[j].indexOf("RX packets:") != -1) {
          var cleanvalues = lines[j].split("RX packets:")[1].split(/ +/)
          if(name != null) {
            object[name].input.packets = parseInt(cleanvalues[0].trim(), 10);
            object[name].input.errs = parseInt(cleanvalues[1].split(/:/)[1].trim(), 10);
            object[name].input.dropped = parseInt(cleanvalues[2].split(/:/)[1].trim(), 10);
            object[name].input.overruns = parseInt(cleanvalues[3].split(/:/)[1].trim(), 10);
            object[name].input.frame = parseInt(cleanvalues[4].split(/:/)[1].trim(), 10);
          }
        } else if(lines[j].indexOf("TX packets:") != -1) {
          var cleanvalues = lines[j].split("TX packets:")[1].split(/ +/)
          if(name != null) {
            object[name].output.packets = parseInt(cleanvalues[0].trim(), 10);
            object[name].output.errs = parseInt(cleanvalues[1].split(/:/)[1].trim(), 10);
            object[name].output.dropped = parseInt(cleanvalues[2].split(/:/)[1].trim(), 10);
            object[name].output.overruns = parseInt(cleanvalues[3].split(/:/)[1].trim(), 10);
            object[name].output.frame = parseInt(cleanvalues[4].split(/:/)[1].trim(), 10);
          }
        } else if(lines[j].indexOf("RX bytes:") != -1) {
          var cleanvalues = lines[j].split("RX bytes:")[1].split(/ +/)
          if(name != null) {
            object[name].input.bytes = parseInt(cleanvalues[0].trim(), 10);
            object[name].output.bytes = parseInt(cleanvalues[4].split(/:/)[1].trim(), 10);
          }
        } else if(lines[j].indexOf("collisions:") != -1) {
          var cleanvalues = lines[j].split("collisions:")[1].split(/ +/)
          if(name != null) {
            object[name].colls = parseInt(cleanvalues[0].trim(), 10);
            object[name].txqueuelen = parseInt(cleanvalues[1].trim().split(/:/)[1], 10);
          }
        } else if(lines[j].indexOf("inet6 addr:") != -1) {
          var cleanvalues = lines[j].split(/inet6 addr:/)[1].split(/Scope:/)
          if(name != null) {
            object[name].inet_6_addr = cleanvalues[0].trim();
            object[name].scope = cleanvalues[1].trim();
          }
        } else if(lines[j].indexOf("MTU") != -1) {
          var cleanvalues = lines[j].split(/MTU:/)
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
      // Add object to list
      if(Object.keys(object).length > 0) objects.push(object);
    } else {
      keys[key] = true;
    }
  }

  // Return all objects
  return objects;
}

LinuxNetstatAgent.prototype.start = function start() {
  var self = this;
  if(this.agent) this.stop();
  // Set up the command
  this.agent = spawn('netstat', ['-i', '-e', '-c']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
    var objects = self._parseTopEntry(self, data);
    for(var i = 0; i < objects.length; i++) {
      self.emitObject("data", objects[i]);
    }
  });

  this.agent.stderr.on("data", function(data) {
    if(self.logger) self.logger.error(format("[netstat]:agent received error:%s", data.toString()));
    self.emitObject("error", data);
  })

  this.agent.on("exit", function(code) {
    self.emitObject("end", code);
  });
}

LinuxNetstatAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emitObject("end", 0);
}

exports.build = _buildAgent;