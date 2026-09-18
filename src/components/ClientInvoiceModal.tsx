import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  MapPin,
  Phone,
  Printer,
  X,
  Plus,
  Filter,
  Trash2,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { Spinner } from './Spinner';
import { useSettings } from '../contexts/SettingsContext';
import { nextInvoiceNumber } from '../utils/invoiceCounter';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ClientInvoiceModalProps {
  client: any;
  tasks: any[];
  onClose: () => void;
}

const slate = 'var(--text-primary)';
const deep = '#1f1a14';
const accent = '#a96d24';
const accentGold = 'var(--accent-gold)';
const accentLight = '#f8f0e2';
const accentLine = '#eadcc8';
const muted = 'var(--text-tertiary)';
const paper = 'var(--card-bg)';
const surface = '#fffdf8';
const ink = '#111111';

export function ClientInvoiceModal({ client, tasks, onClose }: ClientInvoiceModalProps) {
  const { settings } = useSettings();
  const {
    currency, studioName, studioLogo, studioAddress, studioEmail, studioPhone, paymentQrCode,
    invoicePrefix, invoiceNotes, invoiceTaxRate,
  } = settings;
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const [memo, setMemo] = useState(invoiceNotes || '');
  const [statementMode, setStatementMode] = useState<'all' | 'unpaid'>('all');
  const [customItems, setCustomItems] = useState<Array<{ id: string, title: string, amount: number, isCustom: true }>>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [excludedTaskIds, setExcludedTaskIds] = useState<string[]>([]);

  const getClientSafeItems = (tasksList: any[], customItemsList: any[], clientName: string) => {
    const allRaw = [...tasksList, ...customItemsList];
    return allRaw.map((item, index) => {
      const serialNumber = String(index + 1).padStart(2, '0');
      if (item.isCustom) {
        return {
          id: item.id,
          serialNumber,
          projectCode: '',
          projectTitle: item.title || 'Custom Item',
          description: '',
          billedAmount: Number(item.amount) || 0,
          paidAmount: 0,
          dueAmount: Number(item.amount) || 0,
          paymentStatus: 'UNPAID',
          isCustom: true,
        };
      }

      let rawTitle = item.title || item.name || 'Studio Project';
      if (clientName && rawTitle.toLowerCase().includes(clientName.toLowerCase())) {
        rawTitle = rawTitle.replace(new RegExp(clientName, 'gi'), '').replace(/\s*—\s*/g, ' — ').trim();
        rawTitle = rawTitle.replace(/^—\s*|\s*—$/g, '').trim();
      }

      let rawDesc = item.description || '';
      // Strip Google Drive / HTTP/HTTPS URLs and internal notes
      rawDesc = rawDesc.replace(/https?:\/\/[^\s]+/g, '').trim();
      rawDesc = rawDesc.replace(/(internal|private|note|drive|link):[^\s]+/gi, '').trim();

      const amount = Number(item.budget) || Number(item.amount) || 0;
      const paidAmount = (item.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      const dueAmount = Math.max(0, amount - paidAmount);
      const paymentStatus = dueAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY PAID' : 'UNPAID';
      const projectCode = item.taskCode || item.code || '';

      return {
        id: item.id,
        serialNumber,
        projectCode,
        projectTitle: rawTitle,
        description: rawDesc,
        billedAmount: amount,
        paidAmount,
        dueAmount,
        paymentStatus,
        isCustom: false,
      };
    });
  };

  const processedTasks = tasks.map(task => {
    const amount = Number(task.budget) || 0;
    const paidAmount = (task.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const dueAmount = Math.max(0, amount - paidAmount);
    const paymentStatus = dueAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY PAID' : 'UNPAID';
    return { ...task, amount, paidAmount, dueAmount, paymentStatus };
  });

  const availableTasks = processedTasks.filter(task => !excludedTaskIds.includes(task.id));

  const statementTasks = statementMode === 'unpaid'
    ? availableTasks.filter(task => task.dueAmount > 0)
    : availableTasks;

  const clientSafeItems = getClientSafeItems(statementTasks, customItems, client.name || '');

  const totalBilled = statementTasks.reduce((sum, item) => sum + item.amount, 0) + customItems.reduce((sum, item) => sum + item.amount, 0);
  const totalPaid = statementTasks.reduce((sum, item) => sum + item.paidAmount, 0);
  const taxRate = Number(invoiceTaxRate) || 0;
  const taxAmount = taxRate > 0 ? Math.round(totalBilled * (taxRate / 100)) : 0;
  const grandTotal = totalBilled + taxAmount;
  const totalDue = Math.max(0, grandTotal - totalPaid);

  const isPaid = grandTotal > 0 && totalDue <= 0;
  const isPartial = totalPaid > 0 && totalDue > 0;
  const prefix = (invoicePrefix || 'INV').toUpperCase();

  const today = new Date();
  const invoiceDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const [invoiceNo, setInvoiceNo] = useState<string>(
    client.clientInvoiceNo || `${prefix}-${dateStr}-${String(client.id || '0000').substring(0, 4).toUpperCase()}`
  );

  const allocateInvoiceNo = useCallback(async () => {
    if (client.clientInvoiceNo) return;
    try {
      const seq = await nextInvoiceNumber();
      const no = `${prefix}-${seq}`;
      setInvoiceNo(no);
      if (client.id) {
        await updateDoc(doc(db, 'clients', client.id), { clientInvoiceNo: no });
      }
    } catch { /* non-critical */ }
  }, [client.id, client.clientInvoiceNo, prefix]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs with Firestore, not just local state
  useEffect(() => { allocateInvoiceNo(); }, [allocateInvoiceNo]);
  const safeFormatDate = (val: any, opts: Intl.DateTimeFormatOptions) => {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', opts);
  };
  const safeStudioName = studioName || 'Tanvir Studio';
  const money = (amount: number) => `${currency || '৳'}${(isNaN(amount) ? 0 : Math.round(amount)).toLocaleString('en-US')}`;

  const getStatusBadge = (status: string) => {
    if (status === 'PAID') return { label: 'Paid', color: 'var(--color-success)', bg: 'rgba(29,127,63,0.1)', Icon: CheckCircle2 };
    if (status === 'PARTIALLY PAID') return { label: 'Partially Paid', color: 'var(--color-warning)', bg: 'rgba(178,106,0,0.1)', Icon: Clock };
    return { label: 'Unpaid', color: 'var(--color-danger)', bg: 'rgba(201,39,31,0.1)', Icon: AlertCircle };
  };

  const overallStatus = isPaid
    ? { label: 'Paid', color: 'var(--color-success)', bg: 'rgba(29,127,63,0.1)', Icon: CheckCircle2 }
    : isPartial
      ? { label: 'Partially Paid', color: 'var(--color-warning)', bg: 'rgba(178,106,0,0.1)', Icon: Clock }
      : { label: statementMode === 'unpaid' ? 'Outstanding' : 'Due', color: 'var(--color-danger)', bg: 'rgba(201,39,31,0.1)', Icon: AlertCircle };

  const StatusIcon = overallStatus.Icon;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const el = invoiceRef.current;
      const savedRadius = el.style.borderRadius;
      const savedShadow = el.style.boxShadow;
      const savedWidth = el.style.width;
      const savedMaxWidth = el.style.maxWidth;
      const savedBg = el.style.backgroundColor;

      el.style.borderRadius = '0px';
      el.style.boxShadow = 'none';
      el.style.width = '794px';
      el.style.maxWidth = '794px';
      el.style.backgroundColor = '#fffdf8';

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fffdf8',
        logging: false,
        windowWidth: 794,
        windowHeight: el.scrollHeight,
        onclone: (_doc: Document, clonedEl: HTMLElement) => {
          clonedEl.querySelectorAll<HTMLElement>('.no-print').forEach((node) => {
            node.style.display = 'none';
          });
          clonedEl.querySelectorAll<HTMLElement>('*').forEach((node) => {
            if (node.style?.webkitTextFillColor === 'transparent') {
              node.style.webkitTextFillColor = slate;
              node.style.background = 'none';
              node.style.color = slate;
            }
          });
        },
      });

      el.style.borderRadius = savedRadius;
      el.style.boxShadow = savedShadow;
      el.style.width = savedWidth;
      el.style.maxWidth = savedMaxWidth;
      el.style.backgroundColor = savedBg;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pageW = 210;
      const imgH = (canvas.height * pageW) / canvas.width;
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageW, Math.max(297, imgH)] });
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);

      const sanitizeFilename = (str: string) => (str || '').replace(/[<>:"/\\|?*]/g, '').trim();
      const clientNameSafe = sanitizeFilename(client.name || 'Client');
      const refNoSafe = sanitizeFilename(invoiceNo || 'INV');
      const docTypeLabel = statementMode === 'unpaid' ? 'Outstanding Payment Statement' : 'Complete Project Statement';
      const fileName = `Tanvir Studio - ${docTypeLabel} - ${clientNameSafe} - ${refNoSafe}.pdf`;
      pdf.save(fileName);
    } catch {
      setPdfError('PDF failed — opening print dialog instead.');
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  const addCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || Number(customAmount) <= 0) return;
    setCustomItems([...customItems, { id: Math.random().toString(), title: customTitle, amount: Number(customAmount), isCustom: true }]);
    setCustomTitle('');
    setCustomAmount('');
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(customItems.filter(item => item.id !== id));
  };

  const actionButton: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 'none',
    borderRadius: 999,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
    height: 42,
    padding: '0 18px',
  };

  return (
    <div
      className="modal-overlay invoice-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 12, 0.78)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '82px 20px 40px',
        overflowY: 'auto',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* Smart Controls Panel */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 16,
          zIndex: 10000,
          background: 'rgba(255, 255, 255, 0.14)',
          padding: 8,
          borderRadius: 24,
          backdropFilter: 'blur(26px)',
          WebkitBackdropFilter: 'blur(26px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'none',
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: 'calc(100vw - 40px)',
        }}
      >
        {/* Statement Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
          <Filter size={16} color="#fff" />
          <select
            value={statementMode}
            onChange={(e) => setStatementMode(e.target.value as 'all' | 'unpaid')}
            style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            <option value="all" style={{ color: 'var(--text-primary)' }}>[ All Projects ]</option>
            <option value="unpaid" style={{ color: 'var(--text-primary)' }}>[ Unpaid Projects ]</option>
          </select>
        </div>

        {/* Custom Item Form */}
        <form onSubmit={addCustomItem} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: '12px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
          <input
            type="text"
            placeholder="Custom Item..."
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', width: '140px' }}
          />
          <input
            type="number"
            placeholder="Amount"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', width: '90px' }}
          />
          <button type="submit" style={{ ...actionButton, background: 'var(--color-info)', color: '#fff', width: 42, padding: 0 }}>
            <Plus size={18} strokeWidth={3} />
          </button>
        </form>

        {/* Restore Removed Projects */}
        {excludedTaskIds.length > 0 && (
          <button
            className="no-print"
            onClick={() => setExcludedTaskIds([])}
            style={{ ...actionButton, background: 'rgba(255,255,255,0.16)', color: '#fff', padding: '0 12px' }}
          >
            Restore {excludedTaskIds.length}
          </button>
        )}

        {/* Memo */}
        <input
          className="no-print"
          type="text"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="Add a note..."
          style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 12, fontSize: 14, outline: 'none', width: 180 }}
        />

        {/* Export Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="no-print"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            style={{ ...actionButton, background: 'rgba(255,255,255,0.16)', color: '#fff', opacity: isGenerating ? 0.7 : 1 }}
          >
            {isGenerating ? <Spinner size={15} color="#fff" /> : <Download size={16} strokeWidth={2.6} />}
            {isGenerating ? 'Generating…' : 'PDF'}
          </button>
          <button
            className="no-print"
            onClick={handlePrint}
            style={{ ...actionButton, background: 'rgba(255,255,255,0.16)', color: '#fff' }}
          >
            <Printer size={16} strokeWidth={2.6} />
            Print
          </button>
          <button
            onClick={onClose}
            aria-label="Close invoice"
            style={{
              ...actionButton,
              width: 42,
              padding: 0,
              background: 'rgba(255,59,48,0.8)',
              color: '#fff',
            }}
          >
            <X size={18} strokeWidth={2.6} />
          </button>
        </div>
        {pdfError && (
          <div className="no-print" style={{ width: '100%', marginTop: 4, textAlign: 'center', fontSize: 12, color: 'var(--color-warning)', fontWeight: 600 }}>
            {pdfError}
          </div>
        )}
      </div>

      {/* Printable Document */}
      <div
        id="printable-invoice"
        ref={invoiceRef}
        style={{
          width: '210mm',
          maxWidth: 'calc(100vw - 40px)',
          background: paper,
          color: ink,
          borderRadius: 4,
          border: `1px solid ${accentLine}`,
          boxShadow: 'none',
          fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 64px',
          marginTop: '20px',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ position: 'absolute', inset: '0 0 auto', height: 6, background: `linear-gradient(90deg, ${deep}, ${accentGold}, ${accent})`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 1, background: accentLine, pointerEvents: 'none' }} />
        {statementMode === 'unpaid' && totalDue <= 0 && (
          <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: 72, fontWeight: 900, color: 'rgba(29,127,63,0.06)', letterSpacing: 10, pointerEvents: 'none', userSelect: 'none', zIndex: 0, whiteSpace: 'nowrap' }}>
            NO OUTSTANDING
          </div>
        )}

        <header className="invoice-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, paddingBottom: 34, borderBottom: `1px solid ${accentLine}`, marginBottom: 36, position: 'relative', paddingTop: 4 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              {studioLogo ? (
                <img
                  src={studioLogo}
                  alt={safeStudioName}
                  style={{ width: 62, height: 62, objectFit: 'contain', borderRadius: 10, background: 'transparent', padding: 0, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 58, height: 58, borderRadius: 14, background: `linear-gradient(135deg, ${deep}, ${accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, letterSpacing: 1, flexShrink: 0, boxShadow: 'none' }}>
                  TS
                </div>
              )}
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 29, fontWeight: 900, color: deep, lineHeight: 1, letterSpacing: 0.2, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{safeStudioName}</div>
                <div style={{ color: accent, fontSize: 12.5, fontStyle: 'italic', fontWeight: 800, marginTop: 6, letterSpacing: 0.3 }}>Where Creativity Speaks.</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8, color: muted, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
              {studioAddress && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={14} color={accentGold} />
                  </div>
                  <span style={{ color: muted }}>{studioAddress}</span>
                </div>
              )}
              {studioEmail && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={14} color={accentGold} />
                  </div>
                  <span style={{ color: muted }}>{studioEmail}</span>
                </div>
              )}
              {studioPhone && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={14} color={accentGold} />
                  </div>
                  <span style={{ color: muted }}>{studioPhone}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: statementMode === 'unpaid' ? 22 : 26, fontWeight: 800, color: statementMode === 'unpaid' ? deep : 'var(--accent-gold)', letterSpacing: 1.5, lineHeight: 1.2, textTransform: 'uppercase', textAlign: 'right' }}>
              {statementMode === 'unpaid' ? 'Outstanding Payment Statement' : 'Complete Project Statement'}
            </div>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ background: surface, padding: '12px 20px', borderRadius: 16, display: 'inline-grid', gap: 8, textAlign: 'right', minWidth: 200, border: `1px solid ${accentLine}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <span style={{ color: muted, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Ref No.</span>
                  <span style={{ color: deep, fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>{invoiceNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <span style={{ color: muted, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Issued</span>
                  <span style={{ color: deep, fontSize: 14, fontWeight: 800 }}>{invoiceDate}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="invoice-payment-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 34, marginBottom: 40 }}>
          <div>
            <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Client Information</div>
            <div style={{ color: deep, fontSize: 22, fontWeight: 900, marginTop: 10, wordBreak: 'break-word' }}>{client.name || 'Valued Client'}</div>
            {client.company?.trim() && (
              <div style={{ color: muted, fontSize: 14, fontWeight: 700, marginTop: 5 }}>{client.company.trim()}</div>
            )}
            <div style={{ display: 'grid', gap: 7, marginTop: 9, color: muted, fontSize: 13, fontWeight: 600 }}>
              {client.email?.trim() && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Mail size={14} color={accentGold} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{client.email.trim()}</span>
                </div>
              )}
              {client.phone?.trim() && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Phone size={14} color={accentGold} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{client.phone.trim()}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ borderLeft: `1px solid ${accentLine}`, paddingLeft: 30 }}>
            <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Payment Methods</div>
            <div style={{ display: 'grid', gap: 14, marginTop: 12, fontSize: 13 }}>
              {studioPhone && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Smartphone size={18} color={accentGold} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: deep, fontWeight: 800 }}>Mobile Banking (bKash/Nagad)</div>
                    <div style={{ color: muted, fontWeight: 700, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{studioPhone}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <QrCode size={18} color={accentGold} style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ color: deep, fontWeight: 800 }}>{paymentQrCode ? 'Scan to Pay' : 'Payment Reference'}</div>
                  <div style={{ color: muted, fontWeight: 700, marginTop: 3 }}>{paymentQrCode ? 'QR code attached in this statement' : invoiceNo}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Banner for Unpaid Mode */}
        {statementMode === 'unpaid' && (
          <section style={{ marginBottom: 30, padding: '20px 24px', background: accentLight, border: `1px solid ${accentLine}`, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Outstanding Payment</div>
              <div style={{ color: deep, fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                {statementTasks.length} Outstanding Projects
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: muted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Total Outstanding</div>
              <div style={{ color: 'var(--color-danger)', fontSize: 26, fontWeight: 900 }}>{money(totalDue)}</div>
            </div>
          </section>
        )}

        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'grid', gridTemplateColumns: statementMode === 'unpaid' ? '40px 1fr 105px 105px 125px' : '40px 1fr 95px 95px 105px 110px', background: deep, color: '#fff', padding: '12px 18px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
            <div>#</div>
            <div>Project / Description</div>
            <div style={{ textAlign: 'right' }}>Billed</div>
            <div style={{ textAlign: 'right' }}>Paid</div>
            <div style={{ textAlign: 'right' }}>Due</div>
            {statementMode === 'all' && <div style={{ textAlign: 'right' }}>Status</div>}
          </div>

          {clientSafeItems.length > 0 ? clientSafeItems.map((item: any, index: number) => {
            const itemAmount = item.billedAmount;
            const itemPaid = item.paidAmount;
            const itemDue = item.dueAmount;
            const isPartial = !item.isCustom && itemPaid > 0 && itemDue > 0;
            const fullTitle = item.projectCode ? `${item.projectCode} — ${item.projectTitle}` : item.projectTitle;

            return (
              <div key={item.id || index} style={{ display: 'grid', gridTemplateColumns: statementMode === 'unpaid' ? '40px 1fr 105px 105px 125px' : '40px 1fr 95px 95px 105px 110px', borderLeft: `1px solid ${accentLine}`, borderRight: `1px solid ${accentLine}`, borderBottom: `1px solid ${accentLine}`, background: index % 2 === 0 ? '#fffefa' : surface, alignItems: 'center', padding: '14px 18px', position: 'relative' }}>
                <div style={{ color: muted, fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {item.serialNumber}
                </div>
                <div>
                  <div style={{ color: deep, fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {fullTitle}
                    {item.isCustom && <span style={{ fontSize: '10px', background: '#eef6ff', color: 'var(--color-info)', padding: '2px 6px', borderRadius: '4px' }}>Custom</span>}
                  </div>
                  {item.description && <div style={{ color: muted, fontSize: 12.5, fontWeight: 600, marginTop: 3 }}>{item.description}</div>}
                  {isPartial && statementMode === 'unpaid' && (
                    <div style={{ display: 'inline-flex', marginTop: 4, fontSize: 10, fontWeight: 800, color: 'var(--color-warning)', background: 'rgba(178,106,0,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                      PARTIALLY PAID
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', color: deep, fontSize: 14, fontWeight: 800 }}>{money(itemAmount)}</div>
                <div style={{ textAlign: 'right', color: '#16a34a', fontSize: 14, fontWeight: 800 }}>{money(itemPaid)}</div>
                <div style={{ textAlign: 'right', color: itemDue > 0 ? 'var(--color-danger)' : deep, fontSize: 15, fontWeight: 900 }}>{money(itemDue)}</div>

                {statementMode === 'all' && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: item.paymentStatus === 'PAID' ? 'rgba(29,127,63,0.1)' : item.paymentStatus === 'PARTIALLY PAID' ? 'rgba(178,106,0,0.1)' : 'rgba(201,39,31,0.1)',
                      color: item.paymentStatus === 'PAID' ? 'var(--color-success)' : item.paymentStatus === 'PARTIALLY PAID' ? 'var(--color-warning)' : 'var(--color-danger)'
                    }}>
                      {item.paymentStatus === 'PAID' ? 'Paid' : item.paymentStatus === 'PARTIALLY PAID' ? 'Partially Paid' : 'Unpaid'}
                    </span>
                  </div>
                )}

                <div className="no-print" style={{ position: 'absolute', right: 12 }}>
                  {item.isCustom ? (
                    <button onClick={() => removeCustomItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4 }} title="Remove">
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <button onClick={() => setExcludedTaskIds([...excludedTaskIds, item.id])} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4, opacity: 0.5 }} title="Exclude">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: muted, fontSize: 14, fontWeight: 600, border: `1px solid ${accentLine}`, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, background: surface }}>
              {statementMode === 'unpaid' ? 'No Outstanding Payments — All accounts settled!' : 'No projects found.'}
            </div>
          )}
        </section>

        <section className="invoice-settlement-section" style={{ display: 'grid', gridTemplateColumns: paymentQrCode ? 'minmax(280px, 1fr) minmax(280px, 40%)' : 'minmax(280px, 40%)', justifyContent: 'end', gap: 28, alignItems: 'start', marginBottom: 44 }}>
          {paymentQrCode && (
            <div style={{ justifySelf: 'start', width: '100%', maxWidth: 330, display: 'grid', gridTemplateColumns: '94px 1fr', gap: 16, alignItems: 'center', background: '#fffefa', border: `1px solid ${accentLine}`, borderRadius: 12, padding: 14, boxShadow: 'none' }}>
              <img
                src={paymentQrCode}
                alt="bKash payment QR code"
                style={{ width: 94, height: 94, objectFit: 'contain', borderRadius: 10, background: 'var(--card-bg)', border: `1px solid ${accentLine}`, padding: 6 }}
              />
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>
                  <QrCode size={14} strokeWidth={2.7} />
                  Scan to pay
                </div>
                <div style={{ color: deep, fontSize: 15, fontWeight: 900, lineHeight: 1.25 }}>bKash / Nagad</div>
                {studioPhone && (
                  <div style={{ color: muted, fontSize: 12.5, fontWeight: 700, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{studioPhone}</div>
                )}
              </div>
            </div>
          )}

          <div style={{ background: accentLight, borderRadius: 12, border: `1px solid ${accentLine}`, padding: 20 }}>
            <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Payment Information</div>
            <div style={{ display: 'grid', gap: 6, marginBottom: 14, fontSize: 13, color: deep, fontWeight: 800 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: muted }}>bKash / Nagad</span>
                <span>{studioPhone || '+8801999454749'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: accent, fontWeight: 900 }}>SCAN TO PAY</span>
              </div>
            </div>
            <div style={{ height: 1, background: accentLine, margin: '12px 0' }} />
            <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Payment Summary</div>
            <SummaryRow label="Total Billed" value={money(totalBilled)} />
            {taxAmount > 0 && (
              <SummaryRow label={`Tax (${taxRate}%)`} value={money(taxAmount)} />
            )}
            <SummaryRow label="Total Paid" value={money(totalPaid)} valueColor="#16a34a" />
            <div style={{ height: 1, background: accentLine, margin: '8px 0 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'baseline' }}>
              <span style={{ color: deep, fontSize: 15, fontWeight: 900 }}>{statementMode === 'unpaid' ? 'Total Outstanding' : 'Total Due'}</span>
              <span style={{ color: totalDue > 0 ? 'var(--color-danger)' : deep, fontSize: 24, fontWeight: 900, letterSpacing: -0.2 }}>{money(totalDue)}</span>
            </div>
            {statementMode === 'unpaid' && totalDue <= 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
                <span style={{ color: 'var(--color-success)', fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} strokeWidth={3} />
                  No Outstanding Balance
                </span>
              </div>
            )}
          </div>
        </section>

        {memo.trim() && (
          <section style={{ marginBottom: 36, padding: '16px 20px', background: accentLight, border: `1px solid ${accentLine}`, borderRadius: 12 }}>
            <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Note</div>
            <div style={{ color: deep, fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>{memo}</div>
          </section>
        )}

        <section style={{ marginBottom: 44, padding: '22px 24px', background: '#fffefa', border: `1px solid ${accentLine}`, borderRadius: 12 }}>
          <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Payment Note</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Please clear the outstanding balance at your earliest convenience.',
              'Please mention the relevant project/reference when making payment.',
              'For payment confirmation, please contact Tanvir Studio.',
            ].map((note, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, lineHeight: 1.6 }}>
                <span style={{ color: muted, fontSize: 12.5, fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ color: deep, fontSize: 12.5, fontWeight: 600 }}>{note}</span>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ borderTop: `1px solid ${accentLine}`, padding: '24px 0 0', display: 'flex', justifyContent: 'space-between', gap: 30, alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: accent, fontSize: 13, fontWeight: 800, fontStyle: 'italic' }}>Thank you for your business!</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: accent, fontSize: 12, fontWeight: 900 }}>
              {safeStudioName} · {statementMode === 'unpaid' ? 'Outstanding Payment Statement' : 'Complete Project Statement'}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, valueColor = deep, last = false }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, marginBottom: last ? 0 : 10, fontSize: 13.5 }}>
      <span style={{ color: muted, fontWeight: 700 }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 900 }}>{value}</span>
    </div>
  );
}
