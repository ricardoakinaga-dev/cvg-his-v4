'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { listMedicationOrders, type MedicationOrderRecord } from '@/lib/api';
import { theme } from '@/lib/theme';

type PrescriptionPrintViewProps = {
    patientId: string;
    encounterId: string;
    onClose: () => void;
};

export function PrescriptionPrintView({ patientId, encounterId, onClose }: PrescriptionPrintViewProps): JSX.Element {
    const [orders, setOrders] = useState<MedicationOrderRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listMedicationOrders({ encounterId, status: 'active', page: 1, pageSize: 100 });
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [encounterId]);

    useEffect(() => {
        void load();
    }, [load]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ background: '#fff', minHeight: '100vh', padding: 20 }}>
            {/* No-print controls */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
                <Button variant="secondary" onClick={onClose}>Voltar</Button>
                <div style={{ gap: 8, display: 'flex' }}>
                    <Button onClick={handlePrint}>Imprimir (Browser)</Button>
                </div>
            </div>

            {/* Printable Content */}
            <div style={{ fontFamily: 'sans-serif', color: '#000' }}>
                <header style={{ textAlign: 'center', marginBottom: 40 }}>
                    <h1 style={{ margin: 0, fontSize: 24 }}>Clínica Veterinária CVG</h1>
                    <p style={{ margin: 0, color: '#666' }}>Rua Exemplo, 123 - Cidade/UF</p>
                    <p style={{ margin: 0, color: '#666' }}>Tel: (00) 1234-5678</p>
                </header>

                <div style={{ marginBottom: 30 }}>
                    <h2 style={{ fontSize: 18, borderBottom: '2px solid #000', paddingBottom: 4 }}>Receita Médica Veterinária</h2>
                    <p><strong>Paciente ID:</strong> {patientId}</p>
                    <p><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {loading ? (
                    <p>Carregando prescrições...</p>
                ) : orders.length === 0 ? (
                    <p>Nenhuma prescrição ativa encontrada para este atendimento.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {orders.map((order, index) => (
                            <li key={order.id} style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '1px dashed #ccc' }}>
                                <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                                    {index + 1}. {order.medicationName} {order.doseValue} {order.doseUnit}
                                </div>
                                <div style={{ marginLeft: 20, marginTop: 4 }}>
                                    <div><strong>Via:</strong> {order.route}</div>
                                    <div><strong>Frequência:</strong> {order.frequencyType}</div>
                                    {order.durationValue && (
                                        <div><strong>Duração:</strong> {order.durationValue} {order.durationUnit}</div>
                                    )}
                                    <div style={{ marginTop: 4, fontStyle: 'italic' }}>
                                        Uso: __________________________________________________
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <footer style={{ marginTop: 60, textAlign: 'center', borderTop: '1px solid #000', paddingTop: 20, width: '60%', marginLeft: 'auto', marginRight: 'auto' }}>
                    <p style={{ marginBottom: 40 }}>__________________________________________</p>
                    <p>Assinatura e Carimbo do Veterinário</p>
                </footer>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    body {
                        background: #fff;
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
}
