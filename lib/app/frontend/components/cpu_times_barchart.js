(function() {
  CPUTimesBarChart = function CPUTimesBarChart(target, options) {
    // Set up hard coded values
    options = options || {};
    options.maxXValue = 100;
    // Local option
    this.cpuIndex = options.cpuIndex || 0;
    // Call parent class
    BarChart.call(this, target, options);
    // Used to calculate the percentages spent in different settings
    this._lastCpuTime = null;
    // Initialize bar graph
    this.initialize(options.data);
  }

  inherits(CPUTimesBarChart, BarChart);

  CPUTimesBarChart.prototype.listensTo = function() {
    return {
      "cpu_times": 1
    };
  }

  CPUTimesBarChart.prototype.data = function(data) {
    var self = this;
    // var newData = [];
    // Populate the data of the cpu
    if(data.info.agent == "cpu_times" && data.data.length > self.cpuIndex) {
      // Grab the cpu Data
      var cpuData = data.data[self.cpuIndex];
      // If we have not data yet let's wait for a tick so we can measure
      if(self._lastCpuTime == null ) {
        self._lastCpuTime = cpuData;
        return;
      }

      // We have the data figure out the difference between the two times
      var idleDiff = cpuData['idle'] - self._lastCpuTime['idle'];
      var niceDiff = cpuData['nice'] - self._lastCpuTime['nice'];
      var systemDiff = cpuData['system'] - self._lastCpuTime['system'];
      var userDiff = cpuData['user'] - self._lastCpuTime['user'];

      // Total time spent in last tick
      var total = idleDiff + niceDiff + systemDiff + userDiff;

      // console.log(total)

      // Calculate the differences and create the data structure
      var newData = [{name: 'idle', value: (idleDiff/total) * 100},
        {name: 'nice', value: (niceDiff/total) * 100},
        {name: 'system', value: (systemDiff/total) * 100},
        {name: 'user', value: (userDiff/total) * 100}
      ]

      // Save this data for next calculation
      self._lastCpuTime = cpuData;
      // Set the new data
      self.setData(newData);
    }
  }
})();