import { BedMap } from '../../../components/BedMap';

export default function InpatientBedMapPage(): JSX.Element {
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
        <h1 style={{ margin: '0 0 8px' }}>Internação • Bed Map</h1>
        <p style={{ margin: 0, color: '#475569' }}>
          Visualize os leitos por ala e execute admissão, transferência e alta com atualização
          imediata.
        </p>
      </div>

      <BedMap />
    </section>
  );
}
