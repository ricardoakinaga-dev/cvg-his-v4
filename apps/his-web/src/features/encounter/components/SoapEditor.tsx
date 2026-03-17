import { useEffect, useState, useRef, useCallback } from 'react';
import { SoapFormState, EMPTY_SOAP } from '../types';
import { SoapTemplate } from '@/lib/api';
import { theme, px } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

/**
 * Autosave status indicator states
 */
export type AutosaveStatus = 'idle' | 'editing' | 'saving' | 'saved' | 'error';

/**
 * Status indicator component with clinical-friendly colors
 */
function AutosaveIndicator({ status, lastSaved }: { status: AutosaveStatus; lastSaved?: Date }) {
  const statusConfig = {
    idle: { color: theme.colors.textSecondary, label: '' },
    editing: { color: theme.colors.warning, label: 'Editando...' },
    saving: { color: theme.colors.primary, label: 'Salvando...' },
    saved: { color: theme.colors.success, label: `Salvo às ${lastSaved?.toLocaleTimeString() ?? ''}` },
    error: { color: theme.colors.danger, label: 'Erro ao salvar' },
  };

  const config = statusConfig[status];
  if (!config.label) return null;

  return (
    <span
      style={{
        fontSize: px(12),
        color: config.color,
        padding: '2px 8px',
        borderRadius: px(theme.radius.sm),
        background: status === 'error' ? theme.colors.dangerBg : 'transparent',
      }}
    >
      {config.label}
    </span>
  );
}

/**
 * Icons for actions
 */
const SaveIcon = () => <span>💾</span>;
const SignIcon = () => <span>✍️</span>;
const VersionIcon = () => <span>📑</span>;
const CreateIcon = () => <span>➕</span>;

interface SoapEditorProps {
  /** Currently selected note ID */
  selectedNoteId: string | null;
  /** Current SOAP data from the note */
  initialSoap: SoapFormState | null;
  /** Available templates */
  templates: SoapTemplate[];
  /** Whether the note is signed (readonly) */
  isReadonly: boolean;
  /** Note version number for display */
  versionNumber?: number;

  // Handlers
  onCreate: (soap: SoapFormState) => Promise<void>;
  onUpdate: (soap: SoapFormState) => Promise<void>;
  onVersion: (soap: SoapFormState, reason: string) => Promise<void>;
  onSign: (noteId: string) => Promise<void>;

  // Optional callbacks
  onNavigateToMeds?: () => void;
}

/**
 * SoapEditor Component
 *
 * Clinical SOAP note editor with:
 * - Debounced autosave (1.5s delay)
 * - Visual status indicator
 * - Template application
 * - Version creation
 * - Digital signature
 *
 * @example
 * ```tsx
 * <SoapEditor
 *   selectedNoteId={noteId}
 *   initialSoap={note?.soap}
 *   templates={templates}
 *   isReadonly={note?.status === 'signed'}
 *   onCreate={handleCreate}
 *   onUpdate={handleUpdate}
 *   onVersion={handleVersion}
 *   onSign={handleSign}
 * />
 * ```
 */
export function SoapEditor({
  selectedNoteId,
  initialSoap,
  templates,
  isReadonly,
  versionNumber,
  onCreate,
  onUpdate,
  onVersion,
  onSign,
  onNavigateToMeds,
}: SoapEditorProps) {
  // Form state
  const [soapForm, setSoapForm] = useState<SoapFormState>(initialSoap ?? EMPTY_SOAP);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

  // Modals
  const [showSignModal, setShowSignModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionReason, setVersionReason] = useState('');

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_MS = 1500;

  // Initialize form when note changes
  useEffect(() => {
    setSoapForm(initialSoap ?? EMPTY_SOAP);
    setIsDirty(false);
    setAutosaveStatus('idle');
  }, [selectedNoteId, initialSoap]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /**
   * Handle field change with debounced autosave
   */
  const handleChange = useCallback(
    (field: keyof SoapFormState, value: string) => {
      const newState = { ...soapForm, [field]: value };
      setSoapForm(newState);
      setIsDirty(true);
      setAutosaveStatus('editing');

      // Only autosave if we have a selected note and it's not readonly
      if (selectedNoteId && !isReadonly) {
        // Clear existing timer
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        // Set new debounce timer
        debounceRef.current = setTimeout(() => {
          void performAutosave(newState);
        }, DEBOUNCE_MS);
      }
    },
    [soapForm, selectedNoteId, isReadonly]
  );

  /**
   * Perform autosave
   */
  const performAutosave = async (state: SoapFormState) => {
    if (!selectedNoteId || isReadonly) return;

    setAutosaveStatus('saving');
    try {
      await onUpdate(state);
      setAutosaveStatus('saved');
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      setAutosaveStatus('error');
      console.error('Autosave failed:', error);
    }
  };

  /**
   * Manual save (Ctrl+S)
   */
  const handleManualSave = async () => {
    if (!selectedNoteId || isReadonly) return;
    await performAutosave(soapForm);
  };

  /**
   * Create new note
   */
  const handleCreate = async () => {
    setAutosaveStatus('saving');
    try {
      await onCreate(soapForm);
      setAutosaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      setAutosaveStatus('error');
    }
  };

  /**
   * Apply template
   */
  const handleApplyTemplate = () => {
    const template = templates.find((t) => t.key === selectedTemplateKey);
    if (!template) return;

    if (isDirty && !window.confirm('Substituir conteúdo atual pelo template?')) return;

    setSoapForm(template.soap);
    setIsDirty(true);

    // Trigger autosave if we have a note
    if (selectedNoteId && !isReadonly) {
      void performAutosave(template.soap);
    }
  };

  /**
   * Sign note
   */
  const handleSignSubmit = async () => {
    if (!selectedNoteId) return;
    try {
      await onSign(selectedNoteId);
      setShowSignModal(false);
    } catch (error) {
      alert('Erro ao assinar nota.');
    }
  };

  /**
   * Create version
   */
  const handleVersionSubmit = async () => {
    try {
      await onVersion(soapForm, versionReason);
      setShowVersionModal(false);
      setVersionReason('');
    } catch (error) {
      alert('Erro ao criar versão.');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedNoteId && !isReadonly) {
          void handleManualSave();
        }
      }
      // Ctrl/Cmd + Enter = Sign
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (selectedNoteId && !isReadonly) {
          setShowSignModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, isReadonly, soapForm]);

  return (
    <Card style={{ padding: px(20), display: 'grid', gap: px(20) }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: px(10),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
          <h2 style={{ margin: 0, fontSize: px(20) }}>Prontuário</h2>
          {selectedNoteId && (
            <span
              style={{
                fontSize: px(12),
                background: isReadonly ? theme.colors.successBg : theme.colors.warningBg,
                color: isReadonly ? theme.colors.success : theme.colors.warning,
                padding: '2px 8px',
                borderRadius: px(theme.radius.full),
                border: `1px solid ${isReadonly ? theme.colors.success : theme.colors.warning}`,
              }}
            >
              {isReadonly ? 'ASSINADO' : 'RASCUNHO'}
            </span>
          )}
          <AutosaveIndicator status={autosaveStatus} lastSaved={lastSaved} />
        </div>

        <div style={{ display: 'flex', gap: px(8), alignItems: 'center' }}>
          {onNavigateToMeds && (
            <Button variant="secondary" onClick={onNavigateToMeds}>
              💊 Prescrição
            </Button>
          )}
          {!isReadonly && (
            <>
              <div style={{ width: px(200) }}>
                <Select
                  value={selectedTemplateKey}
                  onChange={(e) => setSelectedTemplateKey(e.target.value)}
                >
                  <option value="">Selecionar Template...</option>
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                variant="secondary"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateKey}
              >
                Aplicar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Note Context */}
      <div
        style={{
          padding: px(12),
          background: theme.colors.pageBg,
          borderRadius: px(theme.radius.sm),
          border: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: px(14) }}>
          {selectedNoteId
            ? `Nota: ${selectedNoteId.slice(0, 8)}... | Versão: ${versionNumber ?? 1}`
            : 'Nenhuma nota selecionada. Preencha os campos abaixo para criar uma nota.'}
        </p>
      </div>

      {/* Editor Fields */}
      <div
        style={{
          display: 'grid',
          gap: px(16),
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        }}
      >
        <SoapField
          label="Subjetivo"
          value={soapForm.subjective}
          onChange={(v) => handleChange('subjective', v)}
          readOnly={isReadonly}
        />
        <SoapField
          label="Objetivo"
          value={soapForm.objective}
          onChange={(v) => handleChange('objective', v)}
          readOnly={isReadonly}
        />
        <SoapField
          label="Avaliação"
          value={soapForm.assessment}
          onChange={(v) => handleChange('assessment', v)}
          readOnly={isReadonly}
        />
        <SoapField
          label="Plano"
          value={soapForm.plan}
          onChange={(v) => handleChange('plan', v)}
          readOnly={isReadonly}
        />
      </div>

      {/* Actions Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: px(12),
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: px(16),
        }}
      >
        {!selectedNoteId ? (
          <Button
            onClick={handleCreate}
            disabled={!soapForm.subjective && !soapForm.objective && !soapForm.assessment && !soapForm.plan}
          >
            <CreateIcon /> Criar Evolução (SOAP)
          </Button>
        ) : (
          <>
            {!isReadonly && (
              <>
                <Button variant="secondary" onClick={handleManualSave}>
                  <SaveIcon /> Salvar (Ctrl+S)
                </Button>
                <Button variant="secondary" onClick={() => setShowVersionModal(true)}>
                  <VersionIcon /> Criar Versão
                </Button>
                <Button
                  style={{ background: theme.colors.primary, color: 'white' }}
                  onClick={() => setShowSignModal(true)}
                >
                  <SignIcon /> Assinar (Ctrl+Enter)
                </Button>
              </>
            )}
            {isReadonly && (
              <Button variant="secondary" onClick={() => setShowVersionModal(true)}>
                <VersionIcon /> Criar Nova Versão
              </Button>
            )}
          </>
        )}
      </div>

      {/* Sign Modal */}
      {showSignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <Card
            style={{
              padding: px(24),
              width: px(400),
              display: 'grid',
              gap: px(16),
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: 0 }}>Confirmar Assinatura</h3>
            <p style={{ margin: 0, color: theme.colors.textSecondary }}>
              Ao assinar, esta evolução se tornará imutável. Tem certeza?
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: px(8),
                marginTop: px(8),
              }}
            >
              <Button variant="secondary" onClick={() => setShowSignModal(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleSignSubmit}>
                Confirmar Assinatura
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Version Modal */}
      {showVersionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <Card
            style={{
              padding: px(24),
              width: px(400),
              display: 'grid',
              gap: px(16),
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: 0 }}>Nova Versão</h3>
            <p style={{ margin: 0, color: theme.colors.textSecondary }}>
              Justifique a criação de uma nova versão:
            </p>
            <Input
              value={versionReason}
              onChange={(e) => setVersionReason(e.target.value)}
              placeholder="Motivo (ex: Correção ortográfica)"
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: px(8),
                marginTop: px(8),
              }}
            >
              <Button variant="secondary" onClick={() => setShowVersionModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleVersionSubmit} disabled={!versionReason.trim()}>
                Criar Versão
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}

/**
 * Individual SOAP field component
 */
function SoapField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: px(6), flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: px(14), color: theme.colors.textPrimary }}>
          {label}
        </span>
        <span style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
          {value.length} chars
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={8}
        style={{
          padding: px(12),
          borderRadius: px(theme.radius.sm),
          borderColor: theme.colors.border,
          borderWidth: '1px',
          borderStyle: 'solid',
          fontFamily: theme.typography.sans,
          fontSize: px(14),
          lineHeight: 1.5,
          resize: 'vertical',
          background: readOnly ? theme.colors.pageBg : theme.colors.surface,
          outline: 'none',
          minHeight: px(150),
        }}
      />
    </label>
  );
}

export default SoapEditor;
