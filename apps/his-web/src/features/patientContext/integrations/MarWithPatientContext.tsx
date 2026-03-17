'use client';

import { useSearchParams } from 'next/navigation';
import { PatientContextProvider, PatientContextSidebar, PatientBannerCompact, AllergyWarningBanner, QuickNavigationTabs } from '../index';
import { MedDueList } from '../../../components/MedDueList';

/**
 * MAR with Patient Context
 * 
 * Wraps the MAR (Medication Administration Record) module with patient context.
 * Shows patient banner, allergies, and quick navigation.
 */
export function MarWithPatientContext() {
  const searchParams = useSearchParams();
  const stayId = searchParams.get('stayId');
  
  if (!stayId) {
    return (
      <div style={{
        padding: 24,
        background: '#f8fafc',
        borderRadius: 12,
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#334155', marginBottom: 8 }}>
          Nenhum paciente selecionado
        </h2>
        <p style={{ color: '#64748b' }}>
          Selecione um paciente no mapa de leitos ou busque por um paciente.
        </p>
      </div>
    );
  }
  
  return (
    <PatientContextProvider stayId={stayId}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        minHeight: 'calc(100vh - 120px)',
      }}>
        {/* Sidebar with patient context */}
        <PatientContextSidebar />
        
        {/* Main content */}
        <main style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#f8fafc',
        }}>
          {/* Allergy warning banner */}
          <AllergyWarningBanner />
          
          {/* Navigation tabs */}
          <QuickNavigationTabs />
          
          {/* MAR Content */}
          <div style={{
            flex: 1,
            padding: 16,
            overflow: 'auto',
          }}>
            <MedDueList
              stayId={stayId}
              hideStaySelector={true}
              defaultWindowMin={120}
            />
          </div>
        </main>
      </div>
    </PatientContextProvider>
  );
}

/**
 * MAR Header with Patient Context
 * 
 * A compact header for MAR pages that shows patient info.
 */
export function MarHeaderWithPatientContext() {
  const searchParams = useSearchParams();
  const stayId = searchParams.get('stayId');
  
  if (!stayId) {
    return null;
  }
  
  return (
    <PatientContextProvider stayId={stayId}>
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <PatientBannerCompact />
        <AllergyWarningBanner />
      </div>
    </PatientContextProvider>
  );
}

/**
 * MAR Page Wrapper
 * 
 * Wraps existing MAR page content with patient context.
 * Use this to add patient context to existing MAR pages.
 */
type MarPageWrapperProps = {
  children: React.ReactNode;
  stayId?: string | null;
};

export function MarPageWrapper({ children, stayId }: MarPageWrapperProps) {
  if (!stayId) {
    return <>{children}</>;
  }
  
  return (
    <PatientContextProvider stayId={stayId}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        <AllergyWarningBanner />
        <div style={{
          padding: '8px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <PatientBannerCompact />
        </div>
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </PatientContextProvider>
  );
}
