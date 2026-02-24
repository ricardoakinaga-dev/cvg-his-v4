'use client';

import { useEffect, useState } from 'react';
import { getWards, type WardRecord } from '../../lib/api';

type WardSelectorProps = {
    selectedWardId: string | null;
    onSelectWard: (wardId: string) => void;
};

export function WardSelector({ selectedWardId, onSelectWard }: WardSelectorProps): JSX.Element {
    const [wards, setWards] = useState<WardRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function fetchWards() {
            try {
                setLoading(true);
                const response = await getWards({ page: 1, pageSize: 50 });
                if (mounted) {
                    setWards(response.data);

                    // Auto-select first ward if none selected and we have wards
                    if (!selectedWardId && response.data.length > 0) {
                        onSelectWard(response.data[0].id);
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError('Falha ao carregar alas.');
                    console.error(err);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        void fetchWards();

        return () => {
            mounted = false;
        };
    }, [selectedWardId, onSelectWard]);

    if (loading && wards.length === 0) {
        return <div style={{ padding: 10, color: '#64748b' }}>Carregando alas...</div>;
    }

    if (error) {
        return <div style={{ padding: 10, color: '#ef4444' }}>{error}</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
                htmlFor="ward-select"
                style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
                Ala / Unidade
            </label>
            <select
                id="ward-select"
                value={selectedWardId ?? ''}
                onChange={(e) => onSelectWard(e.target.value)}
                style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 15,
                    background: '#fff',
                    color: '#0f172a'
                }}
            >
                <option value="" disabled>Selecione uma ala</option>
                {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                        {ward.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
