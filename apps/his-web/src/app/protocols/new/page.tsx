'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProtocol, type ProtocolStatus } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function NewProtocolPage(): JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: '',
    title: '',
    description: '',
    species: '',
    status: 'draft' as ProtocolStatus
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.slug.trim() || !form.title.trim()) {
      setError('Slug e titulo sao obrigatorios.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createProtocol({
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        species: form.species.trim() || undefined,
        status: form.status
      });
      router.push(`/protocols/${created.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao criar protocolo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Novo Protocolo</h1>
        <Button variant="secondary" onClick={() => router.push('/protocols')}>
          Voltar
        </Button>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <label>
              Titulo
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                style={{ width: '100%', marginTop: 4, padding: '8px 10px' }}
              />
            </label>

            <label>
              Slug
              <input
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="protocolo-cvg"
                style={{ width: '100%', marginTop: 4, padding: '8px 10px' }}
              />
            </label>

            <label>
              Especie
              <input
                value={form.species}
                onChange={(event) => setForm((prev) => ({ ...prev, species: event.target.value }))}
                placeholder="canina, felina..."
                style={{ width: '100%', marginTop: 4, padding: '8px 10px' }}
              />
            </label>

            <label>
              Status
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ProtocolStatus }))}
                style={{ width: '100%', marginTop: 4, padding: '8px 10px' }}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>

            <label>
              Descricao
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                style={{ width: '100%', marginTop: 4, padding: '8px 10px' }}
              />
            </label>

            {error ? <p style={{ color: '#dc2626', margin: 0 }}>{error}</p> : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Criar Protocolo'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
