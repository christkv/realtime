var EventEmitter = require('events').EventEmitter,
  util = require("util"),
  spawn = require('child_process').spawn;

// The io stat agent, build different models depending on the os
var NetstatAgent = function NetstatAgent() {
}

var _buildAgent = function _buildAgent() {
  var arch = process.arch;
  var platform = process.platform;

  if("darwin" == platform) {
    return new OSXNetstatAgent();
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

OSXNetstatAgent.prototype.start = function start() {
  var self = this;
  if(this.agent) this.stop();
  // Set up the command
  this.agent = spawn('netstat', ['-w', '1']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
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
        self.emit("data", {
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
        });
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

OSXNetstatAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emit("end", 0);
}

//netstat -i -w 1 -e -c

exports.build = _buildAgent;