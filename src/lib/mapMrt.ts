import maplibregl from 'maplibre-gl'

// Singapore MRT lines rendered as MapLibre GeoJSON layers.
// Coordinates are from OSM / LTA public data; accuracy ~50–100 m.

type Coord = [number, number]  // [lon, lat] — MapLibre convention

interface Station {
  name: string
  coord: Coord
}

interface MrtLine {
  id: string
  color: string
  stations: Station[]
  branches?: Station[][]  // extra branches sharing a junction station
}

function s(name: string, lat: number, lon: number): Station {
  return { name, coord: [lon, lat] }
}

const LINES: MrtLine[] = [
  // ── North South Line (Red) ────────────────────────────────────────────────
  {
    id: 'nsl', color: '#e2231a',
    stations: [
      s('Jurong East',       1.3330, 103.7424),
      s('Bukit Batok',       1.3491, 103.7495),
      s('Bukit Gombak',      1.3587, 103.7516),
      s('Choa Chu Kang',     1.3854, 103.7444),
      s('Yew Tee',           1.3974, 103.7472),
      s('Kranji',            1.4253, 103.7621),
      s('Marsiling',         1.4326, 103.7744),
      s('Woodlands',         1.4370, 103.7866),
      s('Admiralty',         1.4407, 103.8008),
      s('Sembawang',         1.4491, 103.8200),
      s('Canberra',          1.4431, 103.8299),
      s('Yishun',            1.4294, 103.8353),
      s('Khatib',            1.4176, 103.8332),
      s('Yio Chu Kang',      1.3817, 103.8450),
      s('Ang Mo Kio',        1.3700, 103.8494),
      s('Bishan',            1.3509, 103.8480),
      s('Braddell',          1.3400, 103.8470),
      s('Toa Payoh',         1.3328, 103.8474),
      s('Novena',            1.3203, 103.8439),
      s('Newton',            1.3122, 103.8384),
      s('Orchard',           1.3042, 103.8319),
      s('Somerset',          1.3006, 103.8386),
      s('Dhoby Ghaut',       1.2991, 103.8457),
      s('City Hall',         1.2931, 103.8521),
      s('Raffles Place',     1.2836, 103.8513),
      s('Marina Bay',        1.2770, 103.8645),
      s('Marina South Pier', 1.2703, 103.8630),
    ],
  },

  // ── East West Line (Green) ────────────────────────────────────────────────
  {
    id: 'ewl', color: '#009645',
    stations: [
      s('Joo Koon',       1.3283, 103.6782),
      s('Pioneer',        1.3369, 103.6972),
      s('Boon Lay',       1.3389, 103.7060),
      s('Lakeside',       1.3444, 103.7212),
      s('Chinese Garden', 1.3421, 103.7320),
      s('Jurong East',    1.3330, 103.7424),
      s('Clementi',       1.3152, 103.7654),
      s('Dover',          1.3113, 103.7785),
      s('Buona Vista',    1.3072, 103.7904),
      s('Commonwealth',   1.3026, 103.7983),
      s('Queenstown',     1.2944, 103.8060),
      s('Redhill',        1.2898, 103.8165),
      s('Tiong Bahru',    1.2865, 103.8271),
      s('Outram Park',    1.2802, 103.8394),
      s('Tanjong Pagar',  1.2764, 103.8456),
      s('Raffles Place',  1.2836, 103.8513),
      s('City Hall',      1.2931, 103.8521),
      s('Bugis',          1.3004, 103.8564),
      s('Lavender',       1.3074, 103.8634),
      s('Kallang',        1.3114, 103.8718),
      s('Aljunied',       1.3163, 103.8830),
      s('Paya Lebar',     1.3177, 103.8923),
      s('Eunos',          1.3198, 103.9038),
      s('Kembangan',      1.3210, 103.9130),
      s('Bedok',          1.3240, 103.9300),
      s('Tanah Merah',    1.3273, 103.9460),
      s('Simei',          1.3430, 103.9530),
      s('Tampines',       1.3541, 103.9453),
      s('Pasir Ris',      1.3732, 103.9494),
    ],
    branches: [[
      s('Tanah Merah',    1.3273, 103.9460),
      s('Expo',           1.3353, 103.9613),
      s('Changi Airport', 1.3573, 103.9890),
    ]],
  },

  // ── North East Line (Purple) ──────────────────────────────────────────────
  {
    id: 'nel', color: '#9900aa',
    stations: [
      s('HarbourFront',  1.2653, 103.8220),
      s('Outram Park',   1.2802, 103.8394),
      s('Chinatown',     1.2846, 103.8444),
      s('Clarke Quay',   1.2882, 103.8463),
      s('Dhoby Ghaut',   1.2991, 103.8457),
      s('Little India',  1.3066, 103.8519),
      s('Farrer Park',   1.3127, 103.8541),
      s('Boon Keng',     1.3196, 103.8612),
      s('Potong Pasir',  1.3314, 103.8692),
      s('Woodleigh',     1.3394, 103.8709),
      s('Serangoon',     1.3497, 103.8732),
      s('Kovan',         1.3597, 103.8853),
      s('Hougang',       1.3714, 103.8930),
      s('Buangkok',      1.3833, 103.8928),
      s('Sengkang',      1.3916, 103.8952),
      s('Punggol',       1.4051, 103.9022),
    ],
  },

  // ── Circle Line (Orange) ──────────────────────────────────────────────────
  {
    id: 'ccl', color: '#fa9e0d',
    stations: [
      s('Dhoby Ghaut',    1.2991, 103.8457),
      s('Bras Basah',     1.2965, 103.8506),
      s('Esplanade',      1.2931, 103.8554),
      s('Promenade',      1.2932, 103.8617),
      s('Nicoll Highway', 1.2991, 103.8639),
      s('Stadium',        1.3028, 103.8751),
      s('Mountbatten',    1.3059, 103.8820),
      s('Dakota',         1.3082, 103.8886),
      s('Paya Lebar',     1.3177, 103.8923),
      s('MacPherson',     1.3261, 103.8906),
      s('Tai Seng',       1.3357, 103.8899),
      s('Bartley',        1.3428, 103.8821),
      s('Serangoon',      1.3497, 103.8732),
      s('Lorong Chuan',   1.3521, 103.8636),
      s('Bishan',         1.3509, 103.8480),
      s('Marymount',      1.3491, 103.8394),
      s('Caldecott',      1.3380, 103.8327),
      s('Botanic Gardens',1.3226, 103.8149),
      s('Farrer Road',    1.3174, 103.8077),
      s('Holland Village',1.3125, 103.7961),
      s('Buona Vista',    1.3072, 103.7904),
      s('one-north',      1.2991, 103.7873),
      s('Kent Ridge',     1.2930, 103.7839),
      s('Haw Par Villa',  1.2828, 103.7820),
      s('Pasir Panjang',  1.2741, 103.7921),
      s('Labrador Park',  1.2720, 103.8026),
      s('Telok Blangah',  1.2706, 103.8099),
      s('HarbourFront',   1.2653, 103.8220),
    ],
  },

  // ── Downtown Line (Dark Blue) ─────────────────────────────────────────────
  {
    id: 'dtl', color: '#005ec4',
    stations: [
      s('Bukit Panjang',   1.3784, 103.7623),
      s('Cashew',          1.3695, 103.7695),
      s('Hillview',        1.3621, 103.7673),
      s('Beauty World',    1.3413, 103.7757),
      s('King Albert Park',1.3350, 103.7823),
      s('Sixth Avenue',    1.3287, 103.7972),
      s('Tan Kah Kee',     1.3226, 103.8078),
      s('Botanic Gardens', 1.3226, 103.8149),
      s('Stevens',         1.3152, 103.8264),
      s('Newton',          1.3122, 103.8384),
      s('Little India',    1.3066, 103.8519),
      s('Rochor',          1.3034, 103.8561),
      s('Bugis',           1.3004, 103.8564),
      s('Promenade',       1.2932, 103.8617),
      s('Bayfront',        1.2820, 103.8613),
      s('Downtown',        1.2791, 103.8543),
      s('Telok Ayer',      1.2813, 103.8479),
      s('Chinatown',       1.2846, 103.8444),
      s('Fort Canning',    1.2909, 103.8437),
      s('Bendemeer',       1.3124, 103.8621),
      s('Geylang Bahru',   1.3189, 103.8713),
      s('Mattar',          1.3240, 103.8823),
      s('MacPherson',      1.3261, 103.8906),
      s('Ubi',             1.3289, 103.9003),
      s('Kaki Bukit',      1.3344, 103.9073),
      s('Bedok North',     1.3336, 103.9199),
      s('Bedok Reservoir', 1.3358, 103.9324),
      s('Tampines West',   1.3460, 103.9384),
      s('Tampines',        1.3541, 103.9453),
      s('Tampines East',   1.3580, 103.9571),
      s('Upper Changi',    1.3411, 103.9614),
      s('Expo',            1.3353, 103.9613),
    ],
  },

  // ── Thomson–East Coast Line (Brown) ──────────────────────────────────────
  {
    id: 'tel', color: '#9d5b25',
    stations: [
      s('Woodlands North',   1.4480, 103.7862),
      s('Woodlands',         1.4370, 103.7866),
      s('Springleaf',        1.4213, 103.8213),
      s('Lentor',            1.4038, 103.8356),
      s('Mayflower',         1.3959, 103.8441),
      s('Bright Hill',       1.3739, 103.8403),
      s('Upper Thomson',     1.3636, 103.8302),
      s('Caldecott',         1.3380, 103.8327),
      s('Mount Pleasant',    1.3271, 103.8302),
      s('Stevens',           1.3152, 103.8264),
      s('Napier',            1.3078, 103.8210),
      s('Orchard Boulevard', 1.3063, 103.8267),
      s('Orchard',           1.3042, 103.8319),
      s('Great World',       1.2951, 103.8244),
      s('Havelock',          1.2877, 103.8349),
      s('Outram Park',       1.2802, 103.8394),
      s('Maxwell',           1.2773, 103.8450),
      s('Shenton Way',       1.2778, 103.8513),
      s('Marina Bay',        1.2770, 103.8645),
      s('Gardens by the Bay',1.2824, 103.8661),
      s('Founders\' Memorial',1.2937,103.8752),
      s('Tanjong Rhu',       1.3011, 103.8770),
      s('Katong Park',       1.3063, 103.8907),
      s('Tanjong Katong',    1.3099, 103.9003),
      s('Marine Parade',     1.3021, 103.9054),
      s('Marine Terrace',    1.3068, 103.9195),
      s('Siglap',            1.3132, 103.9296),
      s('Bayshore',          1.3150, 103.9500),
    ],
  },
]

// ─── GeoJSON builders ────────────────────────────────────────────────────────

type LineFeature = GeoJSON.Feature<GeoJSON.LineString, { color: string; lineId: string }>
type StationFeature = GeoJSON.Feature<GeoJSON.Point, { name: string; color: string }>

function buildGeoJson() {
  const lineFeatures: LineFeature[] = []
  const stationFeatures: StationFeature[] = []
  const seen = new Set<string>()

  for (const line of LINES) {
    const allSegments = [line.stations, ...(line.branches ?? [])]

    for (const seg of allSegments) {
      lineFeatures.push({
        type: 'Feature',
        properties: { color: line.color, lineId: line.id },
        geometry: { type: 'LineString', coordinates: seg.map((st) => st.coord) },
      })
    }

    // Deduplicate stations — first line's color wins for interchange stops.
    for (const seg of allSegments) {
      for (const st of seg) {
        if (!seen.has(st.name)) {
          seen.add(st.name)
          stationFeatures.push({
            type: 'Feature',
            properties: { name: st.name, color: line.color },
            geometry: { type: 'Point', coordinates: st.coord },
          })
        }
      }
    }
  }

  return {
    lines: { type: 'FeatureCollection' as const, features: lineFeatures },
    stations: { type: 'FeatureCollection' as const, features: stationFeatures },
  }
}

// ─── Layer setup ─────────────────────────────────────────────────────────────

export function addMrtLayers(map: maplibregl.Map): void {
  const { lines, stations } = buildGeoJson()

  map.addSource('mrt-lines', { type: 'geojson', data: lines })
  map.addSource('mrt-stations', { type: 'geojson', data: stations })

  // White casing makes lines pop off the basemap.
  map.addLayer({
    id: 'mrt-lines-casing',
    type: 'line',
    source: 'mrt-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.85 },
  })

  map.addLayer({
    id: 'mrt-lines-fill',
    type: 'line',
    source: 'mrt-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 3 },
  })

  // Station dots — white fill, coloured ring.
  map.addLayer({
    id: 'mrt-stations-dot',
    type: 'circle',
    source: 'mrt-stations',
    paint: {
      'circle-radius': 4,
      'circle-color': '#ffffff',
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': 2,
    },
  })

  // Labels visible from zoom 13 — light halo so they read over tiles.
  map.addLayer({
    id: 'mrt-station-labels',
    type: 'symbol',
    source: 'mrt-stations',
    minzoom: 13,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans SemiBold', 'Arial Unicode MS Bold'],
      'text-size': 10,
      'text-offset': [0, -1.4],
      'text-anchor': 'bottom',
      'text-allow-overlap': false,
      'text-optional': true,
    },
    paint: {
      'text-color': '#1e293b',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5,
    },
  })
}
