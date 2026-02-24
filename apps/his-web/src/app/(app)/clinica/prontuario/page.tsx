/**
 * Prontuário Page - Clínica Module
 */

import { PlaceholderPage } from '../../../../components/layout/PlaceholderPage';

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { searchGlobal } from '../../../../lib/api';

export default function ProntuarioPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const resp = await searchGlobal({ q: search, pageSize: 15 });
      setPatients(resp.patients);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar pacientes');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Prontuário Eletrônico"
        description="Acesse o histórico clínico unificado, evoluções e documentos dos pacientes."
      />

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-medium">Buscar Paciente</h3>
            <p className="text-sm text-gray-500">Busque por nome do paciente ou microchip para acessar o prontuário.</p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Ex: Rex, Thor, 9820004..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-lg py-3"
            />
            <Button type="submit" disabled={searching} sizing="lg">
              {searching ? 'Buscando...' : 'Pesquisar'}
            </Button>
          </form>

          {patients.length > 0 ? (
            <div className="mt-6 border rounded-md divide-y overflow-hidden shadow-sm">
              {patients.map(p => (
                <div
                  key={p.id}
                  className="p-5 flex justify-between items-center hover:bg-indigo-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/clinica/prontuario/${p.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-lg text-gray-900">{p.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span>{p.species}</span>
                        {p.microchip && (
                          <>
                            <span>•</span>
                            <span>Microchip: {p.microchip}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary">
                    Abrir Prontuário
                  </Button>
                </div>
              ))}
            </div>
          ) : search && !searching && (
            <div className="text-center py-10 text-gray-500">
              Digite um termo para pesquisar ou verifique se o nome está correto.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
