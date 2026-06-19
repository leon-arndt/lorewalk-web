import { useConnectionMode } from '@/contexts/ConnectionModeContext'

export function ModeToggle() {
  const { mode, setMode } = useConnectionMode()
  const isOnline = mode === 'online'

  return (
    <button
      onClick={() => setMode(isOnline ? 'offline' : 'online')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        isOnline
          ? 'bg-indigo-600 text-white'
          : 'bg-white/10 text-white/60'
      }`}
      title={isOnline ? 'Switch to offline (local data)' : 'Switch to online (Supabase)'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-white/30'}`} />
      {isOnline ? 'Online' : 'Offline'}
    </button>
  )
}
