# Frontend CVG Pulse — ExecPlan

<!-- engineering-framework: active_action_id=FEA-external-uat-gate -->

## Reconciliação corrente do plano — 09/09/2026

As etapas iniciais e os itens históricos restantes de `Concrete Steps` abaixo
são preservados; o item 1 foi reconciliado para a próxima ação executável do
candidato atual. A reconciliação vigente é:

- O candidato atual tem evidência válida bounded do browser local no archive
  `artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current12-20260909/`:
  420/420 testes, 150 rotas e 300 navegações, com validator e cleanup
  confirmados. O `full-current7-20260909` permanece preservado como histórico.
- A matriz cross-browser corrente está fingerprintada em
  `docs/frontend/implementation/evidence/cross-browser-current5-20260909.manifest.json`;
  a medição laboratorial de performance e as provas focadas também estão
  atualizadas. Esses recortes não são aceite humano, de campo, dispositivo,
  produção ou AT real.
- A jornada FEA-024 foi recapturada no candidato atual em
  `docs/frontend/implementation/evidence/continuity-scpRq4/report.json`:
  `16/16`, quatro rotas, nove interações, dois temas e 1440/390, sem falhas e
  com `inputsStable=true`; a inspeção visual do Lead cobriu lista mobile, mapa
  desktop e detalhe mobile dark. Isso renova a prova bounded sem criar parecer
  independente ou fechar touch/zoom, leitor de tela, operação clínica ou UAT.
- FEA-025 também tem recapturas correntes: PIX em
  `continuity-kPxWqj` (`4/4`, `202`/pending → settled, QR e idempotência) e
  dinheiro em `continuity-oIF3nA` (`4/4`, reversão explícita, motivo,
  idempotência e recuperação após reload); os testes SPA financeiros focados
  passaram `64/64`. A API disponível não define uma
  confirmação/reversão manual segura de PIX; o SPA mantém despacho/polling e
  não inventa um comando financeiro.
- A integração corrente de contexto da Agenda foi recapturada em
  `docs/frontend/implementation/evidence/continuity-oaR48z/report.json`:
  `30/30` linhas, cinco aliases, dois temas e 1440/768/390, sem falhas e com
  `inputsStable=true`. O relatório tem SHA
  `825d72b207610e70df94245b1d02d0875cf006d98885b2b5f1533993b3180514` e o
  harness corrente tem SHA
  `c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`;
  capturas reais foram inspecionadas pelo Lead, sem sign-off independente.
- A proteção corrente do formulário de paciente foi recapturada em
  `docs/frontend/implementation/evidence/continuity-ltIKmD/report.json`:
  seis combinações e 38 interações em 1440/390 e viewport CSS proxy 195×422,
  claro/escuro, sem falhas e com `inputsStable=true`. O relatório tem SHA
  `158f05c96e7c47f3c5ef7dd235ab18f264be42a5cabe81bfcd3c8b190a65f513` e cobre
  validação com foco, troca de `ownerId`, erro/sucesso, desmontagem e logout;
  a inspeção visual do Lead não é sign-off independente.
- A performance foi recapturada após reconstrução do `apps/spa/dist` em
  `docs/frontend/implementation/evidence/performance-current-20260909.json`:
  494 arquivos, 3.882.751 B, fingerprint
  `f97a8535841c6af7de4e7157d362ce4b069c8c26039cb378e8964fa36f0a7540`, entry
  76.924 B gzip e FCP/LCP máximos 232/124/188 ms por rota, sem long tasks ou
  erros. O relatório tem SHA
  `4742bea9cd24933c1e0dc601b2c2778d3b7d988400bf12ef1b5cf0b3e63355d4` e
  harness SHA `5a52ef1647141a36cfae8a746855816a96115aed39aed364823d1586040c29dc`;
  continua `HOLD_FOR_OWNER_APPROVAL` por ser laboratório sem RUM/INP/CLS de
  campo, rede lenta real ou participantes.
- A matriz corrente do dashboard por função está registrada em
  `docs/frontend/implementation/evidence/dashboard-current-20260909.manifest.json`:
  `20/20` combinações em cinco perfis, dois temas e 1440/390, sem falhas e com
  prioridade contextual, rotas persistidas, command palette e permissões
  exercitadas. O relatório `continuity-Tt90aV` tem SHA
  `653f599105e807514afe925c2690596585d74f95610fba8f2bc24f9a43110cb3`;
  os nove testes unitários da página passaram. É prova bounded sem RLS/papéis
  de produção, touch/zoom nativos, leitor de tela, métricas humanas ou UAT.
- As recapturas correntes de recepção e duplicidade estão fingerprintadas em
  `reception-current-20260909.manifest.json` (`continuity-21Izko`, `4/4`) e
  `duplicate-current-20260909.manifest.json` (`continuity-rXZgpi`, `8/8`),
  cobrindo fila/busca/ownerId e conflitos de tutor/paciente com preservação de
  draft, claro/escuro e 1440/390. Ambas usam o harness
  `c3bfafbe709eeb04bf2144b875a4333b0a3f9d2c9971dc7a11ef543a72f57b78`; são
  bounded e não encerram operação real, persistência/RLS, dispositivos/AT ou
  UAT.
- Dois críticos I1 independentes, read-only e em contexto novo, foram
  executados: Singer para FEA-027/028/029/030 e Hypatia para
  FEA-009/014/016/019/021/030/033. Ambos retornaram `BLOCKED`, sem score ou
  aprovação, porque a sessão externa recebeu `401` no login e foi redirecionada
  nas rotas privadas. Os registros sanitizados são
  `evidence/critic-functional-current-20260909.json` e
  `evidence/critic-visual-current-20260909.json`; a auditoria de mutação não
  encontrou alteração pelos críticos. O bloqueio confirma a lacuna de acesso
  para revisão independente e não invalida os recortes sintéticos bounded.
- A próxima ação singular é obter data, participantes e responsável externo
  para executar o protocolo UAT de FEA-002/033 e registrar a ata/aceite; em
  paralelo, o proprietário deve decidir o budget e os gates de produção
  restantes (FEA-003/025/031/034).
- O estado permanece `VERIFY / ACTIVE / HOLD`, sem `DONE`, `AAA` ou `GO`.
  Sem UAT/participantes, owner acceptance, RUM/INP/CLS de campo, touch/zoom/
  leitor de tela reais e confirmação do ciclo PIX/reversão, não há promoção
  integral.

## Recaptura integral mais recente — 09/09/2026

O runner serial mais recente foi executado contra PostgreSQL nativo descartável
e Redis DB15, com migrações/seed reais, Chromium serial e inventário completo.
O archive validado é
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current12-20260909/`:
Chromium 145.0.7632.6, `420/420` casos, zero skipped/unexpected/flaky, 150
rotas e 300 navegações. O validator confirmou
`inventoryDigest=c6e03c4ac969ce9a30fb0e4d04042c79a34ff3050c9aa0e34bf997f55dbf3a4c`.
Os hashes são `results.json=a20defbbe0611beb87e317e5d381f2002afe8c02ebfdffdd1d096cf207b259f2`,
`metadata.json=e4ab9914821b6642c4cff9d41801ceec76c49bdc9e27398756714b562aec12b`,
inventário `27a6ad63fc4aeb6a608d5d805d06d96fd61e2a47dfdc0dc85f12810da867a682` e
discovery `8a2e786ca1db6c0dc24c2aa52491bd06bc61e2754bb26d3b7acf31b8a3a9cdd6`.
O source digest é
`83503af1fc2f6e51c1a0171310937eb037974809149815f52a5a7865e55cad21`, com
2.295 arquivos fingerprintados. A base exata foi removida após verificação de
sessões; os 20 keys gerados no Redis DB15 foram removidos e o DB ficou em zero;
as portas E2E 3111/3112/6381 ficaram livres. É evidência `passed_bounded` local,
sem promoção dos gates humanos, de produção, dispositivos/AT, RUM/INP/CLS,
budget, provider PIX/reversão ou aceite dos 34 FEA.

## Recaptura integral anterior após correção do fingerprint — 09/09/2026

O runner serial foi repetido no candidato atual após `sourceState` passar a
excluir explicitamente evidências geradas em
`docs/frontend/implementation/evidence/` e depois da correção do
`DatabaseAuditRepository` para usar o mesmo client transacional do caso de uso.
O archive imutável dessa rodada foi
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-current9-20260909/`:
Chromium 145.0.7632.6, `420/420` casos, zero skipped/unexpected/flaky, 150
rotas e 300 navegações. O validator confirmou inventário válido com
`inventoryDigest=70d76051c123fbcf5efa472b654d4d10433f34ce3557a8425f01c1e6cd9fcbeb`.
Os hashes são `results.json=4d85db418d225c05883b3c2aa75ad19de54ad870310a5e197f46bb2d1f21b317`,
`metadata.json=34e052fdc61e07d9898b7e0d7a7a971eb5d650ed368b787ac654587540ec0428`,
inventário `2ec71e9f586011639942bf4751d2035397ca5a411870f52d29105e52248bc9ea` e
discovery `c96ac89de35780704fb92d37ff3369764b5153cfe7f7089a4efdc36c3d1ad91f`.
O source digest dessa rodada é
`4c6423e2d8979b77876f482eed544d9acebb8e42d2e5afdb5a68afa2651c32b7`, com
2.295 arquivos fingerprintados.

A mudança foi coberta por `node --test
scripts/usability-test-inventory.test.mjs
scripts/usability-evidence-archive.test.mjs` (`40/40`). A base PostgreSQL
descartável foi removida após verificação de sessões, o Redis DB14 ficou em
zero e as portas E2E ficaram livres. Esta é prova `passed_bounded` local, não
aceite global: UAT/participantes, revisão humana, dispositivos/AT reais,
RUM/INP/CLS de campo, budget, provider PIX/reversão e aceite dos 34 FEA
continuam externos.

## Recaptura cross-browser corrente — 09/09/2026

O manifesto
`docs/frontend/implementation/evidence/cross-browser-current5-20260909.manifest.json`
foi recapturado contra o source digest corrente. Os dois specs críticos
passaram `72/72`, com `24/24` em Chromium, Firefox e WebKit, sem
skipped/unexpected/flaky. O archive tem `results.json` SHA
`b4e36cbd714294ea3433a251396a1049cfcff03bb958e74db9299235562629a2` e
`metadata.json` SHA
`685c6d35481a407bd0f1e6db897b72d0329d81d279f902b505833ed7476b8b03`.
O source digest é
`83503af1fc2f6e51c1a0171310937eb037974809149815f52a5a7865e55cad21`, com
2.295 arquivos; PostgreSQL descartável, Redis DB15 e portas E2E foram
verificados limpos.
Essa é prova `PASS_WITHIN_CONTRACT` somente da matriz crítica.

## Correção de bloqueio no adapter de auditoria — 09/09/2026

O primeiro `full-current8` expôs um deadlock reproduzível entre o trigger de
integridade do ator e a auditoria assíncrona que adquiria outra conexão do
pool. O `DatabaseAuditRepository` foi ajustado para usar o client do escopo
transacional quando disponível, preservando o mesmo boundary de commit/rollback.
O módulo de auditoria passou `29/29`, lint e build; a recaptura integral
`full-current9` passou `420/420`, inclusive os fluxos de relatórios que antes
paralisavam. A mudança é um desbloqueio de persistência para a qualificação,
não uma promoção dos gates de produto.

## Atualização anterior — FEA-007 e fechamento integral — 08/09/2026

O hardening final do FEA-007 trata `.state-message` como estado terminal,
limita loading sem resolução a 1 s e reseta regiões de rolagem locais em novas
navegações push. A recaptura `continuity-7uj2zj` passou 4/4 e o focused
`useRouteFocus`/`DataTable` passou 63/63, incluindo controle de retorno removido
e loading preso. A matriz crítica final `cross-browser-final-20260908` passou
72/72 nos três engines, com manifesto fingerprintado e cleanup confirmado.

Essa preparação histórica foi materializada na recaptura
`full-current9-20260909`, documentada acima como rodada anterior. O resultado é evidência bounded do
runner local e não fecha os gates humanos, produção, dispositivos/AT,
RUM/INP/CLS, PIX/reversão ou aceite integral dos 34 FEA.

## Checkpoint vigente — reinício solicitado em 07/09/2026

Ler primeiro `docs/frontend/implementation/checkpoint-2026-09-07.md`. Agentes congelados, alterações preservadas. A validação corrente de pacientes/Agenda, o E2E integral e a matriz cross-browser já estão arquivados; a próxima ação é obter UAT/participantes/owner acceptance e os gates de produção descritos no controle corrente. Não há conclusão global nem PASS integral. Este checkpoint prevalece sobre próximos passos históricos abaixo.

## Purpose / Big Picture

Implementar o escopo integral dos quatro documentos de frontend de 06/09/2026: 34 entregas, direção Precisão sensível, jornadas contínuas e revisão independente. A régua congelada está em `docs/frontend/implementation/quality-bar-v1.json`. Não reduzir AAA a testes unitários ou notas autoatribuídas.

## Progress

- 2026-09-07: início autorizado de implementação. Snapshot de fontes em `docs/frontend/implementation/baseline.json`; worktree contém mudanças preexistentes.
- FEA-004 e FEA-006 em execução por builders com arquivos exclusivos. FEA-005 sob responsabilidade do lead. Nenhum ticket encerrado.

## Surprises & Discoveries

- Não havia `.gauntlet/` nem `.agent/state.json` ativos no início desta execução. Novo run `frontend-premium-20260907` criado sem sobrescrever histórico.
- `useListData` continua sem controle de requisição; a suite do builder reproduziu falhas antes da mudança.
- Design system depende apenas de Vue; navegação interna requer dependência explícita do Vue Router já usado pela SPA.
- Instalação offline falhou por metadados ausentes de dependência preexistente raiz; tentativa online filtrada em andamento.

## Decision Log

- 2026-09-07, lead: preservar o design system e usar router injetado. Evitar navegação documental e não introduzir singleton da SPA no pacote compartilhado.
- 2026-09-07, lead: primeira proteção de formulário usa estado em memória e diálogo explícito; não persistir dados pessoais no navegador. Autosave durável permanece escopo pendente conforme contrato do plano.
- Concorrência: quatro slots disponíveis, dois builders simultâneos e um slot reservado para critic fresco. Profundidade máxima um. Nenhum limite de tokens imposto pelo usuário; testes caros por fatia e revisão antes da integração.

## Outcomes & Retrospective

Implementação em curso; aceitação integral não demonstrada. Medições humanas, campo e revisão clínica continuam obrigatórias quando chegarem suas ondas.

## Context and Orientation

Raiz `/home/ricardo/cvg-his-v4`; Vue 3/Router 4/Vite, SPA em `apps/spa`, controles em `packages/design-system`. Backlog canônico `docs/2026-09-06-backlog-frontend-premium.md`. Evidências da auditoria histórica estão em `legado/artifacts/frontend-audit-2026-09-06`.

## Scope and Constraints

Todas as 34 entregas permanecem requeridas. Mudanças locais autorizadas; preservar regras clínicas, contratos financeiros, dados pessoais e alterações alheias. Sem implantação externa neste estágio. Modo brownfield, tier T3, risco de continuidade e dados; arte visual depende de render real e julgamento independente.

## Architecture and Interfaces

FEA-004 mantém props do DsButton e injeta router quando disponível. FEA-006 mantém API `useListData` com propriedade da requisição atual. FEA-005 expõe dirty, diálogo de saída, resolução e snapshot salvo; proteção em leave/update e beforeunload. Novos dados digitados durante save não podem ser marcados salvos.

## Revalidação consolidada — 07/09/2026

As ondas F3/F5/F6 receberam implementação bounded e provas Chromium sintéticas
contra o candidato atual. Os relatórios frescos são: patient
`continuity-Quith7`, owner/navigation `continuity-ubek1f`, agenda context
`continuity-WBhawJ`, agenda priority `continuity-ts34l4`, master search
`continuity-gTtJmg`, laboratory `continuity-wD7rbf`, inpatient
`continuity-nqORvp`, cash `continuity-0rUvS1`, inventory `continuity-5CGHrT`,
reports `continuity-zUtFoO`, access control `continuity-JtZTaj` e a11y
`continuity-MbTjs6`. Todos reportam zero falhas e `inputsStable=true`; o
recorte a11y tem 56/56 combinações.

O trabalho de caixa inclui timeout explícito, estado incerto/reconsulta com
mesma `Idempotency-Key` no cliente e runner opcional/validação de chave nas
rotas, com testes de rota e server. A interface ainda não é o ciclo Pix
completo e a prova browser usa API sintética; não promover FEA-025.

O design system passou 7 arquivos/35 testes; a SPA passou 198 arquivos/1.696
testes e typecheck; build de produção passou. O candidato inicial mediu
93.382 B gzip contra baseline 92.406 B (+1,06%). A E2E real atual não avançou:
PostgreSQL em `127.0.0.1:5433` recusou conexão, o runtime caiu para memória e
`productionReady=false`; [bloqueio](../../docs/frontend/implementation/real-e2e-blocker-2026-09-07.md).

## Próxima ação obrigatória

Manter todos os 34 FEA no escopo e o estado sem promoção integral. Obter
PostgreSQL/Redis no runner e repetir a E2E sem fallback; registrar que as
tentativas frescas Zeno/Wegener não produziram parecer e preservar os recortes
independentes Nash/Turing; executar UAT com responsáveis; complementar
Pix/reversão, estados vazios/permissão reais, zoom 200%, touch e leitor de tela;
depois atualizar o dossiê e os gates `AAA-044/045/047`. Sem esses itens, o
parecer é HOLD/sem GO frontend.

## Milestones

1. F0/F1: baseline e continuidade, FEA-001–008. Demonstrar navegação, concorrência, saída de formulário e retorno em navegador.
2. F2: assinatura e controles, FEA-009–016. Render de página preenchida em temas e breakpoints com revisão independente.
3. F3/F4: recepção, cadastro, agenda e clínica, FEA-017–024. Tarefas completas e contratos reais.
4. F5: financeiro, estoque, laboratório, relatórios e administração, FEA-025–029. Baseline própria por domínio.
5. F6: acessibilidade, performance, regressão, UAT e dossiê, FEA-030–034. Provas frescas e aprovações previstas; não substituir humano por simulação.

## Plan of Work

Obter data, participantes e responsável externo para executar o protocolo UAT
de FEA-002/033 e registrar a ata/aceite; em paralelo, o proprietário decide o
budget e os gates de produção restantes. O lead atualiza estados apenas com
evidência e mantém os 34 FEA no escopo até o aceite integral.

## Concrete Steps

1. [FEA-external-uat-gate] Obter data, participantes e responsável externo para executar o protocolo UAT de FEA-002/033 e registrar a ata/aceite; manter os 34 FEA no escopo e sem promoção global enquanto os gates humanos, de campo e de produção permanecerem abertos.
2. Integrar resultados dos builders FEA-004/006; validar dependências, typecheck e navegador.
3. Comissionar critic fresco, sem histórico do builder; corrigir defeitos e registrar provas vinculadas aos hashes. Turing revisou os formulários: sem mudanças pendentes no recorte verificável, mas não autorizou aceite integral.
4. [FEA-024 recapture] Recapturar a jornada de internação/leitos no candidato atual; concluído em `continuity-scpRq4` com `16/16`, nove interações, zero falhas e entradas estáveis. Preservar como prova bounded e manter a próxima ação singular no gate externo de UAT/owner acceptance, sem reduzir o escopo dos 34 FEA.

## Validation and Acceptance

Aceites exatos na quality bar v1 e backlog. Testes: `pnpm --filter @cvg-his-v2/spa exec vitest run <arquivos> --maxWorkers=1`; typecheck e build da SPA após integração. Navegador isolado com dados sanitizados, rotas reais e registros de limites de mock. Critic read-only deve comparar fingerprint antes/depois.

## Risks and Human Decisions

Não afirmar persistência de rascunho além do mecanismo implementado. Não marcar save pendente como concluído. UAT real e percentis de campo dependem de observação externa futura; outras implementações podem avançar. Snapshot de worktree tem precedência sobre memórias e relatórios anteriores.

## Recovery and Rollback

Consultar ferramentas de agentes e processos pelo handle antes de retomar; timeout não significa interrupção. Preservar alterações preexistentes, não executar reset/clean. Para reverter uma fatia, aplicar somente seu diff revisado. `.gauntlet` pertence ao lead; mudanças no candidato invalidam provas anteriores do escopo afetado.

## Checkpoint de execução — onda 1

Progresso concreto: controle de concorrência, navegação de DsButton e proteção do formulário de tutor implementados. Revisor I1 encontrou falhas em botões e formulário, corrigidas em R1; nova revisão dessas correções continua pendente. Suites focadas: listas 19, botões 68, formulário 17 passaram. Typecheck SPA executado sem erros. Navegador `continuity-ekJtIl`: quatro interações passaram, hashes estáveis, dados sintéticos; não comprova persistência real. Capturas mostram que composição e densidade ainda precisam da transformação visual planejada.

Próxima ação: terminar migração dos oito anchors internos (builder critic_button_v1 em novo papel de implementação), executar regressão afetada e revisão fresca; então FEA-007, proteção de demais formulários e FEA-009–016. FEA-001/002/003 ainda têm lacunas de inventário/medição; as ondas F3–F6 permanecem inteiras. Logs e hashes em `docs/frontend/implementation/wave1-evidence.json`. Não marcar o objetivo completo.

### Atualização da integração

Migração adicional concluída: 36 atributos DsButton em 17 páginas/componentes, mais oito anchors em quatro páginas. Fixtures de router atualizadas preservando asserções de destino e conteúdo; 44 testes de consumidores passaram. Regressão conjunta dos fundamentos: 104 testes passaram. Uma nova revisão fresca `critic_continuity_r1` está em execução. Build de produção isolado foi iniciado em `/tmp/cvg-frontend-production-20260907`, sem limpar dist do usuário; consultar processo live antes de repetir.

### Revisão R1 e próximo defeito

Critic fresco `critic_continuity_r1` aprovou a implementação limitada de botões/listas e rejeitou aceite integral FEA-005: logout limpa autenticação antes da confirmação de saída, e falha de carregamento de edição permitia enviar formulário sem hidratação. Implementada proteção hydrated + retry com novo teste; verificar `forms-hydration-rework.log`. Logout é próxima correção necessária, junto de cobertura de update em andamento e fluxo real back/refresh. A última mudança de OwnerForm torna as capturas de formulário anteriores supporting, exigindo novo render para seu candidato. Foi observada evolução simultânea do layout OwnerForm para details; preservar mudanças externas e revalidar hashes antes de editar.

Build produção isolado passou em 22,16 s; estimativa estática dos assets JS/CSS diretamente referenciados pelo HTML: 92.406 bytes gzip, precache PWA 476 entradas/3.082,51 KiB. Não é transferência HTTP medida nem LCP/INP/CLS. Baseline em `production-size-baseline.json`. FEA-003 passa a DOING, sem aceite.

## Continuação — logout e primeira evolução de Recepção

Turno anterior classificado como progresso: correções e evidências executadas. Recuperação revalidou fonte e pending logout. Implementado coordinator por workspace injetado nas páginas; autenticação só é limpa após consentimento, snapshots alterados durante confirmação são recusados. Critic fresco `critic_logout` aprovou escopo código/unit; 20 testes focados passaram. Navegador `continuity-rZRiT6` confirmou logout claro/escuro, 390/1440; registro mutável de requests de Cancel foi corrigido no harness, rerun consolidado necessário.

Frentes disjuntas em execução: `button_navigation` agora builder dos tokens CSS/TS e contrato; `critic_continuity_r1` agora builder de ergonomia da Recepção e seus testes (não pode aprovar seu resultado). Tokens e Recepção precisam de render e nova crítica. FEA-009/013/014/017 DOING significa fatias iniciadas, não aprovação dos predecessores nem aceite completo. Não há novos DONE.

### Evidência final da rodada logout/Recepção

Logouts reais em Chromium nos dois temas/390/1440 passaram no report `continuity-dnfBo7` com hashes estáveis. Recepção foi julgada por novo critic I1: busca/hierarquia aprovadas no recorte, Atualizar truncado rejeitado e corrigido. Modo preenchido do harness passou quatro casos em `continuity-CPWhKc`: fila começa em y592,94 no celular antes da busca; primeiro resultado em y623,94; link contextual conserva tutor. Dados sintéticos, sem criação real de agendamento ou UAT. A primeira execução preenchida falhou por variável de data no harness; processo terminal confirmado e corrigido, sem esconder o log.

Tokens semânticos de material/tipografia/movimento adicionados (55 referências), contraste e redução de movimento verificados pelo builder; aplicação aos controles e aceitação visual continuam pendentes. 29 testes integrados passaram. Typecheck encontrou teste acessando campo privado de componente; teste foi corrigido para verificar a segunda atualização pela API e navegação pública, rerun em `wave2-typecheck-r2.log`.

Próxima execução: conferir esse typecheck, consolidar aceites pendentes e aplicar FEA-010/013 em componentes reais; avançar FEA-007 retorno/foco e restante FEA-005 (outras rotas/recovery) sem perder FEA-003 medição de produção nem demais ondas. Backlog segue sem DONE integral e objetivo não está completo.

Typecheck R2 concluído com exit 0, 13 testes de formulário passaram após ajuste da asserção pública, documentação validada. Nenhum processo de verificação desta rodada permanece pendente.

## Continuação — botões e contrato de scroll

Turno documental anterior: progresso limitado (índice e estado ComfyUI revalidado), não conclusão do objetivo de implementação. Neste turno o DsButton passou a consumir tokens de ação, raio, tipografia e movimento; hover sem translação, pressão 1 px; loading conserva largura prévia e mantém nome acessível. Revisor fresco I1 encontrou loading inicial sem captura; corrigido com onMounted, re-revisão de fonte aprovada no novo hash 6d23ea7acd753d0411e740d46e8ad472e217fc3d112f1ee3b4e4853c0b35f69f. Não houve aceite subjetivo AAA.

Browser isolado final button-material-3N7MXC: quatro combinações 390/1440 claro/escuro, largura estável em loading/retorno e loading inicial, fullWidth encolhe com contêiner, nome acessível, tentativas duplicadas suprimidas, foco via teclado e redução de movimento. Tentativas anteriores preservadas: R1 configuração do Vite/template; R2 asserção 0s versus política global 0,00001s; R4 modalidade de foco após mouse. R5 passou com hashes estáveis. Recepção real sintética continuity-bm3xLl: quatro casos, zero falhas, entradas estáveis. 84 testes passaram.

Scroll helper revisado por critic fresco read-only: política aprovada com 16 testes; 41 testes de router informados pelo builder anterior. Nenhuma prova de browser history/foco nem async anchors. Próximo passo: resolver e verificar FEA-007 transversal e completar estados/variantes FEA-010, mantendo todos os outros 34 critérios requeridos. Nenhum DONE integral.

Typecheck final button-scroll-typecheck-r2.log concluído com exit 0; docs:validate passou. Processos próprios de navegador e testes desta fatia terminaram.

## Continuação — foco, histórico e revisão adversarial

Turno anterior classificado progresso: componente e provas reais alteraram estado. Recuperação confirmou worktree e ausência de .agent/state.json; ExecPlan e backlog continuam fontes de progresso frontend. Implementado useRouteFocus no shell; afterEach ignora falhas antes de alterar título/recents. Testes reais de router verificam cancelamento, duplicação e sucesso.

Primeiro critic encontrou foco externo sobrescrito. Segundo encontrou controle em details fechado elegível indevidamente e timing de guards. Rework cobre details e guards posteriores; ordenação de guards anteriores permanece aberta. History guarda até 50 identidades estruturais em memória, sem valores de campos ou persistência; saída limpa listeners.

Browser initial MAFctW passou scroll apenas; Tcf06a teve uma falha de retorno e source drift durante builder: não aceito. Jvds8h final, fontes congeladas, passou quatro combinações com scroll1491/3193, foco Cancelar visível, nenhuma recarga e logout/declínio preservados. Browser harness NAVIGATION_CONTINUITY exclui hash Reception não carregada neste recorte; essa página pertence à frente independente de concorrência de busca.

Builder reception_search_race confirmou respostas/contexto antigo sobrescrevendo estado na Recepção, trabalhando nos dois arquivos da página/teste; acompanhar agente antes de presumir fim. Não rodar render dessa página durante escrita. Nenhum dos 34 tickets foi encerrado integralmente.

### Integração da busca da Recepção

Builder congelou página/teste com proteção de geração na busca principal e contexto complementar; query/clear/unmount invalidam resposta antiga. Critic I1 fresco aprovou escopo de fonte, 17 testes passaram. Suíte integrada foco/router/unsaved/recepção: 66 testes e typecheck passaram. Harness de busca atrasada em execução fkJDKu usa erroneamente parâmetro search, enquanto ownerService envia q; os timeouts são defeito do harness. Observar término, corrigir apenas os predicados de owners e repetir, preservando tentativa original.

Rodada final Recepção continuity-11pldJ passou quatro casos de busca/fila e quatro de resposta antiga/Limpar; hashes estáveis. Tentativa fkJDKu terminou com quatro timeouts antes da correção q. Critic I1 da busca aceitou escopo de fonte; typecheck integrado exit0, 66 testes e docs:validate passaram. Todos os builders/processos desta rodada terminaram, nenhum foi reiniciado por simples timeout de observação. Resumo vinculado aos hashes em navigation-reception-evidence.json. Próxima lacuna: guard-order FEA007; Agenda mobile FEA019 continua de alto impacto e demais ondas permanecem requeridas.

## Continuação — Agenda operacional, guard ownership e Open Design

Turno anterior foi progresso, revalidado pelo worktree. Usuário adicionou Open Design como recurso; get_active_context e list_agents retornaram Transport closed. Disponibilidade registrada em open-design-availability.json; nenhuma geração pelo serviço foi alegada. ComfyUI job 0836ac61 concluiu: coletada imagem 0836ac61_000.png (384x224), inspecionada como estudo abstrato coerente mas simples, sem aceite final. Manifesto e documentos de assets atualizados.

Agenda builder implementou lista ordenada padrão, preservando modos e detalhes. Primeiro browser C8RNEL rejeitou topo mobile y831 e teclado de drawer; fonte também derivou durante typecheck, sem aceite. Rework localheader/actionsdisclosure/filtertoolbar e 4modos reduziu primeira linha y523mobile/y390,75desktop. Drawer builder corrigiu foco/Tab/Esc/restore,6 testes + critic I1 aprovaram o recorte. EwerA5 passou quatro jornadas lista,Enter,Esc,foco,filtro e modoDia. Dois críticos visuais frescos com A/B invertido preferiram nova composição; alerta discreto e legenda irrelevante corrigidos. Captura final em andamento R4 após ajuste de tokens de fundo (-50 existentes, não aliases inexistentes).

Root adicionou preserveNavigationFocus(router,to,target): declaração explícita para guards anteriores/leave, consumida por tentativa e válida só se alvo ativo/conectado/disponível/habilitado. Critic encontrou fallback genérico preservando claim inválido, corrigido; 28 testes passaram, rework I1 aprovado. Chamadas arbitrárias a focus anteriores continuam não inferidas automaticamente: responsáveis devem usar contrato. Navegador oLC0j2 confirmou retorno/scroll/logout no novo candidato. Suíte integrada Agenda/foco/drawer/router:55 passaram.

Checkpoint final: cD1EER passou4 casos Agenda com source hashes estáveis; oLC0j2 passou navegação/foco/logout.55 testes integrados e typecheck final exit0. R3 capturou primeiro ajuste de alerta; R4 corrigiu aliases CSS inexistentes para tokens -50 reais e refezbrowser. Dois críticos blind preferiram a nova composição; reworkdesktopalert/legend observado. Duplicação de título permanece aberta. Fontes/evidências em agenda-focus-evidence.json. Todos os processos de implementação/verificação desta rodada terminaram. Nenhum ticket DONE integral; próximo FEA019-context.

## Continuação do checkpoint — Dashboard, paciente e prontuário

FEA-021 recebeu contrato explícito de permissão para a navegação canônica e
seus aliases, filtragem do shell/enterprise, favoritos, recentes, links
persistidos e command palette. `router/index.ts` passou a consultar a sessão
antes de montar rota privada, negar sem regra e redirecionar para `/` quando a
permissão não existe; o cache é vinculado ao access token. A auditoria local
encontrou 247 rotas privadas canônicas cobertas. `DashboardPage` também passou a
exigir `scheduling.read` para Agenda e a descartar respostas obsoletas por
geração. `continuity-ipMcm8` passou 20/20 em cinco perfis, dois temas e dois
viewports.

FEA-022 teve revalidação de troca de paciente, limpeza de identidade/contexto
clínico obsoleto, estado esparso acionável e volta com filtro de tutor:
`continuity-2Iakc3`, 4/4, claro/escuro e 1440/390.

FEA-023 recebeu chave de idempotência estável por tentativa de criação,
edição e arquivamento, limpeza da chave somente após confirmação, ordenação
determinística de entradas e timeline, feedback de arquivamento e preservação
do rascunho em falha. `continuity-VCI5AU` passou 4/4 com anexos quarentenados
não acionáveis, download somente após URL confirmada e verificação do ID,
contexto, conteúdo e estado na releitura; a mesma matriz foi renovada para o
detalhe do paciente em `continuity-CDimfF` (4/4). O contrato também aplica
releitura autoritativa de arquivamento, locks de atendimento fechado e
invalidação de mutações diagnósticas obsoletas. O rascunho continua
memória-only por decisão de privacidade; reload/crash, replay durável,
backend/RLS e UAT não foram alegados.

Verificação final da onda: SPA 203 arquivos/1.744 testes, typecheck e build
exit 0; `continuity-0VvVeH` passou 56/56 com Axe zero, skip link, foco, reflow
e movimento reduzido; build inicial 367.618 B brutos/102.816 B gzip contra
baseline 92.406 B (+10.410 B, +11,27%). O crítico Lovelace registrou FAIL
inicial de FEA-021 e CONDITIONAL/HOLD de FEA-023; Kuhn concluiu a revisão
fresca com FEA-021/022 CONDITIONAL e FEA-023 HOLD. Harvey fez uma segunda
leitura fresca e apontou lacunas de confirmação que foram corrigidas; Meitner
concluiu a leitura fresca como HOLD, e as salvaguardas acionáveis foram
implementadas e verificadas. Nenhum FEA recebeu DONE,
AAA ou GO.

Próxima ação obrigatória: obter PostgreSQL/Redis, repetir E2E sem fallback,
executar UAT e revisão visual/humana, completar Pix/reversão e gaps de
touch/zoom/leitor de tela, e só então reavaliar os tickets e gates globais.

## Retomada do checkpoint — Agenda, PIX e verificação final bounded

Esta retomada preservou o worktree sujo e manteve os 34 FEA no escopo. A
proteção de `ownerId` do `PatientFormPage` foi revalidada junto das suites de
unsaved/appointments/agenda. A Agenda passou a reconhecer as cinco aliases
canônicas, remover `search`/`clientSearch` legados ao sincronizar o contexto,
invalidar ações concorrentes de check-in/no-show e tornar os cards de semana e
dia operáveis por Enter/Espaço. O botão de fechamento do drawer recebeu alvo
mínimo de 44×44.

FEA-025 recebeu uma fatia bounded adicional: `EncounterPixPaymentPanel` está
montado no detalhe financeiro do atendimento, só habilita despacho depois do
fechamento, mantém `Idempotency-Key`, representa os oito estados do contrato,
restaura a tentativa mais recente por atendimento, faz refresh explícito e
reagenda polling após falha transitória. A API ganhou `findLatestByEncounter`,
rota GET documentada no OpenAPI e testes de envelope público. Não foram
inventados confirmação ou reversão PIX; a reversão operacional ainda precisa
de contrato/fluxo integrado.

Verificação atual: focused Encounter/PIX 43/43; Agenda/no-show e codec 47/47;
focused Agenda/DsButton/design-system 108/108; SPA completa 204 arquivos e
1.777 testes; `vue-tsc --noEmit`; build SPA exit 0
(802 módulos, 480 entradas PWA); build/rota API PIX 11/11; OpenAPI e
documentação válidos; Storybook 10.3.5 build e render browser da story Primary
passaram. O harness `continuity-WnxPrE` passou 20/20 para as cinco
aliases da Agenda, com três interações distintas exercitando retorno/reload,
superfícies nativas de card com Enter/Espaço e
restauração de foco, e `continuity-qW2Gvv` passou 4/4 para PIX em claro/escuro e
1440/390, ambos com
`inputsStable=true` e SHA do harness
`698bbb080a220b04a86e3944266a67935e9496afbb1e1fed6ee64dae5f42b16f`.

O crítico fresco Averroes emitiu parecer independente sobre o estado
pós-correção: Agenda `conditional`, PIX `HOLD` e rodada `HOLD`; não encontrou
P0/P1/P2 funcional residual na Agenda, mas apontou a affordance financeira
incompleta do PIX e a defasagem de seu snapshot. Essa affordance foi corrigida
depois com bloqueio fail-closed, e os dois relatórios acima foram regenerados.
O crítico fresh-context final McClintock concluiu a rodada `HOLD`, identificou
P1 no no-show de itens ligados à fila e no saldo financeiro não validado pelo
servidor, e P2 na semântica do card focável; o no-show e a guarda transacional
foram corrigidos depois, e o card foi convertido para superfície `button` nativa
com ações irmãs, com regressão e browser bounded regenerados. A integração
PostgreSQL não executou no runner por permissão de `TRUNCATE`, então
essa guarda aguarda banco autorizado. Mesmo com os recortes bounded verificados, o
estado global continua `ACTIVE/HOLD`: E2E browser-to-database está bloqueado
por PostgreSQL indisponível e fallback em memória, e permanecem UAT/revisão
humana, provider/RLS, zoom 200%, touch/dispositivo, leitor de tela real,
FEA-001–004 e ciclo PIX/reversão. Não marcar FEA como `DONE`, nem atribuir
`AAA`, `PASS` ou `GO` global.

## Continuação — FEA-001, FEA-003 e FEA-004

FEA-001 recebeu o capturador executável
`scripts/capture-frontend-baseline.mjs` e o relatório
`frontend-baseline-2026-09-07.json`: 253 registros de rota, 249 protegidos,
4 públicos, 21 redirects, 686 arquivos frontend rastreados, 98 alterações
scoped, 88 assets e oito relatórios correntes. O relatório reconcilia HEAD,
hash do status, drift contra o snapshot histórico e FE-01/02/03 bounded;
baseline humana, reconciliação semântica completa e serviços reais seguem
pendentes. FEA-001 permanece parcial/HOLD, sem promoção a DONE.

O baseline atual de performance foi medido pelo script
`scripts/measure-spa-performance.mjs`, com três execuções por rota (`/`,
`/login`, `/appointments?view=week`) no `apps/spa/dist` produzido pelo build
atual. O relatório `performance-lab-2026-09-07.json` registra 486 arquivos,
3.757.259 B de artefatos, 367.659 B brutos/102.488 B gzip no HTML inicial,
Chromium 145, viewport 1440×900/DPR1, FCP/LCP de laboratório e os limites sem
INP/RUM/participantes. FEA-003 segue parcial/HOLD.

O contrato de navegação do `DsButton` recebeu o fixture browser
`button-navigation-browser.mjs`; `evidence/button-navigation-EcT9XZ/report.json`
passou 4/4 em claro/escuro e 390/1440, exercitando Vue Router sem GET
documental, Enter/Espaço, back/forward, modificadores, externo, disabled e
submit explícito.
FEA-004 segue condicional/HOLD, pois a prova é bounded e ainda depende da
revisão dos consumidores, serviços reais e UAT.

## Continuação — composição FEA-014 da Agenda

A composição da Agenda foi desduplicada usando `pageOwnsHeader`: o shell
preserva histórico e suporte, mas não expõe contexto/breadcrumb redundante;
`AppointmentsListPage.vue` mantém a trilha e as ações da página, sem KPI no
header, deixando o resumo da grade como único grupo operacional. O subtítulo
também não repete a trilha textual. O contrato de aliases, query/filtros,
payloads, drawer, ações e superfícies nativas de teclado não mudou.

`evidence/continuity-A6VXry/report.json` passou 30/30 em cinco aliases,
claro/escuro e 1440/768/390, com zero falhas, `inputsStable=true`, largura
documental sem overflow e quatro interações (reload/contexto, Enter semanal,
Espaço diário e medição pós Lista → Semana → Dia) com foco restaurado. A
sonda também confirmou rolagem local da grade semanal; a decisão permanece
parcial/HOLD por falta de revisão humana, contraste/touch/zoom/leitor de tela e
UAT.

A primeira versão dessa sonda (`continuity-JS7LMj`) falhou em 10 linhas porque
exigia overflow local na grade diária também em 768px; o render observado cabe
na largura disponível nesse breakpoint. O relatório falho foi preservado como
histórico não canônico. O critério foi corrigido para exigir rolagem diária
somente em 390px, e a execução seguinte (`continuity-A6VXry`) passou 30/30.

## Continuação — FEA-013 e continuidade pós-save

Os 18 redirects de sucesso de formulários foram centralizados em
`apps/spa/src/composables/successRedirect.ts`: 360 ms de confirmação em
movimento padrão e 0 ms com `prefers-reduced-motion`, sem alterar destinos,
guards ou cancelamentos. `successRedirect.test.ts` e os fluxos de paciente,
atendimento e agendamento passaram 98/98; `vue-tsc --noEmit` passou. A faixa
segue parcial/HOLD por falta de observação humana, device/cross-browser,
integração real e UAT.

## Continuação — decomposição e vocabulário da onda F2

O próximo recorte executado reduziu a concentração das páginas críticas sem
alterar contrato de serviço: `agendaPresentation.ts` separa o cálculo de slots,
marcadores e estados da Agenda; `patientDetailPresentation.ts` separa rótulos,
formatação e deduplicação do detalhe clínico. Agenda está em 3.086 linhas e
PatientDetail em 4.075, abaixo dos limites do manifesto. Testes unitários dos
helpers passaram 6/6 e as páginas afetadas seguem cobertas. O orçamento
global ainda denuncia ReportWorkbench e API acima do limite; isso permanece
trabalho explícito, sem elevar limite artificialmente.

FEA-009 recebeu a implementação candidata do mapa CSS-backed
`cvgPulseTokens` e temas CVG Pulse claro/escuro, mantendo exports legacy para
compatibilidade. O pacote passou 48/48, o teste focalizado 41/41 e o
typecheck. A revisão independente do builder recomenda `REVIEW REQUIRED` até
render preenchido nos dois temas, contraste medido e confirmação de licença/
fallback da fonte.

FEA-013 foi corrigido após crítica fresh-context: `begin()` abre explicitamente
um novo ciclo, `invalidate()` bloqueia rearmamento após rota/unmount/contexto,
e o controller agora é o dono do timer também em Patient/Encounter. O
inventário testado cobre os 18 consumidores legados, o helper tem 7/7 casos,
a suíte focada de helpers/formulários 159/159 e a SPA 208 arquivos/1.792
testes. Euclid classificou o recorte `PASS_WITHIN_CONTRACT`, sem S1/S2 e com
S3 de cobertura runtime por consumidor/ambiente real/UAT. Owner, Bed,
Appointment e Triage não tinham scheduler legado e permanecem fora do
contrato bounded, explicitamente documentados.

FEA-015 recebeu `clinicalLabels` e correção das strings visíveis de “cliente”
para “tutor” nas seis superfícies previstas; nomes técnicos/API e termos
financeiros foram preservados. As sete suítes focadas passaram 113/113 e o
typecheck SPA passou. Validação com Operação e inventário completo continuam
pendentes.

FEA-016 também recebeu uma integração candidata, limitada ao palco de
identidade do login: o poster e o loop Blender foram publicados em
`apps/spa/public/art/` com hashes iguais às fontes em `docs/frontend/assets`.
O browser report `evidence/login-assets-20260907.json` passou 8/8 em duas
larguras, dois temas e movimento reduzido, mantendo o poster quando o vídeo
é omitido. A prova não encerra revisão visual, rede limitada, pausa manual,
orçamento ou aceite humano.

FEA-012 recebeu um alinhamento bounded no consumidor analítico: falhas do
catálogo de referências agora usam `DataTableFeedback` `unavailable`, retry
nomeado e uma única superfície de anúncio, mantendo os resultados estruturados
disponíveis. O retry é isolado da consulta principal e preserva
registros/seleção durante pending e falha. A suíte analítica passou 24/24 e o
`DataTable` 25/25; autorização real, confirmação operacional, browser com
serviço indisponível e UAT seguem pendentes.

FEA-011/018 receberam uma matriz bounded adicional no harness final: paciente
`continuity-ty2R5x` 6/6 e tutor `continuity-JOB4sv` 2/2 em 1440×900, 390×844
e 195×422 (proxy CSS de 200% para 390×844), nos dois temas. O recorte verifica
erro/foco, preservação de draft, loading/falha, ações sticky e largura
documental; zoom nativo, touch/teclado virtual, leitor de tela e UAT continuam
gates de aceitação integral. `continuity-niDPip` acrescenta 8/8 de conflito
duplicado para tutor/paciente, com rascunho preservado, manter/abrir existente
e confirmação de saída; Maxwell classificou o recorte `PASS_WITHIN_CONTRACT`
com severidade máxima S3. Os relatórios falhos
`continuity-z5FzeJ` e `continuity-8wg68C` foram preservados por rastreabilidade
do seletor obsoleto do CTA do tutor, que foi alinhado ao texto atual.

Baseline pós-onda regenerado: 253 rotas, 249 protegidas/4 públicas, 686
arquivos frontend rastreados, 138 arquivos-fonte alterados, 88 assets e 13
relatórios correntes. O estado global segue `ACTIVE`, sem DONE/AAA/GO; UAT,
revisão visual, PostgreSQL/RLS/provider e E2E real continuam gates externos.

## Continuação — prova visual e contraste de FEA-009

Foi adicionada a prancha canônica `packages/design-system/stories/
CvgPulseTokens.stories.ts`, indexada pelo Storybook real como
`design-system-tokens-cvg-pulse--canonical-board`. Ela demonstra os dois temas
em ilhas independentes, inventário de migração, página clínica preenchida,
acentos/números tabulares, materiais/elevation, reduced motion e pares de
contraste.

O script `docs/frontend/implementation/cvg-pulse-tokens-browser.mjs` gerou
`evidence/cvg-pulse-tokens-OklWS0/report.json`: build Storybook 10.3.5 com 191
módulos, Chromium 12/12 em 390/768/1440, light/dark e normal/reduced motion,
overflow zero e contraste mínimo 5,52:1 (light) / 10,85:1 (dark). Screenshots
mobile/desktop foram inspecionados. O recorte está `PASS_WITHIN_CONTRACT`, mas
FEA-009 permanece parcial/HOLD por licença/disponibilidade Aptos, dispositivos
reais, zoom/touch, leitor de tela, UAT e aceite integral. Baseline atual:
253 rotas, 690 arquivos frontend, 147 fontes alteradas, 88 assets e 14
relatórios correntes.

O crítico fresh-context Dewey confirmou `PASS_WITHIN_CONTRACT`, severidade
máxima S3 e nenhum S1/S2. Validou Storybook/index/render real, as ilhas
light/dark, migration/filled page/tabular-nums/acentos, matriz 12/12, contraste
mínimo 5,52:1/10,85:1 e overflow documental zero. O probe não mede cada
container interno; licença/disponibilidade Aptos, consumidores clínicos,
dispositivos/zoom/touch, leitor de tela e UAT continuam pendentes.

## Continuação — protocolo de tarefas para FEA-002

O roteiro `docs/frontend/implementation/task-baseline-2026-09-07.json` tornou executável o próximo
gate de FEA-002: cinco tarefas, cinco perfis, 10 sessões-alvo, fixture sintético, critérios de
sucesso/erro e métricas de tempo, ativações, rolagem, erros e conclusão. A versão Markdown explica
o procedimento e a política de privacidade. O dry-run não atribui métricas humanas; OP, participantes,
consentimento, UAT e FEA-033 permanecem pendentes.

## Verificação final da retomada

A suíte SPA completa encerrou com `209` arquivos e `1.805` testes aprovados. O build de produção
passou com `806` módulos e `483` entradas de precache PWA; `docs:validate`, OpenAPI (`413` paths,
`518` schemas) e `git diff --check` passaram. O orçamento de complexidade ainda bloqueia a
qualificação integral em dois hotspots: `server.ts` 8.347/8.335 e `ReportWorkbenchPage.vue`
3.205/3.186. FEA-009 continua bounded `PASS_WITHIN_CONTRACT`/parcial e o conjunto global ACTIVE/HOLD.

## Continuação — FEA-025: estorno de recebimento em dinheiro

O detalhe do atendimento passou a carregar o recebimento confirmado no passo
de fechamento e a oferecer estorno com confirmação explícita, motivo obrigatório,
aviso de irreversibilidade e `Idempotency-Key` estável por tentativa. O retry de
falha transitória mantém a chave; depois do POST 201 a UI relê o resumo financeiro
e não oferece uma segunda reversão.

O browser harness `continuity-WiebZn` passou 4/4 em 1440/390 e claro/escuro,
com zero erros/overflow documental e capturas reais inspecionadas; os testes
focados de Encounter/serviço passaram 35/35, a rota API 11/11 e o typecheck SPA
passou. `includeReversed=true` recupera o último recebimento com metadados de
reversão após refresh/reload. A evidência é synthetic-only: provider, RLS,
replay transacional, reconciliação e UAT ainda exigem ambiente/contrato
integrado. A revisão do scout confirmou que PIX não tem endpoint de confirmação/
reversão manual seguro e deve permanecer em despacho/polling.

## Continuação — FEA-026: escopo de seleção e compras

O browser harness `continuity-ohbW3A` passou 8/8 em Estoque e Compras, nos dois
temas e em 1440/390. A seleção anuncia o escopo página/consulta, limpa ao
filtrar e não cria ações para linhas invisíveis; unidades críticas permanecem
legíveis e o rascunho de compra é temporário, sem mutação de estoque. Mutação
batch persistida, integração real, touch/zoom, leitor de tela e UAT continuam
pendentes. A crítica fresh de Lagrange classificou o recorte
`PASS_WITHIN_CONTRACT`, sem S1/S2; inventário/compras passou 27/27 e o
`DataTable` 25/25. O resultado é bounded e não promove FEA-026 ao aceite
integral.

## Continuação — FEA-028: execução server-side e exportação

O harness atual foi executado novamente em `continuity-UAGHyE`: 4/4 em
1440/390, claro/escuro, com filtros na URL e retorno contextual, execução
server-side, CSV auditado com indicação UTC, falha de exportação recuperável,
vazio, erro, retry e rolagem horizontal por teclado no viewport estreito.
Reconciliação financeira, browser-to-database, touch/zoom nativos, leitor de
tela e UAT continuam fora da prova; a crítica independente fresh do FEA-028
está pendente.

### Correção posterior — FEA-025 após crítica fresh

O motivo do estorno agora usa semântica nativa `required`/`aria-required`, a
releitura 404 exibe aviso explícito em vez de parecer uma confirmação silenciosa,
o foco retorna ao painel estável quando o gatilho é removido e o breadcrumb
móvel não cria scroll interno. `continuity-WiebZn` passou 4/4 com
`documentWidth=viewport` e `scrollContainers=[]`; a regressão SPA passou
209/1.805, Encounter/serviço 35/35 e API 11/11. Provider, RLS, replay em banco,
reconciliação, PIX, leitor de tela e UAT continuam fora do bounded pass.

Avicenna confirmou em revisão fresh-context `PASS_WITHIN_CONTRACT`, severidade
máxima S3 e nenhum S1/S2 para o recorte FEA-025. O veredito é isolado da jornada
financeira sintética; não altera o HOLD de integração real nem o aceite global.

## Continuação — FEA-027 após crítica fresh

O primeiro parecer independente encontrou um S2 nos três workbenches analíticos:
403 era apresentado como erro genérico. Também pediu prova browser de pendência
versus ausência e Axe após estados interativos. A implementação adicionou
`accessDenied`/feedback `forbidden` ao workbench compartilhado, distinguiu
`closed=false`/`collected` sem valores de uma busca sem resultados e expandiu o
harness para Axe em populated, modal, attachment, selected, pending,
no-results e forbidden.

`continuity-cFoZKq` passou 20/20 nos cinco alvos laboratoriais, dois temas e
dois viewports, com zero erros, `inputsStable=true` e Axe zero. O baseline foi
recapturado com 253 rotas, 690 arquivos frontend, 149 fontes alteradas e 20
relatórios. SPA laboratorial 46/46, diagnósticos 34 testes, API laboratorial
21/21, `vue-tsc` e builds relacionados passaram. A crítica fresh final ainda é
obrigatória; backend/RLS/persistência/permissões reais, toque/zoom, leitor de
tela e UAT continuam fora do contrato.

## Registro de crítica — FEA-028

Hume deixou FEA-028 em `HOLD` S2. Antes de nova evidência, o plano deve corrigir
ancoragem da exportação no `executionId`, timeout/reconciliação/cancelamento da
operação persistente, intervalo UTC, CSV canônico, estado de ausência e matriz
de escopo server-side. O relatório `continuity-UAGHyE` ficou stale para o
candidato atual.

## Continuação — FEA-029

`continuity-3NvGzS` é a evidência corrente 4/4 do acesso/configurações: 403,
retry, tabs, foco de edição, fieldsets e matriz em 1440/390 × claro/escuro. Abrir
crítica fresh somente leitura sobre esse artefato antes de qualquer promoção;
papéis reais, RLS, persistência e UAT seguem gates.

## Atualização corrente — FEA-027/028/029

As correções da rodada seguinte foram implementadas e as fontes foram
recapturadas com o mesmo harness (`b7f1dac83d2298cbeb4fde043d5cb5f92265049c0dfbbda2a62a27934fe20e56`):

- FEA-027: `continuity-ObS9Nk` passou 20/20, incluindo requested/collected/
  resulted, referência indisponível e retry, no-results com Axe, estados 403,
  foco de modal/teclado e screenshots mobile com `scrollY=0`.
- FEA-028: `continuity-BQPOrz` passou 4/4 após a ancoragem do export no
  executionId exibido, AbortSignal/timeout com orientação de reconciliação,
  intervalo UTC meio-aberto, CSV canônico e no-results acionável.
- FEA-029: `continuity-gPkUs4` passou 4/4 com 403 sem empty contraditório, Axe
  zero em todos os painéis, tabs roving, Sim/Não textual, tabelas móveis
  focáveis e largura estável.

O `DsModal` agora exclui controles desabilitados do trap de foco (5/5 testes);
Access Control passou 12/12. Os três recortes aguardam a crítica final
independente pós-correção. O baseline corrente registra 253 rotas, 690 arquivos
frontend, 158 fontes alteradas e 20 relatórios. O estado global permanece
ACTIVE/HOLD, sem DONE/AAA/GO.

## Verificação corrente do checkpoint — 08/09/2026

O instrumento browser foi ampliado para cobrir os subledgers server-side de
Contas a Pagar e Contas a Receber. Após o hardening do catálogo concorrente e
do contrato byte-a-byte de CSV, as recapturas usam o SHA
`0786242927a23457ae3dd550c6008c1a99209c0209dd3cbacb8163df653d8b11`:
recapturas finais registram:

- `continuity-G9h2nq`: FEA-027 20/20 nas cinco rotas laboratoriais, incluindo
  fixture Bioquímica com ALT/U/L/faixa própria e os estados requested,
  collected, resulted, pending, unavailable, no-results e forbidden.
- `continuity-VF7bbr`: FEA-028 12/12 em estoque, contas a pagar e contas a
  receber, com filtro que cria nova execução server-side e exportação do mesmo
  `executionId` sem novo POST; o CSV do browser usa vírgula.
- `continuity-SZ8pvw`: FEA-029 4/4 com 403 focalizado, métricas não enganosas,
  tabs roving, fieldsets, matriz textual, Axe zero e reflow estável.

O baseline das 02:39:51Z registra 253 rotas, 690 arquivos frontend, 159
fontes alteradas, 88 assets e 20 evidências sem ausentes. A SPA passou 209
arquivos/1.818 testes, a suíte API passou 576/576 e o build passou com 806
módulos/482 precaches. O
veredito final dos recortes deve permanecer bounded até a crítica fresh
independente; backend/RLS/E2E real, UAT, revisão humana, touch/zoom nativos,
leitor de tela e os dois limites de complexidade seguem gates do plano global.

## Verificação posterior à refatoração — 08/09/2026

O `complexity:check` passou após extrair modelos/fábrica do workbench e os
limites de requisição do dispatcher: `ReportWorkbenchPage.vue` ficou em 3.142
linhas e `server.ts` em 8.333, dentro de 3.186/8.335. A regressão SPA passou
209 arquivos/1.818 testes, a API 576/576 e o build 807 módulos/482 precaches.
As evidências pós-refatoração são `continuity-BaiCMr` (FEA-027 20/20),
`continuity-0gELAk` (FEA-028 12/12) e `continuity-Ld6WtE` (FEA-029 4/4), todas
com `inputsStable=true` e harness SHA
`0786242927a23457ae3dd550c6008c1a99209c0209dd3cbacb8163df653d8b11`. O plano
continua ACTIVE/HOLD até a crítica independente e os gates de backend/RLS,
E2E real, UAT, touch/zoom e leitor de tela.

## Verificação final com fingerprint completo — 08/09/2026

A lista de entradas do harness foi ampliada para incluir os módulos extraídos
do workbench e `apps/api/src/request-boundaries.ts`; novo SHA
`2e47786aae669daebfc7bd04157b3516ab34f9a0543f5bcf0bcf153ad30f2a3e`.
Recapturas: `continuity-P2Gxqb` FEA-027 20/20,
`continuity-VQ6hGd` FEA-028 12/12 e `continuity-gxcDmq` FEA-029 4/4,
todas sem falhas e com `inputsStable=true`. Baseline de
`2026-09-08T03:11:50.262Z`: 253 rotas, 690 arquivos frontend, 161 fontes,
20 evidências sem ausentes. Complexity passou; SPA 209/1.818, API 576/576,
build 807/482. A crítica independente segue em andamento e o plano continua
ACTIVE/HOLD pelos gates de backend/RLS, E2E real, UAT, touch/zoom e leitor de
tela.

## Recaptura após hardening de catálogo e cobertura financeira — 08/09/2026

Com o harness SHA `0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`,
as evidências atuais passaram com `inputsStable=true`: FEA-027 em
`continuity-ExFscb` (20/20, Pedidos/Laudos mais as três rotas analíticas, 112
checks Axe sem violações), FEA-028 em `continuity-D7FDxP` (16/16, incluindo
Pagamento Antecipado e comparação byte-for-byte do CSV browser) e FEA-029 em
`continuity-sdJGV7` (4/4, com normalização de alvo da matriz após refresh
coberta por teste). Baseline `2026-09-08T03:29:53.810Z`: 253 rotas, 690
arquivos frontend, 161 fontes alteradas, 20 evidências sem ausentes. O plano
permanece ACTIVE/HOLD até a crítica fresh independente e os gates de
PostgreSQL/RLS/E2E real, UAT, touch/zoom e leitor de tela.

## Recaptura final após hardening de concorrência — 08/09/2026

FEA-027/028/029 foram recapturadas depois de proteger resposta obsoleta em
Pedidos e bloquear grant durante refresh do catálogo de acesso. Com harness
SHA `0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`, os
relatórios atuais são `continuity-v2XVM5` (20/20 laboratório),
`continuity-udvwWj` (16/16 financeiro, incluindo Pagamento Antecipado) e
`continuity-4SjGml` (4/4 acesso), todos sem falhas e estáveis; o laboratório
registrou 112 checks Axe sem violações e o financeiro validou CSV byte-for-byte.
A SPA passou 209 arquivos/1.821 testes, o build 807 módulos/482 precaches,
API `tsc`, complexidade, docs e OpenAPI passaram. Baseline regenerado às
`2026-09-08T04:27:10.563Z`: 253 rotas, 690 arquivos frontend, 161 fontes,
88 assets, 20 evidências sem ausentes. As críticas fresh Kant e Einstein
expiraram sem veredito e foram encerradas sem edição; o plano continua `ACTIVE/HOLD` pelos
gates de PostgreSQL/RLS/E2E real, UAT, touch/zoom e leitor de tela.

## Retomada prioritária — Agenda e pacientes — 08/09/2026

O gate de integração da Agenda foi executado com `AGENDA_CONTEXT=1`: o
relatório `continuity-NbXXN0` passou 30/30 nos cinco aliases, dois temas e
1440/768/390, validando contexto estrutural no deep link/reload, texto livre
somente em memória, cards nativos Enter/Espaço, drawer/foco e overflow local.
O gate de pacientes foi executado com `PATIENT_CONTINUITY=1 FORM_ZOOM_PROXY=1`:
`continuity-2btgiv` passou 36 interações, incluindo `ownerId` sujo,
continuar/descartar, falha/sucesso, desmontagem e logout, nos dois temas e
1440/390/195×422. Ambos usam o harness SHA
`0a8336b79e40ebdfead4f76d458bbc3e3c7cb807e359abbf6fc09a87ae99c05d`, sem
falhas e com `inputsStable=true`; os testes focados passaram 109/109 e
`vue-tsc` passou. O plano segue `ACTIVE/HOLD` por backend/RLS, UAT,
touch/zoom nativos e leitor de tela.

## Retomada FEA-031 — catálogo de autorização e bundle público — 08/09/2026

O contrato de autorização foi isolado em
`apps/spa/src/navigation-permission-catalog.ts`; o router deixou de importar a
árvore visual completa da navegação. A árvore continua no shell autenticado,
rotas e aliases foram preservados e um teste dedicado valida paridade de todos
os aliases. Guards/rotas passaram 39/39, a SPA completa passou 209/1.822 e o
build PWA 808 módulos/482 precaches.

O laboratório foi recapturado com o mesmo script e três execuções por rota:
`performance-lab-2026-09-07.json` registra 489 arquivos, fingerprint
`fc96d6bd894b1fb1362ea7e7fc6bcf2333e6538f8c22b2a52242594dc00f932f`, 349.438 B
brutos/97.936 B gzip no HTML inicial, +5,98% sobre o alvo de 92.406 B, gzip de
transporte, FCP/LCP máximos de 164 ms na entrada pública e 128 ms na Agenda,
zero long task acima do limite e zero erros. O desvio ainda requer aprovação;
não se inferem INP, RUM ou métricas de campo.

Como o novo catálogo passou a integrar o fingerprint do harness, a Agenda foi
recapturada em `continuity-zS51Zc` (30/30, `inputsStable=true`, cinco aliases,
dois temas e 1440/768/390). Baseline regenerado às
`2026-09-08T04:51:09.242Z`: 253 rotas, 690 arquivos frontend, 162 fontes, 88
assets e 20 evidências sem ausentes. O plano permanece ACTIVE/HOLD até budget,
PostgreSQL/RLS/E2E real, UAT, touch/zoom nativos e leitor de tela.

## Recaptura FEA-030 — acessibilidade — 08/09/2026

O harness de continuidade passou 56/56 na matriz de acessibilidade corrente:
quatro rotas, sete larguras, dois temas e reduced motion, com Axe 0, skip-link,
foco, reflow e `inputsStable=true`. Evidência:
`docs/frontend/implementation/evidence/continuity-BUIQ3Y/report.json` (SHA
`a5870e543a673ba2c285c4af636028d03372a03a42fc01b9a1315acdbb2632d7`, harness
`6a95e1f1d3dd324ed60d55927f9773970aa4a0b1b26618afe73642030d9e1481`). A
inspeção móvel do recorte não apontou regressão material. Isso atualiza FEA-030
bounded, sem promover a evidência para leitor de tela, zoom/touch nativos,
cross-browser ou UAT; o baseline de 04:56:52.478Z mantém ACTIVE/HOLD.

## FEA-031 — serviços de guarda fora do entry público — 08/09/2026

O router deixou `api.ts` e `setup.ts` fora do entry inicial por imports
dinâmicos acionados apenas quando a restauração de sessão ou a guarda exige
esses serviços. Guards passaram 17/17, `vue-tsc` passou e a regressão SPA
completa passou 209/1.822.

O build terminou com 808 módulos/484 precaches. O laboratório registrou 491
arquivos e 346.131 B brutos/96.440 B gzip no HTML inicial, redução de 1.496 B
contra 97.936 B; o alvo 92.406 B ainda fica 4.034 B acima (+4,37%), portanto
`HOLD_FOR_OWNER_APPROVAL`. As recapturas correntes são Agenda
`continuity-GIcnDP` 30/30 e acessibilidade `continuity-kwfsaC` 56/56/Axe 0,
ambas estáveis e pós-código. Baseline de 05:10:51.639Z, sem ausentes; o ganho
é bounded/laboratorial e não promove o candidato acima de ACTIVE/HOLD.

## FEA-031 — fechamento do split de rotas e verificação final — 08/09/2026

O entry público agora contém somente as rotas necessárias antes da sessão em
`apps/spa/src/router/public-routes.ts`; a tabela privada é carregada uma vez
por `apps/spa/src/router/index.ts` a partir de `routes.ts` quando o caminho é
deferred. A primeira prova expôs que aliases da Agenda ainda caíam no fallback;
o guard foi ajustado para hidratar todos os caminhos deferred e deixar o Vue
Router resolver o registro canônico/alias. Rotas/guards passaram 32/32,
`vue-tsc` passou e a SPA completa passou 209/1.822.

O build final passou com 809 módulos/485 precaches e 492 arquivos no `dist`
(3.855.394 bytes). O HTML inicial ficou em 253.272 B brutos/76.875 B gzip,
−19.565 B contra a rodada anterior e −15.531 B (−16,81%) contra o alvo de
92.406 B. O laboratório teve FCP/LCP máximos de 172/172 ms na raiz, 84/84 ms
no login e 128/128 ms na Agenda, sem long task ou erro de página; o budget
observado está dentro do alvo, mas permanece `HOLD_FOR_OWNER_APPROVAL`.

Agenda `continuity-wCJGZ6` passou 30/30 nos cinco aliases; acessibilidade
`continuity-tQnwrY` passou 56/56 com Axe 0, sete larguras, dois temas e reduced
motion. Baseline final: `2026-09-08T05:40:00.520Z`, 253 rotas, 690 arquivos,
163 fontes alteradas, 20 evidências sem ausentes. O plano permanece
`ACTIVE/HOLD`; campo/RUM/INP, backend/RLS/E2E integrado, UAT, touch/zoom,
leitor de tela e cross-browser continuam gates externos.

## Fechamento da execução integral — 08/09/2026

O E2E integral foi repetido no candidato final com PostgreSQL descartável,
Redis nativo, migrações 0000–0164, seed/RLS e `productionReady=true`: 420/420
passaram, sem skipped/flaky/falhas, cobrindo 150 rotas e 300 navegações. O
artefato é `artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/gauntlet-full-final-20260908T071316208Z/`, com SHA
`a48d76a1835766da353f6c9618cf91d5c0fe6f87` e digest de inventário
`e624edb6623ae602988f7fa828f20bcf74226e842fc0adc54d992e24e68e2db0`.
Os recortes focados passaram 8/8 (Agenda/billing/login), 10/10 (exports) e
29/29 (visual). A medição de performance pós-build ficou em 253.272 B/76.876
B gzip no entry inicial, com FCP/LCP máximos 168/96/132 ms e zero long tasks/
erros; continua laboratório e `HOLD_FOR_OWNER_APPROVAL`.

O plano não promoveu o status: UAT/participantes, provider PIX e reversão de
produção, RUM/INP/CLS, touch/zoom nativos, leitor de tela e cross-browser ainda
exigem evidência/aceite independente. Estado global: `ACTIVE/HOLD`, sem
`DONE`, `AAA` ou `GO`.

## Retomada FEA-024 — correções e recaptura bounded — 08/09/2026

A crítica fresh rejeitou a FEA-024 por quatro lacunas concretas. Foram
implementados: limpeza de modal/razão de Alta no reset de rota, resumo não
redundante no detalhe, snapshot preservado em erro transitório com limpeza
explícita no 403, cadeia de erro/vazio sem estados contraditórios, links
diretos aos leitos, variantes semânticas no detalhe de leito e reflow móvel
da tabela com labels e `min-width: 0`.

O harness `browser-continuity.mjs` passou a executar falha inicial/retry,
vazios, 403, status `Ocupado/Manutenção/Bloqueado/Disponível` e rascunho
destrutivo durante troca de rota. A evidência
`continuity-dLYFRJ/report.json` passou `16/16`, nove interações, sem falhas e
com entradas estáveis; relatório SHA
`a20e17861cdfe14c1656248330fb75ac969ddbff07f579d94bd1880062ffe08`, harness
SHA `581c70cd1cd68db73a3db26fb1a3b58563548d572aa4e5a74fe7707b62cc23a8`.
Focused inpatient: `69/69`; renders mobile claro/escuro inspecionados.

O resultado remove a rejeição bounded da FEA-024, mas o plano segue
`ACTIVE/HOLD` por UAT/participantes, backend/RLS, provider PIX e reversão de
produção, RUM/INP/CLS, zoom/touch nativos, leitor de tela e cross-browser.

## Recertificação pós-código — 08/09/2026

As verificações locais passaram: `vue-tsc`, documentação, OpenAPI (`414`
paths), complexidade e diff-check; a regressão SPA ficou em `209/1.830`. O
build PWA fechou com `809` módulos/`485` precaches, `492` arquivos e
`3.858.893` bytes. O entry inicial ficou em `253.272` B/`76.872` B gzip,
FCP/LCP máximos `164/84/124` ms e zero long task/erro; o budget permanece
`HOLD_FOR_OWNER_APPROVAL` por ser medição laboratorial.

O runner Playwright oficial passou `420/420`, sem skipped/unexpected/flaky,
contra PostgreSQL descartável e Redis nativo, com `150` rotas e `300`
navegações. O wrapper lifecycle venceu o deadline default de 120 s antes do
fim do runner, mas o runner arquivou a execução com sucesso; a base UUID foi
removida e verificada ausente. A FEA-024 ficou bounded-pass em `16/16` com
focused inpatient `69/69`. O plano segue `ACTIVE/HOLD`; UAT/participantes,
provider PIX/reversão produtiva, RUM/INP/CLS, touch/zoom, leitor de tela,
cross-browser e aceite integral dos 34 FEA continuam fora da evidência local.

## Recaptura corrente pós-zoom proxy — 08/09/2026

O proxy de `195×422` expôs quebra de uma letra por linha no contexto do shell.
Foi corrigido em `AppLayout.vue` com uma regra específica para `≤260px` que
preserva o overline e oculta somente a trilha opcional; o harness passou a
rejeitar regressão dessa regra. Fingerprint do harness:
`30185ccb4156b894da0a9b2fdaee0b86e549a74641cd5ba0933afe033b9850da`.

Recapturas correntes: Agenda `30/30` em cinco aliases (`continuity-WblISX`),
pacientes `6` linhas/sete interações em 1440/390/195 (`continuity-FrR3ne`) e
internação `16/16` (`continuity-9TuPBV`), todas sem falhas e estáveis nos dois
temas. O focused `PatientFormPage+AppPageHeader` passou `67/67`, a SPA passou
`209/1.830`, `vue-tsc` passou e o build PWA passou `809/485`. A performance
recente ficou em `492` arquivos/`3.859.242` B, `253.272` B/`76.877` B gzip no
entry, FCP/LCP máximos `164/88/136` ms e zero long task/erro; segue
`HOLD_FOR_OWNER_APPROVAL` por ser laboratório.

O E2E integral `420/420` antecede apenas a regra isolada de `≤260px`; os três
recortes browser acima são a evidência fresh das superfícies impactadas. O
plano segue `ACTIVE/HOLD`, com UAT/participantes, provider PIX/reversão
produtiva, RUM/INP/CLS, touch/zoom nativos, leitor de tela, cross-browser e
aceite integral dos 34 FEA ainda pendentes.

## Matriz cross-browser — recorte anterior ao scheduler da FEA-013 — 08/09/2026

A fonte vigente naquele recorte passou a matriz Playwright bounded completa nos três engines:
`72/72` (`24/24` Chromium, `24/24` Firefox, `24/24` WebKit), sem skipped,
unexpected ou flaky. O recorte cobriu os seis fluxos de acessibilidade e os
dezoito cenários responsivos em `320×568`, `768×1024` e `1024×768`, incluindo
owners, Agenda, prontuário, billing, relatórios e access-control; Axe,
landmark principal, skip-link e foco de teclado passaram.

Evidência daquele recorte: `playwright-report/usability/results.json`, SHA
`86a1256dde08116df25c4f32c56dc499e098ef2b1f55f206302338c855d0233c`, finalizada
às `2026-09-08T09:45:56.037Z`. O PostgreSQL descartável foi removido e
verificado ausente (`remaining=0`). O recorte é bounded, anterior ao scheduler
atual da FEA-013, e não fecha leitor de tela físico, touch/zoom nativos,
participantes ou UAT; o plano continua
`ACTIVE/HOLD`.

## FEA-013 — estado integrado pós-crítica — 08/09/2026

A versão anterior foi rejeitada pelo crítico I1 por usar espera fixa, permitir
reenvio durante o sucesso e manter scroll suave no caminho reduzido. O candidato
atual substitui o atraso por uma fronteira cancelável de um rAF (microtask sob
`prefers-reduced-motion`), expõe `successPending`, bloqueia os 18 CTAs e faz o
scroll de erro do paciente ser instantâneo quando necessário.

Os relatórios `continuity-PLLoXB` (padrão) e `continuity-HRBnIM` (reduzido)
passaram 6/6 cada, com seis vídeos WebM por modo, estabilidade do inventário,
botão bloqueado, um rAF no modo padrão, zero rAF no reduzido e foco pós-rota.
O focused passou 9/9; a SPA 210/1.832; `vue-tsc`, build e performance passaram.
O estado durável registra o recorte como `bounded pass`, sem promoção global:
runtime de todos os formulários, timeline de dispositivo, cross-browser do
movimento, touch/zoom, AT, participantes e UAT seguem abertos. A crítica I2
fresh (`FEA-013-FC-20260908-I2`) foi encerrada como
`UNAVAILABLE_TIMEOUT_SHUTDOWN` após janelas de espera e follow-up sem mensagem
final; não há aprovação independente do candidato atual.

## Recertificação corrente pós-revisão fresh — 08/09/2026

O runner local confirmou que os artefatos stale foram substituídos por provas
fingerprintadas no harness SHA
`247a5a8b0175fcf224d4db49764829dbd8cbdb765e5eafd560201790a6f8e6df`.

FEA-007: `continuity-XHWFs6` passou 4/4 em Chromium com histórico nativo,
scroll exato e foco restaurado; o focused `useRouteFocus` + `DataTable` passou
60/60; e a matriz crítica pós-fonte passou 72/72 em Chromium/Firefox/WebKit.
FEA-012: `continuity-tdvKP0` passou 4/4 na matriz Users/DataTable e recebeu
`PASS_WITHIN_CONTRACT` S3 da crítica independente. FEA-013: `continuity-UNgisr`
e `continuity-w8uHmC` passaram 6/6 cada, padrão/reduced, incluindo o proxy CSS
de 200%, com 2/0 rAF, alerta global único e zero alerta local.

A suíte visual corrente passou 29/29 em Chromium. Goodall concluiu revisão
read-only sem mutação e manteve FEA-007 em HOLD S2, FEA-012 bounded em
PASS_WITHIN_CONTRACT S3 e FEA-013 em HOLD S2; nenhum resultado global foi
promovido. A execução integral de 420 casos continua inválida por SIGTERM
antes do fechamento, e os gates externos permanecem UAT/participantes,
revisão humana, provider PIX/reversão, RUM/INP/CLS, touch/zoom/leitor de tela
reais e aprovação integral dos 34 FEA. O plano permanece `VERIFY / ACTIVE / HOLD`.

## Tentativa integral serial final — 08/09/2026

A rodada final com os 420 casos não foi aceita: `56 passed`, `2 failed`,
`1 interrupted` e `361 did not run`. `clients` e `patients` falharam por
timeouts de 90 s em `report-registration-exports`; `services` foi interrompido
antes do fechamento. O archive
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/2026-09-08T16-50-20-994Z/`
foi rejeitado pelo validator por falta de `master-usability-audit.json`.
O cleanup de banco, Redis DB 15 e portas foi confirmado. Nenhum PASS global
é inferido; o plano permanece `VERIFY / ACTIVE / HOLD`.

## Fechamento integral corrente — 08/09/2026

O runner serial `full-final-20260908` fechou os 420 casos inventariados em
Chromium com `420 passed`, sem skipped, unexpected ou flaky. O validator
confirmou 150 rotas, 300 navegações e inventário válido. O archive está em
`artifacts/playwright/a48d76a1835766da353f6c9618cf91d5c0fe6f87/full-final-20260908/`;
`results.json` SHA
`3995a45143b4fbb2ced709aaac352b3a231c84894406a66737b229223818e837`.

O PostgreSQL temporário foi removido e verificado ausente, Redis DB 15 foi
verificado em zero e não há portas/processos E2E remanescentes. A execução
fecha o gate bounded de browser/fixture local, mas não altera o veredito
global: UAT/participantes, revisão humana, touch/zoom/leitor de tela reais,
RUM/INP/CLS, aprovação de budget, provider PIX/reversão e aceite dos 34 FEA
continuam necessários. O plano segue `VERIFY / ACTIVE / HOLD`, sem
`DONE`/`AAA`/`GO`.

## FEA-016 — mídia adaptativa à rede — 08/09/2026

O login agora escolhe poster-first quando `Save-Data` está ativo ou a conexão
reporta `2g`/`slow-2g`, além do caminho existente de `prefers-reduced-motion` e
erro de vídeo. O listener de mudança desativa reprodução/interação quando a
rede fica limitada. O teste unitário de `LoginPage` e a recaptura
`login-assets-browser.mjs` passaram; a matriz atual tem 16/16 combinações em
390/1440, claro/escuro, movimento normal/reduzido e rede normal/Save-Data/2G, com
zero MP4 nos modos reduzido/limitado, poster disponível, zero overflow e zero
erros. O relatório é
`docs/frontend/implementation/evidence/login-assets-20260908.json`, SHA
`86f8bfc7ffa7d670f2c013a3390beb45f3dc117ed96ba63f1a9a4f4a48eed0d6`.

O source/typecheck está válido e a SPA passou 211/1.855; a prova continua
bounded em Chromium com Network Information sintético. Rede real, revisão
visual humana, dispositivos e UAT permanecem gates externos; o plano segue
`VERIFY / ACTIVE / HOLD`.

## Regressão SPA corrente após a retomada — 08/09/2026

O candidato atual passou `211/211` arquivos e `1.859/1.859` testes na suíte
SPA, e `vue-tsc --noEmit` passou. O archive integral válido corrente é
`full-current7-20260909`; essa regressão confirma o estado local, mas não fecha
UAT, AT/dispositivo real, RUM/INP/CLS, budget, provider PIX/reversão ou aceite
dos 34 FEA.

## FEA-007 — recaptura ampliada final e congelamento — 08/09/2026

O harness corrente gerou `docs/frontend/implementation/evidence/continuity-qKojY5/report.json`
com 8/8 combinações, 30/30 interações, `failures=[]` e `inputsStable=true`.
O desenho de prova foi ampliado para eliminar restauração circular: `goBack()`
é seguido por asserções de `scrollY`, `history.state.scroll.top`, foco visível
e zero request documental. O mesmo cenário mantém ativação por Enter, reset de
regiões locais em push, fallbacks terminal/loading bounded, diálogo dirty,
logout, deep link, permissão e uma DataTable real com retorno de `scrollLeft`.
O focused `useRouteFocus` + `DataTable` passou 63/63; harness SHA:
`322e6d689e03e151813e692a9eae6ca3168e4fcb244f87352d8eb2ff2d169c4d`.

O manifesto cross-browser final foi atualizado para o source hash corrente
(72/72, 24/24 por engine). A execução serial planejada foi posteriormente
materializada no `full-current7-20260909`, com inspeção do archive e verificação
de cleanup. O resultado global permanece ACTIVE/HOLD.

As tentativas fresh de revisão pós-recaptura (Rawls e Euler) foram encerradas
como `UNAVAILABLE` depois de janelas bounded. O plano não usa esse estado como
aprovação: preserva a rejeição adversarial anterior, mantém o recorte atual
bounded e exige manter a validação/cleanup do `full-current7-20260909` sem
confundir a prova local com aceite global.
