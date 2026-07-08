import React from 'react';
import { Download } from 'lucide-react';

interface WorkerLike {
  uid?: string;
  id?: string;
  name?: string;
  displayName?: string;
}

interface WorkProcessToolbarProps {
  stageSort: 'deadline' | 'dateAdded' | 'priority';
  setStageSort: (v: 'deadline' | 'dateAdded' | 'priority') => void;
  stageFilter: 'all' | 'paid' | 'unpaid';
  setStageFilter: (v: 'all' | 'paid' | 'unpaid') => void;
  workerFilter: string;
  setWorkerFilter: (v: string) => void;
  composers: WorkerLike[];
  hummingArtists: WorkerLike[];
  isAdmin: boolean;
  sortedCount: number;
  stageTasksCount: number;
  showBulkTools?: boolean;
  isSelectMode?: boolean;
  setIsSelectMode?: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedTaskIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
  exportTasksCSV?: () => void;
}

export function WorkProcessToolbar({
  stageSort,
  setStageSort,
  stageFilter,
  setStageFilter,
  workerFilter,
  setWorkerFilter,
  composers,
  hummingArtists,
  isAdmin,
  sortedCount,
  stageTasksCount,
  showBulkTools = true,
  isSelectMode,
  setIsSelectMode,
  setSelectedTaskIds,
  exportTasksCSV,
}: WorkProcessToolbarProps) {
  return (
    <div className="sort-filter-toolbar custom-scrollbar" style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      marginBottom: '14px',
      padding: '6px 10px',
      background: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '11px',
      overflowX: 'auto',
      whiteSpace: 'nowrap'
    }}>
      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', padding: '0 4px' }}>Sort</span>
      {(['deadline', 'priority', 'dateAdded'] as const).map(opt => (
        <button
          key={opt}
          onClick={() => setStageSort(opt)}
          style={{
            padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: stageSort === opt ? '600' : '400',
            background: stageSort === opt ? 'var(--bg-color)' : 'transparent',
            color: stageSort === opt ? 'var(--text-primary)' : 'var(--text-tertiary)',
            boxShadow: stageSort === opt ? '0 1px 3px rgba(0,0,0,0.09)' : 'none',
            transition: 'all 0.13s'}}
        >
          {opt === 'deadline' ? 'Deadline' : opt === 'priority' ? 'Priority' : 'Date Added'}
        </button>
      ))}
      <div style={{ width: 1, height: 14, background: 'var(--border-color)', margin: '0 4px', flexShrink: 0 }} />
      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', padding: '0 4px' }}>Filter</span>
      {(['all', 'unpaid', 'paid'] as const).map(opt => (
        <button
          key={opt}
          onClick={() => setStageFilter(opt)}
          style={{
            padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: stageFilter === opt ? '600' : '400',
            background: stageFilter === opt ? 'var(--bg-color)' : 'transparent',
            color: stageFilter === opt
              ? (opt === 'unpaid' ? 'var(--color-danger)' : opt === 'paid' ? 'var(--color-success)' : 'var(--text-primary)')
              : 'var(--text-tertiary)',
            boxShadow: stageFilter === opt ? '0 1px 3px rgba(0,0,0,0.09)' : 'none',
            transition: 'all 0.13s'}}
        >
          {opt === 'all' ? 'All' : opt === 'paid' ? 'Paid' : 'Unpaid'}
        </button>
      ))}
      {isAdmin && (composers.length > 0 || hummingArtists.length > 0) && (
        <>
          <div style={{ width: 1, height: 14, background: 'var(--border-color)', margin: '0 4px', flexShrink: 0 }} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', padding: '0 4px' }}>Worker</span>
          <button
            onClick={() => setWorkerFilter('all')}
            style={{ padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: workerFilter === 'all' ? '600' : '400', background: workerFilter === 'all' ? 'var(--bg-color)' : 'transparent', color: workerFilter === 'all' ? 'var(--text-primary)' : 'var(--text-tertiary)', boxShadow: workerFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.09)' : 'none', transition: 'all 0.13s' }}
          >All</button>
          {[...composers, ...hummingArtists].filter((u, i, arr) => arr.findIndex((x) => (x.uid || x.id) === (u.uid || u.id)) === i).map((u) => {
            const uid = u.uid || u.id || '';
            return (
              <button key={uid}
                onClick={() => setWorkerFilter(workerFilter === uid ? 'all' : uid)}
                style={{ padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: workerFilter === uid ? '600' : '400', background: workerFilter === uid ? 'var(--bg-color)' : 'transparent', color: workerFilter === uid ? 'var(--text-primary)' : 'var(--text-tertiary)', boxShadow: workerFilter === uid ? '0 1px 3px rgba(0,0,0,0.09)' : 'none', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
              >{u.name || u.displayName || 'Worker'}</button>
            );
          })}
        </>
      )}
      <div style={{ flex: 1 }} />
      {stageFilter !== 'all' && (
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', paddingRight: '4px' }}>
          {sortedCount} of {stageTasksCount}
        </span>
      )}
      {isAdmin && showBulkTools && setIsSelectMode && setSelectedTaskIds && exportTasksCSV && (
        <>
          <button
            onClick={() => { setIsSelectMode(v => !v); setSelectedTaskIds(new Set()); }}
            style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${isSelectMode ? '#007AFF40' : 'transparent'}`, cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: isSelectMode ? 'rgba(0,122,255,0.1)' : 'transparent', color: isSelectMode ? 'var(--color-info)' : 'var(--text-tertiary)', transition: 'all 0.13s', flexShrink: 0 }}
          >{isSelectMode ? 'Cancel' : 'Select'}</button>
          <button
            onClick={exportTasksCSV}
            title="Export all projects as CSV"
            style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: 'transparent', color: 'var(--text-tertiary)', transition: 'all 0.13s', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(52,199,89,0.1)'; e.currentTarget.style.color = 'var(--color-success)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          ><Download size={12} /> CSV</button>
        </>
      )}
    </div>
  );
}

export default WorkProcessToolbar;
