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
    var randomIndex = Math.round((self.dataFiles.length + 1) * Math.random()) % self.dataFiles.length;
    self.emit("data", self.dataFiles[randomIndex]);
  }, 1000);
  // Return
  callback(null, null)
}

exports.DummyDataProvider = DummyDataProvider;