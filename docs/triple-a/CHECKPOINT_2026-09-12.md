# Checkpoint — merge seguro e auditoria

**Registrado em:** `2026-09-12T13:26:00Z`
**Repositório:** `https://github.com/ricardoakinaga-dev/cvg-his-v4`
**Candidato de código:** `a258b3ceec6a22a0853d1022af40bdd6057a786b`

## Estado do Git

- Branch ativa: `main`; o candidato anterior publicado era `e6edb6f8`; esta reconciliação será publicada por fast-forward, sem force-push.
- Rollback remoto preservado em `origin/fix/state-of-art-ci-assurance@fe5406c23c515585629060e0dc01b91f2d113d65`.
- O snapshot documental anterior apontava para `f2e2da4cab80917d7c6bea0ddf1e55d58eb6821c`; esta atualização reancora as evidências no hardening de logging, workflow e tenant.

## Mudanças validadas

- Redaction recursiva e validação de metadata operacional em tarefas; payloads de eventos são redigidos antes da persistência e na resposta HTTP.
- Falha de `failClaim` não aborta o tick do worker: há métrica `transition_failed`, o estado não é classificado como retry/DLQ sem confirmação e os claims seguintes continuam.
- `withTenantQueryExplicit` verifica `current_setting('app.current_account_id')` antes de executar o callback; mismatch faz rollback e impede execução.
- Testes locais: workflows `16/16`, worker completo, tenant-context `9/9`, módulos financial `28/28`, inventory `54/54`, owners `49/49`, services `21/21`, patients `55/55`, commissions `18/18`, API workflow routes `4/4`; OpenAPI `421` paths e contrato clínico válidos.

## CI e decisão

O [CI #155](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34695557227) pertence ao commit documental anterior `e6edb6f8` e não é promovido como evidência do candidato `a258b3ce`. O push desta reconciliação deve gerar nova execução terminal com os guards vinculados ao SHA correto.

O estado continua **BLOCKED / NOT PROVEN**: o gate local histórico é `55/57/15`, e permanecem sem prova target, recovery/restore, UAT, attestation, governança, deploy/rollback, performance remota e autoridade de release. Não declarar `main green` ou `TRIPLE-A VERIFIED`.

## Retomada após fechar o aplicativo

```bash
cd /home/ricardo/cvg-his-v4
git status --short --branch
git log --oneline -4 --decorate
pnpm docs:validate
git diff --check
```

Depois, abrir o CI disparado por esta reconciliação. Só aceitar merge/release quando
o SHA exato estiver com todos os jobs obrigatórios verdes e as provas externas
exigidas pelo quality bar estiverem presentes.
