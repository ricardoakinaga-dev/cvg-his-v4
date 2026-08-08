# Progresso Fase 1 - F1-08 Fidelidade: auditoria de resgate

Data: 2026-05-28

## Objetivo

Elevar a tela de fidelidade/resgate de pontos para uma leitura mais operacional e auditavel, aproximando o modulo do esperado para o CVG HIS Premium Enterprise.

## Entregue neste incremento

- O historico de resgates agora mostra mais contexto por linha:
  - beneficio concedido;
  - status do resgate;
  - badge visual para `Pendente`, `Concluido` e `Cancelado`.
- O painel de metricas agora inclui `Pontos resgatados`, usando `redeemedPoints` retornado pela API.
- A composicao do resgate selecionado agora exibe uma trilha de auditoria com:
  - ID do resgate;
  - status;
  - cliente/tutor;
  - data de resgate.
- Os testes da tela de fidelidade foram ampliados para cobrir:
  - novas colunas do historico;
  - status traduzido;
  - metrica de pontos resgatados;
  - trilha de auditoria do resgate selecionado;
  - troca de item selecionado pelo botao `Abrir`.

## Arquivos alterados

- `apps/spa/src/pages/loyalty/LoyaltyPage.vue`
- `apps/spa/src/pages/loyalty/LoyaltyPage.test.ts`

## Validacao executada

- `pnpm exec vitest run src/pages/loyalty/LoyaltyPage.test.ts --pool=forks`
  - Resultado: 1 arquivo de teste, 5 testes aprovados.
- `pnpm --filter @cvg-his-v2/spa typecheck`
  - Resultado: aprovado.
- `pnpm --filter @cvg-his-v2/spa build`
  - Resultado: aprovado.

## Impacto no roadmap Premium Enterprise

Este incremento avanca o item F1-08 do roadmap:

- antes: saldo, filtro simples, inclusao e composicao basica do resgate;
- agora: historico com beneficio/status, metrica de pontos resgatados e trilha auditavel do resgate selecionado.

## Pendencias recomendadas para completar F1-08

- Buscar saldo por tutor selecionado no formulario antes de confirmar o resgate.
- Bloquear preventivamente resgate maior que o saldo disponivel do tutor, mantendo a validacao final no backend.
- Expor origem dos pontos acumulados, incluindo venda/comanda/programa/regra.
- Permitir cancelamento auditado de resgate, se a regra operacional permitir estorno.
- Documentar regras de expiracao, pontos bloqueados e politicas de campanha.
