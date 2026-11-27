import { useState } from 'react'
import type { PlayerProfile } from '@/types'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { InkButton, Mono } from '@/components/UI/Journal'
import { SCRIM } from '@/lib/paper'
import { accentSoft, forest, ink, inkSoft, line, paperCard, paperLight, edge } from '@/lib/theme'

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
        position: 'fixed', inset: 0, zIndex: 4000, background: SCRIM,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 380, boxSizing: 'border-box', padding: 20,
        background: paperLight, border: `1px solid ${edge}`, borderRadius: 10,
        boxShadow: '2px 3px 0 rgba(51,40,30,0.35)', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, lineHeight: '26px', color: ink }}>{t('account_conflict_title')}</h2>
        <p style={{ margin: 0, fontSize: 13, color: inkSoft, lineHeight: 1.45 }}>{t('account_conflict_body')}</p>

        {options.map((option) => {
          const selected = choice === option.id
          return (
            <button
              key={option.id}
              aria-pressed={selected}
              onClick={() => setChoice(option.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 44,
                textAlign: 'left', padding: '10px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${selected ? ink : line}`,
                background: selected ? accentSoft : paperCard,
                boxShadow: selected ? 'none' : '1px 2px 0 rgba(51,40,30,0.18)',
              }}
            >
              <span aria-hidden style={{
                width: 18, height: 18, boxSizing: 'border-box', flexShrink: 0, borderRadius: '50%',
                border: `1.5px solid ${ink}`, background: selected ? forest : paperCard,
                boxShadow: selected ? `inset 0 0 0 3px ${paperCard}` : 'none',
              }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 500, lineHeight: '20px', color: ink }}>{option.title}</span>
                {option.lines.map((text) => (
                  <Mono key={text} style={{ fontSize: 12, lineHeight: '16px' }}>{text}</Mono>
                ))}
              </span>
            </button>
          )
        })}

        <InkButton
          disabled={!choice}
          onClick={() => {
            if (!choice) return
            setChoice(null)
            void resolveCloudConflict(choice)
          }}
          style={{ marginTop: 4 }}
        >
          {t('account_conflict_confirm')}
        </InkButton>
        <InkButton variant="paper" data-sfx="close" onClick={() => { setChoice(null); setCloudConflictOpen(false) }}>
          {t('account_conflict_later')}
        </InkButton>
      </div>
    </div>
  )
}
