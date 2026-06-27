

import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Briefcase, Users, FileText, Music2, DollarSign } from 'lucide-react';

import { useData } from '../contexts/DataContext';



interface Result {

  id: string;

  label: string;

  sub: string;

  icon: React.ReactNode;

  action: () => void;

}



export function GlobalSearch() {

  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState('');

  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const { tasks, clients, notes } = useData();



  useEffect(() => {

    const handler = (e: KeyboardEvent) => {

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {

        e.preventDefault();

        setOpen(v => !v);

      }

      // `/` key opens search when not typing in an input

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {

        const tag = (e.target as HTMLElement).tagName;

        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {

          e.preventDefault();

          setOpen(true);

        }

      }

      if (e.key === 'Escape') setOpen(false);

    };

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);

  }, []);



  useEffect(() => {

    if (open) {

      setTimeout(() => {

        setQuery('');

        setActive(0);

        setTimeout(() => inputRef.current?.focus(), 50);

      }, 0);

    }

  }, [open]);



  // Focus trap

  useEffect(() => {

    if (!open) return;

    const handleTab = (e: KeyboardEvent) => {

      if (e.key !== 'Tab') return;

      const panel = panelRef.current;

      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(

        'button, input, [tabindex]:not([tabindex="-1"])'

      )).filter(el => !el.hasAttribute('disabled'));

      if (!focusable.length) return;

      const first = focusable[0];

      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {

        if (document.activeElement === first) { e.preventDefault(); last.focus(); }

      } else {

        if (document.activeElement === last) { e.preventDefault(); first.focus(); }

      }

    };

    document.addEventListener('keydown', handleTab);

    return () => document.removeEventListener('keydown', handleTab);

  }, [open]);



  const TASK_LIMIT   = 15;

  const CLIENT_LIMIT = 20;

  const NOTE_LIMIT   = 25;



  const { results, truncated } = useMemo(() => {

    if (!query.trim()) return { results: [], truncated: false };

    const q = query.toLowerCase();

    const out: Result[] = [];

    let taskTotal = 0, clientTotal = 0, noteTotal = 0;



    (tasks as any[]).forEach(t => {

      if ((t.title || '').toLowerCase().includes(q) || (t.client || '').toLowerCase().includes(q) || (t.songName || '').toLowerCase().includes(q)) {

        taskTotal++;

        if (out.filter(r => r.id.startsWith('task-')).length < TASK_LIMIT) {

          out.push({

            id: `task-${t.id}`,

            label: t.songName || t.title,

            sub: `${t.client} · ${t.status}`,

            icon: <Music2 size={14} color="var(--accent-gold-light)" />,

            action: () => { navigate('/work', { state: { openTaskId: t.id } }); setOpen(false); },

          });

        }

      }

    });



    (clients as any[]).forEach(c => {

      if ((c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q)) {

        clientTotal++;

        if (out.filter(r => r.id.startsWith('client-')).length < CLIENT_LIMIT) {

          out.push({

            id: `client-${c.id}`,

            label: c.name,

            sub: c.company ? `${c.company} · ${c.status}` : c.status || 'Client',

            icon: <Users size={14} color="#5b9fff" />,

            action: () => { navigate('/clients'); setOpen(false); },

          });

        }

      }

    });



    (notes as any[]).forEach((n: any) => {

      if ((n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)) {

        noteTotal++;

        if (out.filter(r => r.id.startsWith('note-')).length < NOTE_LIMIT) {

          out.push({

            id: `note-${n.id}`,

            label: n.title || 'Untitled Note',

            sub: 'Note',

            icon: <FileText size={14} color="#34d18a" />,

            action: () => { navigate('/notes'); setOpen(false); },

          });

        }

      }

    });



    const truncated = taskTotal > TASK_LIMIT || clientTotal > CLIENT_LIMIT || noteTotal > NOTE_LIMIT;

    return { results: out, truncated };

  }, [query, tasks, clients, notes, navigate]);



  useEffect(() => { setTimeout(() => setActive(0), 0); }, [results.length]);



  const handleKey = (e: React.KeyboardEvent) => {

    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }

    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }

    if (e.key === 'Enter' && results[active]) results[active].action();

  };



  const QUICK = [

    { label: 'Dashboard',  path: '/dashboard', icon: <Briefcase size={14} /> },

    { label: 'Work',       path: '/work',       icon: <Music2 size={14} /> },

    { label: 'Finance',    path: '/finance',    icon: <DollarSign size={14} /> },

    { label: 'Clients',    path: '/clients',    icon: <Users size={14} /> },

  ];



  if (!open) return null;



  return (

    <div

      style={{

        position: 'fixed', inset: 0, zIndex: 9600,

        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',

        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',

        paddingTop: 'min(12vh, 80px)', paddingLeft: 16, paddingRight: 16,

      }}

      onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}

    >

      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Search" style={{

        width: '100%', maxWidth: 560,

        background: 'var(--modal-bg, #161616)', border: '1px solid rgba(255,255,255,0.1)',

        borderRadius: 18, overflow: 'hidden',

        boxShadow: 'none',

        animation: 'gsSlide 0.22s cubic-bezier(0.34,1.56,0.64,1) both',

      }}>

        



        {/* Input row */}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

          <Search size={22} color="var(--text-tertiary)" />

          <input

            ref={inputRef}

            value={query}

            onChange={e => setQuery(e.target.value)}

            onKeyDown={handleKey}

            placeholder="Search projects, clients, notes…"

            style={{

              flex: 1, background: 'none', border: 'none', outline: 'none',

              fontSize: 22, fontWeight: 300, color: 'var(--text-primary)', fontFamily: 'inherit',

            }}

          />

          {query && (

            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>

              <X size={15} />

            </button>

          )}

          <kbd style={{ padding: '3px 7px', borderRadius: 6, fontSize: 11, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Esc</kbd>

        </div>



        {/* Results */}

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>

          {query.trim() ? (

            <>

              {results.length > 0 ? results.map((r, i) => (

                <button

                  key={r.id}

                  onClick={r.action}

                  onMouseEnter={() => setActive(i)}

                  onTouchStart={() => setActive(i)}

                  style={{

                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,

                    padding: '10px 18px', background: i === active ? 'rgba(255,255,255,0.06)' : 'none',

                    border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',

                  }}

                >

                  <span style={{ flexShrink: 0 }}>{r.icon}</span>

                  <div style={{ overflow: 'hidden' }}>

                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #fff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>

                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>

                  </div>

                </button>

              )) : (

                <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No results for "{query}"</div>

              )}

              {truncated && (

                <div style={{ padding: '8px 18px 4px', textAlign: 'center', fontSize: 11, color: '#555' }}>

                  Showing top results — refine your search to see more

                </div>

              )}

            </>

          ) : (

            <div style={{ padding: '6px 18px 10px' }}>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Quick Nav</div>

              {QUICK.map(q => (

                <button key={q.path} onClick={() => { navigate(q.path); setOpen(false); }}

                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #aaa)', fontSize: 13, fontFamily: 'inherit' }}>

                  {q.icon} {q.label}

                </button>

              ))}

            </div>

          )}

        </div>



        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 18px', display: 'flex', gap: 16 }}>

          {[['↑↓', 'Navigate'], ['↵', 'Open'], ['Esc', 'Close']].map(([k, v]) => (

            <span key={k} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11, color: '#555' }}>

              <kbd style={{ padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 10 }}>{k}</kbd>

              {v}

            </span>

          ))}

        </div>

      </div>

    </div>

  );

}

