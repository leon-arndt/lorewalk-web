import { createPortal } from 'react-dom'
import { useState } from 'react'
import { useProfile } from '@/contexts/ProfileContext'
import { ShopPage } from '@/pages/ShopPage'
import { hudTag, paperPanel, paperTag, SCRIM } from '@/lib/paper'
import { ink } from '@/lib/theme'
import { AnimatePresence, motion } from 'motion/react'
import { CountBump } from '@/components/UI/CountBump'
import { EmojiSprite } from '@/components/UI/EmojiSprite'
import { sheetIn } from '@/lib/motion'

export function CoinCapsule() {
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
       
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          ...hudTag,
          minHeight: 40, padding: '0 11px 0 7px',
          fontSize: 15, fontWeight: 500, fontFamily: 'inherit',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <EmojiSprite id="item_coins" emoji="🪙" size={22} /> <CountBump value={profile.coins.toLocaleString()} />
      </button>

      {createPortal(
      <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="shop-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: SCRIM,
            }}
          />
          <motion.div
            key="shop-sheet"
            {...sheetIn}
            exit={{ y: '100%', transition: { duration: 0.22, ease: 'easeIn' } }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
              maxHeight: '88dvh',
              ...paperPanel,
              borderRadius: '10px 10px 0 0',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              flexShrink: 0, display: 'flex', justifyContent: 'center',
              padding: '10px 0 4px', position: 'relative', zIndex: 2,
            }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: ink }} />
              <button
                onClick={() => setOpen(false)}
                data-sfx="close"
                style={{
                  position: 'absolute', right: 8, top: 4, width: 44, height: 44,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{ ...paperTag, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, lineHeight: 1 }}>×</span>
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <ShopPage />
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>,
      document.body,
      )}
    </>
  )
}
