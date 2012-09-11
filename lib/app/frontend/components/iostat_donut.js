(function() {
  IOStatDonut = function IOStatDonut(target, options) {
    DonutBase.call(this);

    // Ensure some options
    options = options || {};

    // Self reference
    var self = this;
    this.target = target;
    this.divTarget = options.divTarget || this.target + "_text";
    this.statsClass = options.statsClass || "statsClass";

    /*******************************************************************
     * Graph settings
     ******************************************************************/
    this.width = 100;
    this.height = 100;
    this.outerRadius = Math.min(this.width, this.height) / 2;
    this.innerRadius = this.outerRadius * .6;
    this.n = 2;
    this.q = 0;
    this.data0 = d3.range(this.n).map(Math.random);
    this.data1 = d3.range(this.n).map(Math.random);
    this.color = d3.scale.category20();
    this.arc = d3.svg.arc();
    this.donut = d3.layout.pie().sort(null);
    // Store objects
    this.object0 = null;
    this.object1 = null;
    // Current data set
    this.currentDataSet = 0;

    /*******************************************************************
     * Transation methods
     ******************************************************************/
    var transitionResize = function(d, i) {
      d3.select(this)
        .transition().duration(500)
          .attrTween("d", tweenArc({
            startAngle: d.next.startAngle,
            endAngle: d.next.endAngle
          }))
          .each("end", transitionUnite);
    }

    var transitionUnite = function(d, i) {
      d3.select(this)
        .transition().duration(500)
          .attrTween("d", tweenArc({
            innerRadius: self.innerRadius,
            outerRadius: self.outerRadius
          }));
    }

    var tweenArc = function(b) {
      return function(a) {
        var i = d3.interpolate(a, b);
        for (var key in b) a[key] = b[key]; // update data
        return function(t) {
          return self.arc(i(t));
        };
      };
    }

    var arcs = function(data0, data1) {
      var arcs0 = self.donut(data0),
          arcs1 = self.donut(data1),
          i = -1,
          arc;
      while (++i < self.n) {
        arc = arcs0[i];
        arc.innerRadius = self.innerRadius;
        arc.outerRadius = self.outerRadius;
        arc.next = arcs1[i];
      }
      return arcs0;
    }

    var swap = function() {
      d3.selectAll("g.arc > path")
          .data(++self.q & 1 ? arcs(self.data0, self.data1) : arcs(self.data1, self.data0))
          .each(transitionResize);
    }

    // Add internal reference
    this.swap = swap;
    /*******************************************************************
     * Create SVG Visualization and set all parameters
     ******************************************************************/
    this.vis = d3.select(document.getElementById(target))
      .append("svg")
        .attr("width", this.width)
        .attr("height", this.height);

    this.vis.selectAll("g.arc")
        .data(arcs(this.data0, this.data1))
      .enter().append("g")
        .attr("class", "arc")
        .attr("transform", "translate(" + this.outerRadius + "," + this.outerRadius + ")")
      .append("path")
        .attr("fill", function(d, i) { return self.color(i); })
        .attr("d", this.arc);
    // Add the div for the statistical information
    $("#" + this.target).append("<div id='" + this.divTarget + "'></div>");
  }

  inherits(IOStatDonut, DonutBase);

  IOStatDonut.prototype.listensTo = function() {
    return {"io_counters":1};
  }

  IOStatDonut.prototype.remove = function() {
    $("#" + this.target).remove();
  }

  IOStatDonut.prototype.data = function(object) {
    var self = this;
    var _data;

    for(var key in object.data) {
      // Get data
      var disk = object.data[key];
      // Swap the animation data
      self.swap();
      // Adjust for the next swap
      if(self.currentDataSet == 0) {

        // self.data0 = [disk.read_bytes, disk.write_bytes];
        if(self.object1 != null) {
          self.data0 = [
              (disk.read_bytes - self.object1.read_bytes)
            , (disk.write_bytes - self.object1.write_bytes)
          ]
        }

        // Save object
        self.object0 = disk;
        // Var data object
        _data = self["data" + self.currentDataSet];
        // Switch dataset
        self.currentDataSet = self.currentDataSet + 1;
      } else {
        // self.data1 = [disk.read_bytes, disk.write_bytes];
        if(self.object0 != null) {
          self.data1 = [
              (disk.read_bytes - self.object0.read_bytes)
            , (disk.write_bytes - self.object0.write_bytes)
          ]
        }

        // Var data object
        _data = self["data" + self.currentDataSet];
        // Save object
        self.object1 = disk;
        // Switch dataset
        self.currentDataSet = 0;
      }

      // Just set the data
      $('#' + this.divTarget).html(
        "<p/><table class='" + self.statsClass + "'>"
          + "<tr>"
            + "<td>"
              + "<label>disk name</label>"
              + key
            + "</td>"
          + "</tr>"
          + "<tr>"
            + "<td>"
              + "<label>read_bytes</label>"
              + Math.round(_data[0])
            + "</td>"
          + "</tr>"
          + "<tr>"
            + "<td>"
              + "<label>write_bytes</label>"
              + Math.round(_data[1])
            + "</td>"
          + "</tr>"
        + "</table><p/>"
      );

      break;
    }
  }
})();