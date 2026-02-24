/**
 * Solicitações Page - Clínica Module
 */

import { PlaceholderPage } from '../../../../components/layout/PlaceholderPage';

'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { listLabOrders, listImagingOrders } from '../../../../lib/api';
import type { LabOrderRecord, ImagingOrderRecord } from '../../../../lib/api';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${colors[status] || colors.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function OrdersFeed({ type }: { type: 'lab' | 'imaging' }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const fetcher = type === 'lab' ? listLabOrders : listImagingOrders;
        const resp = await fetcher({ pageSize: 15 });
        if (active) setOrders(resp.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchOrders();
    return () => { active = false; };
  }, [type]);

  if (loading) return <LoadingState />;

  if (orders.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 border rounded-md border-dashed">
        Nenhuma solicitação encontrada recentemente.
      </div>
    );
  }

  return (
    <div className="border rounded-md divide-y shadow-sm">
      {orders.map((o) => (
        <div key={o.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-medium text-gray-900">ID: {o.id.split('-')[0]}...</span>
              <StatusBadge status={o.status} />
              {o.priority === 'urgent' || o.priority === 'stat' ? (
                <span className="text-red-600 text-xs font-bold uppercase shrink-0 px-1 border border-red-600 rounded">
                  {o.priority}
                </span>
              ) : null}
            </div>
            <div className="text-sm text-gray-500 flex gap-4">
              <span>Paciente: {o.patientId.split('-')[0]}</span>
              {type === 'imaging' && <span>Modalidade: {o.modalityId}</span>}
              <span>{new Date(o.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Button size="sm" variant="secondary">
            Ver Detalhes
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function SolicitacoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações"
        description="Gestão de solicitações de exames laboratoriais e de imagem."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Laboratório</h2>
              <p className="text-sm text-gray-500">Exames de sangue, fezes, biópsias, etc.</p>
            </div>
            <Link href="/clinica/solicitacoes/novo-laboratorio">
              <Button>Novo Pedido</Button>
            </Link>
          </div>
          <Suspense fallback={<LoadingState />}>
            <OrdersFeed type="lab" />
          </Suspense>
        </Card>

        <Card>
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Imagem</h2>
              <p className="text-sm text-gray-500">Raio-X, Ultrassom, Tomografia, etc.</p>
            </div>
            <Link href="/clinica/solicitacoes/nova-imagem">
              <Button>Novo Pedido</Button>
            </Link>
          </div>
          <Suspense fallback={<LoadingState />}>
            <OrdersFeed type="imaging" />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
