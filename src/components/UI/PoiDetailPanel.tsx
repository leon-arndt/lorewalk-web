import type { Poi } from '@/types'

interface PoiDetailPanelProps {
  poi: Poi
  onClose: () => void
}

export function PoiDetailPanel({ poi, onClose }: PoiDetailPanelProps) {
  const isPermanent = poi.kind === 'permanent'

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#1a0a2e] border-t border-white/10 rounded-t-2xl p-5 pb-safe z-10 shadow-2xl">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPermanent ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'
            }`}
          >
            {isPermanent ? 'Landmark' : 'Event'}
          </span>
          {poi.activeUntil && (
            <span className="text-xs text-white/40">
              Until {new Date(poi.activeUntil).toLocaleDateString()}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <h2 className="text-white font-semibold text-lg leading-snug mb-1">{poi.name}</h2>
      <p className="text-white/60 text-sm leading-relaxed">{poi.description}</p>

      {poi.creatureRewardId && (
        <div className="mt-3 flex items-center gap-2 text-sm text-indigo-300">
          <span>🌿</span>
          <span>Visit to unlock a creature</span>
        </div>
      )}
    </div>
  )
}
