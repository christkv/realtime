(function() {
  NetworkStatDonut = function NetworkStatDonut(target, options) {
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
    this.data0 = [1, 1];
    this.data1 = [1, 1];
    this.delta0 = [0, 0];
    this.delta1 = [0, 0];
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
      self.vis.selectAll("g.arc > path")
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

  inherits(NetworkStatDonut, DonutBase);

  NetworkStatDonut.prototype.listensTo = function() {
    return {"network_counters":1};
  }

  NetworkStatDonut.prototype.remove = function() {
    $("#" + this.target).remove();
  }

  NetworkStatDonut.prototype.data = function(object) {
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
          var deltas = [
              (disk.bytes_recv - self.object1.bytes_recv)
            , (disk.bytes_sent - self.object1.bytes_sent)
          ]

          if(deltas[0] ==  0 || deltas[1] == 0) return;
          // Get percentage
          self.data0 = [0, 0];
          self.delta0 = deltas;
          self.data0[0] = deltas[0]/(deltas[0] + deltas[1]);
          self.data0[1] = deltas[1]/(deltas[0] + deltas[1]);
        }

        // Save object
        self.object0 = disk;
        // Var data object
        _data = self["delta" + self.currentDataSet];
        // Switch dataset
        self.currentDataSet = self.currentDataSet + 1;
      } else {
        // self.data1 = [disk.read_bytes, disk.write_bytes];
        if(self.object0 != null) {
          var deltas = [
              (disk.bytes_recv - self.object0.bytes_recv)
            , (disk.bytes_sent - self.object0.bytes_sent)
          ]

          if(deltas[0] == 0 || deltas[1] == 0) return;
          // Get percentage
          self.data1 = [0, 0];
          self.delta1 = deltas;
          self.data1[0] = deltas[0]/(deltas[0] + deltas[1]);
          self.data1[1] = deltas[1]/(deltas[0] + deltas[1]);
        }

        // Var data object
        _data = self["delta" + self.currentDataSet];
        // Save object
        self.object1 = disk;
        // Switch dataset
        self.currentDataSet = 0;
      }

      // Just set the data
      $('#' + this.divTarget).html(
        "<p/><table class='" + self.statsClass + "'>"
          + "<tr>"
            + "<td><strong>network adapter</strong></td>"
            + "<td>" + key + "</td>"
          + "</tr>"
          + "<tr>"
            + "<td><strong>bytes_recv</strong></td>"
            + "<td>" + Math.round(_data[0]) + "</td>"
          + "</tr>"
          + "<tr>"
            + "<td><strong>bytes_sent</strong></td>"
            + "<td>" + Math.round(_data[1]) + "</td>"
          + "</tr>"
        + "</table><p/>"
      );

      break;
    }
  }
})();