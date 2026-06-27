import React from 'react';
import type { RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, Mail,  Phone, User, X } from 'lucide-react';

interface ProfileEditModalProps {
  show: boolean;
  onClose: () => void;
  profileForm: { name: string; phone: string; bio: string };
  setProfileForm: React.Dispatch<React.SetStateAction<{ name: string; phone: string; bio: string }>>;
  profileAvatar: string | null;
  userData: any;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProfileSave: () => void;
  profileSaving: boolean;
}

export function ProfileEditModal({
  show, onClose, profileForm, setProfileForm, profileAvatar, userData,
  avatarInputRef, handleAvatarChange, handleProfileSave, profileSaving
}: ProfileEditModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)', borderRadius: '12px',
              width: '440px', maxWidth: 'calc(100vw - 32px)', border: '1px solid var(--border-color)',
              boxShadow: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 28px 20px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, var(--bg-color), transparent)',
            }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Edit Profile</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>Update your personal information</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 36, height: 36, borderRadius: '12px', border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              ><X size={16} /></motion.button>
            </div>

            {/* Body */}
            <div style={{ padding: '28px' }}>
              {/* Avatar upload */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    className="avatar-wrap"
                    onClick={() => avatarInputRef.current?.click()}
                    style={{
                      width: 88, height: 88, borderRadius: '24px', cursor: 'pointer',
                      overflow: 'hidden', position: 'relative',
                      boxShadow: 'none',
                    }}
                  >
                    {profileAvatar ? (
                      <img src={profileAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: '900', fontSize: '28px', letterSpacing: '-1px',
                      }}>
                        {profileForm.name ? profileForm.name.substring(0, 2).toUpperCase() : 'TS'}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="avatar-edit-overlay" style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.45)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: '4px', opacity: 0, transition: 'opacity 0.2s',
                    }}>
                      <Camera size={20} color="white" />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'white', letterSpacing: '0.5px' }}>CHANGE</span>
                    </div>
                  </div>
                  {/* Badge */}
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 28, height: 28, borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))', border: '2px solid var(--card-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: 'none',
                  }} onClick={() => avatarInputRef.current?.click()}>
                    <Camera size={12} color="white" />
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
              </div>

              {/* Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Name */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      className="form-input"
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                      style={{ paddingLeft: '40px', width: '100%', borderRadius: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                    Email <span style={{ color: 'var(--text-tertiary)', fontWeight: '500', textTransform: 'none' }}>(managed by auth)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      className="form-input"
                      value={userData?.email || ''}
                      readOnly
                      style={{ paddingLeft: '40px', width: '100%', borderRadius: '12px', opacity: 0.6, cursor: 'not-allowed', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                    Phone
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      className="form-input"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 555 000 0000"
                      style={{ paddingLeft: '40px', width: '100%', borderRadius: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                    Bio
                  </label>
                  <textarea
                    className="form-input"
                    value={profileForm.bio}
                    onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="A short bio about yourself..."
                    rows={3}
                    style={{ width: '100%', borderRadius: '12px', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '0 28px 28px', display: 'flex', gap: '10px',
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={onClose}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                  color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                }}
              >Cancel</motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleProfileSave}
                disabled={profileSaving}
                style={{
                  flex: 2, padding: '14px', borderRadius: '14px', border: 'none',
                  background: profileSaving ? 'rgba(196,154,82,0.5)' : 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))',
                  color: 'white', fontSize: '14px', fontWeight: '800', cursor: profileSaving ? 'not-allowed' : 'pointer',
                  boxShadow: profileSaving ? 'none' : '0 4px 16px rgba(196,154,82,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {profileSaving ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />Saving...</>
                ) : (
                  <><Check size={16} />Save Changes</>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
