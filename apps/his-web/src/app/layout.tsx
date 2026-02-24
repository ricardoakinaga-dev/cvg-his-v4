import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { assertPublicEnvAtStartup } from '../lib/publicEnv';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'CVG HIS',
  description: 'Interface do sistema hospitalar veterinário'
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  assertPublicEnvAtStartup();

  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
