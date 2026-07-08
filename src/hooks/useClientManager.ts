import { useState, useEffect, useRef, useMemo } from 'react';

import { matchesSearch } from '../utils/searchUtils';
import { sendPaymentReminder } from '../utils/emailApi';
import { generateWhatsAppLink } from '../utils/whatsapp';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { atomicClientPayment } from '../utils/atomicOps';

import type { Client, Task, Transaction, Lead, Payment } from '../types';

type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * All state and handlers backing the ClientManager page: tab/search/filter
 * state, the client & lead lists, bulk actions, and the create/edit/profile/
 * payment/follow-up/log flows. Extracted verbatim from ClientManager.tsx —
 * no behavior change.
 */
export function useClientManager() {
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
  const [toastType, setToastType] = useState<ToastType>('success');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingDeleteClient, setPendingDeleteClient] = useState<{ id: string; client: any; timer: ReturnType<typeof setTimeout> } | null>(null);

  const fireToast = (msg: string, type: ToastType = 'success') => {
    setToastMsg(msg); setToastType(type); setShowToast(true);
  };

  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

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
        reminderDate: followUpDate || undefined,
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

  return {
    // responsive
    isMobile,
    // data (from DataContext)
    clients, tasks, transactions, leads, comms, removeLead,
    clientsLoading, tasksLoading,
    isAdmin, currency, settings,
    // tabs & search/filter
    activeTab, setActiveTab,
    clientSearch, setClientSearch,
    clientStatusFilter, setClientStatusFilter,
    filteredClients, filteredLeads,
    // bulk selection
    selectedClientIds, setSelectedClientIds,
    bulkWorking, handleBulkReminder, handleBulkWhatsApp,
    // toast
    showToast, setShowToast, toastMsg, toastType, fireToast,
    pendingDeleteClient, setPendingDeleteClient,
    // create modal
    isModalOpen, setIsModalOpen, newClient, setNewClient, handleAddClient,
    // edit modal
    isEditModalOpen, setIsEditModalOpen, editClientData, setEditClientData, isSaving, handleEditClient,
    // profile & related
    isProfileOpen, setIsProfileOpen, selectedClient, openProfile,
    clientProjects, clientPayments,
    showAllProjects, setShowAllProjects,
    clientFinancials, computeTotalDue, getOverdueDays, getClientOverdueDays,
    // follow-up
    showFollowUpForm, setShowFollowUpForm,
    followUpDate, setFollowUpDate, followUpNote, setFollowUpNote,
    handleSaveFollowUp, markFollowUpDone,
    // share status
    handleShareStatus,
    // delete
    confirmDeleteId, setConfirmDeleteId, handleDeleteClient,
    // logs
    newComm, setNewComm, handleAddLog, isSubmittingLog,
    // lead conversion
    convertingLeadId, convertLead,
    // payment
    isPaymentModalOpen, setIsPaymentModalOpen, isBonus, setIsBonus,
    paymentAmount, setPaymentAmount, paymentNote, setPaymentNote, handleReceivePayment,
    // client invoice
    isClientInvoiceOpen, setIsClientInvoiceOpen,
  };
}

export type UseClientManagerReturn = ReturnType<typeof useClientManager>;
