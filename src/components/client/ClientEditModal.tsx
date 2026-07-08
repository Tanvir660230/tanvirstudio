import React from 'react';
import { Modal } from '../Modal';
import { Spinner } from '../Spinner';
import { Mail, Phone, Save } from 'lucide-react';
import type { Client } from '../../types';

interface ClientEditModalProps {
  isEditModalOpen: boolean;
  setIsEditModalOpen: (v: boolean) => void;
  isSaving: boolean;
  handleEditClient: (e: React.FormEvent) => void;
  editClientData: Client | null;
  setEditClientData: React.Dispatch<React.SetStateAction<Client | null>>;
}

export function ClientEditModal({
  isEditModalOpen, setIsEditModalOpen, isSaving, handleEditClient,
  editClientData, setEditClientData,
}: ClientEditModalProps) {
  return (
    <Modal isOpen={isEditModalOpen} onClose={() => { if (!isSaving) setIsEditModalOpen(false); }} title="Edit Client Profile" size="lg">
      {editClientData && (
        <form onSubmit={handleEditClient} style={{ padding: '8px' }}>

          {/* Avatar Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, background: 'var(--bg-color)', padding: '20px 24px', borderRadius: 20, border: '1px solid var(--border-color)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #007aff, #00c6ff)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, flexShrink: 0 }}>
              {(editClientData.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{editClientData.name || 'Client Name'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 2 }}>{editClientData.company || 'No organization'}</div>
            </div>
          </div>

          {/* Name + Organization */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Full Name *</label>
              <input
                type="text"
                className="form-input"
                style={{ borderRadius: 12, fontSize: 16, padding: '13px 16px' }}
                placeholder="e.g. Tanvir Ahmed"
                value={editClientData.name || ''}
                onChange={e => setEditClientData({...editClientData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Organization</label>
              <input
                type="text"
                className="form-input"
                style={{ borderRadius: 12, fontSize: 16, padding: '13px 16px' }}
                placeholder="Company name"
                value={editClientData.company || ''}
                onChange={e => setEditClientData({...editClientData, company: e.target.value})}
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ borderRadius: 12, fontSize: 16, padding: '13px 16px 13px 38px' }}
                  placeholder="email@example.com"
                  value={editClientData.email || ''}
                  onChange={e => setEditClientData({...editClientData, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Phone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                <input
                  type="tel"
                  className="form-input"
                  style={{ borderRadius: 12, fontSize: 16, padding: '13px 16px 13px 38px' }}
                  placeholder="+1 555 000 0000"
                  value={editClientData.phone || ''}
                  onChange={e => setEditClientData({...editClientData, phone: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Social + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Social / Link</label>
              <input
                type="text"
                className="form-input"
                style={{ borderRadius: 12, fontSize: 16, padding: '13px 16px' }}
                placeholder="facebook.com/..."
                value={editClientData.socialMedia || ''}
                onChange={e => setEditClientData({...editClientData, socialMedia: e.target.value})}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Status</label>
              <select
                className="form-input"
                style={{ borderRadius: 12, fontSize: 15, padding: '13px 16px', width: '100%' }}
                value={editClientData.status || 'Active'}
                onChange={e => setEditClientData({...editClientData, status: e.target.value as Client['status']})}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaving}
            style={{
              width: '100%',
              background: isSaving ? 'rgba(0,122,255,0.6)' : 'var(--color-info)',
              color: 'white',
              border: 'none',
              padding: '16px',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: isSaving ? 'none' : '0 8px 24px rgba(0,122,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.2s'
            }}
          >
            {isSaving
              ? <><Spinner size={17} color="white" /> Saving...</>
              : <><Save size={18} /> Save Changes</>
            }
          </button>
        </form>
      )}
    </Modal>
  );
}
