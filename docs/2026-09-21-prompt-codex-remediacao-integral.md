# Prompt mestre para Codex — remediação integral CVG-HIS V4

Este prompt foi preparado a partir da auditoria de 21/09/2026. Cole o bloco
abaixo em uma nova sessão Codex iniciada na raiz `/home/ricardo/cvg-his-v4`.

```text
Você é o agente Codex responsável por executar integralmente o programa de
remediação do repositório CVG-HIS V4. Trabalhe como um único agente primário;
não delegue para subagentes sem nova autorização explícita.

OBJETIVO

Implementar e verificar todas as melhorias especificadas nestes documentos,
tratando-os como o pacote de entrada do programa:

1. docs/2026-09-21-auditoria-profunda-repositorio.md
2. docs/2026-09-21-plano-executivo-remediacao-integral.md
3. docs/2026-09-21-roadmap-remediacao-integral.md
4. docs/2026-09-21-backlog-remediacao-integral.md

O baseline auditado é o HEAD
ad2f0373f68635f2579253b013a4382219906921, inicialmente 79 commits à frente de
origin/main, nota 68/100 e estado RELEASE_BLOCKED. O programa possui os achados
F-001...F-033 e as tarefas REM-001...REM-055. Não omita silenciosamente nenhum
item.

INSTRUÇÕES DE ENTRADA

1. Antes de editar, leia integralmente os quatro documentos acima.
2. Descubra e siga todas as instruções AGENTS.md/AGENTS.override.md aplicáveis.
3. Use os skills disponíveis que correspondam ao trabalho. Para este programa,
   use obrigatoriamente engineering-framework e siga suas regras de recovery,
   ExecPlan, Quality Bar, evidência, traceabilidade e autoridade.
4. Como já existe um control plane em .agent, execute Session Recovery antes de
   alterar backlog/state/ledgers. Não reinicialize nem sobrescreva .agent.
5. Inspecione no mínimo:
   - git status, HEAD, origin/main, refs e tamanho dos blobs;
   - .agent/state.json, .agent/backlog.json, plano ativo e cauda dos ledgers;
   - docs/document-governance.json e docs/triple-a/QUALITY_BAR_V1.json;
   - package.json, pnpm-workspace.yaml, CI, configs de teste e manifests;
   - código/testes diretamente citados na auditoria.
6. Reconcile os IDs REM-001...REM-055 com o backlog operacional existente sem
   criar uma segunda fonte de status. O documento em docs define o contrato; o
   status vivo fica em .agent/backlog.json.
7. Crie ou repare um ExecPlan living em .agent/plans/ para este resultado T4 e
   mantenha uma única próxima ação canônica.

REGRAS NÃO NEGOCIÁVEIS

- Preserve todo trabalho do usuário e mudanças preexistentes.
- Não use git reset --hard, git checkout --, clean destrutivo ou remoção ampla.
- Não reescreva histórico Git, não faça force-push e não apague refs antes de:
  a) concluir REM-001; b) demonstrar backup/recuperação; c) apresentar dry-run;
  d) receber autorização humana explícita para a ação exata.
- Não faça push, deploy, publicação de OCI/pacote, alteração de branch
  protection/secrets, uso de credenciais reais, restore/rollback/chaos/carga em
  ambiente compartilhado ou cutover sem autorização específica.
- Nunca use dados clínicos, pessoais ou financeiros reais em evidências.
- Não declare UAT, LGPD, segurança, operação, autoridade de release ou go/no-go
  em nome de humanos.
- Não reduza thresholds, remova assertions, aumente limites de complexidade,
  exclua arquivos de cobertura ou transforme testes em skip para obter verde.
- Não trate mock, documentação, arquivo existente ou execução histórica como
  prova atual de runtime/CI/target.
- Não marque DONE sem procedimento executado, evidência CURRENT e dependências
  satisfeitas. Implementação passa primeiro para VERIFY.
- Uma mutação relevante invalida a evidência anterior correspondente; reexecute.
- Se um comando falhar, preserve o primeiro erro, diagnostique a causa, faça uma
  mudança coerente e reexecute o teste focal antes da regressão ampla.

MODO DE EXECUÇÃO

Execute o backlog em ordem de dependência e risco, começando por REM-001.
Continue autonomamente enquanto existir trabalho local, seguro, reversível e
READY. Quando encontrar um blocker externo/humano:

1. conclua a preparação local que não dependa da decisão;
2. registre evidência, limitação e próxima ação exata;
3. marque a tarefa BLOCKED no control plane;
4. siga para outra tarefa READY independente;
5. somente pare a execução inteira quando não houver mais progresso seguro ou
   quando a próxima ação for materialmente destrutiva/externa e exigir autoridade.

Use o ciclo para cada tarefa:

UNDERSTAND → LOCATE → PLAN → IMPLEMENT → RUN → TEST → INSPECT → SELF-REVIEW
→ FIX → VERIFY → UPDATE TRACEABILITY/CONTROL PLANE

Implemente fatias verticais pequenas. Não agrupe refatorações não relacionadas.
Antes de cada mudança, identifique chamadores, contratos, dados, segurança,
testes, deploy e documentação afetados. Edite arquivos manuais com patches
focados e artefatos gerados por seus geradores.

ORDEM DO PROGRAMA

Fase 0 — Preservação e reprodução
- REM-001: backup/refs/hashes/plano de history rewrite.
- Preparar REM-002 e parar antes da reescrita para pedir autorização.
- Executar REM-003–REM-008 no Node 22.23.2/pnpm 10.33.0.

Fase 1 — Gates locais e publicabilidade
- Executar REM-013–REM-017 e REM-026 conforme dependências.
- Fechar REM-009, depois REM-010–REM-012 e REM-018.
- Para REM-002, só executar a reescrita após autorização; depois provar que o
  intervalo de push não contém blob >100 MiB e que todos os commits necessários
  continuam recuperáveis.

Fase 2 — CI/release
- Solicitar autorização antes de REM-019.
- Executar REM-019–REM-021 somente com acesso e autoridade.
- Exigir o mesmo SHA para CI, imagens, digest, SBOM, scan, assinatura,
  attestation, manifest e release; proibir rebuild silencioso.

Fase 3 — Target
- Preparar scripts/fixtures/checklists de REM-022–REM-025 e REM-030 localmente.
- Executar no target apenas com ambiente, credenciais e autoridade aprovados.
- Depois executar REM-031–REM-032.

Fase 4 — Produto e UAT
- Obter decisões de domínio em REM-033.
- Implementar e homologar REM-034–REM-040.
- Executar REM-041–REM-043 com participantes e autoridades reais.

Fase 5 — Sustentabilidade
- Executar REM-027–REM-029 e REM-044–REM-052 sem desestabilizar um candidato
  congelado; se houver mutação após freeze, gerar novo freeze e recertificar.

Fase 6 — Fechamento
- Executar REM-053 e REM-054.
- Preparar REM-055, mas a decisão de go/no-go pertence às autoridades humanas.

VERIFICAÇÃO MÍNIMA LOCAL

Descubra os comandos atuais no repositório e confirme seus efeitos. A matriz
esperada inclui, no mínimo, quando aplicável:

- instalação frozen no Node suportado;
- pnpm build;
- pnpm typecheck;
- lint semântico e typecheck separados;
- comando canônico de testes raiz + workspaces;
- pnpm test:coverage com branches >= 82%;
- pnpm test:critical:bootstrap em PostgreSQL descartável;
- pnpm complexity:check;
- pnpm security:enterprise e scan de segredos;
- pnpm validate:openapi;
- pnpm validate:rls;
- pnpm validate:helm usando Helm real;
- pnpm validate:supply-chain;
- pnpm validate:dependencies;
- pnpm validate:candidate-identity;
- pnpm validate:p0-registry;
- pnpm docs:validate;
- testes focais e known-bads de cada tarefa.

Não presuma que nomes/comandos continuam idênticos; inspecione package.json e a
CI. Registre comandos, exit status, ambiente e limitações. Não execute E2E que
mate portas/processos do usuário sem primeiro verificar propriedade e escopo.

CRITÉRIOS DE CONCLUSÃO

O programa técnico só pode receber PASS quando:

- REM-001...REM-054 estiverem DONE com evidência atual;
- nenhum P0 permanecer aberto;
- Git estiver publicável e recuperável;
- todos os gates locais e remotos obrigatórios passarem;
- fonte, CI, OCI, target e evidência apontarem para o mesmo SHA;
- RLS, migrations, worker recovery, restore/rollback e performance tiverem prova
  target-bound;
- paridade estiver 11/11 e UAT/a11y tiverem aceite real;
- Quality Bar, docs, P0 registry e .agent estiverem reconciliados;
- reauditoria e crítica independente não encontrarem blocker.

Mesmo assim, REM-055 e o release final exigem decisão humana explícita. Se ela
não existir, o estado correto é TECHNICALLY_READY / HUMAN_RELEASE_BLOCKED, não
RELEASED.

COMUNICAÇÃO E CHECKPOINTS

- Mantenha atualizações curtas durante trabalho longo.
- Ao final de cada tarefa/material checkpoint, informe: mudança, teste realmente
  executado, resultado, limitações, risco residual e próxima ação.
- Atualize control plane na ordem: artefato/tarefa → backlog →
  verificação/execution log → state por último.
- Não reescreva ledgers append-only para corrigir história; acrescente correção.
- Antes de encerrar uma sessão, deixe o repositório recuperável e a próxima ação
  exata no ExecPlan/control plane.

COMECE AGORA

Faça a recuperação do estado existente, confirme que os documentos do programa
estão presentes, inspecione o worktree sem modificá-lo e inicie REM-001. Produza
o inventário, backup verificável e dry-run da estratégia para
.gauntlet/state.json. Não execute a reescrita do histórico sem minha autorização
explícita. Enquanto aguarda essa autoridade, avance nas tarefas locais
independentes REM-003–REM-008.
```

## Resultado esperado do primeiro ciclo

O primeiro ciclo do agente deve terminar com:

- recovery do control plane concluído;
- `REM-001` verificável;
- proposta segura para `REM-002`, ainda não executada sem autorização;
- Node oficial configurado;
- falhas de coverage reproduzidas e correções de contrato iniciadas;
- próximo checkpoint registrado sem alegar release readiness.
