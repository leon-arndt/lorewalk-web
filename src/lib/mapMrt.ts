import maplibregl from 'maplibre-gl'

// Singapore MRT rendered as MapLibre GeoJSON layers.
// Station labels match SMRT signage: coloured capsule per line code, then name.
// Interchange stations get multiple capsules side-by-side.

type Coord = [number, number]  // [lon, lat]

interface Station {
  name: string
  code: string   // e.g. NS1, EW24, CG1
  coord: Coord
}

interface MrtLine {
  id: string
  color: string
  stations: Station[]
  branches?: Station[][]
}

function s(name: string, code: string, lat: number, lon: number): Station {
  return { name, code, coord: [lon, lat] }
}

const LINES: MrtLine[] = [
  // ── North South Line ────────────────────────────────────────────── red ───
  {
    id: 'nsl', color: '#e2231a',
    stations: [
      s('Jurong East',       'NS1',  1.3330, 103.7424),
      s('Bukit Batok',       'NS2',  1.3491, 103.7495),
      s('Bukit Gombak',      'NS3',  1.3587, 103.7516),
      s('Choa Chu Kang',     'NS4',  1.3854, 103.7444),
      s('Yew Tee',           'NS5',  1.3974, 103.7472),
      s('Kranji',            'NS7',  1.4253, 103.7621),
      s('Marsiling',         'NS8',  1.4326, 103.7744),
      s('Woodlands',         'NS9',  1.4370, 103.7866),
      s('Admiralty',         'NS10', 1.4407, 103.8008),
      s('Sembawang',         'NS11', 1.4491, 103.8200),
      s('Canberra',          'NS12', 1.4431, 103.8299),
      s('Yishun',            'NS13', 1.4294, 103.8353),
      s('Khatib',            'NS14', 1.4176, 103.8332),
      s('Yio Chu Kang',      'NS15', 1.3817, 103.8450),
      s('Ang Mo Kio',        'NS16', 1.3700, 103.8494),
      s('Bishan',            'NS17', 1.3509, 103.8480),
      s('Braddell',          'NS18', 1.3400, 103.8470),
      s('Toa Payoh',         'NS19', 1.3328, 103.8474),
      s('Novena',            'NS20', 1.3203, 103.8439),
      s('Newton',            'NS21', 1.3122, 103.8384),
      s('Orchard',           'NS22', 1.3042, 103.8319),
      s('Somerset',          'NS23', 1.3006, 103.8386),
      s('Dhoby Ghaut',       'NS24', 1.2991, 103.8457),
      s('City Hall',         'NS25', 1.2931, 103.8521),
      s('Raffles Place',     'NS26', 1.2836, 103.8513),
      s('Marina Bay',        'NS27', 1.2770, 103.8645),
      s('Marina South Pier', 'NS28', 1.2703, 103.8630),
    ],
  },

  // ── East West Line ─────────────────────────────────────────────── green ──
  {
    id: 'ewl', color: '#009645',
    stations: [
      s('Pasir Ris',      'EW1',  1.3732, 103.9494),
      s('Tampines',       'EW2',  1.3541, 103.9453),
      s('Simei',          'EW3',  1.3430, 103.9530),
      s('Tanah Merah',    'EW4',  1.3273, 103.9460),
      s('Bedok',          'EW5',  1.3240, 103.9300),
      s('Kembangan',      'EW6',  1.3210, 103.9130),
      s('Eunos',          'EW7',  1.3198, 103.9038),
      s('Paya Lebar',     'EW8',  1.3177, 103.8923),
      s('Aljunied',       'EW9',  1.3163, 103.8830),
      s('Kallang',        'EW10', 1.3114, 103.8718),
      s('Lavender',       'EW11', 1.3074, 103.8634),
      s('Bugis',          'EW12', 1.3004, 103.8564),
      s('City Hall',      'EW13', 1.2931, 103.8521),
      s('Raffles Place',  'EW14', 1.2836, 103.8513),
      s('Tanjong Pagar',  'EW15', 1.2764, 103.8456),
      s('Outram Park',    'EW16', 1.2802, 103.8394),
      s('Tiong Bahru',    'EW17', 1.2865, 103.8271),
      s('Redhill',        'EW18', 1.2898, 103.8165),
      s('Queenstown',     'EW19', 1.2944, 103.8060),
      s('Commonwealth',   'EW20', 1.3026, 103.7983),
      s('Buona Vista',    'EW21', 1.3072, 103.7904),
      s('Dover',          'EW22', 1.3113, 103.7785),
      s('Clementi',       'EW23', 1.3152, 103.7654),
      s('Jurong East',    'EW24', 1.3330, 103.7424),
      s('Chinese Garden', 'EW25', 1.3421, 103.7320),
      s('Lakeside',       'EW26', 1.3444, 103.7212),
      s('Boon Lay',       'EW27', 1.3389, 103.7060),
      s('Pioneer',        'EW28', 1.3369, 103.6972),
      s('Joo Koon',       'EW29', 1.3283, 103.6782),
    ],
    branches: [[
      s('Tanah Merah',    'EW4',  1.3273, 103.9460),
      s('Expo',           'CG1',  1.3353, 103.9613),
      s('Changi Airport', 'CG2',  1.3573, 103.9890),
    ]],
  },

  // ── North East Line ───────────────────────────────────────────── purple ──
  {
    id: 'nel', color: '#9900aa',
    stations: [
      s('HarbourFront',  'NE1',  1.2653, 103.8220),
      s('Outram Park',   'NE3',  1.2802, 103.8394),
      s('Chinatown',     'NE4',  1.2846, 103.8444),
      s('Clarke Quay',   'NE5',  1.2882, 103.8463),
      s('Dhoby Ghaut',   'NE6',  1.2991, 103.8457),
      s('Little India',  'NE7',  1.3066, 103.8519),
      s('Farrer Park',   'NE8',  1.3127, 103.8541),
      s('Boon Keng',     'NE9',  1.3196, 103.8612),
      s('Potong Pasir',  'NE10', 1.3314, 103.8692),
      s('Woodleigh',     'NE11', 1.3394, 103.8709),
      s('Serangoon',     'NE12', 1.3497, 103.8732),
      s('Kovan',         'NE13', 1.3597, 103.8853),
      s('Hougang',       'NE14', 1.3714, 103.8930),
      s('Buangkok',      'NE15', 1.3833, 103.8928),
      s('Sengkang',      'NE16', 1.3916, 103.8952),
      s('Punggol',       'NE17', 1.4051, 103.9022),
    ],
  },

  // ── Circle Line ───────────────────────────────────────────────── orange ──
  {
    id: 'ccl', color: '#fa9e0d',
    stations: [
      s('Dhoby Ghaut',    'CC1',  1.2991, 103.8457),
      s('Bras Basah',     'CC2',  1.2965, 103.8506),
      s('Esplanade',      'CC3',  1.2931, 103.8554),
      s('Promenade',      'CC4',  1.2932, 103.8617),
      s('Nicoll Highway', 'CC5',  1.2991, 103.8639),
      s('Stadium',        'CC6',  1.3028, 103.8751),
      s('Mountbatten',    'CC7',  1.3059, 103.8820),
      s('Dakota',         'CC8',  1.3082, 103.8886),
      s('Paya Lebar',     'CC9',  1.3177, 103.8923),
      s('MacPherson',     'CC10', 1.3261, 103.8906),
      s('Tai Seng',       'CC11', 1.3357, 103.8899),
      s('Bartley',        'CC12', 1.3428, 103.8821),
      s('Serangoon',      'CC13', 1.3497, 103.8732),
      s('Lorong Chuan',   'CC14', 1.3521, 103.8636),
      s('Bishan',         'CC15', 1.3509, 103.8480),
      s('Marymount',      'CC16', 1.3491, 103.8394),
      s('Caldecott',      'CC17', 1.3380, 103.8327),
      s('Botanic Gardens','CC19', 1.3226, 103.8149),
      s('Farrer Road',    'CC20', 1.3174, 103.8077),
      s('Holland Village','CC21', 1.3125, 103.7961),
      s('Buona Vista',    'CC22', 1.3072, 103.7904),
      s('one-north',      'CC23', 1.2991, 103.7873),
      s('Kent Ridge',     'CC24', 1.2930, 103.7839),
      s('Haw Par Villa',  'CC25', 1.2828, 103.7820),
      s('Pasir Panjang',  'CC26', 1.2741, 103.7921),
      s('Labrador Park',  'CC27', 1.2720, 103.8026),
      s('Telok Blangah',  'CC28', 1.2706, 103.8099),
      s('HarbourFront',   'CC29', 1.2653, 103.8220),
    ],
  },

  // ── Downtown Line ───────────────────────────────────────────── dark blue ──
  {
    id: 'dtl', color: '#005ec4',
    stations: [
      s('Bukit Panjang',    'DT1',  1.3784, 103.7623),
      s('Cashew',           'DT2',  1.3695, 103.7695),
      s('Hillview',         'DT3',  1.3621, 103.7673),
      s('Beauty World',     'DT5',  1.3413, 103.7757),
      s('King Albert Park', 'DT6',  1.3350, 103.7823),
      s('Sixth Avenue',     'DT7',  1.3287, 103.7972),
      s('Tan Kah Kee',      'DT8',  1.3226, 103.8078),
      s('Botanic Gardens',  'DT9',  1.3226, 103.8149),
      s('Stevens',          'DT10', 1.3152, 103.8264),
      s('Newton',           'DT11', 1.3122, 103.8384),
      s('Little India',     'DT12', 1.3066, 103.8519),
      s('Rochor',           'DT13', 1.3034, 103.8561),
      s('Bugis',            'DT14', 1.3004, 103.8564),
      s('Promenade',        'DT15', 1.2932, 103.8617),
      s('Bayfront',         'DT16', 1.2820, 103.8613),
      s('Downtown',         'DT17', 1.2791, 103.8543),
      s('Telok Ayer',       'DT18', 1.2813, 103.8479),
      s('Chinatown',        'DT19', 1.2846, 103.8444),
      s('Fort Canning',     'DT20', 1.2909, 103.8437),
      s('Bendemeer',        'DT21', 1.3124, 103.8621),
      s('Geylang Bahru',    'DT22', 1.3189, 103.8713),
      s('Mattar',           'DT23', 1.3240, 103.8823),
      s('MacPherson',       'DT24', 1.3261, 103.8906),
      s('Ubi',              'DT25', 1.3289, 103.9003),
      s('Kaki Bukit',       'DT26', 1.3344, 103.9073),
      s('Bedok North',      'DT27', 1.3336, 103.9199),
      s('Bedok Reservoir',  'DT28', 1.3358, 103.9324),
      s('Tampines West',    'DT29', 1.3460, 103.9384),
      s('Tampines',         'DT30', 1.3541, 103.9453),
      s('Tampines East',    'DT31', 1.3580, 103.9571),
      s('Upper Changi',     'DT32', 1.3411, 103.9614),
      s('Expo',             'DT33', 1.3353, 103.9613),
    ],
  },

  // ── Thomson–East Coast Line ───────────────────────────────────── brown ───
  {
    id: 'tel', color: '#9d5b25',
    stations: [
      s('Woodlands North',    'TE1',  1.4480, 103.7862),
      s('Woodlands',          'TE2',  1.4370, 103.7866),
      s('Springleaf',         'TE3',  1.4213, 103.8213),
      s('Lentor',             'TE4',  1.4038, 103.8356),
      s('Mayflower',          'TE5',  1.3959, 103.8441),
      s('Bright Hill',        'TE6',  1.3739, 103.8403),
      s('Upper Thomson',      'TE7',  1.3636, 103.8302),
      s('Caldecott',          'TE8',  1.3380, 103.8327),
      s('Mount Pleasant',     'TE9',  1.3271, 103.8302),
      s('Stevens',            'TE10', 1.3152, 103.8264),
      s('Napier',             'TE11', 1.3078, 103.8210),
      s('Orchard Boulevard',  'TE12', 1.3063, 103.8267),
      s('Orchard',            'TE13', 1.3042, 103.8319),
      s('Great World',        'TE14', 1.2951, 103.8244),
      s('Havelock',           'TE15', 1.2877, 103.8349),
      s('Outram Park',        'TE16', 1.2802, 103.8394),
      s('Maxwell',            'TE17', 1.2773, 103.8450),
      s('Shenton Way',        'TE18', 1.2778, 103.8513),
      s('Marina Bay',         'TE19', 1.2770, 103.8645),
      s('Gardens by the Bay', 'TE20', 1.2824, 103.8661),
      s("Founders' Memorial", 'TE22', 1.2937, 103.8752),
      s('Tanjong Rhu',        'TE23', 1.3011, 103.8770),
      s('Katong Park',        'TE24', 1.3063, 103.8907),
      s('Tanjong Katong',     'TE25', 1.3099, 103.9003),
      s('Marine Parade',      'TE26', 1.3021, 103.9054),
      s('Marine Terrace',     'TE27', 1.3068, 103.9195),
      s('Siglap',             'TE28', 1.3132, 103.9296),
      s('Bayshore',           'TE29', 1.3150, 103.9500),
    ],
  },
]

// ─── Canvas label generation ─────────────────────────────────────────────────

// Render a pill (fully-rounded rectangle) for the line code.
function pill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, code: string, fontSize: number,
) {
  const r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y,     x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x,     y + h, r)
  ctx.arcTo(x,     y + h, x,     y,     r)
  ctx.arcTo(x,     y,     x + w, y,     r)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${fontSize}px 'Helvetica Neue',Arial,sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(code, x + w / 2, y + h / 2)
}

interface LabelSpec { code: string; color: string }

function buildLabelImage(lineInfos: LabelSpec[], name: string): {
  width: number; height: number; data: Uint8Array
} {
  const SC = 2             // render at 2× for retina; registered with pixelRatio:2
  const PH   = 14 * SC     // pill height
  const PFZ  = 9  * SC     // pill font size
  const NFZ  = 10 * SC     // name font size
  const PADX = 5  * SC     // horizontal padding inside pill
  const GAP  = 3  * SC     // gap between pills
  const SEP  = 7  * SC     // gap between last pill and station name
  const H    = 20 * SC     // total canvas height

  const canvas = document.createElement('canvas')
  const ctx    = canvas.getContext('2d')!

  // Measure pill widths
  ctx.font = `bold ${PFZ}px 'Helvetica Neue',Arial,sans-serif`
  const pillWidths = lineInfos.map(l => ctx.measureText(l.code).width + PADX * 2)
  const pillsTotal = pillWidths.reduce((a, b) => a + b, 0) + GAP * Math.max(0, lineInfos.length - 1)

  // Measure name
  ctx.font = `${NFZ}px 'Helvetica Neue',Arial,sans-serif`
  const nameW = ctx.measureText(name).width

  canvas.width  = Math.ceil(pillsTotal + SEP + nameW + 4 * SC)
  canvas.height = H

  // Draw pills
  let x = 0
  const pillY = (H - PH) / 2
  for (let i = 0; i < lineInfos.length; i++) {
    pill(ctx, x, pillY, pillWidths[i], PH, lineInfos[i].color, lineInfos[i].code, PFZ)
    x += pillWidths[i] + GAP
  }

  // Draw name
  ctx.font = `${NFZ}px 'Helvetica Neue',Arial,sans-serif`
  ctx.fillStyle = '#1e293b'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, x + SEP, H / 2)

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return {
    width:  canvas.width,
    height: H,
    data:   new Uint8Array(imgData.data.buffer),
  }
}

// ─── GeoJSON builders ────────────────────────────────────────────────────────

interface LineFeature {
  type: 'Feature'
  properties: { color: string }
  geometry: { type: 'LineString'; coordinates: Coord[] }
}
interface StationFeature {
  type: 'Feature'
  properties: { name: string; color: string; labelKey: string }
  geometry: { type: 'Point'; coordinates: Coord }
}

function buildGeoJson(labelKeys: Map<string, string>) {
  const lineFeatures: LineFeature[]       = []
  const stationFeatures: StationFeature[] = []

  // Build per-station line membership first so we can assign label keys.
  const membership = new Map<string, { coord: Coord; lines: LabelSpec[] }>()
  for (const line of LINES) {
    const allSegs = [line.stations, ...(line.branches ?? [])]
    for (const seg of allSegs) {
      for (const st of seg) {
        if (!membership.has(st.name)) membership.set(st.name, { coord: st.coord, lines: [] })
        const entry = membership.get(st.name)!
        if (!entry.lines.some(l => l.code === st.code)) {
          entry.lines.push({ code: st.code, color: line.color })
        }
      }
    }
  }

  // Build station features.
  for (const [name, { coord, lines }] of membership) {
    const key = `mrt-lbl-${name.replace(/[^\w]/g, '_')}`
    labelKeys.set(name, key)
    stationFeatures.push({
      type: 'Feature',
      properties: { name, color: lines[0].color, labelKey: key },
      geometry: { type: 'Point', coordinates: coord },
    })
  }

  // Build line features.
  for (const line of LINES) {
    const allSegs = [line.stations, ...(line.branches ?? [])]
    for (const seg of allSegs) {
      lineFeatures.push({
        type: 'Feature',
        properties: { color: line.color },
        geometry: { type: 'LineString', coordinates: seg.map(st => st.coord) },
      })
    }
  }

  return {
    lineFC:    { type: 'FeatureCollection' as const, features: lineFeatures },
    stationFC: { type: 'FeatureCollection' as const, features: stationFeatures },
    membership,
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function addMrtLayers(map: maplibregl.Map): void {
  const labelKeys = new Map<string, string>()
  const { lineFC, stationFC, membership } = buildGeoJson(labelKeys)

  // Register a canvas label image for every unique station.
  for (const [name, { lines }] of membership) {
    const key = labelKeys.get(name)!
    const img = buildLabelImage(lines, name)
    map.addImage(key, img, { pixelRatio: 2 })
  }

  map.addSource('mrt-lines',    { type: 'geojson', data: lineFC })
  map.addSource('mrt-stations', { type: 'geojson', data: stationFC })

  // White casing so lines pop off the basemap.
  map.addLayer({
    id: 'mrt-lines-casing', type: 'line', source: 'mrt-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.85 },
  })
  map.addLayer({
    id: 'mrt-lines-fill', type: 'line', source: 'mrt-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  { 'line-color': ['get', 'color'], 'line-width': 3 },
  })

  // Station dot — white fill, coloured ring.
  map.addLayer({
    id: 'mrt-stations-dot', type: 'circle', source: 'mrt-stations',
    paint: {
      'circle-radius': 4,
      'circle-color': '#ffffff',
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': 2,
    },
  })

  // SMRT-style pill labels — canvas icons, visible from zoom 12.
  map.addLayer({
    id: 'mrt-station-labels', type: 'symbol', source: 'mrt-stations',
    minzoom: 12,
    layout: {
      'icon-image':          ['get', 'labelKey'],
      'icon-anchor':         'left',
      'icon-offset':         [6, 0],
      'icon-allow-overlap':  false,
      'icon-optional':       true,
    },
  })
}
