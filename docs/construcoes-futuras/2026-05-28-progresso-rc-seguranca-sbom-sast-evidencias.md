# Progresso RC - Seguranca, SBOM e SAST

Data: 2026-05-28

## Objetivo

Fechar a pendencia interna da F3-03 que ainda exigia evidencia de SAST/SBOM para Release Candidate, mantendo o gate de vulnerabilidades criticas/altas e transformando a configuracao Semgrep do CI em criterio verificavel.

## Entrega

- Criado `scripts/generate-security-evidence.mjs`.
- Criado o comando `pnpm security:evidence`.
- O comando executa `pnpm security:enterprise`.
- O comando valida a configuracao SAST no workflow `.github/workflows/ci.yml`:
  - job `sast`;
  - `returntocorp/semgrep-action@v1`;
  - rulesets `p/security-extended`, `p/nodejs`, `p/typescript`;
  - saida `semgrep.json`;
  - saida `semgrep.sarif`;
  - upload SARIF;
  - ausencia de `continue-on-error: true`.
- O comando gera:
  - `artifacts/security/sbom.cyclonedx.json`;
  - `artifacts/security/security-evidence.json`.
- O job `dependency-audit` do CI passou a executar `pnpm security:evidence`.
- O CI passou a publicar o artefato `security-evidence`.
- O pacote `pnpm rc:evidence` passou a executar `pnpm security:evidence`.

## Evidencia executada

Comando:

```bash
pnpm security:evidence
```

Resultado:

- `critical=0`;
- `high=0`;
- `moderate=3`;
- SBOM gerado com `545` componentes;
- validacao Semgrep/SARIF no CI: `PASS`.

Resumo:

```text
Status: PASS
SBOM: artifacts/security/sbom.cyclonedx.json
SBOM components: 545
```

## Pendencia remanescente

As 3 vulnerabilidades moderadas de tooling continuam rastreadas:

- `esbuild`, via tooling de desenvolvimento;
- `ajv`, via ESLint legado.

Como o gate `pnpm security:enterprise` bloqueia vulnerabilidades `critical` e `high`, essas moderadas permanecem como divida tecnica controlada, sem bloquear o RC tecnico.

## Impacto no RC

F3-03 deixa de depender apenas de nota documental: agora ha um pacote local e de CI com auditoria, SBOM e validacao da superficie SAST.
