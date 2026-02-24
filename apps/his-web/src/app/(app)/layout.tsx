/**
 * App Layout - Route Group Layout for Protected Routes
 * 
 * This layout wraps all routes under (app) group with:
 * - Sidebar navigation (desktop/tablet)
 * - Topbar with user info
 * - BottomNav (mobile)
 * - FloatingActionButton (mobile)
 * - Build stamp footer
 */

'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { theme } from '../../lib/theme';
import { isValidSession } from '../../lib/auth';
import { formatBuildStamp } from '../../lib/buildStamp';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { FloatingActionButton } from '../../components/layout/FloatingActionButton';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mounted && !isValidSession()) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [pathname, router, mounted]);

  if (!mounted) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: theme.colors.pageBg,
        }}
      >
        <div style={{ width: 240, backgroundColor: theme.colors.surface }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <main style={{ flex: 1, position: 'relative' }}>
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.colors.pageBg,
      }}
    >
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onToggleMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
        
        <main style={{ flex: 1, position: 'relative', paddingBottom: 'var(--cvg-bottom-nav-height, 0)' }}>
          {children}
        </main>
        
        {/* Build Stamp Footer - Desktop only */}
        <footer
          className="cvg-desktop-only"
          style={{
            padding: '8px 16px',
            textAlign: 'right',
            fontSize: '11px',
            color: theme.colors.textSecondary,
            backgroundColor: theme.colors.surface,
            borderTop: `1px solid ${theme.colors.border}`,
            fontFamily: 'monospace',
          }}
        >
          {formatBuildStamp()}
        </footer>
      </div>
      
      {/* Float-first UI components for mobile */}
      <FloatingActionButton />
      <BottomNav />
    </div>
  );
}
