import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocale, LOCALE_LABELS } from '@/contexts/LocaleContext'
import type { Locale } from '@/contexts/LocaleContext'
import { accent } from '@/lib/theme'

const ENTRIES = Object.entries(LOCALE_LABELS) as [Locale, string][]

function LanguagesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function LanguageDropdown() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <motion.button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: 'white', borderRadius: 16, padding: '12px 16px',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <span style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: `color-mix(in srgb, ${accent} 12%, white)`, color: accent,
        }}>
          <LanguagesIcon />
        </span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
          {LOCALE_LABELS[locale]}
        </span>
        <motion.svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-activedescendant={`lang-${locale}`}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1,
              padding: 6,
              background: 'white', borderRadius: 16, transformOrigin: 'top center',
              boxShadow: '0 12px 32px rgba(15,23,42,0.16), 0 2px 8px rgba(15,23,42,0.08)',
            }}
          >
            {ENTRIES.map(([code, label], i) => {
              const selected = code === locale
              return (
                <motion.button
                  type="button"
                  key={code}
                  id={`lang-${code}`}
                  role="option"
                  aria-selected={selected}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => { setLocale(code); setOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: selected ? 700 : 500,
                    color: selected ? accent : '#334155',
                    background: selected ? `color-mix(in srgb, ${accent} 10%, white)` : 'transparent',
                  }}
                >
                  <span style={{ flex: 1 }}>{label}</span>
                  {selected && <CheckIcon />}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
