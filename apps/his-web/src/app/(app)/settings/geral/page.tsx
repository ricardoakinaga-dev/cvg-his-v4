/**
 * Configurações Gerais Page - Settings Module
 */

import { SettingsPage } from '../../../../components/settings/SettingsPage';

export default function SettingsGeralPage() {
  return (
    <SettingsPage
      namespace="geral"
      title="Configurações Gerais"
      description="Configurações gerais do sistema: dados da clínica, horários e preferências."
    />
  );
}
