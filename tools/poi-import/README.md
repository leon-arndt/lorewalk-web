# POI import

`build_places.py` builds `public/pois/sg-places.json`, the file that holds every imported place of the game. The 117 curated landmarks are not in the file. They stay in `src/data/singapore-pois.ts`.

## Run

1. Go to the repo root.
2. Run `python3 tools/poi-import/build_places.py`.
3. Read the table that the script prints. It shows how many places each source gave and how many the script kept.
4. Run `npm run test:e2e` before you commit the new file.

The script needs Python 3.9 or later and no package. It keeps each download in `tools/poi-import/cache/`, which git ignores. To download every source again, add `--refresh`.

The public servers limit requests. If a download fails, the script tries again. If it stops, run it again later: the files that it already has stay in the cache.

## Sources

| Source | What the script takes | License |
|---|---|---|
| data.gov.sg | NHB historic sites and national monuments, NParks heritage trees and parks, STB tourist attractions, URA conserved buildings, NLB libraries, PA community clubs, NEA hawker centres, URA subzone boundaries | Singapore Open Data Licence 1.0 |
| Wikidata | Each item in Singapore with coordinates and an English Wikipedia article | CC0 |
| OpenStreetMap, through the Overpass API | Historic sites, boards, artworks, museums, places of worship, parks, community places, food courts, bus stops, playgrounds, fitness corners | ODbL 1.0 |

The output mixes OpenStreetMap data with the other sources, so the ODbL applies to the output file. The file states this in its `license` field. The game shows the publisher of each place in the POI panel. A place with a Wikipedia article shows text that the game fetches from Wikipedia, with the CC BY-SA credit.

## What the script does

1. It reads the coordinates and the names of the curated landmarks. They take their ground first, so no imported place sits on a landmark.
2. It reads each source in the order of trust: NHB, Wikidata, STB, NParks heritage trees, OpenStreetMap, URA, NParks parks, NLB, PA.
3. It drops a place outside the subzone boundaries, because that place is not on land.
4. It drops a place within 40 m of a place it already has, and a place with the same name within 500 m. It also drops a place with the exact name of a landmark, at any distance.
5. It gives each place a tier (`marker` or `spot`), one of the 6 game categories, and its planning area.
6. It writes the food spots: the NEA hawker centres, and the OpenStreetMap food courts and markets that have a name.
7. It writes the anchors for the daily finds: bus stops, playgrounds, and fitness corners, at most one in each 120 m square.

## Output

The file holds one place on each line, so `git diff` shows what a new build changed.

- `places`: `id`, `name`, `lat`, `lon`, `tier`, `category`, `kind`, `src`, and where they exist `area`, `url`, and `desc`.
- `foodSpots`: `id`, `name`, `lat`, `lon`.
- `anchors`: a flat list of integer pairs. Each pair is `(lat - 1) x 100000` and `(lon - 103) x 100000`.

A place id comes from its source. The visit history of a player keys on the id, so do not change how the script makes an id.

## Limits

- The filters are heuristics. Read the output before a public launch.
- The STB list is from 2018, and some of its attractions are closed.
- A Wikidata item can be a place that no longer stands. The game keeps these on purpose: the site is still part of the history.
- The URA blocks share the name of their conservation area, so a dense area holds a few pins with one name.
- NHB publishes its heritage trails on roots.gov.sg, not on data.gov.sg. The script does not read them.
