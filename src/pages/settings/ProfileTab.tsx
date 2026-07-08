import type { UserData } from '../../contexts/AuthContext';

interface ProfileTabProps {
  profileName: string;
  onProfileNameChange: (value: string) => void;
  userData: UserData | null;
  resetSent: boolean;
  onPasswordReset: () => void;
  roleColors: Record<string, string>;
  roleLabels: Record<string, string>;
}

export function ProfileTab({ profileName, onProfileNameChange, userData, resetSent, onPasswordReset, roleColors, roleLabels }: ProfileTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Avatar Hero */}
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
        <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', background: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 26, flexShrink: 0 }}>
          {profileName ? profileName[0].toUpperCase() : 'U'}
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>{profileName || 'Studio User'}</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)', fontWeight: 400 }}>{userData?.email}</div>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: roleColors[userData?.role || 'client'], background: 'var(--surface-1)', padding: '3px 10px', borderRadius: 'var(--radius-full)', display: 'inline-block', marginTop: 'var(--space-2)' }}>
            {roleLabels[userData?.role || 'client'] || userData?.role}
          </div>
        </div>
      </div>

      {/* iOS-style Form Group */}
      <div className="panel" style={{ padding: 0 }}>
        <div className="settings-row" style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Display Name</label>
          <input type="text" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={profileName} onChange={e => onProfileNameChange(e.target.value)} placeholder="Your full name" />
        </div>
        <div className="settings-row" style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.65 }}>
          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Email</label>
          <input type="email" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-tertiary)', outline: 'none', width: '60%' }} value={userData?.email || ''} disabled />
        </div>
        <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Password Reset</div>
          </div>
          <button onClick={onPasswordReset} disabled={resetSent} className={`btn ${resetSent ? 'btn-ghost' : 'btn-primary'} btn-sm`}>
            {resetSent ? '✓ Sent' : 'Send Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
