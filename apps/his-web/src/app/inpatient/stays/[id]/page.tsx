'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  getInpatientStay,
  getWards,
  getPatient,
  transferInpatient,
  dischargeInpatient,
  type InpatientStayRecord,
  type WardRecord,
  type Patient,
  type TransferInpatientInput,
  type DischargeInpatientInput
} from '../../../../lib/api';

import { theme, px } from '@/lib/theme';
import { useSmartAutoRefresh } from '@/hooks/useSmartAutoRefresh';

import {
  StayHeader,
  StayTabs,
  StayTabContent,
  StayPrescriptionsTab,
  StayAdministrationsTab,
  StayLogsTab,
  StayCarePlanTab
} from '@/features/inpatientStays';

import { StayTransferModal, StayDischargeModal } from '@/features/inpatient/StayModals';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type StayTabId = 'prescriptions' | 'administrations' | 'logs' | 'careplan';

// Helper to check valid UUID
const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

// Loading State Component
function LoadingState() {
  return (
    <div style={{ padding: px(24), maxWidth: px(1400), margin: '0 auto' }}>
      <Card style={{ padding: px(24), textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ margin: '0 0 8px 0' }}>Carregando internação...</h2>
        <p style={{ margin: 0, color: theme.colors.textSecondary }}>Aguarde enquanto os dados são carregados.</p>
      </Card>
    </div>
  );
}

// Error State Component
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ padding: px(24), maxWidth: px(800), margin: '0 auto' }}>
      <Card style={{ padding: px(40), textAlign: 'center', borderColor: theme.colors.danger, background: '#fef2f2' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px 0', color: theme.colors.danger }}>Erro ao carregar internação</h2>
        <p style={{ margin: '0 0 16px 0', color: theme.colors.textSecondary }}>{message}</p>
        <div style={{ display: 'flex', gap: px(8), justifyContent: 'center' }}>
          <Button onClick={onRetry}>Tentar Novamente</Button>
          <Link href="/inpatient/stays">
            <Button variant="secondary">Voltar para Lista</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

// Invalid ID State Component
function InvalidIdState() {
  return (
    <div style={{ padding: px(24), maxWidth: px(800), margin: '0 auto' }}>
      <Card style={{ padding: px(40), textAlign: 'center', borderColor: theme.colors.warning, background: '#fffbeb' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ margin: '0 0 8px 0' }}>ID de Internação Inválido</h2>
        <p style={{ margin: '0 0 16px 0', color: theme.colors.textSecondary }}>O ID fornecido não é um UUID válido.</p>
        <Link href="/inpatient/stays">
          <Button>Voltar para Lista</Button>
        </Link>
      </Card>
    </div>
  );
}

// Not Found State Component
function NotFoundState({ stayId }: { stayId: string }) {
  return (
    <div style={{ padding: px(24), maxWidth: px(800), margin: '0 auto' }}>
      <Card style={{ padding: px(40), textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
        <h2 style={{ margin: '0 0 8px 0' }}>Internação não encontrada</h2>
        <p style={{ margin: '0 0 8px 0', color: theme.colors.textSecondary }}>
          A internação com ID <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{stayId}</code> não foi encontrada.
        </p>
        <p style={{ margin: '0 0 16px 0', color: theme.colors.textSecondary, fontSize: px(13) }}>
          Ela pode ter sido removida ou o ID pode estar incorreto.
        </p>
        <Link href="/inpatient/stays">
          <Button>Voltar para Lista</Button>
        </Link>
      </Card>
    </div>
  );
}

export default function StayDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stayId = typeof params.id === 'string' ? params.id : '';

  // Get initial tab from URL
  const tabParam = searchParams.get('tab');
  const initialTab: StayTabId = 
    tabParam === 'prescriptions' || tabParam === 'administrations' || tabParam === 'logs' || tabParam === 'careplan'
      ? tabParam
      : 'prescriptions';

  // State
  const [stay, setStay] = useState<InpatientStayRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<StayTabId>(initialTab);

  // Modal State
  const [transferOpen, setTransferOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Ref for interaction area
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Stay Data
  const fetchStay = useCallback(async () => {
    if (!isValidUUID(stayId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stayData = await getInpatientStay(stayId);
      setStay(stayData);

      // Fetch patient data
      if (stayData.patientId) {
        try {
          const patientData = await getPatient(stayData.patientId);
          setPatient(patientData);
        } catch (err) {
          console.warn('Could not load patient data', err);
        }
      }
    } catch (err: any) {
      if (err?.status === 404) {
        setStay(null);
      } else {
        setError(err?.message || 'Erro ao buscar detalhes da internação.');
      }
    } finally {
      setLoading(false);
    }
  }, [stayId]);

  // Fetch Wards
  useEffect(() => {
    getWards({ pageSize: 100 })
      .then((res) => setWards(res.data))
      .catch((err) => console.error('Failed to load wards', err));
  }, []);

  // Smart Auto-Refresh
  const { isPaused, nextRefreshIn, refresh, registerInteractionArea } = useSmartAutoRefresh({
    intervalMs: 60000, // 60 seconds
    onRefresh: fetchStay,
    enabled: stay?.status === 'active'
  });

  // Register interaction area
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = registerInteractionArea(containerRef.current);
      return cleanup;
    }
  }, [registerInteractionArea]);

  // Initial Load
  useEffect(() => {
    void fetchStay();
  }, [fetchStay]);

  // Update URL when tab changes
  const handleTabChange = (tab: StayTabId) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // Actions
  const handleTransfer = async (payload: TransferInpatientInput) => {
    setActionSubmitting(true);
    setActionError(null);
    try {
      await transferInpatient(stayId, payload);
      setTransferOpen(false);
      await fetchStay();
    } catch (err: any) {
      setActionError(err?.message || 'Falha na transferência');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDischarge = async (payload: DischargeInpatientInput) => {
    setActionSubmitting(true);
    setActionError(null);
    try {
      await dischargeInpatient(stayId, payload);
      setDischargeOpen(false);
      await fetchStay();
    } catch (err: any) {
      setActionError(err?.message || 'Falha na alta');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Invalid ID
  if (!isValidUUID(stayId)) {
    return <InvalidIdState />;
  }

  // Loading
  if (loading && !stay) {
    return <LoadingState />;
  }

  // Error
  if (error) {
    return <ErrorState message={error} onRetry={fetchStay} />;
  }

  // Not Found
  if (!stay) {
    return <NotFoundState stayId={stayId} />;
  }

  const ward = wards.find(w => w.id === stay.wardId);

  return (
    <div ref={containerRef} style={{ minHeight: '100vh', background: theme.colors.pageBg }}>
      {/* Fixed Header */}
      <StayHeader
        stay={stay}
        patient={patient ?? undefined}
        ward={ward}
        onTransfer={() => setTransferOpen(true)}
        onDischarge={() => setDischargeOpen(true)}
      />

      {/* Main Content */}
      <div style={{ padding: px(24), maxWidth: px(1400), margin: '0 auto' }}>
        {/* Auto-refresh indicator */}
        {stay.status === 'active' && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: px(8), 
            marginBottom: px(16), 
            fontSize: px(13), 
            color: theme.colors.textSecondary 
          }}>
            {isPaused ? (
              <span style={{ color: theme.colors.warning }}>⏸️ Auto-refresh pausado</span>
            ) : nextRefreshIn !== null ? (
              <span>🔄 Próxima atualização em {nextRefreshIn}s</span>
            ) : null}
            <Button size="sm" variant="secondary" onClick={refresh}>
              Atualizar Agora
            </Button>
          </div>
        )}

        {/* Tabs */}
        <StayTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Tab Content */}
        <StayTabContent>
          {activeTab === 'prescriptions' && (
            <StayPrescriptionsTab
              patientId={stay.patientId}
              stayId={stayId}
              encounterId={stay.encounterId}
            />
          )}

          {activeTab === 'administrations' && (
            <StayAdministrationsTab stayId={stayId} />
          )}

          {activeTab === 'logs' && (
            <StayLogsTab stayId={stayId} />
          )}

          {activeTab === 'careplan' && (
            <StayCarePlanTab stay={stay} />
          )}
        </StayTabContent>
      </div>

      {/* Modals */}
      <StayTransferModal
        open={transferOpen}
        currentWardId={stay.wardId}
        currentBedId={stay.bedId}
        currentBedLabel={stay.bedId}
        stayLabel={patient?.name ?? `Paciente ${stay.patientId.slice(0, 8)}`}
        wards={wards}
        submitting={actionSubmitting}
        errorMessage={actionError}
        onClose={() => setTransferOpen(false)}
        onSubmit={handleTransfer}
      />

      <StayDischargeModal
        open={dischargeOpen}
        stayLabel={patient?.name ?? `Paciente ${stay.patientId.slice(0, 8)}`}
        submitting={actionSubmitting}
        errorMessage={actionError}
        onClose={() => setDischargeOpen(false)}
        onSubmit={handleDischarge}
      />
    </div>
  );
}
