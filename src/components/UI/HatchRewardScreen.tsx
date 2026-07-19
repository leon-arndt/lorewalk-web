import { useState } from 'react'
import { CreaturePreview } from '@/components/UI/CreaturePreview'
import type { HatchedCreature } from '@/types'

export function HatchRewardScreen({ creature, onRename, onDismiss }: {
  creature: HatchedCreature
  onRename: (nickname: string) => void
  onDismiss: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(creature.nickname ?? creature.species)

  function handleSave() {
    const trimmed = name.trim()
    setName(trimmed || creature.species)
    onRename(trimmed)
    setEditing(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: creature.isShiny ? 'rgba(30,20,0,0.95)' : 'rgba(10,8,30,0.93)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 18, padding: 24,
    }}>
      {creature.isShiny && (
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 5,
          color: '#f59e0b', textTransform: 'uppercase',
        }}>
          ✨ Shiny!
        </div>
      )}

      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: 5,
        color: creature.isShiny ? '#fcd34d' : '#6ee7b7', textTransform: 'uppercase',
      }}>
        Hatched!
      </div>

      <CreaturePreview species={creature.species} emoji={creature.emoji} creatureType={creature.creatureType} isShiny={creature.isShiny} size={140} />

      {editing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            maxLength={24}
            style={{
              fontSize: 18, fontWeight: 700, color: '#1e293b',
              border: '2px solid #34d399', borderRadius: 10,
              padding: '6px 12px', outline: 'none', textAlign: 'center',
            }}
          />
          <button
            onClick={handleSave}
            style={{
              background: '#34d399', color: 'white', border: 'none',
              borderRadius: 10, padding: '6px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>{name}</span>
          <button
            onClick={() => setEditing(true)}
            title="Rename"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 0 }}
          >
            ✏️
          </button>
        </div>
      )}

      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
        From {creature.poiOriginName}
      </div>

      <button
        onClick={onDismiss}
        style={{
          marginTop: 14, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none',
          borderRadius: 999, padding: '10px 32px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}
      >
        Continue
      </button>
    </div>
  )
}
