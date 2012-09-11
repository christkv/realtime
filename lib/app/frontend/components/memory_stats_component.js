(function() {
  MemoryStatsComponent = function MemoryStatsComponent(target, options) {
    // Set up hard coded values
    options = options || {};
    // Scale function
    this.scaleFunction = options.scaleFunction || function(x) {return x};
    options.scaleFunction = this.scaleFunction;
    // Color function
    this.colorFunction = function() { return "steelblue"; }
    options.colorFunction = this.colorFunction;
    // Set bar height for virtual memory
    options.barHeight = 40;
    // Add the barcharts for the memory
    this.memoryChart = new MemoryBarChart(target, options);
    // Set bar height for virtual memory
    options.barHeight = 50;
    // Set memory chart
    this.swapMemoryChart = new MemoryBarChart(target, options);
  }

  MemoryStatsComponent.prototype.listensTo = function() {
    return {"memory_status": 1};
  }

  MemoryStatsComponent.prototype.data = function(data) {
    var self = this;
    var newData = [];
    // Populate the data of the cpu
    if(data.info.agent == "memory_status") {
      var swap = data.data.swap;
      var virtual = data.data.virtual;
      // Set the data
      this.memoryChart.data(virtual);
      this.swapMemoryChart.data(swap);
    }
  }

  var MemoryBarChart = function MemoryBarChart(target, options) {
    // Set up hard coded values
    options = options || {};
    options.autoScale = true;
    // Set the scaling function
    this.scaleFunction = options.scaleFunction;
    // Call parent class
    BarChart.call(this, target, options);
  }

  inherits(MemoryBarChart, BarChart);

  MemoryBarChart.prototype.listensTo = function() {
    return {"memory_status": 1};
  }

  MemoryBarChart.prototype.data = function(data) {
    var self = this;
    var mappedData = [];
    for(var key in data) {
      // Ignore percentage tag
      if(key != 'percent')
        mappedData.push({name:key, value:this.scaleFunction(data[key])});
        // mappedData.push({name:key, value: (Math.round(Math.random(1000) * (1000 * Math.random(1000))))});
    }

    if(this._data.length == 0) {
      this.initialize(mappedData);
    } else {
      self.setData(mappedData);
    }
  }

})();