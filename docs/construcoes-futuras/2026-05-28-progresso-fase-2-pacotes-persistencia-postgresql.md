# Progresso Fase 2 - Pacotes com Persistencia PostgreSQL/RLS

Data: 2026-05-28

## Escopo entregue

- Criada a migration `0046_customer_packages.sql` com tabelas persistentes para:
  - `customer_packages`
  - `customer_package_items`
  - `customer_package_consumptions`
- Aplicadas politicas RLS por `account_id = app.current_account_id()` nas tres tabelas.
- Adicionados indices operacionais por conta, status, tutor, paciente, pacote, item e origem de consumo.
- O modulo `@cvg-his-v2/module-packages` passou a expor:
  - `PackageRepository`
  - `PackagesServiceOptions`
  - `DatabasePackageRepository`
  - `persistenceMode`
  - `hydrateFromDatabase(accountId)`
- As operacoes mutaveis de pacotes agora persistem quando um repositorio esta configurado:
  - criar pacote
  - adicionar item
  - ativar
  - consumir item
  - cancelar
  - renovar
- O runtime da API passou a aceitar `repositories.packages`.
- O bootstrap conecta `DatabasePackageRepository` quando as tres tabelas de pacotes existem.
- A inicializacao do runtime hidrata pacotes do banco no mesmo ciclo dos demais dominios comerciais.
- As rotas comerciais foram ajustadas para aguardar as operacoes assíncronas do servico.

## Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-packages build`
- `pnpm --filter @cvg-his-v2/module-packages test`
- `pnpm --filter @cvg-his-v2/api build`
- `node --test dist/routes/commercial-routes.test.js` em `apps/api`

Resultado: todos os comandos passaram.

## Observacoes tecnicas

- Os IDs internos de pacotes, itens e consumos continuam como `TEXT`, pois o modulo usa IDs gerados com prefixos como `pkg-*`, `pkg_item-*` e `pkg_cons-*`.
- As referencias de negocio para `account_id`, `owner_id`, `patient_id` e usuario permanecem como UUID, alinhadas ao schema canonico do banco.
- O bootstrap mantem fallback in-memory se as tabelas ainda nao estiverem aplicadas no ambiente.

## Proximo passo recomendado

Concluir F2-01 com validacao integrada de banco real para pacotes: aplicar migration em ambiente local/teste, exercitar criacao/ativacao/consumo/renovacao via API com rehidratacao apos restart e registrar evidencia no relatorio da Fase 2.
