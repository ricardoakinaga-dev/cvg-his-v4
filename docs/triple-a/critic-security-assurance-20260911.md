# Auditoria independente de segurança e release — escopo delimitado

## Reconciliação do candidato vigente — 2026-09-12

As linhas abaixo são um parecer histórico. A análise corrente é
`c7336ac0f6a909c10d07797c36814f0b321c6d5`, CI #135: os jobs de segurança
passaram, mas o run geral falhou em Performance. Branch protection, runtime
RLS/roles, attestation e autoridade continuam `NOT PROVEN`.

**SHA de código avaliado:** `b77539c9891eef89cbbe8160bf6e30a0fb369d48`
**Snapshot documental publicado:** `68bea151102c01ee54a3c782b5cf4b1c3ad631f5`
**Resultado:** `NOT PROVEN / BLOCKED`

O CI #129 do candidato funcional `68600d6a` terminou com 15/16 jobs aprovados;
Performance foi o único job falho. Os checks de segurança, typecheck, lint,
build e guards passaram; isso não altera este parecer de segurança.

O CI #128 posterior do mesmo snapshot terminou com 15/16 jobs aprovados;
Performance foi o único job falho. A análise específica está em
[`critic-performance-assurance-20260911.md`](./critic-performance-assurance-20260911.md)
e não altera este parecer de segurança.

As verificações locais do candidato passaram: `pnpm security:secrets`, RLS
estático (`170/171` tabelas com proteção e uma exceção documentada),
`validate:supply-chain` (113 actions e 6 imagens-base imutáveis) e a política
de dependências (69 manifests). Elas cobrem a superfície estática e não
provam roles/runtime, registry ou ambiente alvo.

O CI #126 do SHA de código terminou `failure` (14/16); Performance e Critical
Process Runner Windows falharam. O CI #127 do snapshot documental foi iniciado,
mas precisa terminalizar no SHA novo antes de qualquer conclusão. Os logs e
artefatos detalhados dos jobs falhos não são públicos sem credencial
administrativa, então não há causa raiz comprovada nem justificativa para
alterar thresholds.

Governança de branch, required checks, aprovação de release, attestation e
assinatura de imagem não podem ser confirmadas pelo checkout público. O gate
local atual permanece fail-closed quando não recebe envelopes externos para
CI, RLS runtime, deploy, recovery, UAT, attestation e autoridade.

Este relatório é um parecer independente de lacunas, não uma aprovação. O
estado de segurança/release deve permanecer bloqueado até evidências SHA-bound
autenticadas e uma nova execução remota terminalmente verde.

## Atualização do candidato funcional — CI #137

O candidato `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689` passou o
[CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200)
com `16/16` jobs verdes. A execução cobre os checks publicados do workflow, mas
não fornece branch governance autenticada, RLS/roles no target, SBOM/proveniência
assinada, attestation ou autoridade humana. O parecer permanece
`BLOCKED / NOT PROVEN` e o gate local registra `54/54/16`.
