/**
 * Configurações Estoque Page - Settings Module
 */

import { SettingsPage } from '../../../../components/settings/SettingsPage';

export default function SettingsEstoquePage() {
  return (
    <SettingsPage
      namespace="estoque"
      title="Configurações de Estoque"
      description="Configurações de estoque: unidade de medida padrão, alertas de estoque baixo."
    />
  );
}
