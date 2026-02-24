'use client';

import { resolveApiBaseUrl, type HandoverDocumentRecord, type HandoverWithItemsResponse } from '../lib/api';
import { BuildStatusBadge } from './BuildStatusBadge';

type HandoverPublishPanelProps = {
  handover: HandoverWithItemsResponse | null;
  document: HandoverDocumentRecord | null;
  submittingDraft: boolean;
  publishing: boolean;
  refreshing: boolean;
  polling: boolean;
  publishDisabled: boolean;
  publishDisabledReason: string | null;
  errorMessage: string | null;
  successMessage: string | null;
  onPublish: () => void;
  onRefreshStatus: () => void;
  onRetry: () => void;
  onLoadDocument: () => void;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR');
}

function resolveDocumentHref(storageKey: string): string {
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey;
  }

  const normalizedBaseUrl = resolveApiBaseUrl();
  const normalizedKey = storageKey.startsWith('/') ? storageKey : `/${storageKey}`;
  return `${normalizedBaseUrl}${normalizedKey}`;
}

export function HandoverPublishPanel({
  handover,
  document,
  submittingDraft,
  publishing,
  refreshing,
  polling,
  publishDisabled,
  publishDisabledReason,
  errorMessage,
  successMessage,
  onPublish,
  onRefreshStatus,
  onRetry,
  onLoadDocument
}: HandoverPublishPanelProps): JSX.Element {
  const isBusy = submittingDraft || publishing;
  const handoverRecord = handover?.handover ?? null;
  const canRetry = handoverRecord?.buildStatus === 'failed';
  const canLoadDocument = handoverRecord?.buildStatus === 'ready';
  const documentHref = document ? resolveDocumentHref(document.storageKey) : null;

  return (
    <aside
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        background: '#ffffff',
        padding: 14,
        display: 'grid',
        gap: 12
      }}
    >
      <h3 style={{ margin: 0 }}>Publicação</h3>

      {handoverRecord ? (
        <div style={{ display: 'grid', gap: 6, fontSize: 14, color: '#334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Status build:</span>
            <BuildStatusBadge status={handoverRecord.buildStatus} />
            {polling ? <span style={{ color: '#64748b' }}>atualizando...</span> : null}
          </div>
          <span>Handover ID: {handoverRecord.id}</span>
          <span>Publicado em: {formatDateTime(handoverRecord.publishedAt)}</span>
        </div>
      ) : (
        <p style={{ margin: 0, color: '#475569' }}>
          Salve ou publique um draft para iniciar o acompanhamento do build.
        </p>
      )}

      {handoverRecord?.buildStatus === 'failed' && handoverRecord.buildError ? (
        <p style={{ margin: 0, color: '#b91c1c' }}>
          Falha no build: {handoverRecord.buildError}
        </p>
      ) : null}

      {successMessage ? <p style={{ margin: 0, color: '#047857' }}>{successMessage}</p> : null}
      {errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p> : null}

      {publishDisabled && publishDisabledReason ? (
        <p style={{ margin: 0, color: '#b45309' }}>{publishDisabledReason}</p>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          onClick={onPublish}
          disabled={isBusy || publishDisabled}
          style={{
            border: 0,
            borderRadius: 8,
            padding: '8px 12px',
            background: '#0f172a',
            color: '#fff',
            cursor: 'pointer',
            opacity: isBusy || publishDisabled ? 0.6 : 1
          }}
        >
          {publishing ? 'Publicando...' : 'Publicar'}
        </button>

        <button
          type="button"
          onClick={onRefreshStatus}
          disabled={!handoverRecord || refreshing || publishing}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 12px',
            background: '#fff',
            color: '#0f172a',
            cursor: 'pointer'
          }}
        >
          Atualizar status
        </button>

        <button
          type="button"
          onClick={onRetry}
          disabled={!canRetry || isBusy}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 12px',
            background: '#fff',
            color: '#0f172a',
            cursor: 'pointer',
            opacity: !canRetry || isBusy ? 0.6 : 1
          }}
        >
          Tentar novamente
        </button>
      </div>

      {canLoadDocument ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onLoadDocument}
            style={{
              border: '1px solid #16a34a',
              borderRadius: 8,
              padding: '8px 12px',
              background: '#dcfce7',
              color: '#166534',
              cursor: 'pointer'
            }}
          >
            Carregar documento
          </button>

          {documentHref ? (
            <a
              href={documentHref}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#166534', fontWeight: 600 }}
            >
              Abrir documento
            </a>
          ) : null}

          {document ? (
            <span style={{ color: '#475569', fontSize: 13 }}>
              {document.filename} ({document.mimeType})
            </span>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
