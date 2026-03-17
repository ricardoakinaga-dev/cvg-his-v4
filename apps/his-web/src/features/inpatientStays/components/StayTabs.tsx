'use client';

import { theme, px } from '@/lib/theme';
import type { StayTabId, StayTab } from '../types';
import { STAY_TABS } from '../types';

export type StayTabsProps = {
  activeTab: StayTabId;
  onTabChange: (tab: StayTabId) => void;
};

export function StayTabs({ activeTab, onTabChange }: StayTabsProps) {
  return (
    <div 
      style={{ 
        display: 'flex', 
        gap: px(4),
        borderBottom: `1px solid ${theme.colors.border}`,
        marginBottom: px(16)
      }}
      role="tablist"
    >
      {STAY_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: `${px(12)} ${px(16)}`,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: px(14),
              fontWeight: isActive ? 600 : 400,
              color: isActive ? theme.colors.primary : theme.colors.textSecondary,
              borderBottom: isActive ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: px(6)
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Tab Content Wrapper
export type StayTabContentProps = {
  children: React.ReactNode;
};

export function StayTabContent({ children }: StayTabContentProps) {
  return (
    <div role="tabpanel" style={{ minHeight: px(200) }}>
      {children}
    </div>
  );
}
