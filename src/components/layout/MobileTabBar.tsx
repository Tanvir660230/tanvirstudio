import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import type { UserRole } from '../../types';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactElement;
}

interface MobileTabBarProps {
  navItems: NavItem[];
  tabShortLabels: Record<string, string>;
  userRole: UserRole | undefined;
  onMoreClick: () => void;
}

const ADMIN_MAIN_PATHS = ['/dashboard', '/work', '/clients', '/finance'];
const DEFAULT_MAIN_PATHS = ['/dashboard', '/work', '/calendar', '/notes'];

export function MobileTabBar({ navItems, tabShortLabels, userRole, onMoreClick }: MobileTabBarProps) {
  const location = useLocation();
  const mainPaths = userRole === 'admin' ? ADMIN_MAIN_PATHS : DEFAULT_MAIN_PATHS;
  const onSecondaryRoute = !mainPaths.includes(location.pathname);

  return (
    <nav className="mobile-tab-bar">
      {mainPaths.map(path => {
        const item = navItems.find(i => i.path === path);
        if (!item) return null;
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} className={`mobile-tab-item ${isActive ? 'active' : ''}`}>
            {isActive && (
              <motion.div
                layoutId="mobile-tab-dot"
                style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 18, height: 3, borderRadius: '0 0 3px 3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-gold))' }}
                transition={{ type: 'spring', stiffness: 480, damping: 38 }}
              />
            )}
            {React.cloneElement(item.icon as React.ReactElement<{ size?: number; strokeWidth?: number }>, {
              size: 21,
              strokeWidth: isActive ? 2.4 : 1.8,
            })}
            <span>{tabShortLabels[item.path] ?? item.label.split(' ')[0]}</span>
          </Link>
        );
      })}

      {/* More tab */}
      <div
        role="button"
        aria-label="More options"
        tabIndex={0}
        className={`mobile-tab-item ${onSecondaryRoute ? 'active' : ''}`}
        onClick={onMoreClick}
      >
        {onSecondaryRoute && (
          <motion.div
            layoutId="mobile-tab-dot"
            style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 18, height: 3, borderRadius: '0 0 3px 3px', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-gold))' }}
            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
          />
        )}
        <Menu size={21} strokeWidth={onSecondaryRoute ? 2.4 : 1.8} />
        <span>More</span>
      </div>
    </nav>
  );
}
