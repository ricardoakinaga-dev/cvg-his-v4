/**
 * Prescrições Page - Clínica Module
 */

import { PlaceholderPage } from '../../../../components/layout/PlaceholderPage';

export default function PrescricoesPage() {
  return (
    <PlaceholderPage
      title="Prescrições"
      moduleName="Clínica"
      description="Gestão de prescrições médicas. Criação, controle e acompanhamento de prescrições de medicamentos."
      features={[
        'Criação de prescrições',
        'Validação de interações medicamentosas',
        'Controle de validade',
        'Renovação de prescrições',
        'Histórico por paciente',
      ]}
    />
  );
}
