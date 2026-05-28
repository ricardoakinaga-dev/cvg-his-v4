# Progresso Fase 2 - Comissoes na SPA Operacional

Data: 2026-05-28

## Escopo entregue

- Criado o client `apps/spa/src/services/commissions.ts` para consumir o contrato real da API de comissoes.
- A tela `/commission-rules` deixou de ser apenas uma superficie preditiva:
  - lista regras reais de comissao;
  - cria regras via `POST /commission-rules`;
  - permite escopo por profissional quando selecionado;
  - parametriza tipo de item e percentual;
  - mostra status, percentual, escopo e equipe vinculada.
- A tela `/commission-calculations` passou a operar fechamentos reais:
  - carrega fechamentos por `GET /commission-calculations`;
  - gera rascunho por `POST /commission-calculations`;
  - monta linhas de producao a partir dos dados comerciais carregados;
  - permite revisar, pagar e cancelar via API;
  - mostra base, total de comissao, status e acoes por fechamento.
- Atualizados os testes unitarios de RH para cobrir listagem, criacao, calculo e revisao de comissoes.

## Validacoes executadas

- `pnpm exec vitest run src/pages/rh/__tests__/RhOperationalPages.test.ts --pool=forks` em `apps/spa`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`

Resultado: todos os comandos passaram.

## Observacoes tecnicas

- O backend de comissoes ainda esta em memoria; a SPA ja consome o contrato real e fica pronta para persistencia PostgreSQL/RLS no proximo incremento.
- Como a origem produtiva individualizada ainda nao esta normalizada em todos os dominios, a tela monta linhas `manual` a partir dos agregados comerciais disponiveis e distribui a base entre os profissionais selecionados.
- As acoes de revisao, pagamento e cancelamento continuam protegidas pelo backend via permissao `staff.manage` e auditoria.

## Proximo passo recomendado

Adicionar persistencia PostgreSQL/RLS ao modulo de comissoes e depois conectar as fontes produtivas individuais de billing, vendas de balcao, consumo de pacotes e atendimentos executados.
