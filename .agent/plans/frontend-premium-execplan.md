# Frontend CVG Pulse — ExecPlan

<!-- engineering-framework: active_action_id=FEA-017-verify -->

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

## Milestones

1. F0/F1: baseline e continuidade, FEA-001–008. Demonstrar navegação, concorrência, saída de formulário e retorno em navegador.
2. F2: assinatura e controles, FEA-009–016. Render de página preenchida em temas e breakpoints com revisão independente.
3. F3/F4: recepção, cadastro, agenda e clínica, FEA-017–024. Tarefas completas e contratos reais.
4. F5: financeiro, estoque, laboratório, relatórios e administração, FEA-025–029. Baseline própria por domínio.
5. F6: acessibilidade, performance, regressão, UAT e dossiê, FEA-030–034. Provas frescas e aprovações previstas; não substituir humano por simulação.

## Plan of Work

Corrigir continuidade com testes comportamentais; revisar independentemente; então aplicar sistema visual às jornadas completas. Lead integra contratos compartilhados e atualiza estados apenas com evidência.

## Concrete Steps

1. [FEA-017-verify] Verificar a nova Recepção no navegador e a integração do logout; concluir crítica do layout antes de aplicar materiais e movimento aos controles.
2. Integrar resultados dos builders FEA-004/006; validar dependências, typecheck e navegador.
3. Comissionar critic fresco, sem histórico do builder; corrigir defeitos e registrar provas vinculadas aos hashes.
4. Prosseguir às próximas lacunas do backlog sem reduzir escopo.

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
