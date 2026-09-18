# Reconciliação seletiva de branches — 2026-09-18

## Decisão

O candidato integrado é `686c47d09adc6b57d624f3ca822ca649710425f6`, descendente
direto de `origin/main@e011cfd2e47a8a8290b26b5c6328750d71586c95`. A publicação
deve ser um fast-forward; nenhum force-push ou exclusão de branch foi usado.

As branches `origin/codex/state-of-art-hardening-20260917` (`4c8200f2`) e
`origin/fix/state-of-art-ci-assurance` (`fe5406c2`) já eram ancestrais de
`main`, portanto não havia delta exclusivo a mesclar. A branch
`origin/codex/state-of-art-hardening-final-20260917` também era ancestral. A
única branch divergente com mudanças adicionais foi
`origin/codex/state-of-art-hardening-final-ci-20260917` (`14f9c589`).

## Delta mantido

Foram incorporados somente os commits não conflitantes, após build e testes:

- `59bbb1ac` → `7df561ba`: aceita módulos ESM de reexport válidos com zero-hit
  no teste do processador de cobertura;
- `8098e8be` → `4e328b0a`: combina a leitura autoritativa de sessão/usuário no
  caminho PostgreSQL e coalesceia probes de saúde Redis por uma janela curta;
- `271bc3c3` → `686c47d0`: mantém o gate de revogação compatível com o lookup
  autoritativo combinado.

## Delta rejeitado

Os commits `89128e01` e `14f9c589` não foram incorporados. Eles introduzem uma
segunda família de migrations/versionamento de ACL que conflita com as migrations
canônicas `0175/0176` já presentes em `main`, além de substituir o repositório
de acesso por um contrato diferente. O teste SQL associado é redundante para o
contrato vigente. Os commits de CI para disparar workflows em `codex/**` e os
commits de documentação reancorados também ficaram fora, pois trazem ruído de
execução ou identidade/evidência histórica obsoleta.

O CI histórico da branch divergente (#275, run
`35296975361`) falhou durante a preparação de banco. A reprodução local isolou
o defeito determinístico na migration alternativa: o trigger chamava uma
função declarada `RETURNS void`, produzindo `function
app.bump_access_control_global_version must return type trigger` (SQLSTATE
42P17). Essa correção diagnóstica não foi aplicada em `main`, porque a família
de migration conflitante foi rejeitada integralmente.

## Verificação do candidato integrado

No worktree candidate-bound, sem alterar thresholds, escopo ou snapshots:

- `pnpm build`: PASS;
- DB: `36/36` testes PASS;
- auth: `72/72` testes PASS, com migrations `0000`–`0176` aplicadas;
- API: `620/620` testes PASS;
- reexport: `17/17` testes PASS;
- SQL migration evidence: `6/6` testes PASS;
- identidade, P0 registry, documentação, prompt crosswalk, manifesto crítico e
  `git diff --check`: PASS.

O CI remoto exato do novo candidato ainda precisa terminar. O último run
terminal disponível, CI #282, continua `failure` nos gates de Critical Coverage
e Performance/k6; por isso release e Triplo AAA permanecem **BLOCKED / NOT
PROVEN**.
