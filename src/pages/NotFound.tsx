import { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { motion } from 'framer-motion';

import { Home, ArrowLeft } from 'lucide-react';

import { SEO } from '../components/SEO';



const font = "var(--font-sans)";



export function NotFound() {

  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);



  return (

    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: font, display: 'flex', flexDirection: 'column' }}>

      <SEO title="Page Not Found | Tanvir Studio" description="The page you're looking for doesn't exist. Return to Tanvir Studio's homepage." />



      {/* Ambient glow behind 404 */}

      <div style={{ position:'fixed', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:400, background:'radial-gradient(ellipse,rgba(217,173,98,0.07) 0%,transparent 70%)', filter:'blur(60px)', pointerEvents:'none', zIndex:0 }} />



      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 80px' }}>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '520px' }}>



          {/* 404 number */}

          <motion.div

            initial={{ opacity: 0, y: 24 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}

          >

            <div style={{

              fontSize: 'clamp(96px, 20vw, 160px)',

              fontWeight: 900,

              letterSpacing: '-0.05em',

              lineHeight: 1,

              background: 'linear-gradient(135deg, var(--accent-gold) 0%, #8a5c1a 60%, #d9ad62 100%)',

              WebkitBackgroundClip: 'text',

              WebkitTextFillColor: 'transparent',

              backgroundClip: 'text',

              marginBottom: '8px',

              userSelect: 'none',

            }}>

              404

            </div>

          </motion.div>



          {/* Divider 'var(--border-color)' */}

          <motion.div

            initial={{ scaleX: 0 }}

            animate={{ scaleX: 1 }}

            transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}

            style={{ height: '1px', background: 'var(--border-color)', margin: '0 auto 32px', width: '80px' }}

          />



          {/* Heading */}

          <motion.h1

            initial={{ opacity: 0, y: 16 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}

            className="apple-h1"

            style={{ fontSize: 'clamp(22px, 4vw, 30px)', margin: '0 0 14px' }}

          >

            Page Not Found

          </motion.h1>



          {/* Message */}

          <motion.p

            initial={{ opacity: 0, y: 12 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ duration: 0.4, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}

            className="apple-subtitle"

            style={{ margin: '0 0 40px' }}

          >

            The page you're looking for doesn't exist or has been moved.

            Let's get you back to the right place.

          </motion.p>



          {/* Buttons */}

          <motion.div

            initial={{ opacity: 0, y: 10 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ duration: 0.4, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}

            style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}

          >

            <button

              onClick={() => navigate('/')}

              className="apple-btn"

            >

              <Home size={15} strokeWidth={2.5} />

              Go Home

            </button>



            <button

              onClick={() => navigate(-1)}

              className="apple-btn"

              style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}

            >

              <ArrowLeft size={15} strokeWidth={2.5} />

              Go Back

            </button>

          </motion.div>



        </div>

      </main>



    </div>

  );

}





