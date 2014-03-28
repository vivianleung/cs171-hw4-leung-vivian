//NEW
/**
 * Created by hen on 3/8/14.
 */
var margin, width, height, bbVis, detailVis, canvas, svg, terPpad, re, pt;
var projection, path, rScale, createVis, tooltip, center, luxFormat, times, yDom;
var xScale, yScale, colorHour, xAxis, yAxis, area, graph;
var cK=1;

margin = { top: 5, right: 25, bottom: 25, left: 25 };
detailDiv = {w:350+margin.right, h:200, p:20}
var Wsize = {w: 1060, h:800}
// var Wsize = { w: document.documentElement.clientWidth, h:document.documentElement.clientHeight};
// $(window).resize(function() {
//   Wsize.w = document.documentElement.clientWidth;
//   Wsize.h = document.documentElement.clientHeight;
//   canvas = d3.select("#vis").append("svg").attr({ 
//     width:Wsize-detailDiv.w, height:Wsize.h-detailDiv.h })
// })
width = Wsize.w - margin.left - margin.right ;
height = Wsize.h - margin.bottom - margin.top - $('h1').height(); 

bbVis = { x: 100, y: 10, w: width - 100, h: 300 };
bbDetail = { w:detailDiv.w-margin.right-4*detailDiv.p, h:detailDiv.h-4*detailDiv.p, x:detailDiv.p+5, y:detailDiv.p+5}
tipP = 8;
terPpad = 15;
terTitle = {w:100, h:20}
luxFormat = d3.format('2.4s');
re = new RegExp('[[(]]*');


detailVis = d3.select("#detailVis").append("svg").attr({width:detailDiv.w-margin.right,height:detailDiv.h,class:'detailVis'})
    .append("g").attr({transform:"translate("+bbDetail.x+","+bbDetail.y+")",id:'template'});

canvas = d3.select("#vis").append("svg").attr({ 
  width:width+margin.left+margin.right, height:height+margin.top+margin.bottom })
svg = canvas.append("g").attr("transform","translate("+margin.left+","+margin.top+")");

rScale = d3.scale.pow().exponent(2).range([0.2,0.4]);

projection = d3.geo.albersUsa().translate([width / 2, height / 2]);//.precision(.1);
path = d3.geo.path().projection(projection);
pt = d3.geo.circle();

var dataSet = {};


// draws states
d3.json("../data/us-named.json", function(error, data) {
  var usMap = topojson.feature(data,data.objects.states).features;
  country = svg.append("g").attr({id:'country',transform:"translate("+bbVis.x+","+bbVis.y+")"})
    .selectAll('.state').data(usMap).enter().append("path")
    .attr({class:'state','opacity':0})
    .attr("d", function(d) {return path(d.geometry)})
    .on("click", zoomed);

  stations = svg.append("g").attr({id:'stations',transform:"translate("+bbVis.x+","+bbVis.y+")",
        });


  // see also: http://bl.ocks.org/mbostock/4122298

  loadStats();

});

function loadStats() {

  d3.json("../data/reducedMonthStationHour2003_2004.json", function(error,hourData){
    if (error) {console.log(error)}
    else{
      d3.csv("../data/NSRDB_StationsMeta.csv",function(error,stnInfo){
        if (error) {console.log(error)}
        else{
          var shiftTerr = 1;
          var hasData = [], noData = [];
          stnInfo.forEach(function(d) {
            var conST = true;
            var staXY = [d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]];
            if (!projection(staXY)) {
              staXY = projection.invert([bbVis.y+terPpad,bbVis.x+terTitle.h+terPpad*shiftTerr++]);
              conST = false;  }
            var values = {usaf: parseInt(d.USAF), station:d.STATION, state:d.ST, sx:staXY[0], sy:staXY[1], conST:conST};
            if (hourData[d.USAF] ) {
              if (hourData[d.USAF].sum > 0) {
                $.extend(values, {sum: hourData[d.USAF].sum}, {hourly: hourData[d.USAF].hourly});
                hasData.push(values);  }
              else {noData.push(values);} }
            else{ noData.push(values); }
          });

          hasData.sort(function(a,b) {
            if (a.sum > b.sum) {return -1;}
            else if (a.sum < b.sum) {return 1;}
            else { return d3.descending(a.usaf, b.usaf)}  });
          noData.sort(function(a,b) { return d3.descending(a.usaf, b.usaf) });
          rScale.domain([hasData.slice(-1)[0].sum, hasData[0].sum]);
          var allData = hasData.concat(noData);
          dataSet = allData.map(function(d) {
            var r;
            if(d.sum > 0){r = rScale(d.sum);} else {r=0.1;}
            var info = pt.origin([d.sx, d.sy]).angle(r)();
            return {geometry: {coordinates:info.coordinates, type:info.type}, 
                    id: d.usaf, properties:d, type:"Feature"}
          });
          
          var createDetailVis = function(){
            times = d3.keys(dataSet[0].properties.hourly);
            yDom = d3.extent(d3.values(dataSet[0].properties.hourly));
            xScale = d3.scale.ordinal().domain(times).rangeRoundBands([0, bbDetail.w],.15,0);
            yScale = d3.scale.linear().domain(yDom).range([bbDetail.h, 0]);
            colorHour = d3.scale.quantile().domain(d3.range(24))
              .range(['#E66545','#FF9933','#FFD633','#FFD633','#FF9933','#E66545']);
            xAxis = d3.svg.axis().scale(xScale).orient("bottom")
              .tickValues(times.filter(function(d,i){return i%2==1}))
              .tickFormat(function(k) {return k.slice(0,2)+" h"});
            yAxis = d3.svg.axis().scale(yScale).orient("right")
              .tickFormat(function(d){return luxFormat(d)}).ticks(bbDetail.h/20);
            detailVis.append("g").attr({class:'x axis',transform:"translate(0,"+bbDetail.h+")"}).call(xAxis)
              .selectAll("text").attr({ 'text-anchor': 'start', transform:"rotate(-45)",dx:-15,dy:10});
            d3.select('g.x.axis').append("text").attr({class:"label",x:bbDetail.w/2, dy:30}).text("Hour"); 
            detailVis.append("g").attr({class:'y axis',transform:"translate("+bbDetail.w+",0)"}).call(yAxis)
              .append("text").attr({class:"label",x:bbDetail.w-5,y:0}).text("Lux");
            d3.selectAll('.detailVis').attr("visibility","hidden");
            d3.select('input[name="detailXY"]').on('click',function() {if(center){updateDetailVis()} });
          }

          loadPage();
          createDetailVis();
      }});
  }});
}

function loadPage() {

  stations = stations.selectAll(".station")
    .data(dataSet).enter().append("path")
    .attr("d", function(d) {return path(d.geometry) })
    .attr("class", function(d) {if(d.properties.sum > 0){return "station hasData";} else {return"station";}})
    .attr("opacity", 0)
    .on("click", zoomed);
  terrTitle = d3.select('svg').append("text").attr({id: 'terrTitle',transform:"translate("+(margin.left+bbVis.y+terPpad*4)+","+(margin.top+bbVis.x+15)+")"})
  .style("visibility","hidden").text('US Territories');
  country.transition().duration(1000).attr("opacity", 1);
  stations.transition().duration(1000).delay(function(d,i){return i*1.5}).attr("opacity", 0.7);
  terrTitle.transition().duration(1000).style({visibility: 'visible'});

  tooltip = d3.select('#vis').append("div").attr({class:'tip'}).style({visibility:'hidden'});
  stations.on("mouseout", function() {d3.select('.tip').transition().duration(20).style("visibility", 'hidden')
                                      d3.select('.tip').html(null);})
        .on("mouseover", function() { d3.select('.tip').style("visibility", 'visible')})
        .on('mousemove', showTip);

        
}

function showTip() {
  var ptData = d3.select(this).data()[0].properties;
  var ptSum = 'N/A';
  if (ptData.sum) { ptSum = luxFormat(ptData.sum); }
  var tXY = d3.mouse(d3.select('#vis')[0][0]);
  d3.select('.tip').html((ptData.station.split(re)[0]).toUpperCase()+"<br/>(USAF: "+ptData.usaf+")<br/>"+ptSum+" lux");
  tooltip.transition().duration(70).style("left",(tXY[0]+tipP*cK)+'px')
  .style("top", function() { return(tXY[1]+bbVis.x-this.offsetHeight-tipP*cK)+'px';} );
}



function updateDetailVis(){
  // check if data sum is zero. if so, then just set up an empty graph
  var station = center.data()[0].properties;
  d3.select('#detailTitle').remove();
  d3.select('.detailVis .graph').remove();

  graph = detailVis.append("g").attr("class","graph");
  d3.select('#detailVis').insert("div",":first-child").attr({id:'detailTitle',top:0,left:0})  
    .html(station.station+', '+station.state);
  d3.selectAll('.detailVis').style("visibility","visible");
  if (station.sum > 0) {
    var dom = d3.entries(station.hourly);     
    if(d3.select('input[name="detailXY"]')[0][0].checked) {
      dom = dom.filter(function(d) { return d.value > 0; })
      xScale.domain(dom.map(function(d) {return d.key}));
      yScale.domain([0,d3.max(dom.map(function(d) {return d.value}))]);
    }
    else {
      xScale.domain(times);
      yScale.domain(yDom);
    }
    var barW = xScale.rangeBand();
    xAxis.scale(xScale).tickValues(xScale.domain().filter(function(d,i){return i%2==0}));
    yAxis.scale(yScale);
    var hours = graph.selectAll('.hour').data(dom)
      .enter().append('rect').attr({class:'hour',width:barW,stroke:'none'});
    detailVis.select('g.x.axis').call(xAxis).selectAll("text:not(.label)").attr({ 'text-anchor': 'start', transform:"rotate(-45)",dx:-15,dy:10});
    detailVis.select('g.y.axis').call(yAxis);
    hours.transition().duration(500)
      .attr('height', function(d){return bbDetail.h-yScale(d.value)})
      .attr('transform', function(d) {
        return "translate("+xScale(d.key)+","+(yScale(d.value))+")" })
      .attr('fill', function(d){return colorHour(parseInt(d.key.slice(0,2))) });

  
  }
  else {
    graph.append("text").transition().duration(500).attr("transform","translate("+(bbDetail.w/2-detailDiv.p)+","+(bbDetail.h/2)+")")
      .text("No Data Available");
  }
  



}



// ZOOMING
function zoomed(click) {
  var cX, cY;
  var terVisible;

  
  // ZOOM IN
  d3.selectAll('.detailVis').style("visibility","hidden");
  d3.selectAll('.station, .state').classed("active",false);
  if( (center&&center.data()[0]!=click)||(!center) ) {
    cK = 3.5; 
    var CT=path.centroid(click); cX=CT[0]+bbVis.x; cY=CT[1]+bbVis.y;

    d3.select(this).classed("active", true); center = d3.select(this);
    if (d3.select(this).classed('station')) { updateDetailVis(); }
    terrTitle.transition().duration(750).style("visibility","hidden");

  }
  else {
    cX=width/2; cY=height/2; cK=1; center=null;
    terrTitle.transition().duration(750).style("visibility","visible");
  }

  svg.transition().duration(750)
    .attr("transform","translate("+(width/2)+","+(height/2)+")scale("+cK+")translate("+(-cX)+","+(-cY)+")")
    .attr("fill", function(){if (d3.select(this).classed('state')||d3.select(this).classed('station')){return "orange"} })
    .style("stroke-width", 1.5 / cK + "px");
}


  