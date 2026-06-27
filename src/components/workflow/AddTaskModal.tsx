import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, User, X, Plus, Zap, Mic, Radio, Keyboard, ClipboardList, ChevronDown, Calendar as CalendarIcon, DollarSign, Users, FileText } from 'lucide-react';
import { Modal } from '../Modal';
import { PremiumDatePicker } from '../PremiumDatePicker';
import { useSettings } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';
import { useFirestore } from '../../hooks/useFirestore';
import { Spinner } from '../Spinner';

const TASK_TEMPLATES = [
  { id: 'standard', label: 'Standard', icon: <Music2 size={14} />, composerCommissionPct: 15, hummingArtistCommissionPct: 10, needsHumming: false, priority: 'normal', status: 'recording' },
  { id: 'cover', label: 'Cover Song', icon: <Mic size={14} />, composerCommissionPct: 20, hummingArtistCommissionPct: 15, needsHumming: true, priority: 'normal', status: 'recording' },
  { id: 'jingle', label: 'Jingle', icon: <Radio size={14} />, composerCommissionPct: 10, hummingArtistCommissionPct: 8, needsHumming: true, priority: 'high', status: 'recording' },
  { id: 'instrumental', label: 'Instrumental', icon: <Keyboard size={14} />, composerCommissionPct: 20, hummingArtistCommissionPct: 0, needsHumming: false, priority: 'normal', status: 'recording' },
];

const STAGES = [
  { v: 'recording',    l: 'Recording',    emoji: '🎙️' },
  { v: 'arrangement',  l: 'Arrangement',  emoji: '🎹' },
  { v: 'humming',      l: 'Humming',      emoji: '🎵' },
  { v: 'composition',  l: 'Composition',  emoji: '🎼' },
  { v: 'revision',     l: 'Revision',     emoji: '✏️' },
  { v: 'delivered',    l: 'Delivered',    emoji: '📦' },
  { v: 'completed',    l: 'Completed',    emoji: '✅' },
];

const PRIORITIES = [
  { v: 'normal', l: 'Normal', color: 'var(--text-tertiary)', bg: 'var(--bg-color)' },
  { v: 'high',   l: 'High',   color: 'var(--color-warning)', bg: 'var(--color-warning)15' },
  { v: 'urgent', l: 'Urgent', color: 'var(--color-danger)', bg: 'var(--color-danger)15' },
];

interface AddTaskModalProps {
  isOpen: boolean; onClose: () => void; newTask: any; setNewTask: (task: any) => void;
  handleAddTask: (e: React.FormEvent) => void; isSubmitting: boolean; currency: string;
  clients: any[]; composers: any[]; hummingArtists: any[]; rawTasks: any[];
  clientSearch: string; setClientSearch: (val: string) => void;
  isClientDropdownOpen: boolean; setIsClientDropdownOpen: (val: boolean) => void;
  isAddingNewClientDetails: boolean; setIsAddingNewClientDetails: (val: boolean) => void;
  setShowToast: (val: boolean) => void; isAdmin: boolean;
}

export function AddTaskModal({
  isOpen, onClose, newTask, setNewTask, handleAddTask, isSubmitting, currency,
  clients, composers, hummingArtists, rawTasks,
  clientSearch, setClientSearch, isClientDropdownOpen, setIsClientDropdownOpen,
  isAddingNewClientDetails, setIsAddingNewClientDetails, setShowToast, isAdmin
}: AddTaskModalProps) {
  const { settings } = useSettings();

  // --- Smart Handlers ---
  const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setClientSearch(val);
    setIsClientDropdownOpen(true);
    const tsnPrefix = newTask.title.split(' ')[0];
    setNewTask({ ...newTask, client: val, clientEmail: '', title: `${tsnPrefix} ${val || 'Client'} - ${newTask.songName || 'Song Name'}` });
  };

  const handleSelectClient = (c: any) => {
    const tsnPrefix = newTask.title.split(' ')[0];
    const lastTask = [...rawTasks].filter((t: any) => t.client === c.name && t.composerId).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
    setNewTask({ 
      ...newTask, 
      client: c.name, 
      clientPhone: c.phone || '', 
      clientEmail: c.email || '', 
      title: `${tsnPrefix} ${c.name} - ${newTask.songName || 'Song Name'}`, 
      ...(lastTask ? { 
        composerId: lastTask.composerId, 
        composerCommissionPct: lastTask.composerCommissionPct, 
        composerCommissionType: lastTask.composerCommissionType || 'percentage', 
        hummingArtistId: '', 
        hummingArtistCommissionPct: 10, 
        needsHumming: false 
      } : { needsHumming: false }) 
    });
    setClientSearch(c.name); 
    setIsClientDropdownOpen(false); 
    setIsAddingNewClientDetails(false);
  };

  const handleCreateNewClient = () => {
    let prefillName = clientSearch, prefillPhone = '', prefillEmail = '';
    if (/^[\d\s+\-()]+$/.test(clientSearch) && clientSearch.length >= 7) { prefillPhone = clientSearch; prefillName = 'New Client'; }
    else if (clientSearch.includes('@')) { prefillEmail = clientSearch; prefillName = 'New Client'; }
    else { prefillName = clientSearch.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }
    const tsnPrefix = newTask.title.split(' ')[0];
    setNewTask({ ...newTask, client: prefillName, clientPhone: prefillPhone, clientEmail: prefillEmail, title: `${tsnPrefix} ${prefillName} - ${newTask.songName || 'Song Name'}` });
    setClientSearch(prefillName); 
    setIsClientDropdownOpen(false); 
    setIsAddingNewClientDetails(true);
  };

  const handleSongNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const capitalizedSong = val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const tsnPrefix = newTask.title.split(' ')[0];
    setNewTask({ ...newTask, songName: capitalizedSong, title: `${tsnPrefix} ${newTask.client || 'Client'} - ${capitalizedSong || 'Song Name'}` });
  };

  // --- Smart Calculations ---
  const parsedBudget = parseFloat(newTask?.budget || 0) || 0;
  const parsedAdvance = parseFloat(newTask?.advance || 0) || 0;
  const dueAmount = Math.max(0, parsedBudget - parsedAdvance);

  const composerAmount = newTask?.composerCommissionType === 'flat' 
    ? (parseFloat(newTask?.composerCommissionAmount || 0) || 0)
    : (parsedBudget * (parseFloat(newTask?.composerCommissionPct || 15) || 0) / 100);

  const artistAmount = newTask?.needsHumming 
    ? (newTask?.hummingArtistCommissionType === 'flat' 
        ? (parseFloat(newTask?.hummingArtistCommissionAmount || 0) || 0)
        : (parsedBudget * (parseFloat(newTask?.hummingArtistCommissionPct || 10) || 0) / 100))
    : 0;

  const netProfit = parsedBudget - composerAmount - artistAmount;
  const profitMargin = parsedBudget > 0 ? ((netProfit / parsedBudget) * 100).toFixed(1) : 0;
  
  const composerPct = parsedBudget > 0 ? (composerAmount / parsedBudget) * 100 : 0;
  const artistPct = parsedBudget > 0 ? (artistAmount / parsedBudget) * 100 : 0;
  const profitPct = parsedBudget > 0 ? Math.max(0, (netProfit / parsedBudget) * 100) : 0;
  const advancePct = parsedBudget > 0 ? Math.min(100, (parsedAdvance / parsedBudget) * 100) : 0;

  if (!newTask) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl" noPadding>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--card-bg)', borderRadius: 20 }}>
        
        {/* Header */}
        <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          
          {/* Left: Icon & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--gradient-gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow-gold)' }}>
              <Music2 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                Create New Project
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Set up a new order and assign your team</div>
            </div>
          </div>
          
          {/* Right: Project ID & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <AnimatePresence>
              {(newTask.client || newTask.songName) && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'stretch', height: 32, background: 'var(--accent-gold-glow)', borderRadius: 8, border: '1px solid var(--accent-gold-deep)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: 'var(--accent-gold-deep)', borderRight: '1px solid var(--accent-gold-deep)' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={newTask.title}>{newTask.title}</span>
                  </div>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(newTask.title); setShowToast(true); }} style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderLeft: '1px solid var(--accent-gold-deep)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--color-primary)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'transparent'; }} title="Copy ID">
                    <ClipboardList size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--border-color)'} onMouseOut={e => e.currentTarget.style.background = 'var(--bg-color)'}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form id="add-task-form" onSubmit={handleAddTask} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 32 }} className="custom-scrollbar">
          
          {/* Main Grid: Responsive Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* Column 1: The Deal (Business & Intake) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'linear-gradient(180deg, var(--bg-color) 0%, rgba(255,255,255,0) 100%)', borderRadius: 24, padding: 24, border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                <FileText size={16} color="var(--text-tertiary)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Identity & Deal</span>
              </div>

              {/* Client Details */}
              <div style={{ position: 'relative' }}>
                <label className="form-label">Client / Partner <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="text" placeholder="Search or add client..." className="form-input" style={{ paddingLeft: 40 }} value={clientSearch} onFocus={() => setIsClientDropdownOpen(true)} onBlur={() => setTimeout(() => setIsClientDropdownOpen(false), 200)} onChange={handleClientSearchChange} required />
                </div>

                <AnimatePresence>
                  {isClientDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 8, background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }} className="custom-scrollbar">
                        {clients.filter((c: any) => {
                          const q = clientSearch.toLowerCase();
                          return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                        }).map((c: any) => (
                          <div key={c.id} onMouseDown={e => {
                            e.preventDefault();
                            handleSelectClient(c);
                          }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-color)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-info)15', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>{c.name?.charAt(0).toUpperCase()}</div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                              {(c.company || c.phone) && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.company || c.phone}</div>}
                            </div>
                          </div>
                        ))}
                        {clientSearch && !clients.some((c: any) => (c.name || '').toLowerCase() === clientSearch.trim().toLowerCase()) && (
                          <div onMouseDown={e => {
                            e.preventDefault();
                            handleCreateNewClient();
                          }} style={{ padding: '12px 16px', fontSize: 14, cursor: 'pointer', color: 'var(--color-success)', background: 'var(--color-success)10', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Plus size={16} /> Add "{clientSearch}" as New Client
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isAddingNewClientDetails && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                    <input type="text" placeholder="Phone..." className="form-input" value={newTask.clientPhone || ''} onChange={e => setNewTask({ ...newTask, clientPhone: e.target.value })} />
                    <input type="email" placeholder="Email..." className="form-input" value={newTask.clientEmail || ''} onChange={e => setNewTask({ ...newTask, clientEmail: e.target.value })} />
                  </motion.div>
                )}
              </div>

              {/* Project Name */}
              <div>
                <label className="form-label">Project Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Music2 size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="text" placeholder="e.g. Commercial Jingle" className="form-input" style={{ paddingLeft: 40 }} value={newTask.songName || ''} onChange={handleSongNameChange} required />
                </div>
              </div>

              {/* Financials (Admin) */}
              {isAdmin && (
                <div style={{ background: 'var(--bg-color)', borderRadius: 16, padding: 16, border: '1px solid var(--border-color)', marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-success)15', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={14} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>FINANCIAL DEAL</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: '1 1 120px' }}>
                      <label className="form-label" style={{ marginBottom: 6 }}>Total Budget</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)' }}>{currency}</span>
                        <input type="number" placeholder="0" className="form-input" style={{ paddingLeft: 28, background: 'var(--card-bg)' }} value={newTask.budget || ''} onChange={e => setNewTask({ ...newTask, budget: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                      <label className="form-label" style={{ marginBottom: 6 }}>Advance Paid</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)' }}>{currency}</span>
                        <input type="number" placeholder="0" className="form-input" style={{ paddingLeft: 28, background: 'var(--card-bg)' }} value={newTask.advance || ''} onChange={e => setNewTask({ ...newTask, advance: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Premium Insights Widget */}
                  {parsedBudget > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ 
                        marginTop: 16, 
                        background: 'linear-gradient(145deg, var(--bg-color), var(--card-bg))', 
                        borderRadius: 14, 
                        border: '1px solid var(--border-color)', 
                        overflow: 'hidden',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Deal Insights</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: netProfit >= 0 ? 'var(--color-success)15' : 'var(--color-danger)15', padding: '4px 8px', borderRadius: 20 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }} />
                          <span style={{ fontSize: 11, fontWeight: 800, color: netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {profitMargin}% Margin
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Collection Progress */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Collected: {currency}{parsedAdvance.toLocaleString()}</span>
                            <span style={{ color: dueAmount > 0 ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 700 }}>
                              {dueAmount > 0 ? `Due: ${currency}${dueAmount.toLocaleString()}` : 'Fully Paid 🎉'}
                            </span>
                          </div>
                          <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${advancePct}%` }} 
                              style={{ height: '100%', background: advancePct >= 100 ? 'var(--color-success)' : 'var(--color-warning)', borderRadius: 3 }} 
                            />
                          </div>
                        </div>

                        {/* Fund Distribution Bar */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fund Distribution</div>
                          <div style={{ height: 8, display: 'flex', borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                            {composerPct > 0 && <div style={{ width: `${composerPct}%`, background: 'var(--color-info)', transition: 'width 0.3s' }} title={`Composer: ${composerPct.toFixed(1)}%`} />}
                            {artistPct > 0 && <div style={{ width: `${artistPct}%`, background: 'var(--accent-purple, #AF52DE)', transition: 'width 0.3s' }} title={`Artist: ${artistPct.toFixed(1)}%`} />}
                            {profitPct > 0 && <div style={{ width: `${profitPct}%`, background: 'var(--color-success)', transition: 'width 0.3s' }} title={`Studio: ${profitPct.toFixed(1)}%`} />}
                            {netProfit < 0 && <div style={{ width: '100%', background: 'var(--color-danger)', transition: 'width 0.3s' }} title="Loss" />}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-info)' }} />
                              <span style={{ color: 'var(--text-secondary)' }}>Composer</span>
                            </div>
                            {artistAmount > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-purple, #AF52DE)' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>Artist</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                              <span style={{ color: 'var(--text-primary)' }}>Studio Profit</span>
                            </div>
                          </div>
                        </div>

                        {/* Final Output */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px dashed var(--border-color)' }}>
                          <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700 }}>Net Profit</span>
                          <span style={{ fontSize: 20, color: netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 800, letterSpacing: '-0.5px' }}>
                            {currency}{netProfit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Column 2: The Timeline (Schedule & Urgency) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'linear-gradient(180deg, var(--bg-color) 0%, rgba(255,255,255,0) 100%)', borderRadius: 24, padding: 24, border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(0,0,0,0.01)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                <CalendarIcon size={16} color="var(--text-tertiary)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workflow & Timeline</span>
              </div>

              {/* Status Stages */}
              <div>
                <label className="form-label">Starting Stage</label>
                <div style={{ position: 'relative' }}>
                  <select className="form-select" style={{ paddingRight: 36, appearance: 'none' }} value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })}>
                    {STAGES.map(({ v, l, emoji }) => (
                      <option key={v} value={v}>{emoji} {l}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="form-label">Priority</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PRIORITIES.map(p => (
                    <button key={p.v} type="button" onClick={() => setNewTask({ ...newTask, priority: p.v })} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${newTask.priority === p.v ? p.color : 'var(--border-color)'}`, background: newTask.priority === p.v ? p.bg : 'var(--bg-color)', color: newTask.priority === p.v ? p.color : 'var(--text-tertiary)', transition: 'all 0.2s' }}>
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Deadline */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Delivery Deadline</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => setNewTask({ ...newTask, deliveryDate: new Date(Date.now() + 3 * 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) })} style={{ background: 'var(--color-danger)15', border: 'none', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-danger)', cursor: 'pointer' }}>+3 Days</button>
                    <button type="button" onClick={() => setNewTask({ ...newTask, deliveryDate: new Date(Date.now() + 7 * 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) })} style={{ background: 'var(--color-info)15', border: 'none', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-info)', cursor: 'pointer' }}>+7 Days</button>
                  </div>
                </div>
                <PremiumDatePicker selected={newTask.deliveryDate ? new Date(newTask.deliveryDate) : null} onChange={date => setNewTask({ ...newTask, deliveryDate: date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '' })} placeholderText="Select delivery deadline" showTimeSelect={false} />
              </div>

              {/* Studio Recording */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px', background: newTask.hasRecording ? 'var(--color-info)15' : 'var(--bg-color)', borderRadius: 12, border: `1px solid ${newTask.hasRecording ? 'var(--color-info)30' : 'var(--border-color)'}`, transition: 'all 0.2s', marginBottom: newTask.hasRecording ? 12 : 0 }}>
                  <input type="checkbox" checked={newTask.hasRecording} onChange={e => { const hasRec = e.target.checked; setNewTask({ ...newTask, hasRecording: hasRec, status: hasRec ? 'recording' : (newTask.status === 'recording' ? 'composition' : newTask.status) }); }} style={{ width: 16, height: 16, accentColor: 'var(--color-info)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: newTask.hasRecording ? 'var(--color-info)' : 'var(--text-secondary)' }}>Studio Recording Required</span>
                </label>
                {newTask.hasRecording && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <PremiumDatePicker
                      selected={newTask.recordingDate ? new Date(newTask.recordingDate) : null}
                      onChange={date => setNewTask({ ...newTask, recordingDate: date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' })}
                      placeholderText="Recording date & time"
                      showTimeSelect={true}
                      sessionDuration={newTask.recordingDuration || settings.sessionDurationDefault || 60}
                      onDurationChange={min => setNewTask((prev: any) => ({ ...prev, recordingDuration: min }))}
                      workHoursStart={settings.workHoursStart ?? 8}
                      workHoursEnd={settings.workHoursEnd ?? 22}
                      bookedSlots={rawTasks.filter((t: any) => t.recordingDate).map((t: any) => ({ start: t.recordingDate, durationMinutes: t.recordingDuration || 60, label: t.title }))}
                    />
                  </motion.div>
                )}
              </div>

              {/* Recurrence */}
              <div>
                <label className="form-label">Recurrence</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'none', l: 'None' }, { v: 'weekly', l: 'Weekly' }, { v: 'monthly', l: 'Monthly' }].map(r => {
                    const active = (newTask.recurrence || 'none') === r.v;
                    return (
                      <button key={r.v} type="button" onClick={() => setNewTask({ ...newTask, recurrence: r.v })} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${active ? 'var(--accent-indigo, #5E5CE6)' : 'var(--border-color)'}`, background: active ? 'var(--accent-indigo, #5E5CE6)15' : 'var(--bg-color)', color: active ? 'var(--accent-indigo, #5E5CE6)' : 'var(--text-tertiary)', transition: 'all 0.2s' }}>
                        {r.l}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Column 3: The Execution (Team & Instructions) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'linear-gradient(180deg, var(--bg-color) 0%, rgba(255,255,255,0) 100%)', borderRadius: 24, padding: 24, border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(0,0,0,0.01)' }}>
              
              {/* Team Assignment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                <Users size={16} color="var(--text-tertiary)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Team & Brief</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Composer Assignment</label>
                  <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 100px' : '1fr', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <select className="form-select" style={{ paddingRight: 36, appearance: 'none' }} value={newTask.composerId} onChange={e => { const uid = e.target.value; const comp = composers.find((c: any) => c.uid === uid); setNewTask({ ...newTask, composerId: uid, composerEmail: comp?.email || '' }); }}>
                        <option value="">-- Unassigned --</option>
                        {composers.map((c: any) => <option key={c.uid} value={c.uid}>{c.name}</option>)}
                      </select>
                      <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                    </div>
                    {isAdmin && (
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '0 8px' }}>
                        <input type="number" placeholder={newTask.composerCommissionType === 'flat' ? "5000" : "15"} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, outline: 'none', textAlign: 'center', fontWeight: 700 }} value={newTask.composerCommissionType === 'flat' ? (newTask.composerCommissionAmount ?? '') : (newTask.composerCommissionPct ?? '')} onChange={e => newTask.composerCommissionType === 'flat' ? setNewTask({ ...newTask, composerCommissionAmount: Number(e.target.value) }) : setNewTask({ ...newTask, composerCommissionPct: Number(e.target.value) })} />
                        <button type="button" onClick={() => setNewTask({...newTask, composerCommissionType: newTask.composerCommissionType === 'flat' ? 'percentage' : 'flat'})} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, transition: 'all 0.2s', margin: '4px 0', minWidth: 36 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-1)'} title="Toggle Flat/Percentage">
                          {newTask.composerCommissionType === 'flat' ? '৳' : '%'}
                        </button>
                      </div>
                    )}
                  </div>
                  {isAdmin && (newTask.composerCommissionType === 'percentage' || !newTask.composerCommissionType) && parsedBudget > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, textAlign: 'right' }}>
                      Fee: <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{currency}{composerAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px', background: newTask.needsHumming ? 'var(--accent-purple)15' : 'var(--bg-color)', borderRadius: 12, border: `1px solid ${newTask.needsHumming ? 'var(--accent-purple)30' : 'var(--border-color)'}`, transition: 'all 0.2s', marginBottom: newTask.needsHumming ? 12 : 0 }}>
                    <input type="checkbox" checked={newTask.needsHumming} onChange={e => setNewTask({ ...newTask, needsHumming: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--accent-purple)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: newTask.needsHumming ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>Include Vocal Artist</span>
                  </label>
                  {newTask.needsHumming && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 100px' : '1fr', gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                          <select className="form-select" style={{ paddingRight: 36, appearance: 'none' }} value={newTask.hummingArtistId} onChange={e => setNewTask({ ...newTask, hummingArtistId: e.target.value })}>
                            <option value="">-- Unassigned --</option>
                            {hummingArtists.map((c: any) => <option key={c.uid} value={c.uid}>{c.name}</option>)}
                          </select>
                          <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                        </div>
                        {isAdmin && (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '0 8px' }}>
                            <input type="number" placeholder={newTask.hummingArtistCommissionType === 'flat' ? "5000" : "10"} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, outline: 'none', textAlign: 'center', fontWeight: 700 }} value={newTask.hummingArtistCommissionType === 'flat' ? (newTask.hummingArtistCommissionAmount ?? '') : (newTask.hummingArtistCommissionPct ?? '')} onChange={e => newTask.hummingArtistCommissionType === 'flat' ? setNewTask({ ...newTask, hummingArtistCommissionAmount: Number(e.target.value) }) : setNewTask({ ...newTask, hummingArtistCommissionPct: Number(e.target.value) })} />
                            <button type="button" onClick={() => setNewTask({...newTask, hummingArtistCommissionType: newTask.hummingArtistCommissionType === 'flat' ? 'percentage' : 'flat'})} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, transition: 'all 0.2s', margin: '4px 0', minWidth: 36 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-1)'} title="Toggle Flat/Percentage">
                              {newTask.hummingArtistCommissionType === 'flat' ? '৳' : '%'}
                            </button>
                          </div>
                        )}
                      </div>
                      {isAdmin && (newTask.hummingArtistCommissionType === 'percentage' || !newTask.hummingArtistCommissionType) && parsedBudget > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, textAlign: 'right' }}>
                          Fee: <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{currency}{artistAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label" style={{ marginTop: 8 }}>Project Notes & Brief</label>
                <textarea placeholder="Key requirements, reference tracks, tempo, key..." className="form-textarea" style={{ resize: 'none', flex: 1, minHeight: 120 }} value={newTask.description || ''} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
              </div>

            </div>

          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 16, flexShrink: 0, background: 'var(--bg-color)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid var(--border-color)`, background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Cancel
          </button>
          <button type="submit" form="add-task-form" disabled={isSubmitting} style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, var(--color-success), #28a745)', color: 'white', fontSize: 15, fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: isSubmitting ? 0.7 : 1, boxShadow: '0 8px 20px rgba(40, 167, 69, 0.25)' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 25px rgba(40, 167, 69, 0.35)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(40, 167, 69, 0.25)'; }}>
            {isSubmitting ? <><Spinner size={18} color="white" /> Creating Project...</> : <><Plus size={20} strokeWidth={3} /> Create Project</>}
          </button>
        </div>

      </div>
    </Modal>
  );
}
