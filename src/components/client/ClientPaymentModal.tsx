import React from 'react';
import { Modal } from '../Modal';
import { Spinner } from '../Spinner';
import { Check } from 'lucide-react';
import type { Client } from '../../types';

interface ClientPaymentModalProps {
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (v: boolean) => void;
  isBonus: boolean;
  setIsBonus: React.Dispatch<React.SetStateAction<boolean>>;
  paymentAmount: string;
  setPaymentAmount: React.Dispatch<React.SetStateAction<string>>;
  paymentNote: string;
  setPaymentNote: React.Dispatch<React.SetStateAction<string>>;
  handleReceivePayment: (e: React.FormEvent) => void;
  currency: string;
  selectedClient: Client | null;
  clientFinancials: Map<string, { spent: number; due: number }>;
  isSaving: boolean;
}

export function ClientPaymentModal({
  isPaymentModalOpen, setIsPaymentModalOpen, isBonus, setIsBonus,
  paymentAmount, setPaymentAmount, paymentNote, setPaymentNote,
  handleReceivePayment, currency, selectedClient, clientFinancials, isSaving,
}: ClientPaymentModalProps) {
  return (
    <Modal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setIsBonus(false); }} title={isBonus ? 'Record Client Bonus' : 'Receive Payment'}>
      <form onSubmit={handleReceivePayment} style={{ padding: '4px 0' }}>

        {/* Bonus toggle */}
        <div
          onClick={() => { setIsBonus(v => !v); setPaymentAmount(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${isBonus ? 'rgba(255,149,0,0.4)' : 'var(--border-color)'}`, background: isBonus ? 'rgba(255,149,0,0.06)' : 'var(--bg-color)', transition: 'all 0.2s' }}
        >
          <div style={{ width: 36, height: 20, borderRadius: 10, background: isBonus ? 'var(--color-warning)' : 'var(--border-color)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: isBonus ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: isBonus ? 'var(--color-warning)' : 'var(--text-primary)' }}>Bonus / Tip Payment</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>Client is paying extra — not tied to any project balance</div>
          </div>
        </div>

        {/* Pending balance (only for regular payments) */}
        {!isBonus && (
          <div style={{ marginBottom: '20px', background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.15)', padding: '16px 20px', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '500', marginBottom: '4px' }}>Total Pending Balance</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-danger)', letterSpacing: '-0.5px' }}>{currency}{selectedClient ? (clientFinancials.get(selectedClient.id)?.due ?? 0).toLocaleString() : 0}</div>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px', fontWeight: '400', margin: '6px 0 0' }}>
              Payments are automatically adjusted against oldest pending projects.
            </p>
          </div>
        )}

        {/* Bonus context banner */}
        {isBonus && (
          <div style={{ marginBottom: '20px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🎉</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-warning)', marginBottom: 2 }}>Great work!</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>This bonus will be recorded as extra income and added to {selectedClient?.name}'s lifetime value.</div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{isBonus ? 'Bonus Amount' : 'Payment Amount'} ({currency})</label>
          <input
            type="number"
            className="form-input"
            placeholder="0"
            value={paymentAmount}
            onChange={e => setPaymentAmount(e.target.value)}
            required
            min="1"
            max={!isBonus && selectedClient ? (clientFinancials.get(selectedClient?.id)?.due || 0) : undefined}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Note / Details <span style={{ color: 'var(--text-tertiary)', fontWeight: '400' }}>(Optional)</span></label>
          <input type="text" className="form-input" placeholder={isBonus ? 'e.g. Happy with the final mix!' : 'e.g. Paid via Bank Transfer'} value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          style={{ width: '100%', background: isSaving ? 'rgba(52,199,89,0.5)' : isBonus ? 'var(--color-warning)' : 'var(--color-success)', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', transition: 'background 0.2s' }}
        >
          {isSaving
            ? <><Spinner size={15} color="white" /> Processing...</>
            : isBonus
              ? <><span>🎉</span> Record Bonus</>
              : <><Check size={16} /> Confirm Payment</>
          }
        </button>
      </form>
    </Modal>
  );
}
