import React from 'react';
import { Modal } from '../Modal';
import { Spinner } from '../Spinner';
import { Briefcase, ExternalLink, Mail, Phone, AlertCircle, DollarSign, Bell, Share2, FileText, Trash2, History } from 'lucide-react';
import type { Client, Task, Transaction, Communication } from '../../types';

interface ClientProfileModalProps {
  isProfileOpen: boolean;
  setIsProfileOpen: (v: boolean) => void;
  selectedClient: Client | null;
  isMobile: boolean;
  isAdmin: boolean;
  currency: string;
  clientFinancials: Map<string, { spent: number; due: number }>;
  clientProjects: Task[];
  showAllProjects: boolean;
  setShowAllProjects: React.Dispatch<React.SetStateAction<boolean>>;
  clientPayments: Transaction[];
  comms: Communication[];
  markFollowUpDone: (logId: string) => void;
  showFollowUpForm: boolean;
  setShowFollowUpForm: React.Dispatch<React.SetStateAction<boolean>>;
  followUpDate: string;
  setFollowUpDate: (v: string) => void;
  followUpNote: string;
  setFollowUpNote: (v: string) => void;
  handleSaveFollowUp: (e: React.FormEvent) => void;
  handleShareStatus: () => void;
  setIsClientInvoiceOpen: (v: boolean) => void;
  setIsBonus: React.Dispatch<React.SetStateAction<boolean>>;
  setPaymentAmount: React.Dispatch<React.SetStateAction<string>>;
  setPaymentNote: React.Dispatch<React.SetStateAction<string>>;
  setIsPaymentModalOpen: (v: boolean) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  handleDeleteClient: (id: string) => void;
  handleAddLog: (e: React.FormEvent) => void;
  newComm: { type: string; content: string };
  setNewComm: React.Dispatch<React.SetStateAction<{ type: string; content: string }>>;
  isSubmittingLog: boolean;
}

export function ClientProfileModal({
  isProfileOpen, setIsProfileOpen, selectedClient,
  isMobile, isAdmin, currency, clientFinancials,
  clientProjects, showAllProjects, setShowAllProjects,
  clientPayments, comms, markFollowUpDone,
  showFollowUpForm, setShowFollowUpForm,
  followUpDate, setFollowUpDate, followUpNote, setFollowUpNote,
  handleSaveFollowUp, handleShareStatus, setIsClientInvoiceOpen,
  setIsBonus, setPaymentAmount, setPaymentNote, setIsPaymentModalOpen,
  confirmDeleteId, setConfirmDeleteId, handleDeleteClient,
  handleAddLog, newComm, setNewComm, isSubmittingLog,
}: ClientProfileModalProps) {

  const getOverdueDays = (p: any) => {
    if (p.status === 'Completed' || p.status === 'Cancelled') return 0;
    if (!p.deadline) return 0;
    const deadline = new Date(p.deadline).getTime();
    /* eslint-disable-next-line */
    const now = Date.now();
    return Math.max(0, Math.floor((now - deadline) / 86400000));
  };

  return (
    <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Client Intelligence" size="xl">
      {selectedClient && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? '24px' : '40px', padding: '12px' }}>

          {/* Left Column: Details & Stats */}
          <div>
            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', background: 'var(--bg-color)', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '600', flexShrink: 0 }}>
                {(selectedClient.name || '?')[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '17px', fontWeight: '600', letterSpacing: '-0.3px', color: 'var(--text-primary)', marginBottom: '2px' }}>{selectedClient.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: '400', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                    <Briefcase size={12} /> {selectedClient.company || 'Private Client'}
                  </p>
                  {selectedClient.socialMedia && (
                    <a href={selectedClient.socialMedia.startsWith('http') ? selectedClient.socialMedia : `https://${selectedClient.socialMedia}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-info)', fontSize: '12px', fontWeight: '400', textDecoration: 'none' }}>
                      <ExternalLink size={11} /> Social Profile
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', fontWeight: '400', color: 'var(--text-tertiary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {selectedClient.email || 'No email'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {selectedClient.phone || 'No phone'}</span>
                </div>
              </div>
            </div>

            {/* Financial Stats */}
            {isAdmin && (
              <div className="stat-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-color)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', marginBottom: '4px' }}>Lifetime Value</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-success)' }}>{currency}{(clientFinancials.get(selectedClient.id)?.spent ?? 0).toLocaleString()}</div>
                </div>
                <div style={{ background: (clientFinancials.get(selectedClient.id)?.due ?? 0) > 0 ? 'rgba(255,59,48,0.04)' : 'var(--bg-color)', padding: '12px 14px', borderRadius: '8px', border: (clientFinancials.get(selectedClient.id)?.due ?? 0) > 0 ? '1px solid rgba(255,59,48,0.15)' : '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: (clientFinancials.get(selectedClient.id)?.due ?? 0) > 0 ? 'var(--color-danger)' : 'var(--text-tertiary)', fontWeight: '500', marginBottom: '4px' }}>Pending Due</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: (clientFinancials.get(selectedClient.id)?.due ?? 0) > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{currency}{(clientFinancials.get(selectedClient.id)?.due ?? 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', marginBottom: '4px' }}>Total Projects</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{clientProjects.length}</div>
                </div>
              </div>
            )}

            {/* Associated Projects */}
            <div style={{ marginBottom: '40px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} color="var(--text-tertiary)" /> Recent Projects</span>
                {clientProjects.length > 4 && (
                  <button onClick={() => setShowAllProjects(v => !v)} style={{ fontSize: '12px', color: 'var(--color-info)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', padding: 0 }}>
                    {showAllProjects ? 'Show less' : `View all ${clientProjects.length}`}
                  </button>
                )}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {clientProjects.length > 0 ? (showAllProjects ? clientProjects : clientProjects.slice(0, 4)).map((p: any) => {
                    const overdueDays = getOverdueDays(p);
                    return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: overdueDays >= 60 ? 'rgba(255,59,48,0.04)' : overdueDays >= 30 ? 'rgba(255,149,0,0.04)' : 'var(--bg-color)', borderRadius: '8px', border: overdueDays >= 60 ? '1px solid rgba(255,59,48,0.15)' : overdueDays >= 30 ? '1px solid rgba(255,149,0,0.15)' : '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{p.title}</div>
                        {overdueDays >= 30 && (
                          <div style={{ fontSize: '11px', fontWeight: 800, color: overdueDays >= 60 ? 'var(--color-danger)' : 'var(--color-warning)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={11} /> {overdueDays} days overdue
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {isAdmin && <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '800' }}>{currency}{(Number(p.budget) || 0).toLocaleString()}</span>}
                        <span style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-info)', fontSize: '11px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', letterSpacing: '0.5px' }}>{p.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    );
                  }) : (
                    <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-color)', borderRadius: '16px', color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: '600' }}>No project history yet.</div>
                  )}
              </div>
            </div>

            {/* Payment History */}
            {clientPayments.filter((t: any) => t.type === 'in').length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={14} color="var(--text-tertiary)" /> Payment History
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {clientPayments
                    .filter((t: any) => t.type === 'in')
                    .sort((a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())
                    .slice(0, 6)
                    .map((t: any) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(52,199,89,0.04)', borderRadius: '8px', border: '1px solid rgba(52,199,89,0.12)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{t.description || t.title || 'Payment'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '400', marginTop: 1 }}>
                            {new Date(t.createdAt || t.date || 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-success)' }}>{currency}{Number(t.amount || 0).toLocaleString()}</span>
                      </div>
                    ))
                  }
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderTop: '1px solid var(--border-color)', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-tertiary)' }}>Total Received</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-success)' }}>{currency}{clientPayments.filter((t: any) => t.type === 'in').reduce((s: number, t: any) => s + Number(t.amount || 0), 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Follow-Up Reminders */}
            {(() => {
              const reminders = comms.filter((log: any) => log.clientId === selectedClient.id && log.type === 'Reminder' && !log.done);
              return reminders.length > 0 ? (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bell size={13} color="var(--text-tertiary)" /> Pending Follow-Ups
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {reminders.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(255,149,0,0.04)', borderRadius: 8, border: '1px solid rgba(255,149,0,0.12)' }}>
                        <Bell size={13} color="var(--color-warning)" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.content}</div>
                          {r.reminderDate && <div style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 400, marginTop: 1 }}>{new Date(r.reminderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                        </div>
                        <button onClick={() => markFollowUpDone(r.id)} style={{ background: 'rgba(52,199,89,0.08)', border: 'none', color: 'var(--color-success)', padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>Done</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Follow-Up Form */}
            {showFollowUpForm && (
              <form onSubmit={handleSaveFollowUp} style={{ marginBottom: 24, padding: 16, background: 'rgba(255,149,0,0.06)', borderRadius: 16, border: '1px solid rgba(255,149,0,0.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-warning)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Bell size={12} /> Set Follow-Up Reminder</div>
                <input type="date" className="form-input" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} style={{ marginBottom: 8, background: 'var(--bg-color)', fontSize: 16 }} />
                <textarea className="form-input" placeholder="What to follow up on..." value={followUpNote} onChange={e => setFollowUpNote(e.target.value)} rows={2} maxLength={2000} style={{ marginBottom: 10, background: 'var(--bg-color)', resize: 'none', fontSize: 16 }} required />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ flex: 1, background: 'var(--color-warning)', color: 'white', border: 'none', padding: '9px', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>Save Reminder</button>
                  <button type="button" onClick={() => setShowFollowUpForm(false)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontWeight: 400, fontSize: 13 }}>Cancel</button>
                </div>
              </form>
            )}

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{ flex: 1, minWidth: 100, background: 'var(--color-info)', color: 'white', border: 'none', padding: '9px 12px', borderRadius: '8px', fontWeight: '500', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => window.open(`mailto:${selectedClient.email}`, '_blank')}
              >
                <Mail size={14} /> Email
              </button>
              <button
                style={{ flex: 1, minWidth: 100, background: 'rgba(255,149,0,0.08)', color: 'var(--color-warning)', border: '1px solid rgba(255,149,0,0.2)', padding: '9px 12px', borderRadius: '8px', fontWeight: '500', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => { setShowFollowUpForm(v => !v); }}
              >
                <Bell size={14} /> Follow Up
              </button>
              <button
                style={{ flex: 1, minWidth: 100, background: 'rgba(52,199,89,0.08)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.2)', padding: '9px 12px', borderRadius: '8px', fontWeight: '500', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={handleShareStatus}
                title={selectedClient.phone ? 'Send via WhatsApp' : 'Copy to clipboard'}
              >
                <Share2 size={14} /> Share Status
              </button>
              <button
                style={{ flex: 1, minWidth: 100, background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '9px 12px', borderRadius: '8px', fontWeight: '500', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setIsClientInvoiceOpen(true)}
              >
                <FileText size={14} /> Statement
              </button>
              {isAdmin && (
                <button
                  style={{ flex: 1, background: 'rgba(52,199,89,0.08)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.2)', padding: '9px 12px', borderRadius: '8px', fontWeight: '500', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => { setIsBonus(false); setPaymentAmount(''); setPaymentNote(''); setIsPaymentModalOpen(true); }}
                >
                  <DollarSign size={14} /> {(clientFinancials.get(selectedClient.id)?.due ?? 0) > 0 ? 'Receive Payment' : 'Record Bonus'}
                </button>
              )}
              {confirmDeleteId === selectedClient.id ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger)' }}>Delete?</span>
                  <button
                    style={{ background: 'var(--color-danger)', color: 'white', border: 'none', padding: '7px 12px', borderRadius: '7px', fontWeight: '500', fontSize: 13, cursor: 'pointer' }}
                    onClick={() => handleDeleteClient(selectedClient.id)}
                  >Yes</button>
                  <button
                    style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '7px 12px', borderRadius: '7px', fontWeight: '400', fontSize: 13, cursor: 'pointer' }}
                    onClick={() => setConfirmDeleteId(null)}
                  >Cancel</button>
                </div>
              ) : (
                <button
                  style={{ background: 'rgba(255,59,48,0.05)', color: 'var(--color-danger)', border: '1px solid rgba(255,59,48,0.15)', padding: '8px', borderRadius: '7px', fontWeight: '400', cursor: 'pointer', display: 'flex' }}
                  onClick={() => setConfirmDeleteId(selectedClient.id)}
                  title="Delete Client"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Right Column: CRM Timeline */}
          <div style={{ background: 'var(--bg-color)', borderRadius: '32px', padding: '32px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
             <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <History size={20} color="var(--color-info)" /> Relationship Log
             </h4>

             {/* Add Log Form */}
             <form onSubmit={handleAddLog} style={{ marginBottom: '32px', background: 'var(--card-bg)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
               <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                 <select
                  className="form-select"
                  value={newComm.type}
                  onChange={e => setNewComm({...newComm, type: e.target.value})}
                  style={{ fontSize: '14px', fontWeight: '700', padding: '10px 16px', borderRadius: '12px', flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                 >
                   <option>Note</option>
                   <option>Call</option>
                   <option>Meeting</option>
                 </select>
               </div>
               <textarea
                className="form-input"
                placeholder="Type a log entry..."
                style={{ minHeight: '100px', fontSize: '15px', borderRadius: '16px', padding: '16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', width: '100%', resize: 'vertical', marginBottom: '16px' }}
                value={newComm.content}
                onChange={e => setNewComm({...newComm, content: e.target.value})}
               />
               <button type="submit" disabled={isSubmittingLog} style={{ background: isSubmittingLog ? 'rgba(0,122,255,0.5)' : 'var(--color-info)', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '800', width: '100%', cursor: isSubmittingLog ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                 {isSubmittingLog ? <><Spinner size={15} color="white" /> Saving...</> : 'Save Log'}
               </button>
             </form>

             {/* Log Feed */}
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                {comms.filter((log: any) => log.clientId === selectedClient.id).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontWeight: '600', marginTop: '20px' }}>No CRM logs yet.</div>
                )}
                {comms.filter((log: any) => log.clientId === selectedClient.id)
                  .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                  .map((log: any) => (
                  <div key={log.id} style={{ position: 'relative', paddingLeft: '32px' }}>
                    {/* Timeline Line */}
                    <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: '-20px', width: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
                    {/* Timeline Dot */}
                    <div style={{ position: 'absolute', left: 0, top: '6px', width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, #007aff, #00c6ff)', border: '3px solid var(--card-bg)', zIndex: 1, boxShadow: 'none' }}></div>

                    <div style={{ background: 'var(--card-bg)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{log.type}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-tertiary)' }}>{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500', lineHeight: 1.5 }}>
                        {log.content}
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
