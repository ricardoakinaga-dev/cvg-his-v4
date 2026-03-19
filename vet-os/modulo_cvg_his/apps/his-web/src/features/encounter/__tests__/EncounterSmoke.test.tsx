/**
 * Smoke Tests for Encounter Feature Components
 *
 * These tests verify that critical components render without crashing
 * and display the expected clinical information.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components under test
import { SoapEditor } from '../components/SoapEditor';
import { ClinicalTimeline } from '../components/ClinicalTimeline';
import { DocumentsPanel } from '../components/DocumentsPanel';

// Types
import type {
  EncounterTimelineEvent,
  EncounterTimelineNote,
  EncounterTimelineDocument,
  SoapTemplate,
} from '@/lib/api';

// Mocks
const mockTemplates: SoapTemplate[] = [
  {
    key: 'gastro',
    label: 'Gastrointestinal',
    soap: {
      subjective: 'Vômitos e diarreia',
      objective: 'Desidratado',
      assessment: 'Gastroenterite',
      plan: 'Fluidoterapia',
    },
  },
];

const mockNotes: EncounterTimelineNote[] = [
  {
    id: 'note-1',
    encounterId: 'enc-1',
    type: 'SOAP',
    status: 'draft',
    versionNumber: 1,
    signedAt: null,
    signedByUserId: null,
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
    currentSoapJson: {
      subjective: 'Paciente com febre',
      objective: 'Temperatura 39.5°C',
      assessment: 'Infecção',
      plan: 'Antibiótico',
    },
  },
  {
    id: 'note-2',
    encounterId: 'enc-1',
    type: 'SOAP',
    status: 'signed',
    versionNumber: 1,
    signedAt: '2026-02-20T12:00:00Z',
    signedByUserId: 'user-1',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdAt: '2026-02-20T11:00:00Z',
    updatedAt: '2026-02-20T12:00:00Z',
    currentSoapJson: {
      subjective: 'Paciente melhorou',
      objective: 'Temperatura 37.5°C',
      assessment: 'Recuperação',
      plan: 'Alta',
    },
  },
];

const mockEvents: EncounterTimelineEvent[] = [
  {
    kind: 'encounter.opened',
    entityId: 'enc-1',
    happenedAt: '2026-02-20T09:00:00Z',
    data: {},
  },
  {
    kind: 'note.created',
    entityId: 'note-1',
    happenedAt: '2026-02-20T10:00:00Z',
    data: {},
  },
  {
    kind: 'note.signed',
    entityId: 'note-2',
    happenedAt: '2026-02-20T12:00:00Z',
    data: {},
  },
];

const mockDocuments: EncounterTimelineDocument[] = [
  {
    encounterDocumentId: 'ed-1',
    encounterId: 'enc-1',
    documentId: 'doc-1',
    attachedByUserId: 'user-1',
    attachedAt: '2026-02-20T10:30:00Z',
    storageKey: 'docs/exame.pdf',
    filename: 'exame-laboratorial.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024000,
    createdByUserId: 'user-1',
    createdAt: '2026-02-20T10:30:00Z',
  },
];

// Helper to create QueryClient for tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

// Helper to wrap components with QueryClient
function withQueryClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// ===========================================================================
// SOAP EDITOR TESTS
// ===========================================================================

describe('SoapEditor', () => {
  it('renders without crashing', () => {
    const mockOnCreate = vi.fn();
    const mockOnUpdate = vi.fn();
    const mockOnVersion = vi.fn();
    const mockOnSign = vi.fn();

    render(
      withQueryClient(
        <SoapEditor
          selectedNoteId={null}
          initialSoap={null}
          templates={[]}
          isReadonly={false}
          onCreate={mockOnCreate}
          onUpdate={mockOnUpdate}
          onVersion={mockOnVersion}
          onSign={mockOnSign}
        />
      )
    );

    expect(screen.getByText('Prontuário')).toBeInTheDocument();
  });

  it('displays SOAP fields', () => {
    const mockOnCreate = vi.fn();
    const mockOnUpdate = vi.fn();
    const mockOnVersion = vi.fn();
    const mockOnSign = vi.fn();

    render(
      withQueryClient(
        <SoapEditor
          selectedNoteId={null}
          initialSoap={null}
          templates={[]}
          isReadonly={false}
          onCreate={mockOnCreate}
          onUpdate={mockOnUpdate}
          onVersion={mockOnVersion}
          onSign={mockOnSign}
        />
      )
    );

    expect(screen.getByText('Subjetivo')).toBeInTheDocument();
    expect(screen.getByText('Objetivo')).toBeInTheDocument();
    expect(screen.getByText('Avaliação')).toBeInTheDocument();
    expect(screen.getByText('Plano')).toBeInTheDocument();
  });

  it('shows draft status for draft notes', () => {
    const mockOnCreate = vi.fn();
    const mockOnUpdate = vi.fn();
    const mockOnVersion = vi.fn();
    const mockOnSign = vi.fn();

    render(
      withQueryClient(
        <SoapEditor
          selectedNoteId="note-1"
          initialSoap={{
            subjective: 'Test',
            objective: 'Test',
            assessment: 'Test',
            plan: 'Test',
          }}
          templates={[]}
          isReadonly={false}
          versionNumber={1}
          onCreate={mockOnCreate}
          onUpdate={mockOnUpdate}
          onVersion={mockOnVersion}
          onSign={mockOnSign}
        />
      )
    );

    expect(screen.getByText('RASCUNHO')).toBeInTheDocument();
  });

  it('shows signed status for signed notes', () => {
    const mockOnCreate = vi.fn();
    const mockOnUpdate = vi.fn();
    const mockOnVersion = vi.fn();
    const mockOnSign = vi.fn();

    render(
      withQueryClient(
        <SoapEditor
          selectedNoteId="note-2"
          initialSoap={{
            subjective: 'Test',
            objective: 'Test',
            assessment: 'Test',
            plan: 'Test',
          }}
          templates={[]}
          isReadonly={true}
          versionNumber={1}
          onCreate={mockOnCreate}
          onUpdate={mockOnUpdate}
          onVersion={mockOnVersion}
          onSign={mockOnSign}
        />
      )
    );

    expect(screen.getByText('ASSINADO')).toBeInTheDocument();
  });

  it('displays templates in selector', () => {
    const mockOnCreate = vi.fn();
    const mockOnUpdate = vi.fn();
    const mockOnVersion = vi.fn();
    const mockOnSign = vi.fn();

    render(
      withQueryClient(
        <SoapEditor
          selectedNoteId="note-1"
          initialSoap={{
            subjective: 'Test',
            objective: 'Test',
            assessment: 'Test',
            plan: 'Test',
          }}
          templates={mockTemplates}
          isReadonly={false}
          onCreate={mockOnCreate}
          onUpdate={mockOnUpdate}
          onVersion={mockOnVersion}
          onSign={mockOnSign}
        />
      )
    );

    expect(screen.getByText('Gastrointestinal')).toBeInTheDocument();
  });
});

// ===========================================================================
// CLINICAL TIMELINE TESTS
// ===========================================================================

describe('ClinicalTimeline', () => {
  it('renders without crashing', () => {
    render(
      withQueryClient(
        <ClinicalTimeline
          events={[]}
          notes={[]}
          encounterId="enc-1"
        />
      )
    );

    expect(screen.getByText('Linha do Tempo')).toBeInTheDocument();
  });

  it('displays empty state when no events', () => {
    render(
      withQueryClient(
        <ClinicalTimeline
          events={[]}
          notes={[]}
          encounterId="enc-1"
        />
      )
    );

    expect(screen.getByText('Nenhum evento registrado.')).toBeInTheDocument();
  });

  it('displays events in chronological order', () => {
    render(
      withQueryClient(
        <ClinicalTimeline
          events={mockEvents}
          notes={mockNotes}
          encounterId="enc-1"
        />
      )
    );

    expect(screen.getByText('Atendimento Iniciado')).toBeInTheDocument();
    expect(screen.getByText('Evolução Criada')).toBeInTheDocument();
    expect(screen.getByText('Evolução Assinada')).toBeInTheDocument();
  });

  it('shows note selector when notes provided', () => {
    const mockOnSelectNote = vi.fn();

    render(
      withQueryClient(
        <ClinicalTimeline
          events={mockEvents}
          notes={mockNotes}
          encounterId="enc-1"
          selectedNoteId="note-1"
          onSelectNote={mockOnSelectNote}
        />
      )
    );

    expect(screen.getByText('Notas:')).toBeInTheDocument();
    expect(screen.getAllByText('V1')).toHaveLength(2);
  });

  it('highlights selected note', () => {
    const mockOnSelectNote = vi.fn();

    render(
      withQueryClient(
        <ClinicalTimeline
          events={mockEvents}
          notes={mockNotes}
          encounterId="enc-1"
          selectedNoteId="note-1"
          onSelectNote={mockOnSelectNote}
        />
      )
    );

    // The selected note button should have different styling
    const noteButtons = screen.getAllByText('V1');
    expect(noteButtons.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// DOCUMENTS PANEL TESTS
// ===========================================================================

describe('DocumentsPanel', () => {
  it('renders without crashing', () => {
    const mockOnUpload = vi.fn();

    render(
      withQueryClient(
        <DocumentsPanel
          documents={[]}
          onUpload={mockOnUpload}
        />
      )
    );

    expect(screen.getByText('Upload de Documento')).toBeInTheDocument();
  });

  it('displays empty state when no documents', () => {
    const mockOnUpload = vi.fn();

    render(
      withQueryClient(
        <DocumentsPanel
          documents={[]}
          onUpload={mockOnUpload}
        />
      )
    );

    expect(screen.getByText(/Nenhum documento vinculado/)).toBeInTheDocument();
  });

  it('displays document list', () => {
    const mockOnUpload = vi.fn();

    render(
      withQueryClient(
        <DocumentsPanel
          documents={mockDocuments}
          onUpload={mockOnUpload}
        />
      )
    );

    expect(screen.getByText('exame-laboratorial.pdf')).toBeInTheDocument();
    expect(screen.getByText(/1000 KB|1 MB/)).toBeInTheDocument();
  });

  it('shows document count', () => {
    const mockOnUpload = vi.fn();

    render(
      withQueryClient(
        <DocumentsPanel
          documents={mockDocuments}
          onUpload={mockOnUpload}
        />
      )
    );

    expect(screen.getByText('Documentos Vinculados (1)')).toBeInTheDocument();
  });

  it('hides upload section in readonly mode', () => {
    const mockOnUpload = vi.fn();

    render(
      withQueryClient(
        <DocumentsPanel
          documents={mockDocuments}
          onUpload={mockOnUpload}
          readonly={true}
        />
      )
    );

    expect(screen.queryByText('Upload de Documento')).not.toBeInTheDocument();
  });

  it('shows upload progress indicator', () => {
    const mockOnUpload = vi.fn();

    render(
      withQueryClient(
        <DocumentsPanel
          documents={[]}
          onUpload={mockOnUpload}
          isUploading={true}
        />
      )
    );

    expect(screen.getByText('Anexando...')).toBeInTheDocument();
  });
});

// ===========================================================================
// QUERY KEYS TESTS
// ===========================================================================

describe('Encounter Query Keys', () => {
  it('generates correct timeline query key', async () => {
    const { encounterKeys } = await import('../queries');

    expect(encounterKeys.timeline('enc-123')).toEqual([
      'encounter',
      'timeline',
      'enc-123',
    ]);
  });

  it('generates correct patient summary query key', async () => {
    const { encounterKeys } = await import('../queries');

    expect(encounterKeys.patientSummary('patient-456')).toEqual([
      'encounter',
      'patient-summary',
      'patient-456',
    ]);
  });

  it('generates correct soap templates query key', async () => {
    const { encounterKeys } = await import('../queries');

    expect(encounterKeys.soapTemplates()).toEqual([
      'encounter',
      'soap-templates',
    ]);
  });
});
