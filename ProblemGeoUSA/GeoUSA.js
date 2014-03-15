//NEW
/**
 * Created by hen on 3/8/14.
 */
var margin, width, height, bbVis, detailVis, canvas, svg, terPpad, re, pt;
var projection, path, rScale, createVis, tooltip, tipHead, tipBody, center;

margin = { top: 50, right: 50, bottom: 50, left: 50 };

width = 1060 - margin.left - margin.right;
height = 800 - margin.bottom - margin.top;
bbVis = { x: 100, y: 10, w: width - 100, h: 300 };
tip = {w:100, h:50, dx:margin.left+bbVis.x+15, dy:margin.top+bbVis.y+20};
terPpad = 15;
luxFormat = d3.format('2.4s');
re = new RegExp('[[(]]*');

detailVis = d3.select("#detailVis").append("svg").attr({ width:350, height:200 });

canvas = d3.select("#vis").append("svg").attr({ 
  width:width+margin.left+margin.right, height:height+margin.top+margin.bottom })
svg = canvas.append("g").attr("transform","translate("+margin.left+","+margin.top+")");

svg.append("rect").attr({class:"overlay",x:bbVis.x,y:bbVis.y,width:bbVis.w,height:bbVis.h})
   .on("click",zoomed);

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
            var values = {usaf: d.USAF, station:d.STATION, state:d.ST, sx:staXY[0], sy:staXY[1], conST:conST};
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
          dataSet = hasData.concat(noData);

          loadPage();
      }});
  }});
}

  

function loadPage() {

  stations = stations.selectAll(".station").data(dataSet).enter().append("path")
        .attr("d", function(d) { var r;
          if(d.sum > 0){r = rScale(d.sum);} else {r=0.1;}
          return path(pt.origin([d.sx, d.sy]).angle(r)() ) })
        .attr("class", function(d) {if(d.sum > 0){return "station hasData";} else {return"station";}})
        .attr("opacity", 0)
  country.transition().duration(1000).attr("fill-opacity", 1);
  stations.transition().duration(1000).delay(function(d,i){return i*1.5}).attr("opacity", 0.7);

  tooltip = d3.select('#vis').append("div")
    .attr({class:'tip', visibility:'hidden'})
    .style({width:tip.w+'px', height:tip.h+'px'});

  tipHead = tooltip.append("p").attr({class: 'tip', id: "stn"});
  tipBody = tooltip.append("p").attr({class: 'tip', id: "body"});
  
  stations.on("mouseover", function() {d3.selectAll('.tip').attr("visibility", 'visible')})
        .on("mouseout", function() {d3.selectAll('.tip').attr("visibility", 'hidden');})
        .on('mousemove', showTip)
        .on("click", zoomed);
}

function showTip() {
  var pt = d3.select(this);
  var ptData = pt.data()[0];
  var ptSum = 'N/A';
  if (ptData.sum) { ptSum = luxFormat(ptData.sum); }
  tipHead.innerHTML = (ptData.station.split(re)[0]).toUpperCase();
  tipBody.innerHTML = "(USAF: "+ptData.usaf+")<br/>"+ptSum+" lux";
  var tXY = pt[0][0].getBBox();
  tooltip.style({left:(tip.dx+tXY.x)+'px', top:(tip.dy+tXY.y)+'px'});
}

// ALL THESE FUNCTIONS are just a RECOMMENDATION !!!!
var createDetailVis = function(){

}


var updateDetailVis = function(data, name){
  
}




// ZOOMING
function zoomed() {
  var click = d3.select(this);
  var cX, cY, cK;

  /** 

    transition, translate and scale, and css selected accordingly

  */
  
  // ZOOM IN
  if( (center&&center!=click)||(!center) ) {
    cK = 4; 
    if (click.classed('state')) { var CT=path.centroid(click); cX=CT[0]; cY=CT[1];}
    else if (click.classed('station')) {cX=click.attr("cx"); cY=click.attr("cy"); }
    else { var mXY=d3.mouse(this); cX=mXY[0]-bbVis.x; cY=mXY[0]-bbVis.y; }

    click.classed("active", true); center = click;
  }
  else {
    cX=width/2; cY=height/2; cK=1; center.classed("active",false); center=null;
  }

  svg.transition().duration(750)
    .attr("transform","translate("+(width/2)+","+(height/2)+")scale("+cK+")translate("+(-cX)+","+(-cY)+")")
    .attr("fill", function(){if (click.classed('state')||click.classed('station')){return "orange"} })
    .style("stroke-width", 1.5 / cK + "px");

}


