(function() {
  BarChart = function BarChart(target, options) {
    var self = this;
    // Unpack all the options
    this.target = target;
    this.options = options || {};
    this.width = this.options.width || 440;
    this.height = this.options.height || 140;
    this.maxXValue = this.options.maxXValue || 100;
    this.numberOfBars = this.options.numberOfBars || 4;
    this.labelSize = this.options.labelSize || 50;
    this.marginLeft = this.options.marginLeft || 32;
    // Calculated values
    this.barHeight = Math.round((this.height - 20) / this.numberOfBars);
    // Set up the basic data
    this._data = this.options.data || [];
    // Set up color fills
    this.colorFunction = this.options.colorFunction || function(d) {
      if(d.value < 50) return "green";
      if(d.value < 75) return "orange";
      return "red";
    }
  }

  BarChart.prototype.initialize = function(data) {
    var self = this;
    // Set initial data
    this._data = data;
    // Create the graph object
    this.chart = d3.select(document.getElementById(this.target)).append("svg")
        .attr("class", "chart")
        .attr("width", this.width)
        .attr("height", this.height)
        .style("margin-left", this.marginLeft + "px") // Tweak alignment…
      .append("g")
        .attr("transform", "translate(" + (this.labelSize) + ",15)");

    // Scale the graph to fit inside a defined pixel size
    this.x = d3.scale.linear()
      .domain([0, this.maxXValue])
      .range([0, this.width - 20 - this.labelSize]);

    this.y = d3.scale.ordinal()
      .domain(this._data.map(function(x, i) { return i; }))
      .rangeBands([0, this.height - 20]);

    // Add lines for each step of the graph
    this.chart.selectAll("line")
        .data(this.x.ticks(10))
      .enter().append("line")
        .attr("x1", this.x)
        .attr("x2", this.x)
        .attr("y1", 0)
        .attr("y2", this.height - 20)
        .style("stroke", "#ccc");

    // Add labels for the values at the top for each step
    this.chart.selectAll(".rule")
        .data(this.x.ticks(10))
      .enter().append("text")
        .attr("x", this.x)
        .attr("y", 0)
        .attr("dy", -3)
        .attr("text-anchor", "middle")
        .text(String);

    // Add a bar for each value in the data array
    this.chart.selectAll("rect")
        .data(this._data)
      .enter().append("rect")
        .attr("y", function(d, i) { return self.y(d.name); })
        .attr("width", function(d) { return self.x(d.value); })
        .attr("height", this.y.rangeBand())
        .style("fill", this.colorFunction);

    // value inside the bar itself
    this.chart.selectAll(".bar")
        .data(this._data)
      .enter().append("text")
        .attr("x", -6)
        .attr("y", function(d, i) { return self.y(i) + self.barHeight / 2;})
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(function(d) { return d.name; });

    // the hard line to the far left
    this.chart.append("line")
        .attr("y1", 0)
        .attr("y2", this.height - 20)
        .style("stroke", "#000");
  }

  BarChart.prototype.setData = function(data) {
    var self = this;
    // Save the data
    this._data = data;
    // Update…
    this.chart.selectAll("rect")
        .data(this._data)
      .transition()
        .duration(1000)
        .attr("width", function(d) { return self.x(d.value); })
        .style("fill", this.colorFunction);
  }
})();