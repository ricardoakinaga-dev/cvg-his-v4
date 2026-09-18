import { spawnSync } from 'node:child_process';

// Code-owned trust policy. A report cannot nominate its own signer or verifier.
const SECURITY_SIGNER_WORKFLOW = '.github/workflows/release-artifacts.yml';

export function verifySecurityReportAttestation({ rootDir, reportPath, reportSha256, commitSha }) {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (process.env.TRIPLE_A_VERIFY_SECURITY_ATTESTATION !== '1'
      || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') || !token) {
    return { status: 'PARTIAL', reason: 'Security evidence exige proveniência independente; habilite TRIPLE_A_VERIFY_SECURITY_ATTESTATION com GITHUB_REPOSITORY e GH_TOKEN para verificar a attestation.' };
  }
  if (!/^[0-9a-f]{40}$/i.test(commitSha ?? '') || !/^[0-9a-f]{64}$/i.test(reportSha256 ?? '')) {
    return { status: 'FAIL', reason: 'Security attestation exige SHA do candidato e digest dos bytes consumidos válidos.' };
  }
  // These constraints are checked against GitHub OIDC certificate identity,
  // not a report-provided predicate. workflow_run context drift fails closed.
  const result = spawnSync('gh', [
    'attestation', 'verify', reportPath,
    '--repo', repository,
    '--signer-workflow', `${repository}/${SECURITY_SIGNER_WORKFLOW}`,
    '--source-ref', 'refs/heads/main',
    '--source-digest', commitSha,
    '--signer-digest', commitSha,
    '--predicate-type', 'https://slsa.dev/provenance/v1',
    '--format', 'json',
  ], {
    cwd: rootDir, encoding: 'utf8', shell: false,
    env: { ...process.env, GH_TOKEN: token },
    maxBuffer: 16 * 1024 * 1024, timeout: 60_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error?.code === 'ENOENT') {
    return { status: 'PARTIAL', reason: 'Verificador gh indisponível; proveniência independente da segurança não confirmada.' };
  }
  if (result.status !== 0) {
    return { status: 'FAIL', reason: 'gh rejeitou a attestation de segurança: assinatura, repositório, workflow ou SHA não confirmado.' };
  }
  try {
    const verified = JSON.parse(result.stdout ?? '');
    if (!Array.isArray(verified) || verified.length === 0) throw new Error('empty verification');
    for (const entry of verified) {
      const subjects = entry?.verificationResult?.statement?.subject;
      if (!Array.isArray(subjects) || subjects.length === 0) throw new Error('missing subjects');
      if (subjects.some((subject) => subject?.digest?.sha256?.toLowerCase() !== reportSha256.toLowerCase())) {
        throw new Error('different subject');
      }
    }
  } catch {
    return { status: 'FAIL', reason: 'Saída gh inválida ou subject diferente dos bytes consumidos de security-evidence.json.' };
  }
  return { status: 'PASS', reason: 'Security evidence autenticada por gh: repositório, workflow release, main, SHA de origem/assinante e digest do relatório conferem.' };
}
