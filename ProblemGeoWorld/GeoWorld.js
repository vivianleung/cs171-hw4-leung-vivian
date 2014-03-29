/**
 * Created by hen on 3/8/14.
 */
var margin, width, height, bbVis, svg, projectionMethods, actualProjectionMethod, colorMin, colorMax, dataSet;

margin = { top: 50, right: 50, bottom: 50, left: 50 };
width = 960 - margin.left - margin.right;
height = 700 - margin.bottom - margin.top;
bbVis = { x: 100, y: 10, w: width - 100, h: 300 };

projectionMethods = [ //.precision(.1);
    { name:"mercator", method: d3.geo.mercator().translate([width / 2, height / 2]) },
    { name:"equiRect", method: d3.geo.equirectangular().translate([width / 2, height / 2]) },
    { name:"stereo",   method: d3.geo.stereographic().translate([width / 2, height / 2]) }];
actualProjectionMethod = projectionMethods.length-1;
colorScale = d3.scale.quantize().range(colorbrewer.Greens[5]);
dataSet = {};

svg = d3.select("#vis").append("svg")
    .attr({width:width+margin.left+margin.right,height:height+margin.top+margin.bottom})
    .append("g").attr({transform:"translate("+margin.left+","+margin.top+")"});



function runAQueryOn(indicatorString) {
    $.ajax({
        url: "http://api.worldbank.org/countries/all/indicators/"+indicatorString+"?format=jsonP&prefix=Getdata&per_page=500&date=2000", //do something here
        jsonpCallback:'getdata',
        dataType:'jsonp',
        success: function (data, status){
            var inDom = [Number.MAX_VALUE, 0];
            data[1].forEach(function(d){ 
                if (d.value) { 
                    d.value = parseFloat(d.value + "." + d.decimal); 
                    if (d.value < inDom[0]) {inDom[0] = d.value;}
                    else if (d.value > inDom[1]) {inDom[1] = d.value;}
                }

                d.date = parseInt(d.date);
                delete d.decimal;
                dataSet[d.country.id] = d;  
            });
            colorScale.domain(inDom);
                changePro();

        }
    });
}

var getCountryIDs = function(file, callback) { 
    d3.json(file, function(world) {
        $.ajax({
        url: "http://api.worldbank.org/countries?format=jsonP&prefix=Getdata&per_page=500",
        jsonpCallback:'getdata',
        dataType:'jsonp',
        success: function( data, status) {
            var codes = {};
            data[1].forEach(function(d) { codes[d.id] = d.iso2Code})
            world.features.forEach(function(d) {
                if (codes[d.id]) {d.id = codes[d.id];}
            });
            callback(null, world);
        }})
    })
} 

var initVis = function(error, indicators, world){
    svg.append('g').attr('id','countries').selectAll(".country")
        .data(world.features).enter().append('path')
        .attr('class','country');
    // var IndicatorNames = indicators.map(function(d){ return d.IndicatorName})
    // $( "#indicator" ).autocomplete({source: IndicatorNames});
    runAQueryOn('SH.TBS.INCD');
}

queue()
    .defer(d3.csv,"../data/worldBank_indicators.csv")
    .defer(getCountryIDs, "../data/world_data.json")
    .await(initVis);

            // times = d3.keys(dataSet[0].properties.hourly);
            // yDom = d3.extent(d3.values(dataSet[0].properties.hourly));
            // xScale = d3.scale.ordinal().domain(times).rangeRoundBands([0, bbDetail.w],.15,0);
            // yScale = d3.scale.linear().domain(yDom).range([bbDetail.h, 0]);
            // colorHour = d3.scale.quantile().domain(d3.range(24))
            //   .range(['#E66545','#FF9933','#FFD633','#FFD633','#FF9933','#E66545']);



// just for fun 
var textLabel = svg.append("text").text(projectionMethods[actualProjectionMethod].name).attr({
    "transform":"translate(-40,-30)"
})

var changePro = function(){
    actualProjectionMethod = (actualProjectionMethod+1) % (projectionMethods.length);

    textLabel.text(projectionMethods[actualProjectionMethod].name);
    path= d3.geo.path().projection(projectionMethods[actualProjectionMethod].method);
    svg.selectAll(".country").transition().duration(750)
    .attr("d",function(d) {return path(d.geometry)})
    .attr("fill",function(d) {
        if (dataSet[d.id]) { 
            console.log(colorScale(dataSet[d.id].value));
            return colorScale(dataSet[d.id].value); }
        else {return 'grey'}
    });
};

d3.select("body").append("button").text("changePro").on({"click":changePro});

