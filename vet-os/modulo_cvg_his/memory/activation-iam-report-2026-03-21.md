# Relatório de Ativação IAM - Fase 11

Data: sáb 21 mar 2026 08:34:44 UTC
Status: APPLIED
Admin inicial: admin@cvg-his.local
Checklist curto: docs/iam/11-checklist-operacional-ativacao-iam.md
Checklist completo: docs/iam/10-rollout-checklist.md

Preflight:
- executado via `corepack pnpm iam:preflight`
- log: /home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/logs/activation-iam/preflight-053434.log

Etapas aplicadas:
- migração do banco (`db:migrate`) executada somente apos preflight aprovado
- seed do admin (`db:seed`) exige `ADMIN_EMAIL` e `ADMIN_PASSWORD` explicitos
- sem defaults inseguros para bootstrap
- sem subida automática de serviços

Resumo:
- Preflight, migration e seed concluídos com sucesso.

Próximos passos recomendados:
- iniciar frontend/backend se ainda não estiverem rodando;
- validar login com o admin inicial;
- executar `corepack pnpm iam:smoke` com sessão autenticada;
- registrar evidências usando `docs/operacional/IAM_ACTIVATION_REPORT_TEMPLATE.md`.

Observação: o script não inicia serviços automaticamente; ele apenas aplica preflight, migrate e seed com logging controlado.
