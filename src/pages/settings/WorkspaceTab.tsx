import type { Dispatch, RefObject, SetStateAction } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Spinner } from '../../components/Spinner';

interface WorkspaceTabProps {
  studioLogo: string;
  setStudioLogo: Dispatch<SetStateAction<string>>;
  studioName: string;
  setStudioName: Dispatch<SetStateAction<string>>;
  studioAddress: string;
  setStudioAddress: Dispatch<SetStateAction<string>>;
  studioEmail: string;
  setStudioEmail: Dispatch<SetStateAction<string>>;
  studioPhone: string;
  setStudioPhone: Dispatch<SetStateAction<string>>;
  currency: string;
  setCurrency: Dispatch<SetStateAction<string>>;
  paymentQrCode: string;
  setPaymentQrCode: Dispatch<SetStateAction<string>>;
  defaultComposerComm: number;
  setDefaultComposerComm: Dispatch<SetStateAction<number>>;
  defaultHummingComm: number;
  setDefaultHummingComm: Dispatch<SetStateAction<number>>;
  monthlyGoal: number;
  setMonthlyGoal: Dispatch<SetStateAction<number>>;
  displayCurrency: string;
  socialWhatsapp: string;
  setSocialWhatsapp: Dispatch<SetStateAction<string>>;
  socialFacebook: string;
  setSocialFacebook: Dispatch<SetStateAction<string>>;
  socialYoutube: string;
  setSocialYoutube: Dispatch<SetStateAction<string>>;
  socialInstagram: string;
  setSocialInstagram: Dispatch<SetStateAction<string>>;
  statsTrustLabel: string;
  setStatsTrustLabel: Dispatch<SetStateAction<string>>;
  statsProjects: number;
  setStatsProjects: Dispatch<SetStateAction<number>>;
  statsArtists: number;
  setStatsArtists: Dispatch<SetStateAction<number>>;
  statsViews: string;
  setStatsViews: Dispatch<SetStateAction<string>>;
  logoUploading: boolean;
  qrUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  qrInputRef: RefObject<HTMLInputElement | null>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleQrUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

export function WorkspaceTab({
  studioLogo, setStudioLogo, studioName, setStudioName, studioAddress, setStudioAddress,
  studioEmail, setStudioEmail, studioPhone, setStudioPhone, currency, setCurrency,
  paymentQrCode, setPaymentQrCode, defaultComposerComm, setDefaultComposerComm,
  defaultHummingComm, setDefaultHummingComm, monthlyGoal, setMonthlyGoal, displayCurrency,
  socialWhatsapp, setSocialWhatsapp, socialFacebook, setSocialFacebook,
  socialYoutube, setSocialYoutube, socialInstagram, setSocialInstagram,
  statsTrustLabel, setStatsTrustLabel, statsProjects, setStatsProjects,
  statsArtists, setStatsArtists, statsViews, setStatsViews,
  logoUploading, qrUploading, fileInputRef, qrInputRef, handleLogoUpload, handleQrUpload, setIsDirty,
}: WorkspaceTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {/* Logo Upload Section */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Company Logo</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-color)', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {studioLogo ? <img src={studioLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={24} color="var(--text-tertiary)" />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading} style={{ padding: '6px 14px', borderRadius: 10, background: 'var(--color-info)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: logoUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: logoUploading ? 0.7 : 1 }}>
                {logoUploading ? <Spinner size={12} color="white" /> : <Upload size={14} />}
                {logoUploading ? 'Uploading...' : 'Upload'}
              </button>
              {studioLogo && !logoUploading && (
                <button onClick={() => { setStudioLogo(''); setIsDirty(true); }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Remove
                </button>
              )}
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            </div>
          </div>
        </div>

        {/* QR Code Upload Section */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Payment QR Code</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-color)', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {paymentQrCode ? <img src={paymentQrCode} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={24} color="var(--text-tertiary)" />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => qrInputRef.current?.click()} disabled={qrUploading} style={{ padding: '6px 14px', borderRadius: 10, background: 'var(--color-info)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: qrUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: qrUploading ? 0.7 : 1 }}>
                {qrUploading ? <Spinner size={12} color="white" /> : <Upload size={14} />}
                {qrUploading ? 'Uploading...' : 'Upload'}
              </button>
              {paymentQrCode && !qrUploading && (
                <button onClick={() => { setPaymentQrCode(''); setIsDirty(true); }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Remove
                </button>
              )}
              <input type="file" ref={qrInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleQrUpload} />
            </div>
          </div>
        </div>

        <div className="settings-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Company Name</label>
          <input type="text" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={studioName} onChange={e => { setStudioName(e.target.value); setIsDirty(true); }} />
        </div>
        <div className="settings-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Business Address</label>
          <input type="text" placeholder="e.g. Dhaka, Bangladesh" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={studioAddress} onChange={e => { setStudioAddress(e.target.value); setIsDirty(true); }} />
        </div>
        <div className="settings-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Public Email</label>
          <input type="email" placeholder="tanvirstudiots@gmail.com" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={studioEmail} onChange={e => { setStudioEmail(e.target.value); setIsDirty(true); }} />
        </div>
        <div className="settings-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Contact Phone</label>
          <input type="text" placeholder="+880..." style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', width: '60%' }} value={studioPhone} onChange={e => { setStudioPhone(e.target.value); setIsDirty(true); }} />
        </div>
        <div className="settings-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Currency</label>
          <select style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer', appearance: 'none' }} value={currency} onChange={e => { setCurrency(e.target.value); setIsDirty(true); }}>
            <option value="৳">Bangladeshi Taka (৳)</option>
            <option value="$">US Dollar ($)</option>
            <option value="€">Euro (€)</option>
            <option value="₹">Indian Rupee (₹)</option>
          </select>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Financials</div>
        <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Composer Commission</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="number" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-info)', outline: 'none', width: 50 }} value={defaultComposerComm} onChange={e => { setDefaultComposerComm(Number(e.target.value)); setIsDirty(true); }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)' }}>%</span>
            </div>
          </div>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Vocal Artist Commission</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="number" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-warning)', outline: 'none', width: 50 }} value={defaultHummingComm} onChange={e => { setDefaultHummingComm(Number(e.target.value)); setIsDirty(true); }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-warning)' }}>%</span>
            </div>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Revenue Goal</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-success)' }}>{displayCurrency}</span>
              <input type="number" min="0" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-success)', outline: 'none', width: 80 }} value={monthlyGoal || ''} placeholder="0" onChange={e => { setMonthlyGoal(Number(e.target.value)); setIsDirty(true); }} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Social Media</div>
        <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {[
            { label: '💬 WhatsApp', placeholder: '+880 1700 000000', value: socialWhatsapp, set: setSocialWhatsapp },
            { label: '📘 Facebook', placeholder: 'facebook.com/yourstudio', value: socialFacebook, set: setSocialFacebook },
            { label: '▶️ YouTube',  placeholder: 'youtube.com/@yourstudio', value: socialYoutube,  set: setSocialYoutube },
            { label: '📸 Instagram', placeholder: 'instagram.com/yourstudio', value: socialInstagram, set: setSocialInstagram },
          ].map(({ label, placeholder, value, set }, i, arr) => (
            <div key={label} style={{ padding: '18px 24px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{label}</label>
              <input type="text" placeholder={placeholder} style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', outline: 'none', flex: 1, minWidth: 0 }} value={value} onChange={e => { set(e.target.value); setIsDirty(true); }} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Homepage Stats</div>
        <div style={{ background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div className="settings-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Section Heading</label>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Shown above the 4 stat boxes</span>
            </div>
            <input type="text" placeholder="10 years of trust." style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', outline: 'none', width: '50%' }} value={statsTrustLabel} onChange={e => { setStatsTrustLabel(e.target.value); setIsDirty(true); }} />
          </div>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Projects Completed</label>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Number only (e.g. 999)</span>
            </div>
            <input type="number" min="0" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-info)', outline: 'none', width: 80 }} value={statsProjects} onChange={e => { setStatsProjects(Number(e.target.value)); setIsDirty(true); }} />
          </div>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Partnered Artists</label>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Number only (e.g. 99)</span>
            </div>
            <input type="number" min="0" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-info)', outline: 'none', width: 80 }} value={statsArtists} onChange={e => { setStatsArtists(Number(e.target.value)); setIsDirty(true); }} />
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Global Streams & Views</label>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Text (e.g. 1B+)</span>
            </div>
            <input type="text" placeholder="1B+" style={{ border: 'none', background: 'transparent', textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--color-info)', outline: 'none', width: 80 }} value={statsViews} onChange={e => { setStatsViews(e.target.value); setIsDirty(true); }} />
          </div>
        </div>
      </div>

    </div>
  );
}
