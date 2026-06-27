import { Global, css } from '@emotion/react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MessageCircle, Mic, ArrowUpRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { IconFacebook, IconYoutube, IconInstagram } from './icons/SocialIcons';

const font = "var(--font-sans)";

const safeUrl = (url?: string) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://${url}`;
};

const toSlug = (s: string) =>
  (s || '').toLowerCase().replace(/[&']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

export function PublicFooter() {
  const { settings } = useSettings();
  const { websiteServices } = useData();

  const currentYear = new Date().getFullYear();
  const studioName = settings?.studioName || 'Tanvir Studio';

  const whatsapp = settings?.socialWhatsapp || settings?.studioPhone || '';
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${studioName}, I want to start a production project.`)}`
    : '';

  const fbLink = safeUrl(settings?.socialFacebook);
  const ytLink = safeUrl(settings?.socialYoutube);
  const igLink = safeUrl(settings?.socialInstagram);

  return (
    <footer style={{ background: 'var(--surface-1)', fontFamily: font, color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)' }}>
      <Global styles={css`
        .gf { max-width: 1200px; margin: 0 auto; padding: 0 32px; }

        /* ── CTA band ── */
        .gf-cta-band {
          padding: 100px 0 96px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 40px;
          flex-wrap: wrap;
        }
        .gf-cta-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--accent-gold);
          margin-bottom: 20px;
        }
        .gf-cta-headline {
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1.04;
          color: var(--text-primary);
          margin: 0;
        }
        .gf-cta-headline em {
          font-style: normal;
          color: var(--accent-gold);
        }
        .gf-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          border: 1.5px solid var(--border-color);
          border-radius: 100px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.25s, border-color 0.25s, color 0.25s, transform 0.22s;
          flex-shrink: 0;
        }
        .gf-cta-btn:hover {
          background: var(--accent-gold);
          border-color: var(--accent-gold);
          color: #fff;
          transform: translateY(-2px);
        }

        /* ── Grid ── */
        .gf-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1.2fr;
          gap: 0;
          padding: 64px 0 56px;
          border-bottom: 1px solid var(--border-color);
        }
        .gf-col { padding-right: 48px; }

        .gf-logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .gf-studio-name { font-size: 16px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
        .gf-studio-sub { font-size: 10px; color: var(--text-secondary); letter-spacing: 0.16em; text-transform: uppercase; margin-top: 2px; }

        .gf-bio { font-size: 13.5px; color: var(--text-secondary); line-height: 1.65; margin: 0 0 28px; max-width: 230px; }

        .gf-socials { display: flex; gap: 14px; }
        .gf-soc { color: var(--text-secondary); text-decoration: none; transition: color 0.2s; line-height: 1; }
        .gf-soc:hover { color: var(--accent-gold); }

        .gf-col-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
        .gf-link { display: block; font-size: 14px; color: var(--text-secondary); text-decoration: none; margin-bottom: 13px; transition: color 0.18s; font-weight: 400; }
        .gf-link:hover { color: var(--text-primary); }

        .gf-contact-item { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--text-secondary); text-decoration: none; margin-bottom: 13px; transition: color 0.18s; }
        .gf-contact-item:hover { color: var(--text-primary); }

        /* ── Bottom ── */
        .gf-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 0;
          flex-wrap: wrap;
          gap: 12px;
        }
        .gf-copy { font-size: 12.5px; color: var(--text-secondary); }
        .gf-legal { display: flex; gap: 24px; }
        .gf-legal a { font-size: 12.5px; color: var(--text-secondary); text-decoration: none; transition: color 0.18s; }
        .gf-legal a:hover { color: var(--text-primary); }

        @media (max-width: 900px) {
          .gf-grid { grid-template-columns: 1fr 1fr; gap: 44px 0; }
          .gf-col { padding-right: 28px; }
          .gf-brand-col { grid-column: 1 / -1; }
          .gf-bio { max-width: 100%; }
        }
        @media (max-width: 600px) {
          .gf { padding: 0 20px; }
          .gf-grid { grid-template-columns: 1fr; gap: 36px; }
          .gf-cta-band { padding: 64px 0 60px; }
        }
      `} />

      <div className="gf">

        {/* CTA band */}
        <div className="gf-cta-band">
          <div>
            <div className="gf-cta-eyebrow">Let's work together</div>
            <h2 className="gf-cta-headline">
              Ready to create<br />
              something <em>great?</em>
            </h2>
          </div>
          <Link to="/booking" className="gf-cta-btn">
            Start a Project <ArrowUpRight size={17} />
          </Link>
        </div>

        {/* Grid */}
        <div className="gf-grid">

          {/* Brand */}
          <div className="gf-col gf-brand-col">
            <div className="gf-logo-row">
              {settings?.studioLogo
                ? <img src={settings.studioLogo} alt="Logo" loading="lazy" style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover' }} />
                : <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mic size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.8} />
                  </div>
              }
              <div>
                <div className="gf-studio-name">{studioName}</div>
                <div className="gf-studio-sub">Production Studio</div>
              </div>
            </div>
            <p className="gf-bio">
              Premium audio & video production — crafted with intention.
            </p>
            <div className="gf-socials">
              {whatsapp && <a href={waLink} target="_blank" rel="noreferrer" title="WhatsApp" className="gf-soc"><MessageCircle size={16} /></a>}
              {ytLink && <a href={ytLink} target="_blank" rel="noreferrer" title="YouTube" className="gf-soc"><IconYoutube /></a>}
              {fbLink && <a href={fbLink} target="_blank" rel="noreferrer" title="Facebook" className="gf-soc"><IconFacebook /></a>}
              {igLink && <a href={igLink} target="_blank" rel="noreferrer" title="Instagram" className="gf-soc"><IconInstagram /></a>}
            </div>
          </div>

          {/* Pages */}
          <div className="gf-col">
            <div className="gf-col-label">Company</div>
            <Link to="/about" className="gf-link">About</Link>
            <Link to="/portfolio" className="gf-link">Portfolio</Link>
            <Link to="/services" className="gf-link">Services</Link>
            <Link to="/blog" className="gf-link">Blog</Link>
            <Link to="/contact" className="gf-link">Contact</Link>
          </div>

          {/* Services */}
          <div className="gf-col">
            <div className="gf-col-label">Services</div>
            {websiteServices.slice(0, 4).map((svc: any) => (
              <Link key={svc.id} to={`/services/${svc.slug || toSlug(svc.name)}`} className="gf-link">{svc.name}</Link>
            ))}
            {websiteServices.length === 0 && (
              <Link to="/services" className="gf-link">View All Services</Link>
            )}
          </div>

          {/* Contact */}
          <div className="gf-col">
            <div className="gf-col-label">Contact</div>
            {settings?.studioEmail && (
              <a href={`mailto:${settings.studioEmail}`} className="gf-contact-item">
                <Mail size={13} />
                <span>{settings.studioEmail}</span>
              </a>
            )}
            {(settings?.studioPhone || settings?.socialWhatsapp) && (
              <a href={waLink || `tel:${settings?.studioPhone}`} target={waLink ? '_blank' : undefined} rel="noreferrer" className="gf-contact-item">
                <Phone size={13} />
                <span>{settings?.studioPhone || settings?.socialWhatsapp}</span>
              </a>
            )}
          </div>

        </div>

        {/* Bottom bar */}
        <div className="gf-bar">
          <div className="gf-copy">© {currentYear} {studioName}. All rights reserved.</div>
          <div className="gf-legal">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
