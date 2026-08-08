# Progresso Fase 1 - Counter-sales fluxo de integracao

Data: 2026-05-28

## Incremento entregue

Incremento da Fase 1 do roadmap Premium Enterprise no item `F1-02 - Consolidar comandas/counter-sales`.

O foco foi comprovar por teste de integracao da API que o fluxo operacional de comanda funciona ponta a ponta e que as travas financeiras enterprise estao ativas no nivel HTTP.

## Escopo implementado

- Novo teste de rota para o fluxo financeiro de comanda:
  - abertura de comanda;
  - inclusao de servico;
  - inclusao de produto;
  - pagamento parcial;
  - bloqueio de edicao que deixaria pagamento acima do total recalculado;
  - preservacao do saldo apos edicao rejeitada;
  - pagamento final;
  - fechamento da comanda;
  - bloqueio de inclusao de item apos fechamento;
  - bloqueio de pagamento apos fechamento.
- O teste exercita a API no mesmo nivel dos clientes externos, usando `handleCounterSalesRoutes`.
- A cobertura reforca o comportamento documentado no OpenAPI e as invariantes do dominio `CounterSalesService`.

## Evidencias de validacao

- `pnpm --filter @cvg-his-v2/api build`: passou.
- `node --test apps/api/dist/routes/counter-sales-routes.test.js`: passou.
  - `5` testes.
- `pnpm validate:openapi`: passou.
  - `244 paths`;
  - `36 tags`;
  - `245 schemas`.
- `pnpm --filter @cvg-his-v2/module-counter-sales build`: passou.
- `pnpm --filter @cvg-his-v2/module-counter-sales test`: passou.
  - `27` testes.

## Impacto no roadmap

Este incremento aproxima `F1-02` do criterio de saida definido no roadmap: abrir, adicionar itens, pagar, fechar e cancelar comanda. A parte de abrir, adicionar itens, pagar, fechar e bloquear mutacoes indevidas agora tem evidencia automatizada no nivel de rota.

O modulo fica mais adequado para homologacao Premium Enterprise porque o fluxo financeiro principal nao depende apenas de teste unitario de dominio: ha prova de integracao no contrato HTTP usado pela SPA e por integracoes externas.

## Proximo foco recomendado

Continuar `F1-02` com uma das frentes restantes:

1. Criar cobertura SPA para o fluxo completo da tela de comandas, incluindo fechamento e bloqueios visuais.
2. Expandir o teste de integracao para cancelamento e reabertura com regras financeiras explicitas.
3. Avancar para `F1-03 - Validar cadastro tutor/paciente`, agora que agenda e comandas receberam incrementos estruturais.
