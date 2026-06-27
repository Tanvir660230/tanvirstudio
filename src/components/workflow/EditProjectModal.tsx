
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { PremiumDatePicker } from '../PremiumDatePicker';
import { useSettings } from '../../contexts/SettingsContext';

interface EditProjectModalProps {
  isEditOpen: boolean;
  setIsEditOpen: (val: boolean) => void;
  editTaskData: any;
  setEditTaskData: (data: any) => void;
  handleEditTask: (e: React.FormEvent) => void;
  columns: any[];
  composers: any[];
  hummingArtists: any[];
  milestoneInput: string;
  setMilestoneInput: (val: string) => void;
  isAdmin: boolean;
  clients: any[];
}

export function EditProjectModal({
  isEditOpen, setIsEditOpen, editTaskData, setEditTaskData, handleEditTask,
  columns, composers, hummingArtists, milestoneInput, setMilestoneInput, isAdmin, clients
}: EditProjectModalProps) {
  const { settings } = useSettings();
  const [clientSearch, setClientSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (editTaskData?.client) setTimeout(() => setClientSearch(editTaskData.client), 0);
  }, [editTaskData?.id, editTaskData?.client]);

  const filteredClients = clients.filter((c: any) => {
    const q = clientSearch.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  return (
    <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project" size="lg">
      {editTaskData && (
        <form onSubmit={handleEditTask} style={{ maxHeight: '70vh', overflowY: 'auto', padding: '10px 16px' }}>

          <div className="form-group modal-2col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Project Title</label>
              <input type="text" className="form-input" value={editTaskData.title} onChange={e => setEditTaskData({ ...editTaskData, title: e.target.value })} required />
            </div>
            <div style={{ position: 'relative' }}>
              <label className="form-label">Client Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search client..."
                value={clientSearch}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={(e) => { if (!e.relatedTarget) setIsDropdownOpen(false); }}
                onChange={e => {
                  const val = e.target.value;
                  setClientSearch(val);
                  setEditTaskData({ ...editTaskData, client: val });
                  setIsDropdownOpen(true);
                }}
                required
              />
              {isDropdownOpen && clientSearch && filteredClients.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                  background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', boxShadow: 'none',
                  maxHeight: '200px', overflowY: 'auto', marginTop: '4px',
                }}>
                  {filteredClients.map((c: any) => (
                    <div
                      key={c.id}
                      onMouseDown={() => {
                        setEditTaskData({ ...editTaskData, client: c.name, clientEmail: c.email || editTaskData.clientEmail || '', clientPhone: c.phone || editTaskData.clientPhone || '' });
                        setClientSearch(c.name);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                        borderBottom: '1px solid var(--border-color)',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-color)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'var(--accent-blue)', color: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                        {(c.name || 'C').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</div>
                        {(c.email || c.phone) && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.email || c.phone}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group modal-2col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={editTaskData.status} onChange={e => setEditTaskData({ ...editTaskData, status: e.target.value })}>
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Delivery Date</label>
              <PremiumDatePicker selected={editTaskData.deliveryDate ? new Date(editTaskData.deliveryDate) : null} onChange={date => setEditTaskData({ ...editTaskData, deliveryDate: date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' })} placeholderText="No deadline set" />
            </div>
          </div>

          <div className="form-group modal-team-grid" style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Assign Composer</label>
              <select className="form-select" value={editTaskData.composerId || ''} onChange={e => {
                const uid = e.target.value;
                const comp = composers.find((c: any) => c.uid === uid);
                setEditTaskData({ ...editTaskData, composerId: uid, composerEmail: comp?.email || '' });
              }}>
                <option value="">-- Select Composer --</option>
                {composers.map((c: any) => <option key={c.uid} value={c.uid}>{c.name}</option>)}
              </select>
            </div>
            {isAdmin && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Composer Fee</label>
                  <select
                    style={{ fontSize: '12px', background: 'transparent', border: 'none', color: 'var(--color-info)', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
                    value={editTaskData.composerCommissionType || 'percentage'}
                    onChange={e => setEditTaskData({ ...editTaskData, composerCommissionType: e.target.value })}
                  >
                    <option value="percentage">% Pct</option>
                    <option value="flat">Flat</option>
                  </select>
                </div>
                {(!editTaskData.composerCommissionType || editTaskData.composerCommissionType === 'percentage') ? (
                  <input type="number" min="0" className="form-input" value={editTaskData.composerCommissionPct || 15} onChange={e => setEditTaskData({ ...editTaskData, composerCommissionPct: Number(e.target.value) })} />
                ) : (
                  <input type="number" className="form-input" value={editTaskData.composerCommissionAmount || ''} onChange={e => setEditTaskData({ ...editTaskData, composerCommissionAmount: Number(e.target.value) })} />
                )}
              </div>
            )}
          </div>

          <div className="form-group modal-2col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Recording Date</label>
              <PremiumDatePicker selected={editTaskData.recordingDate ? new Date(editTaskData.recordingDate) : null} onChange={date => setEditTaskData({ ...editTaskData, recordingDate: date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' })} placeholderText="No recording date" showTimeSelect workHoursStart={settings.workHoursStart ?? 8} workHoursEnd={settings.workHoursEnd ?? 22} />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <input type="checkbox" id="editHummingCheck" checked={editTaskData.needsHumming || false} onChange={(e) => setEditTaskData({ ...editTaskData, needsHumming: e.target.checked })} style={{ width: 16, height: 16 }} />
            <label htmlFor="editHummingCheck" style={{ fontSize: '14px', fontWeight: '500' }}>Requires Humming Artist?</label>
          </div>
          {editTaskData.needsHumming && (
            <div className="form-group modal-team-grid" style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Assign Humming Artist</label>
                <select className="form-select" value={editTaskData.hummingArtistId || ''} onChange={e => {
                  const uid = e.target.value;
                  const art = hummingArtists.find((a: any) => a.uid === uid);
                  setEditTaskData({ ...editTaskData, hummingArtistId: uid, hummingArtistEmail: art?.email || '' });
                }}>
                  <option value="">-- Select Artist --</option>
                  {hummingArtists.map((c: any) => <option key={c.uid} value={c.uid}>{c.name}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Humming Artist Fee</label>
                    <select
                      style={{ fontSize: '12px', background: 'transparent', border: 'none', color: 'var(--color-info)', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
                      value={editTaskData.hummingArtistCommissionType || 'percentage'}
                      onChange={e => setEditTaskData({ ...editTaskData, hummingArtistCommissionType: e.target.value })}
                    >
                      <option value="percentage">% Pct</option>
                      <option value="flat">Flat</option>
                    </select>
                  </div>
                  {(!editTaskData.hummingArtistCommissionType || editTaskData.hummingArtistCommissionType === 'percentage') ? (
                    <input type="number" min="0" className="form-input" value={editTaskData.hummingArtistCommissionPct || 15} onChange={e => setEditTaskData({ ...editTaskData, hummingArtistCommissionPct: Number(e.target.value) })} />
                  ) : (
                    <input type="number" className="form-input" value={editTaskData.hummingArtistCommissionAmount || ''} onChange={e => setEditTaskData({ ...editTaskData, hummingArtistCommissionAmount: Number(e.target.value) })} />
                  )}
                </div>
              )}
            </div>
          )}
          {isAdmin && (
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Total Cost</label>
                <input type="number" className="form-input" value={editTaskData.budget} onChange={e => setEditTaskData({ ...editTaskData, budget: e.target.value })} />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Update Milestones</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input type="text" className="form-input" placeholder="Add milestone..." value={milestoneInput} onChange={e => setMilestoneInput(e.target.value)} />
              <button type="button" className="btn btn-secondary" onClick={() => {
                if (milestoneInput.trim()) {
                  setEditTaskData({ ...editTaskData, milestones: [...(editTaskData.milestones || []), { text: milestoneInput, completed: false }] });
                  setMilestoneInput('');
                }
              }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(editTaskData.milestones || []).map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-color)', borderRadius: '6px', fontSize: '13px' }}>
                  <span>{m.text}</span>
                  <button type="button" style={{ border: 'none', background: 'transparent', color: 'var(--accent-red)', cursor: 'pointer' }} onClick={() => setEditTaskData({ ...editTaskData, milestones: editTaskData.milestones.filter((_: any, idx: number) => idx !== i) })}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: '12px' }}>Save Changes</button>
        </form>
      )}
    </Modal>
  );
}
