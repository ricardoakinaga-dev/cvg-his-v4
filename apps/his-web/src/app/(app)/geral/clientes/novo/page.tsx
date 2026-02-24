'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { apiClient } from '../../../../../lib/api/client';
import { OwnerCreate } from '../../../../../lib/api';

export default function CreateClientPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        document: '',
        email: '',
        phoneMain: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload: OwnerCreate = {
                fullName: formData.fullName,
                document: formData.document || undefined,
                email: formData.email || undefined,
                phoneMain: formData.phoneMain || undefined,
            };

            const result = await apiClient<{ id: string }>('/owners', {
                method: 'POST',
                body: payload,
            });

            router.push(`/geral/clientes/${result.id}`);
        } catch (err: any) {
            setError(err.message || 'Erro ao criar o cliente');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Novo Cliente"
                description="Cadastrar um novo tutor/cliente na clínica"
                breadcrumbs={[
                    { label: 'Clientes', href: '/geral/clientes' },
                    { label: 'Novo Cliente' }
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
                                Nome Completo <span className="text-red-500">*</span>
                            </label>
                            <Input
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                placeholder="Ex: João da Silva"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Documento (CPF/RG)
                            </label>
                            <Input
                                value={formData.document}
                                onChange={(e) => setFormData(prev => ({ ...prev, document: e.target.value }))}
                                placeholder="Ex: 000.000.000-00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                E-mail
                            </label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Ex: joao@email.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefone Principal
                            </label>
                            <Input
                                value={formData.phoneMain}
                                onChange={(e) => setFormData(prev => ({ ...prev, phoneMain: e.target.value }))}
                                placeholder="Ex: (11) 99999-9999"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-6">
                        <Link href="/geral/clientes">
                            <Button type="button" variant="secondary" disabled={loading}>
                                Cancelar
                            </Button>
                        </Link>
                        <Button type="submit" disabled={loading || !formData.fullName.trim()}>
                            {loading ? 'Salvando...' : 'Criar Cliente'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
