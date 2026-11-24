import { useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useProfile } from '@/contexts/ProfileContext'
import { GoogleSignInButton } from '@/components/UI/GoogleSignInButton'
import { DeleteAccountDialog } from '@/components/UI/DeleteAccountDialog'
import { accent } from '@/lib/theme'

const hint = { fontSize: 12, color: '#94a3b8' } as const

// The Settings card for the account: sign in, cloud save status, sign out, delete.
export function AccountSection() {
  const { t } = useLocale()
  const { mode } = useConnectionMode()
  const { account, cloudSave, setCloudConflictOpen, signOut } = useProfile()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const linked = !!account && !account.isAnonymous

  let status: string | null = null
  if (cloudSave.status === 'syncing') status = t('account_sync_saving')
  else if (cloudSave.status === 'synced') status = t('account_sync_saved')
  else if (cloudSave.status === 'error') status = t('account_sync_error')

  return (
    <section>
      <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: accent }}>
        {t('account_title')}
      </h2>
      <div style={{
        background: 'white', borderRadius: 16, padding: '14px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {linked ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {account.email ? t('account_signed_in_as', { email: account.email }) : t('account_signed_in_google')}
                </div>
                {!cloudSave.conflict && status && (
                  <div data-testid="cloud-save-status" style={{ ...hint, marginTop: 2 }}>{status}</div>
                )}
              </div>
              <button
                onClick={() => void signOut()}
                style={{
                  flexShrink: 0, padding: '8px 14px', borderRadius: 12, border: 'none',
                  background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                {t('account_sign_out')}
              </button>
            </div>
            {cloudSave.conflict && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>{t('account_conflict_title')}</div>
                <button
                  onClick={() => setCloudConflictOpen(true)}
                  style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: 12, border: 'none',
                    background: accent, color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {t('account_conflict_choose')}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: '#1e293b' }}>{t('account_desc')}</div>
            {mode !== 'online' && <div style={hint}>{t('account_offline_hint')}</div>}
            {mode === 'online' && (account ? <GoogleSignInButton /> : <div style={hint}>{t('account_unavailable')}</div>)}
          </>
        )}
        {/* A guest has server rows too (friend code, public stats), so the
            delete is there for every online account, linked or not. */}
        {mode === 'online' && account && (
          <button
            onClick={() => setDeleteOpen(true)}
            style={{
              alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none',
              color: '#b91c1c', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            {t('account_delete')}
          </button>
        )}
      </div>
      {deleteOpen && <DeleteAccountDialog onClose={() => setDeleteOpen(false)} />}
    </section>
  )
}
