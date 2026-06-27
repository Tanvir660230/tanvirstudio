/* eslint-disable @typescript-eslint/no-unused-vars, no-irregular-whitespace */

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate } from 'react-router-dom';

import { Plus, Mail, Phone, ExternalLink, Edit2, History, Check, UserPlus, Trash2, Search, Briefcase, DollarSign, ChevronRight, AlertCircle, FileText, Save, Bell, Share2, Download, MessageSquare } from 'lucide-react';

import { downloadCSV } from '../utils/exportCSV';

import { matchesSearch } from '../utils/searchUtils';

import { sendPaymentReminder } from '../utils/emailApi';

import { generateWhatsAppLink } from '../utils/whatsapp';

import { Spinner } from '../components/Spinner';

import { useData } from '../contexts/DataContext';

import { useSettings } from '../contexts/SettingsContext';

import { useAuth } from '../contexts/AuthContext';

import { Modal } from '../components/Modal';

import { Toast } from '../components/Toast';

import { ClientInvoiceModal } from '../components/ClientInvoiceModal';
import { ClientModals } from '../components/client/ClientModals';

import type { Client, Task, Transaction, Lead, Payment } from '../types';

import { atomicClientPayment } from '../utils/atomicOps';



export function ClientManager() {

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {

    const h = () => setIsMobile(window.innerWidth <= 768);

    window.addEventListener('resize', h);

    return () => window.removeEventListener('resize', h);

  }, []);



  const { clients, addClient, updateClient, removeClient, clientsLoading, tasks, tasksLoading, updateTask, transactions, leads, removeLead, comms, addComm, updateComm } = useData();



  const [activeTab, setActiveTab] = useState<'clients' | 'leads'>('clients');

  const { settings } = useSettings();

  const { currency } = settings;

  const { userData } = useAuth();

  const isAdmin = userData?.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [showToast, setShowToast] = useState(false);

  const [toastMsg, setToastMsg] = useState('');

  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [pendingDeleteClient, setPendingDeleteClient] = useState<{ id: string; client: any; timer: ReturnType<typeof setTimeout> } | null>(null);

  const fireToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {

    setToastMsg(msg); setToastType(type); setShowToast(true);

  };

  const handleBulkReminder = async () => {

    if (selectedClientIds.size === 0) return;

    setBulkWorking(true);

    let sent = 0, skipped = 0;

    for (const cid of selectedClientIds) {

      const client = clients.find((c: Client) => c.id === cid);

      if (!client?.email) { skipped++; continue; }

      const due = tasks.filter((t: any) => t.clientId === cid || t.clientEmail === client.email).reduce((s: number, t: any) => {

        const b = Number(t.budget) || 0;

        const p = (t.payments || []).reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0);

        return s + Math.max(0, b - p);

      }, 0);

      if (due <= 0) { skipped++; continue; }

      await sendPaymentReminder(client.email, client.name, settings.studioName || 'Tanvir Studio', 'your project(s)', currency, due, 0).catch(() => {});

      sent++;

    }

    setBulkWorking(false);

    setSelectedClientIds(new Set());

    fireToast(`Reminders sent: ${sent}${skipped > 0 ? `, skipped ${skipped} (no email/no due)` : ''}`, 'success');

  };



  const handleBulkWhatsApp = () => {

    if (selectedClientIds.size === 0) return;

    const clients_ = clients.filter((c: Client) => selectedClientIds.has(c.id) && c.phone);

    if (clients_.length === 0) { fireToast('No selected clients have a phone number.', 'error'); return; }

    const msg = `Hi, this is a friendly reminder regarding your outstanding payment with ${settings.studioName || 'Tanvir Studio'}. Please get in touch with us at your earliest convenience. Thank you!`;

    clients_.forEach((c: Client) => { window.open(generateWhatsAppLink(c.phone!, msg), '_blank'); });

  };



  const [newClient, setNewClient] = useState({ name: '', company: '', email: '', phone: '', status: 'Active', socialMedia: '' });

  const [editClientData, setEditClientData] = useState<Client | null>(null);

  const [clientSearch, setClientSearch] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const [followUpDate, setFollowUpDate] = useState('');

  const [followUpNote, setFollowUpNote] = useState('');



  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [isBonus, setIsBonus] = useState(false);

  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

  const [showAllProjects, setShowAllProjects] = useState(false);

  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  const [bulkWorking, setBulkWorking] = useState(false);



  const backfillDone = useRef(false);

  const isMounted = useRef(true);

  useEffect(() => () => { isMounted.current = false; }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {

    if (clientsLoading || tasksLoading || backfillDone.current || !clients.length) return;

    backfillDone.current = true;

    (tasks as Task[]).forEach((t) => {

      if (t.clientId) return;

      const matched = (clients as Client[]).find((c) =>

        (c.name || '').trim().toLowerCase() === (t.client || '').trim().toLowerCase()

      );

      if (matched) updateTask(t.id, { clientId: matched.id }).catch((err: unknown) => console.error('[backfill]', err));

    });

  }, [clientsLoading, tasksLoading, clients, tasks, updateTask]);



  const clientFinancials = useMemo(() => {

    const map = new Map<string, { spent: number; due: number }>();

    for (const client of clients as Client[]) {

      const spent = (transactions as Transaction[])

        .filter((t) =>

          t.type === 'in' && t.status === 'Completed' &&

          (t.clientId === client.id || t.client === client.name ||

            (client.company && t.client === client.company))

        )

        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const cTasks = (tasks as Task[]).filter((t) =>

        t.clientId === client.id || t.client === client.name ||

        (client.company && t.client === client.company)

      );

      const due = cTasks.reduce((sum, t) => {

        const budget = Number(t.budget) || 0;

        const paid = (t.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

        const d = budget - paid;

        return sum + (d > 0 ? d : 0);

      }, 0);

      map.set(client.id, { spent, due });

    }

    return map;

  }, [clients, tasks, transactions]);



  const [isClientInvoiceOpen, setIsClientInvoiceOpen] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState<string>('');

  const [paymentNote, setPaymentNote] = useState<string>('');

  

  const [clientStatusFilter, setClientStatusFilter] = useState('all');



  const filteredClients = (clients as Client[]).filter((c) => {

    const matchSearch = matchesSearch(clientSearch, c.name, c.email, c.company, c.phone);

    const matchStatus = clientStatusFilter === 'all' || (c.status || '').toLowerCase() === clientStatusFilter;

    return matchSearch && matchStatus;

  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));



  const filteredLeads = (leads as Lead[]).filter((l) =>

     matchesSearch(clientSearch, l.name, l.email, (l as any).phone, (l as any).company)

  ).sort((a, b) => {

    const createdA = a.createdAt;

    const createdB = b.createdAt;

    const ta = createdA && typeof createdA === 'object' && 'toDate' in createdA ? createdA.toDate().getTime() : createdA ? new Date(createdA as string).getTime() : 0;

    const tb = createdB && typeof createdB === 'object' && 'toDate' in createdB ? createdB.toDate().getTime() : createdB ? new Date(createdB as string).getTime() : 0;

    return tb - ta;

  });

  

  const [newComm, setNewComm] = useState({ type: 'Note', content: '' });



  const handleAddClient = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!newClient.name?.trim()) return;



    try {

      await addClient({

        ...newClient,

        createdAt: new Date().toISOString()

      });

      setIsModalOpen(false);

      fireToast('Client profile created!');

      setNewClient({ name: '', company: '', email: '', phone: '', status: 'Active', socialMedia: '' });

    } catch (error) {

      console.error('Error adding client:', error);

      fireToast('Failed to add client. Please try again.', 'error');

    }

  };



  const handleAddLog = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!newComm.content || !selectedClient || isSubmittingLog) return;



    setIsSubmittingLog(true);

    try {

      await addComm({

        clientId: selectedClient.id,

        ...newComm,

        date: new Date().toISOString()

      });

      setNewComm({ type: 'Note', content: '' });

    } catch (error) {

      console.error('Error adding log:', error);

      fireToast('Failed to add log. Please try again.', 'error');

    } finally {

      setIsSubmittingLog(false);

    }

  };



  const convertLead = async (lead: any) => {

    if (convertingLeadId) return;

    const duplicate = clients.find((c: any) =>

      (c.email && lead.email && c.email.toLowerCase() === lead.email.toLowerCase()) ||

      (c.name && lead.name && c.name.toLowerCase() === lead.name.toLowerCase())

    );

    if (duplicate) {

      fireToast(`"${lead.name}" is already a client.`, 'warning');

      return;

    }

    setConvertingLeadId(lead.id);

    try {

      await addClient({

        name: lead.name,

        company: lead.company || '',

        email: lead.email,

        phone: lead.phone || '',

        status: 'Active',

        createdAt: new Date().toISOString()

      });

      await removeLead(lead.id);

      if (isMounted.current) fireToast('Lead successfully converted!');

    } catch (error) {

      console.error('Error converting lead:', error);

      if (isMounted.current) fireToast('Failed to convert lead.', 'error');

    } finally {

      if (isMounted.current) setConvertingLeadId(null);

    }

  };



  const handleEditClient = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!editClientData?.id || isSaving) return;



    const cleaned = {

      ...editClientData,

      name:        (editClientData.name || '').trim(),

      company:     (editClientData.company || '').trim(),

      email:       (editClientData.email || '').trim(),

      phone:       (editClientData.phone || '').trim(),

      socialMedia: (editClientData.socialMedia || '').trim(),

    };



    if (!cleaned.name) return;



    const originalClient = clients.find((c: any) => c.id === editClientData.id);

    const oldName = originalClient?.name || '';

    const newName = cleaned.name;

    const nameChanged = oldName && newName && oldName !== newName;



    const affectedTasks = nameChanged ? (tasks as Task[]).filter((t) => t.client === oldName) : [];



    setIsSaving(true);

    try {

      const { id, ...data } = cleaned;

      await updateClient(id, data);



      if (nameChanged && affectedTasks.length > 0) {

        await Promise.all(affectedTasks.map((t) => updateTask(t.id, { client: newName, clientId: id })));

      }



      setIsEditModalOpen(false);

      if (selectedClient?.id === id) {

        setSelectedClient(cleaned);

      }

      fireToast(nameChanged && affectedTasks.length > 0 ? `Profile updated — ${affectedTasks.length} project(s) synced` : 'Profile updated successfully!');

    } catch (error: unknown) {

      console.error('Error updating client:', error);

      const msg = error instanceof Error ? error.message : 'Please try again';

      fireToast(`Save failed: ${msg}`, 'error');

    } finally {

      setIsSaving(false);

    }

  };



  const handleDeleteClient = (id: string) => {

    const client = clients.find((c: any) => c.id === id);

    if (!client) return;

    if (pendingDeleteClient) {

      clearTimeout(pendingDeleteClient.timer);

      removeClient(pendingDeleteClient.id).catch(console.error);

    }

    setIsProfileOpen(false);

    setConfirmDeleteId(null);

    const affectedTasks = tasks.filter((t: any) => t.clientId === id);

    const timer = setTimeout(() => {

      removeClient(id).catch(e => { console.error(e); fireToast('Failed to delete client.', 'error'); });

      affectedTasks.forEach((t: any) => updateTask(t.id, { clientId: '' }).catch(console.error));

      setPendingDeleteClient(null);

    }, 5000);

    setPendingDeleteClient({ id, client, timer });

    fireToast(`"${client.name}" deleted`);

  };



  const openProfile = (client: any) => {

    setSelectedClient(client);

    setIsProfileOpen(true);

  };

   

  // Match tasks by clientId (new) or by name/company (legacy data)

  const clientProjects = selectedClient ? tasks.filter((t: any) =>

    t.clientId === selectedClient.id ||

    t.client === selectedClient.name ||

    (selectedClient.company && t.client === selectedClient.company)

  ) : [];

  const clientPayments = selectedClient ? transactions.filter((t: any) =>

    t.clientId === selectedClient.id ||

    t.client === selectedClient.name ||

    (selectedClient.company && t.client === selectedClient.company)

  ) : [];







  const computeTotalDue = (client: any) => {

    const cTasks = tasks.filter((t: any) =>

      t.clientId === client.id || t.client === client.name || (client.company && t.client === client.company)

    );

    return cTasks.reduce((sum: number, t: any) => {

      const budget = Number(t.budget) || 0;

      const paid = (t.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

      const due = budget - paid;

      return sum + (due > 0 ? due : 0);

    }, 0);

  };



  const getOverdueDays = (task: any): number => {

    if (!task.deliveryDate) return 0;

    const budget = Number(task.budget) || 0;

    const paid = (task.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

    if (budget <= paid) return 0;

    const diff = Math.floor((Date.now() - new Date(task.deliveryDate).getTime()) / 86400000);

    return diff > 0 ? diff : 0;

  };



  const getClientOverdueDays = (client: any): number => {

    const cTasks = tasks.filter((t: any) =>

      t.clientId === client.id || t.client === client.name || (client.company && t.client === client.company)

    );

    return cTasks.reduce((max: number, t: any) => Math.max(max, getOverdueDays(t)), 0);

  };



  const handleSaveFollowUp = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!followUpNote.trim() || !selectedClient) return;

    try {

      await addComm({

        clientId: selectedClient.id,

        type: 'Reminder',

        content: followUpNote,

        reminderDate: followUpDate || null,

        date: new Date().toISOString(),

      });

      setFollowUpNote('');

      setFollowUpDate('');

      setShowFollowUpForm(false);

      fireToast('Follow-up reminder saved!');

    } catch (err) { console.error(err); }

  };



  const markFollowUpDone = async (logId: string) => {

    try {

      await updateComm(logId, { done: true });

    } catch (err) { console.error(err); }

  };



  const handleShareStatus = () => {

    if (!selectedClient) return;

    const projects = clientProjects.slice(0, 6);

    const totalDue = computeTotalDue(selectedClient);

    const lines = [

      `🎵 *${settings.studioName || 'Tanvir Studio'} — Project Update*`,

      `Client: *${selectedClient.name}*`,

      ``,

      ...projects.map((p: any) => {

        const stage = p.status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        const overdue = getOverdueDays(p);

        const overdueStr = overdue > 0 ? ` âš ️ ${overdue}d overdue` : '';

        return `• ${p.title} — _${stage}_${overdueStr}`;

      }),

      ``,

      totalDue > 0 ? `💳 Outstanding: ${currency}${totalDue.toLocaleString()}` : `✅ All payments cleared`,

      ``,

      `📞 Contact: ${selectedClient.phone || selectedClient.email || 'Tanvir Studio'}`,

    ];

    const msg = lines.join('\n');

    if (selectedClient.phone) {

      const raw = selectedClient.phone.replace(/[^\d+]/g, '');

      const intlNum = raw.startsWith('+') ? raw.slice(1) : raw.startsWith('00') ? raw.slice(2) : raw;

      window.open(`https://wa.me/${intlNum}?text=${encodeURIComponent(msg)}`, '_blank');

    } else {

      navigator.clipboard.writeText(msg);

      fireToast('Status copied to clipboard!');

    }

  };



  const handleReceivePayment = async (e: React.FormEvent) => {

    e.preventDefault();

    const amount = Number(paymentAmount);

    if (!amount || amount <= 0 || !selectedClient || isSaving) return;



    if (!isBonus) {

      const totalDue = computeTotalDue(selectedClient);

      if (amount > totalDue) {

        fireToast(`Amount exceeds total due (${currency}${totalDue.toLocaleString()}). Please enter a valid amount.`, 'warning');

        return;

      }

    }



    setIsSaving(true);

    try {

      const paymentDate = new Date().toISOString();

      const taskPayments: { taskId: string; payment: Payment }[] = [];



      if (!isBonus) {

        const cTasks = tasks.filter((t: any) =>

          t.clientId === selectedClient.id || t.client === selectedClient.name || (selectedClient.company && t.client === selectedClient.company)

        );

        const pendingTasks = cTasks.map((t: any) => {

          const budget = Number(t.budget) || 0;

          const paid = (t.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

          return { ...t, due: budget - paid };

        }).filter((t: any) => t.due > 0);



        pendingTasks.sort((a: any, b: any) => {

          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;

          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          return dateA - dateB;

        });



        let remainingPayment = amount;

        for (const task of pendingTasks) {

          if (remainingPayment <= 0) break;

          const applyAmount = Math.min(task.due, remainingPayment);

          taskPayments.push({

            taskId:  task.id,

            payment: { amount: applyAmount, date: paymentDate, note: paymentNote || 'Auto-adjusted from client payment' },

          });

          remainingPayment -= applyAmount;

        }

      }



      const tx = {

        type: 'in' as const,

        amount,

        category: isBonus ? 'Client Bonus' : 'Client Payment',

        date: paymentDate,

        description: isBonus

          ? (paymentNote ? `Bonus from ${selectedClient.name}: ${paymentNote}` : `Bonus from ${selectedClient.name}`)

          : (paymentNote ? `Received payment: ${paymentNote}` : `Payment from ${selectedClient.name}`),

        client: selectedClient.name,

        clientId: selectedClient.id,

        status: 'Completed' as const,

        createdAt: paymentDate,

      };



      await atomicClientPayment(taskPayments, tx, selectedClient.id, { lastPaymentDate: paymentDate });



      setIsPaymentModalOpen(false);

      setPaymentAmount('');

      setPaymentNote('');

      setIsBonus(false);

      fireToast(isBonus ? `Bonus of ${currency}${amount.toLocaleString()} recorded!` : 'Payment applied successfully!');

    } catch (error) {

      console.error('Error applying payment:', error);

      fireToast('Failed to apply payment. Please try again.', 'error');

    } finally {

      setIsSaving(false);

    }

  };



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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', gap: 'var(--space-3)' }}>

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

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

