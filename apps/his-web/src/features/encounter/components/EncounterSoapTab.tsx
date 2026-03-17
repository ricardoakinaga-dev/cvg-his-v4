import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { EncounterData, SoapFormState, EMPTY_SOAP } from '../types';
import { SoapTemplate } from '@/lib/api';
import { theme, px } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

// Icons could be imported from a lib, using text for now to avoid specific icon lib dependency issues if not present
const SaveIcon = () => <span>💾</span>;
const SignIcon = () => <span>✍️</span>;
const VersionIcon = () => <span>📑</span>;
const CreateIcon = () => <span>➕</span>;

interface EncounterSoapTabProps {
    data: EncounterData;
    templates: SoapTemplate[];
    selectedNoteId: string | null;
    isReadonly: boolean;

    // Handlers
    onCreate: (soap: SoapFormState) => Promise<void>;
    onUpdate: (soap: SoapFormState) => Promise<void>;
    onVersion: (soap: SoapFormState, reason: string) => Promise<void>;
    onSign: (id: string) => Promise<void>;
}

export function EncounterSoapTab({
    data,
    templates,
    selectedNoteId,
    isReadonly,
    onCreate,
    onUpdate,
    onVersion,
    onSign
}: EncounterSoapTabProps) {
    // Derived State
    const selectedNote = data.notes.find(n => n.id === selectedNoteId);

    // Local Form State
    const [soapForm, setSoapForm] = useState<SoapFormState>(EMPTY_SOAP);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Modals
    const [showSignModal, setShowSignModal] = useState(false);
    const [showVersionModal, setShowVersionModal] = useState(false);
    const [versionReason, setVersionReason] = useState('');

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleNavigateToMeds = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', 'meds');
        router.push(`${pathname}?${params.toString()}`);
    };


    // Refs for Debounce
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Form on Note Selection
    useEffect(() => {
        if (selectedNote) {
            try {
                // If it's a string, parse it. If it's already an object, cast it.
                const parsed = typeof selectedNote.currentSoapJson === 'string'
                    ? JSON.parse(selectedNote.currentSoapJson)
                    : selectedNote.currentSoapJson;

                setSoapForm({
                    subjective: parsed.subjective || '',
                    objective: parsed.objective || '',
                    assessment: parsed.assessment || '',
                    plan: parsed.plan || ''
                });
            } catch (e) {
                console.error("Failed to parse SOAP JSON", e);
                setSoapForm(EMPTY_SOAP);
            }
        } else {
            setSoapForm(EMPTY_SOAP);
        }
        setIsDirty(false);
        setStatusMessage(null);
    }, [selectedNoteId, selectedNote]);

    // Handle Change with Debounced Autosave
    const handleChange = (field: keyof SoapFormState, value: string) => {
        const newState = { ...soapForm, [field]: value };
        setSoapForm(newState);
        setIsDirty(true);
        setStatusMessage('Editando...');

        if (selectedNote && !isReadonly) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                void handleAutoSave(newState);
            }, 1500); // 1.5s debounce for autosave
        }
    };

    const handleAutoSave = async (state: SoapFormState) => {
        if (!selectedNote || isReadonly) return;
        setStatusMessage('Salvando...');
        try {
            await onUpdate(state);
            setStatusMessage(`Salvo às ${new Date().toLocaleTimeString()}`);
            setIsDirty(false);
        } catch (e) {
            setStatusMessage('Erro ao salvar.');
        }
    };

    const handleCreate = async () => {
        setStatusMessage('Criando nota...');
        try {
            await onCreate(soapForm);
            setStatusMessage('Nota criada.');
        } catch (e) {
            setStatusMessage('Erro ao criar.');
        }
    };

    const handleApplyTemplate = () => {
        const template = templates.find(t => t.key === selectedTemplateKey);
        if (template) {
            if (isDirty && !window.confirm('Substituir conteúdo atual pelo template?')) return;
            setSoapForm(template.soap);
            setIsDirty(true);
            if (selectedNote && !isReadonly) void handleAutoSave(template.soap);
        }
    };

    const handleSignSubmit = async () => {
        if (!selectedNoteId) return;
        try {
            await onSign(selectedNoteId);
            setShowSignModal(false);
            setStatusMessage('Nota assinada.');
        } catch (e) {
            alert('Erro ao assinar nota.');
        }
    };

    const handleVersionSubmit = async () => {
        try {
            await onVersion(soapForm, versionReason);
            setShowVersionModal(false);
            setVersionReason('');
            setStatusMessage('Nova versão criada.');
        } catch (e) {
            alert('Erro ao criar versão.');
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (selectedNote && !isReadonly) void handleAutoSave(soapForm);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (selectedNote && !isReadonly) setShowSignModal(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [soapForm, selectedNote, isReadonly]);

    return (
        <Card style={{ padding: px(20), display: 'grid', gap: px(20) }}>

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: px(10) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
                    <h2 style={{ margin: 0, fontSize: px(20) }}>Prontuário</h2>
                    {selectedNote && (
                        <span style={{
                            fontSize: px(12),
                            background: isReadonly ? theme.colors.successBg : theme.colors.warningBg,
                            color: isReadonly ? theme.colors.success : theme.colors.warning,
                            padding: '2px 8px',
                            borderRadius: px(theme.radius.full),
                            border: `1px solid ${isReadonly ? theme.colors.success : theme.colors.warning}`
                        }}>
                            {isReadonly ? 'ASSINADO' : 'RASCUNHO'}
                        </span>
                    )}
                    {statusMessage && <span style={{ fontSize: px(12), color: theme.colors.textSecondary }}>{statusMessage}</span>}
                </div>

                <div style={{ display: 'flex', gap: px(8), alignItems: 'center' }}>
                    <Button variant="secondary" onClick={handleNavigateToMeds}>
                        💊 Prescrição
                    </Button>
                    {!isReadonly && (
                        <>
                            <div style={{ width: px(200) }}>
                                <Select
                                    value={selectedTemplateKey}
                                    onChange={e => setSelectedTemplateKey(e.target.value)}
                                // Remove label to fit in toolbar cleanly
                                >
                                    <option value="">Selecionar Template...</option>
                                    {templates.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                                </Select>
                            </div>
                            <Button variant="secondary" onClick={handleApplyTemplate} disabled={!selectedTemplateKey}>Aplicar</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Note Status / Selector Context */}
            <div style={{ padding: px(12), background: theme.colors.pageBg, borderRadius: px(theme.radius.sm), border: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: px(14) }}>
                    {selectedNote
                        ? `Nota: ${selectedNote.id} | Versão: ${selectedNote.versionNumber}`
                        : 'Nenhuma nota selecionada. Preencha os campos abaixo para criar uma nota.'}
                </p>
            </div>

            {/* Editor Fields */}
            <div style={{ display: 'grid', gap: px(16), gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                <SoapField label="Subjetivo" value={soapForm.subjective} onChange={v => handleChange('subjective', v)} readOnly={isReadonly} />
                <SoapField label="Objetivo" value={soapForm.objective} onChange={v => handleChange('objective', v)} readOnly={isReadonly} />
                <SoapField label="Avaliação" value={soapForm.assessment} onChange={v => handleChange('assessment', v)} readOnly={isReadonly} />
                <SoapField label="Plano" value={soapForm.plan} onChange={v => handleChange('plan', v)} readOnly={isReadonly} />
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: px(12), borderTop: `1px solid ${theme.colors.border}`, paddingTop: px(16) }}>
                {!selectedNote ? (
                    <Button onClick={handleCreate} disabled={!soapForm.subjective && !soapForm.objective && !soapForm.assessment && !soapForm.plan}>
                        <CreateIcon /> Criar Evolução (SOAP)
                    </Button>
                ) : (
                    <>
                        {!isReadonly && (
                            <>
                                <Button variant="secondary" onClick={() => void handleAutoSave(soapForm)}>
                                    <SaveIcon /> Salvar (Ctrl+S)
                                </Button>
                                <Button variant="secondary" onClick={() => setShowVersionModal(true)}>
                                    <VersionIcon /> Criar Versão
                                </Button>
                                <Button style={{ background: theme.colors.primary }} onClick={() => setShowSignModal(true)}>
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

            {/* Modals - Simple Implementation using fixed overlay */}
            {showSignModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                    <Card style={{ padding: px(24), width: px(400), display: 'grid', gap: px(16), boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: 0 }}>Confirmar Assinatura</h3>
                        <p style={{ margin: 0, color: theme.colors.textSecondary }}>Ao assinar, esta evolução se tornará imutável. Tem certeza?</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: px(8), marginTop: px(8) }}>
                            <Button variant="secondary" onClick={() => setShowSignModal(false)}>Cancelar</Button>
                            <Button variant="danger" onClick={handleSignSubmit}>Confirmar Assinatura</Button>
                        </div>
                    </Card>
                </div>
            )}

            {showVersionModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                    <Card style={{ padding: px(24), width: px(400), display: 'grid', gap: px(16), boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: 0 }}>Nova Versão</h3>
                        <p style={{ margin: 0, color: theme.colors.textSecondary }}>Justifique a criação de uma nova versão:</p>
                        <Input
                            value={versionReason}
                            onChange={e => setVersionReason(e.target.value)}
                            placeholder="Motivo (ex: Correção ortográfica)"
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: px(8), marginTop: px(8) }}>
                            <Button variant="secondary" onClick={() => setShowVersionModal(false)}>Cancelar</Button>
                            <Button onClick={handleVersionSubmit} disabled={!versionReason.trim()}>Criar Versão</Button>
                        </div>
                    </Card>
                </div>
            )}

        </Card>
    );
}

function SoapField({ label, value, onChange, readOnly }: { label: string, value: string, onChange: (v: string) => void, readOnly: boolean }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: px(6), flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: px(14), color: theme.colors.textPrimary }}>{label}</span>
                <span style={{ fontSize: px(12), color: theme.colors.textSecondary }}>{value.length} chars</span>
            </div>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
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
                    minHeight: px(150)
                }}
            />
        </label>
    );
}
