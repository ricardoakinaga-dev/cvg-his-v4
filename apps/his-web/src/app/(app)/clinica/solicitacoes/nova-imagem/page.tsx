'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Label } from '../../../../../components/ui/Label';
import { Select } from '../../../../../components/ui/Select';
import { searchGlobal, listImagingModalities, createImagingOrder } from '../../../../../lib/api';
import type { ImagingModalityRecord } from '../../../../../lib/api';

export default function NovaImagemPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');

    const [modalities, setModalities] = useState<ImagingModalityRecord[]>([]);
    const [selectedModalityId, setSelectedModalityId] = useState<string>('');

    const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
    const [clinicalIndication, setClinicalIndication] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        listImagingModalities({ pageSize: 100 })
            .then(res => setModalities(res.data))
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
        if (!selectedPatientId || !selectedModalityId) {
            setError('Selecione um paciente e uma modalidade.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await createImagingOrder({
                patientId: selectedPatientId,
                modalityId: selectedModalityId,
                priority,
                clinicalIndication
            });
            router.push('/clinica/solicitacoes');
        } catch (err: any) {
            setError(err.message || 'Erro ao criar solicitação de imagem');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <PageHeader
                title="Nova Solicitação de Imagem"
                description="Preencha os dados abaixo para solicitar exames de imagem."
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
                        <h3 className="font-medium text-lg">2. Detalhes do Exame</h3>

                        <div>
                            <Label>Modalidade de Imagem</Label>
                            <Select
                                value={selectedModalityId}
                                onChange={e => setSelectedModalityId(e.target.value)}
                                required
                            >
                                <option value="">-- Selecione a Modalidade --</option>
                                {modalities.map(m => (
                                    <option key={m.id} value={m.id}>{m.code ? `[${m.code}] ` : ''}{m.name}</option>
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
                            <Label>Indicação Clínica / Suspeita</Label>
                            <textarea
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                rows={3}
                                value={clinicalIndication}
                                onChange={e => setClinicalIndication(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => router.push('/clinica/solicitacoes')}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !selectedPatientId || !selectedModalityId}>
                            {loading ? 'Salvando...' : 'Criar Solicitação'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
