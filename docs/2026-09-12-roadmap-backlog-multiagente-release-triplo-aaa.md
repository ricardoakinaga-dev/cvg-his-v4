---
document_status: current
document_kind: remediation_plan
effective_date: 2026-09-12
owner: Engenharia
source_audit: docs/2026-09-12-avaliacao-profunda-release-triplo-aaa.md
---

# Roadmap e backlog multiagente — release e Triplo AAA

Atualização de execução em 12/09/2026: consultar o [status consolidado](2026-09-12-status-consolidado-execucao-multiagente.md). Os cartões abaixo preservam os contratos; sua classificação inicial como PROPOSTOS é histórica, não o estado de todas as entregas atuais. A prioridade corrente é MA-02-F-NATIVE-R1 após REJECT independente; R3 já integrado, sem novo rework.

## 1. Objetivo e contrato de uso

Transformar os 18 itens da [avaliação profunda](2026-09-12-avaliacao-profunda-release-triplo-aaa.md) em trabalho delegável, verificável e integrável. Resultado pretendido: corrigir os bloqueios locais, demonstrar as fronteiras reais do ERP e submeter um candidato íntegro à régua Triplo AAA. **Este documento prepara a execução; não declara melhorias implementadas nem release aprovado.**

Baseline do relatório: HEAD `324099e5a54537ca1349f3310639c3a12afbae36`, prontidão editorial 60/100; release BLOCKED. SHA-256 do relatório preservado: `cd8566992993ae0e6fa9551f7ff4f9f2f07f29073379bc65621123cfed7dc373`. Notas e achados são históricos desse recorte; revalidar antes de implementar.

**Autoridade desta entrega:** escrita de documentação local. Não inclui implementação, commit/push, deploy, alteração de branch rules, contratação, uso de dados reais, providers ou drills destrutivos. Uma execução futura precisa de autorização compatível com cada ação.

### Fontes canônicas e recuperação

- Este documento é a especificação de despacho dos pacotes `MA-01` a `MA-35`, todos **PROPOSTOS**, não um segundo ledger de status.
- [Backlog REM-001–030](2026-09-12-backlog-correcao-gaps-triplo-aaa.md): origem dos GAPs e compromissos existentes. Os MA são decomposições/complementos, não renumeração nem encerramento dos REM.
- [ExecPlan existente](../.agent/plans/repository-state-of-art-remediation-execplan.md): narrativa operacional a reconciliar quando a execução for ativada.
- [Backlog operacional](../.agent/backlog.json), [estado](../.agent/state.json), [verificações](../.agent/verification.jsonl) e [log](../.agent/execution-log.jsonl): únicos donos dos status/pointers/resultados. Não foram alterados nesta entrega.
- [Quality Bar congelada](triple-a/QUALITY_BAR_V1.json): autoridade dos critérios de certificação. Não substituir por média de tarefas ou pela nota editorial do relatório.

Recuperação observada: estado aponta `TRIPLE-A-RELEASE-CONTROL` bloqueado e um passo de integração da primeira onda; relatório e fonte já descrevem outro estágio dessa onda. Há contradições históricas conhecidas. **Não despachar esse ponteiro antigo automaticamente.** MA-01 reconcilia o controle antes de ativar os pacotes. Os IDs REM não devem ser presumidos como registros já existentes no JSON: conferir e registrar vínculos explícitos na ativação.

Perfil do planejamento: brownfield, atividade PLAN, remediação transversal de risco crítico. Profundidade documental T2; a futura execução clínica/financeira/release conserva os controles T4 aplicáveis. Implementação global não está `IMPLEMENTATION_READY` por este documento: decisões de produto, ambiente e autoridade continuam explícitas abaixo.

## 2. Régua de aceitação do plano e do produto

### Bar documental v1 — congelada para esta entrega

Todos obrigatórios; fonte USER/DERIVED; baseline anterior: roadmap de alto nível sem estes pacotes de despacho. Escopo: arquivos documentais desta entrega, 12/09/2026; não usa referência visual externa nem transfere licenças.

| ID | Prioridade | Critério rejeitável | Evidência de aceitação |
| --- | --- | --- | --- |
| PLAN-01 | P0 | Relatório preservado e 18/18 dimensões mapeadas a tarefas | hash do relatório e conferência da matriz |
| PLAN-02 | P0 | Cada pacote tem origem, entrega, owner, dependências, superfície e aceite | inspeção dos 35 contratos e referências |
| PLAN-03 | P0 | Grafo sem ciclo; recursos compartilhados têm serialização explícita | revisão de dependências e tabela de locks |
| PLAN-04 | P0 | Nenhum PASS futuro, autoridade inventada ou redução implícita de escopo | revisão dos gates e limites humanos |
| PLAN-05 | P1 | Novo agente consegue iniciar com inputs, comandos e contrato de retorno | inspeção do protocolo e dos prompts |
| PLAN-06 | P1 | Links/documentação válidos; crítica final independente sem lacuna material | `pnpm docs:validate`, verificação local e crítico fresco read-only |

Esses critérios aprovam **o plano**, não a implementação prevista. Known-bads documentais: dimensão órfã, dependência inexistente/cíclica, dois donos simultâneos de lock, comando inventado tratado como executado e teste sintético apresentado como certificado devem causar rejeição.

### Bar de produto — não negociável por agentes

Global >=97, críticas >=95, zero P0 e todos os critérios obrigatórios PASS, com autoridade válida. Preservar a interpretação da régua canônica e distinguir suas camadas de score. Coverage crítica mantém os thresholds vigentes de 85 para lines/statements/functions/branches; isso não equivale à nota AAA.

`NOT_RUN`, `STALE`, `BLOCKED` ou evidência de outro candidato não encerram tarefas. Builder entrega IMPLEMENTED, nunca autoaprova DONE. Nenhum agente altera limiares, remove testes, aceita novos baselines visuais em massa ou omite módulos para obter verde.

## 3. Cobertura dos 18 itens do relatório

| Item | Dimensão | Baseline /100 | Pacotes | Resultado esperado |
| --- | --- | ---: | --- | --- |
| 1 | Arquitetura | 70 | MA-30, MA-31, MA-32 | fronteiras menores, comportamento preservado e budgets justificados |
| 2 | API/OpenAPI | 80 | MA-04, MA-08 | contrato bidirecional e dispatch real sem falsos positivos conhecidos |
| 3 | Autenticação/OIDC | 70 | MA-08, MA-14 | identidade e deadline ponta a ponta comprovados no escopo ofertado |
| 4 | Segurança/privacidade | 65 | MA-09, MA-10, MA-12, MA-21 | minimização, edge, isolamento e ciclo de dados verificados |
| 5 | Dados/RLS/auditoria | 65 | MA-11, MA-12, MA-22, MA-24 | persistência, migração e recuperação consistentes |
| 6 | Fluxos críticos/worker | 65 | MA-13, MA-14 | invariantes e recuperação de processo sem duplicidade |
| 7 | Completude/integrações | 45 | MA-15 a MA-22 | matriz 11/11 fechada por comportamento |
| 8 | Testes | 75 | MA-07, MA-33 | regressão representativa, falhas visíveis, zero skip crítico |
| 9 | Coverage crítica | 40 | MA-02, MA-05 | identidade atual e cinco shards realmente medidos |
| 10 | CI/main verde | 60 | MA-07, MA-29 | execução terminal e required checks comprovados |
| 11 | Gate/certificação | 35 | MA-03, MA-35 | agregação completável, fail-closed e autoridade vinculada |
| 12 | Dependências/supply chain | 60 | MA-06, MA-27 | dependências aceitas e imagens verificáveis por digest |
| 13 | Performance/capacidade | 45 | MA-23 | metas aprovadas, carga/soak e margem medidas |
| 14 | Backup/restore | 40 | MA-24 | recuperação cronometrada com consistência de negócio |
| 15 | Observabilidade | 45 | MA-03, MA-25 | traces, alertas, on-call e evidência consumida pelo gate |
| 16 | UX/acessibilidade | 60 | MA-26, MA-31, MA-33 | render e interação reais, revisão independente e UAT |
| 17 | Governança/docs | 55 | MA-01, MA-29, MA-34 | status coerentes, histórico preservado e freshness explícita |
| 18 | Deploy/rollback | 45 | MA-27, MA-28 | alvo executa digest certo e reversão é demonstrada |

Não há promessa de “100 em tudo”. A meta é cumprir critérios verificáveis e eliminar bloqueios materiais; notas futuras exigem nova avaliação.

## 4. Roadmap por demonstrações, não por calendário

| Marco | Pacotes | Entrada | Saída demonstrável |
| --- | --- | --- | --- |
| M0 — recuperar confiabilidade dos controles | MA-01–04 | relatório e código inspecionados | controle reconciliado; manifesto/AST/gate com conhecidos bons e ruins |
| M1 — medir e integrar corretamente | MA-05–07, MA-11, MA-33 | contratos locais estáveis; ambiente autorizado | cinco shards, regressão e CI executando verificadores reais |
| M2 — provar fronteiras críticas | MA-08–10, MA-12–14 | isolamento de recursos e contratos disponíveis | identidade, dados, clínica e worker exercitados em fronteiras reais |
| M3 — fechar negócio e interface | MA-15–22, MA-26 | jornadas persistidas e matriz de aceite | 11/11 e UAT/UX no escopo contratado |
| M4 — provar operação e entrega | MA-23–25, MA-27–29 | metas/ambiente/autoridades disponíveis | capacidade, recuperação, observabilidade, imagens e deploy demonstrados |
| M5 — excelência sustentável | MA-30–34 | testes de caracterização e baselines atuais | hotspots menores, testes limpos e expiração de evidência controlada |
| M6 — congelar e decidir | MA-35 | entregas obrigatórias integradas | candidato único recertificado; PASS ou bloqueio explícito |

Marcos agrupam resultados, não são barreiras globais artificiais. O grafo dos pacotes governa a execução: preparar MA-11/27/29 não precisa esperar todo M0; provas finais continuam sujeitas às dependências. Trabalho distante exige refinamento de arquivo/cenário antes de READY.

Caminho crítico provável: `MA-01 → MA-02 → MA-05 → MA-07 → MA-12 → MA-14 → MA-15 → domínios → MA-22 → MA-26 → MA-35`, com junções obrigatórias de MA-03, operação, supply chain e governança. É uma hipótese de sequência, não estimativa de duração. Providers, UAT, soak e janela de deploy podem dominar o prazo real.

## 5. Protocolo de execução multiagente

### Capacidade e papéis

Usar a capacidade real do host. Neste ambiente existem 4 slots incluindo o Lead; plano conservador: Lead + até 2 builders + 1 crítico, com substituição dos papéis conforme tarefas terminam. Não criar agentes ociosos nem descendentes. Na produção deste plano: Lead escritor único, scout read-only para comandos/colisões e crítico final fresco para aceitação documental.

O Lead mantém controles, contratos compartilhados, integração e autorização. Builders recebem um pacote por vez. Críticos são read-only, contexto novo (`fork_turns: none` quando disponível), sem racional do builder ou parecer anterior. Independência I1 não substitui autoridade humana I3.

Envelope de cada despacho: até dois builders ativos; nenhuma chamada paga/externa sem autorização específica; encerrar investigação ao obter evidência discriminante. Repetição determinística sem mudança de hipótese é proibida; após duas tentativas de rework sem novo avanço, preservar resultados e replanejar com o Lead. Não impor limite arbitrário de rodadas ao produto nem tratar esgotamento como PASS.

### Locks e superfícies compartilhadas

| Lock | Dono durante a escrita | Pacotes que precisam serializar |
| --- | --- | --- |
| CONTROL | Lead | MA-01, MA-34, MA-35; `.agent/**`, estados e ledgers |
| IDENTITY | QA/integrador designado | MA-02, MA-05 e refresh após qualquer fonte crítica alterada |
| CI-CONFIG | Plataforma | MA-05, MA-07, MA-27, MA-29; `.github/workflows/**` |
| DEPENDENCIES | DX | MA-06, MA-33; `package.json`, lockfile, configs de teste/build |
| API-COMPOSITION | Backend | MA-08, MA-10, MA-12, MA-14, MA-30; `server.ts`, auth e wiring compartilhado |
| WORKER | Backend/worker | MA-13, MA-25, MA-32; runner, filas e políticas compartilhadas |
| SPA-SYSTEM | Frontend | MA-08 quando houver UI, MA-26, MA-31; router, tokens e componentes comuns |
| SCHEMA | DB | MA-12, MA-16–22, MA-24; migrations, seeds e registro de schema |
| TARGET | Operações | MA-23–25, MA-27–28; namespaces, imagens, carga e observação |

Cada builder pode editar apenas a allowlist refinada pelo Lead, nunca a categoria inteira por implicação. Alteração fora dela vira solicitação de integração. Worktrees não resolvem conflito semântico; os locks continuam válidos. Sem worktree isolado, não rodar build global durante escrita de outro agente: `dist`, coverage e caches também colidem.

Banco/schema, Redis, filas, ports, storage e output de artifacts devem ter identidade exclusiva por tarefa/tentativa. O Lead aloca nomes concretos antes de READY. Não compartilhar dados clínicos reais; cleanup só pode atingir recursos descartáveis explicitamente criados e registrados pela tarefa.

**Risco confirmado nos comandos atuais:** `test:smoke`, `test:e2e:spa` e `test:visual` usam `fuser -k` nas portas 3111/3112; `test:db:stop` usa `docker compose ... down -v`. Não executar esses wrappers enquanto qualquer outro agente usar as portas/projeto/volumes. MA-11 deve validar o runner inteiro, alocar recursos e neutralizar colisões por configuração/isolamento apropriado antes de permitir paralelismo; worktree separado sozinho não basta. Carga/restore/game day não compartilham o mesmo target durante coleta de evidência.

### Contrato comum de tarefa

Cada cartão abaixo herda: relatório e origem REM como inputs; preservação de contratos públicos, tenant/RLS, idempotência e dados; proibição de publicação e controles compartilhados sem autorização; evidência em diretório novo `artifacts/remediation/<task>/<attempt>/` ou armazenamento aprovado. Diretórios ignorados precisam de retenção/exportação aprovada antes de handoff; referência a arquivo local efêmero não é arquivo durável de certificação.

Dependências abaixo significam **saída verificada**, não tarefa apenas iniciada. `—` permite somente descoberta após MA-01/ativação e autorização; não significa permissão automática de execução externa. Cada tarefa só vira READY quando a allowlist exata, comandos, ambiente, autoridade, riscos e rollback estiverem preenchidos no despacho.

A granularidade dos domínios/arquitetura é deliberadamente de pacote: antes de construir, dividir em slices por jornada/handler/job com aceite próprio. Não entregar “refatore todo módulo” a um agente sem esse refinamento.

## 6. Backlog delegável

### MA-01 — reconciliar e ativar o programa

- Origem: item 17; REM-001/002; P0; owner Lead; dependências —.
- Entrega/superfície: ler estado, plano, backlog e ledgers; preservar contradições como história; registrar este despacho no ExecPlan existente e mapear MA↔REM↔task operacional. Escrita futura exclusiva em `.agent/**` e docs correntes, sem reescrever resultados antigos.
- Aceite: IDs/next action/gate concordam; checker aplicável valida registros correntes; histórico incompatível é migrado com procedência, não apagado. `pnpm docs:validate` passa e uma referência stale é rejeitada em fixture.
- Prova: diff de controle, saída do checker e mapa de origens. Próxima ação singular após ativação: reproduzir DEEP-01 por `node --test scripts/critical-source-manifest.test.mjs`.

### MA-02 — restaurar identidade das fontes críticas

- Origem: item 9, DEEP-01; REM-006; P0; owner QA; dependências —; lock IDENTITY.
- Entrega/superfície: manifesto `docs/engineering/critical-coverage-scope.json`, seu gerador e testes. Decidir tecnicamente identidade de fonte versus commit de coleta sem depender de um impossível SHA autorreferente; preservar vínculo verificável ao candidato.
- Aceite: `node --test scripts/critical-source-manifest.test.mjs` passa; fonte alterada sem refresh falha; artefatos antigos ficam STALE. Atualizar hash não certifica coverage.
- Prova: reprodução antes/depois, bytes/hashes e teste negativo. Refresh de identidade deve ser repetido pelo integrador após novas alterações críticas; não encerrar REM-006 antes de MA-05.

### MA-03 — completar agregação de observabilidade, soak e rollback

- Origem: itens 11/15, DEEP-02; REM-012/028; P0; owner Plataforma; dependências —.
- Entrega/superfície: `scripts/run-triple-a-release-gate.mjs`, validadores de evidência e testes de contrato. Congelar schema/intake consumível pelos produtores MA-23/25/28 antes de despachá-los.
- Aceite: caminho público de construção + avaliação aceita um pacote completo de teste; ausência, SHA/digest errado, documento parcial, produtor não confiável e artefato incompatível bloqueiam. OPS possui produtor; soak/rollback exportam referências corretas. Não só testar `evaluateQualityBar` com PASS injetado.
- Prova: fixtures positivas/negativas explicitamente sintéticas, contratos e exportação íntegra. Certificação real permanece pendente de MA-35.
- Estado (12/09/2026): pareceres R2 divergentes preservados; crítica independente reproduziu R2-F1 (dimensão duplicada) e R2-F2 (política sem limites). R3 reparou ambos e recebeu APPROVE I1 fresco nos seis critérios locais, conforme parecer R3. Integração canônica pendente; política real continua `PENDING_AUTHORITY`, operação real não homologada e certificação MA-35 não liberada.

### MA-04 — fortalecer OpenAPI e dispatch

Handoff atualizado de 12/09/2026: [conferência da entrega e MA-04-R1](2026-09-12-ma04-status-e-proxima-tarefa.md). Reparo das fixtures entregue e revisão/reprodução independentes I1 favoráveis comunicadas; aceite de integração pelo Lead pendente. Não repetir o reparo antigo nem encerrar MA-04 automaticamente.

- Origem: item 2, DEEP-04; REM-003; P1; owner Backend/API; dependências —.
- Entrega/superfície: `scripts/validate-openapi.js`, fixtures e contratos de rotas; não alterar auth em paralelo com MA-08.
- Aceite: `false`, `(false)` e `!true` rejeitados; casos válidos aceitos; omissão de método/path/schema relevante detectada; dispatch das 11 operações críticas exercitado com permissão e erro.
- Prova: validator, testes de contrato e respostas reais do handler. Não generalizar análise constante limitada como prova de alcance universal.

### MA-05 — medir coverage crítica de verdade

- Origem: item 9, DEEP-03; REM-006; P0; owner QA; dependências MA-02, MA-04, MA-06, MA-11; locks IDENTITY, CI-CONFIG e DEPENDENCIES quando necessário.
- Entrega/superfície: checker/coletores, configs de coverage, manifesto e integração CI. Parametrizar paths; produzir `vitest-unit`, `vitest-integration`, `native-api`, `native-worker`, `critical-process`.
- Aceite: checker real executa no CI e mede denominador crítico; cada threshold vigente é respeitado; shard ausente, fonte sem métrica, hash/HEAD errado, dado raw malformado e resultado abaixo de 85 bloqueiam.
- Prova: cinco shards, manifesto de fontes, resultados por componente e conhecidos inválidos. Coverage geral verde não substitui este aceite.

### MA-06 — tratar dependências vulneráveis

- Origem: item 12; REM-013; P1; owner DX/Segurança; dependências —; lock DEPENDENCIES.
- Entrega/superfície: manifestos e lockfile; atualizar tooling afetado por advisory após verificar versão compatível na fonte oficial durante execução.
- Aceite: `pnpm audit --json` sem finding não aceito no escopo; suíte, typecheck, lint e coverage tooling não regridem. Exposição/aceite residual dependem de Segurança, não do builder.
- Prova: diff de dependências, audit antes/depois, regressão e inventário de aceites. Não confundir cinco ocorrências do mesmo advisory com cinco CVEs.

### MA-07 — fechar CI e regressão integrada

- Origem: itens 8/10; REM-006/012; P0; owner Plataforma/QA; dependências MA-03, MA-04, MA-05, MA-33; lock CI-CONFIG.
- Entrega/superfície: CI e inventário de required checks; incluir contratos hoje fora de `pnpm test`, sem esconder falha por job opcional.
- Aceite: typecheck/lint/build/test e contratos relevantes verdes, inclusive checker real; run remoto terminal no candidato correto, sem skip crítico ou execução ainda em andamento aceita como sucesso.
- Prova: comandos/exit codes, matriz job→critério e run ID/SHA. Executar novamente após integração final; aprovação desta onda não transfere automaticamente ao release.

### MA-08 — fechar identidade OIDC e deadline ponta a ponta

- Origem: itens 2/3; REM-003/005; P0 no escopo ofertado; owner Backend/auth; dependências MA-04; locks API-COMPOSITION e SPA-SYSTEM se necessário.
- Entrega/superfície: `packages/modules/auth/src/oidc.ts`, handler de auth e cliente SPA correspondente, com decisão de Produto/Segurança sobre SSO ofertado, sessão, claims e UserInfo obrigatório/opcional.
- Aceite: um orçamento total propagado por handler/serviço/provider/DB aplicável; desconexão cancela trabalho; timeout não duplica efeito. Se SSO ofertado: provedor de teste real, claims/issuer/audience/nonce conforme contrato adotado, vínculo seguro a usuário/tenant/permissões, sessão e logout. Se fora do escopo: desativação verificada e decisão explícita, nunca omissão silenciosa.
- Prova: requests, cancelamento observado e testes negativos de identidade/expiração/replay. Decisão de produto ausente bloqueia só o slice dependente.

### MA-09 — minimizar dados em logs

- Origem: item 4; REM-015; P1; owner Segurança/Backend; dependências —.
- Entrega/superfície: produtor de logs brute force e logging/redaction correspondente; definir correlação/pseudonimização com owner de privacidade.
- Aceite: identificador bruto, token e payload sensível não aparecem nos sinks exercitados; correlação útil e retenção/acesso aprovados preservados.
- Prova: captura sanitizada com canários sintéticos e teste de ausência; não registrar PII real para provar ausência de PII.

### MA-10 — aplicar política de edge

- Origem: item 4; REM-014; P1; owner Segurança/Plataforma; dependências MA-09; locks API-COMPOSITION e TARGET na prova.
- Entrega/superfície: health/metrics handlers e regras do ingresso sob aprovação; separar liveness público mínimo de diagnóstico detalhado.
- Aceite: acesso externo indevido negado; probes/coletores autorizados funcionam; resposta detalhada não revela dependências/segredos. Validação local precede prova pelo ingresso de MA-28.
- Prova: matriz origem/identidade/path/resposta e teste no edge real. REM-014 só fecha após a comprovação target, não apenas middleware local.

### MA-11 — disponibilizar ambiente de verificação isolado

- Origem: itens 5/8; REM-007/010; P0 habilitador; owner Plataforma/DB; dependências —.
- Entrega/superfície: fixture isolada de PostgreSQL/Redis/API/SPA, roles de runtime, seeds sintéticos e alocação de recursos. Inspecionar scripts antes de executar reset/migration.
- Aceite: ambiente sobe com identidades exclusivas, readiness, dados conhecidos e cleanup limitado; sem socket permission bypass nem uso acidental de DB compartilhado.
- Prova: versões/configuração sanitizada, nomes dos recursos, smoke persistido e plano de cleanup. Se acesso indisponível, BLOCKED com dependência exata; não substituir banco real por mock na certificação.

### MA-12 — provar isolamento, persistência e auditoria

- Origem: itens 4/5; REM-007; P0; owner DB/Backend; dependências MA-05, MA-11; locks SCHEMA e API-COMPOSITION quando houver correção.
- Entrega/superfície: policies RLS, repositórios, migrations e testes críticos; definir allowlist por slice, nunca todos os schemas em paralelo.
- Aceite: tenants A/B em roles runtime; acesso cruzado negado; rollback atômico; auditoria append-only; migração sobre dataset representativo sem perda e com compatibilidade verificada.
- Prova: queries/requisições/roles sanitizadas, testes negativos e auditoria de efeitos. Nenhum superuser disfarçado de role de produção.

### MA-13 — provar recuperação e idempotência do worker

- Origem: item 6; REM-007/009/018; P0; owner Backend/worker; dependências MA-12; lock WORKER.
- Entrega/superfície: runner, outbox e políticas de retry/lease/DLQ por job crítico.
- Aceite: crash antes/depois de commit/publicação, lease takeover e fencing exercitados em processos reais; retries limitados, DLQ observável, replay sem duplicar efeito e invariantes preservadas.
- Prova: linha do tempo de processos, eventos e efeitos persistidos. Uma correção temporal local não prova exactly-once distribuído.

### MA-14 — provar jornadas clínicas e permissões

- Origem: itens 3/6; REM-007; P0; owner QA clínico/Backend; dependências MA-08, MA-12, MA-13.
- Entrega/superfície: testes de jornadas da matriz clínica e mínimos reparos nos módulos responsáveis, com owners humanos das invariantes.
- Aceite: jornadas persistidas com autoria, autorização, concorrência e falhas; estados inválidos rejeitados; zero skip crítico. Não inventar regra clínica ausente.
- Prova: jornada→invariante→teste→resultado, artefatos de DB/API/browser e aceite de regra pelo responsável.

### MA-15 — congelar matriz de paridade e contratos de domínio

- Origem: item 7; REM-008; P0; owner Produto/QA; dependências MA-14.
- Entrega/superfície: matriz das 11 áreas e contratos de provider; registrar o que as quatro áreas antes verificadas realmente cobrem e quando sua evidência expira.
- Aceite: cada área tem positivo, negativo, permissão, persistência, reconciliação, owner e procedimento. Definição da matriz não equivale a paridade concluída.
- Prova: `pnpm vetus:parity` com estado honesto e lacunas rastreáveis. Subtarefas MA-16–22 dependem da matriz definida; encerramento REM-008 depende dos resultados delas, evitando dependência circular.

### MA-16 — laboratório e equipamentos

- Origem: item 7; REM-019; P1, obrigatório se incluído; owner Laboratório/Backend; dependências MA-15.
- Entrega/superfície: módulos diagnostics/laboratory e adaptadores identificados no refinamento; schema só com lock SCHEMA.
- Aceite: pedido→coleta→resultado→laudo reconciliados; erro de equipamento, resultado duplicado e replay não corrompem jornada; sandbox/provider autorizado.
- Prova: mensagens sintéticas, estados persistidos e homologação do owner; simulador não substitui certificação do provider exigida.

### MA-17 — fiscal

- Origem: item 7; REM-020; P1, obrigatório se incluído; owner Fiscal/Backend; dependências MA-15.
- Entrega/superfície: módulos/adaptadores NFS-e e seus testes, isolados do ledger financeiro compartilhado.
- Aceite: emissão, rejeição, consulta e cancelamento; XML/PDF e status reconciliados; credencial sandbox e regras aceitas pelo responsável fiscal.
- Prova: protocolo/artefatos sanitizados e teste de timeout/replay; nenhuma emissão real sem autoridade.

### MA-18 — financeiro

- Origem: item 7; REM-021; P1, obrigatório se incluído; owner Financeiro/Backend; dependências MA-15.
- Entrega/superfície: payments/financial/pix e ledger, um único owner de transações compartilhadas.
- Aceite: PIX/cartão/split/refund aplicáveis, callbacks duplicados/fora de ordem e timeout sem dupla cobrança; ledger conciliado com provider sandbox.
- Prova: eventos e totais reconciliados, permissões e aceite do financeiro. Sem dinheiro real; não “corrigir” saldo manualmente para passar.

### MA-19 — marketing e consentimento

- Origem: item 7; REM-022; P1, obrigatório se incluído; owner Marketing/Backend; dependências MA-09, MA-15.
- Entrega/superfície: notifications/marketing e adaptadores de entrega; filas exclusivas de teste.
- Aceite: consentimento/opt-out, bounce, rate limit, retry e isolamento por tenant; nenhum envio a clientes reais.
- Prova: destinatários sintéticos autorizados, captura de entrega/supressão e reconciliação de status.

### MA-20 — relatórios e exportações

- Origem: item 7; REM-023; P1, obrigatório se incluído; owner Relatórios/QA; dependências MA-15.
- Entrega/superfície: reports, exports e agendamentos; não editar router global sem SPA-SYSTEM.
- Aceite: filtros, UTC/timezone, totais, CSV e delivery reconciliados à fonte; permissões, grandes volumes e isolamento corretos.
- Prova: dataset congelado, consultas esperadas, arquivos exportados e execução agendada observada.

### MA-21 — acesso, auditoria e ciclo de dados

- Origem: itens 4/7; REM-024; P1, obrigatório se incluído; owner Segurança/DPO/Backend; dependências MA-09, MA-10, MA-15.
- Entrega/superfície: RBAC/audit/DSR/retention e destinos enumerados; política de retenção é decisão humana.
- Aceite: permissões e DSR exercitados; anonimização/retensão e exceções legais tratadas conforme política aprovada em destinos, backups e integradores; teste em dados sintéticos.
- Prova: inventário de destinos, execução rastreada e aceite DPO. Este pacote não é parecer jurídico automatizado.

### MA-22 — migração e integrações transversais

- Origem: itens 5/7; REM-025; P1, obrigatório se incluído; owner Dados/Produto; dependências MA-16, MA-17, MA-18, MA-19, MA-20, MA-21; lock SCHEMA.
- Entrega/superfície: importadores e contratos transversais; preparar plano dry-run/roll-forward/rollback sobre cópia sintética ou autorizada.
- Aceite: checksums, rejeitos, retomada, idempotência e reconciliação de relações/saldos; interrupção não duplica dados; reversão ou compensação testada.
- Prova: relatórios antes/depois e resultados de recuperação. Homologação e migração de produção são autorizações distintas.

### MA-23 — capacidade, performance e soak

- Origem: item 13; REM-009/029; P0 de aceite operacional; owner SRE/Performance; dependências MA-03, MA-12, MA-13; lock TARGET.
- Entrega/superfície: perfil de carga, SLOs, scripts k6 e instrumentação; aprovar concorrência/dataset/mix/duração/percentis antes da certificação. Preservar durações e limiares obrigatórios já estabelecidos; esclarecer conflitos com a autoridade, não reduzi-los.
- Aceite: metas aprovadas atingidas sob carga/soak e dependência degradada; saturação e margem documentadas. Otimizar somente gargalo medido, por slice e regressão.
- Prova: séries/raw results, perfil, target, versões e decisão do owner. CI k6 não é automaticamente capacidade de produção.

### MA-24 — restore e game day

- Origem: itens 5/14; REM-009; P0; owner DB/SRE; dependências MA-12, MA-13; lock TARGET/SCHEMA durante drill.
- Entrega/superfície: runbooks/automação de backup e restauração isolada; aprovar RPO/RTO e abort conditions antes do ensaio.
- Aceite: recuperação cronometrada dentro das metas; consistência clínica/financeira/audit/outbox; corrupção, migration mismatch e indisponibilidade exercitados sem atingir recursos compartilhados.
- Prova: timestamps, tamanho/checksums, queries de consistência e registro de game day; existência do backup não prova restauração.

### MA-25 — traces e alertas acionáveis

- Origem: item 15; REM-028/009; P0 de aceite operacional; owner SRE/Backend; dependências MA-03, MA-09, MA-12, MA-13; locks WORKER/API-COMPOSITION/TARGET conforme slice.
- Entrega/superfície: correlação SPA→API→DB/Redis→worker→provider, alert routing, retenção/on-call e produtor de evidência do contrato MA-03.
- Aceite: incidente sintético gera trace útil e alerta entregue/acionado pelo responsável; sem payload sensível; orçamento/retention e runbook aprovados; evidência aceita pelo intake real.
- Prova: trace sanitizado, evento de alerta, recibo de atendimento e resultado do validador; JSON autodeclarando PASS é insuficiente.

### MA-26 — UX, acessibilidade e UAT reais

- Origem: item 16; REM-011; P0 de homologação; owner Frontend/UX/QA; dependências MA-14, MA-22; lock SPA-SYSTEM.
- Entrega/superfície: jornadas críticas e design system existente; preservar identidade, copy e conteúdo de negócio. Preparação de matriz pode ocorrer após MA-14; aceite final depende da paridade.
- Aceite: breakpoints reais do produto ou fallback documentado 375/768/1440; temas suportados; loading/empty/error, rede lenta, permissões, tabelas/formulários longos; teclado/foco, leitor de tela e Axe. Inspecionar console/network e render, não somente pacote de baselines.
- Prova: SHA→build→render digest→viewport/estado→inspeção→crítica independente→UAT com pessoa responsável. Usar dimensões aplicáveis da rubrica design-director e pesos normalizados; não converter NOT_RUN em nota. Aprovação visual exige ausência de Critical/High aplicáveis e evidência atual; nota editorial 60 não é score visual.
- Direção: clareza clínica/operacional, densidade útil, hierarquia de decisão, números legíveis, estados de risco inequívocos e recuperação de erro. Corrigir estrutura/tokens antes de efeitos decorativos; não redesenhar como landing page genérica.

### MA-27 — cadeia de fornecimento e promoção

- Origem: itens 12/18; REM-004/010; P0; owner Plataforma/Segurança; dependências MA-03, MA-06; locks CI-CONFIG/TARGET.
- Entrega/superfície: workflow de release, containers, SBOM/provenance/assinaturas, quarentena e promoção por digest.
- Aceite: scan antes da quarentena, artefatos finais não consumíveis antes do gate, verificação da identidade do produtor e do digest; ACL/retenção/cleanup da quarentena comprovados; sem tag mutável como identidade.
- Prova: execução autorizada em registry sandbox/target, SBOM/attestation verificados e testes de cadeia inválida. Publicação real exige autorização própria; teste de workflow não a substitui.

### MA-28 — Helm, deploy e rollback

- Origem: item 18; REM-010; P0 de aceite operacional; owner Plataforma/SRE; dependências MA-10, MA-23, MA-24, MA-25, MA-27; lock TARGET.
- Entrega/superfície: chart/configuração e procedimento de rollout/rollback; congelar alvo/digest e estratégia de compatibilidade de schema.
- Aceite: lint/template aplicáveis, readiness, rollout, smoke de negócio e reversão ao digest anterior verificados; dados permanecem consistentes; rollback de aplicação não é anunciado como rollback de dados.
- Prova: comandos target, digest efetivamente executado, observação e tempo/resultado de rollback; autoridade explícita antes de ambiente compartilhado/produção.

### MA-29 — required checks e autoridades de entrega

- Origem: itens 10/17; REM-010/012; P0; owner Lead/Plataforma; dependências MA-07.
- Entrega/superfície: registro de política e prova autenticada de branch rules/required checks; configuração remota somente com autorização.
- Aceite: candidato não pode contornar checks mandatórios pela rota de promoção adotada; aprovação corresponde a sujeito, escopo e validade atuais. HTTP 401 é UNKNOWN, não prova de ausência de regra.
- Prova: export sanitizado autenticado, regra→job mapeado e autoridade identificável; não coletar tokens no relatório.

### MA-30 — decomposição incremental da API

- Origem: item 1; REM-016; P1; owner Arquitetura/Backend; dependências MA-08, MA-10, MA-12; lock API-COMPOSITION.
- Entrega/superfície: `apps/api/src/server.ts` e slices nomeados no refinamento; preservar ordem de middleware/auth/tenant/transação.
- Aceite: redução física e de acoplamento demonstrada, não simples deslocamento do monólito; testes de caracterização e dispatch sem regressão; budgets ajustados somente com justificativa aprovada, nunca para esconder crescimento.
- Prova: diff, mapa de dependências antes/depois e regressão de fronteira. Fatiar por família de handlers, não reescrever 8.335 linhas de uma vez.

### MA-31 — decomposição e consistência da SPA

- Origem: itens 1/16; REM-017; P1; owner Frontend; dependências MA-26; lock SPA-SYSTEM.
- Entrega/superfície: router/rotas e PatientDetailPage, divididos por domínio/estado com tokens e componentes existentes.
- Aceite: aliases, guards, deep links, history/foco e carregamento de chunks preservados; menor acoplamento; rerender/revisão após mudança, sem reutilizar aprovação visual antiga.
- Prova: navegação browser, bundle/chunks e screenshots atuais. MA-35 revalida UX sobre a versão integrada.

### MA-32 — decomposição do worker

- Origem: itens 1/6; REM-018; P1; owner Backend/worker; dependências MA-13, MA-25; lock WORKER.
- Entrega/superfície: runner por família de job e políticas comuns; não duplicar regras de retry/lease.
- Aceite: redução de acoplamento; fencing, DLQ, retry e replay continuam passando em testes de processo; recuperação observável preservada.
- Prova: estrutura antes/depois, caracterização e nova execução de crash/recovery proporcional.

### MA-33 — higiene de testes, caches e falhas

- Origem: itens 8/16; REM-026/027; P1; owner DX/QA; dependências MA-06; lock DEPENDENCIES.
- Entrega/superfície: setup/fixtures/configs e caches rastreados; impedir falso verde e efeitos ambientais ocultos.
- Aceite: typecheck não altera arquivos rastreados em worktree limpo; warnings acionáveis tratados; skips críticos zerados; skips não críticos justificados; testes não dependem de dist antigo ou de ordem concorrente não declarada.
- Prova: fingerprint antes/depois, suíte sem ruído relevante e teste conhecido ruim falhando; não suprimir console globalmente para esconder erro.

### MA-34 — freshness e manutenção de excelência

- Origem: item 17; REM-030; P2; owner Lead/QA; dependências MA-01, MA-07; lock CONTROL.
- Entrega/superfície: mecanismo de validade e revisão de evidências, dependências e hotspots; preservar fontes canônicas e histórico.
- Aceite: mudança de código/contrato/ambiente/autoridade invalida evidência afetada; owners e periodicidade definidos; revisão mensal proposta registrada sem inventar execução passada.
- Prova: conhecido stale rejeitado, obrigação aberta rastreada e exercício de recuperação por novo agente. Ativação do acompanhamento pós-release depende de MA-35; sua configuração pode ser preparada antes, sem ciclo.

### MA-35 — integrar, congelar e recertificar

- Origem: item 11 e todos os demais; REM-012; P0; owner Lead + crítico final + autoridade humana; dependências MA-01 a MA-34, respeitando o escopo contratado.
- Entrega/superfície: integração única; refresh de fontes; geração dos artefatos do candidato; CI e gate completos; scorecard e autoridade finais. Decidir com o usuário qualquer entrega de excelência que se pretenda adiar; nenhum pacote obrigatório some do grafo por conveniência.
- Aceite: estado limpo/íntegro segundo política, evidência candidata atual, CI terminal verde, total>=97/críticas>=95/P0=0, critérios obrigatórios PASS, crítico final novo e autoridade humana válida. Não usar os flags de diagnóstico que omitem build/testes como prova final.
- Prova: manifesto de evidências e digests, resultados brutos verificáveis, decisão do gate e parecer independente. Se uma mudança entrar após freeze, marcar afetados STALE e repetir validação; não “reancorar” resultados antigos mudando só o cabeçalho.

## 7. Procedimentos e evidência exigida

Comandos abaixo são entradas existentes a inspecionar no `package.json`/script antes de usar. **Não foram executados nesta entrega para provar melhorias futuras.** Rodar a partir da raiz, em ambiente da tarefa; processos globais de build/teste exigem exclusividade ou isolamento.

| Propósito | Entrada |
| --- | --- |
| Identidade/estado | `git status --short`, `git rev-parse HEAD` |
| Reproduzir DEEP-01 | `node --test scripts/critical-source-manifest.test.mjs` |
| Contrato do checker | `node --test scripts/check-critical-coverage.test.mjs` |
| Coverage real | `node scripts/check-critical-coverage.mjs` — inspecionar path histórico; MA-05 deve corrigir intake antes de certificação |
| OpenAPI | `pnpm validate:openapi` |
| Documentação | `pnpm docs:validate` |
| Dependências/supply chain | `pnpm audit --json`, `pnpm validate:supply-chain` |
| Regressão | `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` |
| Paridade | `pnpm vetus:parity` |
| Gate integrado | `pnpm release:triple-a` — somente com ambiente/evidências completos para alegação final |

Entradas adicionais inspecionadas para refinamento, não executadas nesta entrega:

| Fronteira | Comandos existentes e restrição |
| --- | --- |
| Contrato do gate | `pnpm exec vitest run tests/unit/infra/triple-a-release-gate.test.ts --config vitest.config.ts`; `node --test scripts/generate-triple-a-evidence-package.test.mjs` |
| Shards Vitest | `node scripts/run-critical-coverage-shard.mjs vitest-unit` e `node scripts/run-critical-coverage-shard.mjs vitest-integration` |
| Shards nativos/processos | `node scripts/run-native-critical-coverage.mjs native-api`, `node scripts/run-native-critical-coverage.mjs native-worker`, `node scripts/run-process-critical-coverage.mjs`; exigem ferramentas/plataforma e isolamento inspecionados |
| Banco/processos | `pnpm test:critical`, `pnpm test:critical:process`, `pnpm test:critical:soak`; podem alterar banco e iniciar processos |
| Visual | `pnpm test:visual`, `pnpm test:usability-certification`; o primeiro mata portas por wrapper, o segundo só testa empacotamento |
| Carga | `pnpm benchmark:k6:seed`, `pnpm benchmark:k6`, `pnpm benchmark:k6:parse`; seed altera dados e carga exige alvo autorizado |
| Recuperação | `pnpm ops:restore:drill:fixture:representative`, `pnpm ops:restore:drill:v2`, `pnpm ops:game-day:ephemeral`; inspecionar efeitos e autoridade antes de executar |
| Helm | `pnpm validate:helm`; não equivale a deploy/rollback no alvo |

Runners e configs de coverage também contêm paths históricos: MA-05 deve parametrizar **toda a cadeia**, não só o checker. Não presumir flags `--output`/`--artifacts` inexistentes. MA-11 deve verificar Linux/procfs e binários PostgreSQL/Redis requeridos pelos runners nativos.

Para PostgreSQL/browser/k6/restore/Helm/providers, o despacho deve citar script/config real e flags inspecionados, target, recursos e autorização. Um procedimento a definir não é comando executado. Scripts de bootstrap/reset e banco podem ser destrutivos: nenhuma execução automática por nome “test”.

Contrato mínimo de evidência por tentativa: task/acceptance IDs; commit e hash das fontes/contratos; ambiente e ferramentas; data UTC; comando/procedimento; exit code e status; input/raw result sanitizados; hashes e localização durável; produtor e revisor distintos; limitações; freshness; autoridade aplicável. O verificador recalcula o que puder a partir dos raw inputs; não aceita score/pass flag do produtor como prova autêntica.

## 8. Prompts prontos para despacho

### Lead — iniciar a execução autorizada

```text
Leia as instruções aplicáveis, o relatório profundo e o roadmap/backlog multiagente
de 12/09/2026 em docs. Confirme a autorização desta sessão antes de implementar.
Recupere estado/ExecPlan/backlog/ledgers e git status; preserve todo trabalho existente.
Execute MA-01 primeiro e registre uma única próxima ação.
Use até dois builders e reserve revisão; sem agentes descendentes.
Selecione apenas pacotes com dependências verificadas e allowlist/recursos exclusivos.
Não despache MA-35 como atalho. Não reduza thresholds nem invente autoridade.
Ao integrar cada slice, rode teste focal, crítico fresco, regressão e refresh de evidência.
Pare na fronteira humana/externa que exigir nova autorização; avance trabalho independente.
```

### Builder — preencher o pacote antes de enviar

```text
Papel: builder do MA selecionado, sem descendentes.
Objetivo/inputs: copiar a entrega e as origens do cartão, com caminhos exatos atuais.
Dependências: anexar resultados verificados e versões dos contratos.
Pode editar: allowlist de arquivos e recursos concretos definida pelo Lead.
Proibido: outros arquivos, estados/ledgers compartilhados, publicação e dados reais.
Aceite: copiar critérios do cartão e adicionar comando/teste de fronteira por critério.
Recursos: worktree, DB/schema/Redis/filas/ports e artifact dir exclusivos nomeados.
Reproduza a falha, implemente o menor slice, execute positivo/negativo e regressão.
Se faltar contrato, authority ou edição fora da allowlist, reporte sem expandir escopo.
Retorne IMPLEMENTED/BLOCKED/FAILED, diff, comandos/exits, raw artifacts/hashes,
limitações e próximo passo. Nunca autoaprovar DONE nem inventar testes executados.
```

### Crítico — nova identidade e contexto sem histórico

```text
Você é crítico read-only do artefato indicado. Não edite, não gere caches no repo
e não crie agentes. Receba somente objetivo, critérios originais, artefato versionado,
instruções e procedimento seguro; não leia racional do builder ou pareceres anteriores.
Inspecione a fronteira real e conhecidos bons/ruins aplicáveis.
Retorne APPROVE/REJECT/BLOCKED com evidência por critério, maior lacuna,
severidade/confiança, independência e fingerprint antes/depois.
Não aprove UX sem render atual, dados sem persistência real ou release sem autoridade.
```

## 9. Integração, recuperação e encerramento

Para cada pacote: reproduzir → construir slice → executar → criticar → corrigir → retestar → integrar. Lead verifica diff e sentinel do crítico; crítico que escrever invalida a revisão e suas alterações são preservadas para inspeção, não apagadas automaticamente.

Nas frentes subjetivas visuais materiais, usar duas críticas frescas independentes sobre renders/critério, sem auto-score do builder; adjudicação nova se houver divergência material. O crítico final de release deve ser distinto dos anteriores. I1 ajuda a revisão, mas não representa usuário clínico, DPO ou autoridade de release.

Mudança de contrato suspende dependentes; mudança de fonte invalida evidência correspondente. Ao retomar: conferir processos ainda vivos, arquivos, recursos externos e efeitos incompletos antes de repetir qualquer operação. Manter log de falhas; rollback de código é revisão controlada do slice, não `git reset --hard`; recuperação de dados exige procedimento/autoridade próprios.

Fechar um pacote apenas após integração e evidência atual; registrar task/backlog primeiro, verificação/log depois e ponteiro de estado por último, pelo único Lead. O novo documento não importa status fictícios nos controles existentes.

**Próximo passo corrente:** Agente 1 executar MA-02-F-NATIVE-R1: inventário integral ausente deve reprovar --check quando requiredShards exige nativos. Ver [auditoria independente e consolidação](2026-09-12-auditoria-native-ma04-s1.md). R3 já integrado; MA-04 tem omissão de teste a tratar separadamente em MA-02-F-DISPATCH. S1 aguarda aceite e identidade final; nenhuma coleta ou certificação é liberada por estes handoffs.

## 10. Atualização operacional — INTEGRATE-R3 → MA-02-F-NATIVE (2026-09-12)

- MA-03-R3: APPROVE I1 local integrado (48/48 evidências digest-bound conferidas; 8 hashes do
  parecer sem drift). Release continua BLOCKED / NOT PROVEN; `PENDING_AUTHORITY` preservada.
- MA-02-F-NATIVE (extensão de MA-02): descoberta AST canônica extraída e reutilizada;
  `nativeTests` reconciliados pelo tooling (worker 11→12, API 71→73; executionInputs 2116→2119;
  revisão 2→3). `--check` detecta divergência sem escrever; refresh idempotente; manifesto
  anterior preservado byte a byte. Pacote IMPLEMENTED / REVIEW REQUIRED.
- MA-05-S1 permanece BLOCKED até o aceite independente de MA-02-F-NATIVE; depois, re-despacho
  com novo runId. As 193 fontes especializadas e as fontes fora de `files` continuam decisões
  separadas; nenhum threshold (82/85 ou 97/95/0) foi alterado.

## 11. Atualização operacional — MA-02-F-NATIVE-R1 (2026-09-12)

- Achado independente F-NATIVE-R1-01 reparado: `--check` rejeita ausência integral de
  `nativeTests` quando `requiredShards` exige native-api/native-worker; null/array/string,
  shard obrigatório ausente/vazio, omissões, duplicatas, shard errado e entradas fora de
  `executionInputs` falham; formato legado sem obrigação nativa permanece aceito e testado.
- `scripts/lib/critical-source-identity.mjs` `d2136513…` → `475a2e9f…`; manifesto revisão 3
  inalterado (`8f622ac2…`). Sem S1, sem instalação/build/DB/coverage.
- Sequência: revisão independente de MA-02-F-NATIVE-R1 → MA-02-F-DISPATCH → congelamento do
  candidato de S1. Thresholds e as 193 fontes especializadas inalterados; release BLOCKED.
