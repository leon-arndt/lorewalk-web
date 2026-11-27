import { createPortal } from 'react-dom'
import { useState } from 'react'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
import type { HatchedCreature } from '@/types'
import { motion } from 'motion/react'
import { InkButton, Mono, NoteCard, Stamp } from '@/components/UI/Journal'
import { useLocale } from '@/contexts/LocaleContext'
import { CREATURES } from '@/data/creatures'
import { MONO, SCRIM_DEEP, tape } from '@/lib/paper'
import { categoryCss, ink, inkSoft, line, paperCard, ochreInk, edge } from '@/lib/theme'


export function HatchRewardScreen({ creature, onRename, onDismiss }: {
  creature: HatchedCreature
  onRename: (nickname: string) => void
  onDismiss: () => void
}) {
  const { t } = useLocale()
  const no = CREATURES.findIndex((c) => c.species === creature.species) + 1
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(creature.nickname ?? creature.species)

  function handleSave() {
    const trimmed = name.trim()
    setName(trimmed || creature.species)
    onRename(trimmed)
    setEditing(false)
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: SCRIM_DEEP,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* The notebook page. The new specimen card lands on it, then the stamp. */}
      <NoteCard style={{
        width: '100%', maxWidth: 320, padding: '30px 20px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        boxShadow: '3px 4px 0 rgba(51,40,30,0.35)',
      }}>
        <motion.div
          initial={{ scale: 0, rotate: -20, y: 40 }}
          animate={{ scale: 1, rotate: -1.5, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }}
          style={{
            position: 'relative', padding: '8px 8px 6px',
            background: paperCard, border: `1px solid ${creature.isShiny ? ochreInk : line}`, borderRadius: 6,
            boxShadow: '1px 2px 0 rgba(51,40,30,0.22)',
          }}
        >
          <span aria-hidden style={{ ...tape, top: -10, left: '50%', marginLeft: -29, transform: 'rotate(-3deg)' }} />
          <CreaturePreview
            species={creature.species} emoji={creature.emoji} creatureType={creature.creatureType} isShiny={creature.isShiny}
            size={140} wash={categoryCss(creature.poiCategory)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 5 }}>
            <Mono>{no > 0 ? t('creatures_specimen_no', { n: String(no).padStart(2, '0') }) : ''}</Mono>
            {creature.isShiny && (
              <Mono style={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: ochreInk }}>
                ✨ Shiny!
              </Mono>
            )}
          </div>
          <motion.div
            initial={{ scale: 2.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.5, 0, 1, 0.6], delay: 0.6 }}
            style={{ position: 'absolute', top: 14, right: -22 }}
          >
            <Stamp tilt={8} style={{ fontSize: 13, lineHeight: '16px', padding: '4px 9px' }}>
              Hatched!
            </Stamp>
          </motion.div>
        </motion.div>

        {editing ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, width: '100%' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              maxLength={24}
              style={{
                flex: 1, minWidth: 0, height: 44,
                fontFamily: MONO, fontSize: 17, fontWeight: 500, color: ink,
                background: 'transparent', border: 'none', borderBottom: `1px solid ${edge}`, borderRadius: 0,
                padding: '0 4px', outline: 'none', textAlign: 'center',
              }}
            />
            <InkButton onClick={handleSave}>
              Save
            </InkButton>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', width: '100%', minHeight: 44,
            borderBottom: `1px solid ${line}`,
          }}>
            <span aria-hidden style={{ width: 44, flexShrink: 0 }} />
            <span style={{
              flex: 1, minWidth: 0, fontSize: 24, fontWeight: 600, lineHeight: '30px', color: ink,
              textAlign: 'center', overflowWrap: 'anywhere',
            }}>
              {name}
            </span>
            <button
              onClick={() => setEditing(true)}
              title="Rename"
              style={{
                width: 44, height: 44, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: inkSoft, padding: 0,
              }}
            >
              ✏️
            </button>
          </div>
        )}

        <Mono style={{ textAlign: 'center' }}>
          From {creature.poiOriginName}
        </Mono>

        <InkButton onClick={onDismiss} style={{ width: '100%', marginTop: 4 }}>
          Continue
        </InkButton>
      </NoteCard>
    </motion.div>,
    document.body,
  )
}
