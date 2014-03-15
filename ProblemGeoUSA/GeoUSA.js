//NEW
/**
 * Created by hen on 3/8/14.
 */
var margin, width, height, bbVis, detailVis, canvas, svg, ttPad, terPpad, re;
var projection, path, rScale, createVis, tooltip, center;

margin = { top: 50, right: 50, bottom: 50, left: 50 };

width = 1060 - margin.left - margin.right;
height = 800 - margin.bottom - margin.top;
bbVis = { x: 100, y: 10, w: width - 100, h: 300 };
ttPad = 4;
ttLineH = 15;
terPpad = 15;
luxFormat = d3.format('2.4s');
re = new RegExp('[[(]]*');
detailVis = d3.select("#detailVis").append("svg").attr({ width:350, height:200 });

canvas = d3.select("#vis").append("svg").attr({ 
  width:width+margin.left+margin.right, height:height+margin.top+margin.bottom })
svg = canvas.append("g").attr("transform","translate("+margin.left+","+margin.top+")");

svg.append("rect").attr({class:"overlay",x:bbVis.x,y:bbVis.y,width:bbVis.w,height:bbVis.h})
   .on("click",zoomed);

rScale = d3.scale.linear().range([1,4]);

// from https://gist.github.com/mbostock/5629120 to accomodate for 
// USAF 785140, located in AQUADILLA/BORINQUEN, PUERTO RICO

projection = d3.geo.albersUsa().translate([width / 2, height / 2]);//.precision(.1);
path = d3.geo.path().projection(projection);

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
              staXY = projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]);
              conST = true;  }
            else {
              staXY = [bbVis.y+terPpad,bbVis.x+terPpad*shiftTerr++];
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

  stations = stations.selectAll(".station").data(dataSet).enter().append("circle")
        .attr("cx",function(d){return d.sx}).attr("cy",function(d){return d.sy})
        .attr("class", function(d) {if(d.sum > 0){return "station hasData";} else {return"station";}})
        .attr("opacity", 0)
        .attr("r", function(d) {if(d.sum > 0){return rScale(d.sum);} else {return 1.5;}});
  country.transition().duration(1000).attr("fill-opacity", 1);
  stations.transition().duration(1000).delay(function(d,i){return i*1.5}).attr("opacity", 1);

      tooltip = canvas.append("g").attr({class:'tip', visibility:'hidden'});
      tooltip.append("rect")
      tooltip.append("g").attr("class", "tipContent").selectAll('text').data(['STN','USAF','SUM'])
        .enter().append("text")
        .text(function(d) {return d});

      stations.on("mouseover", function() {tooltip.selectAll('*').attr("visibility", 'visible')})
            .on("mouseout", function() {tooltip.selectAll('*').attr("visibility", 'hidden');})
            .on('mousemove', showTip)
            .on("click", zoomed);
}

var clicker;
function showTip() {
  var pt = d3.select(this);
  var ptData = pt.data()[0];
  var ptSum = 'N/A';
  if (ptData.sum) { ptSum = luxFormat(ptData.sum); }
  var ttCont = [[(ptData.station.split(re)[0]).toUpperCase(), 'stn'], 
           ["(USAF: "+ptData.usaf+")", 'usaf'], [ptSum+" lux", 'sum']];
  tooltip.select('g.tipContent').selectAll('text').remove();
  tooltip.select('g.tipContent').selectAll('text').data(ttCont)
    .enter().append('text')
    .attr("id", function(d) {return d[1]})
    .attr("x", ttPad)
    .attr("y", function(d, i) {return (i+1)*ttLineH})
    .text(function(d) {return d[0]});
  var ttLen = d3.select('g.tipContent')[0][0].getBBox();
  tooltip.select('rect').attr({width:ttLen.width+ttPad*2, height:ttLen.height+ttPad*2});
  tooltip.attr({transform:
    "translate("+(parseFloat(pt.attr('cx'))+(ttLen.width)+ttPad)
            +","+(parseFloat(pt.attr('cy'))+(ttLen.height)+ttPad)+")"});
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


