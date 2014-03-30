/**
 * Created by hen on 3/8/14.
 */
var margin, width, height, bbVis, svg, projectionMethods, actualProjectionMethod, currInd;
var colorScale, lScale, lAxis, legendDom, lTick, legend, world;

margin = { top: 50, right: 50, bottom: 50, left: 50 };
width = 960 - margin.left - margin.right;
height = 700 - margin.bottom - margin.top;
bbVis = { x: 100, y: 10, w: width - 100, h: 300 };

projectionMethods = [ //.precision(.1);
    { name:"mercator", method: d3.geo.mercator().translate([width / 2, height / 2]) },
    { name:"equiRect", method: d3.geo.equirectangular().translate([width / 2, height / 2]) },
    { name:"stereo",   method: d3.geo.stereographic().translate([width / 2, height / 2]) }];
actualProjectionMethod = 0;
colorScale = d3.scale.quantize().range(colorbrewer.Greens[5]);

svg = d3.select("#vis").append("svg")
    .attr({width:width+margin.left+margin.right,height:height+margin.top+margin.bottom})
    .append("g").attr({transform:"translate("+margin.left+","+margin.top+")"});




var getCountryIDs = function(file, callback) { 
    d3.json(file, function(w) {
        $.ajax({
        url: "http://api.worldbank.org/countries?format=jsonP&prefix=Getdata&per_page=500",
        jsonpCallback:'getdata',
        dataType:'jsonp',
        success: function( data, status) {
            var codes = {};
            data[1].forEach(function(d) { codes[d.id] = d})
            w.features.forEach(function(d) {
                if (codes[d.id]) {
                    d.id = codes[d.id].iso2Code;
                    d.properties.country = codes[d.id];
                }
            });
            callback(null, w);
        }})
    })
} 

var initVis = function(error, indicators, map){
    world = map;
    svg.append('g').attr('id','countries').selectAll(".country")
        .data(world.features).enter().append('path')
        .attr('class','country')
        .on("click", updateLabel);
    // indicator selection input and menu
    var timer, term, hidden;
    var indList = d3.select('select[name="filtered"]')
    .selectAll('.ind').data(indicators).enter()
    .append("option").attr("value", function(d,i){return d.IndicatorCode})
    .text(function(d) {return d.IndicatorName})
    .on("click", function(){ 
        currInd = {id: this.value, value: this.text};
        runAQueryOn(currInd.id) });


    d3.selectAll(".settings input").on("keyup",function() {
        if (this.id=="selectorYear") {runAQueryOn(currInd.id);}
        else if (this.id=="indicator" && this.value != term) {
            term = this.value;
            if (timer) {clearTimeout(timer);}
            timer = setTimeout(function() {
                if (hidden) {hidden.forEach(function(d){$(d).unwrap( );})}
                indList.style("display","initial");
                if (term) {
                    hidden = indList.filter( function(d) {
                        return d.IndicatorName.toLowerCase().indexOf(term.toLowerCase()) == -1;})[0]
                    hidden.forEach(function(d) {$(d).wrap("<span style='display: none;'></span>");})
                }
            }, 500);
        }
    })
    // sets up legend
    legendDom = function() {
        var r = colorScale.range().map(function(d) {return colorScale.invertExtent(d)[0]});
        r.push(colorScale.domain()[1]);
        return r;
    }
    lTick = {w: 50, p:5};
    lScale = d3.scale.linear().domain([0,1]).range([0, 100]);
    lAxis = d3.svg.axis().orient("right").tickSize(lTick.w+lTick.p);

    // proxy indicator
    currInd = {id: null, value: "Country Index # (Alphabetical)"};
    world.features.forEach(function(d,i) {
        d.properties.indValue = {value: i}
    })
    colorScale.domain([0, d3.keys(world.features).length-1])
    changePro();

}

var runAQueryOn = function(indicatorString) {
    var indDate = d3.select('input[id="selectorYear"]')[0][0].value;
    if (!parseInt(indDate)) {indDate = ""}
    else { indDate = "&date="+indDate}
    $.ajax({
        url: "http://api.worldbank.org/countries/all/indicators/"+indicatorString+"?format=jsonP&prefix=Getdata"+indDate+"&MRV=1&per_page=500", //do something here
        jsonpCallback:'getdata',
        dataType:'jsonp',   
        success: function (data, status){
            var inDom = [Number.MAX_VALUE, 0];
            console.log(data)
            currInd = data[1][0].indicator;
            world.features.forEach(function(d) {
                delete d.properties.indValue;
                data[1].forEach(function(e) {
                    if (d.id == e.country.id) {
                        if (e.value || e.decimal) { 
                            if (e.value == null) {e.value = 0;}
                            e.value = parseFloat(e.value + "." + e.decimal); 
                            if (e.value < inDom[0]) {inDom[0] = e.value;}
                            else if (e.value > inDom[1]) {inDom[1] = e.value;}
                        }
                        d.properties.indValue = {value: e.value, date: parseInt(e.date)};
                    }
                })
            })
            colorScale.domain(inDom);
            changePro();
        },
        error: function() {
            alert("Invalid Year.")
        }

    });
}

queue()
    .defer(d3.csv,"../data/worldBank_indicators.csv")
    .defer(getCountryIDs, "../data/world_data.json")
    .await(initVis);

var textLabel = svg.append("text").text(projectionMethods[actualProjectionMethod].name).attr({
    "transform":"translate(-40,-30)"
})

var changePro = function(){

    textLabel.text(projectionMethods[actualProjectionMethod].name);
    path= d3.geo.path().projection(projectionMethods[actualProjectionMethod].method);
    svg.selectAll(".country").transition().duration(750)
    .attr("d",function(d) {return path(d.geometry)})
    .attr("fill",function(d) {
        if (d.properties.indValue ) { return colorScale(d.properties.indValue.value); }
        else {return 'grey'}
    });
    // .on("click", zoomed);
    
    lScale.domain(colorScale.domain());
    lDom = legendDom();
    lAxis.scale(lScale).tickValues(lDom);

    if (legend) {legend.remove();}

    legend = svg.append("g").attr({class:"key", transform:"translate(-40,"+
        (height-margin.top-margin.bottom-2*lTick.p+30)+")"});
    legend.selectAll("rect")
        .data(colorScale.range().map(function(d,i) {
          return { y0: lScale(lDom[i]), y1: lScale(lDom[i+1]), z: d };
        }))
        .enter().append("rect")
        .attr("width", lTick.w)
        .attr("y", function(d) { return d.y0; })
        .attr("height", function(d) { return d.y1 - d.y0; })
        .style("fill", function(d) { return d.z; });
    legend.call(lAxis).append('text')
        .attr({class:"caption","alignment-baseline":"before-edge", y:lScale.range()[1]+2*lTick.p})
        .text(currInd.value);


};


d3.select("body").append("button").text("changePro").on("click",function() {    
    actualProjectionMethod = (actualProjectionMethod+1) % (projectionMethods.length);
    changePro();});


function updateLabel() {
    console.log(d3.select(this).data()[0])
    var info = d3.select(this).data()[0];
        if (info.properties.indValue) {
        var date;
        if(info.properties.indValue.date){date = info.properties.indValue.date;}
        else {date = "N/A";}
        var value;
        if(info.properties.indValue.value){value = info.properties.indValue.value;}
        else {value = "N/A";}
        d3.select('#textLabel').html(
            info.properties.name.toUpperCase()+" (ISO: "+info.id+")<br/>"+
            "Year: "+date+"<br/>"+
            currInd.value+": "+value
        )   
    }

}