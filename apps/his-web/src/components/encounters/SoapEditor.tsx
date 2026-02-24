'use client';

import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { api } from '../../lib/api';

interface SoapEditorProps {
    encounterId: string;
    onSaveSuccess?: () => void;
}

export function SoapEditor({ encounterId, onSaveSuccess }: SoapEditorProps) {
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!subjective && !objective && !assessment && !plan) {
            setError('Preencha ao menos um dos campos da evolução clínica.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            // Create a Draft or Signed Note here
            // For MVP we just push a Note creation
            await api.post(`/encounters/${encounterId}/notes`, {
                soap: {
                    subjective,
                    objective,
                    assessment,
                    plan,
                },
                reason: 'Evolução clínica'
            });

            onSaveSuccess?.();

            // Clear form
            setSubjective('');
            setObjective('');
            setAssessment('');
            setPlan('');
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar evolução');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div>
                <Label>Subjetivo (Histórico, reclamações, anamnese)</Label>
                <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    value={subjective}
                    onChange={(e) => setSubjective(e.target.value)}
                    placeholder="O que o tutor relata?"
                />
            </div>

            <div>
                <Label>Objetivo (Exame físico, exames complementares)</Label>
                <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="O que você observou / aferiu?"
                />
            </div>

            <div>
                <Label>Avaliação (Diagnósticos, diferenciais)</Label>
                <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={2}
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="Impressão diagnóstica"
                />
            </div>

            <div>
                <Label>Plano (Prescrição, encaminhamentos, dietas)</Label>
                <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Conduta tomada"
                />
            </div>

            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Registrando...' : 'Salvar Evolução'}
                </Button>
            </div>
        </div>
    );
}
