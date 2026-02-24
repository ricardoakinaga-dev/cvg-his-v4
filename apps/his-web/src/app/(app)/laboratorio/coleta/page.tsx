'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { api } from '../../../../lib/api';

type LabSample = {
  id: string;
  sampleNumber: string;
  orderId: string;
  orderNumber?: string;
  patientId: string;
  patientName?: string;
  sampleType: string;
  specimenSource?: string;
  volumeCollected?: string;
  status: string;
  collectedAt?: string;
  collectedByName?: string;
  receivedAt?: string;
  rejectionReason?: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  collected: 'Coletado',
  received: 'Recebido',
  processing: 'Processando',
  rejected: 'Rejeitado',
  discarded: 'Descartado'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  collected: 'bg-blue-100 text-blue-800',
  received: 'bg-green-100 text-green-800',
  processing: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
  discarded: 'bg-gray-200 text-gray-800'
};

const SAMPLE_TYPE_LABELS: Record<string, string> = {
  blood: 'Sangue',
  urine: 'Urina',
  feces: 'Fezes',
  tissue: 'Tecido',
  swab: 'Swab',
  fluid: 'Líquido',
  biopsy: 'Biópsia',
  other: 'Outro'
};

export default function ColetaLaboratorioPage() {
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionModal, setActionModal] = useState<{ type: 'collect' | 'receive' | 'reject' | null; sample: LabSample | null }>({ type: null, sample: null });

  useEffect(() => {
    fetchSamples();
  }, [selectedStatus, page]);

  const fetchSamples = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }
      
      const response = await api.get(`/lab/samples?${params.toString()}`);
      setSamples(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Erro ao carregar amostras');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'collect' | 'receive' | 'reject', sampleId: string, reason?: string) => {
    try {
      if (action === 'collect') {
        await api.post(`/lab/samples/${sampleId}/collect`, {});
      } else if (action === 'receive') {
        await api.post(`/lab/samples/${sampleId}/receive`, {});
      } else if (action === 'reject') {
        await api.post(`/lab/samples/${sampleId}/reject`, { reason });
      }
      fetchSamples();
    } catch (err) {
      console.error('Error performing action:', err);
      alert('Erro ao realizar ação');
    } finally {
      setActionModal({ type: null, sample: null });
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
        title="Coleta de Amostras"
        description="Gerenciamento de coleta e recebimento de amostras"
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

      {/* Samples List */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Carregando amostras...</p>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-red-500">{error}</p>
        </Card>
      ) : samples.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhuma amostra encontrada</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {samples.map((sample) => (
            <Card key={sample.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-lg font-semibold">{sample.sampleNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[sample.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[sample.status] || sample.status}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {SAMPLE_TYPE_LABELS[sample.sampleType] || sample.sampleType}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Paciente:</span> {sample.patientName || sample.patientId}
                  </div>
                  {sample.specimenSource && (
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Local:</span> {sample.specimenSource}
                    </div>
                  )}
                  {sample.volumeCollected && (
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Volume:</span> {sample.volumeCollected}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Criado em: {formatDate(sample.createdAt)}
                    {sample.collectedAt && ` | Coletado: ${formatDate(sample.collectedAt)}`}
                    {sample.receivedAt && ` | Recebido: ${formatDate(sample.receivedAt)}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {sample.status === 'pending' && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => setActionModal({ type: 'collect', sample })}
                    >
                      Coletar
                    </Button>
                  )}
                  {sample.status === 'collected' && (
                    <>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => setActionModal({ type: 'receive', sample })}
                      >
                        Receber
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => setActionModal({ type: 'reject', sample })}
                      >
                        Rejeitar
                      </Button>
                    </>
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

      {/* Action Modal */}
      <Modal
        isOpen={actionModal.type !== null}
        onClose={() => setActionModal({ type: null, sample: null })}
        title={
          actionModal.type === 'collect' ? 'Confirmar Coleta' :
          actionModal.type === 'receive' ? 'Confirmar Recebimento' :
          'Rejeitar Amostra'
        }
      >
        <div className="p-4 space-y-4">
          {actionModal.sample && (
            <div className="text-sm text-gray-600">
              <p><span className="font-medium">Amostra:</span> {actionModal.sample.sampleNumber}</p>
              <p><span className="font-medium">Paciente:</span> {actionModal.sample.patientName || actionModal.sample.patientId}</p>
            </div>
          )}
          {actionModal.type === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo da Rejeição
              </label>
              <textarea
                className="w-full border rounded-md p-2"
                rows={3}
                placeholder="Informe o motivo da rejeição..."
                id="rejection-reason"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActionModal({ type: null, sample: null })}>
              Cancelar
            </Button>
            <Button 
              variant={actionModal.type === 'reject' ? 'danger' : 'primary'}
              onClick={() => {
                const reason = actionModal.type === 'reject' 
                  ? (document.getElementById('rejection-reason') as HTMLTextAreaElement)?.value 
                  : undefined;
                handleAction(actionModal.type!, actionModal.sample!.id, reason);
              }}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
