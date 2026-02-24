'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Can } from '../../../../../components/auth/Can';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { LoadingState } from '../../../../../components/ui/LoadingState';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import { api } from '../../../../../lib/api/client';
import { PERMISSIONS } from '../../../../../lib/rbac';

type Owner = {
  id: string;
  fullName: string;
  document: string | null;
  phoneMain: string | null;
  phoneAlt: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type Contact = {
  id: string;
  type: 'phone' | 'email' | 'whatsapp';
  label: string | null;
  value: string;
  isPrimary: boolean;
};

type Address = {
  id: string;
  label: string | null;
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isPrimary: boolean;
};

type Document = {
  id: string;
  type: 'cpf' | 'cnpj' | 'rg' | 'passaporte' | 'outro';
  value: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
};

type Alert = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string | null;
  isActive: boolean;
  createdAt: string;
  resolvedAt: string | null;
};

type Patient = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  birthDate: string | null;
};

type Tab = 'dados' | 'contatos' | 'enderecos' | 'documentos' | 'alertas' | 'animais' | 'historico';

export default function ClienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ownerId = params.id as string;

  // Roteamento fix: Protege a rota `[id]` do valor `novo`
  if (ownerId === 'novo') {
    redirect('/geral/clientes/novo');
  }

  // UUID verification to prevent 500 errors gracefully
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId);
  if (!isUuid) {
    notFound();
  }

  const [activeTab, setActiveTab] = useState<Tab>('dados');
  const [owner, setOwner] = useState<Owner | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOwner = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ownerRes, contactsRes, addressesRes, documentsRes, alertsRes] = await Promise.all([
        api.get<Owner>(`/owners/${ownerId}`),
        api.get<Contact[]>(`/general/owners/${ownerId}/contacts`),
        api.get<Address[]>(`/general/owners/${ownerId}/addresses`),
        api.get<Document[]>(`/general/owners/${ownerId}/documents`),
        api.get<Alert[]>(`/general/owners/${ownerId}/alerts?active=true`)
      ]);

      setOwner(ownerRes);
      setContacts(contactsRes);
      setAddresses(addressesRes);
      setDocuments(documentsRes);
      setAlerts(alertsRes);

      // Fetch patients via owner's patients
      try {
        const summaryRes = await api.get<{ patients: Patient[] }>(`/owners/${ownerId}/summary`);
        setPatients(summaryRes.patients || []);
      } catch {
        setPatients([]);
      }
    } catch (err) {
      setError('Erro ao carregar dados do cliente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    fetchOwner();
  }, [fetchOwner]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'dados', label: 'Dados' },
    { key: 'contatos', label: 'Contatos', count: contacts.length },
    { key: 'enderecos', label: 'Endereços', count: addresses.length },
    { key: 'documentos', label: 'Documentos', count: documents.length },
    { key: 'alertas', label: 'Alertas', count: alerts.filter(a => a.isActive).length },
    { key: 'animais', label: 'Animais', count: patients.length },
    { key: 'historico', label: 'Histórico' }
  ];

  if (loading) {
    return <LoadingState message="Carregando cliente..." />;
  }

  if (error || !owner) {
    return (
      <EmptyState
        title="Cliente não encontrado"
        description={error || 'O cliente solicitado não existe'}
        action={
          <Link href="/geral/clientes">
            <Button>Voltar para lista</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={owner.fullName}
        description="Detalhes do cliente"
        breadcrumbs={[
          { label: 'Clientes', href: '/geral/clientes' },
          { label: owner.fullName }
        ]}
        actions={
          <Can permission={PERMISSIONS.GERAL_CLIENTES_UPDATE}>
            <Link href={`/geral/clientes/${ownerId}/editar`}>
              <Button variant="secondary">Editar</Button>
            </Link>
          </Can>
        }
      />

      {/* Alert badges */}
      {alerts.filter(a => a.isActive).length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Este cliente possui {alerts.filter(a => a.isActive).length} alerta(s) ativo(s)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <Card>
        {activeTab === 'dados' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Nome completo</label>
                <p className="mt-1 text-sm text-gray-900">{owner.fullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Documento principal</label>
                <p className="mt-1 text-sm text-gray-900">{owner.document || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Telefone principal</label>
                <p className="mt-1 text-sm text-gray-900">{owner.phoneMain || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Telefone alternativo</label>
                <p className="mt-1 text-sm text-gray-900">{owner.phoneAlt || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{owner.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Cadastrado em</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(owner.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            {owner.notes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-500">Observações</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{owner.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contatos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Contatos</h3>
              <Can permission={PERMISSIONS.GERAL_CLIENTES_UPDATE}>
                <Button size="sm">Adicionar Contato</Button>
              </Can>
            </div>
            {contacts.length === 0 ? (
              <EmptyState title="Nenhum contato" description="Adicione telefones e emails" />
            ) : (
              <div className="divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <div key={contact.id} className="py-4 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{contact.value}</span>
                        {contact.isPrimary && (
                          <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {contact.type} {contact.label && `• ${contact.label}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'enderecos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Endereços</h3>
              <Can permission={PERMISSIONS.GERAL_CLIENTES_UPDATE}>
                <Button size="sm">Adicionar Endereço</Button>
              </Can>
            </div>
            {addresses.length === 0 ? (
              <EmptyState title="Nenhum endereço" description="Adicione endereços do cliente" />
            ) : (
              <div className="divide-y divide-gray-200">
                {addresses.map((address) => (
                  <div key={address.id} className="py-4">
                    <div className="flex items-center gap-2 mb-1">
                      {address.label && (
                        <span className="text-sm font-medium text-gray-500">{address.label}</span>
                      )}
                      {address.isPrimary && (
                        <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900">
                      {address.street}
                      {address.number && `, ${address.number}`}
                      {address.complement && ` - ${address.complement}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {address.neighborhood && `${address.neighborhood}, `}
                      {address.city}
                      {address.state && ` - ${address.state}`}
                      {address.postalCode && ` • CEP: ${address.postalCode}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documentos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Documentos</h3>
              <Can permission={PERMISSIONS.GERAL_CLIENTES_UPDATE}>
                <Button size="sm">Adicionar Documento</Button>
              </Can>
            </div>
            {documents.length === 0 ? (
              <EmptyState title="Nenhum documento" description="Adicione documentos do cliente" />
            ) : (
              <div className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <div key={doc.id} className="py-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.value}</p>
                      <p className="text-sm text-gray-500">
                        {doc.type.toUpperCase()}
                        {doc.issuer && ` • Emitido por: ${doc.issuer}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'alertas' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Alertas</h3>
              <Can permission={PERMISSIONS.GERAL_CLIENTES_UPDATE}>
                <Button size="sm">Adicionar Alerta</Button>
              </Can>
            </div>
            {alerts.length === 0 ? (
              <EmptyState title="Nenhum alerta" description="O cliente não possui alertas" />
            ) : (
              <div className="divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <div key={alert.id} className="py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${alert.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : alert.severity === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{alert.title}</span>
                    </div>
                    {alert.message && (
                      <p className="text-sm text-gray-500">{alert.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'animais' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Animais</h3>
              <Can permission={PERMISSIONS.GERAL_ANIMAIS_CREATE}>
                <Link href={`/geral/animais/novo?ownerId=${ownerId}`}>
                  <Button size="sm">Adicionar Animal</Button>
                </Link>
              </Can>
            </div>
            {patients.length === 0 ? (
              <EmptyState title="Nenhum animal" description="Cadastre o primeiro animal deste cliente" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/geral/animais/${patient.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-500 transition-colors"
                  >
                    <h4 className="text-sm font-medium text-gray-900">{patient.name}</h4>
                    <p className="text-sm text-gray-500">
                      {patient.species} {patient.breed && `• ${patient.breed}`}
                    </p>
                    {patient.sex && (
                      <p className="text-xs text-gray-400 mt-1">
                        {patient.sex === 'M' ? 'Macho' : patient.sex === 'F' ? 'Fêmea' : patient.sex}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Histórico</h3>
            <EmptyState
              title="Em desenvolvimento"
              description="O histórico de atendimentos e internações será exibido aqui"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
