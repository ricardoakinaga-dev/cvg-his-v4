/**
 * Configurações Clínica Page - Settings Module
 */

import { SettingsPage } from '../../../../components/settings/SettingsPage';

export default function SettingsClinicaPage() {
  return (
    <SettingsPage
      namespace="clinica"
      title="Configurações da Clínica"
      description="Configurações específicas da clínica: templates SOAP, fluxos de atendimento."
    />
  );
}
