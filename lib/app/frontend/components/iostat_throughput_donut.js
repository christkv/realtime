(function() {
  IOStatThroughputDonut = function IOStatThroughputDonut(target) {
    DonutBase.call(this);

    // Self reference
    var self = this;

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

    // window.addEventListener("keypress", swap, false);
  }

  inherits(IOStatThroughputDonut, DonutBase);

  IOStatThroughputDonut.prototype.listensTo = function() {
    return {"iostat":1};
  }

  IOStatThroughputDonut.prototype.data = function(data) {
    var self = this;
    // console.log(data)
    if(data.info.platform == 'linux') {
      // console.log(data)
      // Get disk objects
      var disks = data.data.disks;
      // Just get the first one
      for(var key in disks) {
        var disk = disks[key];
        // setTimeout(swap, 100);
        this.swap();

        // Adjust for the next swap
        if(this.currentDataSet == 0) {
          self.data0 = [disk.kb_read_sec, disk.kb_write_sec];
          self.currentDataSet = self.currentDataSet + 1;
        } else {
          self.data1 = [disk.kb_read_sec, disk.kb_write_sec];
          self.currentDataSet = 0;
        }
      }
    }
  }
})();