'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api';

type LabResult = {
  id: string;
  orderItemId: string;
  testId: string;
  testName?: string;
  patientId: string;
  patientName?: string;
  resultValue?: string;
  resultNumeric?: number;
  unit?: string;
  referenceRange?: string;
  flag?: string;
  status: string;
  notes?: string;
  interpretation?: string;
  performedAt?: string;
  verifiedAt?: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  preliminary: 'Preliminar',
  final: 'Final',
  corrected: 'Corrigido',
  cancelled: 'Cancelado'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preliminary: 'bg-blue-100 text-blue-800',
  final: 'bg-green-100 text-green-800',
  corrected: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800'
};

const FLAG_LABELS: Record<string, string> = {
  low: 'Baixo',
  high: 'Alto',
  critical_low: 'Crítico Baixo',
  critical_high: 'Crítico Alto',
  abnormal: 'Anormal',
  normal: 'Normal'
};

const FLAG_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical_low: 'bg-red-200 text-red-900',
  critical_high: 'bg-red-200 text-red-900',
  abnormal: 'bg-yellow-100 text-yellow-800',
  normal: 'bg-green-100 text-green-800'
};

export default function ResultadosLaboratorioPage() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedFlag, setSelectedFlag] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchResults();
  }, [selectedStatus, selectedFlag, page]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (selectedStatus !== 'all') {
        params.set('status', selectedStatus);
      }
      if (selectedFlag !== 'all') {
        params.set('flag', selectedFlag);
      }
      
      const response = await api.get(`/lab/results?${params.toString()}`);
      setResults(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Erro ao carregar resultados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (resultId: string) => {
    try {
      await api.post(`/lab/results/${resultId}/verify`, {});
      fetchResults();
    } catch (err) {
      console.error('Error verifying result:', err);
      alert('Erro ao verificar resultado');
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
        title="Resultados de Exames"
        description="Visualização e verificação de resultados"
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-6 items-center flex-wrap">
          <div className="flex gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">Status:</span>
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
          
          <div className="flex gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">Flag:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedFlag('all')}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedFlag === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Todos
              </button>
              {Object.entries(FLAG_LABELS).map(([flag, label]) => (
                <button
                  key={flag}
                  onClick={() => setSelectedFlag(flag)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedFlag === flag ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Results List */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Carregando resultados...</p>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-red-500">{error}</p>
        </Card>
      ) : results.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum resultado encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-lg">{result.testName || result.testId}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[result.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[result.status] || result.status}
                    </span>
                    {result.flag && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${FLAG_COLORS[result.flag] || 'bg-gray-100'}`}>
                        {FLAG_LABELS[result.flag] || result.flag}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Paciente:</span> {result.patientName || result.patientId}
                  </div>
                  
                  <div className="flex items-center gap-4 text-lg">
                    <span className="font-bold text-gray-900">
                      {result.resultValue || result.resultNumeric || '-'}
                    </span>
                    {result.unit && (
                      <span className="text-gray-600">{result.unit}</span>
                    )}
                    {result.referenceRange && (
                      <span className="text-sm text-gray-500">
                        Ref: {result.referenceRange}
                      </span>
                    )}
                  </div>
                  
                  {result.interpretation && (
                    <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Interpretação:</span> {result.interpretation}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400">
                    Criado: {formatDate(result.createdAt)}
                    {result.performedAt && ` | Realizado: ${formatDate(result.performedAt)}`}
                    {result.verifiedAt && ` | Verificado: ${formatDate(result.verifiedAt)}`}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button variant="secondary" size="sm">
                    Editar
                  </Button>
                  {['pending', 'preliminary'].includes(result.status) && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => handleVerify(result.id)}
                    >
                      Verificar
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
    </div>
  );
}
