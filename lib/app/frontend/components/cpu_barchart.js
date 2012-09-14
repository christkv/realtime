(function() {
  CPUBarChart = function CPUBarChart(target, options) {
    // Set up hard coded values
    this.target = target;
    this.options = options || {};
    this.options.maxXValue = 100;
    // Add cpu_times sub components aswell (div )
    this.addSubComponents = this.options.addSubComponents || false;
    this.subComponentTargetContainer = this.options.subComponentTargetContainer || "cpu_timers";
    // Sub components
    this.subComponents = [];
    // Call parent class
    BarChart.call(this, this.target, this.options);
  }

  inherits(CPUBarChart, BarChart);

  CPUBarChart.prototype.listensTo = function() {
    return this.addSubComponents ?
      { "cpu_percents": 1, "cpu_times": 1 } : { "cpu_percents": 1 };
  }

  CPUBarChart.prototype.remove = function() {
    // Clean up the list of sub-components
    this.subComponents = [];
    // Remove all the objects and recreate the graphs
    $("#" + this.target).empty();
    // Remove all the objects and recreate the graphs
    $("#" + this.subComponentTargetContainer).empty();
  }

  CPUBarChart.prototype.data = function(data) {
    var self = this;
    var newData = [];
    // Populate the data of the cpu
    if(data.info.agent == "cpu_percents") {
      for(var i = 0; i < data.data.length; i++) {
        newData.push({name: ("cpu" + i), value: Math.round(data.data[i])});
      }

      // If we have an empty existing data set initalize the graph
      if(self._data.length == 0) {
        // Initialize the main component
        self.initialize(newData);
        // If we are adding subcomponents let's figure out how many and add a graph
        // for each
        if(self.addSubComponents) {
          for(var i = 0; i < data.data.length; i++) {
            // Add a div to the target container
            self.subComponents.push(new CPUTimesBarChart(this.subComponentTargetContainer, {
              cpuIndex: i,
              width: self.width,
              height: self.height,
              labelSize: 40,
              autoScale: false,
              maxXValue: 100,
              barHeight: 30,
              marginLeft: self.marginLeft,
              colorFunction: function() { return "steelblue"; },
              data: [{name:"idle", value:0},
                {name:"nice", value:0},
                {name:"system", value:0},
                {name:"user", value:0}]
            }));
          }
        }
      }
      // Set the new data
      this.setData(newData);
    } else if(data.info.agent == "cpu_times" && self.addSubComponents) {
      for(var i = 0; i < self.subComponents.length; i++) {
        self.subComponents[i].data(data);
      }
    }
  }
})();