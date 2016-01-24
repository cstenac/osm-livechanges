#! /usr/bin/env python
import sys, time, datetime, math, sqlite3, json, cgi, os, cgitb, urllib2

print "Content-Type: application/json"
print ""

cgitb.enable()
data = {}
ts = []

scale = int(os.environ["QUERY_STRING"].split('=')[1])
max_delay = 600

now = int(time.time())
now_aligned = now - now % scale
beg = (now - max_delay)

db = sqlite3.connect("/data/work/live/changesets.db")
db.row_factory = sqlite3.Row
c = db.cursor()

rows = []
max_valid_timestamp = 0
#print "Working from %s to %s" % (beg, now_aligned)
for row in c.execute("SELECT * from changeset where time > ? ORDER BY time", (beg,)):
    rows.append(row)
    max_valid_timestamp = row["time"]

data["debug"] = "I want data from %s to %s and my max is %s" % (now_aligned - max_delay, now_aligned, max_valid_timestamp)
#print "Studying %i rows " % len(rows)

def copy(row):
   x = {}
   for key in row.keys():
       x[key] = row[key]
   return x

# TODO: Really gruik
for time in xrange(now_aligned - max_delay, now_aligned, scale):
    e = {"time" : time, "nbChangesets" : 0, "totalActivity": 0,
    "cnode" : 0, "mnode" : 0, "dnode" : 0,
    "cway" : 0, "mway" : 0, "dway" : 0,
    "crel" : 0, "mrel" : 0, "drel" : 0, "changesets" : []}
#    print "look for data for %s" % time
    for row in rows:
        rowTime = int(row["time"])
#        print "  changeset is at %s" % rowTime
        if rowTime >= time and rowTime < time + scale:
            lat = row["minLat"]
            lon = row["minLon"]
            rowCopy = copy(row)
#            geoData = urllib2.urlopen("http://localhost:9999/reverse?lat=%s&lon=%s" % (lat, lon)).read()
#            print geoData
#            geocode = json.loads(geoData)

            rowCopy["countries"] = []
#            for match in geocode["matches"]:
#                rowCopy["countries"].append(match["payload"])
#                if len(match["payload"]) == 2:
#                    rowCopy["country"] = match["payload"]
 #           print "Found candidate changeset"
            # Keep this changeset for this time entry
            e["changesets"].append(rowCopy)
#{ "id" : row["id"], "user": row["user"],
#                        "minLon" : row["minLon"
            e["cnode"] += int(row["cnode"])
            e["mnode"] += int(row["mnode"])
            e["dnode"] += int(row["dnode"])
            e["cway"] += int(row["cway"])
            e["mway"] += int(row["mway"])
            e["dway"] += int(row["dway"])
            e["crel"] += int(row["crel"])
            e["mrel"] += int(row["mrel"])
            e["drel"] += int(row["drel"])
            e["nbChangesets"] += 1
    e["totalActivity"] += e["cnode"] + e["mnode"] + e["dnode"]
    e["totalActivity"] += e["cway"] + e["mway"] + e["dway"]
    e["totalActivity"] += e["crel"] + e["mrel"] + e["drel"]
    ts.append(e)
    if time > max_valid_timestamp:
        break

data["timeseries"] = ts
print json.dumps(data)


