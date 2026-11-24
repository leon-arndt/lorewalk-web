import { useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'

// The last stop before an account deletion. On success the app reloads as a
// new guest, so this dialog only ever has to show the wait and the failure.
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLocale()
  const { profile, deleteAccount } = useProfile()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleDelete() {
    setBusy(true)
    setFailed(false)
    if (await deleteAccount()) return
    setFailed(true)
    setBusy(false)
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 380, background: 'white', borderRadius: 20, padding: 20,
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{t('account_delete_title')}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.45 }}>{t('account_delete_body')}</p>
        {profile.isPremium && (
          <p style={{
            margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.45,
            background: '#fffbeb', borderRadius: 12, padding: '10px 12px',
          }}>
            {t('account_delete_subscription')}
          </p>
        )}
        {failed && <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>{t('account_delete_failed')}</p>}

        <button
          disabled={busy}
          onClick={() => void handleDelete()}
          style={{
            padding: '12px 0', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 14,
            background: '#b91c1c', color: 'white', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? t('account_delete_busy') : t('account_delete_confirm')}
        </button>
        <button
          disabled={busy}
          data-sfx="close"
          onClick={onClose}
          style={{
            padding: '10px 0', borderRadius: 14, border: 'none', fontWeight: 600, fontSize: 14,
            background: '#f1f5f9', color: '#475569', cursor: busy ? 'default' : 'pointer',
          }}
        >
          {t('account_delete_cancel')}
        </button>
      </div>
    </div>
  )
}
