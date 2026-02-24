/**
 * Comandas Page - Financeiro Module
 */

import { PlaceholderPage } from '../../../../components/layout/PlaceholderPage';

export default function ComandasPage() {
  return (
    <PlaceholderPage
      title="Comandas"
      moduleName="Financeiro"
      description="Gestão de comandas e faturamento. Controle de serviços prestados e valores devidos."
      features={[
        'Abertura de comandas',
        'Lançamento de serviços',
        'Fechamento e faturamento',
        'Notas fiscais',
        'Contas a receber',
      ]}
    />
  );
}
