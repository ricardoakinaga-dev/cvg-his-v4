/**
 * Configurações Internação Page - Settings Module
 */

import { SettingsPage } from '../../../../components/settings/SettingsPage';

export default function SettingsInternacaoPage() {
  return (
    <SettingsPage
      namespace="internacao"
      title="Configurações de Internação"
      description="Configurações de internação: verificação dupla de medicação, alertas."
    />
  );
}
