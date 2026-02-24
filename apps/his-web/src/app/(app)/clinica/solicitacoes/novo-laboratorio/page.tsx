'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Label } from '../../../../../components/ui/Label';
import { Select } from '../../../../../components/ui/Select';
import { searchGlobal, listLabTests, createLabOrder } from '../../../../../lib/api';
import type { LabTestRecord } from '../../../../../lib/api';

export default function NovoPedidoLaboratorioPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');

    const [tests, setTests] = useState<LabTestRecord[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string>('');

    const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
    const [notes, setNotes] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        listLabTests({ pageSize: 100 })
            .then(res => setTests(res.data))
            .catch(console.error);
    }, []);

    const handleSearchPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!search) return;
        try {
            const res = await searchGlobal({ q: search, pageSize: 5 });
            setPatients(res.patients);
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatientId || !selectedTestId) {
            setError('Selecione um paciente e um exame.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await createLabOrder({
                patientId: selectedPatientId,
                priority,
                notes,
                items: [{ testId: selectedTestId }]
            });
            router.push('/clinica/solicitacoes');
        } catch (err: any) {
            setError(err.message || 'Erro ao criar solicitação de laboratório');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <PageHeader
                title="Nova Solicitação de Laboratório"
                description="Preencha os dados abaixo para solicitar exames laboratoriais."
                onBack={() => router.push('/clinica/solicitacoes')}
            />

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

                    <div className="space-y-4 border-b pb-6">
                        <h3 className="font-medium text-lg">1. Identificação do Paciente</h3>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Buscar paciente por nome..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="button" variant="secondary" onClick={handleSearchPatient}>Buscar</Button>
                        </div>

                        {patients.length > 0 && (
                            <div className="grid gap-2">
                                {patients.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedPatientId(p.id)}
                                        className={`p-3 border rounded cursor-pointer flex justify-between items-center ${selectedPatientId === p.id ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div>
                                            <div className="font-medium">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.species}</div>
                                        </div>
                                        {selectedPatientId === p.id && <span className="text-indigo-600 font-bold">✓ Selecionado</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 border-b pb-6">
                        <h3 className="font-medium text-lg">2. Detalhes do Pedido</h3>

                        <div>
                            <Label>Exame Laboratorial</Label>
                            <Select
                                value={selectedTestId}
                                onChange={e => setSelectedTestId(e.target.value)}
                                required
                            >
                                <option value="">-- Selecione o Exame --</option>
                                {tests.map(t => (
                                    <option key={t.id} value={t.id}>{t.code ? `[${t.code}] ` : ''}{t.name}</option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <Label>Prioridade</Label>
                            <Select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                required
                            >
                                <option value="routine">Rotina</option>
                                <option value="urgent">Urgência</option>
                                <option value="stat">Emergência (STAT)</option>
                            </Select>
                        </div>

                        <div>
                            <Label>Observações Clínicas / Suspeita</Label>
                            <textarea
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                rows={3}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => router.push('/clinica/solicitacoes')}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !selectedPatientId || !selectedTestId}>
                            {loading ? 'Salvando...' : 'Criar Solicitação'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
