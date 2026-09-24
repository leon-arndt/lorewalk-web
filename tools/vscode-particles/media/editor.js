const vscode = acquireVsCodeApi()

const PREVIEW_URL = document.body.dataset.previewUrl
const PREVIEW_ORIGIN = document.body.dataset.previewOrigin
const PREVIEW_TIMEOUT_MS = 8000

let bank = null
let effectId = null
let emitterIdx = 0
let dirty = false
let previewReady = false
let previewTimer = 0
let sendTimer = 0

const $ = (id) => document.getElementById(id)

// Keep in sync with defaultEmitter() in src/lib/vfx.ts. The runtime fills any
// missing field from that function, so a drift here only changes new emitters.
function defaultEmitter(name) {
  return {
    name, delay: 0, duration: 0, burst: 30, rate: 0,
    life: [0.8, 1.4], shape: 'point', radius: 0, offset: [0, 1, 0],
    direction: [0, 1, 0], spread: 180, speed: [2, 4], gravity: 2, drag: 0.5,
    size: [0.6, 0.1], alpha: [1, 0], colors: ['#fde68a'], endColor: '#f97316',
    sprite: 'glow', blend: 'normal', spin: 0, twinkle: 0,
  }
}

function effect() {
  return bank && bank.effects[effectId]
}

function emitter() {
  const e = effect()
  return e && e.emitters[emitterIdx]
}

function setStatus(text) {
  $('status').textContent = text
}

function markDirty() {
  dirty = true
  setStatus('unsaved changes')
  sendPreviewSoon()
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props)
  for (const child of children) node.append(child)
  return node
}

// --- preview -----------------------------------------------------------------

function postPreview(msg) {
  const frame = $('preview-frame')
  if (previewReady && frame.contentWindow) frame.contentWindow.postMessage(msg, PREVIEW_ORIGIN)
}

function sendPreview() {
  const e = effect()
  if (e) postPreview({ type: 'play', effect: e, repeat: $('repeat').checked })
  else postPreview({ type: 'clear' })
}

function sendPreviewSoon() {
  clearTimeout(sendTimer)
  sendTimer = setTimeout(sendPreview, 120)
}

function loadPreview() {
  previewReady = false
  $('preview-offline').hidden = true
  $('preview-frame').src = PREVIEW_URL + '?t=' + Date.now()
  clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    if (!previewReady) $('preview-offline').hidden = false
  }, PREVIEW_TIMEOUT_MS)
}

// --- controls ----------------------------------------------------------------

function field(label, control, hint) {
  const children = [el('label', { textContent: label }), control]
  if (hint) children.push(el('p', { className: 'hint', textContent: hint }))
  return el('div', { className: 'field' }, children)
}

function numberInput(value, step, onChange, min) {
  const input = el('input', { type: 'number', value: String(value), step: String(step) })
  if (min !== undefined) input.min = String(min)
  input.addEventListener('input', () => {
    let v = parseFloat(input.value)
    if (!Number.isFinite(v)) return
    if (min !== undefined) v = Math.max(min, v)
    onChange(v)
    markDirty()
  })
  return input
}

function num(label, key, step, min, hint) {
  const m = emitter()
  return field(label, numberInput(m[key], step, (v) => { emitter()[key] = v }, min), hint)
}

function pair(label, key, step, names = ['min', 'max']) {
  const m = emitter()
  const row = el('div', { className: 'row' })
  for (const i of [0, 1]) {
    const input = numberInput(m[key][i], step, (v) => { emitter()[key][i] = v })
    input.title = names[i]
    input.placeholder = names[i]
    row.append(input)
  }
  return field(`${label} (${names.join(' / ')})`, row)
}

function vec(label, key) {
  const m = emitter()
  const row = el('div', { className: 'row' })
  const axes = ['x east', 'y up', 'z south']
  for (const i of [0, 1, 2]) {
    const input = numberInput(m[key][i], 0.1, (v) => { emitter()[key][i] = v })
    input.title = axes[i]
    row.append(input)
  }
  return field(`${label} (x east, y up, z south)`, row)
}

function slider(label, key, min, max, step) {
  const m = emitter()
  const out = el('output', { textContent: String(m[key]) })
  const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(m[key]) })
  input.addEventListener('input', () => {
    emitter()[key] = Number(input.value)
    out.textContent = input.value
    markDirty()
  })
  return field(label, el('div', { className: 'slider' }, [input, out]))
}

function select(label, value, options, onChange, hint) {
  const s = el('select')
  for (const [v, text] of options) s.append(el('option', { value: v, textContent: text, selected: v === value }))
  s.addEventListener('change', () => {
    onChange(s.value)
    markDirty()
  })
  return field(label, s, hint)
}

function section(title, children) {
  return el('div', { className: 'section' }, [el('h3', { textContent: title }), ...children])
}

function colorsField() {
  const m = emitter()
  const row = el('div', { className: 'row wrap' })
  m.colors.forEach((c, i) => {
    const input = el('input', { type: 'color', value: c })
    input.addEventListener('input', () => {
      emitter().colors[i] = input.value
      markDirty()
    })
    const wrap = el('span', { className: 'swatch' }, [input])
    if (m.colors.length > 1) {
      const remove = el('button', { className: 'ghost tiny', textContent: '×', title: 'Remove colour' })
      remove.addEventListener('click', () => {
        emitter().colors.splice(i, 1)
        markDirty()
        renderDetail()
      })
      wrap.append(remove)
    }
    row.append(wrap)
  })
  const add = el('button', { className: 'ghost', textContent: '+ Colour' })
  add.addEventListener('click', () => {
    emitter().colors.push('#ffffff')
    markDirty()
    renderDetail()
  })
  row.append(add)
  return field('Start colours (one per particle, at random)', row)
}

function endColorField() {
  const m = emitter()
  const box = el('input', { type: 'checkbox', checked: !!m.endColor })
  const row = el('div', { className: 'row' }, [el('label', { className: 'check' }, [box, 'Fade to a colour'])])
  if (m.endColor) {
    const input = el('input', { type: 'color', value: m.endColor })
    input.addEventListener('input', () => {
      emitter().endColor = input.value
      markDirty()
    })
    row.append(input)
  }
  box.addEventListener('change', () => {
    emitter().endColor = box.checked ? '#ffffff' : ''
    markDirty()
    renderDetail()
  })
  return field('End colour', row)
}

// --- lists -------------------------------------------------------------------

function renderEffects() {
  const list = $('effects')
  list.textContent = ''
  for (const id of Object.keys(bank.effects)) {
    const e = bank.effects[id]
    const item = el('li', { className: id === effectId ? 'active' : '' }, [
      el('span', { className: 'mono', textContent: id }),
      el('span', { className: 'sub', textContent: `${e.emitters.length} emitter(s)${e.loop ? ', loops' : ''}` }),
    ])
    item.addEventListener('click', () => {
      effectId = id
      emitterIdx = 0
      render()
      sendPreview()
    })
    list.append(item)
  }
}

function renderEmitters() {
  const list = $('emitters')
  list.textContent = ''
  const e = effect()
  if (!e) return
  e.emitters.forEach((m, i) => {
    const links = [m.trail && `trail: ${m.trail}`, m.onDeath && `on death: ${m.onDeath}`].filter(Boolean).join(', ')
    const item = el('li', { className: i === emitterIdx ? 'active' : '' }, [
      el('span', { textContent: m.name }),
      el('span', { className: 'sub', textContent: links || `${m.sprite}, ${m.blend}` }),
    ])
    item.addEventListener('click', () => {
      emitterIdx = i
      renderEmitters()
      renderDetail()
    })
    list.append(item)
  })
}

// --- detail ------------------------------------------------------------------

function renameEffect(newId) {
  if (!newId || newId === effectId || bank.effects[newId]) return
  const next = {}
  for (const [id, e] of Object.entries(bank.effects)) next[id === effectId ? newId : id] = e
  bank.effects = next
  effectId = newId
  markDirty()
  renderEffects()
}

function renameEmitter(newName) {
  const e = effect()
  const m = emitter()
  if (!newName || newName === m.name || e.emitters.some((x) => x.name === newName)) return
  for (const x of e.emitters) {
    if (x.onDeath === m.name) x.onDeath = newName
    if (x.trail === m.name) x.trail = newName
  }
  m.name = newName
  markDirty()
  render()
}

function renderDetail() {
  const detail = $('detail')
  detail.textContent = ''
  const e = effect()
  if (!e) {
    detail.append(el('p', { className: 'empty', textContent: 'No effect. Add one on the left.' }))
    return
  }

  const idInput = el('input', { value: effectId, className: 'mono' })
  idInput.addEventListener('change', () => renameEffect(idInput.value.trim()))
  const loop = el('input', { type: 'checkbox', checked: e.loop })
  loop.addEventListener('change', () => {
    effect().loop = loop.checked
    markDirty()
    renderEffects()
  })
  detail.append(section('Effect', [
    field('Id', idInput, 'Code plays it with playMapVfx(id, [lng, lat]).'),
    field('Loop', el('label', { className: 'check' }, [loop, 'Repeat the whole effect forever'])),
  ]))

  const m = emitter()
  if (!m) return
  const others = e.emitters.filter((x) => x !== m).map((x) => [x.name, x.name])

  const nameInput = el('input', { value: m.name })
  nameInput.addEventListener('change', () => renameEmitter(nameInput.value.trim()))

  detail.append(
    section('Emission', [
      field('Name', nameInput),
      num('Delay (s)', 'delay', 0.05, 0),
      num('Duration (s)', 'duration', 0.1, 0, '0 = burst only.'),
      num('Burst', 'burst', 1, 0, 'Particles at once when the emitter starts.'),
      num('Rate (per s)', 'rate', 1, 0, 'Particles per second while the duration runs.'),
      pair('Life (s)', 'life', 0.05),
      el('p', { className: 'hint', textContent: 'A death or trail emitter uses only its burst count. It ignores delay, duration, and rate.' }),
    ]),
    section('Shape', [
      select('Shape', m.shape, [['point', 'point'], ['sphere', 'sphere'], ['ring', 'ring']], (v) => { emitter().shape = v }),
      num('Radius', 'radius', 0.1, 0),
      vec('Offset', 'offset'),
    ]),
    section('Motion', [
      vec('Direction', 'direction'),
      slider('Spread (degrees, 180 = all directions)', 'spread', 0, 180, 1),
      pair('Speed', 'speed', 0.1),
      num('Gravity', 'gravity', 0.1, undefined, 'Pulls down. A negative value floats up.'),
      num('Drag', 'drag', 0.1, 0),
      num('Spin (degrees per s)', 'spin', 10, 0),
    ]),
    section('Look', [
      select('Sprite', m.sprite, [['glow', 'glow'], ['star', 'star'], ['disc', 'disc'], ['square', 'square (confetti)']], (v) => { emitter().sprite = v }),
      select('Blend', m.blend, [['normal', 'normal (solid)'], ['additive', 'additive (light)']], (v) => { emitter().blend = v },
        'The map is light, so additive washes out there. Use normal for a colour that must show in daylight.'),
      pair('Size', 'size', 0.05, ['start', 'end']),
      pair('Opacity', 'alpha', 0.05, ['start', 'end']),
      slider('Twinkle', 'twinkle', 0, 1, 0.05),
      colorsField(),
      endColorField(),
    ]),
    section('Chains', [
      select('On death', m.onDeath || '', [['', 'none'], ...others], (v) => { emitter().onDeath = v || undefined; renderEmitters() },
        'Bursts this emitter where each particle dies.'),
      select('Trail', m.trail || '', [['', 'none'], ...others], (v) => { emitter().trail = v || undefined; renderEmitters(); renderDetail() },
        'Each living particle leaves particles of this emitter behind.'),
      ...(m.trail ? [num('Trail rate (per s)', 'trailRate', 1, 0)] : []),
    ]),
  )
}

function render() {
  renderEffects()
  renderEmitters()
  renderDetail()
}

// --- effect and emitter actions ------------------------------------------------

function uniqueId(base) {
  let id = base
  let n = 2
  while (bank.effects[id]) id = `${base}-${n++}`
  return id
}

function uniqueName(base) {
  const names = new Set(effect().emitters.map((m) => m.name))
  let name = base
  let n = 2
  while (names.has(name)) name = `${base} ${n++}`
  return name
}

function after(change) {
  change()
  markDirty()
  render()
  sendPreview()
}

$('add-effect').addEventListener('click', () => after(() => {
  effectId = uniqueId('fx/new')
  bank.effects[effectId] = { loop: false, emitters: [defaultEmitter('main')] }
  emitterIdx = 0
}))

$('copy-effect').addEventListener('click', () => {
  if (!effect()) return
  after(() => {
    const id = uniqueId(effectId + '-copy')
    bank.effects[id] = structuredClone(effect())
    effectId = id
  })
})

$('delete-effect').addEventListener('click', () => {
  if (!effect()) return
  after(() => {
    delete bank.effects[effectId]
    effectId = Object.keys(bank.effects)[0] || null
    emitterIdx = 0
  })
})

$('add-emitter').addEventListener('click', () => {
  if (!effect()) return
  after(() => {
    effect().emitters.push(defaultEmitter(uniqueName('emitter')))
    emitterIdx = effect().emitters.length - 1
  })
})

$('copy-emitter').addEventListener('click', () => {
  if (!emitter()) return
  after(() => {
    const copy = structuredClone(emitter())
    copy.name = uniqueName(copy.name)
    effect().emitters.push(copy)
    emitterIdx = effect().emitters.length - 1
  })
})

$('delete-emitter').addEventListener('click', () => {
  if (!emitter()) return
  after(() => {
    const gone = emitter().name
    const e = effect()
    e.emitters.splice(emitterIdx, 1)
    for (const x of e.emitters) {
      if (x.onDeath === gone) delete x.onDeath
      if (x.trail === gone) delete x.trail
    }
    emitterIdx = Math.max(0, emitterIdx - 1)
  })
})

// --- header ------------------------------------------------------------------

$('play').addEventListener('click', sendPreview)
$('repeat').addEventListener('change', sendPreview)
$('reset-spot').addEventListener('click', () => postPreview({ type: 'resetSpot' }))
$('retry').addEventListener('click', loadPreview)
$('save').addEventListener('click', () => vscode.postMessage({ type: 'save', bank }))
$('reload').addEventListener('click', () => vscode.postMessage({ type: 'reload' }))
$('copy').addEventListener('click', () => {
  if (effect()) vscode.postMessage({ type: 'copy', text: JSON.stringify({ [effectId]: effect() }, null, 2) })
})

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    vscode.postMessage({ type: 'save', bank })
  }
})

window.addEventListener('message', (e) => {
  const msg = e.data
  if (e.origin === PREVIEW_ORIGIN) {
    if (msg.type === 'previewReady') {
      previewReady = true
      $('preview-offline').hidden = true
      sendPreview()
    } else if (msg.type === 'stats') {
      $('particles').textContent = `${msg.particles} particles`
    }
    return
  }
  if (msg.type === 'init') {
    bank = msg.bank
    bank.effects = bank.effects || {}
    for (const e of Object.values(bank.effects)) {
      e.loop = !!e.loop
      e.emitters = (e.emitters || []).map((m) => ({ ...defaultEmitter(m.name || 'emitter'), ...m }))
    }
    if (!bank.effects[effectId]) effectId = Object.keys(bank.effects)[0] || null
    emitterIdx = 0
    dirty = false
    setStatus('')
    render()
    sendPreview()
  } else if (msg.type === 'saved') {
    dirty = false
    setStatus('saved')
  } else if (msg.type === 'error') {
    setStatus('error: ' + msg.message)
  }
})

loadPreview()
vscode.postMessage({ type: 'ready' })
