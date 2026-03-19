'use client';

type StayOption = {
  id: string;
  label: string;
};

export type HandoverItemFormValue = {
  localId: string;
  stayId: string;
  problemsText: string;
  planText: string;
  criticalMedsText: string;
  pendingText: string;
  escalationIfWorse: string;
  notes: string;
  allergiesText: string;
  aggressive: boolean;
};

type HandoverItemEditorProps = {
  index: number;
  item: HandoverItemFormValue;
  stayOptions: StayOption[];
  disabled?: boolean;
  onChange: (next: HandoverItemFormValue) => void;
  onRemove: () => void;
};

export function createEmptyHandoverItem(stayId = ''): HandoverItemFormValue {
  return {
    localId: `item_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    stayId,
    problemsText: '',
    planText: '',
    criticalMedsText: '',
    pendingText: '',
    escalationIfWorse: '',
    notes: '',
    allergiesText: '',
    aggressive: false
  };
}

export function HandoverItemEditor({
  index,
  item,
  stayOptions,
  disabled = false,
  onChange,
  onRemove
}: HandoverItemEditorProps): JSX.Element {
  return (
    <article
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 14,
        display: 'grid',
        gap: 10,
        background: '#ffffff'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}
      >
        <strong>Item {index + 1}</strong>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          style={{
            border: '1px solid #ef4444',
            background: '#ffffff',
            color: '#b91c1c',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer'
          }}
        >
          Remover
        </button>
      </header>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Stay ativo</span>
        <select
          value={item.stayId}
          onChange={(event) => onChange({ ...item, stayId: event.target.value })}
          disabled={disabled}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
        >
          <option value="">Selecione um stay</option>
          {stayOptions.map((stay) => (
            <option key={stay.id} value={stay.id}>
              {stay.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Problemas (1 por linha)</span>
        <textarea
          rows={3}
          value={item.problemsText}
          onChange={(event) => onChange({ ...item, problemsText: event.target.value })}
          disabled={disabled}
          placeholder="Ex.: vômito persistente"
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Plano (obrigatório, 1 por linha)</span>
        <textarea
          rows={3}
          value={item.planText}
          onChange={(event) => onChange({ ...item, planText: event.target.value })}
          disabled={disabled}
          placeholder="Ex.: fluidoterapia IV"
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Escalonamento se piorar (obrigatório)</span>
        <input
          value={item.escalationIfWorse}
          onChange={(event) => onChange({ ...item, escalationIfWorse: event.target.value })}
          disabled={disabled}
          placeholder="Ex.: acionar intensivista e repetir exames"
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
        />
      </label>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Medicações críticas (1 por linha)</span>
          <textarea
            rows={2}
            value={item.criticalMedsText}
            onChange={(event) => onChange({ ...item, criticalMedsText: event.target.value })}
            disabled={disabled}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Pendências (1 por linha)</span>
          <textarea
            rows={2}
            value={item.pendingText}
            onChange={(event) => onChange({ ...item, pendingText: event.target.value })}
            disabled={disabled}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Alergias (1 por linha)</span>
          <textarea
            rows={2}
            value={item.allergiesText}
            onChange={(event) => onChange({ ...item, allergiesText: event.target.value })}
            disabled={disabled}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
          <input
            type="checkbox"
            checked={item.aggressive}
            onChange={(event) => onChange({ ...item, aggressive: event.target.checked })}
            disabled={disabled}
          />
          <span>Paciente agressivo</span>
        </label>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Notas</span>
        <textarea
          rows={2}
          value={item.notes}
          onChange={(event) => onChange({ ...item, notes: event.target.value })}
          disabled={disabled}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
        />
      </label>
    </article>
  );
}

