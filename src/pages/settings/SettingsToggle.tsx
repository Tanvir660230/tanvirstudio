interface SettingsToggleProps {
  checked: boolean;
  onChange: () => void;
  color?: string;
}

export function SettingsToggle({ checked, onChange, color = 'var(--color-success)' }: SettingsToggleProps) {
  return (
    <div onClick={onChange} style={{ width: 44, height: 26, borderRadius: 13, background: checked ? color : 'var(--border-color)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: 'none' }} />
    </div>
  );
}
