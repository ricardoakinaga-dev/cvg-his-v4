'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { api } from '../../../../lib/api';

type LabOrder = {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName?: string;
  status: string;
  priority: string;
  clinicalNotes?: string;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  partial: 'Parcial',
  collected: 'Coletado',
  processing: 'Processando',
  partial_result: 'Resultado Parcial',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  collected: 'bg-green-100 text-green-800',
  processing: 'bg-purple-100 text-purple-800',
  partial_result: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-200 text-green-900',
  cancelled: 'bg-red-100 text-red-800'
};

const PRIORITY_LABELS: Record<string, string> = {
  stat: 'URGENTE',
  asap: 'Rápido',
  routine: 'Rotina',
  timed: 'Agendado'
};

const PRIORITY_COLORS: Record<string, string> = {
  stat: 'bg-red-500 text-white',
  asap: 'bg-orange-500 text-white',
  routine: 'bg-gray-100 text-gray-800',
  timed: 'bg-blue-100 text-blue-800'
};

export default function PedidosLaboratorioPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }
      
      const response = await api.get(`/lab/orders?${params.toString()}`);
      setOrders(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Erro ao carregar pedidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos de Laboratório"
        description="Gestão de pedidos de exames"
        actions={
          <Button onClick={() => setShowNewOrderModal(true)}>
            Novo Pedido
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedStatus === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Todos
            </button>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedStatus === status ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Orders List */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Carregando pedidos...</p>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-red-500">{error}</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum pedido encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-lg font-semibold">{order.orderNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[order.priority] || 'bg-gray-100'}`}>
                      {PRIORITY_LABELS[order.priority] || order.priority}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Paciente:</span> {order.patientName || order.patientId}
                  </div>
                  {order.clinicalNotes && (
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Notas:</span> {order.clinicalNotes}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Solicitado em: {formatDate(order.orderedAt)}
                    {order.collectedAt && ` | Coletado: ${formatDate(order.collectedAt)}`}
                    {order.completedAt && ` | Concluído: ${formatDate(order.completedAt)}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm">
                    Detalhes
                  </Button>
                  {order.status === 'pending' && (
                    <Button variant="primary" size="sm">
                      Coletar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Página {page} de {Math.ceil(total / 20)}
          </span>
          <Button
            variant="secondary"
            disabled={page * 20 >= total}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* New Order Modal */}
      <Modal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        title="Novo Pedido de Exame"
      >
        <div className="p-4 space-y-4">
          <p className="text-gray-500">
            Funcionalidade em desenvolvimento. Em breve será possível criar novos pedidos de exames.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNewOrderModal(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
