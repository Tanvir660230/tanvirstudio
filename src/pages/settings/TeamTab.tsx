import type { Dispatch, SetStateAction } from 'react';
import { Trash2 } from 'lucide-react';
import type { StudioUser } from '../../types';

interface TeamTabProps {
  users: StudioUser[];
  filteredUsers: StudioUser[];
  teamSearch: string;
  setTeamSearch: Dispatch<SetStateAction<string>>;
  roleColors: Record<string, string>;
  currentUid: string | undefined;
  updateUser: (id: string, item: Partial<StudioUser>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  fireToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function TeamTab({ users, filteredUsers, teamSearch, setTeamSearch, roleColors, currentUid, updateUser, removeUser, fireToast }: TeamTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Team <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>{users.length} members</span></div>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/'); fireToast('Invite link copied!'); }}
          className="btn" style={{ color: 'var(--color-info)', border: '1px solid rgba(0,122,255,0.2)', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,122,255,0.06)' }}>
          Copy invite link
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <input type="text" placeholder="Search team members..." style={{ width: '100%', padding: '9px 12px 9px 40px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontSize: 16, fontWeight: 400, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} value={teamSearch} onChange={e => setTeamSearch(e.target.value)} />
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>🔍</span>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {filteredUsers.map((u, idx: number) => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: idx === filteredUsers.length - 1 ? 'none' : '1px solid var(--border-color)', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${roleColors[u.role] || '#8E8E93'}18`, color: roleColors[u.role] || '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {u.name ? u.name[0].toUpperCase() : 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{u.name || 'Studio User'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 13, fontWeight: 400, padding: '6px 10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }} value={u.role || 'client'} onChange={e => { updateUser(u.id, { role: e.target.value as StudioUser['role'] }); fireToast('Role updated!'); }}>
                <option value="client">Client</option>
                <option value="composer">Composer</option>
                <option value="humming_artist">Vocal Artist</option>
                <option value="admin">Admin</option>
              </select>
              {currentUid !== u.id && (
                <button
                  title="Remove Member"
                  onClick={() => { if(window.confirm(`Remove ${u.name || 'this user'}?`)) { removeUser(u.id); fireToast('Member removed.'); } }}
                  style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
