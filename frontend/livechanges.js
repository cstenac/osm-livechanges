// vim: ts=4 sw=4 et
// this code needs jquery.js leaflet.js and highcharts.js

// Startup code
var jQueryReady = false;
var highChartsReady = false;
var topMapReady = false;
var smallMapReady = false;

// Misc
var currentData  = Array();
var allChangesets = Array(); // Since startup, for forward/backward
var currentlyDetailedId = undefined;
var currentlyDetailedIndex = 0;

var scale=5;
var chart_points = 10;
var timeOffset= 140;
var startTime = new Date().getTime();
var totalCNode = 0, totalMNode = 0, totalDNode = 0;
var totalCWay = 0, totalMWay = 0, totalDWay = 0;
var totalCRel = 0, totalMRel = 0, totalDRel = 0;
var totalChangesets = 0;
var seenUsers = Array();
var log_even = true;

// Top map
var map = undefined;
var allMarkers = [];
var greenIcon = L.icon({
        iconAnchor: [15, 30],iconUrl : 'http://www.iosm.eu/live/lwt_map_icons/green/O.png'});
var redIcon = L.icon({
        iconAnchor: [15, 30],iconUrl : 'http://www.iosm.eu/live/lwt_map_icons/brown/O.png'});

// Bottom map
var activeMap = Array();
var inactiveMap = Array();

// Graph
var chart_edits = undefined;
var addedPoints = 0;
				
var playing = true;

function getParameterByName(name)
{
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if(results == null)
        return null;
    else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
}


function setButtonsState() {
    if (currentlyDetailedIndex == 0) {
        $("#prevButton").attr('disabled', 'disabled');
    } else if (allChangesets.length > 0) {
        $("#prevButton").removeAttr("disabled");
    }
    if (currentlyDetailedIndex >= allChangesets.length - 1) {
        $("#nextButton").attr('disabled', 'disabled');
    } else if (allChangesets.length > 0) {
        $("#nextButton").removeAttr("disabled");
    }
    if (playing) {
        $("#pauseButton").removeAttr("disabled");
        $("#playButton").attr('disabled', 'disabled');
    } else {
        $("#pauseButton").attr('disabled', 'disabled');
        $("#playButton").removeAttr("disabled");
 
    }
}

function setButtonHandlers() {
    $("#playButton").click(function() {
        playing = true;
        setButtonsState();
    });
    $("#pauseButton").click(function() {
        playing = false;
        setButtonsState();
    });
    $("#nextButton").click(function() {
        if (currentlyDetailedId == undefined) {
            return;
        }
        if (currentlyDetailedIndex >= allChangesets.length -1) {
            return;
        }
        playing = false;
        console.info("Going from " + currentlyDetailedIndex);
        var nextIdx = parseInt(currentlyDetailedIndex) + 1;
        console.info("Going from " + currentlyDetailedIndex + " to " + nextIdx);
        next = allChangesets[nextIdx];
        console.info("Got "  + next);
        setDetailedChangeset(next["id"]);
        $("#tailscroll").scrollTo(next["logItem"]);
        setButtonsState();
     });
    $("#prevButton").click(function() {
        if (currentlyDetailedId == undefined) {
            return;
        }
        if (currentlyDetailedIndex == 0) {
            return;
        }
        playing = false;
        console.info("PREV Going from " + currentlyDetailedIndex);
        next = allChangesets[parseInt(currentlyDetailedIndex) - 1];
        setDetailedChangeset(next["id"]);
        $("#tailscroll").scrollTo(next["logItem"]);
        setButtonsState();
     });
    setButtonsState();
}

function checkStartup() {
    if (jQueryReady && highChartsReady && topMapReady && bottomMapReady){
        downloadData();
    }
}

function onNextDataReady() {
    nextDataTick();
}

function downloadData() {
    $.getJSON("/~zorglub/livechanges/frontend/get-last-data.py?scale=" + scale,
        function(data) {
            console.log("Data is ready");
            currentData = data;
            onNextDataReady();
        }
    );
}
	function pluriel(count)
	{
		if (count>1) return 's';
		return '';
	};
	

function setDetailedChangeset(id) {
    console.log("Setting detailed changset " + id);
	/* Mark all ones as unselected in the log */
	$("#tailtable tr.detailed").each(function(e) { $(this).removeClass("detailed"); $(this).addClass("detailed_old");});

    var changeset = undefined;
    for (var chg in allChangesets){
        if (allChangesets[chg]["id"] == id) {
            changeset = allChangesets[chg];
            currentlyDetailedId = id;
            currentlyDetailedIndex = chg;
            break;
        }
    }
    if (changeset == undefined) {
        console.warn("Changeset to zoom on not found !");    
        return;
    }

    var inm = inactiveMap["map"];

    /* Remove the previous bbox polygon */
    if (inactiveMap["poly"] != undefined) {
        inm.removeLayer(inactiveMap["poly"]);
    }

    /* Create the new one */
	poly = L.polygon([[changeset["minLat"], changeset["minLon"]],
						[changeset["minLat"], changeset["maxLon"]],
						[changeset["maxLat"], changeset["maxLon"]],
						[changeset["maxLat"], changeset["minLon"]]],{color:'red'});
	// add it on the map
	poly.addTo(inm);
    inactiveMap["poly"] = poly;
							
	// margins around the bbox polygon
	var width = (changeset["maxLon"]-changeset["minLon"])/2;
	var height = (changeset["maxLat"]-changeset["minLat"])/2;
	var sw = new L.LatLng(changeset["minLat"]-height,changeset["minLon"]-width);
	var ne = new L.LatLng(changeset["maxLat"]+height, changeset["maxLon"]+width);
	var ce = new L.LatLng((sw.lat + ne.lat)/2, (sw.lng + ne.lng)/2);
	
	/* Do not zoom too much */
    {
	    sw.lat -= 0.001;
		ne.lat += 0.001;
		sw.lon -= 0.001;
		ne.lon += 0.001;
	}
	
    var bounds = new L.LatLngBounds(sw, ne);
	inm.fitBounds(bounds);
	map.panTo(ce); // pan the world map on this changeset location

    // update changeset details
	var user = changeset["user"];
    var cnode = changeset["cnode"];
    var mnode = changeset["mnode"];
    var dnode = changeset["dnode"];
    var cway = changeset["cway"];
    var mway = changeset["mway"];
    var dway = changeset["dway"];
    var crel = changeset["crel"];
    var mrel = changeset["mrel"];
    var drel = changeset["drel"];
 

    $("#currentChangeset").html("Changeset <a target='_blank' href=\"http://osm.org/browse/changeset/" + id + "\">" + id + "</a> by <a target='_blank' href=\"http://osm.org/user/" + user + "\">" + user + "</a> " + getFlagImgHtml(changeset));
	$("#detail").html("<img style='padding: 2px; vertical-align:middle;' src='http://wiki.openstreetmap.org/w/images/b/b5/Mf_node.png' width=20 height=20> "
		+ cnode + " node"+pluriel(cnode)+" added, " + mnode + " modified, " + dnode+" deleted<br>"
		+ "<img style='padding: 2px; vertical-align:middle;' src='http://wiki.openstreetmap.org/w/images/6/6a/Mf_way.png' width=20 height=20> "
		+ cway + " way"+pluriel(cway)+" added, " + mway + " modified, " + dway +" deleted<br>"
		+ "<img style='padding: 2px; vertical-align:middle;' src='http://wiki.openstreetmap.org/w/images/thumb/d/d9/Mf_Relation.svg/20px-Mf_Relation.svg.png' width=20 height=20> "
		+ crel + " relation"+pluriel(crel)+" added, " + mrel + " modified, " + drel +" deleted"
	);

    /* And mark it as selected! */
    logItem = $(changeset["logItem"]);
    logItem.removeClass("detailed_old");
    logItem.addClass("detailed");

    if ("true" == getParameterByName("changesets_meta")) {
        $("#meta_detail").html("Loading details ...");
        $.getJSON("/~zorglub/livechanges/frontend/fetch-changeset-meta.py?id=" + id, 
          function(data) {
              var comment = data["tags"]["comment"];
              var created_by = data["tags"]["created_by"];
              if (comment != undefined && created_by != undefined) {
                $("#meta_detail").html("Created with " + created_by + "<br />" + comment);
              } else if (created_by  !=undefined) {
                $("#meta_detail").html("Created with " + created_by);
              } else {
                $("#meta_detail").html("");
              }
          });
    } else {
        $("#underSmallMap").css("height", "110px");
        $("#underSmallMap").css("top", "-108px");
    }
}


function onBottomMapReady() {
}



/* Get the best data point to draw from the current data.
 * This function returns undefined if there is no good point
 * to draw */
function getBestPoint(now) {
    var bestStamp = now - 140;

    if (currentData == undefined) return; // Should not happen !
    //console.log("Parsing data " + currentData["timeseries"].length);
    var bestPoint = undefined;
    var firstPoint = 99999999999, lastPoint = 0;
    for (var i in currentData["timeseries"]) {
        var thisTime = currentData["timeseries"][i]["time"]
            firstPoint = Math.min(thisTime, firstPoint)
            lastPoint = Math.max(lastPoint, thisTime)
//                    console.log("Data " + currentData["timeseries"][i])
            if (currentData["timeseries"][i]["time"] > bestStamp) {
                            console.log("Trying to display " + bestStamp + " and I have " + 
                                currentData["timeseries"][i]);
                bestPoint = currentData["timeseries"][i];
                break;
            }   
    } // for i
    return bestPoint;
}

function updateTopMap(dataPoint) {
    /* Lower the opacity of previous markers */
    for (var i in allMarkers){
        allMarkers[i].setIcon(greenIcon);
        allMarkers[i].setOpacity(0.5);
    }

    /* First the non selected ones */
    for (var i in dataPoint["changesets"]) {
        var changeset = dataPoint["changesets"][i];
        if (!changeset["selected"] && changeset["minLat"] != "-90.0") {
    		var lon = (changeset["minLon"] +  changeset["maxLon"]) / 2
    		var lat = (changeset["minLat"] +  changeset["maxLat"]) /2
		    var marker = L.marker([lat, lon]);
	        marker.setIcon(greenIcon);
			marker.setOpacity(0.8);
            allMarkers.push(marker);
            marker.addTo(map);
        }
    }
    /* The selected one last, so as to get it on top */
    for (var i in dataPoint["changesets"]) {
        var changeset = dataPoint["changesets"][i];
        if (changeset["selected"]) {
    		var lon = (changeset["minLon"] +  changeset["maxLon"]) / 2
    		var lat = (changeset["minLat"] +  changeset["maxLat"]) /2
		    var marker = L.marker([lat, lon]);
	        marker.setIcon(redIcon);
			marker.setOpacity(1);
            allMarkers.push(marker);
            marker.addTo(map);
 
        }
    }

    /* Remove markers above 100 */
    if (allMarkers.length > 100){
        allMarkers.reverse();
        for (var i = 100; i < allMarkers.length; i++){
            map.removeLayer(allMarkers[i]);
        }
        allMarkers.splice(100, allMarkers.length - 100);
    }
}

/* From a data point, select the changeset we'll highlight.
 * This function sets the "selected" flag on it
 */
function selectChangeset(dataPoint) {
    for (var i in dataPoint["changesets"]) {
        var changeset = dataPoint["changesets"][i];
	    var isTheSelectedOne = false;

        // Don't skip enmpty changesets
        changeset["selected"] = false;
		if (changeset["maxLat"]-changeset["minLat"] != 180) { 
		    if (parseInt(i) +1 == dataPoint["changesets"].length) {
			    if (changeset["minLat"] != "-90.0") {
                    console.log("Found changeset to select");
                    changeset["selected"] = true;
                    return;
                }
			}
        }
    }
}

function getFlagImgHtml(changeset) {
    if(changeset["country"] != undefined) {
        return "<img src=\"flags/" + changeset["country"] + ".png\" />";
    } else {
        return "<img src=\"flags/unknown.png\" />";
//     console.log("No flag for changeset");
    }
}

/* Main callback, scheduled regularly, to display the next data */
function nextDataTick(){
    var now = new Date().getTime() / 1000;
    bestPoint = getBestPoint(now);

    if (bestPoint == undefined) {
        var bestStamp = now - 140;
        console.log("No more good data for " + new Date(bestStamp*1000) + ")");
//        console.log("Found range " + firstPoint +" to " + lastPoint);
        downloadData(); // downloadData will reschedule the tick
        return;
    }
        
    var cnode = bestPoint["cnode"];
    var mnode = bestPoint["mnode"];
    var dnode = bestPoint["dnode"];
    var cway = bestPoint["cway"];
    var mway = bestPoint["mway"];
    var dway = bestPoint["dway"];
    var crel = bestPoint["crel"];
    var mrel = bestPoint["mrel"];
    var drel = bestPoint["drel"];
    totalCNode += cnode; totalMNode += mnode; totalDNode += dnode;
    totalCWay += cway; totalMWay += mway; totalDWay += dway;
    totalCRel += crel; totalMRel += mrel; totalDRel += drel;
    totalChanges = totalCNode+totalMNode+totalDNode+totalCWay+totalMWay+totalDWay+totalCRel+totalMRel+totalDRel;
    totalChangesets += bestPoint["nbChangesets"];

    minutes = (new Date().getTime() - startTime)/60000;

    /* Add the point to the graph */
    ++addedPoints;
    {
        series = chart_edits.series[0];
        series.addPoint([bestPoint["time"] * 1000, bestPoint["nbChangesets"]*(60/scale)], false, addedPoints > 10);
        chart_edits.redraw();
    }

    if (playing) {
        selectChangeset(bestPoint);
    }

    /* Save all changesets in this data point */
    for (var i in bestPoint["changesets"]) {
        allChangesets.push(bestPoint["changesets"][i]);
    }

    updateTopMap(bestPoint);

    /* Add all to the log */
    {
	    var heightBefore = $("#tailscroll").get(0).scrollHeight;
    	var lastAdded = undefined;
    	var allAdded = Array();
        for (var i in bestPoint["changesets"]) {
            var changeset = bestPoint["changesets"][i];
			d =  new Date(changeset["time"] * 1000);
			var u = changeset["user"];

            /* Also update the seen users counter */
			if ($.inArray(u, seenUsers) >= 0){
			} else {
				seenUsers.push(u);
			}
			var time = $.format.date(d, "HH:mm:ss"); // d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()


            var html = "<td class='log_time'>" + time + "</td><td class='log_user'><a target='_blank' href='http://osm.org/user/"+u+"'>" + u + "</a></td>";
	/*                html += "<td class='log_cnode'>" + changeset["cnode"] +  "</td><td class='log_mnode'>" + changeset["mnode"] +  "</td><td class='dog_cnode'>" + changeset["dnode"] + "</td>";
					html += "<td class='log_cway'>" + changeset["cway"] +  "</td><td class='log_mway'>" + changeset["mway"] +  "</td><td class='log_dway'>" + changeset["dway"] + "</td>";
					html += "<td class='log_crel'>" + changeset["crel"] +  "</td><td class='log_mrel'>" + changeset["mrel"] +  "</td><td class='log_drel'>" + changeset["drel"] + "</td>";
					*/
			var total =
				parseInt( changeset["cnode"]) +  parseInt( changeset["mnode"])+ parseInt( changeset["dnode"]) +
				parseInt( changeset["cway"]) +  parseInt( changeset["mway"])+ parseInt( changeset["dway"]) +
				parseInt( changeset["crel"]) +  parseInt( changeset["mrel"])+ parseInt( changeset["drel"]);
			html += "<td class='log_edits'><a target='_blank' href='http://osm.org/browse/changeset/"+changeset["id"]+"'>" + total + "</a>"
            html += getFlagImgHtml(changeset);
            html += "</td><td class='log_right'></td>";
/*
			if (changeset["minLat"] != "-90.0") {
				// Zoom button (on top map)
				html += "<td class='log_zoom' width=\"50%\">";
				html += "<a class='log_zoombig' href=\"#\" onclick=\"var sw= new L.LatLng(" + changeset["minLat"] + ","
					+ changeset["minLon"] + "),ne = new L.LatLng(" + changeset["maxLat"] + ","
					+ changeset["maxLon"] + "), bounds = new L.LatLngBounds(sw, ne); map.fitBounds(bounds);\">Zoom on top map</a> ";
    				// Details button
			        html += "<a class='log_zoomsmall' href=\"#\" onclick=\"detailChangeset(" +changeset["id"] + ",'"+ changeset["user"] + "',"
					+ changeset["minLat"] + ","+ changeset["minLon"] + ","+ changeset["maxLat"] + ","
					+ changeset["maxLon"] + "," +  changeset["cnode"] + "," +  changeset["mnode"] + ","
						+  changeset["dnode"] + "," +   changeset["cway"] + "," +  changeset["mway"] + ","
						+  changeset["dway"] + "," +   changeset["crel"] + "," +  changeset["mrel"] + ","
						+  changeset["drel"] + ")\">Select</a></td>";
				}   else {
					html += "<td>N/A</td>";
				}
*/
			var zhtml = $("<tr />").html(html);
            changeset["logItem"] = zhtml;
		zhtml.hide();
			 zhtml.appendTo("#tailtable");
			 lastAdded = zhtml;
			 allAdded.push(zhtml);
       }	
    }

    /* Go bottom map ! */
    for (var i in bestPoint["changesets"]) {
        var changeset = bestPoint["changesets"][i];
        if (changeset["selected"]) {
            setDetailedChangeset(changeset["id"]);
        }
    }

    /* Scroll the log */
	for (var i in allAdded) {
			$(allAdded[i]).show();
//			$("#tailscroll").animate({scrollTop: heightBefore}, 0);
	}
	var newHeight = $("#tailscroll").get(0).scrollHeight;
//	console.log("Scrolling " +  (newHeight-heightBefore));
    if (playing) {
    	$("#tailscroll").animate({scrollTop: newHeight/* "+=" + (newHeight-heightBefore) + "px"*/}, 'easeOutBack');
    }
//:		$("#tailscroll").animate({scrollTop: newHeight}, 'easeOutBack');
//		if (lastAdded != undefined) {
//			$("#tailscroll").scrollTo(lastAdded, 'easeOutBack');	
//		}

	// update global counters
	$("#count_edits").html("" + totalChanges);
	// $("#count_changesets").html("" + totalChangesets);
	$("#count_users").html("" + seenUsers.length);
	$("#count_minutes").html("" + (minutes.toFixed(0))+"'");

    setButtonsState();

    setTimeout(nextDataTick, scale * 1000);

} // function nextDataTick


function makeOldData(now) {
    data = Array()
        for (var i = 0; i < chart_points; i++) {
            var time = now - timeOffset * 1000 - i * scale * 100
                data.push([time, 0]);
        }
    data.reverse()
        return data;
}

///////////////////////////////////////////////////////////////////////
// Main
///////////////////////////////////////////////////////////////////////

$(document).ready(function() {
    var now = new Date().getTime();
    jQueryReady = true;

    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    chart_edits = new Highcharts.Chart({
        chart: {
            renderTo: 'graph_edits',
            type: 'spline',
            /*marginRight: 10,*/
            animation : {
                duration : 300, easing : 'linear'
            },
        },
        title: {
            text: ''
        },
        xAxis: {
            type: 'datetime',
          tickPixelInterval: 150
        },
        yAxis: {
            opposite: true,
            title: {
                text: 'Contributions/minute'
            },
            min : 0,
            plotLines: [{
                value: 1,
               width: 1,
               color: '#808080'
           }]
       },

/* tooltip: {
formatter: function() {
               return '<b>'+ this.series.name +'</b><br/>'+
                   Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) +'<br/>'+
                   Highcharts.numberFormat(this.y, 2);
           }
         }, */
        plotOptions: {spline: {marker: { enabled: false }}}, 
        legend: {
            enabled: false
        },
        exporting: {
            enabled: false
        },

        series: [{
            name: 'Contributions',
            data: (function() { return makeOldData(now); })()
        }]
    });

    highChartsReady = true;


    /* Initialize the top map */
    {
        var mapnik = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 14,
            attribution: 'OpenStreetMap'
        });
        var omq = new L.TileLayer(
            'http://otile2.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {
            maxZoom: 14,
            attribution: '<a href="http://osm.org/">OpenStreetMap</a> and <a href="http://open.mapquest.com/">MapQuest</a>',
            opacity: 0.5
        });
        var nasa = new L.TileLayer(
            'http://a.tiles.mapbox.com/v3/mapbox.blue-marble-topo-bathy-jul/{z}/{x}/{y}.png', {
            detectRetina: true, reuseTiles: true,
            maxZoom: 14,
            attribution: '<a href="http://osm.org/">OpenStreetMap</a> and <a href="http://tiles.mapbox.com/mapbox/map/blue-marble-topo-bathy-jul">NASA Bluemarble@MapBox</a>',
            opacity: 1
        });
        var world = new L.tileLayer('http://{s}.tiles.mapbox.com/v3/mapbox.world-bank-borders-en/{z}/{x}/{y}.png', {
            detectRetina: true, reuseTiles: true,
        });
        var bluemarble = new L.layerGroup([nasa, world]);

        var control = new L.Control.Layers(  { "OpenMapQuest": omq, "Mapnik": mapnik , "NASA Blue Marble @ Mapbox" : bluemarble} );
        map = new L.Map('map', {
            center: new L.LatLng(25, 0),
            zoom:3,
        });
        map.addLayer(omq);
        map.addControl(control)
    }
    topMapReady  = true; // for the moment

    /* Initialize the bottom map */
    {
        inactiveMap["poly"] = undefined;
        var mapnik = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 15,attribution: 'OpenStreetMap'
        });
        // setup the small alternating smallmaps
        inactiveMap["map"] = new L.Map('smallMap1', {
            center: new L.LatLng(0, 0),
            zoom:2,
            zoomControl: false,
            attributionControl: false,
        });
        inactiveMap["map"].addLayer(mapnik);
        /*
        var mapnik = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap'
        });
        smallMap2 = new L.Map('smallMap2', {
            center: new L.LatLng(0, 0),
            zoom:2,
            zoomControl: false,
            attributionControl: false,
        });
        smallMap2.addLayer(mapnik);
        */    
        // start with the 1st smallMap
        //smallMap = smallMap1;
    }
    bottomMapReady = true;

    setButtonHandlers();
    checkStartup();
});
