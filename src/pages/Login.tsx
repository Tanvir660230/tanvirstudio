 

import { Global, css } from '@emotion/react';

import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { useSettings } from '../contexts/SettingsContext';

import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, ArrowLeft, User, Phone } from 'lucide-react';

import {

  signInWithEmailAndPassword, createUserWithEmailAndPassword,

  sendPasswordResetEmail, sendEmailVerification,

  signOut, updateProfile,

} from 'firebase/auth';

import { auth, db } from '../lib/firebase';

import { doc, setDoc } from 'firebase/firestore';

import { GoogleOneTap, resetGoogleOneTap, triggerGoogleSignIn } from '../components/GoogleOneTap';



const WAVE = [10,16,26,38,50,58,54,42,62,56,46,66,60,48,70,64,52,72,58,50,68,62,48,66,56,42,58,50,38,28,20,12,9];



// ── design tokens (same palette as Home) ──

const T = {

  bg:      '#08080f',

  bg2:     '#0d0d1a',

  surface: 'rgba(255,255,255,0.038)',

  border:  'rgba(255,255,255,0.08)',

  borderA: 'rgba(255,255,255,0.14)',

  gold:    'var(--accent-gold)',

  goldLt:  'var(--accent-gold)',

  goldDim: 'rgba(196,154,82,0.15)',

  white:   '#ececf0',

  muted:   'rgba(236,236,240,0.48)',

  dim:     'rgba(236,236,240,0.28)',

  ff:      "'Plus Jakarta Sans','Inter',-apple-system,BlinkMacSystemFont,sans-serif",

};





export function Login() {

  const nav = useNavigate();

  const { settings } = useSettings();

  const { studioLogo, studioName } = settings;



  useEffect(() => { window.scrollTo(0, 0); }, []);

  const pendingPkg = (() => { try { const r = sessionStorage.getItem('pendingPackage'); return r ? JSON.parse(r) : null; } catch { return null; } })();

  const [name, setName]                     = useState('');

  const [phone, setPhone]                   = useState('');

  const [email, setEmail]                   = useState('');

  const [password, setPassword]             = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPw, setShowPw]                 = useState(false);

  const [showCpw, setShowCpw]               = useState(false);

  const [isSignUp, setIsSignUp]             = useState(false);

  const [isForgot, setIsForgot]             = useState(false);

  const [error, setError]                   = useState('');

  const [successMsg, setSuccessMsg]         = useState('');

  const [loading, setLoading]               = useState(false);



  const reset = () => { setError(''); setSuccessMsg(''); };

  const switchMode = (signup: boolean) => { setIsSignUp(signup); setIsForgot(false); setName(''); setPhone(''); setPassword(''); setConfirmPassword(''); reset(); };



  const handleSubmit = async (e: { preventDefault(): void }) => {

    e.preventDefault();

    setLoading(true); reset();



    if (isForgot) {

      try {

        await sendPasswordResetEmail(auth, email);

        setSuccessMsg('Reset link sent — check your inbox.');

      } catch {

        setError('Could not send reset email. Check the address and try again.');

      } finally { setLoading(false); }

      return;

    }



    if (!email.trim() || !password.trim()) {

      setError('Email and password are required.');

      setLoading(false); return;

    }



    if (isSignUp && !name.trim()) {

      setError('Please enter your full name.');

      setLoading(false); return;

    }



    if (isSignUp && !phone.trim()) {

      setError('Please enter your phone number.');

      setLoading(false); return;

    }



    if (isSignUp && password !== confirmPassword) {

      setError('Passwords do not match.');

      setLoading(false); return;

    }



    try {

      if (isSignUp) {

        const cred = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(cred.user, { displayName: name.trim() });

        await sendEmailVerification(cred.user);

        try {

          await setDoc(doc(db, 'users', cred.user.uid), {

            uid: cred.user.uid,

            email: email.trim().toLowerCase(),

            name: name.trim(),

            phone: phone.trim(),

            role: 'client',

          });

        } catch { /* non-critical */ }

        await signOut(auth);

        setSuccessMsg(pendingPkg

          ? `Account created! Check your inbox to verify your email — your ${pendingPkg.name} order will be ready to confirm once you sign in.`

          : 'Account created! Verify your email, then sign in.');

        setIsSignUp(false);

        setName('');

        setPhone('');

        return;

      }

      const cred = await signInWithEmailAndPassword(auth, email, password);

      if (!cred.user.emailVerified) {
        // AuthContext's onAuthStateChanged would silently sign this user back
        // out (it also enforces verification) — surface a clear reason here
        // instead of letting the user bounce back to /login with no message.
        try { await sendEmailVerification(cred.user); } catch { /* rate-limited, ignore */ }
        await signOut(auth);
        setError('Please verify your email before signing in — we just sent a fresh verification link to your inbox.');
        return;
      }

      // Don't navigate here — AuthContext's onAuthStateChanged (which also
      // enforces email verification) hasn't necessarily processed this sign-in
      // yet, so an immediate onLogin()/navigate() races it: App.tsx's own
      // "user is set, still on /login -> go to /dashboard" redirect fires
      // once auth state has actually settled, avoiding a flash back to /login.

    } catch (err: any) {

      if (err.code === 'auth/email-already-in-use') setError('Email already in use. Try Forgot Password.');

      else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.');

      else if (err.code === 'auth/invalid-credential') setError('Invalid email or password.');

      else setError('Something went wrong. Please try again.');

    } finally { setLoading(false); }

  };



  const handleGoogle = () => {
    reset();
    // Both signInWithPopup (COOP breaks window.closed polling) and
    // signInWithRedirect (relies on a storage hand-off with the Firebase
    // authDomain, which silently fails on third-party hosts like Netlify
    // once the browser partitions cross-site storage) proved unreliable here.
    // Instead, trigger Google Identity Services' own account-chooser popup
    // directly — sign-in completes via the callback in GoogleOneTap.tsx
    // (signInWithCredential), which AuthContext + App.tsx's redirect pick up.
    const triggered = triggerGoogleSignIn();
    if (!triggered) {
      setError('Google sign-in is still loading — please wait a moment and try again.');
    }
  };



  // Reset One Tap on mount so it shows again after logout

  useEffect(() => { resetGoogleOneTap(); }, []);



  const title    = isForgot ? 'Forgot Password' : isSignUp ? 'Create Account'  : 'Sign In';

  const subtitle = isForgot ? 'Enter your email — we\'ll send a reset link.' : isSignUp ? 'Create your client account.' : 'Good to have you back.';

  const btnLabel = isForgot ? 'Send Reset Link' : isSignUp ? 'Create Account'  : 'Sign In';



  return (

    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: T.bg, fontFamily: T.ff }}>



      <Global styles={css`

        @keyframes wvFloat { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.55)} }

        @keyframes loginFadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }

        @keyframes lv-nameShimmer { 0%,100%{background-position:0% center} 50%{background-position:100% center} }

        .lv-name {

          display:inline-block;

          background:linear-gradient(90deg,var(--accent-gold) 0%,var(--accent-gold) 12%,#ececf0 30%,#ececf0 70%,var(--accent-gold) 88%,var(--accent-gold) 100%);

          background-size:220% auto;

          -webkit-background-clip:text;

          -webkit-text-fill-color:transparent;

          background-clip:text;

          animation:lv-nameShimmer 3.5s ease-in-out infinite;

        }

        .lv-wave { animation: wvFloat 2.2s ease-in-out infinite; }

        .lv-wave:nth-child(2n)  { animation-delay:.14s }

        .lv-wave:nth-child(3n)  { animation-delay:.29s }

        .lv-wave:nth-child(5n)  { animation-delay:.44s }

        .lv-fade { animation: loginFadeUp .65s ease forwards; }

        .lv-input {

          width:100%; height:46px; padding:0 14px 0 42px;

          background:rgba(255,255,255,0.04);

          border:1px solid rgba(255,255,255,0.09);

          border-radius:11px; color:#ececf0;

          font-size:14px; font-weight:500;

          font-family:${T.ff};

          outline:none; transition:border-color .15s, background .15s;

        }

        .lv-input:focus { border-color:rgba(196,154,82,0.55); background:rgba(255,255,255,0.06); }

        .lv-input::placeholder { color:rgba(236,236,240,0.26); }

        .lv-input.err { border-color:rgba(224,82,82,0.5) !important; background:rgba(224,82,82,0.04) !important; }

        .lv-google:hover { border-color:rgba(255,255,255,0.18) !important; background:rgba(255,255,255,0.06) !important; transform:translateY(-1px); }

        .lv-link:hover { opacity:.7; }

        @media(max-width:768px){

          .lv-left { display:none !important; }

          .lv-right { width:100% !important; padding:0 !important; align-items:flex-start !important; }

          .lv-right-inner { padding:32px 20px 60px !important; }

          .lv-mobile-header { display:block !important; }

        }

      `} />



      {/* ── LEFT PANEL ── */}

      <div className="lv-left" style={{

        width: '46%', flexShrink: 0,

        background: T.bg2,

        borderRight: `1px solid ${T.border}`,

        display: 'flex', flexDirection: 'column',

        padding: '44px 48px',

        position: 'relative', overflow: 'hidden',

      }}>



        {/* ambient glows */}

        <div style={{ position:'absolute', top:'-15%', left:'-20%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(196,154,82,0.09),transparent 65%)', pointerEvents:'none' }} />

        <div style={{ position:'absolute', bottom:'-10%', right:'-15%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,125,221,0.06),transparent 65%)', pointerEvents:'none' }} />



        {/* Logo + back link */}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>

          <div style={{ display:'flex', alignItems:'center', gap:13 }}>

            {studioLogo

              ? <div style={{ width:44, height:44, borderRadius:11, overflow:'hidden', flexShrink:0, border:'1.5px solid rgba(196,154,82,0.25)', background:'rgba(255,255,255,0.05)' }}><img src={studioLogo} alt={studioName||'Logo'} style={{ width:'100%', height:'100%', objectFit:'contain' }} /></div>

              : <div style={{ width:44, height:44, borderRadius:11, background:`linear-gradient(135deg,${T.gold},${T.goldLt})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:15, color:'#0a0a0a', letterSpacing:-0.5, flexShrink:0 }}>{(studioName||'TS').slice(0,2).toUpperCase()}</div>

            }

            <span className="lv-name" style={{ fontWeight:900, fontSize:22, letterSpacing:-0.8, lineHeight:1, whiteSpace:'nowrap' }}>{studioName || 'Tanvir Studio'}</span>

          </div>

          <button onClick={() => nav('/')} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', color:T.dim, fontSize:12, fontWeight:600, cursor:'pointer', transition:'color .15s', padding:0 }}

            onMouseEnter={e => (e.currentTarget.style.color = T.muted)}

            onMouseLeave={e => (e.currentTarget.style.color = T.dim)}>

            <ArrowLeft size={13} /> Home

          </button>

        </div>



        {/* Main copy */}

        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', position:'relative', zIndex:1 }}>

          <h1 style={{ fontSize:'clamp(38px,4.5vw,58px)', fontWeight:900, letterSpacing:-2.5, lineHeight:1.05, margin:'0 0 22px', color:T.white }}>

            Where every<br />

            <span style={{ background:`linear-gradient(135deg,${T.gold},${T.goldLt})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>note matters.</span>

          </h1>



          <p style={{ fontSize:15, color:T.muted, lineHeight:1.75, maxWidth:300, margin:0, fontWeight:400 }}>

            Professional nasheed &amp; vocal production. Sign in to check your project, download files, or review your invoice.

          </p>

        </div>



        {/* Waveform footer */}

        <div style={{ display:'flex', alignItems:'center', gap:3, position:'relative', zIndex:1 }}>

          {WAVE.map((h, i) => (

            <div key={i} className="lv-wave" style={{ width:3, height:h*0.7, borderRadius:3, background:`linear-gradient(to top,${T.goldDim},${T.gold})`, opacity:0.4, animationDelay:`${i*0.06}s` }} />

          ))}

        </div>

      </div>



      {/* ── RIGHT PANEL ── */}

      <div className="lv-right" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', overflowY:'auto' }}>

        <div className="lv-right-inner lv-fade" style={{ width:'100%', maxWidth:400, padding:'40px 24px' }}>



          {/* Mobile-only header */}

          <div style={{ display:'none' }} className="lv-mobile-header">

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:36 }}>

              <div style={{ display:'flex', alignItems:'center', gap:10 }}>

                {studioLogo

                  ? <div style={{ width:38, height:38, borderRadius:10, overflow:'hidden', flexShrink:0, border:'1.5px solid rgba(196,154,82,0.25)', background:'rgba(255,255,255,0.05)' }}><img src={studioLogo} alt={studioName||'Logo'} style={{ width:'100%', height:'100%', objectFit:'contain' }} /></div>

                  : <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${T.gold},${T.goldLt})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:'#0a0a0a', flexShrink:0 }}>{(studioName||'TS').slice(0,2).toUpperCase()}</div>

                }

                <span className="lv-name" style={{ fontWeight:900, fontSize:19, letterSpacing:-0.6, lineHeight:1, whiteSpace:'nowrap' }}>{studioName || 'Tanvir Studio'}</span>

              </div>

              <button onClick={() => nav('/')} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', color:T.dim, fontSize:12, fontWeight:600, cursor:'pointer', padding:0 }}>

                <ArrowLeft size={13} /> Home

              </button>

            </div>

          </div>



          {/* Pending order banner */}

          {pendingPkg && (

            <div style={{ marginBottom:24, padding:'13px 16px', borderRadius:12, background:'rgba(196,154,82,0.08)', border:'1px solid rgba(196,154,82,0.22)', display:'flex', alignItems:'center', gap:12 }}>

              <div style={{ width:36, height:36, borderRadius:9, background:'rgba(196,154,82,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>

              </div>

              <div>

                <p style={{ margin:0, fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--accent-gold)' }}>Completing your order</p>

                <p style={{ margin:'2px 0 0', fontSize:13.5, fontWeight:700, color:T.white }}>{pendingPkg.name} <span style={{ color:'var(--accent-gold)' }}>{pendingPkg.price}</span></p>

              </div>

            </div>

          )}



          {/* Heading */}

          <div style={{ marginBottom:36 }}>

            <h2 style={{ fontSize:28, fontWeight:900, color:T.white, letterSpacing:-0.8, margin:'0 0 8px' }}>{title}</h2>

            <p style={{ fontSize:14, color:T.muted, fontWeight:500, margin:0 }}>{pendingPkg ? 'Sign in or create an account to confirm.' : subtitle}</p>

          </div>



          {/* Google button */}

          {!isForgot && (

            <>

              <button type="button" onClick={handleGoogle} disabled={loading} className="lv-google" style={{

                width:'100%', padding:'12px 16px',

                display:'flex', alignItems:'center', justifyContent:'center', gap:10,

                background:'rgba(255,255,255,0.04)',

                border:`1px solid ${T.border}`, borderRadius:11,

                color:T.white, fontSize:14, fontWeight:600,

                cursor:'pointer', marginBottom:22, transition:'all .15s',

                opacity: loading ? 0.6 : 1,

              }}>

                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">

                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>

                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>

                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>

                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>

                </svg>

                Continue with Google

              </button>



              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>

                <div style={{ flex:1, height:1, background:T.border }} />

                <span style={{ fontSize:11, color:T.dim, fontWeight:700, textTransform:'uppercase', letterSpacing:0.6 }}>or</span>

                <div style={{ flex:1, height:1, background:T.border }} />

              </div>

            </>

          )}



          {/* Form */}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>



            {/* Name — sign up only */}

            {isSignUp && (

              <div>

                <label htmlFor="lv-name" style={{ fontSize:12, fontWeight:700, color:T.dim, display:'block', marginBottom:7, letterSpacing:0.2, textTransform:'uppercase' }}>Full Name</label>

                <div style={{ position:'relative' }}>

                  <User size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:T.dim, pointerEvents:'none' }} />

                  <input id="lv-name" type="text" className={`lv-input${error && !name.trim() ? ' err' : ''}`} placeholder="Your full name" value={name} onChange={e => { setName(e.target.value); setError(''); }} required autoFocus />

                </div>

              </div>

            )}



            {/* Phone — sign up only */}

            {isSignUp && (

              <div>

                <label htmlFor="lv-phone" style={{ fontSize:12, fontWeight:700, color:T.dim, display:'block', marginBottom:7, letterSpacing:0.2, textTransform:'uppercase' }}>Phone Number</label>

                <div style={{ position:'relative' }}>

                  <Phone size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:T.dim, pointerEvents:'none' }} />

                  <input id="lv-phone" type="tel" className={`lv-input${error && !phone.trim() ? ' err' : ''}`} placeholder="+880 1X-XXXX-XXXX" value={phone} onChange={e => { setPhone(e.target.value); setError(''); }} required />

                </div>

              </div>

            )}



            {/* Email */}

            <div>

              <label htmlFor="lv-email" style={{ fontSize:12, fontWeight:700, color:T.dim, display:'block', marginBottom:7, letterSpacing:0.2, textTransform:'uppercase' }}>Email</label>

              <div style={{ position:'relative' }}>

                <Mail size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:T.dim, pointerEvents:'none' }} />

                <input id="lv-email" type="email" className="lv-input" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} required />

              </div>

            </div>



            {/* Password */}

            {!isForgot && (

              <div>

                <label htmlFor="lv-password" style={{ fontSize:12, fontWeight:700, color:T.dim, display:'block', marginBottom:7, letterSpacing:0.2, textTransform:'uppercase' }}>Password</label>

                <div style={{ position:'relative' }}>

                  <Lock size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:T.dim, pointerEvents:'none' }} />

                  <input id="lv-password" type={showPw ? 'text' : 'password'} className={`lv-input${error && !password ? ' err' : ''}`} placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} required />

                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.dim, cursor:'pointer', padding:4, display:'flex' }}>

                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}

                  </button>

                </div>

              </div>

            )}



            {/* Confirm password */}

            {!isForgot && isSignUp && (

              <div>

                <label htmlFor="lv-confirm-password" style={{ fontSize:12, fontWeight:700, color:T.dim, display:'block', marginBottom:7, letterSpacing:0.2, textTransform:'uppercase' }}>Confirm Password</label>

                <div style={{ position:'relative' }}>

                  <Lock size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:T.dim, pointerEvents:'none' }} />

                  <input id="lv-confirm-password" type={showCpw ? 'text' : 'password'} className={`lv-input${error && password !== confirmPassword ? ' err' : ''}`} placeholder="••••••••" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} required />

                  <button type="button" onClick={() => setShowCpw(!showCpw)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.dim, cursor:'pointer', padding:4, display:'flex' }}>

                    {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}

                  </button>

                </div>

              </div>

            )}



            {/* Forgot password link */}

            {!isSignUp && !isForgot && (

              <div style={{ textAlign:'right', marginTop:-4 }}>

                <span className="lv-link" onClick={() => { setIsForgot(true); reset(); }} style={{ fontSize:12, fontWeight:600, color:T.gold, cursor:'pointer', transition:'opacity .15s' }}>

                  Forgot password?

                </span>

              </div>

            )}



            {/* Error / success */}

            {error && (

              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(224,82,82,0.08)', border:'1px solid rgba(224,82,82,0.18)', borderRadius:9, padding:'11px 13px', color:'#e87a7a', fontSize:13, fontWeight:600 }}>

                <AlertCircle size={14} /> {error}

              </div>

            )}

            {successMsg && (

              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(61,190,108,0.08)', border:'1px solid rgba(61,190,108,0.18)', borderRadius:9, padding:'11px 13px', color:'#5dcc85', fontSize:13, fontWeight:600 }}>

                <ShieldCheck size={14} /> {successMsg}

              </div>

            )}



            {/* Submit */}

            <button type="submit" disabled={loading} style={{

              width:'100%', padding:'13px', marginTop:4,

              borderRadius:11, border:'none',

              background: loading ? 'rgba(196,154,82,0.5)' : `linear-gradient(135deg,${T.gold},${T.goldLt})`,

              color:'#0a0a0a', fontSize:15, fontWeight:800,

              cursor: loading ? 'not-allowed' : 'pointer',

              display:'flex', alignItems:'center', justifyContent:'center', gap:8,

              fontFamily:T.ff, letterSpacing:-0.2,

              boxShadow: loading ? 'none' : '0 8px 24px rgba(196,154,82,0.3)',

              transition:'opacity .15s, transform .12s, box-shadow .15s',

            }}

              onMouseEnter={e => { if (!loading) { e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; } }}

              onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateY(0)'; }}

            >

              {loading ? 'Please wait…' : btnLabel}

              {!loading && <ArrowRight size={16} />}

            </button>

          </form>



          {/* Footer toggle */}

          <div style={{ marginTop:26, textAlign:'center', fontSize:13.5, color:T.muted }}>

            {isForgot ? (

              <span className="lv-link" onClick={() => { setIsForgot(false); reset(); }} style={{ color:T.gold, cursor:'pointer', fontWeight:700, transition:'opacity .15s' }}>

                ← Back to Sign In

              </span>

            ) : (

              <>

                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}

                <span className="lv-link" onClick={() => switchMode(!isSignUp)} style={{ color:T.gold, cursor:'pointer', fontWeight:700, transition:'opacity .15s' }}>

                  {isSignUp ? 'Sign In' : 'Sign Up'}

                </span>

              </>

            )}

          </div>



        </div>

      </div>



      <GoogleOneTap />

    </div>

  );

}

