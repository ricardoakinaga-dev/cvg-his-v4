/**
 * Pagamentos Page - Financeiro Module
 */

import { PlaceholderPage } from '../../../../components/layout/PlaceholderPage';

export default function PagamentosPage() {
  return (
    <PlaceholderPage
      title="Pagamentos"
      moduleName="Financeiro"
      description="Gestão de pagamentos e recebimentos. Controle de caixa, formas de pagamento e conciliação."
      features={[
        'Registro de pagamentos',
        'Múltiplas formas de pagamento',
        'Controle de caixa',
        'Conciliação bancária',
        'Relatórios financeiros',
      ]}
    />
  );
}
