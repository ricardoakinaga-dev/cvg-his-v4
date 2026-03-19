'use client';

import { usePatientAnesthesiaRisk, useCurrentPatient } from '../PatientContext';
import type { AnesthesiaRisk } from '../types';

/**
 * Get color and label for anesthesia risk level
 */
function getRiskStyle(risk: AnesthesiaRisk | null): {
  background: string;
  border: string;
  color: string;
  label: string;
  icon: string;
} {
  switch (risk) {
    case 'low':
      return {
        background: '#f0fdf4',
        border: '#86efac',
        color: '#166534',
        label: 'Baixo',
        icon: '✓',
      };
    case 'medium':
      return {
        background: '#fef3c7',
        border: '#fcd34d',
        color: '#92400e',
        label: 'Médio',
        icon: '⚠',
      };
    case 'high':
      return {
        background: '#fef2f2',
        border: '#fecaca',
        color: '#991b1b',
        label: 'Alto',
        icon: '⚠️',
      };
    default:
      return {
        background: '#f8fafc',
        border: '#e2e8f0',
        color: '#64748b',
        label: 'Não avaliado',
        icon: '?',
      };
  }
}

/**
 * Risk Status Component
 * 
 * Displays the patient's anesthesia risk status and other risk factors.
 */
export function RiskStatus() {
  const anesthesiaRisk = usePatientAnesthesiaRisk();
  const patient = useCurrentPatient();
  
  if (!patient) {
    return null;
  }
  
  const riskStyle = getRiskStyle(anesthesiaRisk);
  
  return (
    <div style={{
      padding: '12px 16px',
      background: riskStyle.background,
      border: `1px solid ${riskStyle.border}`,
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
          <span style={{ fontSize: 20 }}>🏥</span>
          <div>
            <div style={{
              fontSize: 11,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Risco Anestésico
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: riskStyle.color,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>{riskStyle.icon}</span>
              <span>{riskStyle.label}</span>
            </div>
          </div>
        </div>
        
        {/* Risk indicator bar */}
        <div style={{
          display: 'flex',
          gap: 4,
        }}>
          {(['low', 'medium', 'high'] as AnesthesiaRisk[]).map((level) => {
            const isActive = anesthesiaRisk === level;
            const levelStyle = getRiskStyle(level);
            
            return (
              <div
                key={level}
                style={{
                  width: 24,
                  height: 8,
                  borderRadius: 4,
                  background: isActive ? levelStyle.border : '#e2e8f0',
                  transition: 'background 0.2s',
                }}
              />
            );
          })}
        </div>
      </div>
      
      {/* Additional risk factors */}
      {patient.alerts.chronic_conditions && patient.alerts.chronic_conditions.length > 0 && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px solid ${riskStyle.border}`,
        }}>
          <div style={{
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Condições Crônicas
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}>
            {patient.alerts.chronic_conditions.map((condition, index) => (
              <span
                key={index}
                style={{
                  background: '#fff',
                  border: `1px solid ${riskStyle.border}`,
                  color: riskStyle.color,
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                {condition}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Risk Badge for smaller spaces
 */
export function RiskBadge() {
  const anesthesiaRisk = usePatientAnesthesiaRisk();
  const patient = useCurrentPatient();
  
  if (!patient) {
    return null;
  }
  
  const riskStyle = getRiskStyle(anesthesiaRisk);
  
  return (
    <span style={{
      background: riskStyle.background,
      border: `1px solid ${riskStyle.border}`,
      color: riskStyle.color,
      fontSize: 11,
      fontWeight: 500,
      padding: '4px 8px',
      borderRadius: 4,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }}>
      {riskStyle.icon} {riskStyle.label}
    </span>
  );
}

/**
 * Risk Summary for quick overview
 */
export function RiskSummary() {
  const patient = useCurrentPatient();
  
  if (!patient) {
    return null;
  }
  
  const risks: { type: string; value: boolean | number | null; label: string }[] = [
    {
      type: 'aggressive',
      value: patient.highlightedAlerts.aggressive,
      label: 'Agressivo',
    },
    {
      type: 'allergies',
      value: patient.highlightedAlerts.allergiesCount,
      label: 'Alergias',
    },
    {
      type: 'anesthesia',
      value: patient.highlightedAlerts.anesthesiaRisk !== null,
      label: 'Risco Anest.',
    },
    {
      type: 'chronic',
      value: patient.highlightedAlerts.chronicConditionsCount,
      label: 'Condições',
    },
  ];
  
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
    }}>
      {risks.map((risk) => {
        const hasValue = risk.value === true || (typeof risk.value === 'number' && risk.value > 0);
        
        return (
          <span
            key={risk.type}
            style={{
              background: hasValue ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${hasValue ? '#fecaca' : '#86efac'}`,
              color: hasValue ? '#991b1b' : '#166534',
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {hasValue ? '⚠' : '✓'}
            {risk.label}
            {typeof risk.value === 'number' && risk.value > 0 && (
              <span style={{ fontWeight: 600 }}>({risk.value})</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
