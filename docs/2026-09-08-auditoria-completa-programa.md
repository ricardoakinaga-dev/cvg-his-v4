---
document_status: historical
document_kind: audit
effective_date: 2026-09-08
owner: Engenharia
review_cycle: snapshot
---

# Auditoria técnica do CVG-HIS V4 — 08/09/2026

## 1. Parecer executivo

**Nota geral: 70,7/100.** O programa apresenta uma base funcional ampla, testes numerosos e controles relevantes de autenticação, isolamento e transações. A manutenção de arquivos muito grandes, lacunas da cobertura, uma inconsistência de governança comprovada por teste e fragilidades nas imagens e nos logs impedem uma avaliação de excelência.

**Parecer: base técnica consistente, com correções prioritárias e comprovação integrada ainda necessária. Esta auditoria não aprova uma publicação em produção.** A média não neutraliza os achados de segurança ou o teste que falhou.

Principais resultados desta execução:

- SPA: **210 arquivos e 1.834 testes aprovados**.
- API: **576 testes aprovados**, sem falhas ou skips reportados pelo runner.
- Suíte central: **2.452 testes aprovados, 1 falhou e 1 foi ignorado**, em 225 arquivos (223 aprovados, 1 falhou, 1 ignorado).
- Worker: **11 invocações de arquivos aprovadas**; cada invocação reporta um teste de arquivo. Não confundir esse número com todas as asserções internas.
- Typecheck do monorepo e build da SPA aprovados.
- Contrato OpenAPI: **414 paths, 40 tags e 518 schemas**, aprovado pelo validador estrutural.
- Análise estática das migrations: **168 de 169 tabelas tenant protegidas e uma exceção documentada**. Isso não equivale a executar RLS em PostgreSQL.
- Prova sintética confirmou ausência de redação de campos sensíveis no logger compartilhado.

## 2. Escopo, método e limites

Auditoria do estado local em `/home/ricardo/cvg-his-v4`, com HEAD `a48d76a1835766da353f6c9618cf91d5c0fe6f87`, em 08/09/2026, fuso America/Sao_Paulo. Ambiente: Node **24.20.0**, pnpm **10.0.0**; o CI e as imagens declaram Node 22. A execução local não substitui a validação nessa versão.

Foram identificados **45 módulos de negócio**, **939 arquivos de fonte TS/Vue** e **411 arquivos de testes TS em apps/packages**, além de **168 arquivos SQL** em migrations. A contagem de arquivos de testes não inclui os diretórios raiz `tests` e `e2e` nem equivale ao número de casos executados. Existem também 67 manifests de pacotes em apps/packages.

A inspeção combinou inventário amplo, leitura dirigida de fronteiras críticas, execução de testes e verificações do próprio repositório. Foram examinados API/server, autenticação, contexto tenant, unidade transacional, migrações, pagamentos, eventos, worker, cliente HTTP, autenticação frontend, foco, formulários, modal, PWA, logging, configuração de deploy e CI.

Havia centenas de alterações locais anteriores à auditoria: o inventário intermediário registrou **636 entradas no status Git**. O SHA identifica a base, não o conteúdo completo auditado. A avaliação inclui arquivos modificados e ainda não versionados. O código de negócio não foi corrigido nesta tarefa; builds e testes geraram artefatos locais. Este documento é um snapshot e não substitui os planos e critérios canônicos.

Classificação do trabalho: auditoria brownfield, inspeção e verificação, sem implementação funcional. Critério de conclusão desta tarefa: relatório com notas, evidências, prioridades e limites; não a resolução dos defeitos encontrados. A revisão foi feita por um único agente, com releitura final; não houve revisão humana ou independente.

**Não executado nesta auditoria:** E2E de navegador até PostgreSQL, suíte crítica com banco, testes de carga k6, restauração real de backup, rollout em cluster, integrações externas homologadas, scanner remoto de vulnerabilidades/CVEs, pentest e avaliação manual com leitor de tela. Nenhum desses itens recebeu aprovação implícita. Não foram consultados ambientes de produção nem dados reais. A avaliação de privacidade é técnica, sem certificação jurídica.

## 3. Critérios e notas por item

Cada item recebe quatro parcelas de **0 a 25**: **I** = implementação e abrangência; **E** = evidência disponível, favorecendo execução atual; **M** = manutenção e consistência; **O** = preparo operacional. A soma resulta em 0–100. As notas são julgamento técnico fundamentado, não uma medição matemática de confiabilidade ou percentual de requisitos entregues.

Faixas: 90–100 excelente e amplamente comprovado; 80–89 sólido com lacunas; 70–79 bom com pendências relevantes; 60–69 regular; 40–59 frágil; 0–39 insuficiente. A nota geral é a média aritmética, com o mesmo peso para os 21 itens, arredondada a uma casa decimal.

| ID | Item analisado | I/25 | E/25 | M/25 | O/25 | Nota |
|---|---|---:|---:|---:|---:|---:|
| 01 | Arquitetura e modularização | 22 | 19 | 12 | 17 | **70/100** |
| 02 | Manutenibilidade e complexidade | 18 | 18 | 8 | 14 | **58/100** |
| 03 | Tipagem e build | 24 | 24 | 19 | 19 | **86/100** |
| 04 | Análise estática e lint | 14 | 18 | 13 | 15 | **60/100** |
| 05 | Contratos e validação da API | 23 | 23 | 19 | 19 | **84/100** |
| 06 | Autenticação e autorização | 23 | 22 | 18 | 18 | **81/100** |
| 07 | Isolamento entre clientes (RLS) | 24 | 18 | 20 | 19 | **81/100** |
| 08 | Transações, idempotência e integridade | 24 | 19 | 18 | 18 | **79/100** |
| 09 | Migrações e evolução do banco | 21 | 17 | 16 | 13 | **67/100** |
| 10 | Segredos e proteção de logs | 17 | 17 | 13 | 12 | **59/100** |
| 11 | Privacidade e ciclo de dados | 20 | 16 | 17 | 12 | **65/100** |
| 12 | Testes de domínio e API | 24 | 22 | 19 | 18 | **83/100** |
| 13 | Cobertura e evidência integrada | 18 | 13 | 14 | 13 | **58/100** |
| 14 | Frontend e fluxos de uso | 23 | 23 | 15 | 17 | **78/100** |
| 15 | Acessibilidade e responsividade | 21 | 18 | 18 | 14 | **71/100** |
| 16 | Desempenho e escalabilidade | 20 | 12 | 16 | 14 | **62/100** |
| 17 | Worker, eventos e integrações | 23 | 21 | 18 | 17 | **79/100** |
| 18 | Observabilidade e diagnóstico | 22 | 17 | 17 | 16 | **72/100** |
| 19 | CI/CD, contêineres e cadeia de dependências | 17 | 17 | 13 | 12 | **59/100** |
| 20 | Backup, recuperação e operação | 22 | 13 | 17 | 15 | **67/100** |
| 21 | Documentação e governança | 22 | 15 | 14 | 15 | **66/100** |

### Justificativas por item

1. **Arquitetura:** separação API/SPA/worker, pacotes compartilhados e módulos com repositórios; o guardrail de namespaces passou. A composição ainda concentra regras e coordenação demais em `apps/api/src/server.ts`.
2. **Manutenibilidade:** manifesto de hotspots com responsáveis e plano de decomposição, porém o servidor tem **8.333 linhas**, a página de paciente **4.075**, vendas **3.468**, prontuário **3.329** e workbench de relatórios **3.142**. O guardrail aprova limites que ainda permitem alta concentração.
3. **Tipagem/build:** typecheck aprovado; API e worker compilados por seus scripts de testes; SPA compilada e empacotada. Não foi feito build de imagens nem execução de `pnpm build` completo como comando único.
4. **Lint:** em 67 manifests, **54 scripts usam apenas `tsc --noEmit`**, um usa só `vue-tsc`, um combina ambos, dois declaram ESLint e nove não possuem lint. Tipagem não comprova regras de complexidade, imports ou padrões perigosos. O comando global lint não foi repetido, pois majoritariamente duplicaria a checagem de tipos.
5. **API/contratos:** OpenAPI estrutural aprovado e testes HTTP amplos. `request-boundaries.ts` valida booleano de arquivamento; existem fronteiras de autorização e idempotência. Não foi validada nesta sessão a equivalência de todas as respostas reais com todos os schemas.
6. **Autenticação/autorização:** sessões, MFA/brute force, assinatura com HMAC e comparação constante; refresh mantido fora do armazenamento JS, cookies e verificações de origem. API aprovada no escopo do runner. Falta prova atual de matriz completa de perfis no banco/alvo.
7. **RLS:** cobertura estática forte, papéis distintos de API/worker no Compose e contexto transacional. O validador lê SQL; não observa o usuário efetivo ou as políticas instaladas em um banco real.
8. **Integridade:** unidade de trabalho reúne transação, contexto tenant, auditoria, inbox/outbox e idempotência com hash e bloqueio. Testes de domínio são positivos. Rollback, concorrência e reinício com persistência real não foram exercitados nesta sessão.
9. **Migrações:** trilha canônica e validação de checksum são boas proteções; entretanto a migration 0162 está editada em relação ao HEAD. Se já aplicada, a nova versão será rejeitada pelo próprio controle de integridade.
10. **Segredos/logs:** secretlint aprovado, porém isso não examina redação em runtime. A reprodução do logger confirmou campos e mensagens sem mascaramento; este é um achado prioritário.
11. **Privacidade:** existem consentimento, solicitações de titulares, exportação por providers e metadados de retenção em `packages/modules/lgpd/src/service.ts`. Não se comprovou execução completa de retenção/eliminação em todos os destinos, backups e integrações.
12. **Testes de domínio/API:** milhares de casos atuais passaram, incluindo sessões, fronteiras e regras de negócio. A falha de governança mantém a suíte central vermelha, e um teste permanece ignorado.
13. **Cobertura integrada:** limiar declarado de 82% em quatro dimensões, mas com muitas exclusões. Não foi medida cobertura nesta sessão. O número declarado não representa todo o produto e não demonstra a jornada clínica-financeira persistida.
14. **Frontend:** SPA passa integralmente nos testes locais; cliente HTTP possui timeout, tratamento de sessão, invalidação de cache e identificação de mutações; formulários têm proteção contra saída com alterações. Páginas extensas elevam o custo de evolução. Usabilidade real não é inferida só do jsdom.
15. **Acessibilidade:** modal com semântica, Escape e gerenciamento de foco; composables cuidam de restauração de foco e navegação. Há specs de acessibilidade. Não houve inspeção visual de navegador nem validação manual nesta auditoria; nota expressa suporte técnico, não certificação WCAG.
16. **Desempenho:** build separa chunks e existe infraestrutura k6/SLO. O precache gerado contém **487 entradas / 3.264 KiB**; isso é custo de assets, não tempo de carregamento medido. Não há novo p95, throughput, Web Vitals ou análise de query plans nesta execução.
17. **Worker/integrações:** testes locais aprovados; eventos contam com leases, renovação e quarentena para metadados tenant inválidos, exercitados na suíte central. Relatórios e pagamentos possuem caminhos próprios. Entrega externa, duplicidade e recuperação entre processos reais seguem sem validação atual.
18. **Observabilidade:** logs estruturados, IDs de correlação, métricas, tracing, health/ready e configuração Prometheus/Grafana. A redação inadequada afeta a segurança dos logs; alertas e plantão não foram validados operacionalmente.
19. **CI/CD e imagens:** CI tem tipos, testes, segredos e SAST; deploy canônico validado estaticamente. API/worker usam instalação não congelada e copiam dependências de desenvolvimento para a imagem final. Não há `USER` explícito nesses Dockerfiles ou override `user` no Compose examinado. Nenhum scan de CVE atual foi executado.
20. **Recuperação/operação:** existem scripts de backup, restore drill e game day e healthchecks de serviços. Existência e testes unitários de segurança de restore não demonstram RPO/RTO nem restaurabilidade de um backup de produção.
21. **Documentação/governança:** documentos e links passam no validador, mas há divergência semântica entre matriz e Quality Bar comprovada pelo teste. README também não espelha integralmente as exigências atuais do Compose. Documentação numerosa exige disciplina de sincronização.

## 4. Achados prioritários e ações verificáveis

### A01 — Redação incompleta no logger compartilhado

**Severidade alta · confiança alta · confirmado por execução · itens 10/18.**

Fonte: [logging](../packages/shared/logging/src/index.ts), funções `sanitize`, `sanitizeContext` e `write`, aproximadamente linhas 61–140. O contexto só recebe tratamento especial para `error`, `payload`, `body` e `headers`; outros campos passam sem redação. Objetos aninhados não são saneados recursivamente, mensagens são emitidas diretamente e erros têm mensagem/stack serializados sem redação.

Reprodução: importar `createLogger` do build atual, capturar `process.stdout.write` e emitir apenas marcador sintético em `password`, `nested.token` e na mensagem. [Resultado](auditorias/evidencias-2026-09-08/logger-probe.json): as três verificações de ausência de redação retornaram `true`.

Impacto: uma chamada de logging que inclua esses dados pode expô-los ao armazenamento de logs. **Não foi identificado vazamento real nem demonstrado que chamadas de produção registrem credenciais.**

Ação: redação recursiva por chaves sensíveis, tratamento de mensagem e erro, preservação de campos diagnósticos permitidos. Aceite: testes de saída com campos aninhados, arrays, erros e strings garantem ausência do marcador sensível; logs continuam correlacionáveis.

### A02 — Build de API/worker não exige lockfile congelado

**Severidade alta · confiança alta · confirmado por inspeção · item 19.**

Fontes: `apps/api/Dockerfile:3,12` e `apps/worker/Dockerfile:3,12`. Ambos instalam pnpm 10.33.0 e executam `pnpm install --no-frozen-lockfile --prod=false`; o manifest raiz declara pnpm 10.0.0 e o CI usa instalação congelada. O Dockerfile da SPA já usa `--frozen-lockfile`.

Impacto: o build das imagens aceita drift de manifests/lockfile que o CI rejeita. A diferença de versão do gerenciador também precisa ser reconciliada; não se afirma que houve alteração de resolução em uma imagem observada.

Ação: unificar gerenciador e exigir instalação congelada. Aceite: build em checkout limpo com lockfile imutável; drift proposital deve falhar.

### A03 — Migration 0162 foi modificada após versionamento

**Severidade alta condicional · confiança alta sobre o diff; estado de bancos desconhecido · item 09.**

Fontes: diff de `packages/db/migrations/0162_counter_sale_number_sequences.sql`; `packages/db/src/migration-integrity.ts` e `migrate.ts`. A alteração adiciona rejeição de números legados inválidos e muda a expressão de inicialização. O runner rejeita checksum divergente de migration já aplicada.

Impacto: **se** a versão do HEAD já estiver aplicada, upgrade com esse arquivo alterado é bloqueado. Não foi consultado banco para confirmar essa condição. A validação adicional em si pode ser útil; o problema é a identidade de uma migration previamente aplicada.

Ação: verificar histórico de aplicação. Para migration já distribuída/aplicada, preservar seu conteúdo e transportar correção para nova migration. Aceite: upgrade de base com hash anterior e instalação vazia passam sem reescrever histórico.

### A04 — Divergência de status deixa a suíte central vermelha

**Severidade média · confiança alta · confirmado por execução · itens 12/21.**

Fontes: `tests/unit/infra/requirement-evidence-matrix.test.ts:57`, `docs/engineering/QUALITY_BAR.md:54` e `docs/engineering/REQUIREMENT_EVIDENCE_MATRIX.md:34`. Quality Bar mantém QB-UX-01 em `PARTIAL`; a matriz apresenta `PASS_BOUNDED`. O teste espera coerência e falha também fora do sandbox.

Ação: reconciliar o significado e as evidências dos status, preservando a distinção entre jornadas locais e critério global. Aceite: teste focado e suíte central passam, sem promover aprovação além da evidência.

### A05 — Imagens de runtime excessivas e usuário não declarado

**Severidade média · confiança alta sobre configuração · item 19.**

API e worker copiam `/app/node_modules`, `apps` e `packages` completos do builder após instalar dependências de desenvolvimento. Os respectivos Dockerfiles não definem `USER`, e o Compose não corrige isso. O perfil Helm possui security contexts próprios; este achado refere-se às imagens/Compose inspecionados.

Impacto: maior superfície e volume de imagem; ausência de uma garantia explícita de usuário sem privilégios no caminho Compose. Não foi inspecionado o UID de um contêiner em execução.

Ação: empacotar somente dependências de produção e artefatos necessários; definir usuário e permissões de storage. Aceite: UID não zero, arquivos de upload funcionais, readiness aprovada e inventário de dependências da imagem restrito ao runtime.

### A06 — Indicador de cobertura tem escopo bastante reduzido

**Severidade média · confiança alta · item 13.**

Fonte: `vitest.config.ts`. A configuração exclui server/bootstrap, rotas e repositórios e módulos inteiros como auth, billing, cash, inpatient, medical-records, pix e prescriptions. SPA e worker não fazem parte de `coverageSourceFiles`. Isso não significa ausência de testes: há suites separadas que passaram.

Ação: publicar explicitamente o denominador; acrescentar medidas por fronteira crítica e evidência DB/HTTP. Aceite: relatório diferencia domínio, API, persistência, SPA e worker, sem apresentar 82% como cobertura global do sistema.

### A07 — Complexidade aceita ainda é muito alta

**Severidade média · confiança alta · itens 01/02.**

Fonte: `docs/engineering/complexity-hotspots.json` e contagem física dos arquivos. `server.ts` usa 8.333 de 8.335 linhas permitidas. O check passou porque aplica orçamento de linhas, não porque comprovou baixo acoplamento.

Ação: decompor composição e handlers por domínio e páginas por responsabilidade, preservando transações e autorização. Aceite: interfaces explícitas, testes de fronteira preservados e redução verificável dos hotspots sem mover indiscriminadamente o mesmo acoplamento.

### A08 — Lint majoritariamente equivale a typecheck

**Severidade média · confiança alta · item 04.**

Fonte: scripts dos 67 manifests. A maioria executa somente compilador. Ação: adotar regras direcionadas para imports/fronteiras, promessas e padrões de risco nos pontos críticos. Aceite: fixtures com violações reais falham, além da tipagem.

### A09 — Caminho E2E padrão não demonstra todo o modo banco

**Severidade média · confiança alta sobre configuração · item 13.**

Fonte: `playwright-spa.config.ts:10–14,75–77`. Sem `E2E_DATABASE_MODE=1`, dois specs de isolamento/perfis são ignorados e o default de `API_DISABLE_INCOMPATIBLE_DB_REPOS` é `1`. Há runner próprio para o modo PostgreSQL. Portanto, um resultado do comando padrão deve informar qual configuração foi usada.

Ação: registrar modo de banco, identidade da execução e ausência de skips nos gates relevantes. Aceite: execução com repositórios persistentes, duas contas, permissões e jornada clínica-financeira verificadas no banco.

### A10 — Guia inicial não lista todos os requisitos do Compose

**Severidade média · confiança alta · itens 20/21.**

Fonte: README, seção de preparo, comparada a `docker-compose.v2.yml`. O Compose exige também credenciais de runtime e identidade de relatórios do worker; o README lista um conjunto mínimo menor. O próprio README já informa healthchecks e trilha canônica, mas não descreve integralmente os serviços auxiliares `runtime-role-init` e `database-migrate`.

Ação: unificar passo a passo com a configuração atual e validar uma instalação vazia. Aceite: operador segue somente o guia e obtém setup e readiness, sem inferir variáveis obrigatórias.

## 5. Evidências de execução

Logs preservados em [auditorias/evidencias-2026-09-08](auditorias/evidencias-2026-09-08/). As aprovações abaixo valem apenas para a fronteira descrita.

| Comando/procedimento | Resultado | Evidência |
|---|---|---|
| `pnpm typecheck` | Exit 0 | `typecheck.log` |
| `pnpm --filter @cvg-his-v2/spa test` | Exit 0; 210 arquivos / 1.834 testes | `spa.log` |
| `pnpm --filter @cvg-his-v2/api test` | Exit 0; 576 testes | `api.log` |
| `pnpm --filter @cvg-his-v2/worker test` | Exit 0; 11 invocações aprovadas | `worker.log` |
| `pnpm exec vitest run --config vitest.config.ts` no sandbox | Exit 1; 11 falhas, incluindo EPERM | `unit.log` |
| Mesmo comando fora do sandbox | Exit 1; somente divergência da matriz permanece | `unit-unrestricted.log` |
| `pnpm --filter @cvg-his-v2/spa run build` | Exit 0; Vite/PWA gerados | `spa-build.log` |
| `pnpm validate:openapi` | Exit 0; validação estrutural | `guards.log` |
| `pnpm validate:namespaces` | Exit 0 | `guards.log` |
| `pnpm validate:migration-source` | Exit 0; trilha canônica | `guards.log` |
| `pnpm validate:rls` | Primeira tentativa EPERM; repetição exit 0 | `guards.log`, `rls.log` |
| `pnpm validate:deploy-surface` | Exit 0; 157 arquivos analisados pelo guard | `guards.log` |
| `pnpm complexity:check` | Exit 0; orçamento de linhas | `guards.log` |
| `pnpm docs:validate` | Exit 0; não detecta a divergência semântica A04 | `guards.log` |
| `pnpm security:secrets` | Exit 0; nenhum achado reportado no escopo configurado | `secrets.log` |
| `pnpm validate:helm` | Exit 0 apenas estático; binário Helm ausente | `helm.log` |
| `pnpm deploy:check` | Exit 0; alinhamento documental/configuração | `deploy.log` |
| Prova do logger com dados sintéticos | Redação insuficiente reproduzida | `logger-probe.json` |

As falhas de permissões da primeira suíte não foram contabilizadas como defeitos do programa. A repetição autorizada eliminou dez falhas, mantendo A04. O secretlint não prova ausência de segredo em histórico Git, arquivos fora dos globs ou sistemas externos.

## 6. Plano de correção priorizado

| Ordem | Entrega | Responsável sugerido | Esforço relativo | Evidência de conclusão |
|---|---|---|---|---|
| 1 | Corrigir redação do logger (A01) | Plataforma/Segurança | Pequeno–médio | Prova sintética e regressão de logging |
| 2 | Reconciliar matriz/Quality Bar (A04) | Engenharia/Produto | Pequeno | Teste focado e suíte central verdes |
| 3 | Verificar aplicação da migration 0162 (A03) | Banco/Operações | Pequeno para diagnóstico; variável para solução | Upgrade de estado anterior e instalação vazia |
| 4 | Congelar dependências e reduzir imagens (A02/A05) | Plataforma | Médio | Build limpo, lock imutável, usuário e runtime verificados |
| 5 | Executar jornada integrada persistida (A09) | QA/Backend/Frontend | Médio–grande | Browser → API → PostgreSQL com isolamento, replay e falhas |
| 6 | Explicitar cobertura e ampliar lint (A06/A08) | Engenharia | Médio | Indicadores por fronteira e fixtures rejeitadas |
| 7 | Sincronizar guia de instalação (A10) | Operações | Pequeno–médio | Instalação reproduzida por guia único |
| 8 | Decompor hotspots (A07) | Líderes de domínio | Grande/incremental | Redução de concentração e regressão preservada |
| 9 | Certificar desempenho, restore e acessibilidade no alvo | QA/Operações/Produto | Médio–grande | Medições atuais, restore e avaliação manual |

Esforço é uma estimativa relativa, não compromisso de prazo. Antes de release, é necessário identificar um candidato reproduzível, resolver falhas obrigatórias e executar os gates aplicáveis nesse mesmo conteúdo.

## 7. Conclusão e validade

O produto já possui implementação e testes suficientes para sustentar evolução estruturada. A maior oportunidade está em tornar a evidência de integração e operação tão forte quanto a base de testes locais, corrigindo os problemas concretos de logging, imagens e governança.

A nota **70,7/100** avalia o estado e a evidência observados; não estima disponibilidade, conformidade legal ou percentual de paridade funcional. Achados condicionais foram explicitados e evidências antigas não foram tratadas como execução atual. Próxima ação recomendada: corrigir A01 com reprodução automatizada, seguindo a ordem acima.
