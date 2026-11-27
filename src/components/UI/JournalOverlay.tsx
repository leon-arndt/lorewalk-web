import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { useLocale } from '@/contexts/LocaleContext'
import { DAILY_STEP_GOAL, localDateKey } from '@/lib/profile'
import { StepRing } from '@/components/UI/StepRing'
import {
  addJournalPhoto, getJournalPhotos, getJournalPhotoDates, deleteJournalPhoto,
  fileToCompressedDataUrl, type JournalPhoto,
} from '@/lib/journalDb'
import { indigo, ink, inkSoft, line, paperCard, paperLight, paperShade } from '@/lib/theme'
import { paperPage, paperSheet, paperTag, SCRIM } from '@/lib/paper'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { Mono, NoteCard, PageHeader, SectionTitle } from '@/components/UI/Journal'
import { motion } from 'motion/react'
import { sheetIn, backdropIn } from '@/lib/motion'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function DayDetail({ dateKey, steps, onClose, onPhotosChanged }: {
  dateKey: string
  steps: number
  onClose: () => void
  onPhotosChanged: () => void
}) {
  const { t } = useLocale()
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
    <motion.div {...backdropIn(SCRIM)}
      onClick={onClose}
      data-sfx="close"
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div {...sheetIn}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, maxHeight: '82dvh', overflowY: 'auto',
          ...paperSheet, borderRadius: '10px 10px 0 0',
          padding: '10px 20px calc(env(safe-area-inset-bottom) + 24px)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: ink, margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <StepRing progress={steps / DAILY_STEP_GOAL} size={64} stroke={7}>
            {steps >= DAILY_STEP_GOAL
              ? <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-11" /></svg>
              : <EmojiSprite id="item_sneaker" emoji="👟" size={26} />}
          </StepRing>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 600, lineHeight: '28px', letterSpacing: '-0.01em', color: ink }}>{title}</h2>
            <Mono style={{ display: 'block', fontSize: 12, lineHeight: '18px', color: inkSoft }}>
              {steps.toLocaleString()} / {DAILY_STEP_GOAL.toLocaleString()} steps
            </Mono>
          </div>
        </div>

        <SectionTitle note={<>{photos.length} photo{photos.length === 1 ? '' : 's'}</>}>Album</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '2px 2px 6px' }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{
              position: 'relative', aspectRatio: '1', boxSizing: 'border-box',
              padding: 5, background: paperCard, border: `1px solid ${line}`, borderRadius: 2,
              boxShadow: '1px 2px 0 rgba(51,40,30,0.18)',
              transform: `rotate(${PHOTO_TILTS[i % PHOTO_TILTS.length]}deg)`,
            }}>
              <img src={p.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: paperShade }} />
              <button
                onClick={() => handleDelete(p.id)}
                style={{
                  position: 'absolute', top: -6, right: -6, width: 44, height: 44, padding: 0,
                  border: 'none', background: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                  fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                }}
                aria-label={t('journal_delete_photo')}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: 10, background: ink, color: paperLight,
                  border: `1.5px solid ${paperLight}`, fontSize: 15, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</span>
              </button>
            </div>
          ))}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{
              aspectRatio: '1', borderRadius: 6, cursor: busy ? 'default' : 'pointer',
              border: '1.5px dashed #8C7A5C', background: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              color: ink, fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{busy ? '⏳' : '📷'}</span>
            <Mono style={{ fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: inkSoft }}>{busy ? 'Adding' : 'Add'}</Mono>
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
      </motion.div>
    </motion.div>
  )
}

export function JournalOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useLocale()
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

  return createPortal(
    <motion.div {...sheetIn} style={{
      position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto',
      ...paperPage,
      paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
    }}>
      {/* Header */}
      <PageHeader
        title="Journal"
        right={
          <button
            onClick={onClose}
            style={{ ...roundBtn, fontSize: 24 }}
            aria-label={t('journal_close')}
            data-sfx="close"
          >×</button>
        }
      />
      <p style={{ margin: 0, padding: '8px 16px 4px', fontSize: 13, color: inkSoft }}>{t('journal_subtitle')}</p>

      <NoteCard taped tilt={-0.4} style={{ margin: '22px 14px 0', padding: '14px 8px 10px' }}>
        {/* Month header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 10px' }}>
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={roundBtn}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 600, lineHeight: '26px', color: ink }}>{MONTHS[month]} {year}</div>
            <Mono style={{ display: 'block' }}>{monthSteps.toLocaleString()} steps this month</Mono>
          </div>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            disabled={isCurrentOrPastMonth === false}
            style={{ ...roundBtn, opacity: isCurrentOrPastMonth ? 1 : 0.3 }}
          >›</button>
        </div>

        {/* Weekday labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '6px 0 4px', borderTop: `1px dashed ${line}` }}>
          {WEEKDAYS.map((w) => (
            <Mono key={w} style={{ textAlign: 'center', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: inkSoft }}>{w}</Mono>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
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
                  padding: '6px 0', borderRadius: 6,
                  border: `1.5px solid ${isToday ? ink : 'transparent'}`,
                  background: isToday ? paperCard : 'transparent',
                  cursor: isFuture ? 'default' : 'pointer', opacity: isFuture ? 0.35 : 1,
                  fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <StepRing progress={steps / DAILY_STEP_GOAL} size={34} stroke={3.5}>
                  {goalMet
                    ? <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-11" /></svg>
                    : <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 500, color: isToday ? ink : inkSoft }}>{day}</span>}
                </StepRing>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: hasPhotos ? indigo : 'transparent',
                }} />
              </button>
            )
          })}
        </div>
      </NoteCard>

      {selected && (
        <DayDetail
          dateKey={selected}
          steps={dailySteps[selected] ?? 0}
          onClose={() => setSelected(null)}
          onPhotosChanged={refreshPhotoDates}
        />
      )}
    </motion.div>,
    document.body,
  )
}

// Photos sit a little crooked, like prints glued into a diary.
const PHOTO_TILTS = [-1.5, 1, -0.8, 1.6, -1.2, 0.7]

const roundBtn: React.CSSProperties = {
  ...paperTag, width: 44, height: 44, padding: 0, flexShrink: 0,
  fontSize: 24, lineHeight: 1, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  WebkitTapHighlightColor: 'transparent',
}
