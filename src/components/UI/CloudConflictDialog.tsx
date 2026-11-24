import { useState } from 'react'
import type { PlayerProfile } from '@/types'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { accent, accentSoft } from '@/lib/theme'

type Choice = 'device' | 'cloud'

// Shown when this device and the account each hold progress that the other
// lacks. The choice deletes one save, so it takes two taps: pick, then confirm.
export function CloudConflictDialog() {
  const { t, locale } = useLocale()
  const { profile, cloudSave, resolveCloudConflict, setCloudConflictOpen } = useProfile()
  const [choice, setChoice] = useState<Choice | null>(null)

  const conflict = cloudSave.conflict
  if (!conflict || !cloudSave.conflictOpen) return null

  const summary = (p: PlayerProfile) => t('account_conflict_summary', {
    level: p.level,
    creatures: p.hatchedCreatures.length,
    places: p.visitHistory.length,
  })
  const savedOn = new Date(conflict.updatedAt).toLocaleDateString(locale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const options: { id: Choice; title: string; lines: string[] }[] = [
    { id: 'device', title: t('account_conflict_device'), lines: [summary(profile)] },
    { id: 'cloud', title: t('account_conflict_cloud'), lines: [summary(conflict.cloud), t('account_conflict_saved_on', { date: savedOn })] },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 380, background: 'white', borderRadius: 20, padding: 20,
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{t('account_conflict_title')}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.45 }}>{t('account_conflict_body')}</p>

        {options.map((option) => {
          const selected = choice === option.id
          return (
            <button
              key={option.id}
              aria-pressed={selected}
              onClick={() => setChoice(option.id)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                border: `2px solid ${selected ? accent : '#e2e8f0'}`,
                background: selected ? accentSoft : 'white',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{option.title}</div>
              {option.lines.map((line) => (
                <div key={line} style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{line}</div>
              ))}
            </button>
          )
        })}

        <button
          disabled={!choice}
          onClick={() => {
            if (!choice) return
            setChoice(null)
            void resolveCloudConflict(choice)
          }}
          style={{
            padding: '12px 0', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 14,
            background: choice ? accent : '#e2e8f0', color: choice ? 'white' : '#94a3b8',
            cursor: choice ? 'pointer' : 'default',
          }}
        >
          {t('account_conflict_confirm')}
        </button>
        <button
          data-sfx="close"
          onClick={() => { setChoice(null); setCloudConflictOpen(false) }}
          style={{
            padding: '6px 0', border: 'none', background: 'none',
            color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          {t('account_conflict_later')}
        </button>
      </div>
    </div>
  )
}
