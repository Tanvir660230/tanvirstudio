import { Search, Check as CheckIcon, Link2, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toSlug, CAT_META, resolveIconCMS } from '../cms/CMSManagers';
import type { CatKey, PkgTabKey } from '../../pages/ServicesManager';

interface ServicePreviewProps {
  activeService: any;
  isEditing: boolean;
  pkgTab: PkgTabKey;
  copiedId: string | null;
  copyLink: (item: any) => void;
}

export function ServicePreview({ activeService, isEditing, pkgTab, copiedId, copyLink }: ServicePreviewProps) {
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
}
