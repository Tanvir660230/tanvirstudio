interface DataTabProps {
  isMobile: boolean;
  exportProgress: string;
  exportingFull: boolean;
  handleExport: () => void;
  handleFactoryReset: () => void;
}

export function DataTab({ isMobile, exportProgress, exportingFull, handleExport, handleFactoryReset }: DataTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: '20px', borderLeft: '3px solid var(--color-info)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Full Backup</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.5 }}>Export ALL collections: tasks, clients, finance, workers, comms, logs, etc. as a single JSON file.</div>
          {exportProgress && <div style={{ fontSize: 11, color: 'var(--color-info)', marginBottom: 8, fontWeight: 600 }}>{exportProgress}</div>}
          <button className="btn btn-primary" style={{ width: '100%', padding: '10px', borderRadius: 10, fontSize: 13 }} onClick={handleExport} disabled={exportingFull}>
            {exportingFull ? 'Exporting...' : 'Download Full Backup'}
          </button>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '3px solid var(--color-danger)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 6 }}>Reset workspace</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 20, lineHeight: 1.5 }}>Permanently delete all data. This cannot be undone.</div>
          <button style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(255,59,48,0.2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={handleFactoryReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
