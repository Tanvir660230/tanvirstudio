import React from 'react';
import { Modal } from '../Modal';

export interface NewClientForm {
  name: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  socialMedia: string;
}

interface ClientCreateModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;
  handleAddClient: (e: React.FormEvent) => void;
  newClient: NewClientForm;
  setNewClient: React.Dispatch<React.SetStateAction<NewClientForm>>;
}

export function ClientCreateModal({
  isModalOpen, setIsModalOpen, handleAddClient, newClient, setNewClient,
}: ClientCreateModalProps) {
  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Client Profile" size="lg">
      <form onSubmit={handleAddClient} style={{ padding: '16px 8px' }}>
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
          <input type="text" className="form-input" style={{ borderRadius: '14px', fontSize: '16px', padding: '16px' }} placeholder="e.g. Tanvir Ahmed" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} required />
        </div>
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Organization</label>
          <input type="text" className="form-input" style={{ borderRadius: '14px', fontSize: '16px', padding: '16px' }} placeholder="e.g. Tanvir Studio" value={newClient.company} onChange={e => setNewClient({...newClient, company: e.target.value})} />
        </div>
        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
            <input type="email" className="form-input" style={{ borderRadius: '14px', fontSize: '16px', padding: '16px' }} placeholder="tanvir@studio.com" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</label>
            <input type="tel" className="form-input" style={{ borderRadius: '14px', fontSize: '16px', padding: '16px' }} placeholder="+1 555 000 0000" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label className="form-label" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Social Media Link <span style={{ opacity: 0.5, fontWeight: '500', textTransform: 'none' }}>(Optional)</span></label>
          <input type="url" className="form-input" style={{ borderRadius: '14px', fontSize: '16px', padding: '16px' }} placeholder="e.g. facebook.com/username" value={newClient.socialMedia} onChange={e => setNewClient({...newClient, socialMedia: e.target.value})} />
        </div>
        <button type="submit" style={{ width: '100%', background: 'var(--color-info)', color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', boxShadow: 'none' }}>
          Create Profile
        </button>
      </form>
    </Modal>
  );
}
