type HandoverRenderItem = {
    stayId: string;
    patientSnapshot: Record<string, unknown>;
    problems: unknown[];
    plan: unknown[];
    criticalMeds: unknown[];
    alerts: Record<string, unknown>;
    pending: unknown[];
    escalation: Record<string, unknown>;
    notes: string | null;
};
export type HandoverRenderInput = {
    handoverId: string;
    wardName: string;
    shiftDate: string;
    shiftPeriod: string;
    items: HandoverRenderItem[];
    generatedAt: string;
};
export declare function renderHandoverHtml(input: HandoverRenderInput): string;
export {};
//# sourceMappingURL=handoverHtml.d.ts.map