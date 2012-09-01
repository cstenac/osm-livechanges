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
