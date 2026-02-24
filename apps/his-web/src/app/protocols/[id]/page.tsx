'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProtocol, type ProtocolRecord } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function resolveParamId(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] : value;
}

export default function ProtocolDetailsPage(): JSX.Element {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const protocolId = useMemo(() => resolveParamId(params?.id), [params]);
  const [protocol, setProtocol] = useState<ProtocolRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!protocolId) {
      setError('ID de protocolo invalido.');
      setLoading(false);
      return;
    }

    const currentProtocolId = protocolId;
    let active = true;
    async function loadProtocol() {
      setLoading(true);
      setError(null);
      try {
        const data = await getProtocol(currentProtocolId);
        if (active) {
          setProtocol(data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar protocolo.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProtocol();
    return () => {
      active = false;
    };
  }, [protocolId]);

  if (loading) {
    return <p style={{ padding: 24, margin: 0 }}>Carregando protocolo...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, display: 'grid', gap: 12 }}>
        <p style={{ margin: 0, color: '#dc2626' }}>{error}</p>
        <Button variant="secondary" onClick={() => router.push('/protocols')}>
          Voltar para Protocolos
        </Button>
      </div>
    );
  }

  if (!protocol) {
    return <p style={{ padding: 24, margin: 0 }}>Protocolo nao encontrado.</p>;
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{protocol.title}</h1>
        <Button variant="secondary" onClick={() => router.push('/protocols')}>
          Voltar
        </Button>
      </div>

      <Card>
        <CardBody>
          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ margin: 0 }}><strong>Slug:</strong> {protocol.slug}</p>
            <p style={{ margin: 0 }}><strong>Status:</strong> {protocol.status}</p>
            <p style={{ margin: 0 }}><strong>Especie:</strong> {protocol.species || '-'}</p>
            <p style={{ margin: 0 }}><strong>Atualizado em:</strong> {new Date(protocol.updatedAt).toLocaleString('pt-BR')}</p>
            <p style={{ margin: 0 }}><strong>Descricao:</strong> {protocol.description || '-'}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
