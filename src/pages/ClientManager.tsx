/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mail, Phone, ExternalLink, Edit2, History, Check, UserPlus, Trash2, Search, Briefcase, DollarSign, ChevronRight, AlertCircle, FileText, Save, Bell, Share2, Download, MessageSquare } from 'lucide-react';

import { downloadCSV } from '../utils/exportCSV';
import { Spinner } from '../components/Spinner';
import { Toast } from '../components/Toast';
import { ClientInvoiceModal } from '../components/ClientInvoiceModal';
import { ClientModals } from '../components/client/ClientModals';

import type { Client } from '../types';

import { useClientManager } from '../hooks/useClientManager';

export function ClientManager() {
  const {
    isMobile,
    clients, leads, comms, removeLead,
    isAdmin, currency,
    activeTab, setActiveTab,
    clientSearch, setClientSearch,
    clientStatusFilter, setClientStatusFilter,
    filteredClients, filteredLeads,
    selectedClientIds, setSelectedClientIds,
    bulkWorking, handleBulkReminder, handleBulkWhatsApp,
    showToast, setShowToast, toastMsg, toastType,
    pendingDeleteClient, setPendingDeleteClient, fireToast,
    isModalOpen, setIsModalOpen, newClient, setNewClient, handleAddClient,
    isEditModalOpen, setIsEditModalOpen, editClientData, setEditClientData, isSaving, handleEditClient,
    isProfileOpen, setIsProfileOpen, selectedClient, openProfile,
    clientProjects, clientPayments,
    showAllProjects, setShowAllProjects,
    clientFinancials, getClientOverdueDays,
    showFollowUpForm, setShowFollowUpForm,
    followUpDate, setFollowUpDate, followUpNote, setFollowUpNote,
    handleSaveFollowUp, markFollowUpDone,
    handleShareStatus,
    confirmDeleteId, setConfirmDeleteId, handleDeleteClient,
    newComm, setNewComm, handleAddLog, isSubmittingLog,
    convertingLeadId, convertLead,
    isPaymentModalOpen, setIsPaymentModalOpen, isBonus, setIsBonus,
    paymentAmount, setPaymentAmount, paymentNote, setPaymentNote, handleReceivePayment,
    isClientInvoiceOpen, setIsClientInvoiceOpen,
  } = useClientManager();

  return (
    <div style={{}}>

      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 className="page-title">Clients</h1>
          </div>
        </div>
        {isAdmin && (
          <div className="page-actions">
            {selectedClientIds.size > 0 && (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{selectedClientIds.size} selected</span>
                <button className="btn btn-secondary" onClick={handleBulkReminder} disabled={bulkWorking} title="Send payment reminder email to selected clients with outstanding dues">
                  <Mail size={15} /> {bulkWorking ? 'Sending…' : 'Email Reminder'}
                </button>
                <button className="btn btn-secondary" onClick={handleBulkWhatsApp} title="Open WhatsApp for selected clients">
                  <MessageSquare size={15} /> WhatsApp All
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedClientIds(new Set())} title="Clear selection">
                  ✕ Clear
                </button>
              </>
            )}
            <button className="btn btn-secondary" onClick={() => downloadCSV('clients.csv', clients.map((c: Client) => ({ Name: c.name, Email: c.email || '', Phone: c.phone || '', Status: c.status || '', CreatedAt: c.createdAt || '' })))}>
              <Download size={15} /> Export CSV
            </button>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} strokeWidth={2.5} /> New Profile
            </button>
          </div>
        )}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="client-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', gap: 'var(--space-3)' }}>
        {/* Left: Tabs */}
        <div className="tab-bar" style={{ flexShrink: 0 }}>
          <button className={`tab-item${activeTab === 'clients' ? ' active' : ''}`} onClick={() => setActiveTab('clients')}>
            Clients <span style={{ marginLeft: 4, background: 'var(--surface-2)', padding: '1px 7px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>{clients.length}</span>
          </button>
          <button className={`tab-item${activeTab === 'leads' ? ' active' : ''}`} onClick={() => setActiveTab('leads')}>
            Leads <span style={{ marginLeft: 4, background: 'var(--surface-2)', padding: '1px 7px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>{leads.length}</span>
          </button>
        </div>

        {/* Right: Search + Filter grouped */}
        <div className="client-toolbar-filters" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
          {activeTab === 'clients' && (
            <select
              value={clientStatusFilter}
              onChange={e => setClientStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: 130, flexShrink: 0 }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
            </select>
          )}
        </div>
      </div>

      {/* ─── Main List View ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Header Rows for Perfect Alignment */}
        {activeTab === 'clients' && filteredClients.length > 0 && !isMobile && (
          <div className="client-list-header" style={{ display: 'grid', gridTemplateColumns: isAdmin ? '44px minmax(160px,2fr) minmax(100px,1fr) minmax(160px,1.5fr) 90px' : '44px minmax(160px,2fr) minmax(100px,1fr) 90px', gap: '16px', padding: '0 20px', marginBottom: '0px', alignItems: 'center' }}>
            <div></div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Client Info</div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>Status</div>
            {isAdmin && <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Financials</div>}
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</div>
          </div>
        )}
        {activeTab === 'leads' && filteredLeads.length > 0 && !isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '20px', padding: '0 24px', marginBottom: '0px', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Lead Inquiry</div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {activeTab === 'clients' ? (
            filteredClients.length > 0 ? filteredClients.map((c: any) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={c.id}
                className="client-row hover-row hover-lift-2"
                style={{
                  background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border-color)',
                  padding: '14px 20px', display: 'grid', gridTemplateColumns: isMobile ? '40px 1fr auto' : (isAdmin ? '44px minmax(160px,2fr) minmax(100px,1fr) minmax(160px,1.5fr) 90px' : '44px minmax(160px,2fr) minmax(100px,1fr) 90px'), gap: isMobile ? '12px' : '16px', alignItems: 'center', cursor: 'pointer',
                  boxShadow: 'var(--shadow-xs)', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onClick={() => openProfile(c)}
              >
                {/* Avatar / Checkbox */}
                <div
                  onClick={(e) => { e.stopPropagation(); setSelectedClientIds(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; }); }}
                  style={{ width: 38, height: 38, borderRadius: '10px', background: selectedClientIds.has(c.id) ? 'var(--color-success)' : 'var(--color-info)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s' }}
                  title={selectedClientIds.has(c.id) ? 'Deselect' : 'Select for bulk action'}
                >
                  {selectedClientIds.has(c.id) ? <Check size={16} /> : (c.name ? c.name.substring(0, 2).toUpperCase() : 'C')}
                </div>

                {/* Info */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}><Briefcase size={11} opacity={0.5}/> {c.company || 'Private'}</span>
                    <span style={{ opacity: 0.3, flexShrink: 0 }}>•</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{c.email || 'N/A'}</span>
                  </div>
                </div>

                {/* Status Pill + Overdue */}
                <div className="client-status-col" style={{ display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    background: c.status === 'Active' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(142, 142, 147, 0.1)',
                    color: c.status === 'Active' ? 'var(--color-success)' : '#8E8E93',
                    padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap'
                  }}>
                    {c.status}
                  </span>
                  {(() => {
                    const days = getClientOverdueDays(c);
                    if (days >= 60) return <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-danger)', background: 'rgba(255,59,48,0.1)', padding: '2px 7px', borderRadius: 100, border: '1px solid rgba(255,59,48,0.2)', whiteSpace: 'nowrap' }}>60+ Days</span>;
                    if (days >= 30) return <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-warning)', background: 'rgba(255,149,0,0.1)', padding: '2px 7px', borderRadius: 100, border: '1px solid rgba(255,149,0,0.2)', whiteSpace: 'nowrap' }}>30+ Days</span>;
                    return null;
                  })()}
                </div>

                {/* Financials */}
                {isAdmin && !isMobile && (
                  <div className="client-finance-col" style={{ display: 'flex', gap: '16px', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)' }}>
                    <div style={{ minWidth: '70px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Revenue</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{currency}{(clientFinancials.get(c.id)?.spent ?? 0).toLocaleString()}</div>
                      {c.lastPaymentDate && (
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {(() => {
                            const days = Math.floor((Date.now() - new Date(c.lastPaymentDate).getTime()) / 86400000);
                            return days === 0 ? 'Paid today' : days === 1 ? 'Paid yesterday' : `Paid ${days}d ago`;
                          })()}
                        </div>
                      )}
                    </div>
                    {(clientFinancials.get(c.id)?.due ?? 0) > 0 && (
                      <div style={{ minWidth: '70px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '400', color: 'var(--color-danger)', marginBottom: '3px' }}>Due</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-danger)' }}>{currency}{(clientFinancials.get(c.id)?.due ?? 0).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="client-actions-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  {c.phone && (
                    <button
                      title={`WhatsApp ${c.name}`}
                      aria-label={`WhatsApp ${c.name}`}
                      onClick={(e) => { e.stopPropagation(); const r = c.phone.replace(/[^\d+]/g,''); const n = r.startsWith('+') ? r.slice(1) : r.startsWith('00') ? r.slice(2) : r; window.open(`https://wa.me/${n}`, '_blank'); }}
                      style={{ background: 'rgba(37,211,102,0.1)', border: 'none', padding: '10px', borderRadius: '10px', color: '#25D366', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40, minHeight: 40 }}
                      className="hover-bg-green"
                    >
                      <Phone size={15} />
                    </button>
                  )}
                  {c.email && (
                    <button
                      title={`Email ${c.name}`}
                      aria-label={`Email ${c.name}`}
                      onClick={(e) => { e.stopPropagation(); window.open(`mailto:${c.email}`, '_blank'); }}
                      style={{ background: 'rgba(0,122,255,0.08)', border: 'none', padding: '10px', borderRadius: '10px', color: 'var(--color-info)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40, minHeight: 40 }}
                      className="hover-bg-blue"
                    >
                      <Mail size={15} />
                    </button>
                  )}
                  <button
                    aria-label={`Edit ${c.name}`}
                    onClick={(e) => { e.stopPropagation(); setEditClientData(c); setIsEditModalOpen(true); }}
                    style={{ background: 'var(--bg-color)', border: 'none', padding: '10px', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    className="hover-bg-blue"
                  >
                    <Edit2 size={16} />
                  </button>
                  <div style={{ background: 'var(--bg-color)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                    <ChevronRight size={16} color="var(--text-tertiary)" strokeWidth={3} />
                  </div>
                </div>
              </motion.div>
            )) : (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '16px', fontWeight: '600' }}>No clients found.</div>
            )
          ) : (
            filteredLeads.length > 0 ? filteredLeads.map((l: any) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={l.id}
                style={{ background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '12px 16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 200px', gap: '16px', alignItems: 'center' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>{l.name}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={12} opacity={0.5}/> {l.email}
                    <span style={{ opacity: 0.3 }}>•</span>
                    <History size={12} opacity={0.5}/> {l.createdAt?.toDate ? l.createdAt.toDate().toLocaleDateString() : l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Recently'}
                  </div>
                  {l.message && (
                    <div style={{ marginTop: '8px', padding: '10px', background: 'var(--bg-color)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', fontStyle: 'italic', borderLeft: '3px solid #FF9500' }}>
                      "{l.message}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => convertLead(l)}
                    disabled={!!convertingLeadId}
                    style={{ background: convertingLeadId === l.id ? 'rgba(52,199,89,0.2)' : 'rgba(52,199,89,0.08)', color: 'var(--color-success)', border: 'none', padding: '7px 12px', borderRadius: '7px', fontWeight: '500', cursor: convertingLeadId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.12s', fontSize: '13px', opacity: convertingLeadId && convertingLeadId !== l.id ? 0.5 : 1 }}
                  >
                    {convertingLeadId === l.id ? <><Spinner size={14} color="var(--color-success)" /> Converting...</> : <><UserPlus size={16} strokeWidth={2.5} /> Convert</>}
                  </button>
                  <button
                    aria-label={`Remove lead ${l.name}`}
                    onClick={() => removeLead(l.id)}
                    style={{ background: 'rgba(255, 59, 48, 0.05)', color: 'var(--color-danger)', border: 'none', padding: '8px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                    className="hover-bg-red"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            )) : (
               <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {clientSearch ? `No leads match "${clientSearch}"` : 'No leads yet'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {clientSearch ? 'Try a different search term.' : 'Leads come in via your studio contact form.'}
                </div>
               </div>
            )
          )}
        </AnimatePresence>
      </div>

      <ClientModals
        // State
        isProfileOpen={isProfileOpen} setIsProfileOpen={setIsProfileOpen} selectedClient={selectedClient}
        isMobile={isMobile} isAdmin={isAdmin} currency={currency} clientFinancials={clientFinancials}
        clientProjects={clientProjects} showAllProjects={showAllProjects} setShowAllProjects={setShowAllProjects}
        clientPayments={clientPayments} comms={comms} markFollowUpDone={markFollowUpDone}
        showFollowUpForm={showFollowUpForm} setShowFollowUpForm={setShowFollowUpForm}
        followUpDate={followUpDate} setFollowUpDate={setFollowUpDate} followUpNote={followUpNote} setFollowUpNote={setFollowUpNote}
        handleSaveFollowUp={handleSaveFollowUp} handleShareStatus={handleShareStatus} setIsClientInvoiceOpen={setIsClientInvoiceOpen}
        setIsBonus={setIsBonus} setPaymentAmount={setPaymentAmount} setPaymentNote={setPaymentNote} setIsPaymentModalOpen={setIsPaymentModalOpen}
        confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} handleDeleteClient={handleDeleteClient}
        handleAddLog={handleAddLog} newComm={newComm} setNewComm={setNewComm} isSubmittingLog={isSubmittingLog}
        // Create Modal
        isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} handleAddClient={handleAddClient} newClient={newClient} setNewClient={setNewClient}
        // Edit Modal
        isEditModalOpen={isEditModalOpen} setIsEditModalOpen={setIsEditModalOpen} isSaving={isSaving} handleEditClient={handleEditClient}
        editClientData={editClientData} setEditClientData={setEditClientData}
        // Payment Modal
        isPaymentModalOpen={isPaymentModalOpen} isBonus={isBonus} paymentAmount={paymentAmount} paymentNote={paymentNote}
        handleReceivePayment={handleReceivePayment}
      />

      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} onUndo={pendingDeleteClient ? () => { clearTimeout(pendingDeleteClient.timer); setPendingDeleteClient(null); setShowToast(false); fireToast(`"${pendingDeleteClient.client.name}" restored`); } : undefined} />}

      {isClientInvoiceOpen && selectedClient && (
        <ClientInvoiceModal
          client={selectedClient}
          tasks={clientProjects}
          onClose={() => setIsClientInvoiceOpen(false)}
        />
      )}
    </div>
  );
}
