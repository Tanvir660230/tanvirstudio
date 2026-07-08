import React from 'react';
import { StickyNote } from 'lucide-react';
import { Card } from './Card';

interface NotesSectionProps {
  description?: string;
  notes?: string;
}

export function NotesSection({ description, notes }: NotesSectionProps) {
  return (
    <Card title="Notes & Instructions" icon={<StickyNote size={15} color="var(--color-warning)" />} color="var(--color-warning)">
      {description && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.15)', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500, marginBottom: notes ? 10 : 0 }}>
          {description}
        </div>
      )}
      {notes && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
          {notes}
        </div>
      )}
    </Card>
  );
}
