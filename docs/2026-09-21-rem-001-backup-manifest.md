---
document_status: current
document_kind: evidence-index
effective_date: 2026-09-21
---

# REM-001 — índice do backup externo

O backup foi criado fora da árvore do repositório em:

`/home/ricardo/cvg-his-v4-backups/20260921-remediacao-integral-rem001`

O diretório contém o bundle de todas as refs, `refs.txt`, identidades HEAD/origin,
patch binário das alterações rastreadas, arquivo dos caminhos não rastreados,
cópia do control plane, inventário do blob grande, `history-rewrite-dry-run.txt`,
`bundle-verify.txt`, `bundle-recovery.txt` e `SHA256SUMS`.

Observações verificadas:

- `HEAD`: `ad2f0373f68635f2579253b013a4382219906921`;
- `origin/main`: `363c87efd653dad74afa1a6caf125debc6004641`;
- distância local: 79 commits;
- `.gauntlet/state.json` em HEAD: 152.651.034 bytes;
- bundle completo e clone de recuperação reproduziu o HEAD;
- nenhuma reescrita, remoção de ref, push ou publicação foi executada.

O índice é apenas uma referência versionada para a cópia externa; não substitui
o backup nem autoriza REM-002.
