'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMedicationLogs, type MedicationLogsResponse } from '../../../lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { theme, px } from '@/lib/theme';
import { formatDateTime } from '@/features/encounter/utils/helpers';

export type StayLogsTabProps = {
  stayId: string;
};

export function StayLogsTab({ stayId }: StayLogsTabProps) {
  const [logs, setLogs] = useState<MedicationLogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!stayId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getMedicationLogs(stayId);
      setLogs(res);
    } catch (err: any) {
      console.error('Failed to load logs', err);
      setError(err?.message || 'Falha ao carregar logs.');
    } finally {
      setLoading(false);
    }
  }, [stayId]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <Card style={{ padding: px(16) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Logs de Medicação</h3>
        <Button size="sm" variant="secondary" onClick={() => void fetchLogs()} disabled={loading}>
          {loading ? 'Carregando...' : 'Atualizar'}
        </Button>
      </div>

      {error && (
        <div style={{ padding: px(12), background: '#fef2f2', borderRadius: px(8), color: theme.colors.danger, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && !logs ? (
        <div style={{ color: theme.colors.textSecondary }}>Carregando logs...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs?.administrations.slice(0, 20).map(admin => {
            const order = logs.orders.find(o => o.id === admin.orderId);
            const medName = order ? order.medicationName : 'Medicação desconhecida';
            return (
              <div 
                key={admin.id} 
                style={{ 
                  padding: 12, 
                  borderBottom: `1px solid ${theme.colors.border}`, 
                  fontSize: 13,
                  background: admin.status === 'administered' ? '#f0fdf4' : admin.status === 'refused' ? '#fef2f2' : '#fffbeb',
                  borderRadius: 8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{medName}</strong>
                    <div style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
                      {formatDateTime(admin.administeredAt ?? admin.scheduledFor)}
                    </div>
                  </div>
                  <span 
                    style={{ 
                      padding: '2px 8px', 
                      borderRadius: 4, 
                      fontSize: 12,
                      fontWeight: 600,
                      background: admin.status === 'administered' ? '#dcfce7' : admin.status === 'refused' ? '#fee2e2' : '#fef3c7',
                      color: admin.status === 'administered' ? '#166534' : admin.status === 'refused' ? '#991b1b' : '#92400e'
                    }}
                  >
                    {admin.status.toUpperCase()}
                  </span>
                </div>
                {admin.reason && (
                  <div style={{ marginTop: 8, color: theme.colors.textSecondary, fontSize: 12 }}>
                    <strong>Motivo:</strong> {admin.reason}
                  </div>
                )}
                <div style={{ marginTop: 4, color: theme.colors.textSecondary, fontSize: 11 }}>
                  Usuário: {admin.byUserId}
                </div>
              </div>
            );
          })}
          {(!logs?.administrations || logs.administrations.length === 0) && (
            <div style={{ 
              padding: px(24), 
              textAlign: 'center', 
              color: theme.colors.textSecondary,
              background: '#f8fafc',
              borderRadius: px(8)
            }}>
              Nenhum histórico de administração encontrado.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
