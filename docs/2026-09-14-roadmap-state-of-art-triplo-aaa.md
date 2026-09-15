---
document_status: historical
document_kind: roadmap
effective_date: 2026-09-14
owner: Liderança técnica, Produto e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
superseded_by: docs/2026-09-15-roadmap-pos-checkpoint-state-of-art-triplo-aaa.md
---

# Roadmap — do candidato atual à operação Triplo AAA

[Baseline](2026-09-14-relatorio-completo-estado-construcao.md) · [Plano executivo](2026-09-14-plano-executivo-state-of-art-triplo-aaa.md) · [Backlog](2026-09-14-backlog-state-of-art-triplo-aaa.md)

## 1. Como executar

As ondas são resultados verificáveis, não sprints com datas prometidas. Os cartões e suas dependências no backlog são o grafo autoritativo; uma onda pode abrir trabalho de preparação posterior, mas não concede seu aceite. Nenhum marco está concluído por esta publicação. A primeira ação é PROD-001, não repetir automaticamente PROD-004 do estado antigo.

Fluxo principal: **R0 continuidade → R1 invariantes → R2 contratos completos → R3 jornadas → R4 qualidade integrada → R5 alvo certificado → R6 candidato aprovado → R7 entrada controlada**. A trilha visual inicia depois do harness de R0/R1 e acompanha R2–R4. Decisões externas são solicitadas em R0; esperar por credenciais só na véspera de R5 atrasaria o caminho crítico.

## 2. Ondas com entrada, demonstração e saída

| Onda | Entrega observável e cartões principais | Entrada | Demonstração / gate de saída |
|---|---|---|---|
| R0 Continuidade e confiança | PROD-001, 002, 048, 049; especificações 019/027/052 iniciadas cedo | Relatório de 14/09, worktree preservado | Um próximo passo coerente; snapshot e retenção definidos; risco documental inventariado sem expor dados; matriz de ambientes e decisões atribuídas. Q01; decisões não aprovadas permanecem pendentes |
| R1 Ambiente e invariantes | PROD-003–013, 024, 061 | Controle reconciliado, recursos exclusivos | Build → API/SPA/worker/PG/Redis do mesmo código; regressões atuais de envelope/replay/financeiro; DB real fail-closed; SQL/Vue/instrumentação com prova íntegra. Q01/Q02/Q03 no escopo |
| R2 Contratos incompletos e resiliência | PROD-019–023, 025, 050–053, 062 | Contratos e decisões aplicáveis; harness R1 | Login SSO integrado; job pendurado isolado; notificação durável; fidelidade conforme decisão; verificadores rejeitam falsificações. Q03/Q05 e caminho técnico de Q08, sem promover homologação sintética |
| R3 Jornadas completas | PROD-026–034, 063–065 | Dados e worker estabilizados; matriz 027 | Cadastro → agenda/triagem → clínica → exames/receita/internação/alta → comanda/recebimento → estoque/auditoria; reconciliar regras e 11 áreas. Q04 local; aceites de provedores ficam em trilha-alvo |
| R4 Qualidade transversal | PROD-014–018, 035 preparação, 041–043, 054–060 | Invariantes/jornadas caracterizadas; contrato compartilhado estável | Cobertura por componente, lint semântico, hotspots decompostos, matriz visual/a11y completa e build integrado. Q02/Q06/Q07 locais; após refatorar, recolher evidência afetada |
| R5 Homologação e operação em alvo | Fechamentos externos 021/028–035; PROD-036–040, 044, 047 | Candidato estável, alvos/autoridades/credenciais aprovados | UAT humano, provedores, carga/endurance, restore/corrupção/mismatch, alerta recebido, instalação/upgrade/reversão, supply chain e CI reais. Q04/Q08/Q09/Q10 |
| R6 Recertificação e Go/No-Go | PROD-045 | Todos os pré-requisitos 001–044 e 047–065 aceitos | Freeze de bytes/config/schema/digest; regressão integrada atual; scorecard 97/95/0, crítico final novo, todos gates PASS e release owner. Q11 pré-promoção |
| R7 Entrada controlada e sustentação | PROD-046; aplicação recorrente da política 047 | Go explícito de 045 para alvo/janela | Rollout observado, abort/recovery disponíveis, conciliação e negócio corretos, janela encerrada pelo dono; evidência e rotina operacional transferidas. Q11 operação |

Cobertura tem dois momentos: melhoria contínua com os cenários em R1–R4 e coleta de certificação depois da última integração. Não transformar refatoração em precondição para escrever qualquer teste. Os cartões 014–016 podem produzir testes cedo; seu aceite final requer dependências e bytes integrados.

## 3. Caminhos críticos e paralelismo permitido

| Trilha | Sequência de dependências que governa o prazo | Pode avançar enquanto espera |
|---|---|---|
| Segurança/identidade | 001 → 019 → 020 → 021 → 035 → 045 | Harness local, cenários negativos e contrato de vínculo; não chamar provider real sem autorização |
| Dados/worker/clínica | 003 → 004/005 → 024 → 050/051 → 025 → 026 → 035 | Casos determinísticos e preparação de datasets sintéticos |
| Coverage e CI | 010–013 + invariantes → 014–017 → 018 → 040 → 044 → 045 | Diagnóstico de ramos, testes e inventário; uma janela única para coleta final |
| Alvo/recuperação/capacidade | 049 + 024/025 → 038 → 036/037 → 044 → 045 | Instrumentos e runbooks; metas/alvos ainda exigem pessoas |
| Paridade/provedores | 027 + domínio estabilizado → 028–034/063–065 → 035 → 045 | Mocks para contrato local, nunca como encerramento externo |
| Visual | 003/012 → 054/055/056/058 → 057/059 → 035 → 045 | Layout/copy/a11y em arquivos disjuntos; conferir regressão depois de 042 |

As barras indicam conjuntos, não instruções para todos editarem ao mesmo tempo. Backend auth e coverage auth compartilham fontes; owner único. API root/worker root/router, CI/gate, migrations, lockfile e identidade são áreas de integração serializada. Se uma dependência bloquear, escolher outro cartão READY sem falsificar DONE do bloqueado.

## 4. Primeira janela de trabalho do agente

1. **PROD-001:** recuperar controlador e comparar auditoria/estado/código; publicar mapa dos 65 contratos e uma próxima ação, sem concluir cartões históricos por inferência.
2. **PROD-002 local + PROD-048 inventário:** fixar identidade, recursos e provas restritas; abrir decisões de retenção e privacidade. A homologação de armazenamento externo pode esperar; não pode desaparecer do aceite.
3. **PROD-003 + PROD-061:** obter ambiente descartável reproduzível, banco obrigatório disponível e suite ML real; não depender de `.env` do usuário ou matar processos por porta.
4. **PROD-004/005/006–009:** reproduzir os aceites no código atual, preservar reparos já presentes, corrigir somente contraprovas atuais. Registrar delta em vez de duplicar migração ou refazer guard.
5. **PROD-010–013:** conferir integridade e classificações; não reduzir a proveniência atual a mero nome de arquivo. O caminho especializado existente deve ser revalidado, não reconstruído sem motivo.

Ao sair dessa janela, o agente deve entregar uma demonstração vertical persistida, controle coerente e pacote revisado. Ainda não deve anunciar AAA. Metas de tempo só serão estabelecidas após aferir o trabalho e as dependências dessa janela.

## 5. Trilha visual até qualidade de referência

Marco V1: corrigir Agenda entre 721 e 1024 e essenciais do tutor mobile; testes devem falhar na versão antiga. Marco V2: unificar linguagem/papéis tipográficos, tokens, assets e estados, preservando CVG. Marco V3: mapear todas as rotas críticas das 11 áreas, navegadores, temas e estados; provar semântica, foco/teclado, touch, zoom/reflow, contraste e movimento reduzido. Marco V4: completar jornadas contra API/DB reais e UAT com operadores; crítica visual independente com confiança HIGH e nota ≥95.

A matriz mínima inclui larguras 375/721/768/1024/1440 e limites dos breakpoints reais; modo claro/escuro, texto longo/curto, vazio, erro, retry, loading, sucesso, conflito e acesso negado quando aplicáveis. Teste a 200% e reflow estreito com controles alcançáveis; a obrigação de primeira informação na dobra usa viewport nominal, não exige comprimir conteúdo ampliado. Registrar exceções com motivo e dono, nunca omitir o estado difícil.

## 6. Retorno seguro e reabertura

| Evento | Conduta |
|---|---|
| Teste negativo confirma bug | Preservar reprodução → correção mínima → regressão → crítico fresco |
| Falha ambiental | Registrar causa/exit; reparar o ambiente isolado; rerun sem apagar tentativa anterior |
| Fonte/harness/config muda após coleta | Invalidar apenas provas afetadas e recolher; não editar digest para “corrigir” resultado |
| Mudança de regra de negócio | Voltar à decisão/contrato e atualizar casos; não tratar preferência do agente como requisito |
| Migração falha | Preservar estado, inspecionar aplicação parcial; roll-forward/restore ensaiado, nunca editar migration aplicada |
| Integração cria regressão | Suspender marco afetado; preservar mudanças de terceiros; desfazer somente a própria alteração segura ou propor reversão autorizada |
| Falta autoridade/alvo/provider | Bloquear fechamento externo e avançar uma fatia independente pronta |
| Critério obrigatório falha | NO-GO do marco/release; média, prazo ou aprovação local não compensam |

Rollout e drills em alvo só começam com limite de blast radius, abort trigger, backup, owner e autorização. Não repetir pagamento, envio, importação ou deploy porque um log ficou incompleto: conferir a fonte autoritativa e a idempotência antes.

## 7. Planejamento de prazo e saúde do programa

Sem datas fictícias. Cada onda tem previsão atualizada por capacidade observada, tamanhos refinados, horas de coleta, revisão/rework e lead time de autoridade/provedor. Explicitar intervalos e hipóteses; não somar pontos como dias. Publicar por checkpoint: entregas aceitas, falhas, provas stale, riscos, bloqueios externos e próxima tarefa pronta.

O resultado terminal é PROD-046 com operação aceita; o agente não deve encerrar “programa completo” em PROD-018 (coverage), PROD-035 (UAT) ou na criação de arquivos. Se a execução parar por recursos, entregar handoff retomável com estado e próxima ação, declarando trabalho restante. Este roadmap é planejamento publicado, não avanço de implementação.
