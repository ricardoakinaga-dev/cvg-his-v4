/**
 * Orçamentos Page - Financeiro Module
 */

import { PlaceholderPage } from '../../../../components/layout/PlaceholderPage';

export default function OrcamentosPage() {
  return (
    <PlaceholderPage
      title="Orçamentos"
      moduleName="Financeiro"
      description="Gestão de orçamentos para clientes. Criação, aprovação e controle de orçamentos."
      features={[
        'Criação de orçamentos',
        'Aprovação pelo cliente',
        'Conversão em comanda',
        'Validade de orçamentos',
        'Histórico de versões',
      ]}
    />
  );
}
