import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Toast } from '../components/Toast';
import { toSlug, CAT_META } from '../components/cms/CMSManagers';
import { AnimatePresence, motion } from 'framer-motion';
import { PackageEditor } from '../components/services/PackageEditor';
import { ServicePreview } from '../components/services/ServicePreview';
import { ServiceCatalogList } from '../components/services/ServiceCatalogList';

export type CatKey = keyof typeof CAT_META;

export type PkgTabKey = 'basic' | 'standard' | 'premium';

export type PackageTier = { name: string; price: string; originalPrice?: string; delivery: string; revisions: string; desc: string; features: string; sampleUrl?: string };

export type FormState = { id?: string; category: CatKey; icon: string; coverImage?: string; title: string; slug: string; description: string; desc?: string; from?: any; about: string; features: string; price: string; active: boolean; order: string; metaTitle?: string; metaDesc?: string; packages: { basic: PackageTier; standard: PackageTier; premium: PackageTier } };

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
  const [pkgTab, setPkgTab] = useState<PkgTabKey>('basic');
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div style={{ position: 'relative', height: isMobile ? 'calc(100vh - var(--shell-content-top, 92px) - 64px - env(safe-area-inset-bottom))' : 'calc(100vh - 120px)', minHeight: isMobile ? 400 : 600, width: '100%' }}>
          <AnimatePresence mode="wait">
            <motion.div key={isEditing ? 'form' : 'list'} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} style={{ position: 'absolute', inset: 0 }}>
              {isEditing ? (
                <PackageEditor
                  form={form} setForm={setForm} editId={editId}
                  autoSlug={autoSlug} setAutoSlug={setAutoSlug}
                  pkgTab={pkgTab} setPkgTab={setPkgTab}
                  saving={saving} handleSave={handleSave} handleCloseForm={handleCloseForm}
                />
              ) : (
                <ServiceCatalogList
                  websiteServicesLoading={websiteServicesLoading}
                  filtered={filtered} sorted={sorted}
                  availableCats={availableCats} catCounts={catCounts}
                  catTab={catTab} setCatTab={setCatTab}
                  searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                  activePreviewId={activePreviewId} setActivePreviewId={setActivePreviewId}
                  confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId}
                  togglingId={togglingId} reorderingId={reorderingId}
                  handleOpenForm={handleOpenForm} handleReorder={handleReorder}
                  handleToggleActive={handleToggleActive} handleDuplicate={handleDuplicate}
                  handleDelete={handleDelete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Column: Preview (Hidden on mobile) */}
        {!isMobile && (
          <div style={{ position: 'relative', height: isMobile ? 'calc(100vh - var(--shell-content-top, 92px) - 64px - env(safe-area-inset-bottom))' : 'calc(100vh - 120px)', minHeight: isMobile ? 400 : 600, width: '100%' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <ServicePreview activeService={activeService} isEditing={isEditing} pkgTab={pkgTab} copiedId={copiedId} copyLink={copyLink} />
            </div>
          </div>
        )}

      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
