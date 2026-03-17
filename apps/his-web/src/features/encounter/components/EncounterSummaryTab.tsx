import { EncounterData } from '../types';
import { Card } from '@/components/ui/Card';
import { theme, px } from '@/lib/theme';

interface EncounterSummaryTabProps {
    data: EncounterData;
}

export function EncounterSummaryTab({ data }: EncounterSummaryTabProps) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: px(12)
            }}
        >
            <StatCard label="Notas Clínicas" value={data.notes.length} />
            <StatCard label="Versões de Histórico" value={data.versions.length} />
            <StatCard label="Documentos Anexos" value={data.documents.length} />
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <Card style={{ padding: px(14), display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ margin: 0, color: theme.colors.textSecondary, fontSize: px(13) }}>{label}</span>
            <strong style={{ fontSize: px(24), lineHeight: 1.2 }}>{value}</strong>
        </Card>
    );
}
