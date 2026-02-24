'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { apiClient } from '../../../../../lib/api/client';
import { PatientCreate } from '../../../../../lib/api';

export default function CreatePatientPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialOwnerId = searchParams.get('ownerId') || '';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        species: 'Canino',
        breed: '',
        sex: 'M',
        ownerId: initialOwnerId,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.ownerId) {
                throw new Error('ID do tutor é obrigatório');
            }

            const payload: PatientCreate = {
                name: formData.name,
                species: formData.species,
                ownerId: formData.ownerId,
                breed: formData.breed || undefined,
                sex: formData.sex || undefined,
            };

            const result = await apiClient<{ id: string }>('/patients', {
                method: 'POST',
                body: payload
            });

            router.push(`/geral/animais/${result.id}`);
        } catch (err: any) {
            setError(err.message || 'Erro ao cadastrar animal');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Novo Animal"
                description="Cadastrar um novo animal"
                breadcrumbs={[
                    { label: 'Animais', href: '/geral/animais' },
                    { label: 'Novo Animal' }
                ]}
            />

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md">
                    <p>{error}</p>
                </div>
            )}

            <Card>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome do Animal <span className="text-red-500">*</span>
                            </label>
                            <Input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Rex"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Espécie <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                value={formData.species}
                                onChange={(e) => setFormData(prev => ({ ...prev, species: e.target.value }))}
                            >
                                <option value="Canino">Canino</option>
                                <option value="Felino">Felino</option>
                                <option value="Equino">Equino</option>
                                <option value="Bovino">Bovino</option>
                                <option value="Ave">Ave</option>
                                <option value="Roedor">Roedor</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Raça
                            </label>
                            <Input
                                value={formData.breed}
                                onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                                placeholder="Ex: Poodle"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sexo
                            </label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                value={formData.sex}
                                onChange={(e) => setFormData(prev => ({ ...prev, sex: e.target.value }))}
                            >
                                <option value="M">Macho</option>
                                <option value="F">Fêmea</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ID do Tutor (Owner ID) <span className="text-red-500">*</span>
                            </label>
                            <Input
                                required
                                value={formData.ownerId}
                                onChange={(e) => setFormData(prev => ({ ...prev, ownerId: e.target.value }))}
                                placeholder="UUID do tutor"
                            />
                            <p className="text-xs text-gray-500 mt-1">Geralmente preenchido automaticamente ao vir do perfil do cliente.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-6">
                        <Link href={initialOwnerId ? `/geral/clientes/${initialOwnerId}` : '/geral/animais'}>
                            <Button type="button" variant="secondary" disabled={loading}>
                                Cancelar
                            </Button>
                        </Link>
                        <Button type="submit" disabled={loading || !formData.name.trim() || !formData.ownerId.trim()}>
                            {loading ? 'Salvando...' : 'Criar Animal'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
