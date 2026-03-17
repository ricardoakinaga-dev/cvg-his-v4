export default function HomePage(): JSX.Element {
  return (
    <section
      style={{
        display: 'grid',
        gap: 16
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 20
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>HIS Fase 1</h1>
        <p style={{ margin: 0, color: '#475569' }}>
          Esqueleto inicial da interface: autenticação por token, rota protegida, layout base e
          cliente HTTP com tratamento de 401.
        </p>
      </div>
    </section>
  );
}
