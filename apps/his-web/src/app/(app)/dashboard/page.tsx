/**
 * Dashboard Page - Main Dashboard
 */

import { PageShell } from '../../../components/layout/PageShell';

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      subtitle="Visão geral do sistema"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}
      >
        {/* Quick Stats */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#475569' }}>
            Atendimentos Hoje
          </h3>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 600, color: '#0f172a' }}>
            12
          </p>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#475569' }}>
            Internações Ativas
          </h3>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 600, color: '#0f172a' }}>
            8
          </p>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#475569' }}>
            Leitos Ocupados
          </h3>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 600, color: '#0f172a' }}>
            8/15
          </p>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#475569' }}>
            Pendências
          </h3>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 600, color: '#b45309' }}>
            5
          </p>
        </div>
      </div>
    </PageShell>
  );
}
