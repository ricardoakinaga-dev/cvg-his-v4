'use client';

import React from 'react';
import { px, row, theme } from '@/lib/theme';

interface PartnerBadgeProps {
  partnerName: string;
  discountPercent: number;
  compact?: boolean;
}

export const PartnerBadge: React.FC<PartnerBadgeProps> = ({ partnerName, discountPercent, compact = false }) => {
  if (compact) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: px(4),
        padding: px(2) + ' ' + px(6),
        background: '#E3F2FD',
        color: '#1565C0',
        borderRadius: px(4),
        fontSize: px(11),
        fontWeight: 600
      }}>
        🤝 {discountPercent}% {partnerName}
      </span>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: px(8),
      padding: px(8) + ' ' + px(12),
      background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
      border: '1px solid #90CAF9',
      borderRadius: px(theme.radius.md),
      marginBottom: px(8)
    }}>
      <span style={{ fontSize: px(16) }}>🤝</span>
      <div>
        <div style={{ fontSize: px(12), color: '#1565C0', fontWeight: 600 }}>
          Convênio: {partnerName}
        </div>
        <div style={{ fontSize: px(13), color: '#1976D2', fontWeight: 700 }}>
          {discountPercent}% de desconto
        </div>
      </div>
    </div>
  );
};

export default PartnerBadge;
