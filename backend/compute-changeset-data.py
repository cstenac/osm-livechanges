from lxml import etree
import sys, time, datetime, math, sqlite3, iso8601

root = etree.parse(sys.stdin)

changesetData = {}
db = sqlite3.connect("changesets.db")
db.row_factory = sqlite3.Row

def getChangeset(id):
    if changesetData.has_key(id):
        return changesetData[id]
    x = {
      "minLon" : -180.0, "maxLon": 180.0, "minLat": -90.0, "maxLat" : 90.0,
      "cnode" : 0, "mnode" : 0, "dnode": 0,
      "cway" : 0, "mway" : 0, "dway" : 0,
      "crel": 0, "mrel": 0, "drel": 0,
      "updated" : 0, 
      "tags" : {}
      }
    # Load changeset from DB if already exists
    c = db.cursor()
    for row in c.execute("SELECT * from changeset WHERE id=?", (id,)):
        print "Reloading changeset %s" % id
        x["updated"] = row["updated"] + 1
        x["minLon"] = row["minLon"]
        x["minLat"] = row["minLat"]
        x["maxLon"] = row["maxLon"]
        x["maxLat"] = row["maxLat"]
        x["cnode"] = row["cnode"]
        x["mnode"] = row["mnode"]
        x["dnode"] = row["dnode"]
        x["cway"] = row["cway"]
        x["mway"] = row["mway"]
        x["dway"] = row["dway"]
        x["crel"] = row["crel"]
        x["mrel"] = row["mrel"]
        x["drel"] = row["drel"]
    changesetData[id] = x
    return x

#    <node id="69373482" version="2" timestamp="2012-08-25T21:54:54Z" uid="81285" user="Ahlzen" changeset="12860710" lat="41.452251" lon="-70.603805"/>

def recordTags(data, node):
  for child in node:
     if child.tag == "tag":
          data["tags"][child.get("k")]= child.get("v")


def getAndUpdate(node):
    cid = node.get("changeset")
    change = getChangeset(cid)
    change["id"] = cid
    change["user"] = node.get("user")
    change["uid"] = node.get("uid")
#    change["time"] = time.mktime(isodate.parse_datetime(node.get("timestamp")).timetuple())
#    change["time"] = time.mktime(datetime.datetime.strptime(node.get("timestamp"), "%Y-%m-%dT%H:%M:%S%Z").timetuple())
    change["time"] = time.mktime(iso8601.parse_date(node.get("timestamp")).timetuple()) + 3600 # SOMETHING IS FUCKING WRONG !
    return change
 
for cnode in root.xpath("create/node"):
    change = getAndUpdate(cnode)
    change["minLon"] = max(change["minLon"], float(cnode.get("lon")))
    change["minLat"] = max(change["minLat"], float(cnode.get("lat")))
    change["maxLon"] = min(change["maxLon"], float(cnode.get("lon")))
    change["maxLat"] = min(change["maxLat"], float(cnode.get("lat")))
    change["cnode"] += 1
    recordTags(change, cnode)
for cnode in root.xpath("modify/node"):
    change = getAndUpdate(cnode)
    change["minLon"] = max(change["minLon"], float(cnode.get("lon")))
    change["minLat"] = max(change["minLat"], float(cnode.get("lat")))
    change["maxLon"] = min(change["maxLon"], float(cnode.get("lon")))
    change["maxLat"] = min(change["maxLat"], float(cnode.get("lat")))
    change["mnode"] += 1
    recordTags(change, cnode)
for cnode in root.xpath("delete/node"):
    change = getAndUpdate(cnode)
    change["minLon"] = max(change["minLon"], float(cnode.get("lon")))
    change["minLat"] = max(change["minLat"], float(cnode.get("lat")))
    change["maxLon"] = min(change["maxLon"], float(cnode.get("lon")))
    change["maxLat"] = min(change["maxLat"], float(cnode.get("lat")))
    change["dnode"] += 1

for cnode in root.xpath("create/way"):
    change = getAndUpdate(cnode)
    change["cway"] += 1
    recordTags(change, cnode)
for cnode in root.xpath("modify/way"):
    change = getAndUpdate(cnode)
    change["mway"] += 1
    recordTags(change, cnode)
for cnode in root.xpath("delete/way"):
    change = getAndUpdate(cnode)
    change["dway"] += 1
for cnode in root.xpath("create/relation"):
    change = getAndUpdate(cnode)
    change["crel"] += 1
    recordTags(change, cnode)
for cnode in root.xpath("modify/relation"):
    change = getAndUpdate(cnode)
    change["mrel"] += 1
    recordTags(change, cnode)
for cnode in root.xpath("delete/relation"):
    change = getAndUpdate(cnode)
    change["drel"] += 1
 
tuples = []
tag_tuples = []
c = db.cursor()
for id in changesetData.keys():
    d = changesetData[id]
    tuples.append(
            (d["id"], d["user"], d["uid"], d["time"],
            d["minLon"], d["minLat"], d["maxLon"], d["maxLat"],
            d["cnode"], d["mnode"], d["dnode"],
            d["cway"], d["mway"], d["dway"],
            d["crel"], d["mrel"], d["drel"], d["updated"]))
    print "%s [%s] -> %s" % (id, changesetData[id]["time"], changesetData[id])
    for tagKey,tagVal in changesetData[id]["tags"].items():
        tag_tuples.append((d["id"], tagKey, tagVal));
    # Remove prev data
    c.execute("DELETE FROM changeset where id=?", (id,))
    c.execute("DELETE FROM changeset_content_tag where changeset_id=?", (id,));

db.commit()
c = db.cursor()
c.executemany("INSERT INTO changeset (id, user, uid, time, minLon, minLat, maxLon, maxLat, cnode, mnode, dnode, cway, mway, dway, crel, mrel, drel, updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", tuples)
c.executemany("INSERT INTO changeset_content_tag VALUES (?,?,?)", tag_tuples)
db.commit()
#doc = ElementTree(file='915.osc')
#
#for e in 
