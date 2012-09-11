(function() {
  NetworkIOStats = function NetworkIOStats(target, options) {
    // Set up hard coded values
    options = options || {};
    options.maxXValue = 100;
    // Components by disk
    this._componentsByKey = {};
    // Sub container setup
    this.target = target;
  }

  NetworkIOStats.prototype.listensTo = function() {
    return { "network_counters": 1 };
  }

  NetworkIOStats.prototype.data = function(data) {
    var self = this;
    // All the keys
    var nonUsedKeys = {};
    // Add the keys
    for(var _key in this._componentsByKey) nonUsedKeys[_key] = true;
    // Iterate over all the agent
    if(data.info.agent == "network_counters") {
      for(var key in data.data) {
        // Remove the key and object
        delete nonUsedKeys[key];
        // We don't have this component let's add one
        if(this._componentsByKey[key] == null
          && (data.data[key].bytes_recv > 0
          || data.data[key].bytes_sent > 0)) {
          // Add the div for the statistical information
          $("#" + this.target).append("<div id='" + self.target + "_" + key + "'></div>");
          // Add the component
          this._componentsByKey[key] = new NetworkStatDonut(self.target + "_" + key);
        }

        // Data element
        var element = {data: {}};
        element.data[key] = data.data[key];
        // Emit the data
        if(this._componentsByKey[key]) this._componentsByKey[key].data(element);
      }
    }

    // Remove any components
    for(var key in nonUsedKeys) {
      // Remove the component from being rendered
      this._componentsByDisk[key].remove();
      // Remove _componentsByKey from the list
      delete this._componentsByKey[key];
    }
  }
})();