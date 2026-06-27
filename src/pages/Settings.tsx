import { useState, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { User, Users, Palette, Globe, Save, Database, Upload, Trash2, Settings as SettingsIcon, Image as ImageIcon, FileText, Bell } from 'lucide-react';

import { useFirestore } from '../hooks/useFirestore';

import { exportAllData } from '../utils/exportAll';

import { auth, db, storage } from '../lib/firebase';

import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';

import { useSettings } from '../contexts/SettingsContext';

import { useAuth } from '../contexts/AuthContext';

import { useData } from '../contexts/DataContext';

import { Toast } from '../components/Toast';

import { Spinner } from '../components/Spinner';

import { compressImage } from '../utils/imageUtils';



export function Settings() {

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {

    const h = () => setIsMobile(window.innerWidth <= 768);

    window.addEventListener('resize', h);

    return () => window.removeEventListener('resize', h);

  }, []);



  const { settings, updateSettings } = useSettings();

  const [studioName, setStudioName] = useState(settings.studioName);

  const [studioLogo, setStudioLogo] = useState(settings.studioLogo);

  const [studioAddress, setStudioAddress] = useState(settings.studioAddress || '');

  const [studioEmail, setStudioEmail] = useState(settings.studioEmail || '');

  const [studioPhone, setStudioPhone] = useState(settings.studioPhone || '');

  const [currency, setCurrency] = useState(settings.currency);

  const [paymentQrCode, setPaymentQrCode] = useState(settings.paymentQrCode || '');

  const [defaultComposerComm, setDefaultComposerComm] = useState(settings.defaultComposerComm);

  const [defaultHummingComm, setDefaultHummingComm] = useState(settings.defaultHummingComm);

  const [monthlyGoal, setMonthlyGoal] = useState(settings.monthlyGoal || 0);

  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix ?? 'INV');

  const [invoiceNotes, setInvoiceNotes] = useState(settings.invoiceNotes ?? '');

  const [invoiceTaxRate, setInvoiceTaxRate] = useState(settings.invoiceTaxRate ?? 0);

  const [workHoursStart, setWorkHoursStart] = useState(settings.workHoursStart ?? 9);

  const [workHoursEnd, setWorkHoursEnd] = useState(settings.workHoursEnd ?? 22);

  const [sessionDurationDefault, setSessionDurationDefault] = useState(settings.sessionDurationDefault ?? 60);

  const [autoCompleteDays, setAutoCompleteDays] = useState(settings.autoCompleteDays ?? 7);

  const [notifyOverdue, setNotifyOverdue] = useState(settings.notifyOverdue ?? true);

  const [notifyUpcoming, setNotifyUpcoming] = useState(settings.notifyUpcoming ?? true);

  const [notifyPayment, setNotifyPayment] = useState(settings.notifyPayment ?? true);

  const [socialWhatsapp, setSocialWhatsapp] = useState(settings.socialWhatsapp ?? '');

  const [socialFacebook, setSocialFacebook] = useState(settings.socialFacebook ?? '');

  const [socialYoutube, setSocialYoutube] = useState(settings.socialYoutube ?? '');

  const [socialInstagram, setSocialInstagram] = useState(settings.socialInstagram ?? '');

  const [statsProjects, setStatsProjects] = useState(settings.statsProjects ?? 999);

  const [statsArtists, setStatsArtists] = useState(settings.statsArtists ?? 99);

  const [statsViews, setStatsViews] = useState(settings.statsViews ?? '1B+');

  const [statsTrustLabel, setStatsTrustLabel] = useState(settings.statsTrustLabel ?? '10 years of trust.');



  useEffect(() => {

    setStudioName(settings.studioName);

    setStudioLogo(settings.studioLogo);

    setStudioAddress(settings.studioAddress || '');

    setStudioEmail(settings.studioEmail || '');

    setStudioPhone(settings.studioPhone || '');

    setCurrency(settings.currency);

    setPaymentQrCode(settings.paymentQrCode || '');

    setDefaultComposerComm(settings.defaultComposerComm);

    setDefaultHummingComm(settings.defaultHummingComm);

    setMonthlyGoal(settings.monthlyGoal || 0);

    setInvoicePrefix(settings.invoicePrefix ?? 'INV');

    setInvoiceNotes(settings.invoiceNotes ?? '');

    setInvoiceTaxRate(settings.invoiceTaxRate ?? 0);

    setWorkHoursStart(settings.workHoursStart ?? 9);

    setWorkHoursEnd(settings.workHoursEnd ?? 22);

    setSessionDurationDefault(settings.sessionDurationDefault ?? 60);

    setAutoCompleteDays(settings.autoCompleteDays ?? 7);

    setNotifyOverdue(settings.notifyOverdue ?? true);

    setNotifyUpcoming(settings.notifyUpcoming ?? true);

    setNotifyPayment(settings.notifyPayment ?? true);

    setSocialWhatsapp(settings.socialWhatsapp ?? '');

    setSocialFacebook(settings.socialFacebook ?? '');

    setSocialYoutube(settings.socialYoutube ?? '');

    setSocialInstagram(settings.socialInstagram ?? '');

    setStatsProjects(settings.statsProjects ?? 999);

    setStatsArtists(settings.statsArtists ?? 99);

    setStatsViews(settings.statsViews ?? '1B+');

    setStatsTrustLabel(settings.statsTrustLabel ?? '10 years of trust.');

  }, [settings]);

  

  const [activeTab, setActiveTab] = useState('profile');

  const [showToast, setShowToast] = useState(false);

  const [toastMsg, setToastMsg] = useState('Settings updated successfully!');

  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const fireToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {

    setToastMsg(msg); setToastType(type); setShowToast(true);

  };

  const [profileName, setProfileName] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const [logoUploading, setLogoUploading] = useState(false);

  const [qrUploading, setQrUploading] = useState(false);

  const [resetSent, setResetSent] = useState(false);

  const [teamSearch, setTeamSearch] = useState('');

  const [accentColor, setAccentColor] = useState('var(--color-info)');

  const [theme, setTheme] = useState('light');

  const { userData } = useAuth();



  useEffect(() => {

    if (userData) {

      if (userData.accentColor) setAccentColor(userData.accentColor);

      if (userData.theme) setTheme(userData.theme);

    }

  }, [userData]);



  const { tasks: bTasks, clients: bClients, transactions: bLedger, users, updateUser, removeUser, workerPayments: bWorkerPayments } = useData();

  const { data: bNotes } = useFirestore<any>('notes');

  const { data: bLeads } = useFirestore<any>('leads');

  const { data: bMonthlyPayments } = useFirestore<any>('monthlyPayments');

  const { data: bRecurringExpenses } = useFirestore<any>('recurringExpenses');

  const { data: bNotifications } = useFirestore<any>('notifications');

  

  const fileInputRef = useRef<HTMLInputElement>(null);

  const qrInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {

    if (userData?.name) {

      setProfileName(userData.name);

    }

  }, [userData]);



  useEffect(() => {

    document.documentElement.style.setProperty('--accent-blue', accentColor);

  }, [accentColor]);



  const filteredUsers = users.filter((u: any) =>

    (u.name || '').toLowerCase().includes(teamSearch.toLowerCase()) ||

    (u.email || '').toLowerCase().includes(teamSearch.toLowerCase())

  );



  const sections = [

    { id: 'profile',       label: 'My Profile',    icon: <User size={18} /> },

    ...(userData?.role === 'admin' ? [{ id: 'workspace',  label: 'Workspace',     icon: <Globe size={18} /> }] : []),

    ...(userData?.role === 'admin' ? [{ id: 'invoicing',  label: 'Invoicing',     icon: <FileText size={18} /> }] : []),

    ...(userData?.role === 'admin' ? [{ id: 'team',       label: 'Team',          icon: <Users size={18} /> }] : []),

    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },

    { id: 'appearance',    label: 'Appearance',    icon: <Palette size={18} /> },

    ...(userData?.role === 'admin' ? [{ id: 'data',       label: 'Data',          icon: <Database size={18} /> }] : []),

  ];



  const Toggle = ({ checked, onChange, color = 'var(--color-success)' }: { checked: boolean; onChange: () => void; color?: string }) => (

    <div onClick={onChange} style={{ width: 44, height: 26, borderRadius: 13, background: checked ? color : 'var(--border-color)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>

      <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: 'none' }} />

    </div>

  );



  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 20 * 1024 * 1024) { fireToast('Image too large. Max 20 MB.', 'error'); e.target.value = ''; return; }

    setLogoUploading(true);

    try {

      const { file: compressed } = await compressImage(file, 400, 400, 0.8);

      const sRef = storageRef(storage, 'images/studioLogo.jpg');

      await uploadBytes(sRef, compressed, { contentType: 'image/jpeg' });

      const url = await getDownloadURL(sRef);

      setStudioLogo(url);

      setIsDirty(true);

    } catch (err) {

      console.error('Logo upload failed:', err);

      fireToast('Logo upload failed. Try again.', 'error');

    } finally {

      setLogoUploading(false);

      e.target.value = '';

    }

  };



  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 20 * 1024 * 1024) { fireToast('Image too large. Max 20 MB.', 'error'); e.target.value = ''; return; }

    setQrUploading(true);

    try {

      const { file: compressed } = await compressImage(file, 400, 400, 0.8);

      const sRef = storageRef(storage, 'images/paymentQrCode.jpg');

      await uploadBytes(sRef, compressed, { contentType: 'image/jpeg' });

      const url = await getDownloadURL(sRef);

      setPaymentQrCode(url);

      setIsDirty(true);

    } catch (err) {

      console.error('QR upload failed:', err);

      fireToast('QR code upload failed. Try again.', 'error');

    } finally {

      setQrUploading(false);

      e.target.value = '';

    }

  };



  const handleFactoryReset = async () => {

    const confirmed = window.confirm(

      "⚠️ DANGER: This will permanently delete ALL tasks, clients, transactions, notes, and leads. This CANNOT be undone.\n\nAre you absolutely sure?"

    );

    if (!confirmed) return;



    const nukeWord = window.prompt("Type NUKE (all caps) to confirm permanent deletion:");

    if (nukeWord !== "NUKE") {

      fireToast('Reset cancelled — NUKE not typed correctly.', 'warning');

      return;

    }



    setIsSaving(true);

    let deleted = 0;

    let errors = 0;



    try {

      const allItems: Array<{ colName: string; id: string }> = [

        ...bTasks.map((x: any) => ({ colName: 'tasks', id: x.id })),

        ...bClients.map((x: any) => ({ colName: 'clients', id: x.id })),

        ...bLedger.map((x: any) => ({ colName: 'transactions', id: x.id })),

        ...bNotes.map((x: any) => ({ colName: 'notes', id: x.id })),

        ...(bLeads || []).map((x: any) => ({ colName: 'leads', id: x.id })),

        ...(bMonthlyPayments || []).map((x: any) => ({ colName: 'monthlyPayments', id: x.id })),

        ...(bRecurringExpenses || []).map((x: any) => ({ colName: 'recurringExpenses', id: x.id })),

        ...(bWorkerPayments || []).map((x: any) => ({ colName: 'workerPayments', id: x.id })),

        ...(bNotifications || []).map((x: any) => ({ colName: 'notifications', id: x.id }))

      ];



      for (const item of allItems) {

        try {

          await deleteDoc(doc(db, item.colName, item.id));

          deleted++;

        } catch {

          errors++;

        }

      }



      if (errors === 0) {

        fireToast(`System reset complete — ${deleted} records deleted.`);

      } else {

        fireToast(`Partial reset: ${deleted} deleted, ${errors} failed. Check console.`, 'warning');

      }

    } catch {

      fireToast('Unexpected error. Check browser console (F12).', 'error');

    } finally {

      setIsSaving(false);

    }

  };



  const [exportingFull, setExportingFull] = useState(false);

  const [exportProgress, setExportProgress] = useState('');



  const handleExport = async () => {

    setExportingFull(true);

    setExportProgress('Starting full export...');

    try {

      await exportAllData((msg) => setExportProgress(msg));

      fireToast('Full backup exported!');

    } catch {

      fireToast('Export failed. Try again.', 'error');

    } finally {

      setExportingFull(false);

      setExportProgress('');

    }

  };



  const [isDirty, setIsDirty] = useState(false);



  const handleSave = async () => {

    if (isSaving) return;

    if (!studioName?.trim()) { fireToast('Studio name cannot be empty.', 'error'); return; }

    if (studioEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studioEmail.trim())) { fireToast('Invalid email format.', 'error'); return; }

    if (workHoursStart >= workHoursEnd) { fireToast('Work hours: start must be before end.', 'error'); return; }

    if (monthlyGoal < 0 || defaultComposerComm < 0 || defaultHummingComm < 0) { fireToast('Amounts and commissions cannot be negative.', 'error'); return; }

    if (defaultComposerComm > 100 || defaultHummingComm > 100) { fireToast('Commission cannot exceed 100%.', 'error'); return; }



    setIsSaving(true);

    if (userData?.uid) {

      try {

        const updates: any = {};

        if (profileName !== userData?.name) updates.name = profileName;

        if (theme !== userData?.theme) updates.theme = theme;

        if (accentColor !== userData?.accentColor) updates.accentColor = accentColor;

        

        if (Object.keys(updates).length > 0) {

          await updateDoc(doc(db, 'users', userData.uid), updates);

        }

        

        if (auth.currentUser && profileName !== userData?.name) {

          await updateProfile(auth.currentUser, { displayName: profileName });

        }

        

        await updateSettings({

          studioName, studioLogo, studioAddress, studioEmail, studioPhone,

          currency, paymentQrCode, defaultComposerComm, defaultHummingComm, monthlyGoal,

          invoicePrefix, invoiceNotes, invoiceTaxRate,

          workHoursStart, workHoursEnd, sessionDurationDefault, autoCompleteDays,

          notifyOverdue, notifyUpcoming, notifyPayment,

          socialWhatsapp, socialFacebook, socialYoutube, socialInstagram,

          statsProjects, statsArtists, statsViews, statsTrustLabel,

        });

        setIsDirty(false);

        fireToast('Settings saved!');

      } catch {

        fireToast('Failed to save settings.', 'error');

      } finally {

        setIsSaving(false);

      }

    } else {

      setIsSaving(false);

      fireToast('Not authenticated. Please sign in again.', 'error');

    }

  };



  const handlePasswordReset = async () => {

    if (userData?.email) {

      try {

        await sendPasswordResetEmail(auth, userData.email);

        setResetSent(true);

      } catch {

        fireToast('Failed to send reset email.', 'error');

      }

    }

  };



  const roleColors: Record<string,string> = { admin:'var(--accent-red)', composer:'var(--accent-blue)', humming_artist:'var(--accent-purple)', client:'var(--accent-green)' };

  const roleLabels: Record<string,string> = { admin:'Admin', composer:'Composer', humming_artist:'Vocal Artist', client:'Client' };



  return (

    <div className="settings-page">



      <div className="page-header">

        <div className="page-header-left">

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>

            <div className="icon-badge" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', boxShadow: 'none' }}>

              <SettingsIcon size={20} />

            </div>

            <h1 className="page-title">Settings</h1>

          </div>

        </div>

      </div>



      {/* Segmented Navigation */}

      <div className="tab-bar custom-scrollbar" style={{ marginBottom: 'var(--space-8)', overflowX: 'auto' }}>

        {sections.map(s => (

          <button key={s.id} className={`tab-item${activeTab === s.id ? ' active' : ''}`} onClick={() => setActiveTab(s.id)} style={{ flex: 1, gap: 'var(--space-2)' }}>

            <span style={{ color: activeTab === s.id ? 'var(--accent-blue)' : 'inherit' }}>{s.icon}</span>

            {s.label}

          </button>

        ))}

      </div>



      <AnimatePresence mode="wait">

        <motion.div 

          key={activeTab}

          initial={{ opacity: 0, y: 10, scale: 0.99 }}

          animate={{ opacity: 1, y: 0, scale: 1 }}

          exit={{ opacity: 0, y: -10, scale: 0.99 }}

          transition={{ duration: 0.15, ease: 'easeOut' }}

        >

          {/* PROFILE TAB */}

          {activeTab === 'profile' && (

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

                <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Display Name</label>

                  <input type="text" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={profileName} onChange={e => { setProfileName(e.target.value); setIsDirty(true); }} placeholder="Your full name" />

                </div>

                <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.65 }}>

                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Email</label>

                  <input type="email" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-tertiary)', outline: 'none', width: '60%' }} value={userData?.email || ''} disabled />

                </div>

                <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <div>

                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Password Reset</div>

                  </div>

                  <button onClick={handlePasswordReset} disabled={resetSent} className={`btn ${resetSent ? 'btn-ghost' : 'btn-primary'} btn-sm`}>

                    {resetSent ? '✓ Sent' : 'Send Link'}

                  </button>

                </div>

              </div>

            </div>

          )}



          {/* WORKSPACE TAB */}

          {activeTab === 'workspace' && userData?.role === 'admin' && (

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

              

              <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                {/* Logo Upload Section */}

                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <div>

                    <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Company Logo</label>

                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-color)', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

                      {studioLogo ? <img src={studioLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={24} color="var(--text-tertiary)" />}

                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                      <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading} style={{ padding: '6px 14px', borderRadius: 10, background: 'var(--color-info)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: logoUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: logoUploading ? 0.7 : 1 }}>

                        {logoUploading ? <Spinner size={12} color="white" /> : <Upload size={14} />}

                        {logoUploading ? 'Uploading...' : 'Upload'}

                      </button>

                      {studioLogo && !logoUploading && (

                        <button onClick={() => { setStudioLogo(''); setIsDirty(true); }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>

                          Remove

                        </button>

                      )}

                      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />

                    </div>

                  </div>

                </div>



                {/* QR Code Upload Section */}

                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <div>

                    <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Payment QR Code</label>

                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-color)', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

                      {paymentQrCode ? <img src={paymentQrCode} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={24} color="var(--text-tertiary)" />}

                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                      <button onClick={() => qrInputRef.current?.click()} disabled={qrUploading} style={{ padding: '6px 14px', borderRadius: 10, background: 'var(--color-info)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: qrUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: qrUploading ? 0.7 : 1 }}>

                        {qrUploading ? <Spinner size={12} color="white" /> : <Upload size={14} />}

                        {qrUploading ? 'Uploading...' : 'Upload'}

                      </button>

                      {paymentQrCode && !qrUploading && (

                        <button onClick={() => { setPaymentQrCode(''); setIsDirty(true); }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>

                          Remove

                        </button>

                      )}

                      <input type="file" ref={qrInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleQrUpload} />

                    </div>

                  </div>

                </div>



                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Company Name</label>

                  <input type="text" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={studioName} onChange={e => { setStudioName(e.target.value); setIsDirty(true); }} />

                </div>

                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Business Address</label>

                  <input type="text" placeholder="e.g. Dhaka, Bangladesh" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={studioAddress} onChange={e => { setStudioAddress(e.target.value); setIsDirty(true); }} />

                </div>

                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Public Email</label>

                  <input type="email" placeholder="tanvirstudiots@gmail.com" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={studioEmail} onChange={e => { setStudioEmail(e.target.value); setIsDirty(true); }} />

                </div>

                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Contact Phone</label>

                  <input type="text" placeholder="+880..." style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={studioPhone} onChange={e => { setStudioPhone(e.target.value); setIsDirty(true); }} />

                </div>

                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                  <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Currency</label>

                  <select style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer', appearance: 'none' }} value={currency} onChange={e => { setCurrency(e.target.value); setIsDirty(true); }}>

                    <option value="৳">Bangladeshi Taka (৳)</option>

                    <option value="$">US Dollar ($)</option>

                    <option value="€">Euro (€)</option>

                    <option value="₹">Indian Rupee (₹)</option>

                  </select>

                </div>

              </div>



              <div>

                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Financials</div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Composer Commission</label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

                      <input type="number" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-info)', outline: 'none', width: 50 }} value={defaultComposerComm} onChange={e => { setDefaultComposerComm(Number(e.target.value)); setIsDirty(true); }} />

                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)' }}>%</span>

                    </div>

                  </div>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Vocal Artist Commission</label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

                      <input type="number" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-warning)', outline: 'none', width: 50 }} value={defaultHummingComm} onChange={e => { setDefaultHummingComm(Number(e.target.value)); setIsDirty(true); }} />

                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-warning)' }}>%</span>

                    </div>

                  </div>

                  <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Revenue Goal</label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-success)' }}>{settings.currency}</span>

                      <input type="number" min="0" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-success)', outline: 'none', width: 80 }} value={monthlyGoal || ''} placeholder="0" onChange={e => { setMonthlyGoal(Number(e.target.value)); setIsDirty(true); }} />

                    </div>

                  </div>

                </div>

              </div>



              <div>

                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Social Media</div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                  {[

                    { label: '💬 WhatsApp', placeholder: '+880 1700 000000', value: socialWhatsapp, set: setSocialWhatsapp },

                    { label: '📘 Facebook', placeholder: 'facebook.com/yourstudio', value: socialFacebook, set: setSocialFacebook },

                    { label: '▶️ YouTube',  placeholder: 'youtube.com/@yourstudio', value: socialYoutube,  set: setSocialYoutube },

                    { label: '📸 Instagram', placeholder: 'instagram.com/yourstudio', value: socialInstagram, set: setSocialInstagram },

                  ].map(({ label, placeholder, value, set }, i, arr) => (

                    <div key={label} style={{ padding: '18px 24px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{label}</label>

                      <input type="text" placeholder={placeholder} style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', outline: 'none', flex: 1, minWidth: 0 }} value={value} onChange={e => { set(e.target.value); setIsDirty(true); }} />

                    </div>

                  ))}

                </div>

              </div>



              <div>

                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Homepage Stats</div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Section Heading</label>

                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Shown above the 4 stat boxes</span>

                    </div>

                    <input type="text" placeholder="10 years of trust." style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', outline: 'none', width: '50%' }} value={statsTrustLabel} onChange={e => { setStatsTrustLabel(e.target.value); setIsDirty(true); }} />

                  </div>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Projects Completed</label>

                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Number only (e.g. 999)</span>

                    </div>

                    <input type="number" min="0" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-info)', outline: 'none', width: 80 }} value={statsProjects} onChange={e => { setStatsProjects(Number(e.target.value)); setIsDirty(true); }} />

                  </div>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Partnered Artists</label>

                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Number only (e.g. 99)</span>

                    </div>

                    <input type="number" min="0" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-info)', outline: 'none', width: 80 }} value={statsArtists} onChange={e => { setStatsArtists(Number(e.target.value)); setIsDirty(true); }} />

                  </div>

                  <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Global Streams & Views</label>

                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Text (e.g. 1B+)</span>

                    </div>

                    <input type="text" placeholder="1B+" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-info)', outline: 'none', width: 80 }} value={statsViews} onChange={e => { setStatsViews(e.target.value); setIsDirty(true); }} />

                  </div>

                </div>

              </div>



            </div>

          )}



          {/* INVOICING TAB */}

          {activeTab === 'invoicing' && userData?.role === 'admin' && (

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>



              <div>

                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Invoice Format</div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Invoice Prefix</label>

                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>e.g. INV → INV-001, INV-002...</div>

                    </div>

                    <input type="text" maxLength={6} style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'var(--color-info)', outline: 'none', width: 72, borderRadius: 8, padding: '6px 10px', letterSpacing: 1 }} value={invoicePrefix} onChange={e => { setInvoicePrefix(e.target.value.toUpperCase()); setIsDirty(true); }} />

                  </div>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Tax Rate</label>

                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Applied on invoice subtotal (0 = no tax)</div>

                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

                      <input type="number" min={0} max={100} style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-warning)', outline: 'none', width: 50 }} value={invoiceTaxRate} onChange={e => { setInvoiceTaxRate(Number(e.target.value)); setIsDirty(true); }} />

                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-warning)' }}>%</span>

                    </div>

                  </div>

                  <div style={{ padding: '20px 24px' }}>

                    <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 10 }}>Default Invoice Notes</label>

                    <textarea rows={3} placeholder="e.g. Payment due within 7 days. Thank you for your business!" style={{ width: '100%', border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 16, fontWeight: 400, color: 'var(--text-primary)', outline: 'none', borderRadius: 8, padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }} value={invoiceNotes} onChange={e => { setInvoiceNotes(e.target.value); setIsDirty(true); }} />

                  </div>

                </div>

              </div>



              <div>

                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Session Booking</div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Default Session Length</label>

                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Pre-selected when opening the date picker</div>

                    </div>

                    <select style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 10px' }} value={sessionDurationDefault} onChange={e => { setSessionDurationDefault(Number(e.target.value)); setIsDirty(true); }}>

                      {[30,60,90,120,180,240].map(m => <option key={m} value={m}>{m < 60 ? `${m}m` : `${m/60}h`}</option>)}

                    </select>

                  </div>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Studio Opens</label>

                    </div>

                    <select style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 10px' }} value={workHoursStart} onChange={e => { setWorkHoursStart(Number(e.target.value)); setIsDirty(true); }}>

                      {Array.from({length:14},(_,i)=>i+8).map(h => <option key={h} value={h}>{h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}</option>)}

                    </select>

                  </div>

                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Studio Closes</label>

                    <select style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 10px' }} value={workHoursEnd} onChange={e => { setWorkHoursEnd(Number(e.target.value)); setIsDirty(true); }}>

                      {Array.from({length:14},(_,i)=>i+9).map(h => <option key={h} value={h}>{h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}</option>)}

                    </select>

                  </div>

                  <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div>

                      <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Auto-Complete After</label>

                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Days after delivery before project auto-completes</div>

                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

                      <input type="number" min="1" max="90" style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', borderRadius: 8, padding: '6px 10px', width: 60, textAlign: 'right' }} value={autoCompleteDays} onChange={e => { setAutoCompleteDays(Math.max(1, Number(e.target.value))); setIsDirty(true); }} />

                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)' }}>days</span>

                    </div>

                  </div>

                </div>

              </div>



            </div>

          )}



          {/* TEAM TAB */}

          {activeTab === 'team' && userData?.role === 'admin' && (

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

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

                {filteredUsers.map((u: any, idx: number) => (

                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: idx === filteredUsers.length - 1 ? 'none' : '1px solid var(--border-color)' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${roleColors[u.role] || '#8E8E93'}18`, color: roleColors[u.role] || '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>

                        {u.name ? u.name[0].toUpperCase() : 'U'}

                      </div>

                      <div>

                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{u.name || 'Studio User'}</div>

                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, fontWeight: 400 }}>{u.email}</div>

                      </div>

                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

                      <select style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 13, fontWeight: 400, padding: '6px 10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }} value={u.role || 'client'} onChange={e => { updateUser(u.id, { role: e.target.value as any }); fireToast('Role updated!'); }}>

                        <option value="client">Client</option>

                        <option value="composer">Composer</option>

                                                <option value="humming_artist">Vocal Artist</option>

                        <option value="admin">Admin</option>

                      </select>

                      {userData?.uid !== u.id && (

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

          )}



          {/* NOTIFICATIONS TAB */}

          {activeTab === 'notifications' && (

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

              <div>

                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>In-App Alerts</div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                  {[

                    { label: 'Overdue Task Alerts', sub: 'Show badge on dashboard for tasks past deadline', checked: notifyOverdue, toggle: () => { setNotifyOverdue(v => !v); setIsDirty(true); }, color: 'var(--color-danger)' },

                    { label: 'Upcoming Deadlines', sub: 'Warn when a task deadline is within 3 days', checked: notifyUpcoming, toggle: () => { setNotifyUpcoming(v => !v); setIsDirty(true); }, color: 'var(--color-warning)' },

                    { label: 'Payment Received', sub: 'Highlight new payments on the dashboard', checked: notifyPayment, toggle: () => { setNotifyPayment(v => !v); setIsDirty(true); }, color: 'var(--color-success)' },

                  ].map(({ label, sub, checked, toggle, color }, i, arr) => (

                    <div key={label} style={{ padding: '20px 24px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

                      <div style={{ flex: 1 }}>

                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>

                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{sub}</div>

                      </div>

                      <Toggle checked={checked} onChange={toggle} color={color} />

                    </div>

                  ))}

                </div>

              </div>

            </div>

          )}



          {/* APPEARANCE TAB */}

          {activeTab === 'appearance' && (

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

              <div>

                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Theme</div>

                <div style={{ display: 'flex', gap: 16 }}>

                  {[{ id: 'light', emoji: '☀️', label: 'Light Mode' }, { id: 'dark', emoji: '🌙', label: 'Dark Mode' }].map(t => (

                    <button key={t.id} onClick={() => { setTheme(t.id); setIsDirty(true); }}

                      style={{ flex: 1, padding: '16px', borderRadius: 8, border: `1px solid ${theme === t.id ? 'var(--color-info)' : 'var(--border-color)'}`,

                        cursor: 'pointer', fontSize: 14, fontWeight: 500,

                        background: theme === t.id ? 'rgba(0,122,255,0.06)' : 'var(--surface-1)',

                        color: theme === t.id ? 'var(--color-info)' : 'var(--text-primary)',

                        transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

                      <span style={{ fontSize: 22 }}>{t.emoji}</span> {t.label}

                    </button>

                  ))}

                </div>

              </div>



              <div>

                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Accent color</div>

                <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '16px', border: '1px solid var(--border-color)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>

                  {[{ color: 'var(--color-info)', name: 'Blue' }, { color: 'var(--color-success)', name: 'Green' }, { color: 'var(--color-danger)', name: 'Red' }, { color: 'var(--color-warning)', name: 'Orange' }, { color: 'var(--accent-purple)', name: 'Purple' }].map(t => (

                    <button key={t.name} onClick={() => { setAccentColor(t.color); setIsDirty(true); }} title={t.name}

                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>

                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: t.color, border: accentColor === t.color ? '4px solid var(--text-primary)' : '4px solid transparent', boxShadow: accentColor === t.color ? `0 0 0 2px ${t.color}40, 0 8px 24px ${t.color}60` : `0 4px 12px ${t.color}40`, transition: 'all 0.2s ease-out', transform: accentColor === t.color ? 'scale(1.1)' : 'scale(1)' }} />

                      <span style={{ fontSize: 12, fontWeight: 700, color: accentColor === t.color ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{t.name}</span>

                    </button>

                  ))}

                </div>

              </div>

            </div>

          )}



          {/* DATA TAB */}

          {activeTab === 'data' && userData?.role === 'admin' && (

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>

                <div className="card" style={{ padding: '20px', borderLeft: '3px solid var(--color-info)' }}>

                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Full Backup</div>

                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.5 }}>Export ALL collections: tasks, clients, finance, workers, comms, logs, etc. as a single JSON file.</div>

                  {exportProgress && <div style={{ fontSize: 11, color: 'var(--color-info)', marginBottom: 8, fontWeight: 600 }}>{exportProgress}</div>}

                  <button className="btn btn-primary" style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 13 }} onClick={handleExport} disabled={exportingFull}>

                    {exportingFull ? 'Exporting...' : 'Download Full Backup'}

                  </button>

                </div>



                <div className="card" style={{ padding: '20px', borderLeft: '3px solid var(--color-danger)' }}>

                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 6 }}>Reset workspace</div>

                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 20, lineHeight: 1.5 }}>Permanently delete all data. This cannot be undone.</div>

                  <button style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(255,59,48,0.2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={handleFactoryReset}>

                    Reset

                  </button>

                </div>

              </div>

            </div>

          )}



        </motion.div>

      </AnimatePresence>



      {/* Futuristic Floating Save Bar */}

      <AnimatePresence>

        {isDirty && (

          <motion.div initial={{ y: 150, x: '-50%', opacity: 0 }} animate={{ y: 0, x: '-50%', opacity: 1 }} exit={{ y: 150, x: '-50%', opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}

            style={{ position: 'fixed', bottom: 24, left: '50%', background: 'var(--card-bg)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '10px 12px 10px 20px', borderRadius: 10, border: '1px solid var(--border-color)', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: 16, zIndex: 100 }}>

            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.2px' }}>{isSaving ? 'Applying changes...' : 'Unsaved changes'}</span>

            <button onClick={handleSave} disabled={isSaving}

              style={{ padding: '8px 18px', borderRadius: 7, background: 'var(--color-info)', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s' }}

              onMouseOver={e=>e.currentTarget.style.transform='scale(1.03)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}

            >

              <Save size={16} /> {isSaving ? 'Saving...' : 'Apply Configuration'}

            </button>

          </motion.div>

        )}

      </AnimatePresence>



      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} />}

    </div>

  );

}

