'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { api } from '../../../../lib/api';
import { Can } from '../../../../components/auth/Can';

type ImagingOrder = {
  id: string;
  orderNumber: string;
  patientId: string;
  patient?: { id: string; name: string; species: string };
  modality?: { id: string; code: string; name: string };
  status: string;
  priority: string;
  clinicalIndication: string;
  bodyRegion?: string;
  scheduledAt?: string;
  createdAt: string;
};

type ImagingModality = {
  id: string;
  code: string;
  name: string;
  category: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  scheduled: 'Agendado',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
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

export default function PedidosImagemPage() {
  const [orders, setOrders] = useState<ImagingOrder[]>([]);
  const [modalities, setModalities] = useState<ImagingModality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    modalityId: '',
    priority: 'routine',
    clinicalIndication: '',
    bodyRegion: '',
    laterality: 'not_applicable',
    contrastRequested: false,
    sedationRequired: false,
    specialInstructions: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchModalities();
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
      
      const response = await api.get(`/imaging/orders?${params.toString()}`);
      setOrders(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Erro ao carregar pedidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModalities = async () => {
    try {
      const response = await api.get('/imaging/modalities?pageSize=100');
      setModalities(response.items || []);
    } catch (err) {
      console.error('Erro ao carregar modalidades:', err);
    }
  };

  const handleCreateOrder = async () => {
    try {
      await api.post('/imaging/orders', formData);
      setShowNewOrderModal(false);
      setFormData({
        patientId: '',
        modalityId: '',
        priority: 'routine',
        clinicalIndication: '',
        bodyRegion: '',
        laterality: 'not_applicable',
        contrastRequested: false,
        sedationRequired: false,
        specialInstructions: ''
      });
      fetchOrders();
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      setError('Erro ao criar pedido');
    }
  };

  const handleSchedule = async (orderId: string, scheduledAt: string) => {
    try {
      await api.post(`/imaging/orders/${orderId}/schedule`, { scheduledAt });
      fetchOrders();
    } catch (err) {
      console.error('Erro ao agendar:', err);
    }
  };

  const handleStart = async (orderId: string) => {
    try {
      await api.post(`/imaging/orders/${orderId}/start`);
      fetchOrders();
    } catch (err) {
      console.error('Erro ao iniciar:', err);
    }
  };

  const handleComplete = async (orderId: string) => {
    try {
      await api.post(`/imaging/orders/${orderId}/complete`);
      fetchOrders();
    } catch (err) {
      console.error('Erro ao concluir:', err);
    }
  };

  const handleCancel = async (orderId: string, reason: string) => {
    try {
      await api.post(`/imaging/orders/${orderId}/cancel`, { reason });
      fetchOrders();
    } catch (err) {
      console.error('Erro ao cancelar:', err);
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

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos de Imagem"
        actions={
          <Can permission="imagem.pedidos.create">
            <Button onClick={() => setShowNewOrderModal(true)}>
              Novo Pedido
            </Button>
          </Can>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="scheduled">Agendado</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Orders List */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Carregando...</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum pedido encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-500">
                      {order.orderNumber}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_COLORS[order.priority] || 'bg-gray-100'}`}>
                      {PRIORITY_LABELS[order.priority] || order.priority}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Paciente:</span>{' '}
                    {order.patient?.name || 'N/A'}
                    {order.patient?.species && (
                      <span className="text-gray-500 ml-1">({order.patient.species})</span>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Modalidade:</span>{' '}
                    {order.modality?.name || 'N/A'}
                    {order.bodyRegion && (
                      <span className="text-gray-500 ml-1">- {order.bodyRegion}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Indicação:</span> {order.clinicalIndication}
                  </div>
                  <div className="text-xs text-gray-500">
                    Criado em: {formatDate(order.createdAt)}
                    {order.scheduledAt && (
                      <span className="ml-4">Agendado: {formatDate(order.scheduledAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <>
                      <Can permission="imagem.pedidos.schedule">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            const date = prompt('Data/hora agendada (YYYY-MM-DDTHH:mm):');
                            if (date) handleSchedule(order.id, date);
                          }}
                        >
                          Agendar
                        </Button>
                      </Can>
                      <Can permission="imagem.estudos.create">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleStart(order.id)}
                        >
                          Iniciar
                        </Button>
                      </Can>
                      <Can permission="imagem.pedidos.cancel">
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => {
                            const reason = prompt('Motivo do cancelamento:');
                            if (reason) handleCancel(order.id, reason);
                          }}
                        >
                          Cancelar
                        </Button>
                      </Can>
                    </>
                  )}
                  {order.status === 'scheduled' && (
                    <>
                      <Can permission="imagem.estudos.create">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleStart(order.id)}
                        >
                          Iniciar
                        </Button>
                      </Can>
                      <Can permission="imagem.pedidos.cancel">
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => {
                            const reason = prompt('Motivo do cancelamento:');
                            if (reason) handleCancel(order.id, reason);
                          }}
                        >
                          Cancelar
                        </Button>
                      </Can>
                    </>
                  )}
                  {order.status === 'in_progress' && (
                    <Can permission="imagem.estudos.update">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleComplete(order.id)}
                      >
                        Concluir
                      </Button>
                    </Can>
                  )}
                  {order.status === 'completed' && (
                    <Can permission="imagem.laudos.create">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => window.location.href = `/imagem/laudos?orderId=${order.id}`}
                      >
                        Criar Laudo
                      </Button>
                    </Can>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* New Order Modal */}
      <Modal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        title="Novo Pedido de Imagem"
      >
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID do Paciente *
            </label>
            <input
              type="text"
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="UUID do paciente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modalidade *
            </label>
            <select
              value={formData.modalityId}
              onChange={(e) => setFormData({ ...formData, modalityId: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Selecione...</option>
              {modalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} - {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioridade
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="routine">Rotina</option>
              <option value="asap">Rápido</option>
              <option value="stat">Urgente</option>
              <option value="timed">Agendado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Indicação Clínica *
            </label>
            <textarea
              value={formData.clinicalIndication}
              onChange={(e) => setFormData({ ...formData, clinicalIndication: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={3}
              placeholder="Descreva a indicação clínica..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Região do Corpo
            </label>
            <input
              type="text"
              value={formData.bodyRegion}
              onChange={(e) => setFormData({ ...formData, bodyRegion: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Ex: Tórax, Abdome, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lateralidade
            </label>
            <select
              value={formData.laterality}
              onChange={(e) => setFormData({ ...formData, laterality: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="not_applicable">Não se aplica</option>
              <option value="left">Esquerdo</option>
              <option value="right">Direito</option>
              <option value="bilateral">Bilateral</option>
            </select>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.contrastRequested}
                onChange={(e) => setFormData({ ...formData, contrastRequested: e.target.checked })}
              />
              <span className="text-sm">Requer Contraste</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sedationRequired}
                onChange={(e) => setFormData({ ...formData, sedationRequired: e.target.checked })}
              />
              <span className="text-sm">Requer Sedação</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instruções Especiais
            </label>
            <textarea
              value={formData.specialInstructions}
              onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowNewOrderModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrder}>
              Criar Pedido
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
