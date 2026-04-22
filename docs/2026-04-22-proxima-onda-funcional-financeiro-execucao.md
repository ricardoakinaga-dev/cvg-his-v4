# Próxima onda funcional do Financeiro — plano executável

Data: 2026-04-22
Contexto: shell Vetus-aligned congelado como baseline visual
Domínio priorizado: `Financeiro`
Trilha escolhida: `Custos e Despesas + Centros de Custo`

## Decisão
A próxima onda funcional concreta não abre um novo domínio nem volta ao shell.

A trilha escolhida é:
- consolidar operacionalmente `Custos e Despesas + Centros de Custo`
- fechar a transição do runtime DB-backed
- e preparar a reabertura posterior de `Cartões`

## Por que esta trilha foi escolhida
Hoje o subdomínio já possui:
- SPA funcional com CRUD real;
- backend dedicado;
- persistência DB-backed ativada no runtime;
- contratos HTTP estáveis;
- testes focados já existentes;
- integração direta entre despesas e centros de custo.

Ou seja: esta é a frente com melhor continuidade e menor retrabalho estrutural.

## Objetivo da onda
Transformar a trilha atual de catálogo financeiro em uma base gerencial mais madura, reduzindo ambiguidades operacionais e deixando o domínio pronto para suportar a próxima expansão funcional.

## Escopo recomendado desta onda

### Frente A — consolidar o runtime DB-backed
Objetivo:
- decidir e materializar a política final do runtime para o subdomínio.

Itens:
1. explicitar a política `DB-first` do catálogo financeiro
2. decidir se o fallback file-backed continua:
   - como contingência controlada
   - ou se vira fail-fast em ambiente com banco
3. tornar essa política legível no código e nos erros operacionais
4. validar que `ExpensesPage` e `CostCentersPage` operam de forma inequívoca no caminho DB-backed

Arquivos-alvo principais:
- `apps/api/src/routes/expenses-catalog-routes.ts`
- `apps/api/src/repositories/database-finance-catalog.repository.ts`
- `apps/api/src/routes/expenses-catalog-store.ts`
- docs da fase

### Frente B — auditoria/observabilidade funcional do domínio
Objetivo:
- deixar o domínio auditável e legível para operação real.

Itens:
1. enriquecer payloads de auditoria para create/update/delete de despesas e centros
2. padronizar melhor os `diffSummary`
3. registrar contexto suficiente para leitura operacional posterior
4. se viável, abrir um caminho inicial de consulta/listagem desses eventos do domínio

Arquivos-alvo principais:
- `apps/api/src/routes/expenses-catalog-routes.ts`
- `apps/api/src/repositories/database-finance-catalog.repository.ts`
- `apps/api/src/helpers/audit-helper.ts`
- testes focados da rota

### Frente C — filtros e operação gerencial no front
Objetivo:
- tornar o front menos “cadastro técnico” e mais painel gerencial-operacional.

Itens:
1. melhorar filtros em `ExpensesPage`
   - combinar `id`, `nome`, `categoria`, `centro`, `descrição` com comportamento previsível
2. abrir ordenação mais explícita no front
3. melhorar feedback de paginação e estado vazio
4. alinhar `CostCentersPage` ao mesmo padrão operacional

Arquivos-alvo principais:
- `apps/spa/src/pages/finance/ExpensesPage.vue`
- `apps/spa/src/pages/finance/CostCentersPage.vue`
- `apps/spa/src/services/expensesCatalog.ts`
- `apps/spa/src/services/costCentersCatalog.ts`
- testes de página

## O que fica explicitamente fora desta onda
Não entra agora:
- nova rodada ampla de shell/navbar/topbar;
- expansão para outro macrodomínio;
- reabertura de `Cartões` antes de consolidar esta trilha;
- refatorações cosméticas sem ganho operacional.

## Sequência de execução sugerida

### Passo 1
Inspecionar e decidir a política final do runtime:
- fallback híbrido controlado
- ou fail-fast com banco obrigatório

### Passo 2
Escrever os testes RED da frente escolhida
Prioridade técnica:
- primeiro API
- depois SPA

### Passo 3
Implementar o ajuste no backend
- política de runtime
- auditoria mais rica
- mensagens/erros mais explícitos

### Passo 4
Implementar o ajuste no front
- filtros/ordenação/feedback
- operação de página mais madura

### Passo 5
Validar
API:
- teste focado da rota

SPA:
- `ExpensesPage.test.ts`
- `CostCentersPage.test.ts`
- regressão financeira focada

### Passo 6
Documentar a onda
Salvar novo checkpoint funcional em `/root/cvg-his-v2/docs`

## Critério de sucesso desta onda
A onda estará concluída quando:
1. a política do runtime do catálogo financeiro estiver explícita e validada
2. o subdomínio estiver mais auditável e legível
3. o front financeiro estiver mais gerencial e menos apenas cadastral
4. os testes focados e a regressão representativa seguirem verdes
5. a próxima frente (`Cartões`) ficar pronta para ser reaberta sem dúvidas estruturais

## Próximo passo após esta onda
Depois desta consolidação, a próxima frente recomendada passa a ser:
- `Financeiro > Cartões`

com foco em:
- filtros por provider/status/bandeira
- reconciliação operacional
- leitura mais rica do fluxo de cartão
- conexão mais clara com recebíveis
