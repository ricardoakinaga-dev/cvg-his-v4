'use client';

/**
 * Atendimentos Page - Clínica Module
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Button } from '../../../../components/ui/Button';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { Can } from '../../../../components/auth/Can';
import { PERMISSIONS } from '../../../../lib/rbac';
import { EncounterList } from '../../../../components/encounters/EncounterList';

export default function AtendimentosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Atendimentos"
        description="Gestão de atendimentos clínicos. Acompanhamento de consultas, emergências e procedimentos ambulatoriais."
        actions={
          <Can permission={PERMISSIONS.ENCOUNTER_WRITE}>
            <Link href="/clinica/atendimentos/novo">
              <Button>Nova Consulta</Button>
            </Link>
          </Can>
        }
      />

      <Suspense fallback={<LoadingState message="Carregando..." />}>
        <EncounterList />
      </Suspense>
    </div>
  );
}
