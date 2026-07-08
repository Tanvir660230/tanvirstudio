import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Palette, Globe, Save, Database, Settings as SettingsIcon, FileText, Bell } from 'lucide-react';
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
import { compressImage } from '../utils/imageUtils';
import { ProfileTab } from './settings/ProfileTab';
import { WorkspaceTab } from './settings/WorkspaceTab';
import { InvoicingTab } from './settings/InvoicingTab';
import { TeamTab } from './settings/TeamTab';
import { NotificationsTab } from './settings/NotificationsTab';
import { AppearanceTab } from './settings/AppearanceTab';
import { DataTab } from './settings/DataTab';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileName(userData.name);
    }
  }, [userData]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-blue', accentColor);
  }, [accentColor]);

  const filteredUsers = users.filter((u) =>
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
            <ProfileTab
              profileName={profileName}
              onProfileNameChange={(v) => { setProfileName(v); setIsDirty(true); }}
              userData={userData}
              resetSent={resetSent}
              onPasswordReset={handlePasswordReset}
              roleColors={roleColors}
              roleLabels={roleLabels}
            />
          )}

          {/* WORKSPACE TAB */}
          {activeTab === 'workspace' && userData?.role === 'admin' && (
            <WorkspaceTab
              studioLogo={studioLogo} setStudioLogo={setStudioLogo}
              studioName={studioName} setStudioName={setStudioName}
              studioAddress={studioAddress} setStudioAddress={setStudioAddress}
              studioEmail={studioEmail} setStudioEmail={setStudioEmail}
              studioPhone={studioPhone} setStudioPhone={setStudioPhone}
              currency={currency} setCurrency={setCurrency}
              paymentQrCode={paymentQrCode} setPaymentQrCode={setPaymentQrCode}
              defaultComposerComm={defaultComposerComm} setDefaultComposerComm={setDefaultComposerComm}
              defaultHummingComm={defaultHummingComm} setDefaultHummingComm={setDefaultHummingComm}
              monthlyGoal={monthlyGoal} setMonthlyGoal={setMonthlyGoal}
              displayCurrency={settings.currency}
              socialWhatsapp={socialWhatsapp} setSocialWhatsapp={setSocialWhatsapp}
              socialFacebook={socialFacebook} setSocialFacebook={setSocialFacebook}
              socialYoutube={socialYoutube} setSocialYoutube={setSocialYoutube}
              socialInstagram={socialInstagram} setSocialInstagram={setSocialInstagram}
              statsTrustLabel={statsTrustLabel} setStatsTrustLabel={setStatsTrustLabel}
              statsProjects={statsProjects} setStatsProjects={setStatsProjects}
              statsArtists={statsArtists} setStatsArtists={setStatsArtists}
              statsViews={statsViews} setStatsViews={setStatsViews}
              logoUploading={logoUploading} qrUploading={qrUploading}
              fileInputRef={fileInputRef} qrInputRef={qrInputRef}
              handleLogoUpload={handleLogoUpload} handleQrUpload={handleQrUpload}
              setIsDirty={setIsDirty}
            />
          )}

          {/* INVOICING TAB */}
          {activeTab === 'invoicing' && userData?.role === 'admin' && (
            <InvoicingTab
              invoicePrefix={invoicePrefix} setInvoicePrefix={setInvoicePrefix}
              invoiceNotes={invoiceNotes} setInvoiceNotes={setInvoiceNotes}
              invoiceTaxRate={invoiceTaxRate} setInvoiceTaxRate={setInvoiceTaxRate}
              sessionDurationDefault={sessionDurationDefault} setSessionDurationDefault={setSessionDurationDefault}
              workHoursStart={workHoursStart} setWorkHoursStart={setWorkHoursStart}
              workHoursEnd={workHoursEnd} setWorkHoursEnd={setWorkHoursEnd}
              autoCompleteDays={autoCompleteDays} setAutoCompleteDays={setAutoCompleteDays}
              setIsDirty={setIsDirty}
            />
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && userData?.role === 'admin' && (
            <TeamTab
              users={users}
              filteredUsers={filteredUsers}
              teamSearch={teamSearch}
              setTeamSearch={setTeamSearch}
              roleColors={roleColors}
              currentUid={userData?.uid}
              updateUser={updateUser}
              removeUser={removeUser}
              fireToast={fireToast}
            />
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <NotificationsTab
              notifyOverdue={notifyOverdue} setNotifyOverdue={setNotifyOverdue}
              notifyUpcoming={notifyUpcoming} setNotifyUpcoming={setNotifyUpcoming}
              notifyPayment={notifyPayment} setNotifyPayment={setNotifyPayment}
              setIsDirty={setIsDirty}
            />
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <AppearanceTab
              theme={theme} setTheme={setTheme}
              accentColor={accentColor} setAccentColor={setAccentColor}
              setIsDirty={setIsDirty}
            />
          )}

          {/* DATA TAB */}
          {activeTab === 'data' && userData?.role === 'admin' && (
            <DataTab
              isMobile={isMobile}
              exportProgress={exportProgress}
              exportingFull={exportingFull}
              handleExport={handleExport}
              handleFactoryReset={handleFactoryReset}
            />
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
