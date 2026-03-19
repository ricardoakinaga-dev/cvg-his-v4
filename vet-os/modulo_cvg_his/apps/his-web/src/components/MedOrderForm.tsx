'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import type {
  MedicationOrderCreateInput,
  MedicationOrderRecord,
  MedicationOrderUpdateInput
} from '../lib/api';

type RouteOption = MedicationOrderCreateInput['route'];
type FrequencyOption = MedicationOrderCreateInput['frequencyType'];

const ROUTE_OPTIONS: RouteOption[] = [
  'IV',
  'IM',
  'VO',
  'SC',
  'TOP',
  'INH',
  'SL',
  'RECTAL',
  'OTIC',
  'OPHTHALMIC',
  'OTHER'
];

const FREQUENCY_OPTIONS: FrequencyOption[] = ['q8h', 'q12h', 'sid', 'bid', 'tid', 'custom'];

type CommonProps = {
  submitting: boolean;
  errorMessage: string | null;
  onCancel?: () => void;
};

type CreateProps = CommonProps & {
  mode: 'create';
  patientId: string;
  encounterId?: string;
  stayId?: string;
  onSubmit: (payload: MedicationOrderCreateInput) => Promise<void>;
};

type EditProps = CommonProps & {
  mode: 'edit';
  order: MedicationOrderRecord;
  onSubmit: (payload: MedicationOrderUpdateInput) => Promise<void>;
};

type MedOrderFormProps = CreateProps | EditProps;

type FormState = {
  medicationName: string;
  doseValue: string;
  doseUnit: string;
  route: RouteOption;
  frequencyType: FrequencyOption;
  startAt: string;
  endAt: string;
  durationValue: string;
  durationUnit: '' | 'days' | 'hours';
};

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function toLocalInput(value: string | null): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function toIsoOrNull(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function makeCreateInitialState(): FormState {
  return {
    medicationName: '',
    doseValue: '',
    doseUnit: 'mg',
    route: 'IV',
    frequencyType: 'q12h',
    startAt: '',
    endAt: '',
    durationValue: '',
    durationUnit: ''
  };
}

function makeEditInitialState(order: MedicationOrderRecord): FormState {
  return {
    medicationName: order.medicationName,
    doseValue: order.doseValue,
    doseUnit: order.doseUnit,
    route: order.route as RouteOption,
    frequencyType: order.frequencyType as FrequencyOption,
    startAt: toLocalInput(order.startAt),
    endAt: toLocalInput(order.endAt),
    durationValue: order.durationValue === null ? '' : String(order.durationValue),
    durationUnit: order.durationUnit ?? ''
  };
}

export function MedOrderForm(props: MedOrderFormProps): JSX.Element {
  const editOrder = props.mode === 'edit' ? props.order : null;
  const initialState = useMemo(
    () => (editOrder ? makeEditInitialState(editOrder) : makeCreateInitialState()),
    [editOrder?.id, editOrder?.updatedAt]
  );
  const [form, setForm] = useState<FormState>(initialState);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialState);
    setLocalError(null);
  }, [initialState]);

  const onFieldChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const submitCreate = async () => {
    if (props.mode !== 'create') {
      return;
    }

    const medicationName = form.medicationName.trim();
    const doseUnit = form.doseUnit.trim();
    const startAtIso = toIsoOrNull(form.startAt);
    const endAtIso = toIsoOrNull(form.endAt);
    const doseValue = Number(form.doseValue);
    const durationValue =
      form.durationValue.trim().length > 0 ? Number.parseInt(form.durationValue, 10) : undefined;

    if (medicationName.length === 0) {
      setLocalError('Nome da medicação é obrigatório.');
      return;
    }

    if (!Number.isFinite(doseValue) || doseValue <= 0) {
      setLocalError('Dose deve ser maior que zero.');
      return;
    }

    if (doseUnit.length === 0) {
      setLocalError('Unidade da dose é obrigatória.');
      return;
    }

    if (!startAtIso) {
      setLocalError('Início (startAt) é obrigatório e deve ser uma data válida.');
      return;
    }

    if (endAtIso && new Date(endAtIso).getTime() < new Date(startAtIso).getTime()) {
      setLocalError('endAt não pode ser menor que startAt.');
      return;
    }

    if ((durationValue === undefined) !== (form.durationUnit !== '')) {
      setLocalError('durationValue e durationUnit devem ser informados juntos.');
      return;
    }

    if (!props.encounterId && !props.stayId) {
      setLocalError('Contexto inválido: informe encounterId ou stayId para criar prescrição.');
      return;
    }

    await props.onSubmit({
      patientId: props.patientId,
      encounterId: props.encounterId,
      stayId: props.stayId,
      medicationName,
      doseValue,
      doseUnit,
      route: form.route,
      frequencyType: form.frequencyType,
      startAt: startAtIso,
      endAt: endAtIso ?? undefined,
      durationValue,
      durationUnit: form.durationUnit || undefined
    });
  };

  const submitEdit = async () => {
    if (props.mode !== 'edit') {
      return;
    }

    const patch: MedicationOrderUpdateInput = {};
    const doseValue = Number(form.doseValue);
    const orderDoseValue = Number(props.order.doseValue);
    const doseUnit = form.doseUnit.trim();
    const endAtIso = toIsoOrNull(form.endAt);
    const orderEndAtMs = props.order.endAt ? new Date(props.order.endAt).getTime() : null;
    const durationValue =
      form.durationValue.trim().length > 0 ? Number.parseInt(form.durationValue, 10) : undefined;
    const orderDurationValue = props.order.durationValue ?? undefined;

    if (!Number.isFinite(doseValue) || doseValue <= 0) {
      setLocalError('Dose deve ser maior que zero.');
      return;
    }

    if (doseUnit.length === 0) {
      setLocalError('Unidade da dose é obrigatória.');
      return;
    }

    if ((durationValue === undefined) !== (form.durationUnit !== '')) {
      setLocalError('durationValue e durationUnit devem ser informados juntos.');
      return;
    }

    if (doseValue !== orderDoseValue) {
      patch.doseValue = doseValue;
    }

    if (doseUnit !== props.order.doseUnit) {
      patch.doseUnit = doseUnit;
    }

    if (form.route !== props.order.route) {
      patch.route = form.route;
    }

    if (form.frequencyType !== props.order.frequencyType) {
      patch.frequencyType = form.frequencyType;
    }

    const endAtMs = endAtIso ? new Date(endAtIso).getTime() : null;
    if (endAtIso && endAtMs !== orderEndAtMs) {
      patch.endAt = endAtIso;
    }

    if (durationValue !== orderDurationValue) {
      patch.durationValue = durationValue;
      patch.durationUnit = form.durationUnit || undefined;
    } else if ((props.order.durationUnit ?? '') !== form.durationUnit) {
      patch.durationUnit = form.durationUnit || undefined;
    }

    if (Object.keys(patch).length === 0) {
      setLocalError('Nenhuma alteração detectada para salvar.');
      return;
    }

    await props.onSubmit(patch);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (props.mode === 'create') {
      await submitCreate();
      return;
    }

    await submitEdit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 10
      }}
    >
      <h3 style={{ margin: 0, fontSize: 17 }}>
        {props.mode === 'create' ? 'Nova prescrição' : 'Editar prescrição ativa'}
      </h3>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Medicação</span>
        <input
          value={form.medicationName}
          onChange={(event) => onFieldChange('medicationName', event.target.value)}
          readOnly={props.mode === 'edit'}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Dose</span>
          <input
            value={form.doseValue}
            onChange={(event) => onFieldChange('doseValue', event.target.value)}
            placeholder="25"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Unidade</span>
          <input
            value={form.doseUnit}
            onChange={(event) => onFieldChange('doseUnit', event.target.value)}
            placeholder="mg/kg"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Via</span>
          <select
            value={form.route}
            onChange={(event) => onFieldChange('route', event.target.value as RouteOption)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          >
            {ROUTE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Frequência</span>
          <select
            value={form.frequencyType}
            onChange={(event) => onFieldChange('frequencyType', event.target.value as FrequencyOption)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Início (startAt)</span>
          <input
            type="datetime-local"
            value={form.startAt}
            onChange={(event) => onFieldChange('startAt', event.target.value)}
            readOnly={props.mode === 'edit'}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Fim (endAt)</span>
          <input
            type="datetime-local"
            value={form.endAt}
            onChange={(event) => onFieldChange('endAt', event.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Duração valor</span>
          <input
            value={form.durationValue}
            onChange={(event) => onFieldChange('durationValue', event.target.value)}
            placeholder="3"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Duração unidade</span>
          <select
            value={form.durationUnit}
            onChange={(event) =>
              onFieldChange('durationUnit', event.target.value as FormState['durationUnit'])
            }
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          >
            <option value="">não informado</option>
            <option value="days">days</option>
            <option value="hours">hours</option>
          </select>
        </label>
      </div>

      {localError ? <p style={{ margin: 0, color: '#b91c1c' }}>{localError}</p> : null}
      {props.errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{props.errorMessage}</p> : null}

      <footer style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {props.onCancel ? (
          <button
            type="button"
            onClick={props.onCancel}
            disabled={props.submitting}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="submit"
          disabled={props.submitting}
          style={{
            border: '1px solid #0f172a',
            borderRadius: 8,
            padding: '8px 10px',
            background: '#0f172a',
            color: '#fff',
            cursor: 'pointer',
            opacity: props.submitting ? 0.7 : 1
          }}
        >
          {props.submitting
            ? props.mode === 'create'
              ? 'Criando...'
              : 'Salvando...'
            : props.mode === 'create'
              ? 'Criar prescrição'
              : 'Salvar alterações'}
        </button>
      </footer>
    </form>
  );
}
