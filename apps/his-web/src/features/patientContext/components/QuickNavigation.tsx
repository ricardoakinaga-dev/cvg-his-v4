'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePatientNavigation, useCurrentPatient, useCurrentStay } from '../PatientContext';
import type { QuickNavItem } from '../types';

/**
 * Get icon for navigation item
 */
function getNavIcon(id: string): string {
  const icons: Record<string, string> = {
    mar: '💊',
    notes: '📝',
    orders: '📋',
    record: '📁',
  };
  return icons[id] || '📄';
}

/**
 * Quick Navigation Component
 * 
 * Provides quick navigation links to MAR, Notes, and Orders modules.
 * Shows badges for pending items.
 */
export function QuickNavigation() {
  const navigation = usePatientNavigation();
  const patient = useCurrentPatient();
  const pathname = usePathname();
  
  if (!patient) {
    return null;
  }
  
  const navItems = Object.values(navigation).filter(Boolean) as QuickNavItem[];
  
  if (navItems.length === 0) {
    return null;
  }
  
  return (
    <nav style={{
      display: 'flex',
      gap: 8,
      padding: '8px 16px',
      background: '#f8fafc',
      borderBottom: '1px solid #e2e8f0',
    }}>
      {navItems.map((item) => {
        const isActive = pathname.includes(item.href.split('?')[0]);
        
        return (
          <Link
            key={item.id}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              background: isActive ? '#0f172a' : '#fff',
              color: isActive ? '#fff' : '#334155',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${isActive ? '#0f172a' : '#e2e8f0'}`,
              transition: 'all 0.2s',
            }}
          >
            <span>{getNavIcon(item.id)}</span>
            <span>{item.label}</span>
            {item.badge && (
              <span style={{
                background: isActive ? '#3b82f6' : '#ef4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 10,
                minWidth: 18,
                textAlign: 'center',
              }}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Vertical Quick Navigation for sidebars
 */
export function QuickNavigationVertical() {
  const navigation = usePatientNavigation();
  const patient = useCurrentPatient();
  const pathname = usePathname();
  
  if (!patient) {
    return null;
  }
  
  const navItems = Object.values(navigation).filter(Boolean) as QuickNavItem[];
  
  if (navItems.length === 0) {
    return null;
  }
  
  return (
    <nav style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {navItems.map((item) => {
        const isActive = pathname.includes(item.href.split('?')[0]);
        
        return (
          <Link
            key={item.id}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: isActive ? '#0f172a' : '#fff',
              color: isActive ? '#fff' : '#334155',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${isActive ? '#0f172a' : '#e2e8f0'}`,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>{getNavIcon(item.id)}</span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span style={{
                background: isActive ? '#3b82f6' : '#ef4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 10,
              }}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Compact Navigation Tabs for tight spaces
 */
export function QuickNavigationTabs() {
  const navigation = usePatientNavigation();
  const patient = useCurrentPatient();
  const pathname = usePathname();
  
  if (!patient) {
    return null;
  }
  
  const navItems = Object.values(navigation).filter(Boolean) as QuickNavItem[];
  
  if (navItems.length === 0) {
    return null;
  }
  
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid #e2e8f0',
    }}>
      {navItems.map((item) => {
        const isActive = pathname.includes(item.href.split('?')[0]);
        
        return (
          <Link
            key={item.id}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 16px',
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? '#0f172a' : '#64748b',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              borderBottom: isActive ? '2px solid #0f172a' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <span>{getNavIcon(item.id)}</span>
            <span>{item.label}</span>
            {item.badge && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: 8,
              }}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
