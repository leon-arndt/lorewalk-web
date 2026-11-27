import { useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { useConnectionMode } from '@/contexts/ConnectionModeContext'
import { useProfile } from '@/contexts/ProfileContext'
import { GoogleSignInButton } from '@/components/UI/GoogleSignInButton'
import { DeleteAccountDialog } from '@/components/UI/DeleteAccountDialog'
import { InkButton, Mono, NoteCard, SectionTitle } from '@/components/UI/Journal'
import { ink, line, stamp } from '@/lib/theme'

const hint = { display: 'block', fontSize: 12, lineHeight: '16px' } as const
const actionButton = { flex: 1, minWidth: 0, padding: '6px 10px', fontSize: 14 } as const

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
      <SectionTitle>{t('account_title')}</SectionTitle>
      <NoteCard taped style={{ padding: '16px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {linked ? (
          <>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, lineHeight: '20px', color: ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {account.email ? t('account_signed_in_as', { email: account.email }) : t('account_signed_in_google')}
              </div>
              {!cloudSave.conflict && status && (
                <div data-testid="cloud-save-status" style={{ marginTop: 2 }}>
                  <Mono style={{ ...hint, color: cloudSave.status === 'error' ? stamp : undefined }}>{status}</Mono>
                </div>
              )}
            </div>
            {cloudSave.conflict && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: stamp }}>{t('account_conflict_title')}</div>
                <InkButton onClick={() => setCloudConflictOpen(true)} style={{ flexShrink: 0, fontSize: 14 }}>
                  {t('account_conflict_choose')}
                </InkButton>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, lineHeight: '20px', color: ink }}>{t('account_desc')}</div>
            {mode !== 'online' && <Mono style={hint}>{t('account_offline_hint')}</Mono>}
            {mode === 'online' && (account ? <GoogleSignInButton /> : <Mono style={hint}>{t('account_unavailable')}</Mono>)}
          </>
        )}
        {/* Both always show. Only a Google account has a login to sign out of.
            Delete works for every player, guest or signed in, online or not. */}
        <div style={{ borderTop: `1px solid ${line}`, paddingTop: 12, display: 'flex', gap: 10 }}>
          <InkButton variant="paper" onClick={() => void signOut()} disabled={!linked} style={actionButton}>
            {t('account_sign_out')}
          </InkButton>
          <InkButton variant="danger" onClick={() => setDeleteOpen(true)} style={actionButton}>
            {t('account_delete')}
          </InkButton>
        </div>
        {!linked && <Mono style={hint}>{t('account_sign_out_guest_hint')}</Mono>}
      </NoteCard>
      {deleteOpen && <DeleteAccountDialog onClose={() => setDeleteOpen(false)} />}
    </section>
  )
}
