import { useLocale } from '@/contexts/LocaleContext'
import { creatureName } from '@/lib/profile'
import { CreatureSceneCard } from '@/components/UI/CreatureDetailView'
import type { HatchedCreature } from '@/types'
import { accent } from '@/lib/theme'

// Pikmin Bloom-style roster: bare creatures on type-coloured pads, no card chrome.
export function CreatureTile({ creature, onTap, disabled, note }: {
  creature: HatchedCreature
  onTap: () => void
  disabled?: boolean
  note?: string
}) {
  const { t } = useLocale()
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      className="flex min-w-0 flex-col items-center rounded-2xl px-1 pt-2 pb-2 transition-colors enabled:hover:bg-white/40 enabled:active:bg-white/70 disabled:opacity-45"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <CreatureSceneCard creature={creature} />
      <span className="mt-0.5 w-full truncate text-center text-[11px] font-semibold text-slate-800">
        {creatureName(creature)}
      </span>
      <span className="text-[10px] font-semibold tabular-nums" style={{ color: accent }}>
        {t('level_badge', { level: creature.level })}
      </span>
      {note && <span className="w-full truncate text-center text-[9px] font-medium text-slate-500">{note}</span>}
    </button>
  )
}

// A free slot: just the empty pad a creature would stand on. With onTap it
// becomes an add button with a plus hovering where the creature would be.
export function EmptyPad({ onTap, disabled }: { onTap?: () => void; disabled?: boolean }) {
  const { t } = useLocale()
  const pad = <div className="h-[14px] w-14 rounded-[50%] bg-slate-500/10" />
  if (!onTap) {
    return (
      <div aria-hidden className="flex min-h-[112px] justify-center pt-[64px]">{pad}</div>
    )
  }
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label={t('squads_add_creature')}
      className="flex min-h-[112px] flex-col items-center rounded-2xl pt-4 transition-colors enabled:hover:bg-white/40 enabled:active:bg-white/70 disabled:opacity-40"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className="mb-2 flex size-9 items-center justify-center rounded-full border-2 border-dashed text-lg font-semibold"
        style={{ borderColor: 'rgba(22,101,52,0.30)', color: accent }}
      >
        +
      </span>
      {pad}
    </button>
  )
}
