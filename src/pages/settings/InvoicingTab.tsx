import type { Dispatch, SetStateAction } from 'react';

interface InvoicingTabProps {
  invoicePrefix: string;
  setInvoicePrefix: Dispatch<SetStateAction<string>>;
  invoiceNotes: string;
  setInvoiceNotes: Dispatch<SetStateAction<string>>;
  invoiceTaxRate: number;
  setInvoiceTaxRate: Dispatch<SetStateAction<number>>;
  sessionDurationDefault: number;
  setSessionDurationDefault: Dispatch<SetStateAction<number>>;
  workHoursStart: number;
  setWorkHoursStart: Dispatch<SetStateAction<number>>;
  workHoursEnd: number;
  setWorkHoursEnd: Dispatch<SetStateAction<number>>;
  autoCompleteDays: number;
  setAutoCompleteDays: Dispatch<SetStateAction<number>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

export function InvoicingTab({
  invoicePrefix, setInvoicePrefix, invoiceNotes, setInvoiceNotes, invoiceTaxRate, setInvoiceTaxRate,
  sessionDurationDefault, setSessionDurationDefault, workHoursStart, setWorkHoursStart,
  workHoursEnd, setWorkHoursEnd, autoCompleteDays, setAutoCompleteDays, setIsDirty,
}: InvoicingTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Invoice Format</div>
        <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Invoice Prefix</label>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>e.g. INV → INV-001, INV-002...</div>
            </div>
            <input type="text" maxLength={6} style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'var(--color-info)', outline: 'none', width: 72, borderRadius: 8, padding: '6px 10px', letterSpacing: 1 }} value={invoicePrefix} onChange={e => { setInvoicePrefix(e.target.value.toUpperCase()); setIsDirty(true); }} />
          </div>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Default Session Length</label>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Pre-selected when opening the date picker</div>
            </div>
            <select style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 10px' }} value={sessionDurationDefault} onChange={e => { setSessionDurationDefault(Number(e.target.value)); setIsDirty(true); }}>
              {[30,60,90,120,180,240].map(m => <option key={m} value={m}>{m < 60 ? `${m}m` : `${m/60}h`}</option>)}
            </select>
          </div>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Studio Opens</label>
            </div>
            <select style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 10px' }} value={workHoursStart} onChange={e => { setWorkHoursStart(Number(e.target.value)); setIsDirty(true); }}>
              {Array.from({length:14},(_,i)=>i+8).map(h => <option key={h} value={h}>{h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}</option>)}
            </select>
          </div>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Studio Closes</label>
            <select style={{ border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 10px' }} value={workHoursEnd} onChange={e => { setWorkHoursEnd(Number(e.target.value)); setIsDirty(true); }}>
              {Array.from({length:14},(_,i)=>i+9).map(h => <option key={h} value={h}>{h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}</option>)}
            </select>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
  );
}
