import { useEffect, useMemo, useRef, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { DAILY_STEP_GOAL, localDateKey } from '@/lib/profile'
import { StepRing } from '@/components/UI/StepRing'
import {
  addJournalPhoto, getJournalPhotos, getJournalPhotoDates, deleteJournalPhoto,
  fileToCompressedDataUrl, type JournalPhoto,
} from '@/lib/journalDb'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function DayDetail({ dateKey, steps, onClose, onPhotosChanged }: {
  dateKey: string
  steps: number
  onClose: () => void
  onPhotosChanged: () => void
}) {
  const [photos, setPhotos] = useState<JournalPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => { getJournalPhotos(dateKey).then(setPhotos) }
  useEffect(() => { load() }, [dateKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const [y, m, d] = dateKey.split('-').map(Number)
  const title = `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${MONTHS[m - 1]} ${d}`

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await fileToCompressedDataUrl(file)
        await addJournalPhoto(dateKey, dataUrl)
      }
      load()
      onPhotosChanged()
    } catch {
      // ignore decode/quota failures
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    await deleteJournalPhoto(id)
    load()
    onPhotosChanged()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(15,10,30,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, maxHeight: '82dvh', overflowY: 'auto',
          background: 'white', borderRadius: '24px 24px 0 0',
          padding: '20px 20px calc(env(safe-area-inset-bottom) + 24px)',
          animation: 'panelSlideUp 0.34s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <StepRing progress={steps / DAILY_STEP_GOAL} size={64} stroke={7}>
            <span style={{ fontSize: 18 }}>{steps >= DAILY_STEP_GOAL ? '😄' : '👟'}</span>
          </StepRing>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{title}</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              {steps.toLocaleString()} / {DAILY_STEP_GOAL.toLocaleString()} steps
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Album</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#f1f5f9' }}>
              <img src={p.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                onClick={() => handleDelete(p.id)}
                style={{
                  position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                  border: 'none', background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label="Delete photo"
              >×</button>
            </div>
          ))}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{
              aspectRatio: '1', borderRadius: 12, cursor: busy ? 'default' : 'pointer',
              border: '2px dashed #c7d2fe', background: '#f5f7ff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              color: '#6366f1', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 26, lineHeight: 1 }}>{busy ? '⏳' : '📷'}</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{busy ? 'Adding' : 'Add'}</span>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}

export function JournalOverlay({ onClose }: { onClose: () => void }) {
  const { profile } = useProfile()
  const dailySteps = profile.dailySteps ?? {}
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [selected, setSelected] = useState<string | null>(null)
  const [photoDates, setPhotoDates] = useState<Set<string>>(new Set())

  const refreshPhotoDates = () => { getJournalPhotoDates().then(setPhotoDates) }
  useEffect(() => { refreshPhotoDates() }, [])

  const todayKey = localDateKey(new Date())
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDow; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month])

  const monthSteps = useMemo(() => {
    const prefix = `${year}-${(month + 1).toString().padStart(2, '0')}`
    let total = 0
    for (const [k, v] of Object.entries(dailySteps)) {
      if (k.startsWith(prefix)) total += v
    }
    return total
  }, [dailySteps, year, month])

  const isCurrentOrPastMonth = new Date(year, month, 1) <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto',
      background: 'linear-gradient(160deg, #f8faff 0%, #f2efff 55%, #fdf6ff 100%)',
      animation: 'panelSlideUp 0.34s cubic-bezier(0.16,1,0.3,1)',
      paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 20px 12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1e293b' }}>Journal</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Your daily steps and photo album.</p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: 'white', color: '#64748b', fontSize: 18, cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Close journal"
        >×</button>
      </div>

      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px' }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{MONTHS[month]} {year}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{monthSteps.toLocaleString()} steps this month</div>
        </div>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          disabled={isCurrentOrPastMonth === false}
          style={{ ...navBtn, opacity: isCurrentOrPastMonth ? 1 : 0.3 }}
        >›</button>
      </div>

      {/* Weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 12px 0' }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '4px 12px' }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const key = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          const steps = dailySteps[key] ?? 0
          const isToday = key === todayKey
          const isFuture = key > todayKey
          const hasPhotos = photoDates.has(key)
          const goalMet = steps >= DAILY_STEP_GOAL
          return (
            <button
              key={i}
              onClick={() => { if (!isFuture) setSelected(key) }}
              disabled={isFuture}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 0', border: 'none', borderRadius: 12,
                background: isToday ? 'rgba(99,102,241,0.10)' : 'transparent',
                cursor: isFuture ? 'default' : 'pointer', opacity: isFuture ? 0.35 : 1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <StepRing progress={steps / DAILY_STEP_GOAL} size={34} stroke={3.5}>
                {goalMet
                  ? <span style={{ fontSize: 13 }}>😄</span>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#6366f1' : '#475569' }}>{day}</span>}
              </StepRing>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: hasPhotos ? '#f472b6' : 'transparent',
              }} />
            </button>
          )
        })}
      </div>

      {selected && (
        <DayDetail
          dateKey={selected}
          steps={dailySteps[selected] ?? 0}
          onClose={() => setSelected(null)}
          onPhotosChanged={refreshPhotoDates}
        />
      )}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', border: 'none',
  background: 'white', color: '#6366f1', fontSize: 20, fontWeight: 700,
  cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  WebkitTapHighlightColor: 'transparent',
}
