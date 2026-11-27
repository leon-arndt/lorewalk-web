#!/usr/bin/env python3
"""Builds public/pois/sg-places.json from open data.

Run from the repo root:  python3 tools/poi-import/build_places.py
Add --refresh to download every source again. See README.md in this directory.

Python standard library only. Downloads go to tools/poi-import/cache/, which
git ignores.
"""
import collections
import csv
import datetime
import html
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CACHE = os.path.join(HERE, "cache")
OUT = os.path.join(REPO, "public", "pois", "sg-places.json")
CURATED = os.path.join(REPO, "src", "data", "singapore-pois.ts")
UA = "lorewalk-poi-import/1.0"

DGS = {
    "historic_sites": "d_31e16b12809e66673e90d8b04fdee1b2",
    "monuments": "d_b29c230ec6b609e29ed42f71ca9a8767",
    "heritage_trees": "d_644ff187b6d14d6316f47284a4a6c81f",
    "tourist_attractions": "d_0f2f47515425404e6c9d2a040dd87354",
    "parks": "d_0542d48f0991541706b58059381a6eca",
    "hawker": "d_4a086da0a5553be1d89383cd90d07ecd",
    "libraries": "d_27b8dae65d9ca1539e14d09578b17cbf",
    "community_clubs": "d_f706de1427279e61fe41e89e24d440fa",
    "conserved": "d_f3f701b89243490455d511847f8c95fc",
    "subzones": "d_8594ae9ff96d0c708bc2af633048edfb",
}

AREA = 'area["ISO3166-1"="SG"][admin_level=2]->.sg;'
OVERPASS = {
    "pois": "[out:json][timeout:120];" + AREA + "("
            'nwr["historic"](area.sg);nwr["heritage"](area.sg);'
            'nwr["tourism"~"^(attraction|museum|artwork|viewpoint|gallery)$"](area.sg);'
            'nwr["tourism"="information"]["information"="board"](area.sg);'
            'nwr["amenity"="place_of_worship"](area.sg);'
            'nwr["leisure"~"^(park|nature_reserve|garden)$"]["name"](area.sg);'
            'nwr["amenity"~"^(library|community_centre|theatre|arts_centre|marketplace|food_court)$"](area.sg);'
            'node["leisure"~"^(playground|fitness_station)$"](area.sg);'
            'way["leisure"~"^(playground|fitness_station)$"](area.sg);'
            ");out tags center;",
    "busstops": "[out:json][timeout:120];" + AREA + 'node["highway"="bus_stop"](area.sg);out skel;',
}

WIKIDATA = (
    "SELECT ?i ?iLabel ?d ?lat ?lon ?tLabel ?art WHERE { ?i wdt:P17 wd:Q334; p:P625/psv:P625 ?n. "
    "?n wikibase:geoLatitude ?lat; wikibase:geoLongitude ?lon. OPTIONAL { ?i wdt:P31 ?t. } "
    'OPTIONAL { ?i schema:description ?d. FILTER(LANG(?d) = "en") } '
    "?art schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>. "
    'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }'
)

SOURCES = {
    "nhb": "National Heritage Board",
    "nparks": "National Parks Board",
    "stb": "Singapore Tourism Board",
    "ura": "Urban Redevelopment Authority",
    "nlb": "National Library Board",
    "pa": "People's Association",
    "nea": "National Environment Agency",
    "wd": "Wikidata",
    "osm": "OpenStreetMap contributors",
}

MERGE_M = 40          # two places closer than this are one place
SAME_NAME_M = 500     # two places with one name closer than this are one place
CONSERVED_CELL_M = 300
ANCHOR_CELL_M = 120
DESC_MAX = 180


# ── download ────────────────────────────────────────────────────────────────

def http(url, data=None, headers=None, timeout=180):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(headers or {})})
    return urllib.request.urlopen(req, timeout=timeout).read()


def cached(rel, fetch, refresh):
    path = os.path.join(CACHE, rel)
    if refresh or not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print("download", rel, flush=True)
        blob = fetch()
        with open(path, "wb") as f:
            f.write(blob)
    return path


def fetch_dgs(dataset_id):
    poll = f"https://api-open.data.gov.sg/v1/public/api/datasets/{dataset_id}/poll-download"
    for _ in range(10):
        try:
            url = json.loads(http(poll, timeout=30)).get("data", {}).get("url")
            if url:
                return http(url)
        except Exception as err:  # the API answers 429 when it is busy
            print("  retry:", err, flush=True)
        time.sleep(4)
    raise SystemExit(f"data.gov.sg gave no download for {dataset_id}")


OVERPASS_HOSTS = ("https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter")


def fetch_overpass(query):
    body = urllib.parse.urlencode({"data": query}).encode()
    # The public servers answer 429, 502, or 504 when they are busy.
    for attempt in range(6):
        try:
            return http(OVERPASS_HOSTS[attempt % len(OVERPASS_HOSTS)], data=body)
        except Exception as err:
            print("  retry:", err, flush=True)
            time.sleep(10)
    raise SystemExit("Overpass gave no answer. Run the script again later.")


def fetch_wikidata():
    url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": WIKIDATA})
    # The query service can limit a client to one request in a minute.
    for _ in range(4):
        try:
            return http(url, headers={"Accept": "text/csv"})
        except Exception as err:
            print("  retry in 65 s:", err, flush=True)
            time.sleep(65)
    raise SystemExit("Wikidata gave no answer. Run the script again later.")


# ── geometry ────────────────────────────────────────────────────────────────

MX = 111320 * math.cos(math.radians(1.35))
MY = 110574


def xy(lat, lon):
    return lon * MX, lat * MY


class Grid:
    def __init__(self, cell):
        self.cell = cell
        self.cells = collections.defaultdict(list)

    def add(self, lat, lon, item=None):
        x, y = xy(lat, lon)
        self.cells[(int(x // self.cell), int(y // self.cell))].append((x, y, item))

    def near(self, lat, lon, radius):
        x, y = xy(lat, lon)
        k = int(math.ceil(radius / self.cell))
        cx, cy = int(x // self.cell), int(y // self.cell)
        for i in range(cx - k, cx + k + 1):
            for j in range(cy - k, cy + k + 1):
                for qx, qy, item in self.cells.get((i, j), ()):
                    if (qx - x) ** 2 + (qy - y) ** 2 <= radius * radius:
                        yield item


def centroid(geom):
    kind, coords = geom["type"], geom["coordinates"]
    if kind == "Point":
        return coords[1], coords[0]
    ring = coords[0] if kind == "Polygon" else max((p[0] for p in coords), key=len)
    return sum(v[1] for v in ring) / len(ring), sum(v[0] for v in ring) / len(ring)


class Areas:
    """Planning area lookup. A point outside every subzone is not on land."""

    def __init__(self, features):
        self.polys = []
        for f in features:
            g = f["geometry"]
            parts = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
            for part in parts:
                ring = [(v[0], v[1]) for v in part[0]]
                xs, ys = [v[0] for v in ring], [v[1] for v in ring]
                self.polys.append((min(xs), max(xs), min(ys), max(ys), ring, f["properties"]["PLN_AREA_N"]))

    def find(self, lat, lon):
        for x0, x1, y0, y1, ring, name in self.polys:
            if lon < x0 or lon > x1 or lat < y0 or lat > y1:
                continue
            inside, j = False, len(ring) - 1
            for i in range(len(ring)):
                xi, yi = ring[i]
                xj, yj = ring[j]
                if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
                    inside = not inside
                j = i
            if inside:
                return name
        return None


# ── text ────────────────────────────────────────────────────────────────────

SMALL = {"of", "the", "and", "at", "in", "on", "by", "for", "to", "de", "bin", "a"}
KEEP_UPPER = {"HDB", "MRT", "LRT", "CC", "NUS", "NTU", "SMU", "CBD", "II", "III", "IV", "YMCA", "YWCA", "CHIJ", "SAFRA"}


def title(s):
    out = []
    for i, w in enumerate(s.split()):
        bare = re.sub(r"[^A-Za-z]", "", w)
        if bare.upper() in KEEP_UPPER:
            out.append(w.upper())
        elif i and w.lower() in SMALL:
            out.append(w.lower())
        else:
            out.append(re.sub(r"[A-Za-z]+", lambda m: m.group(0)[0].upper() + m.group(0)[1:].lower(), w))
    return " ".join(out)


def fix_mojibake(s):
    try:
        return s.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def clean(s):
    if not s:
        return ""
    s = html.unescape(re.sub(r"<[^>]+>", " ", fix_mojibake(str(s))))
    # The app bans em dashes in UI text.
    s = s.replace("—", " - ").replace("–", "-")
    return re.sub(r"\s+", " ", s).strip()


def shorten(s, limit=DESC_MAX):
    s = clean(s)
    if len(s) <= limit:
        return s
    cut = s[:limit]
    stop = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    if stop > limit * 0.4:
        return cut[:stop + 1]
    return cut[:cut.rfind(" ")].rstrip(",;:") + "..."


def norm_name(s):
    s = re.sub(r"\(.*?\)", " ", s.lower())
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return re.sub(r"^the | singapore$", "", s)


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def kml_fields(description):
    return {k: html.unescape(v).strip() for k, v in re.findall(r"<th>(\w+)</th>\s*<td>(.*?)</td>", description or "")}


# ── sources ─────────────────────────────────────────────────────────────────

def load_geojson(path):
    with open(path, encoding="utf-8") as f:
        return [x for x in json.load(f)["features"] if x.get("geometry")]


def place(pid, name, lat, lon, tier, category, kind, src, url="", desc=""):
    return {"id": pid, "name": clean(name).rstrip(" ,;:-"), "lat": lat, "lon": lon, "tier": tier, "category": category,
            "kind": kind, "src": src, "url": url or "", "desc": shorten(desc)}


def nhb_places(paths):
    out = []
    for key, kind, prefix in (("monuments", "monument", "nhb-nm"), ("historic_sites", "historic_site", "nhb-hs")):
        for f in load_geojson(paths[key]):
            p = f["properties"]
            lat, lon = centroid(f["geometry"])
            link = (p.get("HYPERLINK") or "").strip()
            tail = slug(link.rstrip("/").rsplit("/", 1)[-1]) or slug(p["NAME"])
            out.append(place(f"{prefix}-{tail}", p["NAME"], lat, lon, "marker", "heritage", kind, "nhb", link,
                             p.get("DESCRIPTION") or p.get("ADDRESSBUILDINGNAME") or ""))
    return out


WD_SKIP = re.compile(
    r"hotel|restaurant|ward of|constituency|district|planning area|administrative|town$|neighborhood|settlement|"
    r"reef|shoal|channel|strait|hostel|\bbar\b|business|office|organization|agency|facility|school|college|universit|"
    r"hospital|sporting event|language|research|geographical feature|island|shopping|station|depot|road|street|"
    r"company|embassy|battle|election|airline|port$|interchange|expressway|condominium|housing estate|subzone|"
    r"event|disaster|accident|incident|attack|riot|crash|festival|bank$|brand|newspaper|team|club$|"
    r"transport|system|network|line$|route|collision|derail|murder|protest|bombing|massacre|\bwar\b|"
    r"amusement|theme park|mall|plaza$", re.I)
WD_CATEGORY = (
    ("religious", re.compile(r"mosque|church|temple|cathedral|synagogue|shrine|gurdwara|chapel|monastery|religious", re.I)),
    ("museum", re.compile(r"museum", re.I)),
    ("arts", re.compile(r"theat|cinema|movie|gallery|\bart|library|concert|sculpture|statue|performing", re.I)),
    ("nature", re.compile(r"\bpark\b|garden|reservoir|\bhill\b|river|forest|nature|beach|wetland|\blake\b|canal|\btree|\bzoo\b|quarry", re.I)),
    ("heritage", re.compile(r"monument|memorial|fort|histor|bungalow|battery|cemetery|bridge|lighthouse|palace|"
                            r"heritage|shophouse|house|ruins|bunker|tomb|prison|barracks|market|hawker", re.I)),
)


def wikidata_places(path):
    items = {}
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            it = items.setdefault(r["i"], {"types": set(), **r})
            if r["tLabel"]:
                it["types"].add(r["tLabel"])
    out = []
    for uri, it in sorted(items.items()):
        qid = uri.rsplit("/", 1)[-1]
        # A label that starts in lower case is a topic, not a place.
        if it["iLabel"] == qid or it["iLabel"][:1].islower() or any(WD_SKIP.search(t) for t in it["types"]):
            continue
        text = " ".join(sorted(it["types"])) + " " + it["iLabel"]
        category = next((c for c, rx in WD_CATEGORY if rx.search(text)), "landmark")
        d = it.get("d") or ""
        desc = d[:1].upper() + d[1:]
        out.append(place(f"wd-{qid}", it["iLabel"], float(it["lat"]), float(it["lon"]), "marker", category, "wiki",
                         "wd", urllib.parse.unquote(it["art"]).replace(" ", "_"), desc))
    return out


STB_CATEGORY = (("places-of-worship", "religious"), ("museum", "museum"), ("nature", "nature"),
                ("culture-heritage", "heritage"), ("arts", "arts"))


def stb_places(path):
    out = []
    for f in load_geojson(path):
        p = f["properties"]
        name = re.sub(r"\s+(in\s+)?Singapore$", "", clean(p.get("PAGETITLE")))
        if not name:
            continue
        lat, lon = centroid(f["geometry"])
        url_path = p.get("URL_PATH") or ""
        category = next((c for key, c in STB_CATEGORY if key in url_path), "landmark")
        out.append(place(f"stb-{slug(name)}", name, lat, lon, "marker", category, "attraction", "stb", "",
                         p.get("META_DESCRIPTION") or p.get("OVERVIEW") or ""))
    return out


def tree_places(path):
    out = []
    for f in load_geojson(path):
        p = f["properties"]
        text = clean(p.get("DESCRIPTION"))
        m = re.match(r"Common Name\s*:\s*([^.]+)\.?\s*(.*)", text)
        common = title(m.group(1).strip()) if m else ""
        where = m.group(2).strip() if m else text
        name = f"Heritage Tree: {common}" if common else f"Heritage Tree: {clean(p['NAME'])}"
        desc = f"{clean(p['NAME']).rstrip('.')}. {where}" if common else where
        lat, lon = centroid(f["geometry"])
        out.append(place(slug(p.get("HT") or f"ht-{p['OBJECTID']}"), name, lat, lon, "marker", "nature",
                         "heritage_tree", "nparks", p.get("HYPERLINK"), desc))
    return out


def conserved_places(path):
    cells = collections.defaultdict(list)
    for f in load_geojson(path):
        lat, lon = centroid(f["geometry"])
        x, y = xy(lat, lon)
        cells[(int(x // CONSERVED_CELL_M), int(y // CONSERVED_CELL_M))].append((lat, lon, f["properties"]["NAME"]))
    out = []
    for (cx, cy), members in sorted(cells.items()):
        named = collections.Counter(m[2] for m in members if m[2]).most_common(1)
        if not named:
            continue
        area = named[0][0]
        lat = sum(m[0] for m in members) / len(members)
        lon = sum(m[1] for m in members) / len(members)
        # Put the pin on a real building, not on the mean of a block.
        lat, lon, _ = min(members, key=lambda m: (m[0] - lat) ** 2 + (m[1] - lon) ** 2)
        out.append(place(f"ura-{cx}-{cy}", f"{title(area)} Conservation Area", lat, lon, "marker", "heritage",
                         "conserved", "ura", "", "One conserved building stands on this block." if len(members) == 1
                         else f"{len(members)} conserved buildings stand on this block."))
    return out


PARK_SUFFIX = {"PK": "Park", "PG": "Playground"}


def nparks_places(path):
    out = []
    for f in load_geojson(path):
        raw = f["properties"]["NAME"]
        words = raw.split()
        if not words or "CAR PARK" in raw or re.search(r"\(FCP\)|AREA [A-Z]\d?$", raw):
            continue
        if words[-1] not in ("PK", "PARK", "GARDEN", "GARDENS", "GREEN", "RESERVE", "PROMENADE"):
            continue
        words[-1] = PARK_SUFFIX.get(words[-1], words[-1])
        name = title(" ".join(words)).replace("Jln ", "Jalan ").replace("Lor ", "Lorong ")
        lat, lon = centroid(f["geometry"])
        out.append(place(f"np-{slug(raw)}", name, lat, lon, "spot", "nature", "park", "nparks"))
    return out


def kml_places(path, prefix, src, category):
    out = []
    for f in load_geojson(path):
        p = kml_fields(f["properties"].get("Description"))
        if not p.get("NAME"):
            continue
        lat, lon = centroid(f["geometry"])
        name = re.sub(r"\bCC$", "Community Club", p["NAME"])
        out.append(place(f"{prefix}-{slug(p['NAME'])}", name, lat, lon, "spot", category, "community", src,
                         p.get("HYPERLINK", "")))
    return out


def osm_point(e):
    c = e if "lat" in e else e.get("center")
    return (c["lat"], c["lon"]) if c else None


def osm_wiki_url(tags):
    wp = tags.get("wikipedia", "")
    if wp.startswith("en:"):
        return "https://en.wikipedia.org/wiki/" + wp[3:].replace(" ", "_")
    return ""


def osm_classify(t):
    """Returns (tier, category, kind) or None. The first rule that fits wins."""
    notable = "wikidata" in t or "wikipedia" in t
    if "historic" in t or "heritage" in t:
        if t.get("amenity") == "place_of_worship":
            return "marker", "religious", "worship"
        return "marker", "heritage", "memorial" if t.get("historic") == "memorial" else "historic"
    if t.get("tourism") == "museum":
        return "marker", "museum", "museum"
    if t.get("tourism") == "gallery":
        return "marker", "arts", "museum"
    if t.get("information") == "board":
        board = t.get("board_type", "")
        if board == "history":
            return "marker", "heritage", "board"
        if board in ("nature", "plants", "wildlife", "nature;wildlife"):
            return "marker", "nature", "board"
        return None
    if t.get("tourism") == "artwork":
        return "marker", "arts", "artwork"
    if t.get("amenity") == "place_of_worship":
        return ("marker" if notable else "spot"), "religious", "worship"
    if t.get("tourism") == "attraction":
        # Without a wiki link this tag is mostly zoo exhibits and photo spots.
        return ("marker", "landmark", "attraction") if notable and "zoo" not in t and "attraction" not in t else None
    if t.get("leisure") in ("park", "garden", "nature_reserve") or t.get("tourism") == "viewpoint":
        return "spot", "nature", "park"
    if t.get("amenity") in ("theatre", "arts_centre", "library"):
        return "spot", "arts", "community"
    if t.get("amenity") == "community_centre":
        return "spot", "landmark", "community"
    return None


GENERIC_NAMES = {"library", "community centre", "community center", "playground", "garden", "temple", "church",
                 "mosque", "memorial", "viewpoint", "pavilion", "information board", "neighbourhood park",
                 "neighborhood park", "community garden", "roof garden", "sky garden"}


def osm_places(elements):
    out = []
    for e in elements:
        t = e.get("tags", {})
        name = clean(t.get("name:en") or t.get("name"))
        pt = osm_point(e)
        if not pt or len(name) < 3 or name.isdigit():
            continue
        hit = osm_classify(t)
        if not hit:
            continue
        tier, category, kind = hit
        # A short title is normal for an artwork. Elsewhere it is a stub such as "Site".
        if kind != "artwork" and (len(name) < 6 or name.lower() in GENERIC_NAMES):
            continue
        desc = t.get("description:en") or t.get("description") or t.get("inscription") or ""
        out.append(place(f"osm-{e['type'][0]}{e['id']}", name, pt[0], pt[1], tier, category, kind, "osm",
                         osm_wiki_url(t), desc))
    # Notable places first, so the merge keeps them over an unnamed neighbour.
    order = {"marker": 0, "spot": 1}
    return sorted(out, key=lambda p: (order[p["tier"]], p["id"]))


def food_spots(hawker_path, elements):
    out = []
    for f in load_geojson(hawker_path):
        p = f["properties"]
        if p.get("STATUS") and "Existing" not in p["STATUS"]:
            continue
        lat, lon = centroid(f["geometry"])
        out.append({"id": f"nea-{slug(p['NAME'])}", "name": clean(p["NAME"]), "lat": lat, "lon": lon})
    for e in elements:
        t = e.get("tags", {})
        name = clean(t.get("name:en") or t.get("name"))
        pt = osm_point(e)
        if pt and len(name) >= 3 and t.get("amenity") in ("food_court", "marketplace"):
            out.append({"id": f"osm-{e['type'][0]}{e['id']}", "name": name, "lat": pt[0], "lon": pt[1]})
    return out


def curated_landmarks():
    with open(CURATED, encoding="utf-8") as f:
        src = f.read()
    rows = re.findall(r"name: '((?:[^'\\]|\\.)*)'.*?lat: ([\d.]+), lon: ([\d.]+)", src)
    return [(n.replace("\\'", "'"), float(la), float(lo)) for n, la, lo in rows]


# ── build ───────────────────────────────────────────────────────────────────

def main():
    refresh = "--refresh" in sys.argv
    paths = {k: cached(f"dgs/{k}.geojson", lambda v=v: fetch_dgs(v), refresh) for k, v in DGS.items()}
    osm_paths = {k: cached(f"osm/{k}.json", lambda q=q: fetch_overpass(q), refresh) for k, q in OVERPASS.items()}
    wd_path = cached("wikidata/places.csv", fetch_wikidata, refresh)

    with open(osm_paths["pois"], encoding="utf-8") as f:
        osm = json.load(f)["elements"]
    with open(osm_paths["busstops"], encoding="utf-8") as f:
        bus = json.load(f)["elements"]
    areas = Areas(load_geojson(paths["subzones"]))

    # Earlier sources win a merge. The curated landmarks are not in the output:
    # they only take their ground, so no import sits on top of one.
    batches = [
        ("NHB monuments and historic sites", nhb_places(paths)),
        ("Wikipedia articles (Wikidata)", wikidata_places(wd_path)),
        ("STB tourist attractions", stb_places(paths["tourist_attractions"])),
        ("NParks heritage trees", tree_places(paths["heritage_trees"])),
        ("OpenStreetMap", osm_places(osm)),
        ("URA conserved buildings", conserved_places(paths["conserved"])),
        ("NParks parks", nparks_places(paths["parks"])),
        ("NLB libraries", kml_places(paths["libraries"], "nlb", "nlb", "arts")),
        ("PA community clubs", kml_places(paths["community_clubs"], "pa", "pa", "landmark")),
    ]

    taken = Grid(SAME_NAME_M)
    for name, lat, lon in curated_landmarks():
        taken.add(lat, lon, norm_name(name))

    places, seen_ids = [], set()
    print(f"{'source':38} {'raw':>6} {'kept':>6}")
    for label, batch in batches:
        kept = 0
        for p in batch:
            if not p["name"] or p["id"] in seen_ids:
                continue
            area = areas.find(p["lat"], p["lon"])
            if not area:
                continue
            key = norm_name(p["name"])
            if any(True for _ in taken.near(p["lat"], p["lon"], MERGE_M)):
                continue
            if key and any(other == key for other in taken.near(p["lat"], p["lon"], SAME_NAME_M)):
                continue
            taken.add(p["lat"], p["lon"], key)
            seen_ids.add(p["id"])
            p["area"] = title(area)
            places.append(p)
            kept += 1
        print(f"{label:38} {len(batch):6} {kept:6}")

    spots, spot_grid = [], Grid(100)
    for s in food_spots(paths["hawker"], osm):
        if areas.find(s["lat"], s["lon"]) and not any(True for _ in spot_grid.near(s["lat"], s["lon"], 60)):
            spot_grid.add(s["lat"], s["lon"])
            spots.append(s)

    # Public spots where a daily find can lie: bus stops, playgrounds, fitness corners.
    anchor_cells = {}
    points = [(e["lat"], e["lon"]) for e in bus]
    points += [osm_point(e) for e in osm if e.get("tags", {}).get("leisure") in ("playground", "fitness_station")]
    for pt in sorted(p for p in points if p):
        x, y = xy(*pt)
        cell = (int(x // ANCHOR_CELL_M), int(y // ANCHOR_CELL_M))
        if cell not in anchor_cells and areas.find(*pt):
            anchor_cells[cell] = pt
    anchors = []
    for lat, lon in sorted(anchor_cells.values()):
        anchors += [round((lat - 1) * 1e5), round((lon - 103) * 1e5)]

    places.sort(key=lambda p: p["id"])
    spots.sort(key=lambda s: s["id"])

    def row(p, keys):
        d = {k: (round(p[k], 5) if k in ("lat", "lon") else p[k]) for k in keys if p.get(k) not in ("", None)}
        return json.dumps(d, ensure_ascii=False, separators=(",", ":"))

    place_keys = ("id", "name", "lat", "lon", "tier", "category", "kind", "src", "area", "url", "desc")
    head = {
        "version": 1,
        "generated": datetime.date.today().isoformat(),
        "license": "Contains information from data.gov.sg under the Singapore Open Data Licence 1.0, Wikidata "
                   "(CC0), and OpenStreetMap (ODbL 1.0, (c) OpenStreetMap contributors). This file is open "
                   "under the ODbL 1.0.",
        "sources": SOURCES,
    }
    # One place per line, so a diff of two builds reads well.
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps(head, ensure_ascii=False, indent=1)[:-2] + ",\n")
        f.write(' "places": [\n' + ",\n".join("  " + row(p, place_keys) for p in places) + "\n ],\n")
        f.write(' "foodSpots": [\n' + ",\n".join("  " + row(s, ("id", "name", "lat", "lon")) for s in spots) + "\n ],\n")
        f.write(' "anchors": ' + json.dumps(anchors, separators=(",", ":")) + "\n}\n")

    tiers = collections.Counter(p["tier"] for p in places)
    print(f"\n{len(places)} places ({tiers['marker']} markers, {tiers['spot']} spots), "
          f"{len(spots)} food spots, {len(anchors) // 2} find anchors")
    print(f"wrote {os.path.relpath(OUT, REPO)} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
