interface StageColumn {
  id: string;
  title: string;
  color: string;
}

interface WorkProcessBulkBarProps {
  selectedCount: number;
  columns: StageColumn[];
  activeStage: string;
  handleBulkMoveStage: (stage: string) => void;
  handleBulkDelete: () => void;
}

export function WorkProcessBulkBar({
  selectedCount,
  columns,
  activeStage,
  handleBulkMoveStage,
  handleBulkDelete,
}: WorkProcessBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-info)', flexShrink: 0 }}>{selectedCount} selected</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>MOVE TO</span>
      {columns.filter(c => c.id !== activeStage).slice(0, 4).map(c => (
        <button key={c.id} onClick={() => handleBulkMoveStage(c.id)} style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${c.color}30`, background: `${c.color}10`, color: c.color, fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c.title}</button>
      ))}
      <div style={{ width: 1, height: 14, background: 'var(--border-color)', flexShrink: 0 }} />
      <button onClick={handleBulkDelete} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid rgba(255,59,48,0.3)', background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Delete</button>
    </div>
  );
}

export default WorkProcessBulkBar;
