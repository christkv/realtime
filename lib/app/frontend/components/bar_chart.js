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
    this.ticks = this.options.ticks || 5;
    this.interval = this.options.interval || 1000;
    // Calculated values
    this.barHeight = this.options.barHeight || 0;
    // Set up the basic data
    this._data = this.options.data || [];
    // Auto scale
    this.autoScale = this.options.autoScale || false;
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
        .attr("transform", "translate(" + (this.labelSize) + ",20)");

    // Scale the graph to fit inside a defined pixel size
    if(this.autoScale) {
      this.x = d3.scale.linear()
        .domain([0, d3.max(this._data, function(d) { return d.value; })])
        .range([0, this.width - 20 - this.labelSize]);
    } else {
      this.x = d3.scale.linear()
        .domain([0, 100])
        .range([0, this.width - 20 - this.labelSize]);
    }

    // Set up the y axis scaling
    this.y = d3.scale.ordinal()
      .domain(this._data.map(function(x, i) { return i; }))
      .rangeBands([0, this.height - 20]);

    // Set up the axis
    if(this.autoScale) {
      this.xAxis = d3.svg.axis()
          .scale(this.x)
          .orient("top")
          .ticks(this.ticks);
      this.chart.append("g")
        .attr("class", "x axis");
      // Update the x-axis.
      this.chart.selectAll(".x.axis").transition().duration(this.interval).call(this.xAxis);
    } else {
      // Add labels for the values at the top for each step
      this.chart.selectAll(".rule")
          .data(this.x.ticks(this.ticks))
        .enter().append("text")
          .attr("x", this.x)
          .attr("y", 0)
          .attr("dy", -3)
          .attr("text-anchor", "middle")
          .text(String);
    }

    // value inside the bar itself
    this.chart.selectAll(".bar")
        .data(this._data)
      .enter().append("text")
        .attr("x", -6)
        .attr("y", function(d, i) { return self.y(i) + self.barHeight / 3;})
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(function(d) { return d.name; });

    // Add lines for each step of the graph
    this.chart.selectAll("line")
        .data(this.x.ticks(this.ticks))
      .enter().append("line")
        .attr("x1", this.x)
        .attr("x2", this.x)
        .attr("y1", 0)
        .attr("y2", this.height - 20)
        .style("stroke", "#ccc");

    // Add a bar for each value in the data array
    this.chart.selectAll("rect")
        .data(this._data)
      .enter().append("rect")
        .attr("y", function(d, i) { return self.y(d.name); })
        .attr("width", function(d) { return self.x(d.value); })
        .attr("height", this.y.rangeBand())
        .style("fill", this.colorFunction);

    // the hard line to the far left
    this.chart.append("line")
        .attr("y1", 0)
        .attr("y2", this.height - 20)
        .style("stroke", "#000");

    // Set up xgrid
    if(this.autoScale) {
      // Set the domain
      this.x.domain([0, d3.max(this._data, function(d) { return d.value; })]);
      // Update the x-axis.
      this.chart.selectAll(".x.axis").transition().duration(this.interval).call(this.xAxis);
    }
  }

  BarChart.prototype.setData = function(data) {
    var self = this;
    // Save the data
    this._data = data;
    // Scale the graph to fit inside a defined pixel size
    if(this.autoScale) {
      // Set the domain
      this.x.domain([0, d3.max(this._data, function(d) { return d.value; })]);
      // Update the x-axis.
      this.chart.selectAll(".x.axis").transition().duration(this.interval).call(this.xAxis);
    } else {
      this.x = d3.scale.linear()
        .domain([0, this.maxXValue])
        .range([0, this.width - 20 - this.labelSize]);
    }

    // Update…
    this.chart.selectAll("rect")
        .data(this._data)
      .transition()
        .duration(this.interval)
        .attr("width", function(d) { return self.x(d.value); })
        .style("fill", this.colorFunction);
  }
})();