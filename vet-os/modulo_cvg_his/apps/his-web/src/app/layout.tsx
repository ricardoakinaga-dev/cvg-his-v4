import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppShell } from '../components/layout/AppShell';
import { assertPublicEnvAtStartup } from '../lib/publicEnv';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'CVG HIS',
  description: 'Interface do sistema hospitalar veterinário'
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  assertPublicEnvAtStartup();

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif'
        }}
      >
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
