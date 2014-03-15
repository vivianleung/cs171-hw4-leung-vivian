/**
 * Created by hen on 3/8/14.
 */
var margin, width, height, bbVis, detailVis, canvas, svg, projection, path, rScale, createVis, country;

margin = { top: 50, right: 50, bottom: 50, left: 50 };

width = 1060 - margin.left - margin.right;
height = 800 - margin.bottom - margin.top;
bbVis = { x: 100, y: 10, w: width - 100, h: 300 };

detailVis = d3.select("#detailVis").append("svg").attr({ width:350, height:200 });

canvas = d3.select("#vis").append("svg").attr({ 
  width:width+margin.left+margin.right, height:height+margin.top+margin.bottom })
svg = canvas.append("g").attr("transform","translate("+margin.left+","+margin.top+")");

rScale = d3.scale.linear().range([2,6]);

// from https://gist.github.com/mbostock/5629120 to accomodate for 
// USAF 785140, located in AQUADILLA/BORINQUEN, PUERTO RICO

projection = d3.geo.albersUsa().translate([width / 2, height / 2]);//.precision(.1);
path = d3.geo.path().projection(projection);

var dataSet = {};

// draws states
d3.json("../data/us-named.json", function(error, data) {

  var usMap = topojson.feature(data,data.objects.states).features;
  country = svg.append("g").attr("class","country").selectAll('.state').data(usMap)
    .enter().append("path")
    .attr("d", function(d) {return path(d.geometry)})
    .attr("class", "state")
    .attr("fill-opacity", 0);

  // see also: http://bl.ocks.org/mbostock/4122298
  
  createVis();
});

createVis = function(){
  var stations;
  loadStats();

  function loadStations() {
    d3.csv("../data/NSRDB_StationsMeta.csv",function(error,data){

      var staData = data.map(function(d) {

        staXY = projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]);
        // if cannot be projected on albersUSA (i.e. US territory)
        if (staXY == null){ staXY = [0,0]; }
        // if has/has not data
        if (dataSet[d.USAF]) {
          $.extend(dataSet[d.USAF], {station:d.STATION}, {state:d.ST}, {sx:staXY[0]}, {sy:staXY[1]});}
        else {dataSet[d.USAF] = {station:d.STATION, state:d.ST, sx:staXY[0], sy:staXY[1]};}
      });
      dataSet = d3.entries(dataSet);
      stations = svg.append("g").attr("id","stations")
        .selectAll(".station").data(dataSet).enter().append("circle")
        .attr("cx", function(d) {return d.value.sx})
        .attr("cy", function(d) {return d.value.sy})
        .attr("class", function(d) {
          if (d.value.sum>0) {return "station hasData"}
          else {return "station"}
        })
        .attr("opacity", 0)
        .attr("r", function(d) {
          if (d.value.sum>0) {return rScale(d.value.sum);}
          else {return 1.5;}
        });

      drawMap();
    });
  }

  function loadStats() {

      d3.json("../data/reducedMonthStationHour2003_2004.json", function(error,data){
      dataSet = data;
      
      var rDom = [Number.MAX_VALUE,0];
      for (var sID in data){
        if (data[sID].sum > 0) {
          if (data[sID].sum < rDom[0]) {rDom[0] = data[sID].sum;}
          else if (data[sID].sum > rDom[1]) {rDom[1] = data[sID].sum;}
        }
      }
      rScale.domain(rDom);
      loadStations();
    })
  }

  function drawMap() {
    country.transition().duration(1000).attr("fill-opacity", 0.3);
    stations.transition().duration(1000).delay(function(d,i){return i*1.5}).attr("opacity", 1);
  }
}

// ALL THESE FUNCTIONS are just a RECOMMENDATION !!!!
var createDetailVis = function(){

}


var updateDetailVis = function(data, name){
  
}




// ZOOMING
function zoomToBB() {


}

function resetZoom() {
  
}


