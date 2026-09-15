export function createVueSpecializedBuildEvidencePlugin(options: {
  root: string;
  manifest: { files?: readonly unknown[] };
  contract: { kind?: string };
  head: string;
  runId: string;
}): {
  name: string;
  enforce: 'post';
  transform: (code: string, id: string) => string | null;
  generateBundle: (outputOptions: unknown, bundle: Record<string, unknown>) => void;
};
