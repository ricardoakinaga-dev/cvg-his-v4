export type RenderPdfInput = {
    html: string;
};
export type RenderPdfOutput = {
    mimeType: 'application/pdf';
    content: Buffer;
};
export declare function renderHandoverPdf(_input: RenderPdfInput): Promise<RenderPdfOutput | null>;
//# sourceMappingURL=handoverPdf.d.ts.map