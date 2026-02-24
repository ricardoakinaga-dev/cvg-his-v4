'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AuditTrail } from '@/components/AuditTrail';
import { ClientEditModal } from '@/components/clients/ClientEditModal';
import {
    getOwnerSummary,
    type OwnerSummaryResponse
} from '@/lib/api';
import { px } from '@/lib/theme';

function resolveParamId(value: string | string[] | undefined): string | null {
    if (!value) {
        return null;
    }
    return Array.isArray(value) ? value[0] : value;
}

export default function ClientDetailsPage(): JSX.Element {
    const router = useRouter();
    const params = useParams<{ id: string | string[] }>();
    const ownerId = resolveParamId(params?.id);
    const [summary, setSummary] = useState<OwnerSummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const loadSummary = useCallback(async () => {
        if (!ownerId) {
            setErrorMessage('Cliente ID inválido.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMessage(null);
        try {
            const data = await getOwnerSummary(ownerId);
            setSummary(data);
        } catch (error) {
            setSummary(null);
            setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar cliente.');
        } finally {
            setLoading(false);
        }
    }, [ownerId]);

    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    if (loading) {
        return <p style={{ padding: px(24), margin: 0 }}>Carregando cliente...</p>;
    }

    if (errorMessage) {
        return (
            <div style={{ padding: px(24) }}>
                <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p>
                <Button variant="secondary" onClick={() => router.push('/clients')} style={{ marginTop: px(16) }}>
                    Voltar para Lista
                </Button>
            </div>
        );
    }

    if (!summary) {
        return <p style={{ padding: px(24), margin: 0 }}>Cliente não encontrado.</p>;
    }

    return (
        <div style={{ padding: px(24), display: 'flex', flexDirection: 'column', gap: px(24) }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: px(24), fontWeight: 600, color: '#111827', margin: 0 }}>
                        {summary.owner.fullName}
                    </h1>
                    <p style={{ color: '#6B7280', fontSize: px(14), margin: 0, marginTop: px(4) }}>
                        ID: {summary.owner.id}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: px(12) }}>
                    <Button variant="secondary" onClick={() => router.push('/clients')}>
                        Voltar
                    </Button>
                    <Button variant="primary" onClick={() => setIsEditModalOpen(true)}>
                        Editar Cliente
                    </Button>
                </div>
            </div>

            {/* Info Card */}
            <Card style={{ padding: px(24) }}>
                <h2 style={{ fontSize: px(18), fontWeight: 600, margin: 0, marginBottom: px(16) }}>Dados Cadastrais</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(16) }}>
                    <div>
                        <span style={{ fontSize: px(13), color: '#6B7280', display: 'block' }}>Documento</span>
                        <span style={{ fontSize: px(15), color: '#111827', fontWeight: 500 }}>
                            {summary.owner.document || 'Não informado'}
                        </span>
                    </div>
                    <div>
                        <span style={{ fontSize: px(13), color: '#6B7280', display: 'block' }}>Email</span>
                        <span style={{ fontSize: px(15), color: '#111827', fontWeight: 500 }}>
                            {summary.owner.email || 'Não informado'}
                        </span>
                    </div>
                    <div>
                        <span style={{ fontSize: px(13), color: '#6B7280', display: 'block' }}>Telefone Principal</span>
                        <span style={{ fontSize: px(15), color: '#111827', fontWeight: 500 }}>
                            {summary.owner.phoneMain || 'Não informado'}
                        </span>
                    </div>
                    <div>
                        <span style={{ fontSize: px(13), color: '#6B7280', display: 'block' }}>Telefone Alternativo</span>
                        <span style={{ fontSize: px(15), color: '#111827', fontWeight: 500 }}>
                            {summary.owner.phoneAlt || 'Não informado'}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Audit Trail */}
            <AuditTrail title="Últimas alterações" events={summary.auditTrail} />

            {/* Edit Modal */}
            <ClientEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                owner={summary.owner}
                onSuccess={() => {
                    void loadSummary();
                }}
            />
        </div>
    );
}
