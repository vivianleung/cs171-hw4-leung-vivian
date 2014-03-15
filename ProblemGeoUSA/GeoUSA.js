//NEW
/**
 * Created by hen on 3/8/14.
 */
var margin, width, height, bbVis, detailVis, canvas, svg, terPpad, re, pt;
var projection, path, rScale, createVis, tooltip, center;

margin = { top: 50, right: 50, bottom: 50, left: 50 };

width = 1060 - margin.left - margin.right;
height = 800 - margin.bottom - margin.top;
bbVis = { x: 100, y: 10, w: width - 100, h: 300 };
tip = {t: margin.top+bbVis.y+20, l: margin.left+bbVis.x+20};
terPpad = 15;
luxFormat = d3.format('2.4s');
re = new RegExp('[[(]]*');

detailVis = d3.select("#detailVis").append("svg").attr({ width:350, height:200 });

canvas = d3.select("#vis").append("svg").attr({ 
  width:width+margin.left+margin.right, height:height+margin.top+margin.bottom })
svg = canvas.append("g").attr("transform","translate("+margin.left+","+margin.top+")");

rScale = d3.scale.linear().range([0.15,0.4]);

// from https://gist.github.com/mbostock/5629120 to accomodate for 
// USAF 785140, located in AQUADILLA/BORINQUEN, PUERTO RICO

projection = d3.geo.albersUsa().translate([width / 2, height / 2]);//.precision(.1);
path = d3.geo.path().projection(projection);
pt = d3.geo.circle();

var dataSet = {};

// draws states
d3.json("../data/us-named.json", function(error, data) {
  var usMap = topojson.feature(data,data.objects.states).features;
  country = svg.append("g").attr({id:'country',transform:"translate("+bbVis.x+","+bbVis.y+")"})
    .selectAll('.state').data(usMap).enter().append("path")
    .attr({class:'state','fill-opacity':0})
    .attr("d", function(d) {return path(d.geometry)})
    .on("click", zoomed);

  stations = svg.append("g").attr({id:'stations',transform:"translate("+bbVis.x+","+bbVis.y+")",
        y:bbVis.y+bbVis.w});

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
          var shiftTerr = 0;
          var territories = ["PR", "GU", "HI", "VI"], hasData = [], noData = [];
          stnInfo.forEach(function(d) {
            var conST = false;
            var staXY;
            if (territories.indexOf(d.ST)==-1) {
              staXY = [d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]];
              conST = true;  }
            else {
              staXY = projection.invert([bbVis.y+terPpad,bbVis.x+terPpad*shiftTerr++]);
            }
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
          rScale.domain([hasData[0].sum, hasData.slice(-1)[0].sum]);
          var allData = hasData.concat(noData);
          dataSet = allData.map(function(d) {
            var r;
            if(d.sum > 0){r = rScale(d.sum);} else {r=0.1;}
            var info = pt.origin([d.sx, d.sy]).angle(r)();
            return {geometry: {coordinates:info.coordinates, type:info.type}, 
                    id: d.usaf, properties:d, type:"Feature"}
          });
          loadPage();
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
  country.transition().duration(1000).attr("fill-opacity", 1);
  stations.transition().duration(1000).delay(function(d,i){return i*1.5}).attr("opacity", 0.7);

  tooltip = d3.select('#vis').append("div").attr({class:'tip', visibility:'hidden'});
  
  stations.on("mouseover", function() {d3.selectAll('.tip').attr("visibility", 'visible')})
        .on("mouseout", function() {d3.selectAll('.tip').attr("visibility", 'hidden');})
        .on('mousemove', showTip);
}

function showTip() {
  console.log(d3.select(this))
  var ptData = d3.select(this).data()[0].properties;
  var ptSum = 'N/A';
  if (ptData.sum) { ptSum = luxFormat(ptData.sum); }
  var tXY = projection([ptData.sx, ptData.sy]);
  d3.select('.tip').html((ptData.station.split(re)[0]).toUpperCase()+"<br/>(USAF: "+ptData.usaf+")<br/>"+ptSum+" lux");
  tooltip.transition().duration(70).style({left:(tXY[0]+tip.l)+'px', top:(tXY[1]+tip.t)+'px' });
}

// ALL THESE FUNCTIONS are just a RECOMMENDATION !!!!
var createDetailVis = function(){

}


var updateDetailVis = function(data, name){
  
}



var clicker;
// ZOOMING
function zoomed(click) {
  console.log(center, click);
  clicker = click;
  var cX, cY, cK;
  // ZOOM IN
  if( (center&&center.data()[0]!=click)||(!center) ) {
    cK = 4; 
    var CT=path.centroid(click); cX=CT[0]+bbVis.x; cY=CT[1]+bbVis.y;
    d3.select(this).classed("active", true); center = d3.select(this);
  }
  else {
    cX=width/2; cY=height/2; cK=1; d3.select(center[0][0]).classed("active",false); center=null;
  }

  svg.transition().duration(750)
    .attr("transform","translate("+(width/2)+","+(height/2)+")scale("+cK+")translate("+(-cX)+","+(-cY)+")")
    .attr("fill", function(){if (d3.select(this).classed('state')||d3.select(this).classed('station')){return "orange"} })
    .style("stroke-width", 1.5 / cK + "px");

}


  