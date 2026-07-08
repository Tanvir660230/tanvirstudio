/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { Plus, StickyNote, Trash2, Pin, PinOff, Search, X, Edit2, Check } from 'lucide-react';

import { useData } from '../contexts/DataContext';

import { Toast } from '../components/Toast';



export function Notes() {

  const { notes: rawNotes, addNote: addNoteRef, updateNote, removeNote } = useData();

  const [newNote, setNewNote] = useState('');

  const [selectedColor, setSelectedColor] = useState('yellow');

  const [showToast, setShowToast] = useState(false);

  const [pendingDeleteNote, setPendingDeleteNote] = useState<{ id: string; note: any; timer: ReturnType<typeof setTimeout> } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editContent, setEditContent] = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [errorToast, setErrorToast] = useState<string | null>(null);

  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {

    const handler = () => setIsMobile(window.innerWidth <= 768);

    window.addEventListener('resize', handler);

    return () => window.removeEventListener('resize', handler);

  }, []);



  useEffect(() => {

    return () => {

      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);

    };

  }, []);



  const notes = rawNotes

    .filter((n: any) => !searchQuery || (n.content || '').toLowerCase().includes(searchQuery.toLowerCase()))

    .sort((a: any, b: any) => {

      if (a.pinned && !b.pinned) return -1;

      if (!a.pinned && b.pinned) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    });



  const togglePin = async (note: any) => {

    try { await updateNote(note.id, { pinned: !note.pinned }); } catch (err) { console.error(err); setErrorToast('Failed to update note. Please try again.'); }

  };



  const startEdit = (note: any) => { setEditingId(note.id); setEditContent(note.content); };

  const saveEdit = async (id: string) => {

    if (!editContent.trim()) return;

    try { await updateNote(id, { content: editContent }); } catch (err) { console.error(err); setErrorToast('Failed to save note. Please try again.'); }

    setEditingId(null); setEditContent('');

  };



  const colors = [

    { id: 'yellow', bg: 'rgba(255, 204, 0, 0.1)', border: 'rgba(255, 204, 0, 0.2)' },

    { id: 'blue', bg: 'rgba(0, 122, 255, 0.1)', border: 'rgba(0, 122, 255, 0.2)' },

    { id: 'green', bg: 'rgba(52, 199, 89, 0.1)', border: 'rgba(52, 199, 89, 0.2)' },

    { id: 'red', bg: 'rgba(255, 59, 48, 0.1)', border: 'rgba(255, 59, 48, 0.2)' }

  ];



  const handleKeyDown = (e: React.KeyboardEvent) => {

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {

      addNote();

    }

  };



  const addNote = async () => {

    if (!newNote.trim()) { setErrorToast('Please enter a note first.'); return; }

    try {

      await addNoteRef({

        content: newNote,

        color: selectedColor,

        pinned: false,

        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),

        createdAt: new Date().toISOString()

      });

      setNewNote('');

      setShowToast(true);

    } catch (err) {

      console.error('Error adding note:', err);

      setErrorToast('Failed to add note. Please try again.');

    }

  };



  const deleteNote = (id: string) => {

    const note = rawNotes.find((n: any) => n.id === id);

    if (!note) return;

    if (pendingDeleteNote) {

      clearTimeout(pendingDeleteNote.timer);

      removeNote(pendingDeleteNote.id).catch(console.error);

    }

    const timer = setTimeout(() => {

      removeNote(id).catch(console.error);

      setPendingDeleteNote(null);

    }, 5000);

    pendingTimerRef.current = timer;

    setPendingDeleteNote({ id, note, timer });

    setShowToast(true);

  };



  return (

    <div style={{  }}>

      <div className="page-header">

        <div className="page-header-left">

          <h1 className="page-title">Scratchpad</h1>

          <p className="page-subtitle">Quick ideas and production reminders.</p>

        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

          <div style={{ position: 'relative' }}>

            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />

            <input

              type="text"

              placeholder="Search notes..."

              value={searchQuery}

              onChange={e => setSearchQuery(e.target.value)}

              className="form-input"

              style={{ paddingLeft: 30, paddingRight: searchQuery ? 28 : 12, height: 34, fontSize: 13, width: isMobile ? 140 : 180 }}

            />

            {searchQuery && (

              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}>

                <X size={12} />

              </button>

            )}

          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', background: 'var(--surface-1)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>

            <StickyNote size={13} color="var(--text-tertiary)" />

            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 700 }}>{rawNotes.length} Notes</span>

          </div>

        </div>

      </div>



      <motion.div layout className="card" style={{ marginBottom: 'var(--space-8)', padding: 'var(--space-8)', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>

         <textarea 

            placeholder="Type a new idea... (Press Cmd+Enter to save)"

            style={{ 

              width: '100%', minHeight: '140px', background: 'transparent', border: 'none',

              color: 'var(--text-primary)', fontSize: '18px', fontWeight: '500', outline: 'none', resize: 'none',

              lineHeight: '1.6', letterSpacing: '-0.2px'

            }}

            value={newNote}

            onChange={e => setNewNote(e.target.value)}

            onKeyDown={handleKeyDown}

         />

         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>

            <div style={{ display: 'flex', gap: '12px' }}>

               {colors.map(c => (

                 <button

                    key={c.id}

                    className="note-color-swatch"

                    onClick={() => setSelectedColor(c.id)}

                    style={{

                      width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',

                      background: c.bg, border: `2px solid ${selectedColor === c.id ? 'var(--text-primary)' : 'transparent'}`,

                      boxShadow: selectedColor === c.id ? `0 0 0 2px var(--bg-color) inset` : 'none',

                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',

                      transform: selectedColor === c.id ? 'scale(1.15)' : 'scale(1)'

                    }} 

                 />

               ))}

            </div>

            <button className="btn btn-primary" onClick={addNote} style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '700' }}>

               Save Note

            </button>

         </div>

      </motion.div>



      <div style={{ columnCount: isMobile ? 1 : 3, columnGap: '24px' }}>

         <AnimatePresence mode="popLayout">

            {notes.map((note: any) => {

              const theme = colors.find(c => c.id === note.color) || colors[0];

              return (

                <motion.div 

                  layout

                  initial={{ opacity: 0, y: 20 }}

                  animate={{ opacity: 1, y: 0 }}

                  exit={{ opacity: 0, scale: 0.95 }}

                  key={note.id} 

                  className="card" 

                  style={{ 

                    background: theme.bg, border: `1px solid ${theme.border}`, 

                    position: 'relative', breakInside: 'avoid', marginBottom: '24px',

                    padding: '18px', borderRadius: '12px'

                  }}

                >

                   {note.pinned && (

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>

                      <Pin size={11} color="var(--color-info)" />

                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-info)' }}>pinned</span>

                    </div>

                  )}

                  {editingId === note.id ? (

                    <textarea

                      autoFocus

                      value={editContent}

                      onChange={e => setEditContent(e.target.value)}

                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveEdit(note.id); if (e.key === 'Escape') { setEditingId(null); setEditContent(''); } }}

                      style={{ width: '100%', minHeight: 100, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.6', fontWeight: '500', marginBottom: 16, whiteSpace: 'pre-wrap', letterSpacing: '-0.1px', fontFamily: 'inherit' }}

                    />

                  ) : (

                    <div style={{ fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.6', fontWeight: '500', marginBottom: '32px', whiteSpace: 'pre-wrap', letterSpacing: '-0.1px' }}>

                      {note.content}

                    </div>

                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                     <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '400' }}>{note.date}</span>

                     <div style={{ display: 'flex', gap: 6 }}>

                       {editingId === note.id ? (

                         <button onClick={() => saveEdit(note.id)} className="btn" style={{ background: 'rgba(52,199,89,0.1)', padding: '6px 10px', borderRadius: '8px', color: 'var(--color-success)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>

                           <Check size={13} /> Save

                         </button>

                       ) : (

                         <button onClick={() => startEdit(note)} className="btn btn-icon" title="Edit note" style={{ background: 'transparent', padding: '6px', borderRadius: '8px', color: 'var(--text-tertiary)', border: 'none', cursor: 'pointer' }}>

                           <Edit2 size={14} />

                         </button>

                       )}

                       <button

                          onClick={() => togglePin(note)}

                          className="btn btn-icon"

                          title={note.pinned ? 'Unpin' : 'Pin to top'}

                          style={{ background: note.pinned ? 'rgba(0,122,255,0.1)' : 'transparent', padding: '6px', borderRadius: '8px', color: note.pinned ? 'var(--color-info)' : 'var(--text-tertiary)', border: 'none', cursor: 'pointer' }}

                       >

                          {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}

                       </button>

                       <button

                          onClick={() => deleteNote(note.id)}

                          className="btn btn-icon"

                          style={{ background: 'rgba(255,59,48,0.05)', padding: '6px', borderRadius: '8px', color: 'var(--accent-red)', border: 'none', cursor: 'pointer' }}

                       >

                          <Trash2 size={14} />

                       </button>

                     </div>

                  </div>

                </motion.div>

              );

            })}

         </AnimatePresence>

      </div>



      {showToast && <Toast

        message={pendingDeleteNote ? 'Note deleted' : 'Note added successfully!'}

        type={pendingDeleteNote ? 'warning' : 'success'}

        onClose={() => setShowToast(false)}

        onUndo={pendingDeleteNote ? () => {

          clearTimeout(pendingDeleteNote.timer);

          setPendingDeleteNote(null);

          setShowToast(false);

        } : undefined}

      />}

      {errorToast && <Toast message={errorToast} type="error" onClose={() => setErrorToast(null)} />}

    </div>

  );

}

