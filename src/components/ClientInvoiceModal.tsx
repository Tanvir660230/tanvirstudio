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
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [customItems, setCustomItems] = useState<Array<{ id: string, title: string, amount: number, isCustom: true }>>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [excludedTaskIds, setExcludedTaskIds] = useState<string[]>([]);

  const processedTasks = tasks.map(task => {
    const taskBudget = Number(task.budget) || 0;
    const taskPaid = (task.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    return { ...task, taskPaid, taskDue: taskBudget - taskPaid };
  }).filter(task => {
    if (excludedTaskIds.includes(task.id)) return false;
    if (filterType === 'unpaid') return task.taskDue > 0;
    if (filterType === 'paid') return task.taskDue <= 0 && Number(task.budget) > 0;
    return true;
  });

  const displayItems = [...processedTasks, ...customItems];

  const subtotal = displayItems.reduce((sum, item) => sum + (item.isCustom ? (Number(item.amount) || 0) : (Number(item.budget) || 0)), 0);
  const allPayments = processedTasks.flatMap(task => task.payments || []);
  const paid = allPayments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);
  const taxRate = Number(invoiceTaxRate) || 0;
  const taxAmount = taxRate > 0 ? Math.round(subtotal * (taxRate / 100)) : 0;
  const grandTotal = subtotal + taxAmount;
  const due = Math.max(0, grandTotal - paid);
  const isPaid = grandTotal > 0 && due <= 0;
  const isPartial = paid > 0 && due > 0;
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

  useEffect(() => { allocateInvoiceNo(); }, [allocateInvoiceNo]);
  const safeFormatDate = (val: any, opts: Intl.DateTimeFormatOptions) => {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', opts);
  };
  const safeStudioName = studioName || 'Tanvir Studio';
  const money = (amount: number) => `${currency || '৳'}${(isNaN(amount) ? 0 : Math.round(amount)).toLocaleString('en-US')}`;

  const status = isPaid
    ? { label: 'Paid', color: 'var(--color-success)', bg: 'rgba(29,127,63,0.1)', Icon: CheckCircle2 }
    : isPartial
      ? { label: 'Partial', color: 'var(--color-warning)', bg: 'rgba(178,106,0,0.1)', Icon: Clock }
      : { label: 'Due', color: 'var(--color-danger)', bg: 'rgba(201,39,31,0.1)', Icon: AlertCircle };

  const StatusIcon = status.Icon;

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
      el.style.borderRadius = '0px';
      el.style.boxShadow = 'none';
      el.style.width = '794px';
      el.style.maxWidth = '794px';

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: paper,
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

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pageW = 210;
      const imgH = (canvas.height * pageW) / canvas.width;
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageW, imgH] });
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);

      pdf.save(`${safeStudioName.replace(/\s+/g, '_')}_Statement_${client.name.replace(/\s+/g, '_')}.pdf`);
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
        {/* Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
          <Filter size={16} color="var(--card-bg)" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            <option value="all" style={{ color: 'var(--text-primary)' }}>All Projects</option>
            <option value="unpaid" style={{ color: 'var(--text-primary)' }}>Unpaid Projects</option>
            <option value="paid" style={{ color: 'var(--text-primary)' }}>Paid Projects</option>
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
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            style={{ ...actionButton, background: 'var(--card-bg)', color: ink, opacity: isGenerating ? 0.7 : 1 }}
          >
            {isGenerating ? <Spinner size={15} color={ink} /> : <Download size={16} strokeWidth={2.6} />}
            {isGenerating ? 'Generating…' : 'PDF'}
          </button>
          <button onClick={handlePrint} style={{ ...actionButton, background: 'rgba(255,255,255,0.16)', color: '#fff' }}>
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
          <div style={{ width: '100%', marginTop: 4, textAlign: 'center', fontSize: 12, color: 'var(--color-warning)', fontWeight: 600 }}>
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
        {isPaid && (
          <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: 118, fontWeight: 900, color: 'rgba(196,154,82,0.07)', letterSpacing: 14, pointerEvents: 'none', userSelect: 'none', zIndex: 0, whiteSpace: 'nowrap' }}>PAID</div>
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
            <div style={{ fontSize: 42, fontWeight: 300, color: 'var(--accent-gold)', letterSpacing: 4, lineHeight: 1, textTransform: 'uppercase' }}>Statement</div>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ background: surface, padding: '12px 20px', borderRadius: 16, display: 'inline-grid', gap: 8, textAlign: 'right', minWidth: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <span style={{ color: muted, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Invoice No</span>
                  <span style={{ color: deep, fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap' }}>{invoiceNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <span style={{ color: muted, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Issued</span>
                  <span style={{ color: deep, fontSize: 14, fontWeight: 800 }}>{invoiceDate}</span>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 16, background: status.bg, color: status.color, fontSize: 14, fontWeight: 900 }}>
                <StatusIcon size={18} strokeWidth={3} />
                {status.label}
              </div>
            </div>
          </div>
        </header>

        <section className="invoice-payment-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 34, marginBottom: 40 }}>
          <div>
            <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Billed To</div>
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

        <section style={{ marginBottom: 44 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', background: `linear-gradient(135deg, ${deep}, #332413)`, color: '#fff', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, borderRadius: '8px 8px 0 0' }}>
            <div style={{ padding: '13px 16px' }}>Project / Description</div>
            <div style={{ padding: '13px 16px', textAlign: 'right' }}>Amount</div>
          </div>
          {displayItems.length > 0 ? displayItems.map((item) => (
            <div key={item.id} className="invoice-line-item" style={{ display: 'grid', gridTemplateColumns: '1fr 160px', borderLeft: `1px solid ${accentLine}`, borderRight: `1px solid ${accentLine}`, borderBottom: `1px solid ${accentLine}`, background: '#fffefa', position: 'relative' }}>
              <div style={{ padding: '18px 16px' }}>
                <div style={{ color: deep, fontSize: 16, fontWeight: 900, marginBottom: item.description ? 5 : 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.title || 'Studio Project'}
                  {item.isCustom && <span style={{ fontSize: '10px', background: '#eef6ff', color: 'var(--color-info)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Custom</span>}
                </div>
                {item.description && (
                  <div style={{ color: muted, fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>
                    {item.description}
                  </div>
                )}
              </div>
              <div style={{ padding: '18px 16px', textAlign: 'right', color: deep, fontSize: 16, fontWeight: 900, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                {money(item.isCustom ? item.amount : (Number(item.budget) || 0))}
                {item.isCustom ? (
                  <button
                    className="no-print"
                    onClick={() => removeCustomItem(item.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                    title="Remove custom item"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <button
                    className="no-print"
                    onClick={() => setExcludedTaskIds([...excludedTaskIds, item.id])}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: 0.5 }}
                    title="Remove project from statement"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div style={{ padding: '20px 0', textAlign: 'center', color: muted, fontSize: 14, fontWeight: 600 }}>
              No projects found for this client.
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
                <div style={{ color: deep, fontSize: 15, fontWeight: 900, lineHeight: 1.25 }}>bKash QR</div>
                {studioPhone && (
                  <div style={{ color: muted, fontSize: 12.5, fontWeight: 700, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{studioPhone}</div>
                )}
              </div>
            </div>
          )}

          <div style={{ background: accentLight, borderRadius: 12, border: `1px solid ${accentLine}`, padding: 20 }}>
            <SummaryRow label="Subtotal" value={money(subtotal)} last={taxAmount === 0 && allPayments.length === 0} />
            {taxAmount > 0 && (
              <SummaryRow label={`Tax (${taxRate}%)`} value={money(taxAmount)} last={allPayments.length === 0} />
            )}
            {allPayments.map((payment: any, index: number) => (
              <SummaryRow
                key={`${payment.date || 'payment'}-${index}`}
                label={safeFormatDate(payment.date, { month: 'short', day: 'numeric', year: 'numeric' }) || `Payment ${index + 1}`}
                value={`-${money(Number(payment.amount) || 0)}`}
                valueColor="#dc2626"
                last={index === allPayments.length - 1}
              />
            ))}
            <div style={{ height: 1, background: accentLine, margin: '4px 0 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'baseline' }}>
              <span style={{ color: deep, fontSize: 15, fontWeight: 900 }}>Total Due</span>
              <span style={{ color: due > 0 ? accent : deep, fontSize: 24, fontWeight: 900, letterSpacing: -0.2 }}>{money(due)}</span>
            </div>
            {isPaid && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
                <span style={{ color: 'var(--color-success)', fontSize: 17, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={17} strokeWidth={3} />
                  Fully Paid
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
          <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Terms &amp; Conditions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Full payment must be completed before final delivery.',
              'Advance payments are non-refundable once the project is started.',
              'Minor revisions are included; major changes may incur additional charges.',
            ].map((term, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, lineHeight: 1.6 }}>
                <span style={{ color: muted, fontSize: 12.5, fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ color: deep, fontSize: 12.5, fontWeight: 600 }}>{term}</span>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ borderTop: `1px solid ${accentLine}`, padding: '24px 0 0', display: 'flex', justifyContent: 'space-between', gap: 30, alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: accent, fontSize: 13, fontWeight: 800, fontStyle: 'italic' }}>Thank you for your business!</div>

          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: accent, fontSize: 12, fontWeight: 900 }}>{safeStudioName}</div>
            <div style={{ color: muted, fontSize: 10, fontWeight: 600, marginTop: 4 }}>{prefix} Statement</div>
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
