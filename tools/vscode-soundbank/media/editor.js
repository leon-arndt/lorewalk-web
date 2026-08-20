const vscode = acquireVsCodeApi()

let bank = null
let packs = []
let packBase = ''
let selected = null
let dirty = false

const $ = (id) => document.getElementById(id)

function currentPack() {
  return packs.find((p) => p.id === (bank && bank.pack)) || { samples: [], name: '', author: '', license: '' }
}

function markDirty() {
  dirty = true
  setStatus('unsaved changes')
}

function setStatus(text) {
  $('status').textContent = text
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props)
  for (const child of children) node.append(child)
  return node
}

function field(label, control) {
  return el('div', { className: 'field' }, [el('label', { textContent: label }), control])
}

function numberInput(value, step, onChange) {
  const input = el('input', { type: 'number', value: String(value), step: String(step) })
  input.addEventListener('change', () => {
    onChange(Number(input.value))
    markDirty()
  })
  return input
}

function sliderRow(value, min, max, step, onChange) {
  const out = el('output', { textContent: value.toFixed(2) })
  const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) })
  input.addEventListener('input', () => {
    out.textContent = Number(input.value).toFixed(2)
    onChange(Number(input.value))
    markDirty()
  })
  return el('div', { className: 'slider' }, [input, out])
}

function renderEvents() {
  const list = $('events')
  list.textContent = ''
  for (const id of Object.keys(bank.events)) {
    const event = bank.events[id]
    const item = el('li', { className: id === selected ? 'active' : '' }, [
      el('span', { className: 'ev-id', textContent: id }),
      el('span', { className: 'ev-label', textContent: event.label || `${(event.samples || []).length} sample(s)` }),
    ])
    item.addEventListener('click', () => {
      selected = id
      renderEvents()
      renderDetail()
    })
    list.append(item)
  }
  const pack = currentPack()
  $('pack-meta').textContent = pack.license ? `${pack.name} - ${pack.author || 'unknown author'} (${pack.license})` : ''
}

function renameEvent(oldId, newId) {
  if (!newId || newId === oldId || bank.events[newId]) return
  const next = {}
  for (const [id, event] of Object.entries(bank.events)) next[id === oldId ? newId : id] = event
  bank.events = next
  selected = newId
  markDirty()
  renderEvents()
}

function renderSamples(event) {
  const pack = currentPack()
  const wrap = el('div', { className: 'samples' })
  ;(event.samples || []).forEach((sample, index) => {
    const select = el('select')
    const options = pack.samples.map((s) => s.file)
    if (!options.includes(sample.file)) options.unshift(sample.file)
    for (const file of options) {
      const opt = el('option', { value: file, textContent: file, selected: file === sample.file })
      select.append(opt)
    }
    select.addEventListener('change', () => {
      sample.file = select.value
      markDirty()
    })

    const weight = numberInput(sample.weight ?? 1, 0.1, (v) => {
      sample.weight = v
    })
    weight.className = 'weight'

    const play = el('button', { className: 'ghost', textContent: '▶', title: 'Preview this sample' })
    play.addEventListener('click', () => preview(event, sample.file))

    const remove = el('button', { className: 'ghost danger', textContent: '✕', title: 'Remove sample' })
    remove.addEventListener('click', () => {
      event.samples.splice(index, 1)
      markDirty()
      renderDetail()
    })

    wrap.append(el('div', { className: 'sample-row' }, [select, weight, play, remove]))
  })

  const add = el('button', { className: 'ghost', textContent: '+ Add sample' })
  add.addEventListener('click', () => {
    const first = pack.samples[0]
    if (!first) return
    event.samples = event.samples || []
    event.samples.push({ file: first.file, weight: 1 })
    markDirty()
    renderDetail()
  })
  wrap.append(add)
  return wrap
}

function renderDetail() {
  const detail = $('detail')
  detail.textContent = ''
  if (!selected || !bank.events[selected]) {
    detail.append(el('p', { className: 'empty', textContent: 'Select an event.' }))
    return
  }
  const event = bank.events[selected]

  const idInput = el('input', { type: 'text', value: selected })
  idInput.addEventListener('change', () => renameEvent(selected, idInput.value.trim()))

  const labelInput = el('input', { type: 'text', value: event.label || '' })
  labelInput.addEventListener('change', () => {
    event.label = labelInput.value
    markDirty()
    renderEvents()
  })

  const rate = event.rate || [1, 1]
  const rateRow = el('div', { className: 'row' }, [
    numberInput(rate[0], 0.01, (v) => {
      rate[0] = v
    }),
    el('span', { textContent: 'to' }),
    numberInput(rate[1], 0.01, (v) => {
      rate[1] = v
    }),
  ])

  const previewBtn = el('button', { textContent: '▶ Preview event' })
  previewBtn.addEventListener('click', () => preview(event))

  const deleteBtn = el('button', { className: 'ghost danger', textContent: 'Delete event' })
  deleteBtn.addEventListener('click', () => {
    delete bank.events[selected]
    selected = Object.keys(bank.events)[0] || null
    markDirty()
    renderEvents()
    renderDetail()
  })

  const busSelect = el('select')
  for (const bus of ['sfx', 'music']) {
    busSelect.append(el('option', { value: bus, textContent: bus, selected: (event.bus || 'sfx') === bus }))
  }
  busSelect.addEventListener('change', () => {
    event.bus = busSelect.value
    if (event.bus === 'music') event.loop = true
    markDirty()
    renderDetail()
  })

  const loopBox = el('input', { type: 'checkbox', checked: !!event.loop })
  loopBox.addEventListener('change', () => {
    event.loop = loopBox.checked
    markDirty()
  })

  const isMusic = (event.bus || 'sfx') === 'music'

  detail.append(field('Event id', idInput), field('Label', labelInput), field('Bus', busSelect))
  detail.append(field('Loop', loopBox), field('Samples', renderSamples(event)))
  detail.append(
    field('Gain', sliderRow(event.gain ?? 1, 0, 2, 0.01, (v) => {
      event.gain = v
    }))
  )

  // A music event streams through an <audio> element in useBackgroundMusic, so
  // the Web Audio knobs below have no effect on it. Hide them instead of lying.
  if (isMusic) {
    detail.append(el('p', { className: 'hint', textContent: 'Music plays through an audio element and obeys the music volume slider. Rate, lowpass, cooldown and voice cap do not apply.' }))
  } else {
    event.rate = rate
    detail.append(
      field('Rate (random per play)', rateRow),
      field('Lowpass Hz', numberInput(event.lowpassHz ?? 20000, 100, (v) => {
        event.lowpassHz = v
      })),
      field('Cooldown ms', numberInput(event.cooldownMs ?? 0, 10, (v) => {
        event.cooldownMs = v
      })),
      field('Max voices', numberInput(event.maxVoices ?? 8, 1, (v) => {
        event.maxVoices = v
      }))
    )
  }

  detail.append(
    field('Waveform (click to play from a point)', makeWave(event)),
    el('div', { className: 'actions' }, [previewBtn, deleteBtn]),
    el('p', { className: 'hint', textContent: 'Space previews the selected event. Press it again to stop.' })
  )
}

// Mirrors the graph in src/lib/sfx.ts so the preview is what the game plays.
let ctx = null
const buffers = new Map()
const peaksCache = new Map()
let playing = null
let waveUrl = null
let waveCanvas = null

function eventUrl(file) {
  return `${packBase}/${bank.pack}/${file}`
}

function audioContext() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

async function loadAudio(url) {
  let buffer = buffers.get(url)
  if (!buffer) {
    const data = await (await fetch(url)).arrayBuffer()
    buffer = await audioContext().decodeAudioData(data)
    buffers.set(url, buffer)
  }
  return buffer
}

// One min/max pair per pixel column. A long music track downsamples to the same
// cost as a short click, so the canvas draw stays cheap either way.
function peaksFor(url, buffer, columns) {
  const key = `${url}@${columns}`
  let peaks = peaksCache.get(key)
  if (peaks) return peaks
  const data = buffer.getChannelData(0)
  const step = Math.max(1, Math.floor(data.length / columns))
  peaks = new Float32Array(columns * 2)
  for (let i = 0; i < columns; i++) {
    let min = 1
    let max = -1
    const from = i * step
    const to = Math.min(data.length, from + step)
    for (let j = from; j < to; j++) {
      const v = data[j]
      if (v < min) min = v
      if (v > max) max = v
    }
    peaks[i * 2] = min === 1 ? 0 : min
    peaks[i * 2 + 1] = max === -1 ? 0 : max
  }
  peaksCache.set(key, peaks)
  return peaks
}

function css(name, fallback) {
  const v = getComputedStyle(document.body).getPropertyValue(name)
  return v ? v.trim() : fallback
}

function drawWave(progress) {
  const canvas = waveCanvas
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(canvas.clientWidth))
  const height = Math.max(1, Math.floor(canvas.clientHeight))
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr
    canvas.height = height * dpr
  }
  const g = canvas.getContext('2d')
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, width, height)

  const buffer = waveUrl && buffers.get(waveUrl)
  const mid = height / 2
  const accent = css('--vscode-charts-blue', '#4daafc')
  const dim = css('--vscode-descriptionForeground', '#8b949e')

  if (!buffer) {
    g.fillStyle = dim
    g.globalAlpha = 0.6
    g.fillRect(0, mid, width, 1)
    g.globalAlpha = 1
    return
  }

  const peaks = peaksFor(waveUrl, buffer, width)
  const playedTo = progress == null ? -1 : progress * width
  for (let x = 0; x < width; x++) {
    const min = peaks[x * 2]
    const max = peaks[x * 2 + 1]
    const y1 = mid - max * mid * 0.92
    const y2 = mid - min * mid * 0.92
    g.fillStyle = x <= playedTo ? accent : dim
    g.globalAlpha = x <= playedTo ? 1 : 0.55
    g.fillRect(x, y1, 1, Math.max(1, y2 - y1))
  }
  g.globalAlpha = 1

  if (progress != null) {
    g.fillStyle = accent
    g.fillRect(Math.min(width - 1, playedTo), 0, 1, height)
  }
}

function stopPreview() {
  if (!playing) return
  const { source, raf } = playing
  playing = null
  cancelAnimationFrame(raf)
  try {
    source.onended = null
    source.stop()
  } catch {
    // already ended
  }
  drawWave(null)
}

function tick() {
  if (!playing) return
  const { startedAt, offset, rate, duration, loop } = playing
  let elapsed = (audioContext().currentTime - startedAt) * rate + offset
  if (loop && duration > 0) elapsed %= duration
  if (!loop && elapsed >= duration) {
    stopPreview()
    return
  }
  drawWave(duration > 0 ? elapsed / duration : 0)
  playing.raf = requestAnimationFrame(tick)
}

async function showWave(url) {
  waveUrl = url
  drawWave(null)
  try {
    await loadAudio(url)
  } catch (err) {
    setStatus(`cannot read ${url.split('/').pop()}: ${err.message || err}`)
    return
  }
  if (waveUrl === url) drawWave(null)
}

async function preview(event, forceFile, offsetSeconds = 0) {
  if (playing) {
    const again = playing.eventRef === event && !forceFile && !offsetSeconds
    stopPreview()
    if (again) return
  }
  try {
    const context = audioContext()
    if (context.state === 'suspended') await context.resume()

    const samples = event.samples || []
    let file = forceFile
    if (!file) {
      const total = samples.reduce((sum, s) => sum + (s.weight ?? 1), 0)
      let roll = Math.random() * total
      for (const s of samples) {
        roll -= s.weight ?? 1
        if (roll <= 0) {
          file = s.file
          break
        }
      }
      file = file || (samples[0] && samples[0].file)
    }
    if (!file) return

    const url = eventUrl(file)
    if (url !== waveUrl) await showWave(url)
    const buffer = await loadAudio(url)

    const [rateMin, rateMax] = event.rate || [1, 1]
    const rate = rateMin + Math.random() * (rateMax - rateMin)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    source.loop = !!event.loop

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = event.lowpassHz ?? 20000

    const gain = context.createGain()
    const t = context.currentTime
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime((bank.masterGain ?? 1) * (event.gain ?? 1), t + 0.008)

    source.connect(filter).connect(gain).connect(context.destination)
    source.start(t, offsetSeconds)

    playing = {
      source,
      eventRef: event,
      startedAt: t,
      offset: offsetSeconds,
      rate,
      duration: buffer.duration,
      loop: !!event.loop,
      raf: 0,
    }
    source.onended = () => {
      if (playing && playing.source === source) stopPreview()
    }
    playing.raf = requestAnimationFrame(tick)
  } catch (err) {
    setStatus(`preview failed: ${err.message || err}`)
  }
}

function makeWave(event) {
  const canvas = el('canvas', { className: 'wave' })
  waveCanvas = canvas
  canvas.addEventListener('click', (e) => {
    const buffer = waveUrl && buffers.get(waveUrl)
    if (!buffer) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    preview(event, waveUrl.split('/').pop(), ratio * buffer.duration)
  })
  const first = (event.samples || [])[0]
  const url = first ? eventUrl(first.file) : null
  requestAnimationFrame(() => (url ? showWave(url) : drawWave(null)))
  return canvas
}

function renderHeader() {
  const packSelect = $('pack')
  packSelect.textContent = ''
  for (const pack of packs) {
    packSelect.append(el('option', { value: pack.id, textContent: pack.name, selected: pack.id === bank.pack }))
  }
  packSelect.onchange = () => {
    bank.pack = packSelect.value
    stopPreview()
    buffers.clear()
    peaksCache.clear()
    waveUrl = null
    markDirty()
    renderEvents()
    renderDetail()
  }

  const master = $('master')
  master.value = String(bank.masterGain ?? 1)
  $('master-out').textContent = Number(master.value).toFixed(2)
  master.oninput = () => {
    bank.masterGain = Number(master.value)
    $('master-out').textContent = Number(master.value).toFixed(2)
    markDirty()
  }
}

$('save').addEventListener('click', () => vscode.postMessage({ type: 'save', bank }))
$('reload').addEventListener('click', () => {
  if (dirty && !confirm('Discard unsaved changes?')) return
  vscode.postMessage({ type: 'reload' })
})
$('add-event').addEventListener('click', () => {
  let id = 'ui/new-event'
  let i = 2
  while (bank.events[id]) id = `ui/new-event-${i++}`
  const first = currentPack().samples[0]
  bank.events[id] = {
    label: '',
    bus: 'sfx',
    samples: first ? [{ file: first.file, weight: 1 }] : [],
    gain: 1,
    rate: [1, 1],
    lowpassHz: 20000,
    cooldownMs: 0,
    maxVoices: 8,
  }
  selected = id
  markDirty()
  renderEvents()
  renderDetail()
})

// Space is the standard preview key in an audio editor. It must not steal the
// key from a text field or a dropdown.
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return
  const tag = document.activeElement && document.activeElement.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
  if (!selected || !bank.events[selected]) return
  e.preventDefault()
  preview(bank.events[selected])
})

window.addEventListener('resize', () => drawWave(null))

window.addEventListener('message', (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    bank = msg.bank
    packs = msg.packs
    packBase = msg.packBase
    dirty = false
    stopPreview()
    buffers.clear()
    peaksCache.clear()
    waveUrl = null
    if (!selected || !bank.events[selected]) selected = Object.keys(bank.events)[0] || null
    setStatus(`${Object.keys(bank.events).length} events`)
    renderHeader()
    renderEvents()
    renderDetail()
  } else if (msg.type === 'saved') {
    dirty = false
    setStatus('saved')
  } else if (msg.type === 'error') {
    setStatus(msg.message)
  }
})

vscode.postMessage({ type: 'ready' })
