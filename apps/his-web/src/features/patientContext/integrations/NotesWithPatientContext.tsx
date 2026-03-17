'use client';

import { PatientContextProvider, PatientContextSidebar, PatientBannerCompact, AllergyWarningBanner, QuickNavigationTabs } from '../index';

/**
 * Notes with Patient Context
 * 
 * Wraps the Clinical Notes module with patient context.
 * Shows patient banner, allergies, and quick navigation.
 */
type NotesWithPatientContextProps = {
  patientId: string;
  children: React.ReactNode;
};

export function NotesWithPatientContext({ patientId, children }: NotesWithPatientContextProps) {
  if (!patientId) {
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
          Selecione um paciente para visualizar as notas clínicas.
        </p>
      </div>
    );
  }
  
  return (
    <PatientContextProvider patientId={patientId}>
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
          
          {/* Notes Content */}
          <div style={{
            flex: 1,
            padding: 16,
            overflow: 'auto',
          }}>
            {children}
          </div>
        </main>
      </div>
    </PatientContextProvider>
  );
}

/**
 * Notes Page Wrapper
 * 
 * Wraps existing Notes page content with patient context.
 * Use this to add patient context to existing Notes pages.
 */
type NotesPageWrapperProps = {
  children: React.ReactNode;
  patientId?: string | null;
};

export function NotesPageWrapper({ children, patientId }: NotesPageWrapperProps) {
  if (!patientId) {
    return <>{children}</>;
  }
  
  return (
    <PatientContextProvider patientId={patientId}>
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

/**
 * Notes Header with Patient Context
 * 
 * A compact header for Notes pages that shows patient info.
 */
export function NotesHeaderWithPatientContext({ patientId }: { patientId: string }) {
  if (!patientId) {
    return null;
  }
  
  return (
    <PatientContextProvider patientId={patientId}>
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
