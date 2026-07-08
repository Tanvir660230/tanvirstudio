import React from 'react';
import { Music2, Mic, Users } from 'lucide-react';
import { calcComposerComm, calcHummingComm } from '../../utils/commissionUtils';
import { Card } from './Card';

const READY_STATUSES = ['delivered', 'completed'];

interface TeamSectionProps {
  task: any;
  teams: any[];
  settings: any;
  isAdmin: boolean;
  currency: string;
}

export function TeamSection({ task, teams, settings, isAdmin, currency }: TeamSectionProps) {
  return (
    <Card title="Assigned Team" icon={<Users size={15} color="var(--accent-purple)" />} color="var(--accent-purple)">
      <div style={{ display: 'flex', gap: 12 }}>
        {(task.composerId && task.composerId !== 'undefined' && task.composerId !== 'null') && (() => {
          const pct = Number(task.composerCommissionPct) || settings.defaultComposerComm;
          const earned = READY_STATUSES.includes(task.status) ? calcComposerComm(task, settings.defaultComposerComm) : 0;
          const paidWorker = task.composerPaid || 0;
          const dueWorker = Math.max(0, earned - paidWorker);
          const composerName = teams.find((u: any) => u.uid === task.composerId)?.name || task.composerName || 'Lead Composer';
          const feeLabel = task.composerCommissionType === 'flat' ? `${currency}${Number(task.composerCommissionAmount || 0).toLocaleString()} flat fee` : `${pct}% commission`;
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px', borderRadius: 14, background: 'var(--bg-color)', border: '1px solid var(--border-color)', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, rgba(0,122,255,0.15), rgba(0,122,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Music2 size={16} color="var(--color-info)" /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Lead Composer</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{composerName}</div>
                  {isAdmin && <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 2 }}>{feeLabel}</div>}
                </div>
              </div>
              {isAdmin && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Earned</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)' }}>{currency}{earned.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Paid</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-success)' }}>{currency}{paidWorker.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Due</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: dueWorker > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{currency}{Math.max(0, dueWorker).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {(task.needsHumming && task.hummingArtistId && task.hummingArtistId !== 'undefined' && task.hummingArtistId !== 'null') && (() => {
          const pct = Number(task.hummingArtistCommissionPct) || settings.defaultHummingComm;
          const earned = READY_STATUSES.includes(task.status) ? calcHummingComm(task, settings.defaultHummingComm) : 0;
          const paidWorker = task.hummingArtistPaid || 0;
          const dueWorker = Math.max(0, earned - paidWorker);
          const hummingName = teams.find((u: any) => u.uid === task.hummingArtistId)?.name || task.hummingArtistName || 'Vocal Artist';
          const feeLabel = task.hummingArtistCommissionType === 'flat' ? `${currency}${Number(task.hummingArtistCommissionAmount || 0).toLocaleString()} flat fee` : `${pct}% commission`;
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px', borderRadius: 14, background: 'var(--bg-color)', border: '1px solid var(--border-color)', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, rgba(255,149,0,0.15), rgba(255,149,0,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Mic size={16} color="var(--color-warning)" /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Vocal Artist</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hummingName}</div>
                  {isAdmin && <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 2 }}>{feeLabel}</div>}
                </div>
              </div>
              {isAdmin && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Earned</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)' }}>{currency}{earned.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Paid</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-success)' }}>{currency}{paidWorker.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Due</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: dueWorker > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{currency}{Math.max(0, dueWorker).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </Card>
  );
}
