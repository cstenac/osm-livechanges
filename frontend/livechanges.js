// this code needs jquery.js leaflet.js and highcharts.js

var currentData  = Array();
var chart_edits = undefined;
var chart_details = undefined;
var map = undefined;
var smallMap	= undefined; // current smallmap
var smallMap1	= undefined;
var smallMap2	= undefined;
var addedPoints = 0;
var markerGens = []; // Generations of markers on top map 
var poly = undefined;
var markers = 0; // total number of markers

var scale=5;
var chart_points = 10;
var timeOffset= 140;

var startTime = new Date().getTime();
var totalCNode = 0, totalMNode = 0, totalDNode = 0;
var totalCWay = 0, totalMWay = 0, totalDWay = 0;
var totalCRel = 0, totalMRel = 0, totalDRel = 0;
var totalChangesets = 0;
var seenUsers = Array();

var greenIcon = L.icon({
        iconAnchor: [15, 30],iconUrl : 'http://www.iosm.eu/live/lwt_map_icons/green/O.png'});
var redIcon = L.icon({
        iconAnchor: [15, 30],iconUrl : 'http://www.iosm.eu/live/lwt_map_icons/brown/O.png'});

var log_even = true;

function downloadAndRefreshMap() {
    $.getJSON("/~zorglub/livechanges/frontend/get-last-data.py?scale=" + scale, function(data) { currentData = data  });
}

function detailChangeset(id, user, minLat, minLon, maxLat, maxLon, cnode, mnode, dnode, cway, mway, dway, crel, mrel, drel) {
	/* Mark all ones as unselected */
	$("#tailtable tr.detailed").each(function(e) { $(this).removeClass("detailed"); $(this).addClass("detailed_old");});

	function pluriel(count)
	{
		if (count>1) return 's';
		return '';
	};
	
	if (maxLat-minLat<180) {
		if (poly != undefined)
			smallMap.removeLayer(poly);

		poly = L.polygon([[minLat, minLon],
				[minLat, maxLon],
				[maxLat, maxLon],
				[maxLat, minLon]], {color:'red'}).addTo(smallMap);
	
		var sw = new L.LatLng(minLat,minLon);
		var ne = new L.LatLng(maxLat, maxLon);
		var ce = new L.LatLng((maxLat+minLat)/2, (maxLon+minLon)/2);
		/* Do not zoom too much on single-nodechangesets */
		// if (sw.lat == ne.lat)
		 {
			sw.lat -= 0.002;
			ne.lat += 0.002;
			sw.lon -= 0.002;
			ne.lon += 0.002;
		}
	
		
		// update the smallMap
/*
		// alternate between our 2 smallmaps for smooth transition
		if (smallMap == smallMap1)
			smallMap=smallMap2;
		else
*/		
			smallMap=smallMap1;

		var bounds = new L.LatLngBounds(sw, ne);
		map.panTo(ce); // pan the world map on this changeset location
		smallMap.fitBounds(bounds); // zoom the detailed map on this changeset bounds


/*
		if (smallMap==smallMap1)
			// fade out smallMap2 to make smallMap1 visible
			$("#smallMap2").toggle(function() {$(this).animate({ opacity: 1 }, 200);},function() {$(this).animate({ opacity: 0 }, 200);});
		else
			// fade in smallMap2 to make smallMap1 invisible
			$("#smallMap2").toggle(function() {$(this).animate({ opacity: 0 }, 200);},function() {$(this).animate({ opacity: 1 }, 200);});
*/		

		// update changeset details
    	$("#currentChangeset").html("Changeset <a target='_blank' href=\"http://osm.org/browse/changeset/" + id + "\">" + id + "</a> by <a target='_blank' href=\"http://osm.org/user/" + user + "\">" + user + "</a>");
		$("#detail").html("<img style='padding: 2px; vertical-align:middle;' src='http://wiki.openstreetmap.org/w/images/b/b5/Mf_node.png' width=20 height=20> "
			+ cnode + " node"+pluriel(cnode)+" added, " + mnode + " modified, " + dnode+" deleted<br>"
			+ "<img style='padding: 2px; vertical-align:middle;' src='http://wiki.openstreetmap.org/w/images/6/6a/Mf_way.png' width=20 height=20> "
			+ cway + " way"+pluriel(cway)+" added, " + mway + " modified, " + dway +" deleted<br>"
			+ "<img style='padding: 2px; vertical-align:middle;' src='http://wiki.openstreetmap.org/w/images/thumb/d/d9/Mf_Relation.svg/20px-Mf_Relation.svg.png' width=20 height=20> "
			+ crel + " relation"+pluriel(crel)+" added, " + mrel + " modified, " + drel +" deleted"
		);

	}
} // function detailChangeset

function addBestPoint() {
    var now = new Date().getTime() / 1000;
    var bestStamp = now - 140;

    if (currentData == undefined) return;
    console.log("Parsing data " + currentData["timeseries"].length);
    var bestPoint = undefined;
    var firstPoint = 99999999999, lastPoint = 0;
    for (var i in currentData["timeseries"]) {
        var thisTime = currentData["timeseries"][i]["time"]
            firstPoint = Math.min(thisTime, firstPoint)
            lastPoint = Math.max(lastPoint, thisTime)
            //        console.log("Data " + currentData["timeseries"][i])
            if (currentData["timeseries"][i]["time"] > bestStamp) {
                //            console.log("Trying to display " + bestStamp + " and I have " + 
                //                currentData["timeseries"][i]);
                bestPoint = currentData["timeseries"][i];
                break;
            }   
    } // for i
    
    if (bestPoint == undefined) {
        console.log("Did not fidn data to graph " + bestStamp + " (" + new Date(bestStamp*1000) + ")");
        console.log("Found range " + firstPoint +" to " + lastPoint);
        downloadAndRefreshMap();
        setTimeout(addBestPoint, 1000);
    } else {
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

        /* Draw it */
        ++addedPoints;
        {
            series = chart_edits.series[0];
            series.addPoint([bestPoint["time"] * 1000, bestPoint["totalActivity"]/scale], false, addedPoints > 10);
            chart_edits.redraw();
        }
        setTimeout(addBestPoint, scale * 1000);

        /* Reset all icons */
        for (var i in markerGens){
            var genMarkers = markerGens[i];
            for (var j in genMarkers) {
                for (var k in genMarkers[j]) {
                    genMarkers[j][k].setIcon(greenIcon);
                    genMarkers[j][k].setOpacity(0.4);
                }  
            }
        }

        /* Draw on map */
        genMarkers = []
        genPolys = []
        for (var i in bestPoint["changesets"]) {
            var changeset = bestPoint["changesets"][i];
			var isTheSelectedOne = false;

			// CQ - skip empty/worldwide changesets (minLat=-90 / maxLat=90)
			if (changeset["maxLat"]-changeset["minLat"] != 180) { 
					if (parseInt(i) +1 == bestPoint["changesets"].length) {
						if (changeset["minLat"] != "-90.0") isTheSelectedOne = true;
					}
	
					//console.info("Adding changeset " + changeset["minLon"]);
					var lon = (changeset["minLon"] +  changeset["maxLon"]) / 2
					var lat = (changeset["minLat"] +  changeset["maxLat"]) /2
						d =  new Date(changeset["time"] * 1000);
					var u = changeset["user"];
	
					if ($.inArray(u, seenUsers) >= 0){
					} else {
						seenUsers.push(u);
					}
					var time = $.format.date(d, "HH:mm:ss"); // d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
	
					/* Top-map : display one marker for each changeset */
					/* Bottom-map: display last one */
	
					if (changeset["minLat"] != "-90.0") {
						var marker = L.marker([lat, lon]);
						if (isTheSelectedOne) {
							marker.setIcon(redIcon);
							marker.setOpacity(1);
						} else {
							marker.setIcon(greenIcon);
							marker.setOpacity(0.8);
						}
						marker.addTo(map);
						markers++;
						
						if (isTheSelectedOne) {
						
							// remove the previous bbox polygon
							if (poly != undefined)
								smallMap.removeLayer(poly);
							// create the new one
							poly = L.polygon([[changeset["minLat"], changeset["minLon"]],
									[changeset["minLat"], changeset["maxLon"]],
									[changeset["maxLat"], changeset["maxLon"]],
									[changeset["maxLat"], changeset["minLon"]]],{color:'red'});
							// add it on the map
							poly.addTo(smallMap);
							
							// margins around the bbox polygon
							var width = (changeset["maxLon"]-changeset["minLon"])/2;
							var height = (changeset["maxLat"]-changeset["minLat"])/2;
							var sw = new L.LatLng(changeset["minLat"]-height,changeset["minLon"]-width);
							var ne = new L.LatLng(changeset["maxLat"]+height, changeset["maxLon"]+width);
							// some margins around our bbox 
							if (width+height==0)
							{
								sw.lat += 0.01;
								ne.lat += 0.01;
								sw.lon -= 0.01;
								ne.lon += 0.01;
							}
							var bounds = new L.LatLngBounds(sw, ne);
							smallMap.fitBounds(bounds);

						}
						genMarkers.push([marker]);
					} else {
						genMarkers.push([]);
					}
	
					/* Add the changeset in the log */
					var html = "<td class='log_time'>" + time + "</td><td class='log_user'><a target='_blank' href='http://osm.org/user/"+u+"'>" + u + "</a></td>";
	/*                html += "<td class='log_cnode'>" + changeset["cnode"] +  "</td><td class='log_mnode'>" + changeset["mnode"] +  "</td><td class='dog_cnode'>" + changeset["dnode"] + "</td>";
					html += "<td class='log_cway'>" + changeset["cway"] +  "</td><td class='log_mway'>" + changeset["mway"] +  "</td><td class='log_dway'>" + changeset["dway"] + "</td>";
					html += "<td class='log_crel'>" + changeset["crel"] +  "</td><td class='log_mrel'>" + changeset["mrel"] +  "</td><td class='log_drel'>" + changeset["drel"] + "</td>";
					*/
					var total =
						parseInt( changeset["cnode"]) +  parseInt( changeset["mnode"])+ parseInt( changeset["dnode"]) +
						parseInt( changeset["cway"]) +  parseInt( changeset["mway"])+ parseInt( changeset["dway"]) +
						parseInt( changeset["crel"]) +  parseInt( changeset["mrel"])+ parseInt( changeset["drel"]);
					html += "<td class='log_edits'><a target='_blank' href='http://osm.org/browse/changeset/"+changeset["id"]+"'>" + total + "</a></td><td class='log_right'></td>";
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
					if (isTheSelectedOne) {
						//window.alert("selected");
						zhtml.addClass("detailed");
						detailChangeset(changeset["id"], changeset["user"], changeset["minLat"], changeset["minLon"], changeset["maxLat"],
							changeset["maxLon"],  changeset["cnode"],changeset["mnode"],  changeset["dnode"], changeset["cway"],
							changeset["mway"], changeset["dway"], changeset["crel"], changeset["mrel"] ,changeset["drel"]);
					}
					// zhtml.appendTo("#tailtable");
					zhtml.prependTo("#tailtable");
					var height = $("#tailscroll").get(0).scrollHeight;
					$("#tailscroll").animate({scrollTop: height}, 500);
				}

/*
*/
			// update global counters
			$("#count_edits").html("" + totalChanges);
			// $("#count_changesets").html("" + totalChangesets);
			$("#count_users").html("" + seenUsers.length);
			$("#count_minutes").html("" + (minutes.toFixed(0))+"'");


			markerGens.push(genMarkers);
			if (markers>100) {
					for (var i in markerGens[0]) {
						console.info("Removing 1 marker");
						for (var j in markerGens[0][i]) {
							map.removeLayer(markerGens[0][i][j]);
						}
					}
					markerGens.reverse();
					markerGens.pop();
					markerGens.reverse();
					markers=0;
				}
		} // for i
	} // if bestPoint == undefined
} // function addBestPoint


function makeIniData() {
    data = Array()
        now = new Date().getTime();
    for (var i = 0; i < chart_points; i++) {
        data.push(0);
    }
    data.reverse()
        return data;
}


function makeOldData(now) {
    data = Array()
        for (var i = 0; i < chart_points; i++) {
            var time = now - timeOffset * 1000 - i * scale * 100
                data.push([time, 0]);
        }
    data.reverse()
        return data;
}

$(document).ready(function() {
        Highcharts.setOptions({
global: {
useUTC: false
}
});

        downloadAndRefreshMap();
        var now = new Date().getTime();


chart_edits = new Highcharts.Chart({
chart: {
renderTo: 'graph_edits',
type: 'spline',
marginRight: 10,
animation : {
duration : 300, easing : 'linear'
},

events: {
load: function() {
// First thing very slow ...
                        setTimeout(addBestPoint, 2000);
}
}
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
text: ''
       }, min : 0,
plotLines: [{
value: 0,
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
name: 'Edits',
      data: (function() { return makeOldData(now);
              var data = [];
              /*                        time = (new Date()).getTime(),
                                        i;

                                        for (i = -19; i <= 0; i++) {
                                        data.push({
x: time + (i*10) * 1000,
y: 0
});
}*/
              return (data + '/s');
              })()
}]
});

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
    var control = new L.Control.Layers(  { "OpenMapQuest": omq, "Mapnik": mapnik } );
    map = new L.Map('map', {
        center: new L.LatLng(25, 0),
        zoom:3,
    });
    map.addLayer(omq);
    map.addControl(control)
}
{
    var mapnik = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 15,attribution: 'OpenStreetMap'
    });
    /*
    var omq = new L.TileLayer(
        'http://otile2.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {
        maxZoom: 14,
        attribution: 'OpenStreetMap - MapQuest',
        opacity: 0.4
    });
    */
    
    // setup the small alternating smallmaps
    smallMap1 = new L.Map('smallMap1', {
        center: new L.LatLng(0, 0),
        zoom:2,
        zoomControl: false,
        attributionControl: false,
    });
    smallMap1.addLayer(mapnik);

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
    smallMap = smallMap1;
}


/*
chart_details = new Highcharts.Chart({
chart: {
renderTo: 'graph_details',
type: 'bar',
},
title: { text: '' },
xAxis: { categories : ['Changes'] },
yAxis: {
      min : 0,
      title : ''
}, legend: {
    enabled: false,
    reversed : true
},

tooltip: {
    formater: function() { return ''+ this.series.name +': '+ this.y +''; }
},

            plotOptions: {
                series: {
                    stacking: 'normal'
                }
            },

series: [
{name: 'Created nodes', data :  []},
{name: 'Modified nodes', data :  []},
{name: 'Deleted nodes', data :  []},
{name: 'Created ways', data :  []},
{name: 'Modified ways', data :  []},
{name: 'Deleted ways', data :  []},
{name: 'Created rels', data :  []},
{name: 'Modified rels', data :  []},
{name: 'Deleted rels', data :  []},
]
});
*/


/*
   map = L.map('map');

   var mapnik = new L.TileLayer(
   'http://b.tile.openstreetmap.org/{z}/{x}/{y}.png', {
attribution: 'OpenStreetMap',
});
console.log("Adding ....");
mapnik.addTo(map);
 */
//    map.addLayer(mapnik);
});

