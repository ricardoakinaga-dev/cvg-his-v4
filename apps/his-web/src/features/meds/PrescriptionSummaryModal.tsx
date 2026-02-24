'use client';

import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

type PrescriptionSummaryModalProps = {
    open: boolean;
    summaryText: string;
    onClose: () => void;
    onRegister?: () => void;
    registering?: boolean;
};

export function PrescriptionSummaryModal({
    open,
    summaryText,
    onClose,
    onRegister,
    registering = false
}: PrescriptionSummaryModalProps): JSX.Element | null {
    const [copied, setCopied] = useState(false);

    if (!open) return null;

    const handleCopy = () => {
        void navigator.clipboard.writeText(summaryText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isEmpty = !summaryText.trim();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 24,
                width: '100%',
                maxWidth: 600,
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: theme.colors.textPrimary }}>
                        Resumo da Prescrição
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 24,
                            cursor: 'pointer',
                            color: theme.colors.textSecondary
                        }}
                    >
                        ×
                    </button>
                </div>

                {isEmpty ? (
                    <div style={{
                        padding: 32,
                        textAlign: 'center',
                        color: theme.colors.textSecondary,
                        border: `1px dashed ${theme.colors.border}`,
                        borderRadius: 8
                    }}>
                        <p>Nenhuma prescrição ativa encontrada para este atendimento.</p>
                        <p style={{ fontSize: 13 }}>Crie uma nova ordem para gerar o resumo.</p>
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={onClose}>
                                Fechar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: 6,
                            backgroundColor: '#f8fafc'
                        }}>
                            <textarea
                                value={summaryText}
                                readOnly
                                style={{
                                    width: '100%',
                                    height: '300px',
                                    padding: 12,
                                    border: 'none',
                                    resize: 'none',
                                    fontFamily: 'monospace',
                                    fontSize: 13,
                                    outline: 'none',
                                    backgroundColor: 'transparent'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                            <Button variant="secondary" onClick={onClose}>
                                Fechar
                            </Button>

                            {onRegister && (
                                <Button
                                    variant="secondary"
                                    onClick={onRegister}
                                    disabled={registering}
                                    title="Registra um documento na timeline sem arquivo físico"
                                >
                                    {registering ? 'Registrando...' : '📂 Registrar como Documento'}
                                </Button>
                            )}

                            <Button onClick={handleCopy}>
                                {copied ? 'Copiado!' : '📋 Copiar para área de transferência'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
