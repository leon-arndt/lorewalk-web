import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocale, LOCALE_LABELS } from '@/contexts/LocaleContext'
import type { Locale } from '@/contexts/LocaleContext'
import { ink, line, paperLight, paperShade, edge } from '@/lib/theme'
import { paperCardStyle } from '@/lib/paper'

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
        style={{
          ...paperCardStyle,
          width: '100%', minHeight: 56, display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{
          width: 34, height: 34, boxSizing: 'border-box', borderRadius: 10, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: paperLight, border: `1px solid ${edge}`, color: ink,
        }}>
          <LanguagesIcon />
        </span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: ink }}>
          {LOCALE_LABELS[locale]}
        </span>
        <motion.svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink}
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
              padding: 0, overflow: 'hidden',
              background: paperLight, border: `1px solid ${edge}`, borderRadius: 10, transformOrigin: 'top center',
              boxShadow: '2px 3px 0 rgba(51,40,30,0.18)',
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
                    width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    padding: '0 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    borderTop: i > 0 ? `1px solid ${line}` : 'none',
                    fontSize: 15, fontWeight: selected ? 600 : 500, color: ink,
                    background: selected ? paperShade : 'transparent',
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
