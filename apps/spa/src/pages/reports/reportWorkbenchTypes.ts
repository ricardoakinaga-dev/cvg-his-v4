import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import type { AdministrativeReportsResponse } from '@/services/administrativeReports';

/** WEB-REPORTS: presentation contract shared by the workbench and report families. */
export interface ReportSpec {
  title: string;
  group: string;
  subtitle: string;
  icon: string;
  primaryPath: string;
  primaryAction: string;
  primaryDisabled?: boolean;
  exportable?: boolean;
  serverReportId?: string;
  tableTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  note?: string;
  columns: DataTableColumn[];
  cards: (report: AdministrativeReportsResponse | null) => ReportCard[];
  rows: (report: AdministrativeReportsResponse | null) => DataTableRow[];
}

export interface ReportCard {
  label: string;
  value: string;
  icon: string;
}
