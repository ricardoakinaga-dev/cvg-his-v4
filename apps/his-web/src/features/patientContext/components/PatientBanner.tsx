'use client';

import Link from 'next/link';
import { useCurrentPatient, useCurrentStay } from '../PatientContext';
import type { PatientContextInfo, StayContextInfo } from '../types';

/**
 * Format age from months to human-readable string
 */
function formatAge(ageMonths: number | null): string {
  if (ageMonths === null) return '';
  
  if (ageMonths < 12) {
    return `${ageMonths}m`;
  }
  
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  
  if (months === 0) {
    return `${years}y`;
  }
  
  return `${years}y ${months}m`;
}

/**
 * Format sex abbreviation
 */
function formatSex(sex: string | null): string {
  if (!sex) return '';
  
  const sexMap: Record<string, string> = {
    'male': 'M',
    'female': 'F',
    'M': 'M',
    'F': 'F',
  };
  
  return sexMap[sex] || sex;
}

/**
 * Patient Banner Component
 * 
 * Displays the current patient's basic information in a banner format.
 * Shows name, species, breed, sex, age, and owner information.
 */
export function PatientBanner() {
  const patient = useCurrentPatient();
  const stay = useCurrentStay();
  
  if (!patient) {
    return (
      <div style={{
        padding: '12px 16px',
        background: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
        color: '#64748b',
        fontSize: 14,
      }}>
        Nenhum paciente selecionado
      </div>
    );
  }
  
  return (
    <div style={{
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderBottom: '1px solid #334155',
      color: '#fff',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        {/* Patient Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Patient Icon */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            🐾
          </div>
          
          {/* Patient Details */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Link
                href={`/patients/${patient.id}`}
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#fff',
                  textDecoration: 'none',
                }}
              >
                {patient.name}
              </Link>
              
              {patient.highlightedAlerts.aggressive && (
                <span style={{
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}>
                    Aggressive
                  </span>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 4,
              fontSize: 13,
              color: '#94a3b8',
            }}>
              <span>{patient.species}</span>
              {patient.breed && (
                <>
                  <span>•</span>
                  <span>{patient.breed}</span>
                </>
              )}
              {patient.sex && (
                <>
                  <span>•</span>
                  <span>{formatSex(patient.sex)}</span>
                </>
              )}
              {patient.ageMonths !== null && (
                <>
                  <span>•</span>
                  <span>{formatAge(patient.ageMonths)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Owner and Stay Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          {/* Owner */}
          {patient.ownerName && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>
                Owner
              </div>
              <div style={{ fontSize: 14, color: '#e2e8f0' }}>
                {patient.ownerName}
              </div>
            </div>
          )}
          
          {/* Stay Info */}
          {stay && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>
                Location
              </div>
              <div style={{ fontSize: 14, color: '#e2e8f0' }}>
                {stay.wardName} • {stay.bedName}
              </div>
            </div>
          )}
          
          {/* Microchip */}
          {patient.microchip && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>
                Microchip
              </div>
              <div style={{ fontSize: 14, color: '#e2e8f0', fontFamily: 'monospace' }}>
                {patient.microchip}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Patient Banner for smaller spaces
 */
export function PatientBannerCompact() {
  const patient = useCurrentPatient();
  const stay = useCurrentStay();
  
  if (!patient) {
    return (
      <div style={{
        padding: '8px 12px',
        background: '#f1f5f9',
        borderRadius: 6,
        color: '#64748b',
        fontSize: 13,
      }}>
        No patient
      </div>
    );
  }
  
  return (
    <div style={{
      padding: '8px 12px',
      background: '#0f172a',
      borderRadius: 6,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{ fontSize: 16 }}>🐾</span>
      <div>
        <span style={{ fontWeight: 500 }}>{patient.name}</span>
        <span style={{ color: '#94a3b8', marginLeft: 8 }}>
          {patient.species}
          {patient.breed && ` • ${patient.breed}`}
        </span>
        {stay && (
          <span style={{ color: '#94a3b8', marginLeft: 8 }}>
            • {stay.bedName}
          </span>
        )}
      </div>
      {patient.highlightedAlerts.aggressive && (
        <span style={{
          background: '#dc2626',
          color: '#fff',
          fontSize: 9,
          fontWeight: 600,
          padding: '2px 4px',
          borderRadius: 3,
        }}>
          AGG
        </span>
      )}
    </div>
  );
}
