import { HandoverEditor } from '../../../components/HandoverEditor';

export default function InpatientHandoversPage(): JSX.Element {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 20
        }}
      >
        <h1 style={{ margin: '0 0 8px' }}>Plantão por Ala</h1>
        <p style={{ margin: 0, color: '#475569' }}>
          Monte o handover estruturado por internação, publique e acompanhe o processamento do
          documento.
        </p>
      </div>

      <HandoverEditor />
    </section>
  );
}

