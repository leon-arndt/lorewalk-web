import { useConnectionMode } from '@/contexts/ConnectionModeContext'

export function ModeToggle() {
  const { mode, setMode } = useConnectionMode()
  const isOnline = mode === 'online'

  return (
    <button
      onClick={() => setMode(isOnline ? 'offline' : 'online')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 20,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        background: 'rgba(255,255,255,0.50)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.55)',
        color: isOnline ? '#6366f1' : '#94a3b8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.15s ease',
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isOnline ? '#4ade80' : '#cbd5e1',
        flexShrink: 0,
      }} />
      {isOnline ? 'Online' : 'Offline'}
    </button>
  )
}
