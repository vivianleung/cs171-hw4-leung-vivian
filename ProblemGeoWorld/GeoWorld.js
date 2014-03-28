/**
 * Created by hen on 3/8/14.
 */
var margin, width, height, bbVis, svg, projectionMethods, actualProjectionMethod, colorMin, colorMax, dataSet;

margin = { top: 50, right: 50, bottom: 50, left: 50 };
width = 960 - margin.left - margin.right;
height = 700 - margin.bottom - margin.top;
bbVis = { x: 100, y: 10, w: width - 100, h: 300 };

dataSet = {};

svg = d3.select("#vis").append("svg")
    .attr({width:width+margin.left+margin.right,height:height+margin.top+margin.bottom})
    .append("g").attr({transform:"translate("+margin.left+","+margin.top+")"});

var projectionMethods = [ //.precision(.1);
    { name:"mercator", method: d3.geo.mercator().translate([width / 2, height / 2]) },
    { name:"equiRect", method: d3.geo.equirectangular().translate([width / 2, height / 2]) },
    { name:"stereo",   method: d3.geo.stereographic().translate([width / 2, height / 2]) }];

actualProjectionMethod = projectionMethods.length-1;
colorMin = colorbrewer.Greens[3][0]; colorMax = colorbrewer.Greens[3][2];

function runAQueryOn(indicatorString) {
    $.ajax({
        url: "http://api.worldbank.org/countries/all/indicators/"+indicatorString+"?format=jsonP&prefix=Getdata&per_page=500&date=2000", //do something here
        jsonpCallback:'getdata',
        dataType:'jsonp',
        success: function (data, status){console.log(status); }
    });
}


var initVis = function(error, indicators, world){
    console.log(world);
    console.log(indicators);

    svg.append('g').attr('id','countries').selectAll(".country")
        .data(world.features).enter().append('path')
        .attr('class','country');

    $( "#indicator" ).autocomplete({
      source: availableTags
    });

    changePro();
    // initialize map viz
}


queue()
    .defer(d3.csv,"../data/worldBank_indicators.csv")
    .defer(d3.json,"../data/world_data.json")
    // .defer(d3.json,"../data/WorldBankCountries.json")
    .await(initVis);




// just for fun 
var textLabel = svg.append("text").text(projectionMethods[actualProjectionMethod].name).attr({
    "transform":"translate(-40,-30)"
})

var changePro = function(){
    actualProjectionMethod = (actualProjectionMethod+1) % (projectionMethods.length);

    textLabel.text(projectionMethods[actualProjectionMethod].name);
    path= d3.geo.path().projection(projectionMethods[actualProjectionMethod].method);
    svg.selectAll(".country").transition().duration(750).attr("d",function(d) {return path(d.geometry)});
};

d3.select("body").append("button").text("changePro").on({"click":changePro});

runAQueryOn('SH.TBS.INCD')