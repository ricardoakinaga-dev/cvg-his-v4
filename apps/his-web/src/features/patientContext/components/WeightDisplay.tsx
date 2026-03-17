'use client';

import { usePatientWeight, useCurrentPatient } from '../PatientContext';

/**
 * Weight Display Component
 * 
 * Shows the patient's weight in kilograms.
 * Provides visual indication if weight is missing or outdated.
 */
export function WeightDisplay() {
  const weightKg = usePatientWeight();
  const patient = useCurrentPatient();
  
  if (!patient) {
    return null;
  }
  
  const hasWeight = weightKg !== null && weightKg !== undefined;
  
  return (
    <div style={{
      padding: '12px 16px',
      background: hasWeight ? '#f8fafc' : '#fef3c7',
      border: `1px solid ${hasWeight ? '#e2e8f0' : '#fcd34d'}`,
      borderRadius: 8,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>⚖️</span>
          <div>
            <div style={{
              fontSize: 11,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Peso
            </div>
            {hasWeight ? (
              <div style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#0f172a',
              }}>
                {weightKg}
                <span style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: '#64748b',
                  marginLeft: 4,
                }}>
                  kg
                </span>
              </div>
            ) : (
              <div style={{
                fontSize: 14,
                color: '#92400e',
              }}>
                Não registrado
              </div>
            )}
          </div>
        </div>
        
        {!hasWeight && (
          <span style={{
            background: '#fef3c7',
            color: '#92400e',
            fontSize: 11,
            padding: '4px 8px',
            borderRadius: 4,
          }}>
            ⚠️ Necessário
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact Weight Badge for smaller spaces
 */
export function WeightBadge() {
  const weightKg = usePatientWeight();
  const patient = useCurrentPatient();
  
  if (!patient) {
    return null;
  }
  
  const hasWeight = weightKg !== null && weightKg !== undefined;
  
  if (!hasWeight) {
    return (
      <span style={{
        background: '#fef3c7',
        color: '#92400e',
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 4,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}>
        ⚖️ --
      </span>
    );
  }
  
  return (
    <span style={{
      background: '#f1f5f9',
      color: '#334155',
      fontSize: 12,
      padding: '4px 8px',
      borderRadius: 4,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'monospace',
    }}>
      ⚖️ {weightKg} kg
    </span>
  );
}

/**
 * Weight with calculated doses display
 */
export function WeightWithDoseCalc({ dosePerKg }: { dosePerKg: number }) {
  const weightKg = usePatientWeight();
  const patient = useCurrentPatient();
  
  if (!patient) {
    return null;
  }
  
  const hasWeight = weightKg !== null && weightKg !== undefined;
  const weight = hasWeight ? parseFloat(weightKg) : 0;
  const calculatedDose = hasWeight ? (weight * dosePerKg).toFixed(2) : null;
  
  return (
    <div style={{
      padding: '12px 16px',
      background: '#f0fdf4',
      border: '1px solid #86efac',
      borderRadius: 8,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 11,
            color: '#166534',
            textTransform: 'uppercase',
          }}>
            Cálculo de Dose
          </div>
          {hasWeight ? (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 14, color: '#166534' }}>
                {weightKg} kg × {dosePerKg} mg/kg = 
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#166534',
                marginLeft: 8,
              }}>
                {calculatedDose} mg
              </span>
            </div>
          ) : (
            <div style={{ color: '#92400e', fontSize: 14, marginTop: 4 }}>
              Peso não registrado - impossível calcular
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
