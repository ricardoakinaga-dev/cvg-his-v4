'use client';

import { useState } from 'react';
import { usePatientAllergies, useCurrentPatient } from '../PatientContext';

/**
 * Allergy Alert Component
 * 
 * Displays patient allergies prominently to alert clinicians.
 * Shows a summary badge and expandable list of allergies.
 */
export function AllergyAlert() {
  const allergies = usePatientAllergies();
  const patient = useCurrentPatient();
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!patient) {
    return null;
  }
  
  const hasAllergies = allergies.length > 0;
  
  // No allergies - show safe indicator
  if (!hasAllergies) {
    return (
      <div style={{
        padding: '8px 12px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>✓</span>
        <span style={{ fontSize: 13, color: '#166534' }}>
          Nenhuma alergia conhecida
        </span>
      </div>
    );
  }
  
  return (
    <div style={{
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontWeight: 600, color: '#991b1b' }}>
            Alergias ({allergies.length})
          </span>
        </div>
        <span style={{
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          color: '#991b1b',
        }}>
          ▼
        </span>
      </button>
      
      {/* Allergy List */}
      {isExpanded && (
        <div style={{
          padding: '0 12px 12px',
          borderTop: '1px solid #fecaca',
        }}>
          <ul style={{
            margin: '8px 0 0',
            padding: '0 0 0 20px',
            listStyle: 'disc',
          }}>
            {allergies.map((allergy, index) => (
              <li
                key={index}
                style={{
                  fontSize: 14,
                  color: '#7f1d1d',
                  padding: '4px 0',
                }}
              >
                {allergy}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Quick preview when collapsed */}
      {!isExpanded && (
        <div style={{
          padding: '0 12px 10px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}>
          {allergies.slice(0, 3).map((allergy, index) => (
            <span
              key={index}
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {allergy}
            </span>
          ))}
          {allergies.length > 3 && (
            <span style={{
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 4,
            }}>
              +{allergies.length - 3} mais
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Allergy Badge for smaller spaces
 */
export function AllergyBadge() {
  const allergies = usePatientAllergies();
  const patient = useCurrentPatient();
  
  if (!patient || allergies.length === 0) {
    return null;
  }
  
  return (
    <div style={{
      background: '#dc2626',
      color: '#fff',
      fontSize: 11,
      fontWeight: 600,
      padding: '4px 8px',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      <span>⚠️</span>
      <span>{allergies.length} {allergies.length === 1 ? 'alergia' : 'alergias'}</span>
    </div>
  );
}

/**
 * Allergy Warning Banner for critical display
 */
export function AllergyWarningBanner() {
  const allergies = usePatientAllergies();
  const patient = useCurrentPatient();
  
  if (!patient || allergies.length === 0) {
    return null;
  }
  
  return (
    <div style={{
      background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
      color: '#fff',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 13,
      fontWeight: 500,
    }}>
      <span style={{ fontSize: 18 }}>⚠️</span>
      <span>
        <strong>ALERTA DE ALERGIA:</strong>{' '}
        {allergies.join(', ')}
      </span>
    </div>
  );
}
