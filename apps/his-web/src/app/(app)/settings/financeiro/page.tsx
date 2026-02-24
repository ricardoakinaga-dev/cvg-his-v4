/**
 * Configurações Financeiro Page - Settings Module
 */

import { SettingsPage } from '../../../../components/settings/SettingsPage';

export default function SettingsFinanceiroPage() {
  return (
    <SettingsPage
      namespace="financeiro"
      title="Configurações Financeiras"
      description="Configurações financeiras: termos de pagamento padrão, impostos."
    />
  );
}
