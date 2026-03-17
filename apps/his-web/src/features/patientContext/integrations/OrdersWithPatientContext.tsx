'use client';

import { PatientContextProvider, PatientContextSidebar, PatientBannerCompact, AllergyWarningBanner, QuickNavigationTabs, WeightWithDoseCalc } from '../index';

/**
 * Orders with Patient Context
 * 
 * Wraps the Medication Orders module with patient context.
 * Shows patient banner, allergies, weight for dose calculation, and quick navigation.
 */
type OrdersWithPatientContextProps = {
  patientId: string;
  children: React.ReactNode;
};

export function OrdersWithPatientContext({ patientId, children }: OrdersWithPatientContextProps) {
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
          Selecione um paciente para visualizar as prescrições.
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
          
          {/* Orders Content */}
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
 * Orders Page Wrapper
 * 
 * Wraps existing Orders page content with patient context.
 * Use this to add patient context to existing Orders pages.
 */
type OrdersPageWrapperProps = {
  children: React.ReactNode;
  patientId?: string | null;
};

export function OrdersPageWrapper({ children, patientId }: OrdersPageWrapperProps) {
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
 * Orders Header with Patient Context
 * 
 * A compact header for Orders pages that shows patient info.
 */
export function OrdersHeaderWithPatientContext({ patientId }: { patientId: string }) {
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

/**
 * Order Form with Patient Context
 * 
 * Wraps the order form with patient context for dose calculations.
 */
type OrderFormWithPatientContextProps = {
  patientId: string;
  dosePerKg?: number;
  children: React.ReactNode;
};

export function OrderFormWithPatientContext({ 
  patientId, 
  dosePerKg,
  children 
}: OrderFormWithPatientContextProps) {
  if (!patientId) {
    return <>{children}</>;
  }
  
  return (
    <PatientContextProvider patientId={patientId}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {/* Patient info and alerts */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 12,
        }}>
          <PatientBannerCompact />
          <div style={{ marginTop: 12 }}>
            <AllergyWarningBanner />
          </div>
        </div>
        
        {/* Dose calculation helper */}
        {dosePerKg && (
          <WeightWithDoseCalc dosePerKg={dosePerKg} />
        )}
        
        {/* Order form */}
        {children}
      </div>
    </PatientContextProvider>
  );
}
