'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { Label } from '../../../../../components/ui/Label';
import { api, searchGlobal } from '../../../../../lib/api';
import type { Patient } from '../../../../../lib/api';

export default function NovoAtendimentoPage() {
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!search.trim()) return;

        setSearching(true);
        setError(null);
        try {
            const resp = await searchGlobal({ q: search, pageSize: 5 });
            setPatients(resp.patients);
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar pacientes');
        } finally {
            setSearching(false);
        }
    };

    const handleCreate = async () => {
        if (!selectedPatient) return;

        setLoading(true);
        setError(null);
        try {
            // POST to /encounters based on his-api schema
            const encounter = await api.post<any>('/encounters', {
                patientId: selectedPatient.id,
                reason: reason || undefined
            });

            router.push(`/clinica/atendimentos/${encounter.id}`);
        } catch (err: any) {
            setError(err.message || 'Erro ao iniciar atendimento');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <PageHeader
                title="Novo Atendimento"
                description="Selecione o paciente para iniciar o prontuário clínico"
            />

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md">
                    {error}
                </div>
            )}

            {/* Patient Selection Step */}
            <Card>
                <div className="space-y-6">
                    <div className="border-b pb-4">
                        <h3 className="text-lg font-medium">1. Identificação do Paciente</h3>
                        <p className="text-sm text-gray-500">Busque pelo nome do paciente ou tutor</p>
                    </div>

                    <form onSubmit={handleSearch} className="flex gap-4">
                        <Input
                            placeholder="Nome do paciente, microchip..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={searching}>
                            {searching ? 'Buscando...' : 'Buscar'}
                        </Button>
                    </form>

                    {patients.length > 0 && !selectedPatient && (
                        <div className="mt-4 border rounded-md divide-y">
                            {patients.map(p => (
                                <div
                                    key={p.id}
                                    className="p-4 hover:bg-gray-50 flex justify-between items-center cursor-pointer"
                                    onClick={() => setSelectedPatient(p)}
                                >
                                    <div>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-sm text-gray-500">{p.species} • Microchip: {p.microchip || '-'}</div>
                                    </div>
                                    <Button variant="secondary" size="sm">Selecionar</Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedPatient && (
                        <div className="mt-4 p-4 border rounded-md bg-blue-50 border-blue-200 flex justify-between items-center">
                            <div>
                                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider block mb-1">Paciente Selecionado</span>
                                <span className="font-medium text-blue-900">{selectedPatient.name}</span>
                                <span className="text-sm text-blue-700 ml-2">({selectedPatient.species})</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)} className="text-blue-700 hover:bg-blue-100">
                                Trocar
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Encounter Details Step */}
            {selectedPatient && (
                <Card>
                    <div className="space-y-6">
                        <div className="border-b pb-4">
                            <h3 className="text-lg font-medium">2. Detalhes do Atendimento</h3>
                            <p className="text-sm text-gray-500">Motivo principal da consulta</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>Motivo (opcional)</Label>
                                <Input
                                    placeholder="Ex: Vacina anual, Vômito e diarreia, etc."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button
                                    onClick={handleCreate}
                                    disabled={loading}
                                >
                                    {loading ? 'Iniciando...' : 'Iniciar Atendimento'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
