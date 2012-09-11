(function() {
  DiskIOStats = function DiskIOStats(target, options) {
    // Set up hard coded values
    options = options || {};
    options.maxXValue = 100;
    // Components by disk
    this._componentsByDisk = {};
    // Sub container setup
    this.target = target;
  }

  DiskIOStats.prototype.listensTo = function() {
    return { "io_counters": 1 };
  }

  DiskIOStats.prototype.data = function(data) {
    var self = this;
    // All the keys
    var nonUsedKeys = {};
    // Add the keys
    for(var _key in this._componentsByDisk) nonUsedKeys[_key] = true;
    // Iterate over all the agent
    if(data.info.agent == "io_counters") {
      for(var disk in data.data) {
        // Remove the key and object
        delete nonUsedKeys[disk];
        // We don't have this component let's add one
        if(this._componentsByDisk[disk] == null) {
          // Add the div for the statistical information
          $("#" + this.target).append("<div id='" + self.target + "_" + disk + "'></div>");
          // Add the component
          this._componentsByDisk[disk] = new IOStatDonut(self.target + "_" + disk);
        }

        // Data element
        var element = {data: {}};
        element.data[disk] = data.data[disk];
        // Emit the data
        this._componentsByDisk[disk].data(element);
      }
    }

    // Remove any components
    for(var disk in nonUsedKeys) {
      // Remove the component from being rendered
      this._componentsByDisk[disk].remove();
      // Remove it from the list
      delete this._componentsByDisk[disk];
    }
  }
})();