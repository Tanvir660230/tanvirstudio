import { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { SEO } from '../components/SEO';
import { Mail } from 'lucide-react';

export function Privacy() {
  const { settings } = useSettings();
  const email = settings.studioEmail || '';
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const font  = "var(--font-sans)";

  const sections = [
    { title: '1. Information We Collect', body: "We collect information you provide directly to us when you fill out our contact form, including your name, email address, and the content of your message." },
    { title: '2. How We Use Your Information', body: "We use the information we collect to communicate with you, provide the services you request, and improve our offerings." },
    { title: '3. Data Storage', body: "Your data is stored securely using industry-standard encryption and cloud infrastructure provided by Firebase (Google Cloud)." },
    { title: '4. Your Rights', body: "You have the right to access, update, or delete the personal information we have on you. Please contact us to exercise these rights." },
  ];

  return (
    <div style={{ paddingBottom: '80px', fontFamily: font }}>
      <SEO title="Privacy Policy | Tanvir Studio" description="Learn how Tanvir Studio collects, uses, and protects your personal information." url="https://tanvir.studio/privacy" />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '120px 24px 80px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>Legal</p>
        <h1 className="apple-h1" style={{ margin: '0 0 12px' }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 56 }}>Last updated: April 17, 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sections.map(({ title, body }) => (
            <div key={title} className="bento-item" style={{ padding: '28px 32px' }}>
              <h2 className="apple-h2" style={{ margin: '0 0 12px' }}>{title}</h2>
              <p className="apple-subtitle" style={{ margin: 0 }}>{body}</p>
            </div>
          ))}

          {/* Contact */}
          <div className="bento-item" style={{ padding: '28px 32px' }}>
            <h2 className="apple-h2" style={{ margin: '0 0 12px' }}>5. Contact Us</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 18px' }}>
              If you have any questions about this Privacy Policy, feel free to reach out to us directly.
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

