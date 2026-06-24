import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useLocale } from '@/contexts/LocaleContext'
import { glassChrome } from '@/lib/glass'

export function ModeToggle() {
  const { mode, setMode } = useConnectionMode()
  const { t } = useLocale()
  const isOnline = mode === 'online'

  return (
    <button
      onClick={() => setMode(isOnline ? 'offline' : 'online')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        ...glassChrome,
        color: isOnline ? '#6366f1' : '#94a3b8',
        transition: 'color 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isOnline ? '#4ade80' : '#cbd5e1',
        flexShrink: 0,
        boxShadow: isOnline ? '0 0 6px rgba(74,222,128,0.6)' : 'none',
        transition: 'background 0.2s ease, box-shadow 0.2s ease',
      }} />
      {isOnline ? t('mode_online') : t('mode_offline')}
    </button>
  )
}
