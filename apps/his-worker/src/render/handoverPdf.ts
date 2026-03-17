export type RenderPdfInput = {
  html: string;
};

export type RenderPdfOutput = {
  mimeType: 'application/pdf';
  content: Buffer;
};

export async function renderHandoverPdf(_input: RenderPdfInput): Promise<RenderPdfOutput | null> {
  return null;
}
