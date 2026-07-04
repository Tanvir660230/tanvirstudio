/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { storage } from '../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Edit2, Trash2, Image, Headphones, MessageSquare, Package, Wrench, HelpCircle, Upload, X, ImageIcon, BookOpen, Rss, Clock, Cpu, Copy, Check as CheckIcon, Link2, Mic, Sliders, Music2, Video, Film, Monitor, Scissors, Palette, FileText, Zap, Layers, Code2, ArrowUpRight } from 'lucide-react';
import { Spinner } from '../components/Spinner';
import { Toast } from '../components/Toast';
import {
  HeroBgManager, ShowcaseManager, ComparisonsManager, TestimonialsManager,
  PackagesManager, FaqsManager, CaseStudiesManager, BlogManager, TimelineManager, GearManager, TabButton
} from '../components/cms/CMSManagers';


type FireToast = (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

// ─── Root ─────────────────────────────────────────────────────────────────────
export function WebsiteCMS({ defaultTab = 'hero', standalone = false }: { defaultTab?: 'hero' | 'showcase' | 'comparisons' | 'testimonials' | 'packages' | 'services' | 'faqs' | 'case-studies' | 'blog' | 'timeline' | 'gear', standalone?: boolean }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const fireToast: FireToast = (msg, type = 'success') => setToast({ msg, type });

  const TABS = [
    { key: 'hero'         as const, label: 'Hero Background', icon: <ImageIcon size={16} /> },
    { key: 'showcase'     as const, label: 'Audio Showcase',  icon: <Image size={16} /> },
    { key: 'comparisons'  as const, label: 'Before vs After', icon: <Headphones size={16} /> },
    { key: 'testimonials' as const, label: 'Testimonials',    icon: <MessageSquare size={16} /> },
    { key: 'packages'     as const, label: 'Packages',        icon: <Package size={16} /> },
    { key: 'faqs'         as const, label: 'FAQs',            icon: <HelpCircle size={16} /> },
    { key: 'case-studies' as const, label: 'Case Studies',    icon: <BookOpen size={16} /> },
    { key: 'blog'         as const, label: 'Blog Posts',      icon: <Rss size={16} /> },
    { key: 'timeline'     as const, label: 'Timeline',         icon: <Clock size={16} /> },
    { key: 'gear'         as const, label: 'Studio Gear',      icon: <Cpu size={16} /> },
  ];

  return (
    <div style={{ padding: '24px clamp(20px, 4vw, 40px)', minHeight: '100vh' }}>
      {!standalone ? (
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Website CMS</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Manage all content displayed on your public website — homepage, FAQ page, and case studies.</p>
        </div>
      ) : (
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Standalone Manager</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Manage independent features here.</p>
        </div>
      )}

      {!standalone && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          {TABS.map(tab => (
            <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} icon={tab.icon}>
              {tab.label}
            </TabButton>
          ))}
        </div>
      )}

      <div>
        {activeTab === 'hero'         && <HeroBgManager       fireToast={fireToast} />}
        {activeTab === 'showcase'     && <ShowcaseManager     fireToast={fireToast} />}
        {activeTab === 'comparisons'  && <ComparisonsManager  fireToast={fireToast} />}
        {activeTab === 'testimonials' && <TestimonialsManager fireToast={fireToast} />}
        {activeTab === 'packages'     && <PackagesManager     fireToast={fireToast} />}
        {activeTab === 'faqs'         && <FaqsManager         fireToast={fireToast} />}
        {activeTab === 'case-studies' && <CaseStudiesManager  fireToast={fireToast} />}
        {activeTab === 'blog'         && <BlogManager         fireToast={fireToast} />}
        {activeTab === 'timeline'     && <TimelineManager     fireToast={fireToast} />}
        {activeTab === 'gear'         && <GearManager         fireToast={fireToast} />}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

