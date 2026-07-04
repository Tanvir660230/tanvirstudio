import { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { SEO } from '../components/SEO';
import { Mail } from 'lucide-react';

export function Terms() {
  const { settings } = useSettings();
  const email = settings.studioEmail || '';
  const name  = settings.studioName  || 'Tanvir Studio';
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const font  = "var(--font-sans)";

  const sections = [
    { title: '1. Agreement to Terms', body: "By accessing our website, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws." },
    { title: '2. Use License', body: `Permission is granted to temporarily download one copy of the materials (information or software) on ${name}'s website for personal, non-commercial transitory viewing only.` },
    { title: '3. Disclaimer', body: `The materials on ${name}'s website are provided on an 'as is' basis. ${name} makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.` },
    { title: '4. Limitations', body: `In no event shall ${name} or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ${name}'s website.` },
    { title: '5. Governing Law', body: "These terms and conditions are governed by and construed in accordance with the laws of Bangladesh and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location." },
  ];

  return (
    <div style={{ paddingBottom: '80px', fontFamily: font }}>
      <SEO title="Terms & Conditions | Tanvir Studio" description="Read the terms and conditions for using Tanvir Studio's services and website." url="https://tanvir.studio/terms" />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '120px 24px 80px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>Legal</p>
        <h1 className="apple-h1" style={{ margin: '0 0 12px' }}>Terms & Conditions</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 56 }}>Last updated: April 17, 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sections.map(({ title, body }) => (
            <div key={title} className="bento-item" style={{ padding: '28px 32px' }}>
              <h2 className="apple-h2" style={{ margin: '0 0 12px' }}>{title}</h2>
              <p className="apple-subtitle" style={{ margin: 0 }}>{body}</p>
            </div>
          ))}

          {/* Contact — with clickable email */}
          <div className="bento-item" style={{ padding: '28px 32px' }}>
            <h2 className="apple-h2" style={{ margin: '0 0 12px' }}>6. Contact Us</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 18px' }}>
              If you have any questions about these Terms & Conditions, please contact us directly.
            </p>
            {email && (
              <a
                href={`mailto:${email}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '12px 20px', borderRadius: 12,
                  background: 'var(--accent-gold-glow)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-gold)', fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', fontFamily: font,
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--accent-gold-deep)')}
                onMouseOut={e => (e.currentTarget.style.background = 'var(--accent-gold-glow)')}
              >
                <Mail size={15} strokeWidth={2} />
                {email}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

