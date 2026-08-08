# Progresso Fase 2 - Comissoes com Persistencia PostgreSQL/RLS

Data: 2026-05-28

## Escopo entregue

- Criada a migration `0047_commissions.sql` com tabelas persistentes para:
  - `commission_rules`
  - `commission_calculations`
  - `commission_lines`
- Aplicadas politicas RLS por `account_id = app.current_account_id()` nas tres tabelas.
- Adicionados indices por conta, status, periodo, escopo, profissional e origem produtiva.
- O modulo `@cvg-his-v2/module-commissions` passou a expor:
  - `CommissionRepository`
  - `CommissionsServiceOptions`
  - `DatabaseCommissionRepository`
  - `persistenceMode`
  - `hydrateFromDatabase(accountId)`
- As operacoes mutaveis agora persistem quando o repositorio esta configurado:
  - criar regra;
  - criar fechamento;
  - gravar linhas calculadas;
  - atualizar total do fechamento;
  - revisar;
  - marcar como pago;
  - cancelar.
- O runtime da API passou a aceitar `repositories.commissions`.
- O bootstrap conecta `DatabaseCommissionRepository` quando as tres tabelas de comissoes existem.
- A inicializacao do runtime hidrata regras, fechamentos e linhas de comissao no mesmo ciclo dos demais dominios.

## Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-commissions build`
- `pnpm --filter @cvg-his-v2/module-commissions test`
- `pnpm --filter @cvg-his-v2/module-packages build`
- `pnpm --filter @cvg-his-v2/api build`
- `node --test dist/routes/commission-routes.test.js` em `apps/api`
- `pnpm exec vitest run src/pages/rh/__tests__/RhOperationalPages.test.ts --pool=forks` em `apps/spa`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`

Resultado: todos os comandos passaram.

## Observacoes tecnicas

- IDs de regras, fechamentos e linhas permanecem como `TEXT`, pois o dominio usa IDs com prefixo gerados por `createCorrelationId`.
- `account_id` e usuarios de criacao/revisao/pagamento/cancelamento usam UUID, alinhados ao schema canonico.
- `staff_id` usa `TEXT` e referencia `staff(id)`, preservando o padrao atual do cadastro de profissionais.
- O bootstrap mantem fallback in-memory se as tabelas ainda nao estiverem aplicadas no ambiente.

## Proximo passo recomendado

Conectar fontes produtivas individualizadas para comissao: itens de billing, vendas de balcao, consumo de pacotes e atendimento executado por profissional. Depois, expor os schemas de comissoes no OpenAPI.
