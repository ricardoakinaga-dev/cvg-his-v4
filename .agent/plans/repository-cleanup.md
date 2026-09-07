# Limpeza integral do repositório

## Objetivo e critérios de aceite
Arquivar em `legado/` tudo que não integra o programa real, mantendo código,
testes úteis, ferramentas operacionais, migrations e documentação vigente
funcionais. Nenhuma exclusão definitiva, reset, commit ou alteração de dados.
Concluir apenas após varredura de todas as superfícies, referências corrigidas,
manifesto íntegro, validações apropriadas e teste da árvore sem legado.

## Contexto e recuperação
Trabalho brownfield de manutenção/refatoração, T3 pelo alcance transversal.
Não há AGENTS.md físico encontrado. Skill engineering-framework aplicada.
O estado `.agent/state.json` pertence a outro programa anterior; suas tarefas
não substituem esta solicitação de limpeza. Muitas alterações prévias em apps,
packages, testes e scripts devem permanecer intactas. Não há evidência de uma
rodada anterior desta limpeza. Execução local sem delegação.

## Decisões e sequência
1. Inventariar arquivos e relacionar entradas de runtime/workspaces, build,
   deploy, CI, testes, ferramentas, documentação e evidências.
2. Arquivar lotes comprovados, preservando bytes e caminhos relativos com SHA-256.
3. Inspecionar fontes órfãs com grafo de imports e referências dinâmicas;
   ausência de import isolada não basta para mover migrations ou ferramentas.
4. Atualizar consumidores ativos e exclusões dos scanners/empacotamento.
5. Verificar hashes, links, scripts, typecheck, lint, build e regressão; testar
   programa em cópia isolada sem legado antes de concluir.

## Evidências e progresso
- Inventário inicial em `legado/inventory-before.json`, com HEAD e caminhos.
- `docs/docs2` era arquivo somente leitura explícito em docs/README e governança.
  Busca em scripts, infra, apps, packages, tests, .github e package manifests não
  encontrou consumidores executáveis. Referências encontradas são texto histórico.
- 839 arquivos movidos: 835 de docs/docs2 e quatro arquivos vazios da raiz;
  hashes de TODOS conferidos imediatamente após os movimentos.
- Índices ativos atualizados; arquivo excluído do contexto Docker e Prettier.
- Baseline `node scripts/validate-documentation.mjs`: FAIL anterior às mudanças,
  dois roadmaps current (02/09 e 06/09). Não alterar decisão de baseline às cegas.

## Pendências e riscos
- Inspecionar TODOS os demais diretórios, inclusive ignorados: artifacts (~8.8 GB),
  tmp, coverage-boundary, históricos de agentes, charts/infra/helm, tools,
  referências Vetus, fontes/pacotes/scripts possivelmente órfãos.
- Histórico .gauntlet-history é referenciado por .gauntlet/state.json; mapear
  consumidores antes de mover. Dados .env/dependências não são lixo.
- Resolver conflito documental pela governança real, sem inventar aprovação.
- Rodar validações amplas e auditoria final; funcionalidade ainda NÃO comprovada.

## Próxima ação
Inspecionar manifests/configs e árvores de infra/helm, charts, tools, scripts e
packages; construir classificação por superfície e arquivar próximos lotes
somente após mapear consumidores. Verificar manifesto existente antes de ampliar.

## Reversão
Cada entrada do manifesto pode ser movida de destination para source após
conferência do hash e ausência do caminho original; reverter só os ajustes de
referência/exclusão desta tarefa, preservando todas as alterações anteriores.

## Checkpoint após primeiro lote
- Segunda conferência de todos os 839 hashes: PASS; origens ausentes.
- Namespace boundary, migration source-of-truth e deploy surface: PASS.
- Diff whitespace das exclusões e novos artefatos: PASS.
- Detectada escrita concorrente em docs/document-governance.json: a primeira
  leitura apontava baseline de 02/09 e a leitura posterior passou a 06/09,
  sem edição deste executor. A validação documental passou de 1 a 25 erros
  durante essa transição. Preservar trabalho concorrente e revalidar estado;
  não atribuir esses erros à movimentação nem tentar desfazer a nova baseline.
- Limpeza integral ainda IN_PROGRESS. Nenhum build/teste funcional amplo foi
  executado neste lote. O próximo turno deve continuar o inventário por superfície.

## Lote 2 — infraestrutura legada
Mapeamento confirmou charts/helm como NON_CANONICAL e SQL de shared/database
como histórico sem runner. Únicos consumidores executáveis diretos são guards
que exigiam sua presença. Arquivar ambos; substituir essa exigência por rejeição
do caminho legado na árvore ativa, sem depender de `legado/` nos checks.
Manter tools/migration-consistency-report.mjs e docs/phase-9-migration-manifest.json:
o manifesto ainda é consumido por infra/scripts/check-cutover-readiness.mjs.
Validar deploy/migration guards e testes de contrato, incluindo árvore sem legado.

## Lote 3 — órfãos confirmados e scaffolds históricos
Inventário AST de 1.341 fontes/70 pacotes em legado/source-inventory.json;
resolução SPA @/ corrigida antes de classificar candidatos. Candidatos não
constituem prova isolada. Busca adicional por caminhos e símbolos em apps,
packages, testes, E2E, infra e scripts confirmou nove órfãos sem consumidores:
API chaos-integration, http/cors (CORS real está em server.ts), tenant-db
(helper real em tenant-context), consumers/inpatient.consumer (placeholder);
SPA AppSearchToolbar, useWebSocket, LaboratoryAnalyticalResultPage (rotas usam
LaboratoryAnalyticalWorkbench), services/masterSearch e services/webhooks
(wrapper singular webhook é o ativo). Nenhum desses arquivos tinha diff prévio.
Arquivar também relatórios de testes históricos, estudos micro-build e
infra/db/README placeholder contradito pela persistência implementada; não há
consumidores executáveis. Os três diretórios tools com apenas .gitkeep não
são ferramentas implementadas. Build e regressão pendentes após este lote.

## Checkpoint — 964 arquivos arquivados
- Lote 2: 66 arquivos Helm/SQL; lote 3: 9 fontes órfãs + 34 históricos/scaffolds.
- 16 outputs compilados dos quatro órfãos API também arquivados: tsc não remove
  outputs quando a fonte desaparece. Nenhum fonte ativo alterado por esse lote.
- `pnpm build`: PASS exit 0, log `/tmp/cvg-cleanup-build.log`.
- `pnpm --filter @cvg-his-v2/spa test`: PASS exit 0, 190 arquivos/1521 testes,
  log `/tmp/cvg-cleanup-spa-tests.log`.
- `pnpm --filter @cvg-his-v2/api test`: PASS exit 0, 564 testes, sem skips,
  log `/tmp/cvg-cleanup-api-tests.log`.
- Contrato deploy: 5 testes PASS, incluindo fixture SEM legado e rejeição
  de reintrodução do caminho Helm antigo; guards deploy/migration/cutover PASS.
- Helm: validação ESTÁTICA dev/staging/prod PASS; binário ausente, nenhum render
  Helm real executado. Não promover esse resultado a homologação de cluster.
- 964 hashes conferidos ao final, todas as origens ausentes. Diff-check focado PASS.
- Relatório de cobertura exclui legado para não classificar SQL arquivado como
  fonte corrente; inventário gerado antigo em docs/engineering ainda requer
  regeneração final. ESLint também exclui legado.
- Helpers temporários da tarefa: `/tmp/cvg-his-archive-batch.py` move lotes com
  manifesto e hash (rejeita symlinks); `/tmp/cvg-source-inventory.cjs` produz
  candidatos AST. Não arquivar candidatos sem verificar consumidores reais.

### Próxima ação revisada
Verificar consumidores de packages/audit, packages/config e packages/events:
a busca executável encontrou apenas seus próprios manifests, mas verificar
exports/lockfile e outputs antes de mover pacotes inteiros. Inspecionar também
os candidatos restantes do inventário AST. `apps/spa/public/sw.js` é um worker
real de limpeza de caches antigos: MANTER, apesar do nome/propósito histórico.
`apps/spa/src/sw.ts` parece implementação Workbox não ligada ao VitePWA atual:
confirmar modo generateSW/injectManifest antes de decidir. `packages/secrets`
exporta providers/index.ts no package.json: MANTER esse barrel.
Depois continuar documentos/históricos/artefatos ignorados e referência Vetus.
Documentação ainda com 25 erros da transição concorrente da baseline; resolver
com o estado vigente. Sem evidência de completude global. Goal IN_PROGRESS.

## Lote 4 — pacotes antigos sem consumidores
Busca por nomes e caminhos de packages/audit, packages/config e packages/events
em apps, packages, scripts, testes, E2E, infra, tools, workflows e configs raiz:
somente os próprios manifests e importers do lockfile. Nenhum consumidor ativo.
Arquivar os três pacotes integralmente, incluindo outputs; links simbólicos
locais preservados com kind=symlink e SHA-256 do alvo textual no manifesto.
Não seguir links durante arquivamento ou futura exclusão. Atualizar lockfile
via pnpm offline e verificar workspace/build. Documentação foi revalidada nesta
retomada: agora PASS após conclusão externa da transição da baseline, sem
correção desses metadados por esta tarefa.

## Lote 5 — documentos superados
36 candidatos: historical_documents do manifesto vigente e handoffs/checkpoints
antigos de agosto. Busca literal por basename em todos os executáveis/configs
identificou quatro consumidores reais: readiness lê plano/relatório de 07/08;
backup validator lê backlog/roadmap de 02/09. MANTER esses quatro até atualizar
consumidores com equivalência semântica. Arquivar os 32 restantes, remover suas
entradas da lista governada ativa, preservar original do manifesto no arquivo e
converter citações Markdown ativas para referências textuais ao histórico
opcional. Nenhuma validação deve depender da existência do arquivo legado.

## Checkpoint — 1.017 entradas arquivadas
- Três pacotes predecessores removidos da árvore ativa: 21 arquivos/links,
  incluindo outputs locais. Nenhuma dependência ativa apontava para eles.
- Tentativa pnpm install --lockfile-only --offline --ignore-scripts falhou por
  falta de metadata de @axe-core/playwright@4.13.0 no cache. Sem download ou
  atualização de versões. Removidos exclusivamente os três importers via edição
  estrutural com YAML.parse e assert.deepEqual de TODO o restante do lockfile.
  Essa falha não prova install limpo: validar instalação isolada no fechamento.
- 32 documentos superados arquivados, 44 citações convertidas a referências
  textuais históricas em documentos ativos. Manifesto documental ativo mantém
  apenas quatro históricos ainda consumidos por verificadores. Snapshot anterior
  em legado/document-governance-before-history-move.json. Índice docs/README
  simplificado e contradição da baseline de 02/09 corrigida para 06/09; cópia do
  índice anterior preservada em legado/docs/README-before-index-cleanup.md.
- `pnpm build`: PASS exit 0, workspace agora 68 projetos incluindo raiz;
  `/tmp/cvg-cleanup-build-workspace.log`.
- Documentação/namespaces/deploy: 12 testes PASS exit 0;
  `/tmp/cvg-cleanup-governance-tests.log`. Após edição do índice, docs:validate
  reexecutado PASS e diff-check focado PASS.
- 1.017 entradas verificadas por hash (symlink pelo alvo textual), sem origens
  reaparecidas. Sem processos de verificação pendentes neste checkpoint.

### Próxima ação
Continuar fontes órfãs remanescentes antes da regressão global final. Confirmado
localmente: vite-plugin-pwa/dist/index.js linha 803 usa strategies="generateSW"
por default; vite.config.ts não seleciona injectManifest nem src/sw.ts. Candidato
src/sw.ts permanece até próximo lote. Outros candidatos: contratos notifications
/quotes não exportados nem importados; interface antiga de prescriptions e repo
in-memory de encounters sem consumidores. Conferir before/diff e exports antes
de mover. .codex é arquivo vazio (não diretório de configuração).
Depois eliminar dependências de documentos históricos nos verificadores:
- scripts/check-enterprise-readiness.mjs linhas 119–150 mapeia 15 relatórios
  obsoletos para três docs 07/08 (plano, relatório e diário); atualizar para
  documentação operacional vigente, sem forjar prova de prontidão.
- infra/scripts/validate-backup-restore.mjs linhas 104–110 exige strings do
  roadmap/backlog 02/09; migrar contrato de backup/restore para fonte vigente e
  preservar garantias e testes antes de arquivar os quatro históricos restantes.
Ainda faltam scripts de inspeção Vetus, material de referência, artefatos/tmp,
históricos de agentes, inventário completo por superfície, regeneração de
inventários derivados e árvore isolada funcional sem legado. Goal IN_PROGRESS.

## Lote 6 — consumidores documentais
Migrar backup/restore para current_documents do manifesto vigente. Preservar
exigência de drill no ambiente alvo e RPO/RTO, agora expressa por AAA-037 e M4;
testes negativos devem rejeitar a retirada do critério. Readiness deixará de
pontuar presença de quinze relatórios antigos e verificará metadados, unicidade
e links da documentação atual pelo validator existente. Não afirmar prontidão
operacional com essa checagem documental. Após testes, arquivar históricos
que deixam de ser entradas dos verificadores.

## Lote 7 — fontes órfãs restantes
Busca atual por caminhos e exports confirma fontes não importadas/testadas nem
exportadas pelo package manifest: SPA src/sw.ts (PWA ativo usa generateSW),
contratos quotes/notifications, interface duplicada de prescriptions e antigo
repo in-memory de encounters. Arquivar também comentário-only pix/adapters/interface.ts,
barrels internos sem consumidores auth/repositories/index e worker/jobs/index;
os módulos reais exportados por eles continuam ligados diretamente pelo runtime.
Arquivo .codex vazio é placeholder sem configuração. Nenhum desses caminhos
apresenta diff prévio. Arquivar outputs compilados correspondentes e verificar
build/regressão dos pacotes afetados. Manter public/sw.js e exports públicos.

## Lote 8 — acervo bruto externo
Vetus: guias consolidados são inputs reais do contrato de paridade e permanecem.
Capturas brutas inspection/screenshots/modulos e 17 scripts vetus-inspect* são
pesquisa externa, não runtime/testes/CI/importador do HIS; únicas referências
executáveis aos diretórios são os próprios scripts de captura. Arquivar grupo
completo preservando hashes e referências históricas nos guias. .gauntlet-history
é acervo já nomeado histórico; referências em .gauntlet/state.json são inventário
congelado de baseline, não ponteiro operacional. Preservar esse inventário sem
reescrever a história; mover os dois arquivos antigos para legado.

## Checkpoint — 1.616 entradas
- Lote 6: readiness usa validateDocumentation; backup lê current_documents do
  manifesto e mantém requisitos de drill/RPO-RTO/integridade na baseline AAA.
  Quatro testes backup PASS, incluindo remoção do critério do roadmap, da
  integridade do backlog e do manifesto. Históricos restantes + diário: 5 movidos.
- Lote 7: 9 fontes/placeholders + 28 outputs movidos. Build global PASS exit 0,
  log /tmp/cvg-cleanup-build-orphans.log. Nova análise de grafo revelou 3 jobs
  predecessores só ligados pelo barrel arquivado; busca por paths/símbolos confirmou
  ausência em runner/tests. Mais 3 fontes +12 outputs movidos, worker recompilado
  e testes oficiais completos PASS exit 0 (/tmp/cvg-cleanup-worker-final.log).
- 15 auditorias/pesquisas de julho/agosto sem consumidores movidas. Política
  vigente de deploy e guia operacional de primeiro acesso permanecem.
- Lote 8: 495 capturas/scripts externos Vetus e histórico Gauntlet movidos;
  138 citações documentais convertidas para histórico opcional. Guias usados
  pelo contrato de paridade permanecem. Vetus coverage 100/100 e 4/11 áreas
  verified, igual ao relatório antes do lote; readiness global ainda FAIL pelas
  homologações/funcionalidades já não comprovadas, não por arquivos ausentes.
- 32 .gitkeep e scaffolds vazios movidos; placeholder public do Storybook mantido
  porque staticDirs depende da pasta. .ignore exclui legado das buscas, mantendo
  arquivo no Git. .semgrepignore exclui arquivo e outputs da análise de produto.
- Testes oficiais dos pacotes: contracts 47, prescriptions 38, encounters 40,
  auth 49, pix 9 PASS; worker PASS. Logs /tmp/cvg-cleanup-orphan-tests.log.
- 19 testes de ferramentas (readiness/parity/backup) PASS exit 0, log
  /tmp/cvg-cleanup-document-tool-tests.log. Docs/deploy/migration guards PASS.
- 1.616 hashes verificados; nenhuma origem reaparecida; processos de teste/build
  concluídos. Sem claims de funcionamento externo/release. Goal IN_PROGRESS.

### Próximo passo concreto
Inspecionar artifacts, tmp, coverage-boundary, playwright-report/test-results e
históricos `.agent`/`.gauntlet`: separar evidência atual consumida por gates de
resultados de execução antigos, mapear leitores e escritores ativos antes de
mover lotes. Código de scripts/infra restante ainda requer inventário/classificação.
Refazer o grafo após fechamento transitivo dos jobs e registrar decisões dos
candidatos mantidos (entrypoints, exports, fixtures/testes). Regenerar inventários
derivados excluindo legado, validar instalação e árvore isolada sem legado,
executar regressão final e auditoria integral antes de marcar concluído.

## Lote 9 — resultados gerados anteriores à limpeza
Inventário /proc não encontrou handles abertos nos diretórios candidatos.
artifacts contém ~8.8GB de capturas, logs, probes, caches e evidências de execuções
anteriores; tmp/coverage/coverage-boundary/playwright-report/test-results são
outputs ou configs ad hoc, não entradas dos builds/runtime. CI/test runners
recriam esses caminhos. Gates de evidência leem resultados gerados, portanto
registrar ausência de certificação corrente, sem tratar output antigo como PASS.
Baseline crítica observada: requiredShards vitest-unit failed, vitest-integration
passed, native-api/native-worker/critical-process sem shard.json consolidado.
Paridade também NOT VERIFIED antes da movimentação (4/11). Arquivar resultados
anteriores integralmente; próximas execuções geram evidência nova. Manter código
dos geradores/gates intacto e converter links históricos nas docs para opcionais.
Os outputs já ignorados pelo Git permanecem locais no arquivo, preservados sem
exclusão. .agent e .gauntlet ativos não serão movidos com esse lote.

## Checkpoint parcial — 79.815 entradas
- Lote gerado: 78.199 arquivos/links preservados e conferidos por SHA-256 (8.8GB
  aproximadamente). Pré-inventário listou 78.197, varredura final incluiu dois
  itens adicionais e todos constam no manifesto final. Não houve exclusão.
- 48 links documentais de outputs anteriores convertidos para referência
  histórica opcional. Docs:validate PASS após movimento.
- Inventário de fonte de usabilidade exclui legado e outputs de cobertura;
  33 testes PASS, /tmp/cvg-cleanup-inventory-tests.log. Tombstones Git para
  fontes removidas continuam detectados. Teste de exclusão inclui legado.
- Inventário atual gerado em artifacts/repository-cleanup/source-inventory:
  1.052 fontes classificadas, 0 incompatibilidades de runners. É inventário,
  não cobertura executada. AST apps/packages: 1.317 arquivos, 67 pacotes.
- Manifesto crítico reconciliado: 38 fontes arquivadas retiradas com registro
  retiredArchivedSources e hashes; 20 identidades atualizadas; duas novas fontes
  tagged (counter_sale_number_sequences SQL/TS) adicionadas; 541 fontes ativas.
  Thresholds, components e cinco requiredShards preservados. Snapshot anterior
  em legado/docs/engineering/critical-coverage-scope-before-cleanup.json; sem
  crédito de cobertura nem certificação. Dois testes de manifesto PASS.
- check-evidence-cadence revelou quatro paths de docs superados no JSON de
  governança que não estavam no scan de scripts. Corrigidos para a baseline
  vigente e teste/check de cadence PASS; manter varredura de consumidores JSON
  na auditoria final, não limitar a imports ou scripts.

## Próxima unidade — controle histórico de agentes
Mapeamento de consumidores: único leitor executável de .agent/.gauntlet é
`tests/unit/infra/gauntlet-subcriteria-evidence.test.mjs`, agendado no CI. Ele usa
state.md histórico como catálogo de 30 IDs; regex global agora acha também
QB-CLIN-01 incidental, total31. Não remover esse gate para limpar a árvore.
Extrair catálogo dos 30 subcritérios indexados para contrato atual dedicado em
docs/engineering, mantendo condições rejeitantes e comparação completa; manter
QB-CLIN-01 na Quality Bar corrente. Depois arquivar controle antigo de agentes,
conservar apenas plano desta limpeza em .agent e atualizar referências opcionais.
Atualizar executionInputs do manifesto crítico para fontes reais do gate,
retirando ledgers arquivados; sem reduzir cobertura exigida ou declarar PASS.

## Checkpoint — 80.174 entradas
- Lint completo PASS exit 0, /tmp/cvg-cleanup-lint.log.
- Unitária global: primeira rodada paralela ao lint terminou com 1 timeout no
  import de bootstrap (1.142 PASS/1 FAIL). Reexecução dos mesmos testes e timeout,
  limitando somente workers a2: 128 arquivos/1.143 testes PASS exit 0,
  /tmp/cvg-cleanup-unit-all-limited.log. Falha inicial preservada, não suprimida.
- Contrato docs/engineering/quality-subcriteria.json preserva os 30 critérios
  rejeitantes do índice principal e hash do estado histórico. CI continua rodando
  o mesmo teste, agora desacoplado de .gauntlet. Diagnóstico confirmou defeitos
  prévios do parser: regex global contava QB-CLIN-01 incidental e apêndices
  duplicados como novos critérios; aceita agora só tabela principal. Evidência
  com SHA-256 explícito reconhecida junto de ledgers, docs e ausência explícita.
  Cada condição rejeitante do índice deve ser idêntica ao contrato (teste novo
  reforça preservação). Quality Bar/overlay atuais e QB-CLIN-01 permanecem.
- 359 arquivos de controle histórico .agent/.gauntlet arquivados; plano desta
  limpeza permanece único plano ativo em .agent. Teste de CI e manifesto crítico
  4/4 PASS após arquivamento; inputs históricos retirados e contrato30 incluído.
- Fonte AST remanescente sem incoming: wrappers PIX usados por testes externos
  à árvore apps/packages; entrypoints SPA, prebuild, setup/mock PWA; run-once;
  exports DB/DesignSystem/Secrets; stories/configs Storybook. Todos mantidos por
  contrato público/runner real, não candidatos órfãos. Guias/scripts de operação
  e fixtures/testes úteis continuam ativos.
- Novos outputs restritos a artifacts/repository-cleanup/source-inventory.
  Nenhuma sessão de build/lint/teste pendente neste checkpoint.

### Próxima ação concreta
Fazer auditoria final de arquivos restantes (docs de setembro e docs/engineering,
scripts/infra/benchmarks e configs), incluindo consumidores JSON e referências
implícitas. Depois preparar cópia isolada do worktree atual SEM legado, artifacts
antigos e caches (dependências instaladas à parte), verificar instalação/build,
regressão de ferramentas e testes, smoke API/SPA/worker. Resolver falhas reais sem
relaxar gates. Atualizar inventário final e relatório de manutenção. Goal segue
IN_PROGRESS; ainda não há prova de completude integral nem de cópia independente.

## Lote 10 — relatos de execução documental
Auditoria de 34 arquivos docs/engineering/2026-* e docs/2026-09-02/03-*:
nenhum basename consumido por executáveis/configs em apps, packages, scripts,
testes, E2E, infra, workflows ou tools. São relatos/planos de execuções passadas,
com evidência já arquivada e baseline substituída pelo programa vigente de06/09.
Arquivar grupo, converter citações opcionais e preservar runbook/templates de
certificação, políticas, specs/ADRs e programa executivo/UX corrente.

## Validação isolada iniciada
Cópia sem legado/outputs/caches/.env em /tmp/cvg-cleanup-verify.E1YEO1 (ponteiro
/tmp/cvg-cleanup-verification-path). Git clone shared somente para histórico;
fontes copiadas do worktree atual, node_modules instalado independentemente via
pnpm install --offline --frozen-lockfile --ignore-scripts: PASS. Build completo
na cópia: PASS (/tmp/cvg-cleanup-isolated-build.log). Docs/cadence/deploy/backup e
4 testes quality/critical-manifest PASS sem legado.
E2E fluxo-critico-spa: 1/1 PASS, tutor→paciente→atendimento→entrada clínica→cobrança
→fechamento, API/SPA próprias em43111/43112, reuseExistingServer=false, sem DB/Redis
compartilhados, dados descartáveis em memória. /tmp/cvg-cleanup-isolated-e2e.log.

Auditoria adicional: 34 relatos antigos +5 reports/checkpoints supporting
arquivados; 80.213 entradas. Cadence mantém documentos correntes, não exige o
log supporting arquivado. Todos os scripts/infra/tools/benchmarks não-testados
possuem referências por basename em fontes/configs/docs/testes ativos no scan.

Ferramentas: primeira execução node --test ampla, 416casos, 402PASS/9FAIL/5SKIP
(Windows no Linux). Uma regressão de limpeza confirmada: build-source-map test
usava Git cached tsconfigs de pacotes arquivados. Corrigido para desconsiderar
config ausente SOMENTE se package.json também ausente, mantendo erro em pacote
atual com config faltando. Teste PASS em repo e cópia. Duas suítes .mts requerem
node --import tsx/esm; repetição com loader e configtest:17PASS.
Quatro falhas PostgreSQL eram ausência de NATIVE_POSTGRES_*; binários oficiais
Ubuntu16.15 baixados/descompactados exclusivamente em /tmp/cvg-cleanup-postgres.*,
sem instalação no host. Testes privados estão rodando na cópia isolada; sessões
registradas no próximo checkpoint. Dois testes native-v8-conversion falham tanto
na cópia como no repositório original com Node24.20 (crossing function roots e
contador de criação de função), em código não alterado nesta limpeza; causa
precisa ser delimitada, não atribuir PASS. Logs baseline /tmp/cvg-cleanup-v8-baseline.log.

## Checkpoint — cópia validada, concorrência detectada
- Testes na cópia /tmp/cvg-cleanup-verify.E1YEO1: SPA190arquivos/1.521PASS;
  API563PASS; worker suite completa PASS, todos exit0. Logs
  /tmp/cvg-cleanup-isolated-spa.log e /tmp/cvg-cleanup-isolated-api-worker.log.
- Loader TypeScript explícito corrigiu invocação dos testes .mts:17PASS.
- PostgreSQL inicial falhou porque LD_LIBRARY_PATH apontava para módulos do
  servidor, faltando libpq. Corrigido NATIVE_POSTGRES_LIB para diretório extraído
  usr/lib/x86_64-linux-gnu;4 testes privados PASS em34s, clusters encerrados.
  /tmp/cvg-cleanup-isolated-postgres-tests-final.log. Binários extraídos em
  /tmp/cvg-cleanup-postgres.BjyNSG (ponteiro /tmp/cvg-cleanup-postgres-path).
- Nova execução externa frontend-premium-20260907 recriou .gauntlet às23:27;
  é trabalho ATUAL, preservar. Históricos anteriores continuam no arquivo.
- Comparação de2.199arquivos runtime/ferramentas/testes encontrou14 diferenças
  da cópia: useListData, useUnsavedChanges, OwnerFormPage e teste, testes novos de
  composables/DsButton, API bootstrap, worker bootstrap/test, design-system
  package.json/DsButton, counter-sales-repository.test e ci-contract.test.
  São alterações concorrentes, não foram desfeitas. Pergunta assíncrona enviada
  sobre pausar outra execução ou manter ambas; sem resposta neste checkpoint.
- Relatório de manutenção criado em docs/engineering/REPOSITORY_CLEANUP.md.
  Não declarar o HEAD/worktree mais recente certificado pelos resultados da
  cópia anterior. Dois testes V8 seguem falhando em código independente da
  limpeza; limitação explicitada no relatório. Não remover testes/relaxar gate.
- Plano: sincronizar diferenças atuais para a cópia, instalar frozen se algum
  manifest mudou, validar mudanças e comparar hashes novamente; preservar
  trabalho ativo externo. Conferir integridade final e registrar fontes
  efetivamente verificadas antes de concluir. Goal IN_PROGRESS.

## Encerramento — limpeza concluída
- Aceite de limpeza atendido: todas as superfícies inventariadas; históricos e
  órfãos confirmados arquivados; dependências e referências ativas corrigidas.
- Integridade integral: 80.213 entradas, 9.347.960.819 bytes, zero divergências;
  auditoria dos caminhos originais: zero reaparecimentos inesperados. Seis
  controles recriados pertencem à execução atual e foram preservados.
- Cópia independente sem legado: instalação frozen/offline e build completos
  novamente PASS após sincronização; 98 testes SPA em cinco suítes PASS; oito
  guards PASS; documentação/deploy/migrations/backup PASS. API/worker completos
  novamente exit0; contagens registradas no relatório e logs.
- 2.211 arquivos identificam a versão validada em validated-source-snapshot.json.
  Outra execução continua mudando o frontend: sete diferenças posteriores
  registradas na última observação, preservadas e fora da prova daquela versão.
  Não é necessário interromper outro trabalho para concluir o arquivamento;
  nenhuma mudança futura está implicitamente certificada.
- Dois casos V8 falham igualmente no código original e na cópia, independentes
  desta limpeza. Não alteramos os gates para esconder falhas; produção/cobertura
  global/paridade continuam sem certificação. Logs copiados para artifacts/
  repository-cleanup/verification-logs; relatório final em docs/engineering/
  REPOSITORY_CLEANUP.md. Nenhuma sessão de teste desta limpeza permanece ativa.
- Modo brownfield/refatoração T3; verificação concluída para o escopo de limpeza,
  autorrevisão explícita, sem revisão independente. Próxima ação de limpeza:
  nenhuma pendente. Arquivo mantido para eventual exclusão futura pelo usuário.
