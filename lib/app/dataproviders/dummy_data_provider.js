var fs = require('fs')
  , inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter

var DummyDataProvider = function DummyDataProvider(directoryPath) {
  EventEmitter.call(this);
  // Save the path
  this.directoryPath = directoryPath;

  // Read in the content of all json files for random dispersion
  this.dataFiles = fs.readdirSync(directoryPath)
    .filter(function(file) { return file.match(/.json/) != null; })
    .map(function(file) { return directoryPath + "/" + file; })
    .map(function(file) { console.log("reading in file :: " + file); return JSON.parse(fs.readFileSync(file, 'utf8')); });
}

inherits(DummyDataProvider, EventEmitter);

DummyDataProvider.prototype.start = function start(callback) {
  var self = this;
  // Start interval send data
  setInterval(function() {
    // var randomIndex = Math.round((self.dataFiles.length + 1) * Math.random()) % self.dataFiles.length;
    // var object = self.dataFiles[randomIndex];

    var object = null;
    // Locate the iostat doc
    for(var i = 0; i < self.dataFiles.length; i++) {
      if(self.dataFiles[i].info.agent == 'iostat' && self.dataFiles[i].info.platform == 'linux') {
        object = self.dataFiles[i];
        break;
      }
    }

    // If iostat create random read write values
    if(object.info.agent == 'iostat' && object.info.platform == 'linux') {
      object.data.disks.sda.kb_read_sec = Math.round(Math.random() * 200);
      object.data.disks.sda.kb_write_sec = Math.round(Math.random() * 200);
    }

    self.emit("data", object);
  }, 1000);
  // Return
  callback(null, null)
}

exports.DummyDataProvider = DummyDataProvider;