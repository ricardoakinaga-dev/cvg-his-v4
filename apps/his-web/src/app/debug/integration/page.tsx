'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { apiClient } from '../../../lib/api/client';

type TestResult = {
    name: string;
    endpoint: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message?: string;
    durationMs?: number;
};

const INITIAL_TESTS: TestResult[] = [
    { name: 'Sessão Dev', endpoint: '/api/auth/session', status: 'pending' },
    { name: 'Proxy Root', endpoint: '/api/backend/health', status: 'pending' },
    { name: 'Ping (Sem Auth)', endpoint: '/ping', status: 'pending' },
    { name: 'Me (Auth)', endpoint: '/auth/me', status: 'pending' },
    { name: 'Resumo Dashboard', endpoint: '/dashboard/summary', status: 'pending' },
    { name: 'Lista Clientes', endpoint: '/owners?page=1&pageSize=1', status: 'pending' },
    { name: 'Lista Animais', endpoint: '/patients?page=1&pageSize=1', status: 'pending' },
    { name: 'Agenda Imagem', endpoint: '/imaging/schedule', status: 'pending' },
    { name: 'Painel Internação', endpoint: '/inpatient/panel', status: 'pending' },
    { name: 'Configurações', endpoint: '/settings/clinica', status: 'pending' },
];

export default function IntegrationDebugPage() {
    const [tests, setTests] = useState<TestResult[]>(INITIAL_TESTS);
    const [isRunning, setIsRunning] = useState(false);

    const updateTest = (index: number, update: Partial<TestResult>) => {
        setTests(current => current.map((t, i) => i === index ? { ...t, ...update } : t));
    };

    const runSystemTests = async () => {
        setIsRunning(true);

        // Reset tests
        setTests(current => current.map(t => ({ ...t, status: 'pending', message: undefined, durationMs: undefined })));

        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            updateTest(i, { status: 'running' });

            const start = Date.now();
            try {
                // Rotas Next.js nativas vs API proxy
                if (test.endpoint.startsWith('/api/')) {
                    const res = await fetch(test.endpoint);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                } else {
                    await apiClient(test.endpoint);
                }

                updateTest(i, {
                    status: 'success',
                    durationMs: Date.now() - start,
                    message: 'OK'
                });
            } catch (error: any) {
                updateTest(i, {
                    status: 'error',
                    durationMs: Date.now() - start,
                    message: error.message || 'Erro desconhecido'
                });
            }
        }

        setIsRunning(false);
    };

    const getStatusBadge = (status: TestResult['status']) => {
        switch (status) {
            case 'pending': return <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">Pendente</span>;
            case 'running': return <span className="text-blue-500 bg-blue-100 px-2 py-1 rounded text-xs animate-pulse">Testando...</span>;
            case 'success': return <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">OK ✓</span>;
            case 'error': return <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold">Falha ✗</span>;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Diagnóstico de Integração (HIS-WEB ↔ HIS-API)"
                description="Painel de uso exclusivo para desenvolvedores verificarem as rotas e proxy."
            />

            <Card>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-semibold text-lg">Testes de Fumaça (Smoke Tests)</h3>
                        <p className="text-sm text-gray-500">Verifica se todos os endpoints vitais respondem sem erro 500 no proxy.</p>
                    </div>
                    <Button onClick={runSystemTests} disabled={isRunning}>
                        {isRunning ? 'Executando...' : 'Rodar Testes'}
                    </Button>
                </div>

                <div className="divide-y divide-gray-200">
                    {tests.map((test, index) => (
                        <div key={index} className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="font-medium">{test.name}</h4>
                                <code className="text-xs text-gray-500 font-mono mt-1">{test.endpoint}</code>
                            </div>
                            <div className="flex-1 flex justify-end items-center gap-4">
                                {test.message && test.status === 'error' && (
                                    <div className="text-red-600 text-sm max-w-sm truncate" title={test.message}>
                                        {test.message}
                                    </div>
                                )}
                                {test.durationMs !== undefined && (
                                    <div className="text-gray-400 text-xs font-mono">
                                        {test.durationMs}ms
                                    </div>
                                )}
                                <div className="w-24 text-right">
                                    {getStatusBadge(test.status)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
