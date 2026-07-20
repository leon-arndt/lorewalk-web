import { accent } from '@/lib/theme'

export function ExpeditionsPage() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc', padding: 20 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: accent }}>Expeditions</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#94a3b8' }}>Send creatures out to explore</p>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧭</div>
        <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
          No active expeditions. Collect creatures first to send them out.
        </p>
      </div>
    </div>
  )
}
