/* eslint-disable @typescript-eslint/no-unused-vars, no-irregular-whitespace */
import React, { useState, useRef } from 'react';
import { Users, Calendar, Clock, Music2, Mic, MessageCircle, Plus, CheckCircle2, Send, AlertCircle, CreditCard, FileEdit, Wallet, Check, Trash2, ExternalLink, Link, FileUp, Download, Paperclip, History, ArrowRight } from 'lucide-react';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
import { Modal } from '../Modal';
import { useSettings } from '../../contexts/SettingsContext';
import { createDriveFolder, uploadFileToDrive, deleteDriveFile } from '../../utils/driveApi';
import { generateWhatsAppLink } from '../../utils/whatsapp';

interface TaskDetailsModalProps {
  isDetailsOpen: boolean;
  setIsDetailsOpen: (val: boolean) => void;
  selectedTask: any;
  setSelectedTask: (task: any) => void;
  updateTask: (id: string, updates: any) => Promise<void>;
  rawTasks: any[];
  columns: any[];
  teams: any[];
  userData: any;
  currency: string;
  isConfirmingDelete: boolean;
  setIsConfirmingDelete: (val: boolean) => void;
  setShowToast: (val: boolean) => void;
  handleStatusChange: (status: string) => void;
  setShowInvoice: (val: boolean) => void;
  setEditTaskData: (task: any) => void;
  setIsEditOpen: (val: boolean) => void;
  partialPaymentInput: string;
  setPartialPaymentInput: (val: string) => void;
  isSubmitting: boolean;
  handlePartialPayment: () => void;
  workerPaymentInput: { composer: string; humming: string };
  setWorkerPaymentInput: (val: any) => void;
  handleWorkerPayment: (role: 'composer' | 'hummingArtist') => void;
  forcePay: boolean;
  setForcePay: (val: boolean) => void;
  toggleMilestone: (taskId: string, index: number) => void;
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSendChat: (e: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  handleDeleteTask: (id: string) => void;
}

export function TaskDetailsModal({
  isDetailsOpen, setIsDetailsOpen, selectedTask, setSelectedTask, updateTask,
  rawTasks, columns, teams, userData, currency,
  isConfirmingDelete, setIsConfirmingDelete, setShowToast,
  handleStatusChange, setShowInvoice, setEditTaskData, setIsEditOpen,
  partialPaymentInput, setPartialPaymentInput, isSubmitting, handlePartialPayment,
  workerPaymentInput, setWorkerPaymentInput, handleWorkerPayment, forcePay, setForcePay,
  toggleMilestone, chatInput, setChatInput, handleSendChat, chatEndRef, handleDeleteTask
}: TaskDetailsModalProps) {

  const { settings: { defaultComposerComm, defaultHummingComm } } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState('');

  const ALLOWED_MIME_PREFIXES = ['audio/', 'image/', 'video/'];
  const ALLOWED_MIME_TYPES = ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const BLOCKED_EXT = /\.(exe|bat|cmd|sh|msi|app|php|py|rb|jar|dll|so|dylib|vbs|ps1|html|htm)$/i;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask?.id) return;
    if (isUploading) return;
    setFileError('');

    if (file.size > 100 * 1024 * 1024) {
      setFileError('File is too large. Max 100MB.');
      return;
    }

    const okMime = ALLOWED_MIME_PREFIXES.some(p => file.type.startsWith(p)) || ALLOWED_MIME_TYPES.includes(file.type);
    if (!okMime || BLOCKED_EXT.test(file.name)) {
      setFileError('File type not allowed. Upload audio, video, image, PDF, or ZIP only.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let folderId = selectedTask.driveFolderId;
      if (!folderId) {
        const folder = await createDriveFolder(`TSN_${selectedTask.id.slice(0, 5)}_${selectedTask.clientName || 'Project'}`);
        folderId = folder.id;
        await updateTask(selectedTask.id, { driveFolderId: folderId, driveFolderLink: folder.link });
        setSelectedTask({ ...selectedTask, driveFolderId: folderId, driveFolderLink: folder.link });
      }

      const uploadedFile = await uploadFileToDrive(file, folderId, (progress) => {
        setUploadProgress(progress);
      });

      const newFile = {
        id: uploadedFile.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: uploadedFile.link,
        storagePath: uploadedFile.id,
        uploadedBy: userData?.name || 'Unknown',
        uploadedAt: new Date().toISOString()
      };
      
      const currentFiles = selectedTask.files || [];
      const updatedFiles = [...currentFiles, newFile];
      
      await updateTask(selectedTask.id, { files: updatedFiles });
      setSelectedTask({ ...selectedTask, files: updatedFiles });
    } catch (err: any) {
      setFileError('Upload failed. Make sure you are authorized.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileDelete = async (fileId: string, filePath: string) => {
    if (!selectedTask?.id) return;
    if (!window.confirm('Delete this file from Google Drive?')) return;
    
    try {
      await deleteDriveFile(fileId).catch(err => {
        console.warn("File might be already deleted in Drive", err);
      });
      
      const currentFiles = selectedTask.files || [];
      const updatedFiles = currentFiles.filter((f: any) => f.id !== fileId);
      
      await updateTask(selectedTask.id, { files: updatedFiles });
      setSelectedTask({ ...selectedTask, files: updatedFiles });
    } catch {
      setFileError('Failed to delete file. Try again.');
    }
  };

  return (
    <Modal isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setIsConfirmingDelete(false); }} title="Project Intel" size="xl" noPadding>
      {selectedTask && (() => {
        const budgetNum = Number(selectedTask.budget) || 0;
        const totalPaid = (selectedTask.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const dueAmount = budgetNum - totalPaid;
        const progressPercent = Math.round((totalPaid / (budgetNum || 1)) * 100);
        const daysLeft = (() => {
          if (!selectedTask.deliveryDate) return null;
          const d = new Date(selectedTask.deliveryDate);
          if (isNaN(d.getTime())) return null;
          return Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        })();
        const canManageProject = ['admin', 'composer'].includes(userData?.role);
        const activeTask = rawTasks.find((t: any) => t.id === selectedTask.id) || selectedTask;
        const formatDate = (dateStr: string) => {
          if (!dateStr) return 'TBD';
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return 'TBD';
          return d.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: dateStr.includes('T') ? 'numeric' : undefined, minute: dateStr.includes('T') ? '2-digit' : undefined });
        };

        return (
          <div className="task-details-modal-layout" style={{ display: 'flex', height: '100%', background: 'var(--bg-color)', overflow: 'hidden' }}>
            {/* ─── LEFT SIDEBAR (Metadata) ─── */}
            <div className="task-details-sidebar" style={{ width: '360px', flexShrink: 0, background: 'var(--card-bg)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', zIndex: 10 }}>
              <div style={{ padding: '36px 32px 24px', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(180deg, var(--bg-color) 0%, var(--card-bg) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'white', background: columns.find((c: any) => c.id === selectedTask.status)?.color || '#8E8E93', padding: '4px 12px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {selectedTask.status}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)' }}>#{selectedTask.title?.split(' ')[0]}</span>
                </div>
                <h2
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTask.title);
                    setShowToast(true);
                  }}
                  title="Click to copy project name"
                  style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: '-0.8px', lineHeight: 1.15, cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-info)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                >
                  {selectedTask.title}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <Users size={16} /> {selectedTask.client || '—'}
                  </div>
                  {selectedTask.clientEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, paddingLeft: 24 }}>
                      {selectedTask.clientEmail}
                    </div>
                  )}
                  {selectedTask.clientPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, paddingLeft: 24 }}>
                      {selectedTask.clientPhone}
                      <a href={generateWhatsAppLink(selectedTask.clientPhone, `Hi ${selectedTask.client}, regarding your project "${selectedTask.title}"...`)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', padding: 4, borderRadius: '50%', background: '#25D366', color: 'white', textDecoration: 'none', marginLeft: 4 }} title="Message on WhatsApp">
                        <MessageCircle size={12} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="task-details-scrollable" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Timeline */}
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Timeline</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: daysLeft === null ? 'var(--bg-color)' : daysLeft < 0 ? 'rgba(255,59,48,0.05)' : daysLeft <= 3 ? 'rgba(255,149,0,0.05)' : 'rgba(52,199,89,0.05)', borderRadius: 8, border: `1px solid ${daysLeft === null ? 'var(--border-color)' : daysLeft < 0 ? 'rgba(255,59,48,0.12)' : daysLeft <= 3 ? 'rgba(255,149,0,0.12)' : 'rgba(52,199,89,0.12)'}` }}>
                      <Calendar size={15} color={daysLeft === null ? 'var(--text-tertiary)' : daysLeft < 0 ? 'var(--color-danger)' : daysLeft <= 3 ? 'var(--color-warning)' : 'var(--color-success)'} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: daysLeft === null ? 'var(--text-tertiary)' : daysLeft < 0 ? 'var(--color-danger)' : daysLeft <= 3 ? 'var(--color-warning)' : 'var(--color-success)', marginBottom: 1 }}>
                          {daysLeft === null ? 'No Deadline Set' : daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{formatDate(selectedTask.deliveryDate)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-color)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <Clock size={15} color="var(--text-tertiary)" />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 1 }}>Recording Date</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedTask.recordingDate ? formatDate(selectedTask.recordingDate) : 'Not scheduled'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team */}
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Team Assignment</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-color)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <Music2 size={14} color="var(--accent-blue)" />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 1 }}>Composer</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: selectedTask.composerId ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                          {selectedTask.composerId
                            ? (() => {
                                const comp = teams.find((u: any) => u.uid === selectedTask.composerId);
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>{comp?.name || 'Unknown Composer'}</span>
                                    {comp?.phone && (
                                      <a href={generateWhatsAppLink(comp.phone, `Hello ${comp.name}, please check the new assignment for "${selectedTask.title}".`)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', padding: 4, borderRadius: '50%', background: '#25D366', color: 'white', textDecoration: 'none' }} title="Message on WhatsApp">
                                        <MessageCircle size={12} />
                                      </a>
                                    )}
                                  </div>
                                );
                              })()
                            : 'Not Assigned'}
                        </div>
                      </div>
                    </div>
                    {selectedTask.needsHumming && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-color)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <Mic size={14} color="var(--color-warning)" />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 1 }}>Vocal Artist</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: selectedTask.hummingArtistId ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                            {selectedTask.hummingArtistId
                              ? (() => {
                                  const artist = teams.find((u: any) => u.uid === selectedTask.hummingArtistId);
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span>{artist?.name || 'Unknown Artist'}</span>
                                      {artist?.phone && (
                                        <a href={generateWhatsAppLink(artist.phone, `Hello ${artist.name}, please check the humming assignment for "${selectedTask.title}".`)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', padding: 4, borderRadius: '50%', background: '#25D366', color: 'white', textDecoration: 'none' }} title="Message on WhatsApp">
                                          <MessageCircle size={12} />
                                        </a>
                                      )}
                                    </div>
                                  );
                                })()
                              : 'Not Assigned'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── RIGHT CONTENT AREA ─── */}
            <div className="task-details-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

              {/* Action Bar */}
              {userData?.role !== 'client' && (
                <div style={{ padding: '24px 36px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flexShrink: 0, zIndex: 5, boxShadow: 'none' }}>
                  {selectedTask.status === 'recording' && userData?.role === 'admin' && (
                    <button onClick={() => handleStatusChange('arrangement')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--accent-purple)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                      <Clock size={16} strokeWidth={2.5} /> Start Arrangement
                    </button>
                  )}
                  {selectedTask.status === 'arrangement' && (userData?.role === 'admin' || userData?.uid === selectedTask.composerId) && (
                    selectedTask.needsHumming ? (
                      <button onClick={() => handleStatusChange('humming')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--color-warning)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                        <MessageCircle size={16} strokeWidth={2.5} /> Request Humming
                      </button>
                    ) : (
                      <button onClick={() => handleStatusChange('composition')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                        <Plus size={16} strokeWidth={2.5} /> Begin Composition
                      </button>
                    )
                  )}
                  {selectedTask.status === 'humming' && (userData?.role === 'admin' || userData?.uid === selectedTask.hummingArtistId) && (
                    <button onClick={() => handleStatusChange('composition')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                      <CheckCircle2 size={16} strokeWidth={2.5} /> Humming Done
                    </button>
                  )}
                  {selectedTask.status === 'composition' && (userData?.role === 'admin' || userData?.uid === selectedTask.composerId) && (
                    <button onClick={() => handleStatusChange('revision')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--color-warning)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                      <CheckCircle2 size={16} strokeWidth={2.5} /> Send for Revision
                    </button>
                  )}
                  {selectedTask.status === 'revision' && (userData?.role === 'admin' || userData?.uid === selectedTask.composerId) && (
                    <button onClick={() => handleStatusChange('delivered')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                      <Send size={16} strokeWidth={2.5} /> Ship to Client
                    </button>
                  )}
                  {selectedTask.status === 'delivered' && (['admin', 'client'] as string[]).includes(userData?.role || '') && (
                    <button onClick={() => handleStatusChange('revision')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                      <AlertCircle size={16} strokeWidth={2.5} /> Request Revision
                    </button>
                  )}
                  {canManageProject && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                      <button onClick={() => setShowInvoice(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                        <CreditCard size={14} /> Generate Invoice
                      </button>
                      <button onClick={() => { setEditTaskData(selectedTask); setIsEditOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'opacity 0.12s' }}>
                        <FileEdit size={14} /> Edit Project Settings
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Main Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '36px', display: 'flex', flexDirection: 'column', gap: 36 }} className="custom-scrollbar">

                {/* Finance Block */}
                {canManageProject && (
                  <div className="task-finance-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)' }}>
                        <Wallet size={16} color="var(--text-tertiary)" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Client Collection</span>
                      </div>
                      <div style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                          {[
                            { label: 'Budget', value: budgetNum, color: 'var(--text-primary)', bg: 'var(--bg-color)', border: 'var(--border-color)' },
                            { label: 'Received', value: totalPaid, color: 'var(--color-success)', bg: '#34C75908', border: 'rgba(52,199,89,0.15)' },
                            { label: 'Balance Due', value: Math.max(0, dueAmount), color: dueAmount > 0 ? 'var(--color-danger)' : 'var(--color-success)', bg: dueAmount > 0 ? '#FF3B3008' : '#34C75908', border: dueAmount > 0 ? 'rgba(255,59,48,0.15)' : 'rgba(52,199,89,0.15)' },
                          ].map((item, i) => (
                            <div key={i} style={{ background: item.bg, borderRadius: 8, padding: '14px 10px', textAlign: 'center', border: `1px solid ${item.border}` }}>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{currency}{item.value.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                        {/* Payment Collection Progress Bar */}
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>Collection Progress</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: progressPercent >= 100 ? 'var(--color-success)' : progressPercent > 0 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{Math.min(progressPercent, 100)}%</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 8, background: 'var(--bg-color)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(progressPercent, 100)}%`,
                              borderRadius: 8,
                              background: progressPercent >= 100 ? 'var(--color-success)' : progressPercent > 0 ? 'var(--color-warning)' : 'var(--color-danger)',
                              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: 'none'
                            }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>{currency}</span>
                            <input type="number" placeholder="Log partial payment…" className="form-input" style={{ width: '100%', paddingLeft: 28, boxSizing: 'border-box' }} value={partialPaymentInput} onChange={e => setPartialPaymentInput(e.target.value)} />
                          </div>
                          <button type="button" onClick={handlePartialPayment} disabled={isSubmitting || !partialPaymentInput} style={{ background: isSubmitting ? '#8E8E93' : 'var(--color-success)', color: 'white', border: 'none', padding: '0 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: isSubmitting ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'opacity 0.15s', opacity: (!partialPaymentInput || isSubmitting) ? 0.6 : 1 }}>{isSubmitting ? '…' : 'Log'}</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)' }}>
                        <Users size={16} color="var(--text-tertiary)" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Worker Payouts</span>
                      </div>
                      <div style={{ padding: '16px 28px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" id="forcePay" checked={forcePay} onChange={(e) => setForcePay(e.target.checked)} style={{ cursor: 'pointer' }} />
                        <label htmlFor="forcePay" style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>Force Pay (Override Payment Gates)</label>
                      </div>
                      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Composer Payout */}
                        {selectedTask.composerId ? (() => {
                          const commPct = selectedTask.composerCommissionPct || defaultComposerComm;
                          const earned = selectedTask.composerCommissionType === 'flat' ? (Number(selectedTask.composerCommissionAmount) || 0) : (budgetNum * commPct) / 100;
                          const paid = selectedTask.composerPaid || 0;
                          const due = earned - paid;
                          const feeLabel = selectedTask.composerCommissionType === 'flat' ? 'Flat Fee' : `${commPct}%`;
                          return (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)' }}>Lead Composer ({feeLabel})</div>
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{currency}{earned.toLocaleString()} <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>Earned</span></div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 400, color: 'var(--text-tertiary)' }}>{currency}</span>
                                  <input type="number" placeholder={due > 0 ? `Pay due: ${currency}${due.toLocaleString()}` : "Fully paid"} disabled={due <= 0} className="form-input" style={{ width: '100%', paddingLeft: 28, boxSizing: 'border-box' }} value={workerPaymentInput.composer} onChange={e => setWorkerPaymentInput({ ...workerPaymentInput, composer: e.target.value })} />
                                </div>
                                {due > 0 && <button type="button" style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '0 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', flexShrink: 0 }} onClick={() => handleWorkerPayment('composer')}>Disburse</button>}
                              </div>
                            </div>
                          );
                        })() : <div style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 700, fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No composer assigned</div>}

                        {/* Vocal Payout */}
                        {selectedTask.needsHumming && selectedTask.hummingArtistId ? (() => {
                          const commPct = selectedTask.hummingArtistCommissionPct || defaultHummingComm;
                          const earned = selectedTask.hummingArtistCommissionType === 'flat' ? (Number(selectedTask.hummingArtistCommissionAmount) || 0) : (budgetNum * commPct) / 100;
                          const paid = selectedTask.hummingArtistPaid || 0;
                          const due = earned - paid;
                          const feeLabel = selectedTask.hummingArtistCommissionType === 'flat' ? 'Flat Fee' : `${commPct}%`;
                          return (
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-warning)' }}>Vocal Artist ({feeLabel})</div>
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{currency}{earned.toLocaleString()} <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>Earned</span></div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 400, color: 'var(--text-tertiary)' }}>{currency}</span>
                                  <input type="number" placeholder={due > 0 ? `Pay due: ${currency}${due.toLocaleString()}` : "Fully paid"} disabled={due <= 0} className="form-input" style={{ width: '100%', paddingLeft: 28, boxSizing: 'border-box' }} value={workerPaymentInput.humming} onChange={e => setWorkerPaymentInput({ ...workerPaymentInput, humming: e.target.value })} />
                                </div>
                                {due > 0 && <button type="button" style={{ background: 'var(--color-warning)', color: 'white', border: 'none', padding: '0 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', flexShrink: 0 }} onClick={() => handleWorkerPayment('hummingArtist')}>Disburse</button>}
                              </div>
                            </div>
                          );
                        })() : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* Milestones & Chat Block */}
                <div className="task-chat-grid" style={{ display: 'grid', gridTemplateColumns: userData?.role !== 'client' ? '1fr 1fr' : '1fr', gap: 24 }}>
                  <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)' }}>
                      <CheckCircle2 size={16} color="var(--text-tertiary)" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Execution Milestones</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, background: 'var(--bg-color)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                        {(selectedTask.milestones || []).filter((m: any) => m.completed).length}/{(selectedTask.milestones || []).length}
                      </span>
                    </div>
                    <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
                      {(selectedTask.milestones || []).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {(selectedTask.milestones || []).map((m: any, idx: number) => (
                            <div key={idx} onClick={() => userData?.role !== 'client' && toggleMilestone(selectedTask.id, idx)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8,
                                background: m.completed ? 'rgba(52,199,89,0.04)' : 'var(--bg-color)',
                                cursor: userData?.role !== 'client' ? 'pointer' : 'default',
                                border: `1px solid ${m.completed ? 'rgba(52,199,89,0.15)' : 'var(--border-color)'}`,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}>
                              <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${m.completed ? 'var(--color-success)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.completed ? 'var(--color-success)' : 'transparent', flexShrink: 0 }}>
                                {m.completed && <Check size={12} color="white" strokeWidth={3} />}
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 400, color: m.completed ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: m.completed ? 'line-through' : 'none' }}>{m.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontStyle: 'italic', border: '1px dashed var(--border-color)', borderRadius: 8 }}>No milestones tracked</div>
                      )}
                    </div>
                  </div>

                  {userData?.role !== 'client' && (
                    <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 450 }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)' }}>
                      <MessageCircle size={16} color="var(--text-tertiary)" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Internal Discussion</span>
                    </div>
                    <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(() => {
                        const comments = selectedTask.comments || [];
                        if (comments.length === 0) return (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 700, fontStyle: 'italic', padding: '24px 0' }}>No messages yet. Start the discussion!</div>
                        );
                        return comments.map((msg: any) => {
                          const isMe = msg.userId === userData?.uid;
                          return (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                              <div style={{ background: isMe ? 'var(--accent-blue)' : 'var(--bg-color)', color: isMe ? 'white' : 'var(--text-primary)', padding: '10px 14px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', fontSize: 14, maxWidth: '85%', lineHeight: 1.5, fontWeight: 400, border: isMe ? 'none' : '1px solid var(--border-color)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                {(() => {
                                  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
                                  return msg.text.split(urlRegex).map((part: string, i: number) => {
                                    if (part.match(urlRegex)) {
                                      const href = part.startsWith('http') ? part : `https://${part}`;
                                      return (
                                        <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: isMe ? 'rgba(255,255,255,0.9)' : 'var(--color-info)', textDecoration: 'underline', fontWeight: 700 }}>
                                          {part}
                                        </a>
                                      );
                                    }
                                    return <span key={i}>{part}</span>;
                                  });
                                })()}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 400, display: 'flex', gap: 8, padding: '0 4px' }}>
                                <span style={{ color: isMe ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>{msg.userName}</span>
                                <span style={{ opacity: 0.6 }}>{new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleSendChat} style={{ display: 'flex', padding: '14px 16px', borderTop: '1px solid var(--border-color)', gap: 8, background: 'var(--card-bg)' }}>
                      <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message…"
                        style={{ flex: 1, border: '1px solid var(--border-color)', background: 'var(--bg-color)', padding: '9px 12px', borderRadius: 8, outline: 'none', fontSize: 16, fontWeight: 400, color: 'var(--text-primary)', transition: 'border-color 0.15s', boxSizing: 'border-box' }} />
                      <button type="submit" disabled={!chatInput.trim()} style={{ background: 'var(--accent-blue)', border: 'none', width: 38, height: 38, borderRadius: 8, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: chatInput.trim() ? 1 : 0.4, transition: 'opacity 0.15s', flexShrink: 0 }}>
                        <Send size={16} strokeWidth={2} />
                      </button>
                    </form>
                  </div>
                  )}
                </div>

                {/* Assets & Files Block */}
                <div style={{ background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', boxShadow: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(to bottom, var(--bg-color), transparent)' }}>
                    <div style={{ background: '#AF52DE20', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Paperclip size={18} color="var(--accent-purple)" />
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Assets & Files</span>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                      {isUploading && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          Uploading {uploadProgress}%
                        </div>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        id="file-upload"
                        accept="audio/*,video/*,image/*,.pdf,.zip,.doc,.docx"
                      />
                      <label 
                        htmlFor="file-upload"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: 'rgba(175,82,222,0.1)', color: 'var(--accent-purple)', fontWeight: 700, fontSize: 13, cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isUploading ? 0.6 : 1 }}
                      >
                        <FileUp size={16} /> Upload File
                      </label>
                    </div>
                  </div>
                  
                  {fileError && (
                    <div style={{ margin: '0 28px', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', color: 'var(--accent-red)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {fileError}
                      <button onClick={() => setFileError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  )}

                  <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedTask.files && selectedTask.files.length > 0 ? (
                      selectedTask.files.map((file: any) => (
                        <div key={file.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px', borderRadius: 16, background: 'var(--bg-color)', border: '1px solid var(--border-color)', transition: 'border-color 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileUp size={20} color="var(--text-tertiary)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                                {file.name}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', display: 'flex', gap: 12 }}>
                                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                <span> </span>
                                <span>By {file.uploadedBy}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--card-bg)', color: 'var(--accent-blue)', border: '1px solid var(--border-color)', transition: 'all 0.2s' }} title="Download">
                                <Download size={16} />
                              </a>
                              {userData?.role === 'admin' && (
                                <button onClick={() => handleFileDelete(file.id, file.storagePath)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--card-bg)', color: 'var(--color-danger)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }} title="Delete">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          {file?.name?.match(/\.(mp3|wav|ogg|m4a|aac)$/i) && (
                            <div style={{ width: '100%', padding: '0 4px' }}>
                              <audio controls src={`https://drive.google.com/uc?export=download&id=${file.storagePath}`} style={{ width: '100%', height: 36, outline: 'none' }} />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 700, fontStyle: 'italic', border: '2px dashed var(--border-color)', borderRadius: 16 }}>No files uploaded yet</div>
                    )}
                  </div>
                </div>

                {/* Activity Log */}
                {selectedTask.activityLog && selectedTask.activityLog.length > 0 && (
                  <div style={{ background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(to bottom, var(--bg-color), transparent)' }}>
                      <div style={{ background: 'rgba(0,122,255,0.12)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <History size={18} color="var(--color-info)" />
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Activity Log</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-color)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                        {selectedTask.activityLog.length} events
                      </span>
                    </div>
                    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {[...selectedTask.activityLog]
                        .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
                        .map((entry: any, i: number, arr: any[]) => {
                          const isLast = i === arr.length - 1;
                          const dotColor = entry.type === 'payment' ? 'var(--color-success)' : entry.type === 'created' ? 'var(--color-info)' : 'var(--color-warning)';
                          const getLabel = (id: string) => columns.find((c: any) => c.id === id)?.title || (id ? id.replace('_', ' ') : '');
                          return (
                            <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: isLast ? 0 : 22 }}>
                              {!isLast && <div style={{ position: 'absolute', left: 15, top: 34, bottom: 0, width: 2, background: 'var(--border-color)' }} />}
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${dotColor}18`, border: `2px solid ${dotColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                                {entry.type === 'payment' ? <CreditCard size={13} color={dotColor} /> : entry.type === 'created' ? <Plus size={13} color={dotColor} /> : <ArrowRight size={13} color={dotColor} />}
                              </div>
                              <div style={{ flex: 1, paddingTop: 5 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {entry.type === 'created' && 'Project created'}
                                  {entry.type === 'status' && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>{getLabel(entry.from)}</span>
                                      <ArrowRight size={12} color="var(--text-tertiary)" />
                                      <span style={{ color: dotColor }}>{getLabel(entry.to)}</span>
                                    </span>
                                  )}
                                  {entry.type === 'payment' && entry.note}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, display: 'flex', gap: 6 }}>
                                  <span style={{ fontWeight: 500 }}>{entry.by}</span>
                                  <span>·</span>
                                  <span title={new Date(entry.at).toLocaleString()}>{timeAgo(entry.at)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* ── Revision Tracking ── */}
                {(() => {
                  const revisions: any[] = selectedTask.revisions || [];
                  const revisionsIncluded = Number(selectedTask.revisionsIncluded) || 0;
                  const pendingRevisions = revisions.filter((r: any) => r.status === 'pending');
                  const usedRevisions = revisions.length;
                  return (
                    <div style={{ background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'rgba(255,149,0,0.12)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileEdit size={18} color="var(--color-warning)" />
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Revisions</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: revisionsIncluded > 0 && usedRevisions >= revisionsIncluded ? 'var(--color-danger)' : 'var(--text-tertiary)', background: 'var(--bg-color)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                          {usedRevisions}{revisionsIncluded > 0 ? `/${revisionsIncluded} used` : ' total'}
                        </span>
                        {canManageProject && (
                          <button onClick={async () => {
                            const note = prompt('Revision request note (optional):') ?? '';
                            const newRev = { id: `rev_${Date.now()}`, requestedAt: new Date().toISOString(), note, status: 'pending' as const };
                            const updated = [...revisions, newRev];
                            await updateTask(selectedTask.id, { revisions: updated, status: 'revision' });
                            setSelectedTask({ ...selectedTask, revisions: updated, status: 'revision' });
                          }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(255,149,0,0.1)', color: 'var(--color-warning)', border: '1px solid rgba(255,149,0,0.2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            + Request
                          </button>
                        )}
                      </div>
                      <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {revisions.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>No revisions requested yet.</div>}
                        {revisions.map((rev: any, i: number) => (
                          <div key={rev.id || i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 12, background: rev.status === 'delivered' ? 'rgba(52,199,89,0.06)' : 'rgba(255,149,0,0.06)', border: `1px solid ${rev.status === 'delivered' ? 'rgba(52,199,89,0.2)' : 'rgba(255,149,0,0.2)'}` }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: rev.status === 'delivered' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                  Revision #{i + 1} · {rev.status === 'delivered' ? '✓ Delivered' : '⏳ Pending'}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{new Date(rev.requestedAt).toLocaleDateString()}</span>
                              </div>
                              {rev.note && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rev.note}</div>}
                              {rev.deliveredAt && <div style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 4 }}>Delivered {new Date(rev.deliveredAt).toLocaleDateString()}{rev.deliveryNote ? ` — ${rev.deliveryNote}` : ''}</div>}
                            </div>
                            {canManageProject && rev.status === 'pending' && (
                              <button onClick={async () => {
                                const note = prompt('Delivery note (optional):') ?? '';
                                const updated = revisions.map((r: any, j: number) => j === i ? { ...r, status: 'delivered', deliveredAt: new Date().toISOString(), deliveryNote: note } : r);
                                await updateTask(selectedTask.id, { revisions: updated });
                                setSelectedTask({ ...selectedTask, revisions: updated });
                              }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.2)', fontWeight: 700, fontSize: 12, cursor: 'pointer', alignSelf: 'flex-start' }}>
                                Mark Delivered
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Delivery Versions ── */}
                {(() => {
                  const versions: any[] = selectedTask.deliveryVersions || [];
                  return (
                    <div style={{ background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'rgba(0,122,255,0.12)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileUp size={18} color="var(--color-info)" />
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Delivery Versions</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-color)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>{versions.length} versions</span>
                        {canManageProject && selectedTask.driveFolderLink && (
                          <button onClick={async () => {
                            const note = prompt('Version note (e.g. "Added bass"): ') ?? '';
                            const newVer = { version: versions.length + 1, driveLink: selectedTask.driveFolderLink, deliveredAt: new Date().toISOString(), note };
                            const updated = [...versions, newVer];
                            await updateTask(selectedTask.id, { deliveryVersions: updated });
                            setSelectedTask({ ...selectedTask, deliveryVersions: updated });
                          }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(0,122,255,0.1)', color: 'var(--color-info)', border: '1px solid rgba(0,122,255,0.2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            + Snapshot
                          </button>
                        )}
                      </div>
                      <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {versions.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>No delivery versions saved. Click "Snapshot" to save current Drive link as a version.</div>}
                        {[...versions].reverse().map((v: any) => (
                          <div key={v.version} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-info)', minWidth: 28 }}>v{v.version}</span>
                            <div style={{ flex: 1 }}>
                              {v.note && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{v.note}</div>}
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(v.deliveredAt).toLocaleDateString()}</div>
                            </div>
                            <a href={v.driveLink} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(0,122,255,0.1)', color: 'var(--color-info)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Open</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Time Tracking ── */}
                {canManageProject && (() => {
                  const entries: any[] = selectedTask.timeEntries || [];
                  const totalMin = entries.reduce((s: number, e: any) => s + (Number(e.minutes) || 0), 0);
                  const h = Math.floor(totalMin / 60), m = totalMin % 60;
                  return (
                    <div style={{ background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'rgba(88,86,214,0.12)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={18} color="var(--accent-purple, #5856d6)" />
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Time Tracking</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', background: 'var(--bg-color)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                          {totalMin > 0 ? `${h}h ${m}m total` : '0h logged'}
                        </span>
                        <button onClick={async () => {
                          const min = Number(prompt('Minutes worked:'));
                          if (!min || min <= 0) return;
                          const note = prompt('Note (optional):') ?? '';
                          const entry = { id: `te_${Date.now()}`, date: new Date().toISOString(), minutes: min, note, by: userData?.name || 'Admin' };
                          const updated = [...entries, entry];
                          await updateTask(selectedTask.id, { timeEntries: updated });
                          setSelectedTask({ ...selectedTask, timeEntries: updated });
                        }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(88,86,214,0.1)', color: 'var(--accent-purple, #5856d6)', border: '1px solid rgba(88,86,214,0.2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                          + Log Time
                        </button>
                      </div>
                      <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {entries.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>No time logged yet.</div>}
                        {[...entries].reverse().slice(0, 5).map((e: any) => (
                          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-purple, #5856d6)', minWidth: 56 }}>{Math.floor(Number(e.minutes)/60)}h {Number(e.minutes)%60}m</span>
                            <div style={{ flex: 1 }}>
                              {e.note && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.note}</span>}
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: e.note ? 8 : 0 }}>by {e.by} · {new Date(e.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Client Satisfaction ── */}
                {['delivered', 'completed'].includes(selectedTask.status) && (() => {
                  const rating = selectedTask.satisfactionRating || 0;
                  return (
                    <div style={{ background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', padding: '20px 28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div style={{ background: 'rgba(255,214,0,0.15)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 18 }}>⭐</span>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Client Satisfaction</span>
                        {rating > 0 && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--color-warning)' }}>{rating}/5</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[1,2,3,4,5].map(star => (
                          <button key={star} onClick={async () => {
                            const note = star <= 3 ? (prompt('What could be improved?') ?? '') : '';
                            await updateTask(selectedTask.id, { satisfactionRating: star, satisfactionNote: note });
                            setSelectedTask({ ...selectedTask, satisfactionRating: star, satisfactionNote: note });
                          }} style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', opacity: star <= rating ? 1 : 0.25, transform: star <= rating ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s' }}>
                            ⭐
                          </button>
                        ))}
                        {rating === 0 && <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, alignSelf: 'center', marginLeft: 8 }}>Click to rate</span>}
                      </div>
                      {selectedTask.satisfactionNote && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{selectedTask.satisfactionNote}"</div>}
                    </div>
                  );
                })()}

                {/* Danger Zone */}
                {userData?.role === 'admin' && (
                  <div style={{ marginTop: 8, padding: '24px 32px', borderRadius: 20, border: `1px solid ${isConfirmingDelete ? 'rgba(255,59,48,0.4)' : 'rgba(255,59,48,0.2)'}`, background: isConfirmingDelete ? 'rgba(255,59,48,0.06)' : 'rgba(255,59,48,0.03)', transition: 'all 0.25s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: isConfirmingDelete ? 'var(--color-danger)' : 'var(--text-primary)', display: 'block', marginBottom: 4, transition: 'color 0.2s' }}>Danger Zone</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                          {isConfirmingDelete ? '⚠️ This action is permanent and cannot be undone.' : 'Deleting this project cannot be undone.'}
                        </span>
                      </div>
                      {!isConfirmingDelete ? (
                          <button onClick={() => setIsConfirmingDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(255,59,48,0.3)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
                            <Trash2 size={16} strokeWidth={2.5} /> Delete Project
                          </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => setIsConfirmingDelete(false)} style={{ background: 'var(--bg-color)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '12px 20px', borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
                            Cancel
                          </button>
                          <button onClick={() => handleDeleteTask(selectedTask.id)} style={{ background: 'var(--color-danger)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'none', transition: 'all 0.2s' }}>
                            <Trash2 size={16} strokeWidth={2.5} /> Yes, Delete Forever
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}
