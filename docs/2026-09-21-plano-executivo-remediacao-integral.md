---
document_status: historical
document_kind: plan
effective_date: 2026-09-21
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
superseded_by: docs/2026-09-26-plano-executivo-rodada-2.md
---

# Plano executivo de remediação integral

[Auditoria](2026-09-21-auditoria-profunda-repositorio.md) ·
[Roadmap](2026-09-21-roadmap-remediacao-integral.md) ·
[Backlog](2026-09-21-backlog-remediacao-integral.md) ·
[Prompt Codex](2026-09-21-prompt-codex-remediacao-integral.md)

## Propósito

Levar o CVG-HIS V4 do estado auditado de **68/100 / release bloqueado** para um
candidato publicável, reproduzível e aprovável, fechando os 33 achados sem
reduzir thresholds, mascarar falhas ou promover evidência local como prova de
CI, target ou autoridade humana.

O programa é classificado como brownfield crítico/T4: atravessa código clínico,
dados multitenant, pagamentos, segurança, migrations, CI, imagens, operação e
governança. A execução deve ser incremental, recuperável e vinculada ao mesmo
SHA em cada gate.

## Resultado esperado

O programa termina somente quando:

1. o Git pode ser publicado sem blobs proibidos e sem perda de trabalho;
2. build, typecheck, lint real, testes, coverage e complexidade passam no Node
   suportado, sem skips proibidos;
3. CI, imagens, SBOM, scans, assinaturas e attestations apontam para o mesmo SHA;
4. RLS, migrations, recovery, restore, rollback, carga e observabilidade são
   observados no target aprovado;
5. as 11 áreas de paridade possuem implementação e evidência apropriadas;
6. UAT, acessibilidade e aprovações humanas estão registradas por autoridades
   reais;
7. todos os itens obrigatórios da Quality Bar estão atuais e nenhum P0 está
   aberto;
8. uma reauditoria independente determina `RELEASE_READY` sem substituir a
   decisão formal de go/no-go.

## Princípios de execução

- Segurança de dados e preservação do histórico precedem velocidade.
- Um gate reprovado permanece reprovado; não reduzir cobertura ou remover
  assertions para obter verde.
- Código, CI, OCI, configuração e evidência devem compartilhar uma identidade.
- Evidência é fresca somente após a última mutação aplicável.
- Alterações pequenas e verticais são preferidas a refatorações horizontais.
- Cada item passa por `TODO → READY → IN_PROGRESS → VERIFY → DONE` no controle
  operacional; `DONE` exige evidência atual.
- Falta de credencial, ambiente ou autoridade é `BLOCKED`, nunca `PASS`.
- O backlog documental especifica o trabalho. Durante a execução,
  `.agent/backlog.json` permanece a única fonte de status mutável e deve ser
  reconciliado, não substituído.

## Limites de autoridade

O agente pode inspecionar, editar e testar localmente dentro do repositório. Ele
deve parar e pedir autorização específica antes de:

- reescrever histórico Git, fazer force-push ou apagar commits/branches;
- fazer push, publicar imagem/pacote, alterar branch protection ou secrets;
- usar credenciais, dados clínicos/pessoais ou providers reais;
- executar restore, rollback, chaos ou carga em ambiente compartilhado;
- fazer deploy/cutover ou alterar infraestrutura externa;
- registrar UAT, aceite LGPD, segurança, operação ou go/no-go em nome de pessoas.

O preparo, scripts, fixtures, checklists e validações dry-run dessas ações pode
ser implementado sem falsificar sua execução.

## Estratégia por milestones

### M0 — controle, preservação e baseline reproduzível

Objetivo: iniciar a remediação sem perder os 79 commits locais e sem corromper
o control plane.

Entregas:

- inventário e backup verificável das refs/blobs relevantes;
- proposta de limpeza de histórico, sem executá-la sem aprovação;
- ambiente Node 22.23.2 reproduzível;
- reconciliação inicial entre esta documentação e `.agent`;
- baseline das falhas de coverage e complexidade preservada.

Gate de saída: plano de recuperação testável, árvore preservada e ambiente
oficial capaz de reproduzir as falhas atuais.

### M1 — candidato local publicável

Objetivo: remover bloqueadores locais e obter um SHA que possa ser enviado ao
remoto.

Entregas:

- estado Gauntlet externalizado/compactado e blob proibido removido do intervalo
  de push mediante autorização;
- seis falhas de coverage corrigidas pelo contrato correto;
- `pnpm test` cobrindo raiz e workspaces;
- branch coverage igual ou superior a 82%, sem baixar o threshold;
- complexidade novamente dentro do limite por decomposição real;
- Helm real, lint e shards de integração padronizados;
- documentação e identidade coerentes com o novo SHA.

Gate de saída: build, typecheck, lint, test, coverage, critical bootstrap,
complexity, security, docs e validadores passam em checkout limpo no Node
22.23.2.

### M2 — CI, release e supply chain candidate-bound

Objetivo: provar o candidato fora da estação local.

Entregas:

- push autorizado do SHA congelado;
- todos os jobs requeridos verdes nesse SHA;
- imagens API, worker e SPA construídas uma única vez;
- digest, SBOM, scan, assinatura e attestation verificáveis;
- release consome os artefatos aprovados sem rebuild silencioso;
- branch governance e manifest final registrados.

Gate de saída: CI/release terminal no SHA exato e `ci_sha`/`release_sha`
preenchidos com evidência externa atual.

### M3 — dados, resiliência e operação no target

Objetivo: provar segurança e recuperabilidade onde o sistema será operado.

Entregas:

- RLS/FORCE RLS com roles reais e casos cross-tenant negativos;
- migrations fresh install, upgrade, mixed-version, locks e rollback;
- crash/restart do worker sem duplicidade;
- backup/restore/rollback com RPO/RTO medidos;
- carga, soak, SLO, filas, conexões, dashboards e alertas exercitados.

Gate de saída: relatórios target-bound aprovados por Platform, DBA/SRE,
Security e Operations.

### M4 — paridade, integrações e experiência

Objetivo: fechar as sete áreas de produto ainda não verificadas.

Entregas:

- laboratório e providers;
- fiscal e homologação municipal;
- cartões, PIX, conciliação, estorno e falhas parciais;
- marketing, bounce e consentimento;
- família completa de relatórios Vetus;
- usuários, acessos, LGPD e retenção;
- Live Pet, Live Lab e integração Vetus;
- UAT hospitalar, acessibilidade e browser matrix.

Gate de saída: 11 de 11 áreas classificadas e verificadas, com aceite dos donos
de domínio e sem dados reais indevidos na evidência.

### M5 — arquitetura, qualidade e sustentabilidade

Objetivo: reduzir risco de manutenção sem desestabilizar o candidato.

Entregas:

- decomposição de `server.ts`, páginas SPA, relatórios e worker runner;
- lint semântico uniforme e testes mínimos por pacote;
- redução explícita de `any` em fronteiras críticas;
- feedback de testes mais rápido e limpo;
- política de retenção de artefatos e compactação Git;
- correções menores de ESM, `.gitignore` e nomes de testes.

Gate de saída: limites de complexidade melhoram, contratos públicos não mudam
sem decisão, e toda fatia possui regressão.

### M6 — reconciliação e decisão final

Objetivo: provar que implementação, documentação, controle e evidência contam a
mesma história.

Entregas:

- Quality Bar, identidade, P0 registry, `.agent`, documentos e evidência
  reconciliados;
- reauditoria completa sobre checkout limpo e artefatos finais;
- parecer independente;
- pacote de decisão go/no-go com riscos residuais.

Gate de saída: zero P0, critérios críticos dentro da régua, evidência fresca e
decisão explícita das autoridades. O agente prepara o pacote; humanos concedem
ou negam o release.

## Quality Bar do programa

| ID | Critério obrigatório | Evidência mínima |
| --- | --- | --- |
| QB-01 | Preservação do trabalho | refs/backup verificáveis e recuperação ensaiada |
| QB-02 | Git publicável | nenhum blob acima do limite no intervalo de push |
| QB-03 | Qualidade local | build/typecheck/lint/test/coverage/complexity exit 0 |
| QB-04 | Testes honestos | raiz + workspaces; skips enumerados e autorizados |
| QB-05 | Banco crítico | migrations e suítes críticas em PostgreSQL descartável |
| QB-06 | Segurança | segredos, dependências, auth/RLS e scans sem blocker |
| QB-07 | Identidade | fonte, CI, OCI, config e evidência no mesmo SHA |
| QB-08 | Recuperação | restore/rollback e RPO/RTO observados no target |
| QB-09 | Desempenho | perfil aprovado, carga/soak e SLO sem violação bloqueante |
| QB-10 | Produto | paridade 11/11 com evidência por fluxo |
| QB-11 | Acessibilidade/UAT | aceite humano documentado e rastreável |
| QB-12 | Release | zero P0, pareceres e go/no-go válidos |

## Indicadores executivos

- quantidade de P0 abertos e idade do mais antigo;
- distância entre HEAD, candidato, CI e release SHA;
- maior blob e tamanho do pack Git;
- gates locais verdes/total e taxa de skips;
- cobertura de branches e número de testes falhando;
- tamanho dos hotspots e tendência por milestone;
- áreas de paridade verificadas de 11;
- RPO/RTO medidos versus aprovados;
- p95/p99, erro, backlog de fila e saturação durante soak;
- evidências target/humanas atuais versus requeridas.

## Riscos e controles

| Risco | Controle |
| --- | --- |
| Perda dos 79 commits ao limpar histórico | backup de refs, clone/cópia de recuperação, dry-run e autorização |
| Gate verde artificial | thresholds congelados, known-bads e revisão do diff |
| Evidência stale promovida | invalidar por mutação e vincular ao SHA |
| Refatoração quebrar fluxo clínico | fatias verticais pequenas e regressão crítica |
| Uso indevido de dados/credenciais | fixtures sintéticas, secrets externos e autoridade explícita |
| Ações externas irreversíveis | preparação local e pausa no boundary humano |
| Duas fontes de backlog | status somente em `.agent`; docs definem contrato/escopo |

## Recuperação e continuidade

Ao retomar o programa, o agente deve ler, nesta ordem:

1. instruções aplicáveis do repositório;
2. esta auditoria, plano, roadmap e backlog;
3. `.agent/state.json`, `.agent/backlog.json`, plano ativo e cauda dos ledgers;
4. `git status`, HEAD/origin e identidade do candidato;
5. a última evidência da tarefa selecionada.

Em divergência, preservar os fatos anteriores, registrar a correção e atualizar
artefato → backlog → evidência/log → state por último. Nunca reescrever ledgers
append-only para ocultar uma falha.

## Estado inicial deste plano

Em 21/09/2026, todos os milestones deste novo programa estão **PLANEJADOS**.
Os resultados locais registrados na auditoria são baseline, não conclusão das
tarefas futuras. A primeira ação segura é `REM-001`: preservar refs e produzir
um plano verificável para o blob proibido, antes de qualquer reescrita.
