import { accent } from '@/lib/theme'

export function ExpeditionsPage() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#FBF6E9', padding: 20 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600, color: accent }}>Expeditions</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#75634C' }}>Send creatures out to explore</p> {/* i18n-ignore: unrouted, unimported dead code, see CLAUDE.md project structure notes */}
      <div style={{
        background: '#fff', borderRadius: 6, padding: 24,
        boxShadow: '1px 2px 0 rgba(51,40,30,0.18)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧭</div>
        <p style={{ margin: 0, fontSize: 14, color: '#75634C' }}>
          No active expeditions. Collect creatures first to send them out.
        </p>
      </div>
    </div>
  )
}
