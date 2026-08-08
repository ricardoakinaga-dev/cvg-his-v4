# Reauditoria funcional do ERP CVG-HIS V4

**Data:** 2026-07-11
**Escopo:** runtime local, SPA, API, worker, PostgreSQL, Redis, arquitetura, seguranca, testes e paridade Vetus
**Ambiente auditado:** `http://127.0.0.1:3112`, API `:3111`, worker `:3113`
**Nota global atual:** **58/100**
**Gate automatizado de paridade:** `0/11` dominios gerais e `0/3` jornadas clinicas verificados; esse resultado nao equivale a zero funcionalidade

## 1. Veredito executivo

O sistema evoluiu desde a auditoria anterior: login local, cadastro e vinculo tutor/animal, agendamento, internacao, cirurgia, ajuste de estoque e cobranca isolada puderam ser exercitados. Internacao e cirurgia foram relidas apos restart manual; um E2E posterior validou a massa persistida na UI. A API e o worker iniciam em modo `database`, Redis esta saudavel e o papel de runtime restrito passou na verificacao de RLS.

Ainda nao e correto afirmar que o CVG-HIS V4 entrega as mesmas funcionalidades operacionais do Vetus. O produto tem muitas superficies, mas os efeitos entre clinica, laboratorio, estoque, comanda, contas a receber e pagamento nao formam uma unica transacao confiavel. Ha tambem configuracoes volateis, caches que podem devolver dados removidos, contratos OpenAPI divergentes e poucos E2E diante de 194 paginas Vue e 47 arquivos de implementacao de rotas.

A nota global subiu de 46 para 58 porque os principais fluxos basicos agora executam e parte da persistencia foi corrigida. A prova formal de paridade permanece reprovada porque os gates nao verificam nenhuma jornada completa ate recebimento, estoque e auditoria.

## 2. Metodo e regua

A avaliacao combinou:

- execucao manual e automatizada no navegador;
- chamadas reais a API e consulta ao PostgreSQL;
- restart e verificacao de hidratacao;
- build, typecheck, lint, testes, cobertura, auditoria de dependencias e RLS;
- leitura direcionada de rotas, servicos, repositorios, UI e contratos;
- comparacao com a matriz Vetus mantida em `docs/vetus/`.

| Nota | Interpretacao |
|---:|---|
| 0-39 | Bloqueado, simulado ou insuficiente |
| 40-59 | Parcial, com risco alto |
| 60-79 | Utilizavel apenas em piloto controlado |
| 80-89 | Candidato a homologacao |
| 90-99 | Producao comprovada |
| 100 | Paridade integral homologada |

Uma tela ou endpoint isolado nao prova funcionalidade. Para receber nota de homologacao, o fluxo precisa concluir no navegador, persistir, sobreviver a restart, respeitar tenant/RBAC/RLS e possuir teste deterministico sem `skip`.

A nota global e a soma ponderada, arredondada, de cinco dimensoes: operacao funcional `61 x 35%`, continuidade e integracao `50 x 20%`, UX `60 x 15%`, testes `52 x 15%` e seguranca/runtime `64 x 15%`. Resultado: `57,75`, arredondado para **58**. As notas de cada modulo sao julgamentos tecnicos sustentados pelas evidencias descritas, nao uma media aritmetica independente.

## 3. Notas por item analisado

| Item | Nota | Resultado observado |
|---|---:|---|
| Produto integrado | **58** | Nucleo utilizavel, mas efeitos entre modulos ainda divergem |
| Login, sessao e MFA | **55** | Login funciona; rate limit e armazenamento de token precisam endurecimento |
| Tenant, RBAC e RLS | **79** | Papel restrito e RLS aprovados nas tabelas testadas; falta E2E multitenant integral |
| Tutor, animal e vinculos | **68** | CRUD e vinculo funcionam; UX e validacao de identidade ainda variam |
| Agenda e agendamento | **70** | Criacao/cancelamento funcionam; configuracoes continuam volateis |
| Check-in, esteira e handoff | **61** | Estrutura existe, sem prova completa de concorrencia e SLA |
| Atendimento e prontuario | **70** | Jornada clinica principal funciona parcialmente; salvamento estruturado nao e atomico |
| Receita, execucao e alta | **63** | Cobertura parcial; autorizacao e documento final nao estao homologados |
| Laboratorio e diagnosticos | **43** | Persistencia assicrona pode responder sucesso antes da gravacao |
| Internacao | **78** | Admissao, leito, DANI, evolucao e diaria foram observados; falta E2E clinico-financeiro completo |
| Cirurgia | **70** | Persistencia e transicoes existem; integracao com comanda/estoque nao foi comprovada |
| Comanda e venda de balcao | **44** | Fechamento nao e atomico entre venda, estoque e caixa |
| Billing e contas a receber | **43** | Cobranca quitada no detalhe nao apareceu na lista financeira |
| Estoque | **74** | Item e ajuste 10 para 8 funcionaram; atomicidade com venda/consumo permanece pendente |
| Caixa, cartao e PIX | **42** | Modelos fragmentados e captura de cartao com falha de isolamento por tenant |
| Fiscal e NFS-e | **34** | Sem provider e cenarios de rejeicao homologados ponta a ponta |
| Preventivo e vacinas | **38** | Superficie presente, prova operacional incompleta |
| Compras e transferencias | **46** | Implementacao fragmentada e sem ciclo integral comprovado |
| RH, folgas e comissoes | **36** | Regras e fechamento ainda pouco exercitados |
| Relatorios e exportacoes | **38** | Varias visoes vazias, desabilitadas ou sem entrega comprovada |
| Marketing e comunicacao | **30** | Consentimento, envio, retry e entrega nao formam fluxo homologado |
| Integracoes, webhook e importacao | **45** | Webhook tem base melhor; importacao Vetus e conectores seguem parciais |
| UX e arquitetura da informacao | **60** | Fluxos melhoraram, mas prontuario e paginas centrais seguem densos |
| Acessibilidade | **48** | Sem evidencia ampla de teclado, leitor de tela e contraste |
| Arquitetura e manutenibilidade | **58** | Bons dominios, mas arquivos gigantes, caches e fallbacks ampliam risco |
| Testes e gates | **52** | Build/lint/typecheck passam; cobertura e E2E possuem falhas |
| Seguranca da aplicacao | **55** | Captura de cartao, tokens, CSP e rate limit mantem o risco alto |
| Higiene de advisories nas dependencias de producao | **90** | `pnpm audit --prod` sem advisory conhecido; nao e prova completa de seguranca |
| Dependencias do workspace | **45** | Gate enterprise encontra 10 vulnerabilidades, incluindo 2 criticas |
| Runtime e observabilidade | **72** | Health checks bons; erros assicronos e caches dificultam confiabilidade |
| Aderencia funcional estimada ao Vetus | **56** | Ha modulos uteis, mas a continuidade operacional permanece parcial |
| Gate de prova da paridade | **0** | Zero fluxos verificados de 11 gerais e 3 clinicos; nao e percentual de aderencia |

## 4. Achados criticos e altos

### P0. Laboratorio confirma antes de persistir

`DiagnosticsService.createOrder()` e `recordResult()` atualizam `Map` e disparam persistencia sem aguardar. As rotas respondem imediatamente. Uma falha de banco pode produzir sucesso HTTP e dado perdido depois do restart.

**Evidencia:** `packages/modules/diagnostics/src/index.ts:112`, `:174`; `apps/api/src/routes/laboratory-routes.ts:546`, `:759`.

### P0. Fechamento de venda nao e transacional

O fechamento da venda de balcao encadeia baixa de estoque, caixa e estado da venda sem uma unica Unit of Work. Falha intermediaria permite estoque baixado com venda nao concluida, ou recebimento sem estado correspondente.

**Evidencia:** `packages/modules/counter-sales/src/index.ts:462`.

### P1. Financeiro possui fontes divergentes

Na execucao da auditoria, a cobranca `bill_mrh0tkma_4bl8b385`, ligada ao atendimento `086d68f5-3ff4-4663-863e-73dfbee9e902`, foi marcada como `settled` no detalhe por R$ 150, enquanto a lista `/billing` mostrou zero recebiveis e R$ 0. A massa foi removida na limpeza posterior. O caso precisa virar teste automatizado, mas ja evidencia que o fluxo clinico, billing, comanda e contas a receber nao possui um ledger canonico comprovado.

### P0. Captura de cartao nao prova propriedade do intent

A rota exige chave com `payments.manage`, mas chama `captureCardIntent(intentId)` antes de demonstrar que o intent pertence ao `accountId` da chave. O resultado e contabilizado no tenant autenticado, criando risco de captura cruzada.

**Evidencia:** `apps/api/src/routes/payments-routes.ts:392-403`; `apps/api/src/payment-gateway.ts:407`.

### P1. Delete pode responder antes da persistencia e manter cache obsoleto

O DELETE de atendimento respondeu `204`, o PostgreSQL removeu atendimento e billing por cascade, mas a API ainda devolveu a cobranca removida a partir do cache ate restart. Nao foi corrupcao referencial no banco; foi inconsistencia entre resposta, fila de persistencia e cache.

**Evidencia:** `apps/api/src/server.ts:4984`; `packages/modules/encounters/src/index.ts:354-368`.

### P1. Configuracao da agenda e volatil

Configuracoes operacionais de agenda usam `Map` em memoria. Reinicio da API pode descartar regras, recursos ou preferencias, mesmo com `persistenceMode: database` global.

**Evidencia:** `apps/api/src/routes/agenda-config-routes.ts:37-93`, `:157-228`.

### P1. Prontuario estruturado nao salva como unidade

A tela executa multiplas requisicoes sequenciais para compor o registro. Falha no meio gera prontuario parcialmente salvo, sem rollback ou idempotencia da operacao completa.

**Evidencia:** `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue:1484-1515`.

### P1. Modo database ainda admite fallbacks seletivos

O bootstrap decide repositorio por modulo e ainda permite componentes em memoria. O health global pode declarar banco ativo enquanto uma funcionalidade relevante permanece volatil.

**Evidencia:** `apps/api/src/bootstrap.ts:808-941`.

### P1. Tokens persistentes no navegador e CSP ausente

Access e refresh token ficam em `localStorage`. O nginx da SPA nao define Content Security Policy. Uma falha XSS teria acesso direto a ambos os tokens.

**Evidencia:** `apps/spa/src/stores/auth.ts:14-32`; `apps/spa/nginx.conf`.

### P1. Rate limit de login e contornavel e prejudica o operador

Aproximadamente dez logins durante os E2E bloquearam o usuario por cerca de tres minutos. No runtime local, onde o peer loopback e tratado como proxy confiavel, alterar `X-Forwarded-For` contornou o bloqueio. Em Docker, o risco precisa ser validado separadamente: sem proxy trust configuravel, clientes podem acabar compartilhando o IP do proxy. O controle precisa usar uma lista explicita de proxies confiaveis, IP normalizado, tenant e identidade, com armazenamento compartilhado.

### P1. Contrato OpenAPI diverge do runtime

O contrato de billing descreve estados como `pending/confirmed/cancelled/refunded`, enquanto API e UI exercitam `draft/estimated/open/settled`. Clientes gerados podem rejeitar respostas validas ou enviar transicoes invalidas.

## 5. Achados medios e estruturais

- anexos registram metadados, mas nao comprovam upload binario, validacao de MIME/extensao, antivirus e acesso seguro;
- erros de algumas consultas sao convertidos em listas vazias, confundindo falha com ausencia de dados;
- paginas clinicas exibem identificadores internos em vez de nomes em partes do fluxo;
- os gates de paridade estao desatualizados e ainda apontam lacunas ja corrigidas, portanto nem o `0/11` nem o score de evidencia podem ser usados isoladamente;
- existem 194 paginas Vue, 47 arquivos de implementacao de rotas, 37 arquivos de teste de rotas, 43 modulos e somente 18 specs E2E;
- `apps/api/src/server.ts` tem 6.893 linhas; `PatientDetailPage.vue` tem 3.640; `AppointmentsListPage.vue` tem 2.568; `MedicalRecordsDetailPage.vue` tem 2.272;
- o gate de cobertura nao inclui varias rotas e modulos criticos, reduzindo o valor do percentual global;
- a pagina de prontuario ainda concentra contexto longitudinal, episodio, formularios e comandos concorrentes, aumentando carga cognitiva.

## 6. Evidencias positivas reproduzidas

| Fluxo | Evidencia |
|---|---|
| Login local | `admin` autenticou antes do bloqueio provocado pela carga de testes |
| Tutor e animal | Cadastro persistiu e vinculo apareceu na UI |
| Agenda | Agendamento criado e cancelado |
| Internacao | Leito, DANI, evolucao, ocorrencia e diaria de R$ 180 exibidos |
| Cirurgia | Registro persistiu e aceitou transicoes de estado |
| Estoque | Saldo ajustado de 10 para 8 e movimento registrado |
| Billing isolado | Estimativa, item, abertura e liquidacao apareceram no detalhe |
| Runtime | API em modo database, Redis saudavel e worker `productionReady: true` |
| RLS | 117/117 verificacoes; sem acesso cross-tenant nas tabelas tenant-scoped testadas |

Esses resultados demonstram implementacao util, mas nao substituem a prova integrada `agenda -> atendimento -> diagnostico/receita -> comanda -> estoque -> recebimento -> auditoria`.

## 7. Gates executados

Snapshot executado em 2026-07-11 sobre o commit base `4d22088` com alteracoes locais ainda nao commitadas. Os comandos principais foram `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:coverage`, `pnpm audit --prod`, `pnpm security:enterprise`, `pnpm validate:rls`, `pnpm vetus:parity:audit` e `pnpm vetus:clinical-parity`. A rodada E2E combinada foi exploratoria e nao gerou artefato duravel, o que e uma lacuna de auditabilidade.

| Gate | Resultado |
|---|---|
| Build monorepo | Passou |
| Typecheck | Passou |
| Lint | Passou |
| `pnpm test` recursivo | Passou; API 230/230 e SPA 973/973, alem dos pacotes do workspace |
| Testes com cobertura | **Falhou:** 1.334/1.342 passaram, 8 falharam e houve 1 rejeicao nao tratada |
| Cobertura observada | 88,73% statements/lines; 80,34% branches; 91,85% functions |
| `pnpm audit --prod` | Passou, zero vulnerabilidades de producao |
| `pnpm security:enterprise` | **Falhou:** 10 vulnerabilidades no workspace (2 criticas, 3 altas, 3 moderadas, 2 baixas) |
| RLS | Passou, 117/117 |
| Papel `NOBYPASSRLS` | Passou nos testes de isolamento |
| Paridade Vetus geral | **Falhou:** `0/11` verificados; evidencia estrutural 85/100 |
| Paridade clinica | **Falhou:** `0/3` verificados; evidencia estrutural 87/100 |
| E2E combinado da auditoria | **Falhou:** 3 passaram e 9 falharam; maioria afetada por 429 e fixtures/selectores obsoletos |

As falhas de cobertura conhecidas estao em testes de MFA com assinatura antiga, inventario tratado como sincrono e temporizacao do retry do event bus. Corrigir apenas os testes nao resolve os riscos transacionais descritos acima.

## 8. Plano de correcao priorizado

### P0 - integridade operacional

1. Tornar diagnosticos assicronos de verdade: `await` no repositorio, rollback e resposta somente apos commit.
2. Criar Unit of Work para venda/comanda, estoque, caixa, recebivel e auditoria.
3. Unificar billing, comanda e contas a receber em um ledger canonico por atendimento.
4. Validar `accountId` do intent antes de captura, cancelamento ou conciliacao de pagamento.
5. Fazer DELETE aguardar commit e invalidar todos os caches dependentes antes do `204`.

### P1 - persistencia, contrato e seguranca

1. Persistir configuracao da agenda e remover fallback silencioso em modo database.
2. Criar endpoint transacional/idempotente para salvamento completo do prontuario.
3. Mover refresh token para cookie `HttpOnly`, aplicar CSP e reduzir exposicao do access token.
4. Corrigir rate limit com Redis, proxy confiavel, chave composta e testes de abuso.
5. Implementar anexos reais com streaming, limites, allowlist, checksum, antivirus e autorizacao.
6. Alinhar OpenAPI, tipos compartilhados e estados usados pela UI.

### P1 - prova de paridade

1. Atualizar os contratos de paridade para refletirem a arquitetura atual.
2. Criar dados deterministas e um E2E sem `skip` para a jornada completa ate recebimento.
3. Incluir restart, isolamento de tenant, concorrencia e falha intermediaria nos criterios.
4. Impedir release enquanto cobertura, enterprise security e os dois gates Vetus falharem.

### P2 - UX e manutencao

1. Redesenhar o prontuario como cockpit do episodio, com um CTA primario por estado.
2. Substituir IDs por nomes e transformar erros de carregamento em estados recuperaveis.
3. Decompor `server.ts` e as paginas acima de 2.000 linhas por dominio e fluxo.
4. Habilitar relatorios/exportacoes somente quando a fonte e o periodo forem auditaveis.
5. Cobrir teclado, foco, dialogos, contraste e leitor de tela nos fluxos criticos.

## 9. Criterios para elevar a nota

Para chegar a **80/100**, todos os P0 devem estar corrigidos, os gates automatizados precisam passar e pelo menos a jornada clinica principal deve sobreviver a restart e falhas intermediarias.

Para chegar a **90/100**, os 11 dominios de paridade devem possuir E2E deterministico, tenant/RBAC/RLS comprovados, providers financeiro/fiscal homologados e operacao observada em ambiente equivalente a producao.

Uma garantia de equivalencia com o Vetus so pode ser emitida com **11/11 dominios e 3/3 jornadas clinicas verificados**, sem `skip`, fallback em memoria ou divergencia financeira.
