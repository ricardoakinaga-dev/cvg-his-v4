import { ChangeEvent, FormEvent, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { theme, px } from '@/lib/theme';
import { EncounterTimelineDocument } from '@/lib/api';

interface EncounterDocumentsTabProps {
    documents: EncounterTimelineDocument[];
    uploading: boolean;
    working: boolean;
    uploadMessage: string | null;
    onFileChange: (file: File | null) => void;
    onUpload: (e: FormEvent) => void;
    fileInputKey: number;
}

export function EncounterDocumentsTab({
    documents,
    uploading,
    working,
    uploadMessage,
    onFileChange,
    onUpload,
    fileInputKey
}: EncounterDocumentsTabProps) {

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard) {
            void navigator.clipboard.writeText(text);
            alert('ID copiado: ' + text);
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    return (
        <div style={{ display: 'grid', gap: px(20) }}>

            {/* Upload Section */}
            <Card style={{ padding: px(20) }}>
                <h2 style={{ margin: '0 0 10px', fontSize: px(18) }}>Upload de documento</h2>
                <p style={{ margin: '0 0 16px', color: theme.colors.textSecondary, fontSize: px(14) }}>
                    Selecione um arquivo para registrar seus metadados e vinculá-lo a este atendimento.
                </p>
                <form onSubmit={onUpload} style={{ display: 'grid', gap: px(16) }}>
                    <input
                        key={fileInputKey}
                        type="file"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => onFileChange(e.target.files?.[0] ?? null)}
                        style={{
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: px(theme.radius.sm),
                            padding: px(8),
                            width: '100%',
                            fontFamily: theme.typography.sans
                        }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
                        <Button
                            type="submit"
                            isLoading={uploading}
                            disabled={working}
                        >
                            {uploading ? 'Anexando...' : 'Upload e anexar'}
                        </Button>

                        {uploadMessage && (
                            <span style={{ color: theme.colors.success, fontSize: px(14), fontWeight: 500 }}>
                                {uploadMessage}
                            </span>
                        )}
                    </div>
                </form>
            </Card>

            {/* List Section */}
            <div>
                <h3 style={{ fontSize: px(16), margin: '0 0 12px', color: theme.colors.textPrimary }}>
                    Documentos Vinculados ({documents.length})
                </h3>

                {documents.length === 0 ? (
                    <Card style={{ padding: px(32), textAlign: 'center', color: theme.colors.textSecondary }}>
                        <p style={{ margin: 0 }}>Nenhum documento vinculado a este atendimento.</p>
                    </Card>
                ) : (
                    <div style={{ display: 'grid', gap: px(12) }}>
                        {documents.map((doc) => (
                            <Card key={doc.encounterDocumentId} style={{ padding: px(16), display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: px(12) }}>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 600, color: theme.colors.textPrimary, marginBottom: px(4), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {doc.filename}
                                    </div>
                                    <div style={{ fontSize: px(12), color: theme.colors.textSecondary, display: 'flex', gap: px(12) }}>
                                        <span>{formatBytes(doc.sizeBytes)}</span>
                                        <span>• {doc.mimeType}</span>
                                        <span>• {new Date(doc.attachedAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => copyToClipboard(doc.documentId)}
                                    title="Copiar ID do Documento"
                                >
                                    ID
                                </Button>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
