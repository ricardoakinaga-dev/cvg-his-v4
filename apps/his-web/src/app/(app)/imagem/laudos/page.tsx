'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { api } from '../../../../lib/api';
import { Can } from '../../../../components/auth/Can';

type ImagingReport = {
  id: string;
  reportNumber: string;
  orderId: string;
  studyId?: string;
  patientId: string;
  modality?: { id: string; code: string; name: string };
  status: string;
  technique?: string;
  findings?: string;
  impression?: string;
  conclusion?: string;
  recommendations?: string;
  draftedAt?: string;
  finalizedAt?: string;
  signedAt?: string;
  createdAt: string;
  documents?: { id: string; documentId: string; attachmentType: string; document?: { filename: string; url: string } }[];
};

type ImagingOrder = {
  id: string;
  orderNumber: string;
  modality?: { id: string; code: string; name: string };
};

type ImagingModality = {
  id: string;
  code: string;
  name: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending_review: 'Revisão',
  finalized: 'Finalizado',
  signed: 'Assinado',
  amended: 'Retificado'
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  finalized: 'bg-blue-100 text-blue-800',
  signed: 'bg-green-200 text-green-900',
  amended: 'bg-purple-100 text-purple-800'
};

function LaudosImagemContent() {
  const searchParams = useSearchParams();
  const orderIdFromQuery = searchParams.get('orderId');

  const [reports, setReports] = useState<ImagingReport[]>([]);
  const [orders, setOrders] = useState<ImagingOrder[]>([]);
  const [modalities, setModalities] = useState<ImagingModality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showEditReportModal, setShowEditReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ImagingReport | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    orderId: orderIdFromQuery || '',
    studyId: '',
    modalityId: '',
    technique: '',
    findings: '',
    impression: '',
    conclusion: '',
    recommendations: '',
    limitations: '',
    comparison: ''
  });

  useEffect(() => {
    fetchReports();
    fetchOrders();
    fetchModalities();
  }, [selectedStatus, page]);

  useEffect(() => {
    if (orderIdFromQuery) {
      setFormData(prev => ({ ...prev, orderId: orderIdFromQuery }));
      setShowNewReportModal(true);
    }
  }, [orderIdFromQuery]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }
      
      const response = await api.get(`/imaging/reports?${params.toString()}`);
      setReports(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Erro ao carregar laudos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/imaging/orders?status=completed&pageSize=100');
      setOrders(response.items || []);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
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

  const fetchReportDetails = async (reportId: string) => {
    try {
      const response = await api.get(`/imaging/reports/${reportId}`);
      setSelectedReport(response);
      setFormData({
        orderId: response.orderId,
        studyId: response.studyId || '',
        modalityId: response.modality?.id || '',
        technique: response.technique || '',
        findings: response.findings || '',
        impression: response.impression || '',
        conclusion: response.conclusion || '',
        recommendations: response.recommendations || '',
        limitations: response.limitations || '',
        comparison: response.comparison || ''
      });
    } catch (err) {
      console.error('Erro ao carregar laudo:', err);
    }
  };

  const handleCreateReport = async () => {
    try {
      await api.post('/imaging/reports', formData);
      setShowNewReportModal(false);
      resetForm();
      fetchReports();
    } catch (err) {
      console.error('Erro ao criar laudo:', err);
      setError('Erro ao criar laudo');
    }
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;
    try {
      await api.put(`/imaging/reports/${selectedReport.id}`, formData);
      setShowEditReportModal(false);
      resetForm();
      fetchReports();
    } catch (err) {
      console.error('Erro ao atualizar laudo:', err);
      setError('Erro ao atualizar laudo');
    }
  };

  const handleFinalize = async (reportId: string) => {
    try {
      await api.post(`/imaging/reports/${reportId}/finalize`);
      fetchReports();
    } catch (err) {
      console.error('Erro ao finalizar laudo:', err);
    }
  };

  const handleSign = async (reportId: string) => {
    try {
      await api.post(`/imaging/reports/${reportId}/sign`, {});
      fetchReports();
    } catch (err) {
      console.error('Erro ao assinar laudo:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      orderId: '',
      studyId: '',
      modalityId: '',
      technique: '',
      findings: '',
      impression: '',
      conclusion: '',
      recommendations: '',
      limitations: '',
      comparison: ''
    });
    setSelectedReport(null);
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
        title="Laudos de Imagem"
        actions={
          <Can permission="imagem.laudos.create">
            <Button onClick={() => {
              resetForm();
              setShowNewReportModal(true);
            }}>
              Novo Laudo
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
            <option value="draft">Rascunho</option>
            <option value="pending_review">Revisão</option>
            <option value="finalized">Finalizado</option>
            <option value="signed">Assinado</option>
            <option value="amended">Retificado</option>
          </select>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Reports List */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Carregando...</p>
        </Card>
      ) : reports.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum laudo encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-500">
                      {report.reportNumber}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[report.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[report.status] || report.status}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Modalidade:</span>{' '}
                    {report.modality?.name || 'N/A'}
                  </div>
                  {report.conclusion && (
                    <div className="text-sm text-gray-600 line-clamp-2">
                      <span className="font-medium">Conclusão:</span> {report.conclusion}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Criado em: {formatDate(report.createdAt)}
                    {report.finalizedAt && (
                      <span className="ml-4">Finalizado: {formatDate(report.finalizedAt)}</span>
                    )}
                    {report.signedAt && (
                      <span className="ml-4">Assinado: {formatDate(report.signedAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {report.status === 'draft' && (
                    <>
                      <Can permission="imagem.laudos.update">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            fetchReportDetails(report.id);
                            setShowEditReportModal(true);
                          }}
                        >
                          Editar
                        </Button>
                      </Can>
                      <Can permission="imagem.laudos.finalize">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleFinalize(report.id)}
                        >
                          Finalizar
                        </Button>
                      </Can>
                    </>
                  )}
                  {report.status === 'finalized' && (
                    <Can permission="imagem.laudos.sign">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => {
                          if (confirm('Deseja assinar este laudo?')) {
                            handleSign(report.id);
                          }
                        }}
                      >
                        Assinar
                      </Button>
                    </Can>
                  )}
                  {report.status === 'signed' && (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => window.open(`/api/imaging/reports/${report.id}/print`, '_blank')}
                    >
                      Imprimir
                    </Button>
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

      {/* New Report Modal */}
      <Modal
        isOpen={showNewReportModal}
        onClose={() => {
          setShowNewReportModal(false);
          resetForm();
        }}
        title="Novo Laudo"
        size="lg"
      >
        <div className="space-y-4 p-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pedido *
              </label>
              <select
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Selecione...</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} - {o.modality?.name || 'N/A'}
                  </option>
                ))}
              </select>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Técnica
            </label>
            <textarea
              value={formData.technique}
              onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
              placeholder="Descreva a técnica utilizada..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Achados
            </label>
            <textarea
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={4}
              placeholder="Descreva os achados..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impressão
            </label>
            <textarea
              value={formData.impression}
              onChange={(e) => setFormData({ ...formData, impression: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
              placeholder="Impressão diagnóstica..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conclusão
            </label>
            <textarea
              value={formData.conclusion}
              onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={3}
              placeholder="Conclusão do laudo..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recomendações
            </label>
            <textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
              placeholder="Recomendações..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => {
              setShowNewReportModal(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateReport}>
              Criar Laudo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Report Modal */}
      <Modal
        isOpen={showEditReportModal}
        onClose={() => {
          setShowEditReportModal(false);
          resetForm();
        }}
        title="Editar Laudo"
        size="lg"
      >
        <div className="space-y-4 p-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Técnica
            </label>
            <textarea
              value={formData.technique}
              onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Achados
            </label>
            <textarea
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impressão
            </label>
            <textarea
              value={formData.impression}
              onChange={(e) => setFormData({ ...formData, impression: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conclusão
            </label>
            <textarea
              value={formData.conclusion}
              onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recomendações
            </label>
            <textarea
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => {
              setShowEditReportModal(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateReport}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function LaudosImagemPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando...</div>}>
      <LaudosImagemContent />
    </Suspense>
  );
}
