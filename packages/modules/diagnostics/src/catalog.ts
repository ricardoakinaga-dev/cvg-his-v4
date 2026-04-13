import type {
  ExamCatalogEntry,
  LaboratoryEquipmentSummary,
  LaboratoryReferenceValueSummary,
  LaboratoryReportTypeSummary
} from '@cvg-his-v2/shared-types';

export const DEFAULT_LABORATORY_REPORT_TYPES: readonly LaboratoryReportTypeSummary[] = [
  {
    id: 'cat_001',
    name: 'Hemograma',
    code: 'HEM',
    category: 'Laboratorial',
    description: 'Exame hematologico completo',
    active: true
  },
  {
    id: 'cat_002',
    name: 'Bioquimico',
    code: 'BIO',
    category: 'Laboratorial',
    description: 'Perfil bioquimico serico',
    active: true
  },
  {
    id: 'cat_003',
    name: 'Urina',
    code: 'URIN',
    category: 'Laboratorial',
    description: 'Urina tipo 1 e sedimento',
    active: true
  },
  {
    id: 'cat_004',
    name: 'Radiografia',
    code: 'RX',
    category: 'Imagem',
    description: 'Imagem radiografica simples',
    active: true
  },
  {
    id: 'cat_005',
    name: 'Ultrassonografia',
    code: 'US',
    category: 'Imagem',
    description: 'Ultrassonografia abdominal e de partes moles',
    active: true
  },
  {
    id: 'cat_006',
    name: 'Ecocardiograma',
    code: 'ECO',
    category: 'Imagem',
    description: 'Ecocardiograma estrutural',
    active: true
  }
];

export const DEFAULT_EXAM_CATALOG: readonly ExamCatalogEntry[] =
  DEFAULT_LABORATORY_REPORT_TYPES.map((entry) => ({
    id: entry.id,
    code: entry.code,
    name: entry.name,
    category: entry.category,
    description: entry.description
  }));

export const DEFAULT_LABORATORY_EQUIPMENT: readonly LaboratoryEquipmentSummary[] = [
  {
    id: 'lab-eq-hem',
    name: 'Analisador Hematologico VetAuto 5D',
    type: 'Hematologia',
    serialNumber: 'VET-HEM-5D-001',
    status: 'active',
    lastCalibrationAt: '2026-04-01T09:00:00.000Z'
  },
  {
    id: 'lab-eq-bio',
    name: 'Bioquimico ChemLab 300',
    type: 'Bioquimica',
    serialNumber: 'BIO-300-114',
    status: 'active',
    lastCalibrationAt: '2026-04-03T08:30:00.000Z'
  },
  {
    id: 'lab-eq-uri',
    name: 'Leitor de Urinalise StripScan',
    type: 'Urinalise',
    serialNumber: 'URI-7781',
    status: 'maintenance',
    lastCalibrationAt: '2026-03-20T14:00:00.000Z'
  },
  {
    id: 'lab-eq-img',
    name: 'Ultrassom SonoVet',
    type: 'Imagem',
    serialNumber: 'US-2209',
    status: 'active',
    lastCalibrationAt: '2026-04-08T10:15:00.000Z'
  }
];

export const DEFAULT_LABORATORY_REFERENCE_VALUES: readonly LaboratoryReferenceValueSummary[] = [
  {
    id: 'ref-hem-1',
    parameter: 'Hemacias',
    examType: 'HEM',
    minValue: 5.5,
    maxValue: 8.5,
    unit: 'milhoes/uL'
  },
  {
    id: 'ref-hem-2',
    parameter: 'Leucocitos',
    examType: 'HEM',
    minValue: 6,
    maxValue: 17,
    unit: 'mil/uL'
  },
  {
    id: 'ref-bio-1',
    parameter: 'ALT',
    examType: 'BIO',
    minValue: 10,
    maxValue: 125,
    unit: 'U/L'
  },
  {
    id: 'ref-bio-2',
    parameter: 'Creatinina',
    examType: 'BIO',
    minValue: 0.5,
    maxValue: 1.8,
    unit: 'mg/dL'
  },
  {
    id: 'ref-urin-1',
    parameter: 'Densidade urinaria',
    examType: 'URIN',
    minValue: 1.015,
    maxValue: 1.045,
    unit: 'SG'
  },
  {
    id: 'ref-urin-2',
    parameter: 'pH urinario',
    examType: 'URIN',
    minValue: 5.5,
    maxValue: 7.5,
    unit: 'pH'
  }
];
