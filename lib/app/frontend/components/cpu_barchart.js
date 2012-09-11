(function() {
  CPUBarChart = function CPUBarChart(target, options) {
    BarChart.call(this, target, options);
  }

  inherits(CPUBarChart, BarChart);

  CPUBarChart.prototype.listensTo = function() {
    return {
      "cpu_times": 1,
      "cpu_percents": 1
    };
  }

  CPUBarChart.prototype.data = function(data) {
    var self = this;
    var newData = [];

    for(var i = 0; i < this._data.length; i++) {
      newData.push({name: this._data[i].name, value: Math.round(100 * Math.random())});
    }

    this.setData(newData);
  }
})();