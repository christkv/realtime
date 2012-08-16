var EventEmitter = require('events').EventEmitter,
  util = require("util"),
  spawn = require('child_process').spawn;

// The io stat agent, build different models depending on the os
var IOStatAgent = function IOStatAgent() {
}

var _buildAgent = function _buildAgent() {
  var arch = process.arch;
  var platform = process.platform;

  if("darwin" == platform) {
    return new OSXIOStatAgent();
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var OSXIOStatAgent = function OSXIOStatAgent() {
  // Inherit the event emitter
  EventEmitter.call(this);
}

util.inherits(OSXIOStatAgent, EventEmitter);

OSXIOStatAgent.prototype.start = function start() {
  var self = this;
  if(this.agent) this.stop();
  // Set up the command
  this.agent = spawn('iostat', ['-w', '1']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
    // Split up the data
    var lines = data.toString().split(/\n/);
    // Check if we have the first line
    for(var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // We got the list of disks
      if(line.indexOf('cpu') != -1) {
        self.disks = line.trim().split(/ +/);
        self.disks = self.disks.slice(0, self.disks.length - 3)
      } else if(line.indexOf('tps') == -1) {
        var entries = line.trim().split(/ +/);
        // Ensure we have enough data
        if(entries.length >= (self.disks.length * 3)) {
          // The disks available
          var disks = {};
          var index = 0;
          for(var j = 0; j < self.disks.length; j++) {
            disks[self.disks[j]] = {
              'kb_t': parseFloat(entries[index++], 10),
              'tps': parseFloat(entries[index++], 10),
              'mb_s': parseFloat(entries[index++], 10)
            };
          }
          // Lets return the rest of the objec
          self.emit("data", {
            'ts': new Date().toString(),
            'cpu':
              {'us': parseFloat(entries[index++], 10), 'sy': parseFloat(entries[index++], 10), 'id': parseFloat(entries[index++], 10)},
            'load_average':
              {'1m': parseFloat(entries[index++], 10), '5m': parseFloat(entries[index++], 10), '15m': parseFloat(entries[index++], 10)},
            'disks':disks
          });
        }
      }
    }
  });

  this.agent.stderr.on("data", function(data) {
    self.emit("error", data);
  })

  this.agent.on("exit", function(code) {
    self.emit("end", code);
  });
}

OSXIOStatAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emit("end", 0);
}

// iostat -x -d 1

exports.build = _buildAgent;