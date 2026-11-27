import { createPortal } from 'react-dom'
import { useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { useProfile } from '@/contexts/ProfileContext'
import { InkButton } from '@/components/UI/Journal'
import { SCRIM } from '@/lib/paper'
import { ink, inkSoft, ochre, paperCard, paperLight, stamp } from '@/lib/theme'

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

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 4000, background: SCRIM,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 380, boxSizing: 'border-box', padding: 20,
        background: paperLight, border: `1.5px solid ${ink}`, borderRadius: 6,
        boxShadow: '2px 3px 0 rgba(51,40,30,0.35)', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, lineHeight: '26px', color: ink }}>{t('account_delete_title')}</h2>
        <p style={{ margin: 0, fontSize: 14, color: inkSoft, lineHeight: 1.45 }}>{t('account_delete_body')}</p>
        {profile.isPremium && (
          <p style={{
            margin: 0, fontSize: 14, color: ink, lineHeight: 1.45,
            background: paperCard, border: `1.5px dashed ${ochre}`, borderRadius: 4, padding: '10px 12px',
          }}>
            {t('account_delete_subscription')}
          </p>
        )}
        {failed && <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: stamp }}>{t('account_delete_failed')}</p>}

        <InkButton variant="danger" disabled={busy} onClick={() => void handleDelete()} style={{ marginTop: 4 }}>
          {busy ? t('account_delete_busy') : t('account_delete_confirm')}
        </InkButton>
        <InkButton variant="paper" disabled={busy} data-sfx="close" onClick={onClose}>
          {t('account_delete_cancel')}
        </InkButton>
      </div>
    </div>,
    document.body,
  )
}
