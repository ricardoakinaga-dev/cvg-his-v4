# Progresso Fase 4 - Resumo de Alertas de Relatorios no Painel de Auditoria

Data: 2026-05-28

## Contexto

Depois de conectar os alertas operacionais de entregas de relatorios ao contrato de auditoria, faltava tornar esse sinal visivel no console `/audit`, com acao direta para triagem.

## Entrega realizada

- Adicionada secao `Alertas de relatórios` no painel de auditoria.
- A secao resume eventos high-risk com `entityType=report-schedule-delivery-alert`.
- Criada acao `Filtrar alertas` que aplica:
  - entidade `report-schedule-delivery-alert`
  - risco `high`
- O painel exibe `Filtro ativo: alertas de relatórios` quando o filtro assistido esta aplicado.
- Teste de SPA cobre renderizacao do resumo e a filtragem direta.

## Evidencia tecnica

- Arquivos alterados:
  - `apps/spa/src/pages/audit/AuditPage.vue`
  - `apps/spa/src/pages/audit/__tests__/AuditPage.test.ts`
- Validacao executada:
  - `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/audit/__tests__/AuditPage.test.ts`

## Impacto Premium Enterprise

O console de auditoria passa a funcionar como ponto central de triagem para falhas recorrentes em relatorios agendados, conectando suporte operacional, governanca e rastreabilidade de eventos sensiveis.

## Proximos passos

- Criar link reverso do evento auditado para o agendamento de relatorio.
- Permitir reprocessamento assistido a partir de um alerta filtrado.
- Consolidar alertas de relatorios no dashboard executivo Premium.
