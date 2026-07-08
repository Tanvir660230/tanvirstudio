import { Plus, Search, ArrowUp, ArrowDown, Eye, EyeOff, Copy, Edit2, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { CAT_META, resolveIconCMS, GridSkeleton } from '../cms/CMSManagers';
import type { CatKey } from '../../pages/ServicesManager';

interface ServiceCatalogListProps {
  websiteServicesLoading: boolean;
  filtered: any[];
  sorted: any[];
  availableCats: string[];
  catCounts: Record<string, number>;
  catTab: 'all' | CatKey;
  setCatTab: (cat: 'all' | CatKey) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  activePreviewId: string | null;
  setActivePreviewId: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  togglingId: string | null;
  reorderingId: string | null;
  handleOpenForm: (item?: any) => void;
  handleReorder: (item: any, dir: 'up' | 'down') => void;
  handleToggleActive: (item: any) => void;
  handleDuplicate: (item: any) => void;
  handleDelete: (id: string) => void;
}

export function ServiceCatalogList({
  websiteServicesLoading, filtered, sorted, availableCats, catCounts,
  catTab, setCatTab, searchQuery, setSearchQuery,
  activePreviewId, setActivePreviewId, confirmDeleteId, setConfirmDeleteId,
  togglingId, reorderingId,
  handleOpenForm, handleReorder, handleToggleActive, handleDuplicate, handleDelete
}: ServiceCatalogListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', overflow: 'hidden' }}
    >
      <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Services</h2>
          <button onClick={() => handleOpenForm()} style={{ padding: '8px 16px', borderRadius: 100, background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, transition: 'transform 0.15s, filter 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
            <Plus size={16} /> Add New
          </button>
        </div>

        {/* Search & Tabs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Search services..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 38px', borderRadius: 100, border: '1px solid var(--border-color)', background: 'var(--surface-1)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {availableCats.map(cat => {
            const meta = cat !== 'all' ? (CAT_META[cat as CatKey] || CAT_META.audio) : null;
            const label = cat !== 'all' ? (meta?.label || cat.charAt(0).toUpperCase() + cat.slice(1)) : 'All';
            const isActive = catTab === cat;
            const count = cat === 'all' ? sorted.length : (catCounts[cat] || 0);
            return (
              <button key={cat} onClick={() => setCatTab(cat as CatKey | 'all')}
                style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 100, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                  border: `1px solid ${isActive ? 'var(--text-primary)' : 'var(--border-color)'}`,
                  background: isActive ? 'var(--text-primary)' : 'transparent',
                  color: isActive ? 'var(--bg-color)' : 'var(--text-secondary)'}}>
                {label} <span style={{ fontSize: 10, opacity: isActive ? 0.8 : 0.5 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {websiteServicesLoading ? <GridSkeleton height={120} />
          : filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No services found</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Try adjusting your search or add a new one.</div>
            </div>
          ) : (
            filtered.map((item: any) => {
              const catList = sorted.filter((s: any) => s.category === item.category);
              const catIdx = catList.findIndex((s: any) => s.id === item.id);
              const isActive = item.id === activePreviewId;
              const isLive = item.active !== false;
              const ItemIcon = resolveIconCMS(item.icon);
              return (
                <div key={item.id}
                  onClick={() => setActivePreviewId(item.id)}
                  style={{
                    padding: 16, borderRadius: 16, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${isActive ? 'var(--text-tertiary)' : 'transparent'}`,
                    background: isActive ? 'var(--surface-2)' : 'var(--surface-1)', position: 'relative',
                    display: 'flex', gap: 16, alignItems: 'center'
                  }}
                  onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = 'var(--surface-1)'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--card-bg)', border: `1px solid var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ItemIcon size={20} color="var(--text-primary)" strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      {!isLive && <span style={{ padding: '2px 6px', borderRadius: 6, background: 'rgba(142,142,147,0.1)', color: 'var(--text-tertiary)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>Hidden</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description || item.desc}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>৳{(item.price || item.from || 0).toLocaleString()}</div>
                    <div style={{ display: 'flex', background: 'var(--card-bg)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'none' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleReorder(item, 'up')} disabled={catIdx === 0 || !!reorderingId} title="Move Up" style={{ width: 32, height: 32, border: 'none', borderRight: '1px solid var(--border-color)', background: 'transparent', color: (catIdx === 0 || reorderingId) ? 'var(--border-color)' : 'var(--text-secondary)', cursor: (catIdx === 0 || reorderingId) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => { if(catIdx !== 0 && !reorderingId) e.currentTarget.style.background = 'var(--surface-2)'; }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><ArrowUp size={14} /></button>
                      <button onClick={() => handleReorder(item, 'down')} disabled={catIdx === catList.length - 1 || !!reorderingId} title="Move Down" style={{ width: 32, height: 32, border: 'none', borderRight: '1px solid var(--border-color)', background: 'transparent', color: (catIdx === catList.length - 1 || reorderingId) ? 'var(--border-color)' : 'var(--text-secondary)', cursor: (catIdx === catList.length - 1 || reorderingId) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => { if(catIdx !== catList.length - 1 && !reorderingId) e.currentTarget.style.background = 'var(--surface-2)'; }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><ArrowDown size={14} /></button>
                      <button onClick={() => handleToggleActive(item)} disabled={!!togglingId} title={isLive ? 'Hide Service' : 'Show Service'} style={{ width: 32, height: 32, border: 'none', borderRight: '1px solid var(--border-color)', background: 'transparent', color: togglingId === item.id ? 'var(--text-tertiary)' : isLive ? 'var(--text-secondary)' : 'var(--color-warning)', cursor: togglingId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => { if(!togglingId) e.currentTarget.style.background = 'var(--surface-2)'; }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {togglingId === item.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : isLive ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button onClick={() => handleDuplicate(item)} title="Duplicate Service" style={{ width: 32, height: 32, border: 'none', borderRight: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Copy size={14} /></button>
                      <button onClick={() => handleOpenForm(item)} title="Edit" style={{ width: 32, height: 32, border: 'none', borderRight: '1px solid var(--border-color)', background: 'transparent', color: 'var(--accent-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,122,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Edit2 size={14} /></button>
                      <button onClick={() => setConfirmDeleteId(item.id)} title="Delete" style={{ width: 32, height: 32, border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {confirmDeleteId === item.id && (
                    <div style={{ position: 'absolute', inset: 0, background: 'var(--card-bg)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Delete {item.title}?</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleDelete(item.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--color-danger)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
      </div>
    </motion.div>
  );
}
