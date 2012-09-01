osm-livechanges
===============

Near-real-time display of edits in the OpenStreetMap database

How does it work ?
------------------

osm-livechanges is mostly based on the [minutely diffs](http://planet.openstreetmap.org) produced by the master OSM database.

### Backend side

Diffs are pulled every minute, and information is aggregated from them, to gather, for each changeset:

* The list of created/modified/deleted nodes, ways, and relations
* The bounding box of the changeset
* The user and timestamp information

Information is saved to a SQLite database.


This is handled by the backend/compute-changeset-data.py script


### Frontend side

Each minute, data is fetched using frontend/get-last-data.py

This script aggregates the changesets using a configurable period (generally 10s). It computes aggregate statistics for the period, and the full list of changesets for each period.

Optionally, it can do reverse-geocoding lookup, to have the country for each changeset, by using cstenac/tiny-geocoder

The JS part buffers the data, and redisplays it at the same rate (so generally once every 10s), using a fixed delay of 140s between the current time and the displayed time (required to ensure that the pipeline never gets out of data).

A random changeset from the period is selected and zoomed. Its meta is optionnally fetched from the OSM API. It currently uses the http://api.openstreetmap.fr mirror to avoid load on the official osm.org API.

Authors
-------

Created by Christian Quest and Clément Stenac

License
-------

This project includes several third-party dependencies
 * jquery
 * jquery-dateformat plugin
 * jquery-lighboxme plugin
 * highcharts
 * leaflet
 * heatcanvas
 * The Phoca flags set (public domain)
 
The osm-livechanges code itself is available under the Apache License Version 2.0
Basically, you can use it, modify it and redistribute it for whatever purposes, provided that you 
do it using a compatible license.

Copyright 2012 OpenStreetMap France

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
