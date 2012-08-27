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
    return new OSXIOStatAgent(config, logger);
  } else if("linux" == platform) {
    return new LinuxIOStatAgent(config, logger);
  }

  // Throw an unsuported error
  throw new Error("platform " + platform + " no supoorted by this agent");
}

/*******************************************************************************
 *  OSX IO Stat agent
 *******************************************************************************/
var OSXIOStatAgent = function OSXIOStatAgent(config, logger) {
  BaseAgent.call(this);

  this.config = config;
  this.logger = logger;
  // Used to just inform the listener of the agent to basic stable info
  this.agentInformation = {agent: 'iostat', platform: process.platform, arch:process.arch};
}

util.inherits(OSXIOStatAgent, BaseAgent);

OSXIOStatAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  // Split up the data
  var lines = data.toString().split(/\n/);
  // The disks available
  var disks = {};
  var object = {os:'osx', 'ts': new Date().toString()};
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
        var index = 0;
        for(var j = 0; j < self.disks.length; j++) {
          disks[self.disks[j]] = {
            'kb_t': parseFloat(entries[index++], 10),
            'tps': parseFloat(entries[index++], 10),
            'mb_s': parseFloat(entries[index++], 10)
          };
        }
        // Create object
        object = {
          'ts': new Date().toString(),
          'cpu':
            {'us': parseFloat(entries[index++], 10), 'sy': parseFloat(entries[index++], 10), 'id': parseFloat(entries[index++], 10)},
          'load_average':
            {'1m': parseFloat(entries[index++], 10), '5m': parseFloat(entries[index++], 10), '15m': parseFloat(entries[index++], 10)},
          'disks':disks
        }
      }
    }
  }
  // Return the object
  return object;
}

OSXIOStatAgent.prototype.start = function start() {
  var self = this;
  if(this.agent) this.stop();
  // Set up the command
  this.agent = spawn('iostat', ['-w', '1']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
    var object = self._parseTopEntry(self, data);
    if(object != null) self.emitObject("data", object);
  });

  this.agent.stderr.on("data", function(data) {
    if(self.logger) self.logger.error(format("[iostat]:agent received error:%s", data.toString()));
    self.emitObject("error", data);
  })

  this.agent.on("exit", function(code) {
    self.emitObject("end", code);
  });
}

OSXIOStatAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emitObject("end", 0);
}

/*******************************************************************************
 *  Linux IO Stat agent
 *******************************************************************************/
var LinuxIOStatAgent = function LinuxIOStatAgent(config, logger) {
  // Inherit the event emitter
  EventEmitter.call(this);
  // Save config settings
  this.logger = logger;
  this.config = config;
  // Current chunk of data
  this.data = '';
  // Used to just inform the listener of the agent to basic stable info
  this.agentInformation = {agent: 'iostat', platform: process.platform, arch:process.arch};
}

util.inherits(LinuxIOStatAgent, EventEmitter);

LinuxIOStatAgent.prototype._parseTopEntry = function _parseTopEntry(self, data) {
  // Add the data
  this.data += data;
  // The disks available
  var objects = [];

  // Check if we have a complete Device
  if(this.data.match(/Device:/g) != null && this.data.match(/Device:/g).length > 1) {
    // Split by Device:
    var firstIndex = this.data.indexOf("Device:");
    var secondIndex = this.data.indexOf("Device:", firstIndex + 1);
    // Get the text
    var text = this.data.substring(firstIndex, secondIndex);
    // Set remaining
    this.data = this.data.substr(secondIndex);
    // Split the lines
    var lines = text.split(/\n/);
    var object = {disks: {}};
    var disks = object.disks;

    for(var j = 0; j < lines.length; j++) {
      if(lines[j].indexOf("Device:") == -1 && lines[j].trim() != '') {
        var entries = lines[j].trim().split(/ +/);
        disks[entries[0].trim()] = {
            // rrqm/s
            //        The number of read requests merged per second that were queued to the device.
          read_req_sec: parseFloat(entries[1], 10),
            // wrqm/s
            //        The number of write requests merged per second that were queued to the device.
          write_req_sec: parseFloat(entries[2], 10),
            // r/s
            //        The number of read requests that were issued to the device per second.
          issued_read_req_sec: parseFloat(entries[3], 10),

            // w/s
            //        The number of write requests that were issued to the device per second.
          issued_write_req_sec: parseFloat(entries[4], 10),

            // rkB/s
            //        The number of kilobytes read from the device per second.
          kb_read_sec: parseFloat(entries[5], 10),

            // wkB/s
            //        The number of kilobytes written to the device per second.
          kb_write_sec: parseFloat(entries[6], 10),

            // avgrq-sz
            //        The average size (in sectors) of the requests that were issued to the device.
          avg_sec_size: parseFloat(entries[7], 10),

            // avgqu-sz
            //        The average queue length of the requests that were issued to the device.
          avg_queue_length: parseFloat(entries[8], 10),

            // await
            //        The average time (in milliseconds) for I/O requests issued to the device to be served. This
            //        includes the time spent by the requests in queue and the time spent servicing them.

          avg_io_wait_time: parseFloat(entries[9], 10),

            // svctm
            //        The average service time (in milliseconds) for I/O requests that were issued to the device.

          avg_service_time: parseFloat(entries[10], 10),

            // %util
            //        Percentage  of CPU time during which I/O requests were issued to the device (bandwidth uti‐
            //        lization for the device). Device saturation occurs when this value is close to 100%.
          cpu_saturation: parseFloat(entries[11], 10),
        }
      }
    }
    // Add the object
    objects.push(object);
  }
  return objects;
}

LinuxIOStatAgent.prototype.start = function start() {
  var self = this;
  if(this.agent) this.stop();
  // Set up the command
  this.agent = spawn('iostat', ['-x', '-d', '1']);
  // Add listeners
  this.agent.stdout.on("data", function(data) {
    var objects = self._parseTopEntry(self, data);
    for(var i = 0; i < objects.length; i++) {
      self.emitObject("data", objects[i]);
    }
  });

  this.agent.stderr.on("data", function(data) {
    if(self.logger) self.logger.error(format("[iostat]:agent received error:%s", data.toString()));
    self.emitObject("error", data);
  })

  this.agent.on("exit", function(code) {
    self.emitObject("end", code);
  });
}

LinuxIOStatAgent.prototype.stop = function stop() {
  if(this.agent) {
    this.agent.kill('SIGKILL');
  }

  // Emit end signal
  this.emitObject("end", 0);
}

exports.build = _buildAgent;