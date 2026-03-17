'use client';

import { theme, px } from '../lib/theme';
import type { HandoverBuildStatus } from '../lib/api';

type BuildStatusBadgeProps = {
  status: HandoverBuildStatus;
};

const STATUS_META: Record<HandoverBuildStatus, { label: string; color: string; background: string }> = {
  pending: { label: 'Pendente', color: theme.colors.warning, background: theme.colors.warningBg },
  building: { label: 'Processando', color: theme.colors.info, background: theme.colors.infoBg },
  ready: { label: 'Pronto', color: theme.colors.success, background: theme.colors.successBg },
  failed: { label: 'Falhou', color: theme.colors.danger, background: theme.colors.dangerBg }
};

export function BuildStatusBadge({ status }: BuildStatusBadgeProps): JSX.Element {
  const meta = STATUS_META[status] ?? STATUS_META.pending;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: px(theme.radius.full),
        padding: '4px 10px',
        fontSize: px(12),
        fontWeight: 700,
        color: meta.color,
        backgroundColor: meta.background
      }}
    >
      {meta.label}
    </span>
  );
}

