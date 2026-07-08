import type { Dispatch, SetStateAction } from 'react';
import { SettingsToggle } from './SettingsToggle';

interface NotificationsTabProps {
  notifyOverdue: boolean;
  setNotifyOverdue: Dispatch<SetStateAction<boolean>>;
  notifyUpcoming: boolean;
  setNotifyUpcoming: Dispatch<SetStateAction<boolean>>;
  notifyPayment: boolean;
  setNotifyPayment: Dispatch<SetStateAction<boolean>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

export function NotificationsTab({ notifyOverdue, setNotifyOverdue, notifyUpcoming, setNotifyUpcoming, notifyPayment, setNotifyPayment, setIsDirty }: NotificationsTabProps) {
  return (
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
              <SettingsToggle checked={checked} onChange={toggle} color={color} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
