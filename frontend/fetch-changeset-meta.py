#! /usr/bin/env python
import sys, time, datetime, math, sqlite3, json, cgi, os, urllib2
from lxml import etree

print "Content-Type: application/json"
print ""


changesetId = int(os.environ["QUERY_STRING"].split('=')[1])

data = { "id": changesetId, "tags" : {}, "requested" : False }

db = sqlite3.connect("/home/zorglub/public_html/livechanges/backend/changesets.db")
db.row_factory = sqlite3.Row
c = db.cursor()

found = False
for row in c.execute("SELECT * from changeset_meta where changeset_id=?", (changesetId,)):
    found = True
if found:
    for row in c.execute("SELECT * from changeset_meta_tag where changeset_id=?", (changesetId,)):
        data["tags"][row["key"]] = row["value"];    
else:
    # Request the API, and save in DB
    xml = etree.parse("http://openstreetmap.org/api/0.6/changeset/%s?contact=clement.stenac@gmail.com&client=live.openstreetmap.fr" % changesetId)
    data["requested"] = True

    c.execute("INSERT INTO changeset_meta (changeset_id) VALUES(?)",(changesetId,));

    for tag in xml.xpath("changeset/tag"):
        data["tags"][tag.get("k")] = tag.get("v")
        c.execute("INSERT INTO changeset_meta_tag (changeset_id,key,value) VALUES(?,?,?)",(changesetId,tag.get("k"), tag.get("v")));

db.commit()
print json.dumps(data)


