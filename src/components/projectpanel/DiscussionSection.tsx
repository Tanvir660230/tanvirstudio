import React from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface DiscussionSectionProps {
  task: any;
  userData: any;
  allComments: any[];
  lastComments: any[];
  hiddenCommentCount: number;
  onClose: () => void;
  onOpenFull: (task: any) => void;
  newMessage: string;
  setNewMessage: (val: string) => void;
  isSending: boolean;
  handleAddMessage: (e: React.FormEvent) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  safeDate: (val: any, opts: Intl.DateTimeFormatOptions, fallback?: string) => string;
}

export function DiscussionSection({
  task, userData, allComments, lastComments, hiddenCommentCount,
  onClose, onOpenFull, newMessage, setNewMessage, isSending,
  handleAddMessage, messagesEndRef, safeDate,
}: DiscussionSectionProps) {
  return (
    <div style={{ flexShrink: 0, background: 'var(--card-bg)', borderRadius: 20, border: '1px solid var(--border-color)', boxShadow: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', opacity: 0.5 }} />
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(to bottom, var(--bg-color), transparent)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(175,82,222,0.15), rgba(175,82,222,0.05))', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}>
          <MessageSquare size={14} color="var(--accent-purple)" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Team Discussion</span>
        {allComments.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 999 }}>
            {allComments.length} msg{allComments.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {hiddenCommentCount > 0 && (
            <button onClick={() => { onClose(); onOpenFull(task); }} style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', fontSize: 12, color: 'var(--color-info)', fontWeight: 700, textAlign: 'left' }}>
              ↑ {hiddenCommentCount} older message{hiddenCommentCount !== 1 ? 's' : ''} — open full project to view
            </button>
          )}
          {(() => {
            const visibleComments = lastComments;
            if (visibleComments.length === 0) return (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>No messages yet.</div>
            );
            return visibleComments.map((c: any) => {
              const isMine = c.userId === userData?.uid;
              return (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: 16, borderBottomRightRadius: isMine ? 4 : 16, borderBottomLeftRadius: !isMine ? 4 : 16, background: isMine ? 'linear-gradient(135deg, #007AFF, #0062CC)' : 'var(--bg-color)', border: isMine ? 'none' : '1px solid var(--border-color)', boxShadow: isMine ? '0 4px 12px rgba(0,122,255,0.2)' : '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: isMine ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)' }}>{c.userName}</span>
                    </div>
                    <p style={{ fontSize: 13, color: isMine ? '#FFFFFF' : 'var(--text-secondary)', margin: 0, lineHeight: 1.4, fontWeight: 500, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {(() => {
                        if (!c.text) return null;
                        const tokenRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|@\w+)/g;
                        return c.text.split(tokenRegex).map((part: string, i: number) => {
                          if (/^https?:\/\//.test(part) || /^www\./.test(part)) {
                            const href = part.startsWith('http') ? part : `https://${part}`;
                            return <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: isMine ? 'rgba(255,255,255,0.9)' : 'var(--color-info)', textDecoration: 'underline', fontWeight: 700 }}>{part}</a>;
                          }
                          if (/^@\w+/.test(part)) {
                            return <span key={i} style={{ color: isMine ? '#FFD60A' : 'var(--color-warning)', fontWeight: 800 }}>{part}</span>;
                          }
                          return <span key={i}>{part}</span>;
                        });
                      })()}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', marginTop: 4, padding: '0 4px' }}>
                    {safeDate(c.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              );
            });
          })()}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleAddMessage} style={{ display: 'flex', gap: 10 }}>
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." disabled={isSending} style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-color)', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', boxShadow: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.currentTarget.style.borderColor='#007AFF50'} onBlur={e => e.currentTarget.style.borderColor='var(--border-color)'} />
          <button type="submit" disabled={!newMessage.trim() || isSending} style={{ background: 'linear-gradient(135deg, #007AFF, #00C6FF)', color: 'white', border: 'none', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (newMessage.trim() && !isSending) ? 'pointer' : 'default', opacity: (newMessage.trim() && !isSending) ? 1 : 0.5, flexShrink: 0, padding: 0, boxShadow: (newMessage.trim() && !isSending) ? '0 4px 12px rgba(0,122,255,0.3)' : 'none', transition: 'all 0.2s' }} onMouseOver={e => (newMessage.trim() && !isSending) && (e.currentTarget.style.transform='scale(1.05)')} onMouseOut={e => (e.currentTarget.style.transform='scale(1)')}>
            <Send size={16} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
