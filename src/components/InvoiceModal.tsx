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

  QrCode,

  Smartphone,

  X,

} from 'lucide-react';

import { Spinner } from './Spinner';

import jsPDF from 'jspdf';

import html2canvas from 'html2canvas';

import { useSettings } from '../contexts/SettingsContext';

import { nextInvoiceNumber } from '../utils/invoiceCounter';

import { doc, updateDoc } from 'firebase/firestore';

import { db } from '../lib/firebase';

import { sendInvoiceEmail } from '../utils/emailApi';



interface InvoiceModalProps {

  task: any;

  onClose: () => void;

}



const deep = '#1f1a14';

const accent = '#a96d24';

const accentGold = 'var(--accent-gold)';

const accentLight = '#f8f0e2';

const accentLine = '#eadcc8';

const muted = '#6b7280';

const paper = 'var(--card-bg)';

const ink = '#111111';



export function InvoiceModal({ task, onClose }: InvoiceModalProps) {

  const { settings } = useSettings();

  const {

    currency, studioName, studioLogo, studioAddress, studioEmail, studioPhone, paymentQrCode,

    invoicePrefix, invoiceNotes, invoiceTaxRate,

  } = settings;

  const invoiceRef = useRef<HTMLDivElement>(null);

  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [visible, setVisible] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const [pdfError, setPdfError] = useState('');

  const [memo, setMemo] = useState(invoiceNotes || '');



  const budget = Number(task.budget) || 0;

  const payments: any[] = task.payments || [];

  const paid = payments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);

  const taxRate = Number(invoiceTaxRate) || 0;

  const originalPrice = budget + (Number(task.couponDiscount) || 0);

  const taxAmount = taxRate > 0 ? Math.round(originalPrice * (taxRate / 100)) : 0;

  const grandTotal = budget + taxAmount;

  const due = Math.max(0, grandTotal - paid);

  const isPaid = grandTotal > 0 && due <= 0;

  const isPartial = paid > 0 && due > 0;



  const today = new Date();

  const invoiceDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const prefix = (invoicePrefix || 'INV').toUpperCase();



  // Use sequential number stored on task; allocate one if missing

  const [invoiceNo, setInvoiceNo] = useState<string>(() => {

    if (task.invoiceNo) return task.invoiceNo;

    // Fallback while we fetch (won't be shown until visible)

    const taskDate = task.createdAt ? new Date(task.createdAt) : today;

    const dateStr = `${taskDate.getFullYear()}${String(taskDate.getMonth() + 1).padStart(2, '0')}${String(taskDate.getDate()).padStart(2, '0')}`;

    return `${prefix}-${dateStr}-${String(task.id || '0000').substring(0, 4).toUpperCase()}`;

  });



  const allocateInvoiceNo = useCallback(async () => {

    if (task.invoiceNo) return; // already assigned

    try {

      const seq = await nextInvoiceNumber();

      const no = `${prefix}-${seq}`;

      setInvoiceNo(no);

      if (task.id) {

        await updateDoc(doc(db, 'tasks', task.id), { invoiceNo: no });

      }

    } catch { /* non-critical — keep fallback */ }

  }, [task.id, task.invoiceNo, prefix]);



  useEffect(() => { allocateInvoiceNo(); }, [allocateInvoiceNo]);

  const safeStudioName = studioName || 'Tanvir Studio';

  const money = (amount: number) => `${currency || '৳'}${amount.toLocaleString('en-US')}`;

  const safeFormatDate = (val: any, opts: Intl.DateTimeFormatOptions) => {

    if (!val) return '';

    const d = new Date(val);

    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', opts);

  };



  const status = isPaid

    ? { label: 'Fully Paid', color: '#15803d', bg: '#f0fdf4', border: '#dcfce7', Icon: CheckCircle2 }

    : isPartial

      ? { label: 'Partially Paid', color: '#b45309', bg: '#fffbeb', border: '#fde68a', Icon: Clock }

      : { label: 'Due', color: '#b91c1c', bg: '#fef2f2', border: '#fee2e2', Icon: AlertCircle };



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

      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);

    };

  }, [onClose]);



  const handlePrint = () => window.print();



  const handleEmailInvoice = async () => {

    if (!task.clientEmail) { setPdfError('No client email on file.'); return; }

    if (isSendingEmail) return;

    setIsSendingEmail(true);

    setEmailStatus('idle');

    try {

      await sendInvoiceEmail(

        task.clientEmail,

        task.client || 'Client',

        invoiceNo,

        safeStudioName,

        task.title || 'Studio Project',

        currency || '৳',

        grandTotal,

        paid,

        due,

        memo.trim() || undefined,

      );

      setEmailStatus('sent');

      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);

      emailTimerRef.current = setTimeout(() => setEmailStatus('idle'), 3000);

    } catch {

      setEmailStatus('error');

    } finally {

      setIsSendingEmail(false);

    }

  };



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

        },

      });



      el.style.borderRadius = savedRadius;

      el.style.boxShadow = savedShadow;

      el.style.width = savedWidth;

      el.style.maxWidth = savedMaxWidth;



      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      const pageW = 210;

      const imgH = (canvas.height * pageW) / canvas.width;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageW, imgH] });

      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);



      pdf.save(`${safeStudioName.replace(/\s+/g, '_')}_${invoiceNo}.pdf`);

    } catch {

      setPdfError('PDF failed - opening print dialog instead.');

      window.print();

    } finally {

      setIsGenerating(false);

    }

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

      <div

        className="no-print invoice-actions-bar"

        style={{

          position: 'fixed',

          top: 24,

          left: '50%',

          transform: 'translateX(-50%)',

          display: 'flex',

          gap: 10,

          flexWrap: 'wrap',

          justifyContent: 'center',

          zIndex: 10000,

          background: 'rgba(255, 255, 255, 0.14)',

          padding: 8,

          borderRadius: 999,

          backdropFilter: 'blur(26px)',

          WebkitBackdropFilter: 'blur(26px)',

          border: '1px solid rgba(255, 255, 255, 0.2)',

          boxShadow: 'none',

          maxWidth: 'calc(100vw - 24px)',

        }}

      >

        <input

          className="no-print"

          type="text"

          value={memo}

          onChange={e => setMemo(e.target.value)}

          placeholder="Add a note..."

          style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 12, fontSize: 14, outline: 'none', minWidth: 0, flex: '1 1 140px', maxWidth: 200 }}

        />

        <button

          onClick={handleDownloadPDF}

          disabled={isGenerating}

          style={{ ...actionButton, background: 'var(--card-bg)', color: ink, opacity: isGenerating ? 0.7 : 1 }}

        >

          {isGenerating ? <Spinner size={15} color={ink} /> : <Download size={16} strokeWidth={2.6} />}

          {isGenerating ? 'Generating...' : 'Download PDF'}

        </button>

        <button onClick={handlePrint} style={{ ...actionButton, background: 'rgba(255,255,255,0.16)', color: '#fff' }}>

          <Printer size={16} strokeWidth={2.6} />

          Print

        </button>

        {task.clientEmail && (

          <button

            onClick={() => { setEmailStatus('idle'); handleEmailInvoice(); }}

            disabled={isSendingEmail}

            title={emailStatus === 'error' ? 'Click to retry sending' : undefined}

            style={{

              ...actionButton,

              background: emailStatus === 'sent' ? 'rgba(52,199,89,0.25)' : emailStatus === 'error' ? 'rgba(255,59,48,0.25)' : 'rgba(255,255,255,0.16)',

              color: '#fff',

              opacity: isSendingEmail ? 0.7 : 1,

            }}

          >

            {isSendingEmail ? <Spinner size={15} color="var(--card-bg)" /> : <Mail size={16} strokeWidth={2.6} />}

            {emailStatus === 'sent' ? 'Sent!' : emailStatus === 'error' ? 'Retry Email' : 'Email Client'}

          </button>

        )}

        <button

          onClick={onClose}

          aria-label="Close invoice"

          style={{

            ...actionButton,

            width: 42,

            padding: 0,

            background: 'rgba(255,255,255,0.16)',

            color: '#fff',

          }}

        >

          <X size={18} strokeWidth={2.6} />

        </button>

        {pdfError && (

          <div style={{ width: '100%', marginTop: 4, textAlign: 'center', fontSize: 12, color: 'var(--color-warning)', fontWeight: 600 }}>

            {pdfError}

          </div>

        )}

      </div>



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

          transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',

          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',

        }}

      >

        <div style={{ position: 'absolute', inset: '0 0 auto', height: 6, background: `linear-gradient(90deg, ${deep}, ${accentGold}, ${accent})` }} />

        <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 1, background: accentLine }} />

        {isPaid && (

          <div style={{ position: 'absolute', top: '44%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: 118, fontWeight: 900, color: 'rgba(196,154,82,0.07)', letterSpacing: 14, pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}>PAID</div>

        )}



        <header className="invoice-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, paddingBottom: 34, borderBottom: `1px solid ${accentLine}`, position: 'relative', paddingTop: 4 }}>

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



            <div style={{ display: 'grid', gap: 7, color: muted, fontSize: 12.5, fontWeight: 600, lineHeight: 1.55, maxWidth: 340 }}>

              {studioAddress && <ContactRow icon={<MapPin size={14} />} text={studioAddress} />}

              {studioEmail && <ContactRow icon={<Mail size={14} />} text={studioEmail} />}

              {studioPhone && <ContactRow icon={<Phone size={14} />} text={studioPhone} />}

            </div>

          </div>



          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>

            <div style={{ fontSize: 44, fontWeight: 300, color: 'var(--accent-gold)', letterSpacing: 5, lineHeight: 1, textTransform: 'uppercase' }}>Invoice</div>

            <table style={{ marginTop: 20, borderCollapse: 'collapse', fontSize: 13.5, minWidth: 270 }}>

              <tbody>

                <MetaRow label="Invoice No" value={invoiceNo} strong />

                <MetaRow label="Date Issued" value={invoiceDate} />

                <tr>

                  <td style={metaLabelStyle}>Status</td>

                  <td style={{ padding: '7px 0', textAlign: 'right' }}>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: status.bg, color: status.color, border: `1px solid ${status.border}`, fontSize: 12, fontWeight: 800, boxShadow: isPaid ? '0 6px 16px rgba(21,128,61,0.08)' : 'none' }}>

                      <StatusIcon size={14} strokeWidth={3} />

                      {status.label}

                    </span>

                  </td>

                </tr>

              </tbody>

            </table>

          </div>

        </header>



        <section className="invoice-payment-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 34, marginTop: 36, marginBottom: 40 }}>

          <div>

            <SectionLabel>Billed To</SectionLabel>

            <div style={{ color: deep, fontSize: 20, fontWeight: 900, marginTop: 10, wordBreak: 'break-word' }}>{task.client || 'Valued Client'}</div>

            <div style={{ display: 'grid', gap: 7, marginTop: 9, color: muted, fontSize: 13, fontWeight: 600 }}>

              {task.clientEmail && <ContactRow icon={<Mail size={14} />} text={task.clientEmail} />}

              {task.clientPhone && <ContactRow icon={<Phone size={14} />} text={task.clientPhone} />}

            </div>

          </div>



          <div style={{ borderLeft: `1px solid ${accentLine}`, paddingLeft: 30 }}>

            <SectionLabel>Payment Methods</SectionLabel>

            <div style={{ display: 'grid', gap: 14, marginTop: 12, fontSize: 13 }}>

              {studioPhone && (

                <PaymentLine

                  icon={<Smartphone size={18} />}

                  title="Mobile Banking (bKash/Nagad)"

                  detail={studioPhone}

                />

              )}

              <PaymentLine

                icon={<QrCode size={18} />}

                title={paymentQrCode ? 'Scan to Pay' : 'Payment Reference'}

                detail={paymentQrCode ? 'QR code attached in this invoice' : invoiceNo}

              />

            </div>

          </div>

        </section>



        <section style={{ marginBottom: 28, overflow: 'hidden', borderRadius: 8 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px 140px', background: `linear-gradient(135deg, ${deep}, #332413)`, color: '#fff', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>

            <div style={{ padding: '13px 16px' }}>Description</div>

            <div style={{ padding: '13px 10px', textAlign: 'center' }}>Qty</div>

            <div style={{ padding: '13px 16px', textAlign: 'right' }}>Amount</div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px 140px', border: `1px solid ${accentLine}`, borderTop: 'none', background: '#fffefa' }}>

            <div style={{ padding: '18px 16px 46px' }}>

              <div style={{ color: deep, fontSize: 15, fontWeight: 900, marginBottom: task.description ? 6 : 0 }}>{task.title || 'Studio Project'}</div>

              {task.description && (

                <div style={{ color: muted, fontSize: 12.5, fontWeight: 600, lineHeight: 1.55 }}>

                  {task.description}

                </div>

              )}

            </div>

            <div style={{ padding: '18px 10px', textAlign: 'center', color: muted, fontSize: 13, fontWeight: 700 }}>1</div>

            <div style={{ padding: '18px 16px', textAlign: 'right', color: deep, fontSize: 15, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{money(budget)}</div>

          </div>

        </section>



        <section className="invoice-settlement-section" style={{ display: 'grid', gridTemplateColumns: paymentQrCode ? 'minmax(280px, 1fr) minmax(280px, 40%)' : 'minmax(280px, 40%)', justifyContent: 'end', gap: 28, alignItems: 'start', marginBottom: 34 }}>

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

          <div style={{ width: '100%', minWidth: 280 }}>

            <SummaryRow label="Subtotal" value={money(budget)} />

            {taxAmount > 0 && <SummaryRow label={`Tax (${taxRate}%)`} value={money(taxAmount)} />}

            {payments.map((payment: any, index: number) => (

              <SummaryRow

                key={`${payment.date || 'payment'}-${index}`}

                label={`Paid${safeFormatDate(payment.date, { month: 'short', day: 'numeric', year: 'numeric' }) ? ` (${safeFormatDate(payment.date, { month: 'short', day: 'numeric', year: 'numeric' })})` : ` ${index + 1}`}`}

                value={`-${money(Number(payment.amount) || 0)}`}

                valueColor="#dc2626"

              />

            ))}

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'baseline', background: accentLight, borderTop: `2px solid ${deep}`, borderRadius: '0 0 8px 8px', padding: '16px 18px' }}>

              <span style={{ color: deep, fontSize: 15, fontWeight: 900 }}>Total Due</span>

              <span style={{ color: due > 0 ? accent : deep, fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{money(due)}</span>

            </div>

          </div>

        </section>



        {memo.trim() && (

          <section style={{ marginBottom: 26, padding: '14px 16px', background: accentLight, border: `1px solid ${accentLine}`, borderRadius: 8 }}>

            <SectionLabel>Note</SectionLabel>

            <div style={{ color: deep, fontSize: 12.5, fontWeight: 600, lineHeight: 1.6, marginTop: 6 }}>{memo}</div>

          </section>

        )}



        <footer style={{ marginTop: 'auto', paddingTop: 26, borderTop: `1px solid ${accentLine}`, display: 'flex', justifyContent: 'space-between', gap: 28, alignItems: 'flex-end' }}>

          <div style={{ maxWidth: 430 }}>

            <SectionLabel>Terms &amp; Conditions</SectionLabel>

            <ol style={{ margin: '10px 0 0', paddingLeft: 16, color: muted, fontSize: 11.5, fontWeight: 600, lineHeight: 1.65 }}>

              <li>Full payment must be completed before final delivery.</li>

              <li>Advance payments are non-refundable once the project is started.</li>

              <li>Minor revisions are included; major changes may incur additional charges.</li>

            </ol>

          </div>

          <div style={{ color: accent, fontSize: 13, fontWeight: 800, fontStyle: 'italic', textAlign: 'right', whiteSpace: 'nowrap' }}>

            Thank you for your business!

          </div>

        </footer>

      </div>

    </div>

  );

}



const metaLabelStyle: React.CSSProperties = {

  padding: '7px 18px 7px 0',

  color: muted,

  fontSize: 11,

  fontWeight: 800,

  letterSpacing: 0.7,

  textTransform: 'uppercase',

  textAlign: 'right',

  whiteSpace: 'nowrap',

};



function MetaRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {

  return (

    <tr>

      <td style={metaLabelStyle}>{label}</td>

      <td style={{ padding: '7px 0', color: deep, fontSize: strong ? 13.5 : 13, fontWeight: strong ? 900 : 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</td>

    </tr>

  );

}



function SectionLabel({ children }: { children: React.ReactNode }) {

  return (

    <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>

      {children}

    </div>

  );

}



function ContactRow({ icon, text }: { icon: React.ReactNode; text: string }) {

  return (

    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>

      <span style={{ color: accentGold, display: 'inline-flex', marginTop: 2, flexShrink: 0 }}>{icon}</span>

      <span style={{ color: muted }}>{text}</span>

    </div>

  );

}



function PaymentLine({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {

  return (

    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>

      <span style={{ color: accentGold, display: 'inline-flex', marginTop: 1, flexShrink: 0 }}>{icon}</span>

      <div>

        <div style={{ color: deep, fontWeight: 800 }}>{title}</div>

        <div style={{ color: muted, fontWeight: 700, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{detail}</div>

      </div>

    </div>

  );

}



function SummaryRow({ label, value, valueColor = deep }: { label: string; value: string; valueColor?: string }) {

  return (

    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '8px 0', fontSize: 13.5 }}>

      <span style={{ color: muted, fontWeight: 700 }}>{label}</span>

      <span style={{ color: valueColor, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{value}</span>

    </div>

  );

}

