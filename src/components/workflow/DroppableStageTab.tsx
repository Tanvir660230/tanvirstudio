/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';

interface DroppableStageTabProps {
  col: { id: string; title: string; color: string; icon?: React.ReactNode };
  isActive: boolean;
  isDropTarget: boolean;
  activeId: string | null;
  colCount: number;
  overdueCount: number;
  onClick: () => void;
}

export function DroppableStageTab({
  col,
  isActive,
  isDropTarget,
  activeId: _activeId,
  colCount,
  overdueCount,
  onClick
}: DroppableStageTabProps) {
  const { setNodeRef } = useDroppable({ id: col.id });

  return (
    <div ref={setNodeRef} style={{ display: 'flex' }}>
      <motion.div
        onClick={onClick}
        whileHover={{ scale: 1.03, translateY: -2 }}
        whileTap={{ scale: 0.97 }}
        animate={isDropTarget ? {
          scale: 1.06,
          y: -4,
          boxShadow: [
            `0 0 0 0px ${col.color}00`,
            `0 0 20px 6px ${col.color}50`,
            `0 0 0 0px ${col.color}00`
          ]
        } : {
          scale: 1, y: 0,
          boxShadow: isActive
            ? `0 12px 30px ${col.color}25`
            : '0 4px 20px rgba(0,0,0,0.03)'
        }}
        transition={isDropTarget
          ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
        }
        style={{
          flex: 1,
          background: 'var(--card-bg)',
          borderRadius: '16px',
          padding: '14px 12px',
          cursor: 'pointer',
          border: isActive
            ? `1px solid ${col.color}`
            : isDropTarget
            ? `1px solid ${col.color}`
            : '1px solid transparent',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          transition: 'border-color 0.25s',
        }}
      >
        {/* Active tint overlay */}
        {isActive && (
          <div style={{
            position: 'absolute', inset: 0,
            background: col.color,
            opacity: 0.05,
            borderRadius: '16px',
            borderLeft: `4px solid ${col.color}`
          }} />
        )}

        {/* Drop scanning shimmer */}
        {isDropTarget && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg, transparent, ${col.color}20, transparent)`,
            }}
          />
        )}

        {/* Top row: icon badge + count */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '10px',
          position: 'relative', zIndex: 1
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '8px',
            background: isActive ? col.color : 'var(--surface-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isActive ? 'white' : 'var(--text-tertiary)',
            boxShadow: isActive ? `0 2px 8px ${col.color}40` : 'none',
            transition: 'all 0.25s',
            fontSize: 16,
          }}>
            {col.icon}
          </div>
          <span style={{
            fontSize: '17px', fontWeight: '700',
            color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1,
          }}>
            {isDropTarget ? '+' : colCount}
          </span>
        </div>

        {/* Stage title */}
        <div style={{
          fontSize: '13px', fontWeight: '600',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          position: 'relative', zIndex: 1,
          transition: 'color 0.2s',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {isDropTarget ? 'Drop here' : col.title}
        </div>

        {/* Overdue badge */}
        {overdueCount > 0 && !isDropTarget && (
          <div style={{
            marginTop: 6, position: 'relative', zIndex: 1,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)',
            padding: '3px 8px', borderRadius: '7px',
            fontSize: '11px', fontWeight: '500',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />
            {overdueCount} late
          </div>
        )}
      </motion.div>
    </div>
  );
}
