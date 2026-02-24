'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { api } from '../../../../lib/api';

type LabReport = {
  id: string;
  reportNumber: string;
  orderId: string;
  orderNumber?: string;
  patientId: string;
  patientName?: string;
  status: string;
  conclusion?: string;
  methodology?: string;
  limitations?: string;
  notes?: string;
  draftedAt?: string;
  draftedByName?: string;
  finalizedAt?: string;
  finalizedByName?: string;
  signedAt?: string;
  signedByName?: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending_review: 'Revisão Pendente',
  finalized: 'Finalizado',
  signed: 'Assinado',
  amended: 'Retificado'
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  finalized: 'bg-blue-100 text-blue-800',
  signed: 'bg-green-100 text-green-800',
  amended: 'bg-orange-100 text-orange-800'
};

export default function LaudosLaboratorioPage() {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signPin, setSignPin] = useState('');

  useEffect(() => {
    fetchReports();
  }, [selectedStatus, page]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }
      
      const response = await api.get(`/lab/reports?${params.toString()}`);
      setReports(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Erro ao carregar laudos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (reportId: string) => {
    try {
      await api.post(`/lab/reports/${reportId}/finalize`, {});
      fetchReports();
    } catch (err) {
      console.error('Error finalizing report:', err);
      alert('Erro ao finalizar laudo');
    }
  };

  const handleSign = async () => {
    if (!selectedReport) return;
    try {
      await api.post(`/lab/reports/${selectedReport.id}/sign`, { pin: signPin });
      setShowSignModal(false);
      setSelectedReport(null);
      setSignPin('');
      fetchReports();
    } catch (err) {
      console.error('Error signing report:', err);
      alert('Erro ao assinar laudo');
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
        title="Laudos de Exames"
        description="Gestão e assinatura de laudos"
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

      {/* Reports List */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Carregando laudos...</p>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-red-500">{error}</p>
        </Card>
      ) : reports.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum laudo encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-lg font-semibold">{report.reportNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[report.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[report.status] || report.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Paciente:</span> {report.patientName || report.patientId}
                  </div>
                  
                  {report.conclusion && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded mt-2">
                      <span className="font-medium block mb-1">Conclusão:</span>
                      {report.conclusion}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-2">
                    Criado: {formatDate(report.createdAt)}
                    {report.draftedAt && ` | Elaborado: ${formatDate(report.draftedAt)}`}
                    {report.finalizedAt && ` | Finalizado: ${formatDate(report.finalizedAt)}`}
                    {report.signedAt && ` | Assinado: ${formatDate(report.signedAt)}`}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button variant="secondary" size="sm">
                    Visualizar
                  </Button>
                  {['draft', 'pending_review'].includes(report.status) && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => handleFinalize(report.id)}
                    >
                      Finalizar
                    </Button>
                  )}
                  {report.status === 'finalized' && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report);
                        setShowSignModal(true);
                      }}
                    >
                      Assinar
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

      {/* Sign Modal */}
      <Modal
        isOpen={showSignModal}
        onClose={() => {
          setShowSignModal(false);
          setSelectedReport(null);
          setSignPin('');
        }}
        title="Assinar Laudo"
      >
        <div className="p-4 space-y-4">
          {selectedReport && (
            <div className="text-sm text-gray-600">
              <p><span className="font-medium">Laudo:</span> {selectedReport.reportNumber}</p>
              <p><span className="font-medium">Paciente:</span> {selectedReport.patientName || selectedReport.patientId}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIN (opcional)
            </label>
            <input
              type="password"
              className="w-full border rounded-md p-2"
              placeholder="Digite seu PIN"
              value={signPin}
              onChange={(e) => setSignPin(e.target.value)}
              maxLength={6}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setShowSignModal(false);
              setSelectedReport(null);
              setSignPin('');
            }}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSign}>
              Confirmar Assinatura
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
