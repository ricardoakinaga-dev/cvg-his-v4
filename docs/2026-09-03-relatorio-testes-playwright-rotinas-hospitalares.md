# Relatório de testes Playwright das rotinas hospitalares

Data da execução: 03/09/2026  
Ambiente: local, Chromium 145.0.7632.6, Playwright 1.58.2, locale `pt-BR`, fuso `America/Sao_Paulo`  
Estado do código: workspace com alterações não commitadas (`workspace-uncommitted`)

## 1. Resultado executivo

Foram inventariados **404 casos Playwright em 33 arquivos**. Todos os corpos de teste foram chamados: 394 rodaram na execução padrão, os 7 inicialmente ignorados foram forçados no modo de banco e os 3 exclusivos de PostgreSQL foram executados separadamente. A rodada de banco teve 12 casos porque também repetiu 2 testes não condicionais do mesmo arquivo.

| Recorte                                              | Aprovados | Falhos | Ignorados | Total | Resultado                       |
| ---------------------------------------------------- | --------: | -----: | --------: | ----: | ------------------------------- |
| Jornadas hospitalares criadas para esta validação    |         5 |      0 |         0 |     5 | Aprovado                        |
| Suíte Playwright padrão completa                     |       374 |     20 |         7 |   401 | Reprovado globalmente           |
| Rodada forçada de banco, incluindo 2 casos repetidos |         2 |     10 |         0 |    12 | Bloqueada pela infraestrutura   |
| Inventário único, com todos os corpos tentados       |       374 |     30 |         0 |   404 | Executado/tentado integralmente |

As cinco rotinas solicitadas — recepção, clínica médica, patologia, ultrassonografia e administração — passaram de ponta a ponta. O produto, entretanto, **não pode ser certificado globalmente** nesta máquina: o PostgreSQL de teste em `127.0.0.1:5433` não estava disponível, há duas falhas funcionais em testes legados, 14 diferenças de snapshots visuais e um gate de usabilidade reprovado.

Os 10 casos únicos dependentes de banco foram realmente iniciados. A API tentou conectar três vezes, recebeu `ECONNREFUSED`, entrou em modo `in-memory` e os cenários falharam por ausência das fixtures e fronteiras persistidas. Eles não foram classificados como aprovados nem deixados apenas como ignorados.

## 2. Rotinas simuladas por função

O arquivo `e2e/spa/hospital-personas-routines.spec.ts` contém cinco jornadas independentes, com autenticação real, navegação pela SPA, mutações pela interface e verificações da API quando necessárias para provar estado, RBAC ou isolamento.

### 2.1 Recepcionista — aprovado

- login com perfil de recepção;
- cadastro de novo tutor pela interface;
- cadastro e vínculo de novo animal pela interface;
- agendamento de uma consulta e de um exame;
- localização do paciente na recepção;
- check-in, entrada na fila e triagem na esteira de atendimento;
- abertura de comanda;
- inclusão de consulta e exame na comanda;
- recebimento integral e fechamento;
- conferência do recibo e do saldo liquidado.

### 2.2 Veterinário da clínica médica — aprovado

- login com perfil veterinário;
- abertura do prontuário do atendimento;
- conferência do animal, tutor e histórico;
- registro de anamnese/evolução clínica;
- criação de prescrição medicamentosa;
- impressão da prescrição;
- impressão do prontuário;
- consulta a exames e anexos existentes;
- criação de orçamento para o tutor;
- inclusão de item, pré-visualização e aprovação do orçamento.

### 2.3 Patologista veterinário — aprovado

- criação de usuário e vínculo profissional ativo;
- login do patologista;
- cadastro de equipamento laboratorial;
- cadastro de três analitos/enzimas e suas faixas de referência;
- cadastro do tipo de laudo;
- entrada do pedido na esteira laboratorial;
- coleta, início da análise e lançamento do resultado;
- liberação do laudo com assinatura vinculada ao profissional autenticado.

### 2.4 Ultrassonografista veterinário — aprovado

- criação de usuário e vínculo profissional ativo;
- login do ultrassonografista;
- criação do modelo/tipo de laudo;
- criação da solicitação diagnóstica;
- lançamento de achados e conclusão ultrassonográfica;
- inclusão de anexo do exame;
- conferência na lista de resultados;
- abertura da versão imprimível do laudo.

### 2.5 Administrador hospitalar — aprovado

- cadastro de usuários para médico-veterinário, ultrassonografista e parceiro;
- criação de grupo/perfil customizado;
- criação de equipe/setor hospitalar;
- concessão de permissão de leitura diagnóstica ao grupo;
- associação do parceiro ao perfil;
- prova da permissão efetiva de leitura;
- prova da ausência de permissão de gestão;
- confirmação de que o parceiro pode consultar laboratório e recebe `403` ao tentar uma mutação não autorizada.

O `403` final é uma negação deliberada e aprovada: demonstra que o perfil customizado não ganha escrita por herança indevida.

## 3. Problemas encontrados e correções aplicadas

As correções abaixo foram necessárias para que as jornadas reais concluíssem sem atalhos inseguros:

1. **Formulários que não enviavam ao clicar no botão.** Os botões de salvar prescrição, registrar pedido diagnóstico, enviar resultado e criar/adicionar item de orçamento agora declaram `type="submit"`.
2. **Pedido diagnóstico com identificador incompatível.** Um tipo de laudo recém-criado era enviado também como `examCatalogId`, embora não fosse um item do catálogo de exames. O payload agora usa o tipo textual correto e não produz o erro `Unknown catalog entry`.
3. **Assinatura técnica fornecida pelo navegador.** O cliente podia mandar um `signedByUserId` livre. A SPA agora informa que a assinatura é automática e a API deriva o assinante da identidade autenticada, exigindo usuário humano ativo, colaborador ativo e profissão ativa.
4. **Assinatura laboratorial impossível no modo local.** O runtime em memória não possuía uma autoridade válida de assinante e rejeitava qualquer laudo. Foi adicionada a mesma verificação de usuário/colaborador/profissão usada como fronteira segura, com delegação ao repositório quando ele existe.
5. **Impressão de prontuário sem entrada visível.** A página do paciente recebeu o botão `Imprimir prontuário`, ligado à rotina de impressão já existente.
6. **Cobertura automatizada.** Foram ajustados os testes unitários dos payloads diagnóstico e laboratorial e criada a nova suíte de personas.

Arquivos funcionais diretamente envolvidos:

- `apps/api/src/runtime.ts`;
- `apps/spa/src/pages/patients/PatientDetailPage.vue`;
- `apps/spa/src/pages/clinical/PrescriptionsPage.vue`;
- `apps/spa/src/pages/clinical/DiagnosticsPage.vue`;
- `apps/spa/src/pages/laboratory/LaboratoryOrdersPage.vue`;
- `apps/spa/src/pages/sales/QuotesPage.vue`;
- `apps/spa/src/pages/clinical/__tests__/DiagnosticsPage.test.ts`;
- `apps/spa/src/pages/laboratory/__tests__/LaboratoryOrdersPage.test.ts`;
- `e2e/spa/hospital-personas-routines.spec.ts`.

## 4. Execuções realizadas

### 4.1 Jornada focada por personas

```text
pnpm exec playwright test e2e/spa/hospital-personas-routines.spec.ts --config playwright-spa.config.ts
```

Resultado: **5 aprovados, 0 falhos, 0 ignorados**, em 39,9 segundos.

A mesma suíte entrou depois na execução global e voltou a obter **5/5 aprovações**.

### 4.2 Inventário Playwright

```text
E2E_DATABASE_MODE=1 pnpm exec playwright test --config playwright-spa.config.ts --list
```

Resultado: **404 testes, 33 arquivos**.

```text
pnpm exec playwright test --config playwright-spa.config.ts --list
```

Resultado sem os arquivos exclusivos de banco: **401 testes, 31 arquivos**.

### 4.3 Suíte padrão completa

```text
pnpm exec playwright test --config playwright-spa.config.ts
```

Resultado em 12,8 minutos:

- **374 aprovados**;
- **20 falhos**;
- **7 ignorados**;
- **0 instáveis/flaky**;
- **401 total**.

Taxa bruta de aprovação: **93,27%**. Considerando apenas os 394 testes não ignorados: **94,92%**.

### 4.4 Rodada forçada dos testes dependentes de PostgreSQL

```text
E2E_DATABASE_MODE=1 pnpm exec playwright test \
  e2e/spa/access-role-matrix-db.spec.ts \
  e2e/spa/tenant-isolation-db.spec.ts \
  e2e/spa/finance-operational-catalog.spec.ts \
  e2e/spa/inventory-invoices-report-flow.spec.ts \
  e2e/spa/inventory-movements-report-flow.spec.ts \
  e2e/spa/inventory-products-report-flow.spec.ts \
  e2e/spa/inventory-stock-report-flow.spec.ts \
  e2e/spa/report-registration-exports.spec.ts \
  e2e/spa/service-invoices-report-flow.spec.ts \
  --config playwright-spa.config.ts --reporter=list
```

Resultado: **2 aprovados e 10 falhos por indisponibilidade do banco**, em 51,4 segundos. Os dois aprovados são testes de exportação de clientes e pacientes que já haviam passado na rodada padrão e foram repetidos porque compartilham o arquivo com o caso persistente de serviços.

- matriz RBAC de sete perfis: `/flags` retornou 500 em vez de 200 após `ECONNREFUSED` no PostgreSQL;
- isolamento entre dois tenants: login da fixture retornou 401 em vez de 200 porque a base/seed não foi carregada;
- papel/tenant e trilha LGPD: mesmo bloqueio de fixture persistida, 401 em vez de 200.
- catálogo financeiro operacional: criação retornou 503 em vez de 201;
- quatro relatórios de estoque: as fixtures falharam diretamente em `pool.query` com `ECONNREFUSED`;
- cadastro de serviços: a fronteira persistida/limpeza falhou com `ECONNREFUSED`;
- NFS-e: a inclusão da fixture persistida falhou com `ECONNREFUSED`.

### 4.5 Builds e testes unitários

| Validação                                | Resultado                               |
| ---------------------------------------- | --------------------------------------- |
| Build SPA                                | Aprovado                                |
| Build API                                | Aprovado                                |
| Testes unitários SPA                     | **1.063/1.063 aprovados**, 178 arquivos |
| Testes unitários API                     | **544/544 aprovados**                   |
| Testes unitários focados após os ajustes | **9/9 aprovados**                       |

## 5. Detalhamento das 20 falhas da suíte padrão

### 5.1 Fluxos funcionais legados — 2

1. `appointment-flow.spec.ts`: o teste procura o `tablist` acessível chamado “Modo da agenda”, mas o elemento não existe na superfície atual após 10 segundos.
2. `billing-flow.spec.ts`: após confirmar o recebimento, o teste não encontrou o saldo `R$ 0,00` dentro de 15 segundos. O log da execução também registrou uma chamada `POST` com 404 nesse fluxo; o trace deve ser usado para determinar se a causa é rota obsoleta ou atualização incompleta da tela.

Essas falhas não ocorreram na nova jornada da recepcionista: nela, a agenda, a comanda e a liquidação foram validadas com o contrato atual. Isso indica divergência entre os testes legados/superfícies e o fluxo atual, mas não autoriza simplesmente apagar as asserções antigas.

### 5.2 Dependência de fonte persistida — 3

1. relatório de vendas/comandas canceladas não recebeu `reportId` porque a fonte persistida não estava disponível;
2. exportação CSV do workbench de agenda expirou aguardando download após o backend recusar o relatório sem fonte de banco;
3. exportação CSV do workbench de estoque expirou pelo mesmo motivo.

### 5.3 Gate consolidado de usabilidade — 1

O gate foi reprovado depois de coletar todas as 286 navegações. O detalhamento está na seção 7.

### 5.4 Regressão visual — 14

Os snapshots não foram atualizados automaticamente, pois isso apagaria a evidência sem revisão humana. As diferenças são:

- listas: agenda Kanban e faturamento;
- detalhes: tutor, paciente, atendimento e faturamento;
- desktop escuro: paciente, atendimento, prontuário, agenda Kanban, recepção e fila;
- mobile claro: agenda Kanban;
- mobile escuro: agenda Kanban.

As imagens esperadas, atuais e de diferença da bateria principal foram incorporadas aos arquivos `data/` do relatório HTML para decisão visual. A execução posterior dos testes de banco renovou `test-results/`, que agora conserva os traces dessa segunda rodada.

## 6. Sete testes ignorados na execução sem banco

Todos exigem uma fonte PostgreSQL real e possuem guarda condicional explícita:

1. catálogo financeiro operacional: CRUD pela SPA, isolamento, RBAC e auditoria;
2. relatório de entrada de notas/compras persistidas;
3. relatório de movimentações de estoque persistidas;
4. relatório de produtos persistidos;
5. relatório de posição de estoque persistida;
6. exportação de cadastro de serviços usando PostgreSQL;
7. relatório de notas/documentos de serviço persistidos.

Esses sete casos não fazem parte dos três casos exclusivos de banco: permanecem no inventário padrão e são marcados como ignorados quando a infraestrutura persistida não está disponível. Todos foram executados novamente com `E2E_DATABASE_MODE=1`; os sete corpos rodaram e falharam na dependência de PostgreSQL. Assim, não restou nenhum caso do inventário apenas descoberto ou pulado.

## 7. Auditoria master de desktop e mobile

Foram auditadas **143 rotas em dois viewports**, totalizando **286 navegações**:

| Viewport         | Navegações | Sem achados | Com achados |
| ---------------- | ---------: | ----------: | ----------: |
| Desktop 1440×900 |        143 |         101 |          42 |
| Mobile 390×844   |        143 |         106 |          37 |
| Total            |        286 |         207 |          79 |

### 7.1 Achados de interface

- 13 alvos interativos abaixo de 24×24 px, distribuídos em `/queue` (2), `/vaccines-dewormers` (2), `/medical-records` (3) e `/laboratory/orders` (6), todos no desktop;
- overflow horizontal global de 57 px em `/reports/audit/appointments` no desktop;
- nenhuma exceção JavaScript de página foi registrada nessa coleta.

### 7.2 Respostas HTTP inesperadas

Houve **74 registros de rota com erro HTTP**, correspondentes a 37 superfícies repetidas em desktop e mobile. A concentração por endpoint foi:

| Endpoint/estado                             | Ocorrências |
| ------------------------------------------- | ----------: |
| `500 /api/reports/administrative-hubs`      |          22 |
| `400 /api/reports/executions`               |          20 |
| `503 /api/expenses-catalog`                 |           8 |
| `500 /api/reports/executions`               |           2 |
| `503 /api/warehouses`                       |           2 |
| `503 /api/manufacturers`                    |           2 |
| `503 /api/product-groups`                   |           2 |
| `503 /api/company-sectors`                  |           2 |
| `503 /api/measurement-units`                |           2 |
| `503 /api/finance/advance-payments`         |           2 |
| `503 /api/finance/catalogs/split-rules`     |           2 |
| `503 /api/finance/catalogs/card-machines`   |           2 |
| `503 /api/finance/catalogs/payment-methods` |           2 |
| `503 /api/cost-centers-catalog`             |           2 |
| `503 /api/finance/catalogs/banks`           |           2 |

Os erros de relatórios, fiscal, estoque e catálogos são coerentes com o modo degradado: esses contratos falham de forma fechada quando não existe repositório canônico de banco. Mesmo assim, o gate os contabiliza corretamente como defeitos operacionais visíveis e, por isso, o resultado global permanece reprovado.

## 8. Evidências preservadas

- relatório HTML Playwright: `playwright-report/usability/index.html`;
- resultado estruturado integral da suíte de 401 casos: `playwright-report/usability/results.json`;
- anexos, traces, vídeos, screenshots e diffs da suíte principal: `playwright-report/usability/data/` (125 arquivos no relatório completo);
- traces, vídeos e screenshots da rodada forçada de 12 testes de banco: `test-results/`;
- coleta bruta da auditoria de 286 navegações: `tmp/master-usability-audit.json`;
- suíte das cinco funções: `e2e/spa/hospital-personas-routines.spec.ts`.

O relatório JSON principal foi preservado ao executar a rodada de 12 testes em modo de banco com `--reporter=list`, evitando que a segunda execução sobrescrevesse os resultados da bateria de 401 casos.

## 9. Limitações da validação

1. **Sem PostgreSQL:** os testes foram tentados, mas não foi possível validar com sucesso persistência após reinício, RLS real, seeds multi-tenant e relatórios que exigem fontes canônicas.
2. **Modo em memória:** os dados criados pelas jornadas foram efêmeros e não alteraram uma base hospitalar real.
3. **Um navegador:** a configuração fornecida executa Chromium; Firefox e WebKit não fazem parte deste inventário.
4. **Snapshots pendentes:** as 14 diferenças precisam ser revisadas visualmente antes de aceitar ou rejeitar novas imagens-base.
5. **Ambiente não limpo:** o SHA foi registrado como `workspace-uncommitted`; a repetição de certificação deve fixar um commit.

## 10. Prioridades recomendadas

1. Subir o PostgreSQL de teste na porta 5433, executar migrações/seeds e repetir os 3 testes exclusivos, os 7 condicionais e os relatórios enterprise.
2. Investigar o `POST 404`/saldo não atualizado do fluxo legado de faturamento usando o trace gravado.
3. Alinhar o contrato acessível do modo de agenda ou atualizar o teste somente depois de confirmar a decisão de UX.
4. Revisar os 14 diffs visuais; atualizar snapshots apenas quando cada mudança for considerada intencional.
5. Corrigir os 13 alvos pequenos e o overflow de 57 px.
6. Reexecutar a suíte completa em um commit fixo e só então promover o gate para certificação de produção.

## 11. Conclusão

As rotinas operacionais solicitadas foram implementadas como automação Playwright e passaram: **5/5 jornadas hospitalares completas**. A bateria ampliada realmente executou centenas de cenários e revelou **374 aprovados, 20 falhos e 7 inicialmente ignorados** na configuração padrão. Os 7 ignorados e os 3 exclusivos foram depois forçados; os **10 falharam pela infraestrutura PostgreSQL**, deixando todos os 404 corpos de teste efetivamente tentados. Builds e **1.607 testes unitários** passaram integralmente.

Portanto, há evidência positiva para as cinco rotinas em modo local, mas ainda não há evidência suficiente para declarar o sistema integralmente aprovado com persistência de produção.
