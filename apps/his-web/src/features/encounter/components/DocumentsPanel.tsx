import { useState, useCallback, useRef, ChangeEvent, FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { theme, px } from '@/lib/theme';
import { EncounterTimelineDocument } from '@/lib/api';

interface DocumentsPanelProps {
  /** List of documents attached to the encounter */
  documents: EncounterTimelineDocument[];
  /** Upload handler */
  onUpload: (file: File) => Promise<void>;
  /** Preview handler (optional) */
  onPreview?: (document: EncounterTimelineDocument) => void;
  /** Download handler (optional) */
  onDownload?: (document: EncounterTimelineDocument) => void;
  /** Whether an upload is in progress */
  isUploading?: boolean;
  /** Whether the panel is in readonly mode */
  readonly?: boolean;
  /** Compact mode for sidebar */
  compact?: boolean;
}

/**
 * File type icons mapping
 */
const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'text/plain': '📃',
  'application/zip': '📦',
};

/**
 * Get icon for file type
 */
function getFileIcon(mimeType: string): string {
  return FILE_ICONS[mimeType] ?? '📎';
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * DocumentsPanel Component
 *
 * Document management panel with:
 * - Drag and drop upload
 * - File type icons
 * - Preview/Download actions
 * - Upload progress indicator
 *
 * @example
 * ```tsx
 * <DocumentsPanel
 *   documents={documents}
 *   onUpload={handleUpload}
 *   onPreview={handlePreview}
 *   onDownload={handleDownload}
 * />
 * ```
 */
export function DocumentsPanel({
  documents,
  onUpload,
  onPreview,
  onDownload,
  isUploading = false,
  readonly = false,
  compact = false,
}: DocumentsPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection
   */
  const handleFile = useCallback(
    async (file: File) => {
      if (!file || file.size === 0) return;

      setUploadMessage(null);

      try {
        await onUpload(file);
        setUploadMessage({ type: 'success', text: 'Documento anexado com sucesso!' });
        // Clear message after 3 seconds
        setTimeout(() => setUploadMessage(null), 3000);
      } catch (error) {
        setUploadMessage({ type: 'error', text: 'Falha ao anexar documento.' });
      }
    },
    [onUpload]
  );

  /**
   * Handle drag events
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (readonly) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile, readonly]
  );

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      // Reset input
      e.target.value = '';
    },
    [handleFile]
  );

  /**
   * Handle form submit
   */
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile]
  );

  /**
   * Copy document ID to clipboard
   */
  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setUploadMessage({ type: 'success', text: 'ID copiado!' });
    setTimeout(() => setUploadMessage(null), 2000);
  };

  return (
    <div style={{ display: 'grid', gap: compact ? px(12) : px(20) }}>
      {/* Upload Section */}
      {!readonly && (
        <Card
          style={{
            padding: compact ? px(12) : px(20),
            border: dragActive ? `2px dashed ${theme.colors.primary}` : undefined,
            background: dragActive ? theme.colors.pageBg : undefined,
            transition: 'all 0.2s ease',
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <h2
            style={{
              margin: compact ? '0 0 8px' : '0 0 10px',
              fontSize: compact ? px(16) : px(18),
            }}
          >
            Upload de Documento
          </h2>

          {!compact && (
            <p
              style={{
                margin: '0 0 16px',
                color: theme.colors.textSecondary,
                fontSize: px(14),
              }}
            >
              Arraste um arquivo ou selecione abaixo para anexar a este atendimento.
            </p>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: px(12) }}>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleInputChange}
              style={{
                border: `1px solid ${theme.colors.border}`,
                borderRadius: px(theme.radius.sm),
                padding: px(8),
                width: '100%',
                fontFamily: theme.typography.sans,
                background: theme.colors.surface,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
              <Button type="submit" isLoading={isUploading} disabled={isUploading}>
                {isUploading ? 'Anexando...' : 'Anexar Documento'}
              </Button>

              {uploadMessage && (
                <span
                  style={{
                    color: uploadMessage.type === 'success' ? theme.colors.success : theme.colors.danger,
                    fontSize: px(14),
                    fontWeight: 500,
                  }}
                >
                  {uploadMessage.text}
                </span>
              )}
            </div>
          </form>
        </Card>
      )}

      {/* Documents List */}
      <div>
        <h3
          style={{
            fontSize: compact ? px(14) : px(16),
            margin: compact ? '0 0 8px' : '0 0 12px',
            color: theme.colors.textPrimary,
          }}
        >
          Documentos Vinculados ({documents.length})
        </h3>

        {documents.length === 0 ? (
          <Card
            style={{
              padding: compact ? px(16) : px(32),
              textAlign: 'center',
              color: theme.colors.textSecondary,
            }}
          >
            <p style={{ margin: 0 }}>
              {readonly
                ? 'Nenhum documento vinculado.'
                : 'Nenhum documento vinculado a este atendimento.'}
            </p>
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: px(8) }}>
            {documents.map((doc) => (
              <DocumentCard
                key={doc.encounterDocumentId}
                document={doc}
                compact={compact}
                onPreview={onPreview}
                onDownload={onDownload}
                onCopyId={copyToClipboard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual document card component
 */
function DocumentCard({
  document,
  compact,
  onPreview,
  onDownload,
  onCopyId,
}: {
  document: EncounterTimelineDocument;
  compact: boolean;
  onPreview?: (doc: EncounterTimelineDocument) => void;
  onDownload?: (doc: EncounterTimelineDocument) => void;
  onCopyId: (id: string) => void;
}) {
  const icon = getFileIcon(document.mimeType);

  return (
    <Card
      style={{
        padding: compact ? px(12) : px(16),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: px(12),
      }}
    >
      {/* Icon and Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: px(12), overflow: 'hidden', flex: 1 }}>
        <span style={{ fontSize: compact ? px(20) : px(24) }}>{icon}</span>
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              fontWeight: 600,
              color: theme.colors.textPrimary,
              marginBottom: px(2),
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: compact ? px(13) : px(14),
            }}
          >
            {document.filename}
          </div>
          <div
            style={{
              fontSize: px(11),
              color: theme.colors.textSecondary,
              display: 'flex',
              gap: px(8),
              flexWrap: 'wrap',
            }}
          >
            <span>{formatBytes(document.sizeBytes)}</span>
            <span>•</span>
            <span>{formatDate(document.attachedAt)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: px(4), flexShrink: 0 }}>
        {onPreview && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPreview(document)}
            title="Visualizar"
          >
            👁️
          </Button>
        )}
        {onDownload && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDownload(document)}
            title="Baixar"
          >
            ⬇️
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onCopyId(document.documentId)}
          title="Copiar ID"
        >
          ID
        </Button>
      </div>
    </Card>
  );
}

export default DocumentsPanel;
