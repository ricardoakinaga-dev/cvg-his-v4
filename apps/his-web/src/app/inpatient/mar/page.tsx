import { MedDueList } from '../../../components/MedDueList';

import { MarConsole } from '../../../features/mar/MarConsole';

export default function MarPage(): JSX.Element {
  return (
    <div style={{ padding: 20 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Administração de Medicamentos (MAR)</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b' }}>
          Selecione uma ala e um paciente para visualizar e registrar doses.
        </p>
      </header>

      <MarConsole />
    </div>
  );
}
