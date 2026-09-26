---
document_status: historical
document_kind: plan
effective_date: 2026-09-13
owner: Liderança técnica, Produto e Operações CVG-HIS
review_cycle: archived
superseded_by: docs/2026-09-26-plano-executivo-rodada-2.md
---

[Relatório atual](2026-09-13-relatorio-estado-atual-erp-cvg-his-v4.md) · [Plano executivo](2026-09-13-plano-executivo-prontidao-producao.md) · [Roadmap](2026-09-13-roadmap-prontidao-producao.md) · [Backlog executável](2026-09-13-backlog-prontidao-producao.md)

# Plano executivo — prontidão para produção

## Revisão executiva após o checkpoint — 13/09/2026

A [reauditoria do checkpoint](2026-09-13-reauditoria-checkpoint-prod-001-005.md) substitui a suposição de cinco cartões integralmente aceitos. Há entregas parciais comprovadas, mas **PROD-004/005 reabertos** e condições abertas em 001–003. A nota global 63/100 é baseline histórica; não foi recalculada nesta revisão. O gate atual é FAIL/NO-GO, com 246 erros críticos (241 substantivos + cinco de identidade).

**Decisão de investimento:** fazer uma onda curta de reconciliação, harness e correções de envelope/reports antes de certificar os cinco cartões. Avançar financeiro 006–009 em lane isolada, sem aguardar acesso externo de retenção. Recoletar evidência após estabilizar os reparos de produto; coletar antes e editar depois repete CP-03.

Responsáveis: Lead por PROD-001-R1 e identidade; Backend/Dados por PROD-004-R1; Backend/Auth/Relatórios por PROD-005-R1; Plataforma/QA por PROD-003-R1; Operações pelo destino durável de PROD-002-R1; Frontend/Financeiro por 006–009. Aceites originais continuam obrigatórios. Previsão de prazo deve incorporar esses reparos e a espera externa, sem prometer datas sem capacidade definida.

Indicadores atualizados: estado estrutural 11/11 PASS, porém retomada semanticamente divergente; 542 fontes críticas/2.143 executionInputs; 194 fontes especializadas; CI remota ainda falha, sem diff local; zero autoridades no ledger. Contagem de cartões enviados pelo builder não é métrica de conclusão: reportar critérios aceitos, parciais, reabertos e bloqueados.

Os objetivos, responsabilidades e gates abaixo continuam vigentes; os números de baseline anteriores são contexto histórico, e a tabela de revisão do backlog prevalece para status e próxima ação.


O CVG-HIS V4 está em **63/100, release FAIL/BLOCKED e Triplo AAA NOT PROVEN**, conforme auditoria de 13/09/2026. A decisão atual é **não liberar produção**. Este plano transforma os achados em 47 entregas verificáveis, cobrindo correção funcional, dados, autorização, identidade, cobertura, integrações, operação e liberação. A publicação destes documentos não executa nem conclui essas entregas.

## Resultado pretendido e escopo

Entregar um candidato reproduzível em que as 11 áreas funcionais tenham jornadas integradas homologadas, dados e permissões sejam preservados e a operação consiga instalar, migrar, observar, restaurar e reverter uma liberação com procedimentos ensaiados. Preservar a arquitetura modular atual — API TypeScript, SPA Vue, PostgreSQL, Redis e worker — e refatorar fronteiras com regressões protegidas. Não há justificativa nesta auditoria para uma reescrita integral.

Todo o backlog PROD-001–047 é obrigatório no escopo proposto, inclusive itens P1. A rastreabilidade no backlog cobre os 12 achados A01–A12, 35 itens MA e 30 REM; documentação histórica não substitui comportamento. Redução de escopo exige decisão explícita de Produto, avaliação de dependências e nova certificação; não pode ser inferida pelo agente para acelerar a nota.

## Ordem de investimento

| Frente | Entrega de valor | Pacotes principais |
| --- | --- | --- |
| Controle e prova | Execução retomável, candidato identificável e evidência íntegra | 001–003, 010, 027 |
| Integridade e dinheiro | Corrigir migração legada, replay após revogação e informações financeiras incorretas | 004–009, 024–026, 030 |
| Identidade e segurança | SSO completo, isolamento de tenant, dados e logs minimizados | 019–023, 033 |
| Qualidade executável | Evidência SQL/Vue, métricas reais, CI bloqueante e complexidade controlada | 011–018, 041–043 |
| Produto integrado | Homologar áreas e provedores, importação, acessibilidade e UAT | 028–035 |
| Operação e liberação | Performance, restore, observabilidade, cadeia de fornecimento e rollout comprovados | 036–040, 044–047 |

Os primeiros reparos de produto são PROD-004 e PROD-005: perda de compatibilidade de eventos legados e replay sem reautorização. A correção financeira vem na mesma primeira onda. A01 exige migração aditiva para bancos já instalados, respeitando checksums; A02 exige regressão HTTP com revogação persistida, além da reprodução composicional disponível. A06 exige vincular referências aos bytes consumidos: corrigir promoção não autoriza contornar o verificador final.

## Critérios executivos de sucesso

| Indicador | Baseline observada | Condição de saída |
| --- | --- | --- |
| Prontidão | 63/100; release bloqueada | Reavaliação independente com evidência do candidato final |
| Régua Triplo AAA | Não comprovada | Total ≥97, dimensões críticas ≥95, zero P0 abertos e todos os gates obrigatórios aprovados |
| Cobertura crítica | Checker com 240 erros; nenhum componente com quatro métricas ≥85 | Todos os componentes elegíveis ≥85 nas quatro métricas e contratos especializados SQL/Vue aprovados |
| Cobertura global | Gate de 82 sem comprovação de aprovação atual | Gate global de 82 aprovado segundo configuração vigente |
| Paridade funcional | 4/11 áreas comprovadas na auditoria | 11/11 jornadas integradas aceitas pela autoridade de domínio |
| CI | Última execução remota auditada falhou | Checks requeridos verdes no SHA final, incluindo o checker real de cobertura crítica |
| Continuidade | Estado canônico com quatro falhas | Validador de estado aprovado e uma única próxima ação coerente |
| Operação | Provas e aceites externos incompletos | Restore, carga/soak, alertas, upgrade e rollback ensaiados no alvo aprovado |

A régua é a [QUALITY_BAR_V1.json](triple-a/QUALITY_BAR_V1.json). Não confundir cobertura global 82, cobertura crítica 85 e nota de prontidão 97/95: são contratos diferentes. Não reduzir denominadores, excluir fontes difíceis ou converter type-only sem justificativa verificável. As 193 fontes especializadas e 18 instrumentações vazias requerem tratamento explícito. As notas não serão previstas por fase: serão recalculadas a partir das provas.

## Responsabilidades e capacidade

O Lead mantém dependências, despacho com arquivos permitidos, identidade e estado canônico. Backend/Dados trata autorização, transações, eventos e persistência; Frontend/QA trata jornadas e acessibilidade; Plataforma/SRE trata CI, ambientes, backup, observabilidade e release. Um revisor distinto verifica o artefato real e os casos adversariais. Produto, responsáveis clínico/financeiro, Segurança/DPO e Operações homologam as decisões de sua competência. Agentes não simulam essas autoridades.

Com capacidade disponível, usar um Lead, até dois builders em escopos independentes e um crítico. Com um único executor, executar sequencialmente e obter revisão independente nos checkpoints. Paralelismo exige arquivos e recursos isolados; API, banco, Redis, portas e diretórios de evidência não podem ser compartilhados sem contrato. Não lançar builders concorrentes sobre o mesmo arquivo. Pacotes G devem ser fatiados em entregas verticais menores antes do despacho.

Não há estimativa de calendário confiável sem capacidade, disponibilidade de providers e ambiente-alvo. Ao terminar F0, o Lead mede esforço dos primeiros pacotes, decompõe os G e publica previsão por faixa, responsável e dependência externa. Atualizar a previsão por marco; nunca abreviar UAT, soak ou restore para cumprir uma data assumida.

## Decisões a preparar imediatamente

| Decisão | Autoridade | Evidência necessária antes do aceite | Bloqueia |
| --- | --- | --- | --- |
| SSO: contrato R1–R6, escolhas C1–C6 e critérios temporais T | Produto/Segurança | Provider, claims/JWKS, associação de identidade, sessão ERP, prazos e falhas documentados | 020–021 |
| Cancelamento e entrada avulsa | Produto/Financeiro | Semântica contábil, fluxo suportado e comportamento esperado; desabilitar/remover requer decisão explícita | 007–009, 030 |
| Alvo e perfil operacional | Operações/Produto | Topologia, volume, SLO, retenção, RPO/RTO, janela de manutenção e recursos aprovados | 036–038, 044 |
| Provedores e dados de homologação | Donos de domínio | Acesso autorizado, sandbox/target representativo, cenários e responsáveis | 028–034 |
| Cadeia de confiança e autoridades | Segurança/Release | Trust roots, verificação, revogação e identidades autorizadas | 039–040, 045 |
| UAT e entrada em produção | Produto/Clínico/Financeiro/Operações | Candidato e runbook concretos, resultados de testes, riscos, janela e plantão | 035, 045–046 |

Preparar essas decisões em F0 sem bloquear trabalho independente. Valores de continuidade existentes são propostas até aprovação: banco RPO 15 min/RTO 60 min, objetos 15/90 min, Redis RTO 30 min e deploy 30 min; auditar consistência de outbox/auditoria com o banco. PROD-037 comprova os valores efetivamente aprovados, inclusive restauração após exclusões/DSR. PROD-036 preserva a exigência vigente de soak de 72 horas quando aplicável ao gate; qualquer alteração deve ser formal e anterior à medição.

## Método de execução e recuperação

1. Ativar PROD-001: reconciliar `.agent/state.json`, `.agent/backlog.json`, log e ExecPlan canônico. Os documentos em docs orientam o programa; não criam um segundo estado operacional. Esta publicação deixa a reconciliação para a execução.
2. Registrar baseline e critérios, reproduzir a falha e fixar escopo exato de arquivos/recursos. Aproveitar provas anteriores somente após verificar identidade, validade e limites.
3. Implementar a menor mudança completa, executar testes positivos e negativos na fronteira real, revisar com crítico distinto e integrar somente após aprovação do escopo.
4. Guardar comandos, saídas sanitizadas, hashes, ambiente e limitações em evidência por tentativa; atualizar estado, backlog operacional e próxima ação.
5. Se um gate falhar, registrar causa, dono e reparo; retomar do pacote responsável. Mudança material invalida as provas afetadas e exige nova coleta, inclusive depois de um marco verde.

Executar ações locais reversíveis dentro da autorização de implementação que vier a ser dada. Antes de qualquer ação de produção, apresentar candidato, resultados, janela, impacto e rollback para a autoridade competente; aprovação final não é substituída por este planejamento. Credenciais e dados sensíveis não pertencem a logs ou documentos. A reversão de aplicação não desfaz automaticamente migração de dados: testar compatibilidade e restauração separadamente.

## Gates e prestação de contas

O [roadmap](2026-09-13-roadmap-prontidao-producao.md) define oito fases com saídas verificáveis; as dependências de cada cartão determinam a ordem técnica. Reportar por marco: tarefas aceitas/pendentes, critérios aprovados/reprovados, riscos e decisão necessária, identidade da prova e próxima ação concreta. Contagem de tickets e nota isolada não autorizam release.

PROD-045 reúne todas as entregas pré-produção, configuração de recertificação PROD-047, CI do mesmo SHA, cadeia de evidência, aceites e revisão independente. O parecer deve declarar GO ou NO-GO com limites explícitos. Apenas GO e autorização de produção permitem PROD-046. Ao encerrar rollout/hypercare, registrar versão, sinais observados, incidentes, responsáveis e próxima recertificação; novas mudanças continuam sujeitas aos gates.
