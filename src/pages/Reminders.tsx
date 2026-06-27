/* eslint-disable @typescript-eslint/no-unused-vars */

import { Global, css } from '@emotion/react';

import React, { useState, useEffect } from 'react';

import { Toast } from '../components/Toast';

import { motion, AnimatePresence } from 'framer-motion';

import { PremiumDatePicker } from '../components/PremiumDatePicker';

import { Calendar as CalendarIcon, CheckCircle2, Circle, Clock, Inbox, Plus, Sun, Trash2, Mic, Package, ChevronRight } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

import { useData } from '../contexts/DataContext';

import { useNavigate } from 'react-router-dom';



export function Reminders() {

  const { user } = useAuth();

  const navigate = useNavigate();

  const { tasks, todos, addTodo, updateTodo, removeTodo } = useData();

  const [activeTab, setActiveTab] = useState<'today' | 'scheduled' | 'all'>('today');

  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [newTaskDate, setNewTaskDate] = useState('');



  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {

    const handler = () => setIsMobile(window.innerWidth <= 768);

    window.addEventListener('resize', handler);

    return () => window.removeEventListener('resize', handler);

  }, []);



  const allReminders = [

    ...todos.filter((t: any) => !t.userId || t.userId === user?.uid).map((todo: any) => ({ ...todo, type: 'todo' })),

    ...tasks.flatMap((task: any) => {

      const items: any[] = [];

      if (task.status !== 'completed' && task.status !== 'delivered') {

        if (task.recordingDate && task.status === 'recording') items.push({ id: `task-rec-${task.id}`, taskId: task.id, title: task.title, isCompleted: false, dueDate: task.recordingDate, type: 'task', subType: 'recording' });

        if (task.deliveryDate) items.push({ id: `task-del-${task.id}`, taskId: task.id, title: task.title, isCompleted: false, dueDate: task.deliveryDate, type: 'task', subType: 'delivery' });

      }

      return items;

    })

  ];



  const filteredTodos = allReminders.filter((todo: any) => {

    if (activeTab === 'today') {

      return todo.dueDate && todo.dueDate.startsWith(todayStr);

    }

    if (activeTab === 'scheduled') {

      return todo.dueDate && todo.dueDate > todayStr;

    }

    return true; // 'all'

  }).sort((a, b) => {

    if (!a.dueDate) return 1;

    if (!b.dueDate) return -1;

    return a.dueDate.localeCompare(b.dueDate);

  });



  const handleAddTodo = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!newTaskTitle.trim()) { setErrorToast('Please enter a task title.'); return; }



    try {

      let dueDate = newTaskDate;

      if (!dueDate && activeTab === 'today') dueDate = todayStr;



      await addTodo({

        title: newTaskTitle,

        isCompleted: false,

        dueDate: dueDate || '',

        createdAt: new Date().toISOString(),

        userId: user?.uid

      });

      setNewTaskTitle('');

      setNewTaskDate('');

    } catch (error) {

      console.error('Error adding todo:', error);

      setErrorToast('Failed to add reminder. Please try again.');

    }

  };



  const toggleTodo = async (todo: any) => {

    try {

      await updateTodo(todo.id, { isCompleted: !todo.isCompleted });

    } catch (error) {

      console.error('Error updating todo:', error);

      setErrorToast('Failed to update reminder. Please try again.');

    }

  };



  const deleteTodo = async (id: string) => {

    try {

      await removeTodo(id);

    } catch (error) {

      console.error('Error deleting todo:', error);

      setErrorToast('Failed to delete reminder. Please try again.');

    }

  };



  const formatDueDate = (dateStr: string) => {

    if (!dateStr) return '';

    const date = new Date(dateStr);

    const dateOnly = dateStr.slice(0, 10);

    if (dateOnly === todayStr) {

      return `Today ${dateStr.includes('T') ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}`;

    }

    const tmrw = new Date(new Date().getTime() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    if (dateOnly === tmrw) {

      return `Tomorrow ${dateStr.includes('T') ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}`;

    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (dateStr.includes('T') ? ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

  };



  const tabConfig = {

    today: { color: 'var(--accent-blue)', bg: 'var(--gradient-primary)', icon: Sun, title: 'Today' },

    scheduled: { color: 'var(--accent-red)', bg: 'var(--gradient-warm)', icon: CalendarIcon, title: 'Scheduled' },

    all: { color: 'var(--text-tertiary)', bg: 'linear-gradient(135deg, var(--text-tertiary), var(--text-secondary))', icon: Inbox, title: 'All' }

  };



  const _activeTabConfig = tabConfig[activeTab];



  return (

    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : 'var(--space-8)', height: isMobile ? 'auto' : 'calc(100vh - 120px)', overflow: isMobile ? 'visible' : 'hidden' }}>



      {/* ─── Sidebar / Smart Lists ─── */}

      <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        <h1 className="page-title" style={{ paddingLeft: 4 }}>Reminders</h1>



        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

          {[

            { key: 'today', label: 'Today', count: allReminders.filter((t: any) => t.dueDate?.startsWith(todayStr)).length, color: 'var(--accent-blue)' },

            { key: 'scheduled', label: 'Scheduled', count: allReminders.filter((t: any) => t.dueDate > todayStr).length, color: 'var(--accent-red)' },

            { key: 'all', label: 'All', count: allReminders.length, color: 'var(--text-secondary)' },

          ].map(tab => (

            <div

              key={tab.key}

              onClick={() => setActiveTab(tab.key as any)}

              style={{

                display: 'flex', justifyContent: 'space-between', alignItems: 'center',

                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',

                background: activeTab === tab.key ? 'var(--surface-1)' : 'transparent',

                border: `1px solid ${activeTab === tab.key ? 'var(--border-color)' : 'transparent'}`,

                transition: 'all 0.15s'}}

            >

              <span style={{ fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 400, color: activeTab === tab.key ? tab.color : 'var(--text-secondary)' }}>{tab.label}</span>

              <span style={{ fontSize: 13, fontWeight: 600, color: activeTab === tab.key ? tab.color : 'var(--text-tertiary)' }}>{tab.count}</span>

            </div>

          ))}

        </div>



        {/* Instructions/Help block */}

        {!isMobile && (

        <div style={{ marginTop: 'auto', padding: '16px', background: 'var(--card-bg)', borderRadius: 10, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>

            System tasks sync from your projects automatically. Custom reminders can be added, completed, or deleted.

          </p>

        </div>

        )}

      </div>



      {/* ─── Main Content Area ─── */}

      <div style={{ flex: 1, background: 'var(--card-bg)', borderRadius: 8, padding: isMobile ? '16px' : '20px 24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: isMobile ? 400 : 'auto' }}>

        

        {/* Large Header */}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexShrink: 0 }}>

          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>

            {tabConfig[activeTab].title}

          </h2>

          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{filteredTodos.length}</span>

        </div>



        {/* Task List */}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '12px' }} className="custom-scrollbar">

          <AnimatePresence>

            {(() => {

              const lastDateStr = '';

              return filteredTodos.map((todo: any) => {

                const dateOnly = todo.dueDate ? todo.dueDate.slice(0, 10) : 'No Date';

                const showHeader = dateOnly !== lastDateStr && activeTab !== 'today';

                 

                /* lastDateStr reassigned */
                /* removed */



                return (

                  <div key={todo.id}>

                    {showHeader && (

                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', marginTop: '24px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>

                        {dateOnly === todayStr ? 'Today' : 

                         dateOnly === new Date(new Date().getTime() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10) ? 'Tomorrow' : 

                         new Date(dateOnly).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}

                      </div>

                    )}

                    <motion.div 

                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}

                      style={{ 

                        display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '12px 16px', 

                        background: todo.isCompleted ? 'rgba(0,0,0,0.01)' : 'var(--bg-color)', 

                        borderRadius: '12px', marginBottom: '8px', cursor: todo.type === 'task' ? 'pointer' : 'default', 

                        transition: 'all 0.2s', border: `1px solid ${todo.isCompleted ? 'transparent' : 'var(--border-color)'}`,

                        opacity: todo.isCompleted ? 0.6 : 1

                      }}

                      onMouseOver={e => e.currentTarget.style.transform = todo.type === 'task' ? 'translateX(4px)' : 'none'}

                      onMouseOut={e => e.currentTarget.style.transform = 'none'}

                      onClick={() => todo.type === 'task' && navigate('/work', { state: { openTaskId: todo.taskId } })}

                    >

                      <div 

                        onClick={(e) => { e.stopPropagation(); if (todo.type !== 'task') toggleTodo(todo); }} 

                        style={{ cursor: todo.type === 'task' ? 'default' : 'pointer', color: todo.isCompleted ? tabConfig[activeTab].color : 'var(--text-tertiary)', opacity: todo.type === 'task' ? 0.3 : 1, marginTop: '2px', transition: 'all 0.2s' }}

                      >

                        {todo.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}

                      </div>

                      

                      <div style={{ flex: 1, minWidth: 0 }}>

                        <div style={{ fontSize: '15px', fontWeight: '700', color: todo.isCompleted ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: todo.isCompleted ? 'line-through' : 'none', marginBottom: '6px', lineHeight: 1.3 }}>

                          {todo.title}

                        </div>

                        

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>

                          {todo.dueDate && (

                            <div style={{ fontSize: '13px', color: todo.dueDate.startsWith(todayStr) && !todo.isCompleted ? tabConfig[activeTab].color : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>

                              {todo.dueDate.includes('T') ? <Clock size={14} /> : <CalendarIcon size={14} />}

                              {formatDueDate(todo.dueDate)}

                            </div>

                          )}

                          {todo.type === 'task' && (

                            <span style={{

                              fontSize: '11px', background: todo.subType === 'recording' ? 'rgba(255, 59, 48, 0.08)' : 'rgba(52, 199, 89, 0.08)',

                              color: todo.subType === 'recording' ? 'var(--color-danger)' : 'var(--color-success)', padding: '2px 8px', borderRadius: '999px',

                              fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px'

                            }}>

                              {todo.subType === 'recording' ? <Mic size={11} /> : <Package size={11} />}

                              {todo.subType === 'recording' ? 'recording' : 'delivery'}

                            </span>

                          )}

                        </div>

                      </div>

                      

                      <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', paddingLeft: 16 }}>

                        {todo.type === 'todo' ? (

                          <button onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', opacity: 0, transition: 'all 0.2s' }} className="delete-btn" title="Delete Todo">

                            <Trash2 size={18} />

                          </button>

                        ) : (

                          <ChevronRight size={20} color="var(--text-tertiary)" opacity={0.5} />

                        )}

                      </div>

                      <Global styles={css`.task-row:hover .delete-btn { opacity: 0.8 !important; } .delete-btn:hover { opacity: 1 !important; background: rgba(255,59,48,0.1) !important; }`} />

                    </motion.div>

                  </div>

                );

              });

            })()}

          </AnimatePresence>

          

          {filteredTodos.length === 0 && (

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-tertiary)', fontSize: 13 }}>

              Nothing here

            </div>

          )}

        </div>



        {/* Add New Todo Form */}

        <form onSubmit={handleAddTodo} style={{ 

          marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', 

          padding: '12px 16px', background: 'var(--bg-color)', borderRadius: '16px', 

          border: '1px solid var(--border-color)', flexShrink: 0,

          boxShadow: 'none'

        }}>

          <div style={{ color: tabConfig[activeTab].color, display: 'flex' }}><Plus size={20} strokeWidth={2.5} /></div>

          <input 

            type="text" 

            placeholder="Add a new reminder..." 

            value={newTaskTitle}

            onChange={e => setNewTaskTitle(e.target.value)}

            style={{ 

              flex: 1, background: 'transparent', border: 'none', outline: 'none', 

              fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600',

              letterSpacing: '-0.2px'

            }}

          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            <div style={{ width: 180 }}>

              <PremiumDatePicker

                selected={newTaskDate ? new Date(newTaskDate) : null}

                onChange={date => setNewTaskDate(date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')}

                placeholderText="Date & Time"

              />

            </div>

            <button

              type="submit"

              disabled={!newTaskTitle.trim()}

              style={{

                background: newTaskTitle.trim() ? tabConfig[activeTab].color : 'var(--border-color)',

                color: newTaskTitle.trim() ? 'white' : 'var(--text-tertiary)', border: 'none',

                width: 34, height: 34, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',

                cursor: newTaskTitle.trim() ? 'pointer' : 'not-allowed', transition: 'opacity 0.15s'}}

            >

              <Plus size={18} strokeWidth={2.5} />

            </button>

          </div>

        </form>

      </div>

      {errorToast && <Toast message={errorToast} type="error" onClose={() => setErrorToast(null)} />}

    </div>

  );

}

