'use client';

import { PatientBanner, PatientBannerCompact } from './PatientBanner';
import { AllergyAlert, AllergyBadge, AllergyWarningBanner } from './AllergyAlert';
import { WeightDisplay, WeightBadge } from './WeightDisplay';
import { RiskStatus, RiskBadge, RiskSummary } from './RiskStatus';
import { QuickNavigation, QuickNavigationVertical, QuickNavigationTabs } from './QuickNavigation';
import { usePatientContextValue } from '../PatientContext';

/**
 * Patient Context Panel
 * 
 * Main container component that displays all patient context information.
 * Includes banner, alerts, weight, risk status, and navigation.
 */
export function PatientContextPanel() {
  const { patient, isLoading, isError } = usePatientContextValue();
  
  if (isLoading) {
    return (
      <div style={{
        padding: 16,
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#64748b',
        }}>
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid #e2e8f0',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span>Carregando contexto do paciente...</span>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div style={{
        padding: 16,
        background: '#fef2f2',
        borderBottom: '1px solid #fecaca',
        color: '#991b1b',
      }}>
        <strong>Erro ao carregar dados do paciente</strong>
        <p style={{ margin: '4px 0 0', fontSize: 13 }}>
          Tente recarregar a página ou verifique sua conexão.
        </p>
      </div>
    );
  }
  
  if (!patient) {
    return null;
  }
  
  return (
    <div>
      {/* Allergy Warning Banner (if allergies exist) */}
      <AllergyWarningBanner />
      
      {/* Patient Banner */}
      <PatientBanner />
      
      {/* Quick Navigation */}
      <QuickNavigation />
      
      {/* Context Info Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        padding: 16,
        background: '#f8fafc',
      }}>
        <AllergyAlert />
        <WeightDisplay />
        <RiskStatus />
      </div>
    </div>
  );
}

/**
 * Compact Patient Context for sidebars
 */
export function PatientContextCompact() {
  const { patient, isLoading } = usePatientContextValue();
  
  if (isLoading) {
    return (
      <div style={{
        padding: 12,
        background: '#f8fafc',
        borderRadius: 8,
      }}>
        <span style={{ color: '#64748b', fontSize: 13 }}>Carregando...</span>
      </div>
    );
  }
  
  if (!patient) {
    return null;
  }
  
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <PatientBannerCompact />
      
      <div style={{
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {/* Badges row */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}>
          <AllergyBadge />
          <WeightBadge />
          <RiskBadge />
        </div>
        
        {/* Navigation */}
        <QuickNavigationVertical />
      </div>
    </div>
  );
}

/**
 * Patient Context Sidebar
 */
export function PatientContextSidebar() {
  const { patient, isLoading, isError, refetch } = usePatientContextValue();
  
  if (isLoading) {
    return (
      <aside style={{
        width: 280,
        padding: 16,
        background: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
      }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>Carregando...</div>
      </aside>
    );
  }
  
  if (isError) {
    return (
      <aside style={{
        width: 280,
        padding: 16,
        background: '#fef2f2',
        borderRight: '1px solid #fecaca',
      }}>
        <div style={{ color: '#991b1b', fontSize: 13 }}>
          <strong>Erro</strong>
          <button
            onClick={() => refetch()}
            style={{
              display: 'block',
              marginTop: 8,
              padding: '4px 8px',
              background: '#991b1b',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </aside>
    );
  }
  
  if (!patient) {
    return (
      <aside style={{
        width: 280,
        padding: 16,
        background: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
      }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>
          Nenhum paciente selecionado
        </div>
      </aside>
    );
  }
  
  return (
    <aside style={{
      width: 280,
      background: '#fff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Banner */}
      <div style={{
        padding: 12,
        background: '#0f172a',
        color: '#fff',
      }}>
        <PatientBannerCompact />
      </div>
      
      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <AllergyAlert />
        <WeightDisplay />
        <RiskStatus />
        
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <div style={{
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Navegação Rápida
          </div>
          <QuickNavigationVertical />
        </div>
      </div>
    </aside>
  );
}

// Re-export all components
export {
  PatientBanner,
  PatientBannerCompact,
  AllergyAlert,
  AllergyBadge,
  AllergyWarningBanner,
  WeightDisplay,
  WeightBadge,
  RiskStatus,
  RiskBadge,
  RiskSummary,
  QuickNavigation,
  QuickNavigationVertical,
  QuickNavigationTabs,
};
