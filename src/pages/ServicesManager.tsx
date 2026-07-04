import React, { useState, useMemo, useEffect, useCallback } from 'react';

import { useData } from '../contexts/DataContext';

import { Toast } from '../components/Toast';

import { Plus, Link2, ArrowUpRight, Copy, Check as CheckIcon, Trash2, Search, Edit2, ArrowUp, ArrowDown, Eye, EyeOff, X, Loader2 } from 'lucide-react';

import { toSlug, CAT_META, ICON_LIST, resolveIconCMS, GridSkeleton } from '../components/cms/CMSManagers';

import { motion, AnimatePresence } from 'framer-motion';



type CatKey = keyof typeof CAT_META;

type PackageTier = { name: string; price: string; originalPrice?: string; delivery: string; revisions: string; desc: string; features: string; sampleUrl?: string };

type FormState = { id?: string; category: CatKey; icon: string; coverImage?: string; title: string; slug: string; description: string; desc?: string; from?: any; about: string; features: string; price: string; active: boolean; order: string; metaTitle?: string; metaDesc?: string; packages: { basic: PackageTier; standard: PackageTier; premium: PackageTier } };



const EMPTY_TIER: PackageTier = { name: '', price: '', originalPrice: '', delivery: '', revisions: '', desc: '', features: '', sampleUrl: '' };

const EMPTY_FORM: FormState = {

  category: 'audio', icon: 'Mic', coverImage: '', title: '', slug: '',

  description: '', about: '', features: '', price: '', active: true, order: '', metaTitle: '', metaDesc: '',

  packages: {

    basic: { ...EMPTY_TIER, name: 'Basic' },

    standard: { ...EMPTY_TIER, name: 'Standard' },

    premium: { ...EMPTY_TIER, name: 'Premium' }

  }

};



export function ServicesManager() {

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const fireToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => setToast({ msg, type });

  const { websiteServices, websiteServicesLoading, addWebsiteService, updateWebsiteService, removeWebsiteService } = useData();

  

  // View State

  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);



  // Filters

  const [catTab, setCatTab] = useState<'all' | CatKey>('all');

  const [searchQuery, setSearchQuery] = useState('');



  // Form State

  const [editId, setEditId] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [autoSlug, setAutoSlug] = useState(true);

  const [pkgTab, setPkgTab] = useState<'basic' | 'standard' | 'premium'>('basic');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [initialFormStr, setInitialFormStr] = useState<string>('');

  

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Fix 4: resize state instead of window.innerWidth in render

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  useEffect(() => {

    const onResize = () => setIsMobile(window.innerWidth <= 900);

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);

  }, []);



  const sorted = useMemo(() => [...websiteServices].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)), [websiteServices]);

  

  const filtered = useMemo(() => {

    let result = catTab === 'all' ? sorted : sorted.filter((s: any) => s.category === catTab);

    if (searchQuery.trim()) {

      const q = searchQuery.toLowerCase();

      result = result.filter((s: any) => s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));

    }

    return result;

  }, [sorted, catTab, searchQuery]);



  const availableCats = useMemo(() => {

    const cats = new Set<string>();

    Object.keys(CAT_META).forEach(k => cats.add(k));

    websiteServices.forEach((s: any) => cats.add(s.category || 'audio'));

    return ['all', ...Array.from(cats)];

  }, [websiteServices]);



  const catCounts = useMemo(() => Object.fromEntries(

    availableCats.filter(cat => cat !== 'all').map(cat => [cat, sorted.filter((s: any) => s.category === cat).length])

  ), [sorted, availableCats]);



  // Sync activePreviewId with filtered list (handles tab switch, search, delete)

  useEffect(() => {

    if (isEditing) return;

    if (filtered.length === 0) {

      setActivePreviewId(null);

    } else if (!filtered.some((s: any) => s.id === activePreviewId)) {

      setActivePreviewId(filtered[0].id);

    }

  }, [filtered, isEditing, activePreviewId]);



  const activeService = useMemo(() => {

    if (isEditing) return form;

    return filtered.find((s: any) => s.id === activePreviewId) || filtered[0] || null;

  }, [filtered, activePreviewId, isEditing, form]);



  const handleOpenForm = (item?: any) => {

    setEditId(item?.id || null);

    setAutoSlug(!item);

    const newForm = item ? {

      category: item.category || 'audio',

      icon: item.icon || 'Mic',

      coverImage: item.coverImage || '',

      title: item.title || '',

      slug: item.slug || toSlug(item.title || ''),

      description: item.description || item.desc || '',

      about: item.about || '',

      features: Array.isArray(item.features) ? item.features.join('\n') : (item.features || ''),

      price: String(item.price || item.from || ''),

      active: item.active !== false,

      order: String(item.order || ''),

      packages: (() => {

        const normTier = (tier: any) => tier

          ? { ...tier, features: Array.isArray(tier.features) ? tier.features.join('\n') : (tier.features || ''), sampleUrl: tier.sampleUrl || '' }

          : null;

        const raw = item.packages;

        if (raw?.basic) return {

          basic: normTier(raw.basic) || { name: 'Basic', price: '', originalPrice: '', delivery: '3 Days', revisions: '1', desc: '', features: '', sampleUrl: '' },

          standard: normTier(raw.standard) || { name: 'Standard', price: '', originalPrice: '', delivery: '5 Days', revisions: '3', desc: '', features: '', sampleUrl: '' },

          premium: normTier(raw.premium) || { name: 'Premium', price: '', originalPrice: '', delivery: '7 Days', revisions: 'Unlimited', desc: '', features: '', sampleUrl: '' }

        };

        const f = Array.isArray(item.features) ? item.features.join('\n') : (item.features || '');

        return {

          basic: { name: 'Basic', price: String(item.price || item.from || ''), originalPrice: '', delivery: '3 Days', revisions: '1', desc: 'Basic entry package', features: f, sampleUrl: '' },

          standard: { name: 'Standard', price: '', originalPrice: '', delivery: '5 Days', revisions: '3', desc: 'Standard package', features: '', sampleUrl: '' },

          premium: { name: 'Premium', price: '', originalPrice: '', delivery: '7 Days', revisions: 'Unlimited', desc: 'Premium package', features: '', sampleUrl: '' }

        };

      })()

    } : EMPTY_FORM;

    setForm(newForm);

    setInitialFormStr(JSON.stringify(newForm));

    setPkgTab('basic');

    setIsEditing(true);

  };



  const handleCloseForm = () => {

    if (JSON.stringify(form) !== initialFormStr) {

      if (!window.confirm('You have unsaved changes. Are you sure you want to discard them?')) return;

    }

    setIsEditing(false);

    setEditId(null);

  };



  // Fix 3: unified save handler for both form submit and header button

  const handleSave = useCallback(async (e?: React.FormEvent | React.MouseEvent) => {

    e?.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {

      fireToast('Title and Short Description are required.', 'error');

      return;

    }

    if (!form.coverImage?.trim()) {

      fireToast('Cover Image Filename/URL is required.', 'error');

      return;

    }

    const rawPrice = form.packages?.basic?.price?.toString().replace(/,/g, '') || '';

    if (rawPrice && isNaN(Number(rawPrice))) {

      fireToast('Package Price must be a valid number (e.g. 5000).', 'error');

      return;

    }

    setSaving(true);

    try {

      const catServices = websiteServices.filter((s: any) => s.category === form.category);



      const baseSlug = form.slug.trim() || toSlug(form.title.trim());

      let uniqueSlug = baseSlug;

      let counter = 1;

      while (websiteServices.some((s: any) => s.slug === uniqueSlug && s.id !== editId)) {

        uniqueSlug = `${baseSlug}-${counter}`;

        counter++;

      }



      const derivedPrice = Number(form.price) || Number(form.packages?.basic?.price) || 0;



      // Clean package features — trim whitespace sentinels before saving to Firestore, preserve sampleUrl

      const cleanPackages = Object.fromEntries(

        (['basic', 'standard', 'premium'] as const).map(tier => [

          tier,

          {

            ...form.packages[tier],

            features: (form.packages[tier].features || '').split('\n').map((f: string) => f.trim()).filter(Boolean).join('\n'),

            sampleUrl: (form.packages[tier].sampleUrl || '').trim()

          }

        ])

      );



      const payload = {

        category: form.category, icon: form.icon, coverImage: form.coverImage || '',

        title: form.title.trim(), slug: uniqueSlug,

        description: form.description.trim(),

        about: form.about.trim(),

        features: (form.features || '').split('\n').map(f => f.trim()).filter(Boolean),

        price: derivedPrice,

        active: form.active,

        order: Number(form.order) || catServices.length + 1,

        metaTitle: (form.metaTitle || '').trim(),

        metaDesc: (form.metaDesc || '').trim(),

        packages: cleanPackages

      };

      if (editId) { await updateWebsiteService(editId, payload); fireToast('Service updated!'); }

      else { await addWebsiteService({ ...payload, createdAt: new Date().toISOString() }); fireToast('Service added!'); }

      // bypass dirty-check — data is already saved

      setIsEditing(false);

      setEditId(null);

    } catch { fireToast('Failed to save.', 'error'); }

    finally { setSaving(false); }

  }, [form, editId, websiteServices, addWebsiteService, updateWebsiteService]);



  const copyLink = (item: any) => {

    const slug = item.slug || toSlug(item.title || '');

    const cat  = item.category || 'audio';

    const url = `${window.location.origin}/services/${cat}/${slug}`;

    navigator.clipboard.writeText(url).then(() => {

      setCopiedId(item.id);

      fireToast('Link copied!');

      setTimeout(() => setCopiedId(null), 2200);

    }).catch(() => fireToast('Copy failed.', 'error'));

  };



  const handleDelete = async (id: string) => {

    try {

      await removeWebsiteService(id);

      fireToast('Service deleted.');

      setConfirmDeleteId(null);

      if (activePreviewId === id) setActivePreviewId(null);

    } catch {

      fireToast('Failed to delete.', 'error');

      setConfirmDeleteId(null);

    }

  };



  const handleToggleActive = async (item: any) => {

    if (togglingId) return;

    setTogglingId(item.id);

    try {

      await updateWebsiteService(item.id, { active: item.active === false });

      fireToast(item.active === false ? 'Service is now visible.' : 'Service hidden.', 'info');

    }

    catch { fireToast('Failed to update.', 'error'); }

    finally { setTogglingId(null); }

  };



  const handleReorder = async (item: any, dir: 'up' | 'down') => {

    if (reorderingId) return;

    const catList = [...websiteServices]

      .filter((s: any) => s.category === item.category)

      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    const idx = catList.findIndex((s: any) => s.id === item.id);

    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;

    if (swapIdx < 0 || swapIdx >= catList.length) return;

    setReorderingId(item.id);

    try {

      const updatedList = [...catList];

      [updatedList[idx], updatedList[swapIdx]] = [updatedList[swapIdx], updatedList[idx]];

      await updateWebsiteService(updatedList[idx].id, { order: idx + 1 });

      await updateWebsiteService(updatedList[swapIdx].id, { order: swapIdx + 1 });

    } catch { fireToast('Reorder failed.', 'error'); }

    finally { setReorderingId(null); }

  };



  const handleDuplicate = (item: any) => {

    const duplicatedItem = {

      ...item,

      id: undefined, // ensure it's treated as a new item

      title: `${item.title} (Copy)`,

      slug: `${item.slug || toSlug(item.title)}-copy`,

      active: false, // Default duplicated items to hidden

    };

    handleOpenForm(duplicatedItem);

    fireToast('Service duplicated! Please save to confirm.', 'info');

  };



  // ─────────────────────────────────────────────────────────────────────────────

  // RENDER LEFT PANEL: LIST VIEW

  // ─────────────────────────────────────────────────────────────────────────────

  const renderListView = () => (

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



  // ─────────────────────────────────────────────────────────────────────────────

  // RENDER RIGHT PANEL: FORM VIEW

  // ─────────────────────────────────────────────────────────────────────────────

  const renderFormView = () => (

    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-1)', borderRadius: 24, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card-bg)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          <button onClick={handleCloseForm} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>

            <X size={18} />

          </button>

          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{editId ? 'Edit Service' : 'Add New Service'}</h2>

        </div>

        <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 100, background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>

          {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Service'}

        </button>

      </div>



      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', background: 'var(--surface-1)' }}>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680}}>

          

          {/* SECTION: Basic Info */}

          <div style={{ background: 'var(--card-bg)', borderRadius: 24, padding: '32px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>

            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>

              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-info)', boxShadow: 'none' }} /> Basic Information

            </h3>

            

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Service Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>

                <input type="text" className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: autoSlug ? toSlug(e.target.value) : f.slug }))} required style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. Premium Nasheed Mix" />

              </div>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Starting Price (৳)</label>

                <input type="number" className="form-input" value={form.price} min="0" onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 5000" />

              </div>

            </div>



            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Category <span style={{ color: 'var(--color-danger)' }}>*</span></label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>

                  {(Object.entries(CAT_META) as [CatKey, typeof CAT_META.audio][]).map(([key, meta]) => {

                    const on = form.category === key;

                    return (

                      <button key={key} type="button" onClick={() => setForm(f => ({ ...f, category: key }))}

                        style={{ padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: on ? 800 : 600, transition: 'all 0.2s', border: `1px solid ${on ? 'var(--text-primary)' : 'var(--border-color)'}`, background: on ? 'var(--text-primary)' : 'var(--surface-1)', color: on ? 'var(--bg-color)' : 'var(--text-secondary)' }}>

                        {meta.label}

                      </button>

                    );

                  })}

                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>

                <div>

                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Cover Image (Filename/URL)</label>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

                    <input 

                      type="text" 

                      className="form-input" 

                      value={form.coverImage || ''} 

                      onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} 

                      style={{ flex: 1, boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} 

                      placeholder="e.g. /my-cover.jpg" 

                    />

                    {form.coverImage && (

                      <div style={{ width: 80, height: 50, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>

                        <img src={form.coverImage} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} />

                      </div>

                    )}

                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>Type the filename (e.g. <strong style={{ color: 'var(--text-primary)' }}>/cover.jpg</strong>) after putting it in the public folder.</div>

                </div>

              </div>

            </div>



            <div style={{ marginBottom: 0 }}>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Service Icon</label>

              <div style={{ flex: 1, minWidth: 0, paddingBottom: 8, overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>

                {ICON_LIST.map(({ key, emoji }) => {

                  const on = form.icon === key;

                  return (

                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, icon: key }))} title={key}

                      style={{ width: 44, height: 44, borderRadius: 12, background: on ? 'var(--text-primary)' : 'var(--surface-1)', color: on ? 'var(--bg-color)' : 'var(--text-secondary)', border: `1px solid ${on ? 'var(--text-primary)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', boxShadow: on ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}>

                      {emoji}

                    </button>

                  );

                })}

              </div>

            </div>

          </div>



          {/* SECTION: Details */}

          <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '28px 32px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>

            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>

              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-purple)', boxShadow: 'none' }} /> Service Details

            </h3>

            <div style={{ marginBottom: 16 }}>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Short Description <span style={{ color: 'var(--color-danger)' }}>*</span></label>

              <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} required style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', transition: 'border-color 0.2s' }} placeholder="Describe what this service includes..." />

            </div>

            <div style={{ marginBottom: 16 }}>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Service Features (Bullet Points)</label>

              <textarea 

                className="form-input" 

                value={form.features} 

                onChange={e => {

                  let val = e.target.value;

                  val = val.replace(/^[\s\u200B]*[•\-*]\s+/gm, '');

                  val = val.replace(/^[\s\u200B]*[0-9]+\.\s+/gm, '');

                  setForm(f => ({ ...f, features: val }));

                }}

                rows={4} 

                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', transition: 'border-color 0.2s' }} 

                placeholder="Industry-standard delivery&#10;High quality stems&#10;24/7 Support" 

              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>

                {(() => {

                  const cat = form.category;

                  const presets = ['audio', 'vocal', 'nasheed'].includes(cat) ? ["High-Quality WAV", "Commercial Use", "Industry-Standard Mixing", "Vocal Tuning", "Source Stems Included", "Unlimited Revisions"]

                    : ['video', 'lyric', 'podcast'].includes(cat) ? ["1080p / 4K Export", "Commercial Rights", "Custom Animations", "Background Music", "Sound Effects (SFX)", "Unlimited Revisions"]

                    : ["High-Res Export", "Source Files Included", "Commercial Use", "Custom Typography", "Unlimited Revisions", "Fast Delivery"];

                  return presets.map(p => (

                    <button type="button" key={p} onClick={() => { if (!form.features.includes(p)) setForm(f => ({ ...f, features: (f.features ? f.features.trim() + '\n' : '') + p })); }}

                      style={{ padding: '4px 10px', borderRadius: 100, background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}

                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--text-primary)'; e.currentTarget.style.color = 'var(--bg-color)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}

                    >+ {p}</button>

                  ));

                })()}

              </div>

              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>

                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckIcon size={8} color="var(--text-primary)" strokeWidth={3} /></div>

                Write each feature on a new line. Bullets/numbers are auto-removed on paste!

              </div>

            </div>

            <div>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>About (Details Page)</label>

              <textarea className="form-input" value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} rows={6} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.7, outline: 'none', transition: 'border-color 0.2s' }} placeholder="Write a detailed explanation of your service. Press Enter for new paragraphs." />

            </div>

          </div>



          {/* SECTION: Packages */}

          <div style={{ background: 'var(--card-bg)', borderRadius: 24, padding: '32px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>

            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>

              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-warning)', boxShadow: 'none' }} /> Pricing & Packages

            </h3>

            

            <div style={{ display: 'flex', padding: 6, background: 'var(--surface-1)', borderRadius: 16, marginBottom: 24, border: '1px solid var(--border-color)' }}>

              {(['basic', 'standard', 'premium'] as const).map((tab) => {

                const active = pkgTab === tab;

                return (

                  <button key={tab} type="button" onClick={() => setPkgTab(tab)}

                    style={{ flex: 1, padding: '12px 0', border: 'none', background: active ? 'var(--text-primary)' : 'transparent', color: active ? 'var(--bg-color)' : 'var(--text-secondary)', fontSize: 14, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize', borderRadius: 12, transition: 'all 0.2s', boxShadow: active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}>

                    {tab}

                  </button>

                );

              })}

            </div>

            

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>

              <div style={{ gridColumn: '1 / -1' }}>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Package Name</label>

                <input type="text" className="form-input" value={form.packages[pkgTab].name} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], name: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. Basic Mixing" />

              </div>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Price (৳)</label>

                <input type="number" className="form-input" value={form.packages[pkgTab].price} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], price: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 2000" />

              </div>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Original Price (৳) <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>- optional</span></label>

                <input type="number" className="form-input" value={form.packages[pkgTab].originalPrice || ''} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], originalPrice: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 3000" />

              </div>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Delivery Time</label>

                <div style={{ display: 'flex', gap: 8 }}>

                  <input type="number" className="form-input" value={form.packages[pkgTab].delivery.replace(/[^\d]/g, '')} onChange={e => { const isHour = form.packages[pkgTab].delivery.toLowerCase().includes('hour'); const val = e.target.value; const unit = isHour ? (val === '1' ? 'Hour' : 'Hours') : (val === '1' ? 'Day' : 'Days'); setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], delivery: `${val} ${unit}`.trim() } } })); }} style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 3" min="0" />

                  <select value={form.packages[pkgTab].delivery.toLowerCase().includes('hour') ? 'Hours' : 'Days'} onChange={e => { const num = form.packages[pkgTab].delivery.replace(/[^\d]/g, '') || ''; const unit = e.target.value === 'Hours' ? (num === '1' ? 'Hour' : 'Hours') : (num === '1' ? 'Day' : 'Days'); setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], delivery: `${num} ${unit}`.trim() } } })); }} style={{ width: 110, boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>

                    <option value="Days">Days</option>

                    <option value="Hours">Hours</option>

                  </select>

                </div>

              </div>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Revisions</label>

                <input type="text" className="form-input" value={form.packages[pkgTab].revisions} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], revisions: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 1" />

              </div>

            </div>

            

            <div style={{ marginBottom: 20 }}>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Short Description</label>

              <input type="text" className="form-input" value={form.packages[pkgTab].desc} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], desc: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="Short description of this tier..." />

            </div>

            <div style={{ marginBottom: 20 }}>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Sample Video / Playlist URL <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>- Optional</span></label>

              <input type="text" className="form-input" value={form.packages[pkgTab].sampleUrl || ''} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], sampleUrl: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. https://youtube.com/playlist?list=..." />

            </div>

                <div style={{ marginBottom: 16 }}>

                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Package Features</label>

                  <textarea 

                    className="form-input" 

                    value={form.packages[pkgTab].features} 

                    onChange={e => {

                      let val = e.target.value;

                      val = val.replace(/^[\s\u200B]*[•\-*]\s+/gm, '');

                      val = val.replace(/^[\s\u200B]*[0-9]+\.\s+/gm, '');

                      setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], features: val } } }));

                    }}

                    rows={5} 

                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', transition: 'border-color 0.2s' }} 

                    placeholder="Source Files Included&#10;Commercial Use&#10;High Resolution" 

                  />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>

                    {["Source Files Included", "Commercial Use", "Priority Support", "Custom Branding", "Unlimited Revisions", "1 Day Delivery"].map(p => (

                      <button type="button" key={p} onClick={() => { if (!form.packages[pkgTab].features.includes(p)) setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], features: (f.packages[pkgTab].features ? f.packages[pkgTab].features.trim() + '\n' : '') + p } } })); }}

                        style={{ padding: '4px 10px', borderRadius: 100, background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}

                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--text-primary)'; e.currentTarget.style.color = 'var(--bg-color)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}

                      >+ {p}</button>

                    ))}

                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>

                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckIcon size={8} color="var(--text-primary)" strokeWidth={3} /></div>

                    Write each feature on a new line. Bullets/numbers are auto-removed on paste!

                  </div>

                </div>

              </div>



          {/* SECTION: Settings */}

          <div style={{ background: 'var(--card-bg)', borderRadius: 24, padding: '32px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>

            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>

              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)', boxShadow: 'none' }} /> Visibility & SEO

            </h3>

            

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Meta Title (SEO) <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>- Optional</span></label>

                <input type="text" className="form-input" value={form.metaTitle || ''} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))} placeholder={form.title ? `${form.title} | Tanvir Studio` : 'Best Audio Services...'} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} />

              </div>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Meta Description (SEO) <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>- Optional</span></label>

                <input type="text" className="form-input" value={form.metaDesc || ''} onChange={e => setForm(f => ({ ...f, metaDesc: e.target.value }))} placeholder="Short snippet for Google search results..." style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} />

              </div>

            </div>



            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>URL Slug</label>

                <input type="text" className="form-input" value={form.slug} onChange={e => { setAutoSlug(false); setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })); }} placeholder={toSlug(form.title || 'auto-generated')} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 14, padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />

              </div>

              <div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Display Order</label>

                <input type="number" className="form-input" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} min="1" style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }} placeholder="Auto" />

              </div>

            </div>

            

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderRadius: 16, background: 'var(--surface-1)', border: '1px solid var(--border-color)' }}>

              <div>

                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Visible on site</div>

                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Show this service to visitors</div>

              </div>

              <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: form.active ? 'var(--color-success)' : 'var(--border-color)', transition: 'background 0.2s', padding: 0, flexShrink: 0 }}>

                <span style={{ position: 'absolute', top: 2, left: form.active ? 24 : 2, width: 22, height: 22, borderRadius: '50%', background: 'var(--card-bg)', transition: 'left 0.2s', boxShadow: 'none' }} />

              </button>

            </div>

          </div>

          

          <div style={{ paddingBottom: 40 }} />

        </form>

      </div>

    </div>

  );



  // ─────────────────────────────────────────────────────────────────────────────

  // RENDER RIGHT PANEL: PREVIEW

  // ─────────────────────────────────────────────────────────────────────────────

  const renderPreview = () => {

    if (!activeService) return (

      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: 24 }}>

        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>

          <Search size={32} style={{ marginBottom: 12, opacity: 0.5 }} />

          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Select a service to preview</p>

        </div>

      </div>

    );



    const prevMeta = CAT_META[activeService.category as CatKey] ?? CAT_META.audio;

    const PrevIcon = resolveIconCMS(activeService.icon || '');

    // Determine which package to preview. For forms, use pkgTab. For list view, preview basic or what's available.

    const previewPkgTab = isEditing ? pkgTab : 'basic';

    const activePackages = activeService.packages || { basic: { name: 'Basic', price: activeService.price || 0, desc: '', features: activeService.features || '' } };

    const currentPkg = activePackages[previewPkgTab] || activePackages.basic || {};

    

    const featuresRaw = typeof currentPkg.features === 'string' ? currentPkg.features : '';

    const tierFeatures = featuresRaw.split('\n').map((f: string) => f.trim()).filter(Boolean);



    return (

      <div style={{ position: 'sticky', top: 24, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingLeft: 8 }}>

          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', boxShadow: 'none' }} />

          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Live Preview</div>

        </div>



        <motion.div 

          key={(activeService.id || 'form') + '-' + (isEditing ? pkgTab : 'list')}

          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}

          style={{ flex: 1, borderRadius: 24, overflow: 'hidden', border: `1px solid var(--border-color)`, boxShadow: 'none', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}

        >

          <div style={{ height: 3, background: `var(--border-color)` }} />

          

          <div style={{ padding: '32px 28px', flex: 1, overflowY: 'auto' }}>

            {/* Header */}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>

              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--surface-1)', border: `1px solid var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>

                <PrevIcon size={32} color="var(--text-primary)" strokeWidth={1.5} />

              </div>

              <div style={{ paddingTop: 4 }}>

                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{prevMeta.label}</div>

                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>{activeService.title || 'Untitled Service'}</h1>

              </div>

            </div>



            {/* Description */}

            <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: activeService.about ? 16 : 32 }}>

                            {(activeService.description || activeService.desc || 'Enter a short description to see it here.').split('\n').map((p: string, i: number) => (

                p.trim() ? <p key={i} style={{ margin: '0 0 12px' }}>{p}</p> : <div key={i} style={{ height: 8 }} />

              ))}

            </div>



            {activeService.about && (

              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32, padding: 24, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border-color)' }}>

                <strong style={{ display: 'block', marginBottom: 12, color: 'var(--text-primary)', fontSize: 16 }}>About This Gig:</strong>

                {activeService.about.split('\n').map((p: string, i: number) => (

                  p.trim() ? <p key={i} style={{ margin: '0 0 12px' }}>{p}</p> : <div key={i} style={{ height: 8 }} />

                ))}

              </div>

            )}



            {/* Package Card */}

            <div style={{ borderRadius: 16, background: 'var(--surface-1)', border: '1px solid var(--border-color)', padding: 20 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>

                <div>

                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{currentPkg.name || 'Basic Package'}</div>

                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{currentPkg.delivery || '3 Days'} Delivery · {currentPkg.revisions || '1'} Revision</div>

                </div>

                <div style={{ textAlign: 'right' }}>

                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em', display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>

                    {currentPkg.originalPrice && Number(currentPkg.originalPrice) > Number(currentPkg.price) && (

                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>৳{Number(currentPkg.originalPrice).toLocaleString()}</span>

                    )}

                    <span>৳{currentPkg.price ? Number(currentPkg.price).toLocaleString() : (activeService.price || activeService.from || '0').toLocaleString()}</span>

                                    </div>

                </div>

              </div>



              {(currentPkg.desc || currentPkg.sampleUrl) && (

                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, paddingBottom: 16, borderBottom: '1px dashed var(--border-color)' }}>

                  {currentPkg.desc && <div style={{ marginBottom: currentPkg.sampleUrl ? 12 : 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{currentPkg.desc}</div>}

                  {currentPkg.sampleUrl && (

                    <a href={currentPkg.sampleUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#FF0000', textDecoration: 'none', background: 'rgba(255,0,0,0.1)', padding: '6px 12px', borderRadius: 100, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,0,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,0,0,0.1)'}>

                      ▶ See Sample

                    </a>

                  )}

                </div>

              )}



              {tierFeatures.length > 0 && (

                <div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>What's Included</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                    {tierFeatures.map((f: string, i: number) => (

                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>

                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-2)', border: `1px solid var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>

                          <CheckIcon size={10} color="var(--text-primary)" strokeWidth={2.5} />

                        </div>

                        <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{f}</span>

                      </div>

                    ))}

                  </div>

                </div>

              )}

            </div>

            

            {/* Action Button */}

            <div style={{ marginTop: 24 }}>

              <button style={{ width: '100%', padding: '16px', borderRadius: 14, background: 'var(--text-primary)', color: 'var(--bg-color)', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'not-allowed', opacity: 0.9 }}>

                Continue (৳{currentPkg.price || activeService.price || 0})

              </button>

            </div>

          </div>

          

          <div style={{ padding: '12px 20px', background: 'var(--surface-1)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>/services/{activeService.category}/{activeService.slug || toSlug(activeService.title || '—')}</span>

            {(() => {

              const resolvedSlug = activeService.slug || toSlug(activeService.title || '');

              const hasSlug = Boolean(resolvedSlug);

              return (

                <div style={{ display: 'flex', gap: 6 }}>

                  <button onClick={() => hasSlug && copyLink({ ...activeService, slug: resolvedSlug })} disabled={!hasSlug} style={{ padding: '6px 12px', borderRadius: 100, background: 'var(--card-bg)', border: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: hasSlug ? 'var(--text-secondary)' : 'var(--text-tertiary)', cursor: hasSlug ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, opacity: hasSlug ? 1 : 0.4 }}>

                    <Link2 size={12} /> {copiedId === activeService.id ? 'Copied' : 'Copy'}

                                    </button>

                  <a href={hasSlug ? `/services/${activeService.category || 'audio'}/${resolvedSlug}` : undefined} target="_blank" rel="noreferrer"

                    onClick={e => { if (!hasSlug) e.preventDefault(); }}

                    style={{ padding: '6px 12px', borderRadius: 100, background: 'var(--card-bg)', border: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: hasSlug ? 'var(--text-secondary)' : 'var(--text-tertiary)', cursor: hasSlug ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', opacity: hasSlug ? 1 : 0.4 }}>

                    View <ArrowUpRight size={12} />

                  </a>

                </div>

              );

            })()}

          </div>

        </motion.div>

      </div>

    );

  };



  // ─────────────────────────────────────────────────────────────────────────────

  // MAIN RENDER

  // ─────────────────────────────────────────────────────────────────────────────

  return (

    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <style>{`

        .sm-split-layout { display: grid; grid-template-columns: minmax(400px, 1.2fr) minmax(360px, 1fr); gap: 32px; flex: 1; align-items: start; }

        @media (max-width: 900px) { .sm-split-layout { display: flex; flex-direction: column; gap: 24px; } }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      `}</style>

      

      {/* Top Navigation / Header */}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>

        <div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Services Studio</h1>

          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Create and manage your service offerings with live preview.</p>

        </div>

      </div>



      {/* Main Split Layout */}

      <div className="sm-split-layout">

        

        {/* Left Column: Form or List */}

        <div style={{ position: 'relative', height: 'calc(100vh - 120px)', minHeight: 600, width: '100%' }}>

          <AnimatePresence mode="wait">

            <motion.div key={isEditing ? 'form' : 'list'} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} style={{ position: 'absolute', inset: 0 }}>

              {isEditing ? renderFormView() : renderListView()}

            </motion.div>

          </AnimatePresence>

        </div>



        {/* Right Column: Preview (Hidden on mobile) */}

        {!isMobile && (

          <div style={{ position: 'relative', height: 'calc(100vh - 120px)', minHeight: 600, width: '100%' }}>

            <div style={{ position: 'absolute', inset: 0 }}>

              {renderPreview()}

            </div>

          </div>

        )}

        

      </div>



      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

    </div>

  );

}

