'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import type {
  MedicationOrderCreateInput,
  MedicationOrderRecord,
  MedicationOrderUpdateInput
} from '../lib/api';

type RouteOption = MedicationOrderCreateInput['route'];
type FrequencyOption = MedicationOrderCreateInput['frequencyType'];
type DurationUnit = '' | 'days' | 'hours';
type SubmitIntent = 'save' | 'save-print';

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

const ROUTE_LABELS: Record<RouteOption, string> = {
  IV: 'IV (intravenosa)',
  IM: 'IM (intramuscular)',
  VO: 'VO (via oral)',
  SC: 'SC (subcutânea)',
  TOP: 'Tópica',
  INH: 'Inalatória',
  SL: 'Sublingual',
  RECTAL: 'Retal',
  OTIC: 'Ótica',
  OPHTHALMIC: 'Oftálmica',
  OTHER: 'Outra via'
};

const FREQUENCY_OPTIONS: FrequencyOption[] = ['q8h', 'q12h', 'sid', 'bid', 'tid', 'custom'];

const FREQUENCY_LABELS: Record<FrequencyOption, string> = {
  q8h: 'A cada 8 horas',
  q12h: 'A cada 12 horas',
  sid: '1x ao dia',
  bid: '2x ao dia',
  tid: '3x ao dia',
  custom: 'Personalizada'
};

const QUICK_FORM_OPTIONS = ['comprimido', 'cápsula', 'mL', 'gota(s)', 'sachê'] as const;

const MEDICATION_PRESETS: Array<{
  id: string;
  label: string;
  medicationName: string;
  presentation: string;
  doseValue: string;
  doseUnit: string;
  route: RouteOption;
  frequencyType: FrequencyOption;
  durationValue: string;
  durationUnit: DurationUnit;
  quickAmount: string;
  quickForm: string;
}> = [
  {
    id: 'dipirona-500-comp',
    label: 'Dipirona 500 mg (comprimido)',
    medicationName: 'Dipirona',
    presentation: 'Comprimido 500 mg',
    doseValue: '500',
    doseUnit: 'mg',
    route: 'VO',
    frequencyType: 'q12h',
    durationValue: '3',
    durationUnit: 'days',
    quickAmount: '1',
    quickForm: 'comprimido'
  },
  {
    id: 'tramadol-50-cap',
    label: 'Tramadol 50 mg (cápsula)',
    medicationName: 'Tramadol',
    presentation: 'Cápsula 50 mg',
    doseValue: '50',
    doseUnit: 'mg',
    route: 'VO',
    frequencyType: 'q12h',
    durationValue: '3',
    durationUnit: 'days',
    quickAmount: '1',
    quickForm: 'cápsula'
  },
  {
    id: 'amox-500-comp',
    label: 'Amoxicilina 500 mg (comprimido)',
    medicationName: 'Amoxicilina',
    presentation: 'Comprimido 500 mg',
    doseValue: '500',
    doseUnit: 'mg',
    route: 'VO',
    frequencyType: 'q12h',
    durationValue: '7',
    durationUnit: 'days',
    quickAmount: '1',
    quickForm: 'comprimido'
  }
];

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
  medicationPresentation: string;
  doseValue: string;
  doseUnit: string;
  route: RouteOption;
  frequencyType: FrequencyOption;
  startAt: string;
  endAt: string;
  durationValue: string;
  durationUnit: DurationUnit;
  quickAmount: string;
  quickForm: string;
  prescriptionText: string;
  prescriberName: string;
  prescriberCrmv: string;
  prescriptionDate: string;
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

function nowLocalInput(): string {
  return toLocalInput(new Date().toISOString());
}

function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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

function durationUnitLabel(unit: DurationUnit): string {
  if (unit === 'days') return 'dias';
  if (unit === 'hours') return 'horas';
  return '';
}

function buildQuickInstruction(form: FormState): string {
  const amount = form.quickAmount.trim() || '1';
  const pharmaForm = form.quickForm.trim() || 'comprimido';
  const frequency = FREQUENCY_LABELS[form.frequencyType] ?? form.frequencyType;
  const durationValue = form.durationValue.trim();
  const durationUnit = durationUnitLabel(form.durationUnit);

  if (durationValue.length > 0 && durationUnit.length > 0) {
    return `Dê ${amount} ${pharmaForm} por ${ROUTE_LABELS[form.route].toLowerCase()} ${frequency.toLowerCase()} durante ${durationValue} ${durationUnit}.`;
  }

  return `Dê ${amount} ${pharmaForm} por ${ROUTE_LABELS[form.route].toLowerCase()} ${frequency.toLowerCase()}.`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildPrintHtml(input: {
  patientId: string;
  encounterOrStayLabel: string;
  medicationName: string;
  presentation: string;
  doseValue: string;
  doseUnit: string;
  routeLabel: string;
  frequencyLabel: string;
  instruction: string;
  prescriberName: string;
  prescriberCrmv: string;
  prescriptionDate: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Prescrição Veterinária</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      h2 { margin: 24px 0 12px; font-size: 18px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
      p { margin: 6px 0; }
      .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 8px; }
      .signature { margin-top: 56px; border-top: 1px solid #111; padding-top: 10px; max-width: 460px; }
      .muted { color: #475569; font-size: 13px; }
    </style>
  </head>
  <body>
    <h1>Receituário Médico Veterinário</h1>
    <p><strong>Paciente:</strong> ${escapeHtml(input.patientId)}</p>
    <p><strong>Contexto:</strong> ${escapeHtml(input.encounterOrStayLabel)}</p>
    <p><strong>Data:</strong> ${escapeHtml(input.prescriptionDate)}</p>

    <h2>Prescrição</h2>
    <div class="box">
      <p><strong>Medicação:</strong> ${escapeHtml(input.medicationName)}</p>
      <p><strong>Apresentação:</strong> ${escapeHtml(input.presentation)}</p>
      <p><strong>Dose:</strong> ${escapeHtml(input.doseValue)} ${escapeHtml(input.doseUnit)}</p>
      <p><strong>Via:</strong> ${escapeHtml(input.routeLabel)}</p>
      <p><strong>Frequência:</strong> ${escapeHtml(input.frequencyLabel)}</p>
      <p><strong>Posologia:</strong> ${escapeHtml(input.instruction)}</p>
    </div>

    <h2>Assinatura</h2>
    <p><strong>Médico Veterinário:</strong> ${escapeHtml(input.prescriberName)}</p>
    <p><strong>CRMV:</strong> ${escapeHtml(input.prescriberCrmv)}</p>
    <div class="signature">
      <p>Assinatura e carimbo</p>
      <p class="muted">Nome e CRMV do Veterinário</p>
    </div>
  </body>
</html>`;
}

function writeAndPrint(printWindow: Window, html: string): void {
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function makeCreateInitialState(): FormState {
  return {
    medicationName: '',
    medicationPresentation: '',
    doseValue: '',
    doseUnit: 'mg',
    route: 'VO',
    frequencyType: 'q12h',
    startAt: nowLocalInput(),
    endAt: '',
    durationValue: '3',
    durationUnit: 'days',
    quickAmount: '1',
    quickForm: 'comprimido',
    prescriptionText: order.prescriptionText ?? '',
    prescriberName: '',
    prescriberCrmv: '',
    prescriptionDate: todayIsoDate()
  };
}

function makeEditInitialState(order: MedicationOrderRecord): FormState {
  return {
    medicationName: order.medicationName,
    medicationPresentation: `${order.doseValue} ${order.doseUnit}`,
    doseValue: order.doseValue,
    doseUnit: order.doseUnit,
    route: order.route as RouteOption,
    frequencyType: order.frequencyType as FrequencyOption,
    startAt: toLocalInput(order.startAt),
    endAt: toLocalInput(order.endAt),
    durationValue: order.durationValue === null ? '' : String(order.durationValue),
    durationUnit: order.durationUnit ?? '',
    quickAmount: '1',
    quickForm: 'comprimido',
    prescriptionText: '',
    prescriberName: '',
    prescriberCrmv: '',
    prescriptionDate: todayIsoDate()
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
  const [activePresetId, setActivePresetId] = useState<string>('');
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>('save');

  useEffect(() => {
    setForm(initialState);
    setLocalError(null);
    setActivePresetId('');
    setSubmitIntent('save');
  }, [initialState]);

  const quickInstruction = useMemo(() => buildQuickInstruction(form), [form]);
  const finalInstruction = form.prescriptionText.trim() || quickInstruction;

  const onFieldChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const applyMedicationPreset = (presetId: string): void => {
    const preset = MEDICATION_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    setActivePresetId(presetId);
    setForm((current) => ({
      ...current,
      medicationName: preset.medicationName,
      medicationPresentation: preset.presentation,
      doseValue: preset.doseValue,
      doseUnit: preset.doseUnit,
      route: preset.route,
      frequencyType: preset.frequencyType,
      durationValue: preset.durationValue,
      durationUnit: preset.durationUnit,
      quickAmount: preset.quickAmount,
      quickForm: preset.quickForm
    }));
  };

  const submitCreate = async (): Promise<boolean> => {
    if (props.mode !== 'create') {
      return false;
    }

    const medicationName = form.medicationName.trim();
    const doseUnit = form.doseUnit.trim();
    const startAtIso = toIsoOrNull(form.startAt);
    const endAtIso = toIsoOrNull(form.endAt);
    const doseValue = Number(form.doseValue);
    const durationInput = form.durationValue.trim();
    let durationValue: number | undefined;
    let durationUnitToSend: DurationUnit = form.durationUnit;

    if (durationInput.length > 0) {
      const parsedDuration = Number.parseInt(durationInput, 10);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        setLocalError('Duração deve ser um número maior que zero.');
        return false;
      }
      durationValue = parsedDuration;
    }

    if (durationValue === undefined) {
      durationUnitToSend = '';
    } else if (durationUnitToSend === '') {
      durationUnitToSend = 'days';
    }

    if (medicationName.length === 0) {
      setLocalError('Nome da medicação é obrigatório.');
      return false;
    }

    if (!Number.isFinite(doseValue) || doseValue <= 0) {
      setLocalError('Dose deve ser maior que zero.');
      return false;
    }

    if (doseUnit.length === 0) {
      setLocalError('Unidade da dose é obrigatória.');
      return false;
    }

    if (!startAtIso) {
      setLocalError('Início da prescrição é obrigatório e deve ser uma data válida.');
      return false;
    }

    if (endAtIso && new Date(endAtIso).getTime() < new Date(startAtIso).getTime()) {
      setLocalError('Data de fim não pode ser menor que a data de início.');
      return false;
    }

    if (!props.encounterId && !props.stayId) {
      setLocalError('Contexto inválido: informe encounterId ou stayId para criar prescrição.');
      return false;
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
      prescriptionText: form.prescriptionText.trim() || undefined,
      startAt: startAtIso,
      endAt: endAtIso ?? undefined,
      durationValue,
      durationUnit: durationUnitToSend || undefined
    });

    return true;
  };

  const submitEdit = async (): Promise<boolean> => {
    if (props.mode !== 'edit') {
      return false;
    }

    const patch: MedicationOrderUpdateInput = {};
    const doseValue = Number(form.doseValue);
    const orderDoseValue = Number(props.order.doseValue);
    const doseUnit = form.doseUnit.trim();
    const endAtIso = toIsoOrNull(form.endAt);
    const orderEndAtMs = props.order.endAt ? new Date(props.order.endAt).getTime() : null;
    const durationInput = form.durationValue.trim();
    let durationValue: number | undefined;
    let durationUnitToSend: DurationUnit = form.durationUnit;
    const orderDurationValue = props.order.durationValue ?? undefined;
    const normalizedPrescriptionText = form.prescriptionText.trim();
    const currentPrescriptionText = props.order.prescriptionText ?? '';

    if (durationInput.length > 0) {
      const parsedDuration = Number.parseInt(durationInput, 10);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        setLocalError('Duração deve ser um número maior que zero.');
        return false;
      }
      durationValue = parsedDuration;
    }

    if (durationValue === undefined) {
      durationUnitToSend = '';
    } else if (durationUnitToSend === '') {
      durationUnitToSend = 'days';
    }

    if (!Number.isFinite(doseValue) || doseValue <= 0) {
      setLocalError('Dose deve ser maior que zero.');
      return false;
    }

    if (doseUnit.length === 0) {
      setLocalError('Unidade da dose é obrigatória.');
      return false;
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

    if (normalizedPrescriptionText !== currentPrescriptionText) {
      patch.prescriptionText = normalizedPrescriptionText.length > 0 ? normalizedPrescriptionText : null;
    }

    const endAtMs = endAtIso ? new Date(endAtIso).getTime() : null;
    if (endAtIso && endAtMs !== orderEndAtMs) {
      patch.endAt = endAtIso;
    }

    if (durationValue !== orderDurationValue) {
      patch.durationValue = durationValue;
      patch.durationUnit = durationUnitToSend || undefined;
    } else if ((props.order.durationUnit ?? '') !== durationUnitToSend) {
      patch.durationUnit = durationUnitToSend || undefined;
    }

    if (Object.keys(patch).length === 0) {
      setLocalError('Nenhuma alteração detectada para salvar.');
      return false;
    }

    await props.onSubmit(patch);
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const submitEvent = event.nativeEvent as SubmitEvent;
    const submitter = submitEvent.submitter as HTMLButtonElement | null;
    const intent: SubmitIntent = submitter?.dataset.intent === 'save-print' ? 'save-print' : 'save';
    setSubmitIntent(intent);

    if (intent === 'save-print' && (form.prescriberName.trim().length === 0 || form.prescriberCrmv.trim().length === 0)) {
      setLocalError('Para imprimir, informe nome e CRMV do Médico Veterinário.');
      return;
    }

    let printWindow: Window | null = null;
    if (intent === 'save-print' && typeof window !== 'undefined') {
      printWindow = window.open('', '_blank');
      if (!printWindow) {
        setLocalError('Permita pop-up no navegador para usar "Salvar e imprimir".');
        return;
      }
    }

    try {
      const success = props.mode === 'create' ? await submitCreate() : await submitEdit();
      if (!success) {
        printWindow?.close();
        return;
      }

      if (intent === 'save-print' && printWindow) {
        const contextLabel =
          props.mode === 'create'
            ? props.encounterId
              ? `Atendimento ${props.encounterId}`
              : props.stayId
                ? `Internação ${props.stayId}`
                : 'Contexto não informado'
            : props.order.encounterId
              ? `Atendimento ${props.order.encounterId}`
              : props.order.stayId
                ? `Internação ${props.order.stayId}`
                : 'Contexto não informado';

        const html = buildPrintHtml({
          patientId: props.mode === 'create' ? props.patientId : props.order.patientId,
          encounterOrStayLabel: contextLabel,
          medicationName: form.medicationName.trim(),
          presentation: form.medicationPresentation.trim() || `${form.doseValue} ${form.doseUnit}`,
          doseValue: form.doseValue.trim(),
          doseUnit: form.doseUnit.trim(),
          routeLabel: ROUTE_LABELS[form.route],
          frequencyLabel: FREQUENCY_LABELS[form.frequencyType],
          instruction: finalInstruction,
          prescriberName: form.prescriberName.trim(),
          prescriberCrmv: form.prescriberCrmv.trim(),
          prescriptionDate: new Date(form.prescriptionDate).toLocaleDateString('pt-BR')
        });

        writeAndPrint(printWindow, html);
      }
    } catch (error) {
      printWindow?.close();
      setLocalError(error instanceof Error ? error.message : 'Falha ao salvar a prescrição.');
    }
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
        gap: 12
      }}
    >
      <h3 style={{ margin: 0, fontSize: 19 }}>
        {props.mode === 'create' ? 'Nova prescrição' : 'Editar prescrição ativa'}
      </h3>

      {props.mode === 'create' ? (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Preenchimento rápido</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MEDICATION_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyMedicationPreset(preset.id)}
                  style={{
                    border: active ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    background: active ? '#f8fafc' : '#ffffff',
                    borderRadius: 999,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Nome da medicação</span>
        <input
          value={form.medicationName}
          onChange={(event) => onFieldChange('medicationName', event.target.value)}
          readOnly={props.mode === 'edit'}
          placeholder="Ex: Dipirona"
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Apresentação</span>
        <input
          value={form.medicationPresentation}
          onChange={(event) => onFieldChange('medicationPresentation', event.target.value)}
          placeholder="Ex: Comprimido 500 mg"
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Dose</span>
          <input
            value={form.doseValue}
            onChange={(event) => onFieldChange('doseValue', event.target.value)}
            placeholder="500"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Unidade</span>
          <input
            value={form.doseUnit}
            onChange={(event) => onFieldChange('doseUnit', event.target.value)}
            placeholder="mg"
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
                {ROUTE_LABELS[option]}
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
                {FREQUENCY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Início</span>
          <input
            type="datetime-local"
            value={form.startAt}
            onChange={(event) => onFieldChange('startAt', event.target.value)}
            readOnly={props.mode === 'edit'}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Fim</span>
          <input
            type="datetime-local"
            value={form.endAt}
            onChange={(event) => onFieldChange('endAt', event.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
        <strong style={{ fontSize: 14 }}>Posologia rápida</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Quantidade por dose</span>
            <input
              value={form.quickAmount}
              onChange={(event) => onFieldChange('quickAmount', event.target.value)}
              placeholder="1"
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Forma farmacêutica</span>
            <select
              value={form.quickForm}
              onChange={(event) => onFieldChange('quickForm', event.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
            >
              {QUICK_FORM_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Duração</span>
            <input
              value={form.durationValue}
              onChange={(event) => onFieldChange('durationValue', event.target.value)}
              placeholder="3"
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Unidade da duração</span>
            <select
              value={form.durationUnit}
              onChange={(event) => onFieldChange('durationUnit', event.target.value as DurationUnit)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
            >
              <option value="">Não informar</option>
              <option value="days">Dias</option>
              <option value="hours">Horas</option>
            </select>
          </label>
        </div>

        <div style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>Frase automática:</strong>
          <span>{quickInstruction}</span>
        </div>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Prescrição em texto livre (opcional)</span>
        <textarea
          value={form.prescriptionText}
          onChange={(event) => onFieldChange('prescriptionText', event.target.value)}
          rows={3}
          placeholder='Ex: Dê 1 comprimido a cada 12 horas durante 3 dias.'
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px', resize: 'vertical' }}
        />
      </label>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
        <strong style={{ fontSize: 14 }}>Assinatura do Médico Veterinário</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Nome do Veterinário</span>
            <input
              value={form.prescriberName}
              onChange={(event) => onFieldChange('prescriberName', event.target.value)}
              placeholder='Ex: Dr(a). Nome Sobrenome'
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>CRMV</span>
            <input
              value={form.prescriberCrmv}
              onChange={(event) => onFieldChange('prescriberCrmv', event.target.value)}
              placeholder='Ex: CRMV-SP 12345'
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
            />
          </label>
        </div>
        <label style={{ display: 'grid', gap: 6, maxWidth: 280 }}>
          <span>Data da prescrição</span>
          <input
            type="date"
            value={form.prescriptionDate}
            onChange={(event) => onFieldChange('prescriptionDate', event.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>
        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 12 }}>
          <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
            Assinatura e carimbo: ____________________________________________
          </p>
        </div>
      </div>

      {localError ? <p style={{ margin: 0, color: '#b91c1c' }}>{localError}</p> : null}
      {props.errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{props.errorMessage}</p> : null}

      <footer style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {props.onCancel ? (
          <button
            type="button"
            onClick={props.onCancel}
            disabled={props.submitting}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 12px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
        ) : null}

        <button
          type="submit"
          data-intent="save"
          disabled={props.submitting}
          style={{
            border: '1px solid #0f172a',
            borderRadius: 8,
            padding: '8px 12px',
            background: '#0f172a',
            color: '#fff',
            cursor: 'pointer',
            opacity: props.submitting ? 0.7 : 1
          }}
        >
          {props.submitting && submitIntent === 'save'
            ? props.mode === 'create'
              ? 'Salvando...'
              : 'Salvando alterações...'
            : props.mode === 'create'
              ? 'Salvar prescrição'
              : 'Salvar alterações'}
        </button>

        <button
          type="submit"
          data-intent="save-print"
          disabled={props.submitting}
          style={{
            border: '1px solid #0369a1',
            borderRadius: 8,
            padding: '8px 12px',
            background: '#0ea5e9',
            color: '#fff',
            cursor: 'pointer',
            opacity: props.submitting ? 0.7 : 1
          }}
        >
          {props.submitting && submitIntent === 'save-print' ? 'Salvando e preparando impressão...' : 'Salvar e imprimir'}
        </button>
      </footer>
    </form>
  );
}
