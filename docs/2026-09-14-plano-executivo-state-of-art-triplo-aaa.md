---
document_status: historical
document_kind: plan
effective_date: 2026-09-14
owner: Liderança técnica, Produto e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
superseded_by: docs/2026-09-20-plano-executivo-nova-rodada-melhorias.md
---

# Plano executivo — CVG-HIS State of Art / Triplo AAA

[Auditoria vigente](2026-09-15-auditoria-checkpoint-state-of-art-triplo-aaa.md) · [Roadmap vigente](2026-09-15-roadmap-pos-checkpoint-state-of-art-triplo-aaa.md) · [Backlog vigente](2026-09-15-backlog-pos-checkpoint-state-of-art-triplo-aaa.md) · [Baseline integral de 14/09](2026-09-14-relatorio-completo-estado-construcao.md)

## 1. Mandato e resultado esperado

Transformar a base atual em um ERP veterinário integrado, seguro, acessível, resiliente e operável, com comprovação de qualidade nas fronteiras clínicas, financeiras e multi-tenant. **State of Art é o objetivo de engenharia; Triplo AAA é um resultado de gates, nunca um rótulo atribuído pelo agente.**

Esta entrega publica o planejamento para execução pelo agente. Não declara implementadas as melhorias nem concluído o programa. O perfil é brownfield, com risco global T4_CRITICAL/CROSS_SYSTEM; a atividade desta entrega é PLAN, em evolução pós-auditoria. Cada cartão deve entrar em SPEC ou BUILD conforme a maturidade real do contrato, sem fingir IMPLEMENTATION_READY para o programa inteiro.

Checkpoint auditado em 15/09: média editorial de referência 73/100 não recalculada, coverage crítica ainda FAIL21, produção/AAA NOT PROVEN. Entre os 65 cartões PROD, o estado é 1 DONE (controle), 10 BLOCKED e 54 TODO; cinco itens macro históricos ficam fora dessa contagem. Dez pacotes locais foram executados ou revalidados; isso não equivale a dez cartões integrais concluídos. No escopo PROD-061, a raiz registrou 239 arquivos PASS e 1 skip, e o lab PostgreSQL obrigatório passou 1/1 separadamente; o incidente de ambiente continua sem ACK externo comprovado. Esses resultados pertencem ao candidato/worktree descrito na auditoria vigente, não a qualquer alteração futura.

### O que será considerado entregue

- Jornadas contratadas funcionam pela interface pública, persistem e reconciliam seus efeitos; nenhum placeholder ou mock substitui o comportamento de produção.
- Gates clínicos, financeiros, de identidade, segurança, dados, recuperação e operação passam no mesmo candidato/alvo.
- As 11 áreas de paridade possuem aceite comportamental; equivalência ainda desconhecida é investigada, não inventada a partir de nomes de menu.
- UX funciona em telas pequenas, intermediárias e grandes, teclado e tecnologia assistiva; mantém contexto clínico e identidade CVG.
- Implantação, upgrade, recuperação, observabilidade e sustentação são executáveis por operadores, com donos reais.
- Scorecard rastreável ≥97 global, ≥95 nas dimensões críticas, zero P0; todos os critérios obrigatórios PASS e autoridades reais. A média editorial 73 do diagnóstico não é automaticamente o scorecard de certificação.

Não fazem parte da autorização automática: deploy/rollback em produção, mudança de proteção de branch, uso de credenciais reais, transações ou mensagens externas, acesso a dados pessoais reais, alteração destrutiva de histórico, assinatura de aceite clínico/financeiro ou aprovação do próprio agente.

## 2. Estratégia de engenharia

Preservar o monólito modular API/SPA/worker, PostgreSQL, contratos HTTP, UoW, isolamento por tenant, outbox/inbox e identidade por digest. Não reescrever o ERP, migrar framework ou adotar microserviços por preferência estética. Corrigir e caracterizar o que existe; refatorar por responsabilidade e contrato, sem transferir o mesmo monólito para outro arquivo.

Ordem econômica: reduzir risco de privacidade e evidência → estabilizar ambiente e invariantes → fechar contratos incompletos → ampliar provas e homologações → refatorar com proteção → recertificar candidato integrado → liberar somente com autoridade. UX pode avançar em fronteiras disjuntas durante a estabilização técnica; não precisa esperar credenciais de um provedor para corrigir a Agenda.

Os reparos atuais de autorização de relatórios, migração 0172, SQL/Vue especializados e wiring do checker no CI devem ser **revalidados e preservados**, não implementados novamente por leitura de um backlog antigo. Se uma reprodução atual contradizer o relatório, registrar o delta e reabrir apenas o escopo afetado.

## 3. Organização e decisão

| Papel responsável | Responsabilidade | Pode aprovar |
|---|---|---|
| Lead/agente integrador | Seleção de tarefa, contratos compartilhados, estado e integração | Entrega documental/local com revisão; não autoridade clínica ou produção |
| Backend/Dados | Invariantes, transações, migrações, IAM e worker | Evidência técnica, sujeita a crítico separado |
| Frontend/UX | Jornadas, design system, acessibilidade e performance percebida | Proposta e implementação; não próprio aceite visual |
| QA/crítico independente | Casos negativos, regressão e julgamento do artefato | Aceite técnico no escopo explicitamente revisado |
| Produto e responsáveis clínico/financeiro | Regras, escopo de equivalência e UAT | Contratos e aceites de negócio identificados |
| Segurança/DPO | PII, retenção, acesso, SSO e evidência sensível | Decisões do seu domínio, não substituídas por texto do agente |
| SRE/Plataforma e administrador do repositório | Alvos, SLO/RPO/RTO, CI, recuperação e rollout | Operações autorizadas e evidências correspondentes |
| Release owner | Go/No-Go e janela de implantação | Promoção exata de SHA/digest/configuração/alvo |

São papéis propostos; os nomes de pessoas, alvos, orçamento e prazos ainda precisam ser atribuídos. Não gravar `CONFIRMED` com um papel genérico. Em execução multiagente, somente o Lead escreve `.agent`, manifestos de identidade e contratos compartilhados. Reservar ownership para API root, router, migrations, lockfile, CI/gate e portas/bancos. Escritores não trabalham simultaneamente na mesma fronteira; críticos são read-only, contexto novo, sem descendentes.

## 4. Barra verificável do programa

Fonte normativa: [QUALITY_BAR_V1](triple-a/QUALITY_BAR_V1.json), hash auditado `26ff154d84ce80036b28886325b8d8462883e3b830282f2cf884394054b5c0e4`. O [crosswalk do prompt](triple-a/18-master-prompt-crosswalk.md) e a [matriz de evidências](engineering/REQUIREMENT_EVIDENCE_MATRIX.md) continuam obrigatórios. Este plano acrescenta critérios de execução; não altera seus thresholds ou status.

| Gate do programa | Origem | Alvo rejeitável / método | Baseline e validade |
|---|---|---|---|
| Q01 Identidade/controle | REPO, BASE-001/002, DOC-001 | Fontes, build, lockfile, config, harness, DB schema e provas vinculados; próximo passo único em estado/plano/backlog; crítica e checker do controlador | `.agent` semanticamente antigo; HEAD isolado não basta |
| Q02 Testes e coverage | REPO, MAIN-001, CLIN-001, DATA-001 | Threshold global vigente 82 e mínimo crítico 85 por métrica/componente; cinco shards e SQL/Vue atuais; zero skip em obrigações críticas; known-good/bad dos instrumentos | FAIL21; 82/85 são coverage, não notas AAA |
| Q03 Segurança/IAM/privacidade | REPO, DATA-001, USER | SSO completo, permissões/tenant/replay/RLS provados, tratamento autorizado de PII e logs, sem Critical/High de segurança aberto sem decisão válida | SSO parcial; PII documental e logs a tratar |
| Q04 Jornadas e paridade | REPO, CLIN-001, USER | Matriz contratada de todas as 11 áreas com happy/negative/concurrent/restart relevantes, persistência e aceite do dono | 4/11; camada de prova presente não é equivalência |
| Q05 Worker/resiliência | REPO, WORKER-001 | Job travado não impede progresso dos demais; cancelamento/fencing, retry/DLQ/redrive, idempotência e conclusão durável testados | Wrapper sequencial e notificação parcial sob investigação |
| Q06 UX de referência | REPO, UX-001; DERIVED | Score visual ≥95, confiança HIGH, zero Critical e High não aceito; matriz completa de rotas/estados, a11y automática+manual, crítica independente e UAT | Cinco rotas e fixtures: insuficientes para generalizar |
| Q07 Arquitetura e DX | REPO, ARCH-001 | Fronteiras e direção de dependências verificadas; hotspots decompostos por responsabilidade; contracts/build/tipos/lint mantidos; regras semânticas de lint reais | Budget passa, mas API root 8.334 linhas |
| Q08 CI/supply chain/gate | REPO, MAIN-002, SUPPLY-001, RELEASE-001 | CI remoto do candidato terminal verde; required checks e proteção confirmados; digest/SBOM/provenance/assinatura; verificadores específicos com anti-forgery | Wiring existe; vários critérios ainda PARTIAL |
| Q09 Recuperação | REPO, REC-001 | Restore, corrupção, mismatch e recuperação de dados/objetos/chaves ensaiados dentro de RPO/RTO aprovados | Implementação existe; alvo/metas/aceite pendentes |
| Q10 Capacidade e operação | REPO, PERF-001, OPS-001 | Carga e SLO aprovados, endurance 24h/72h conforme contrato, saturação/margem, alertas recebidos e respondidos | 20 iterações não substituem endurance por duração |
| Q11 Release e sustentação | REPO, FINAL-001 | Todos gates PASS atuais, scorecard 97/95/0, revisão final nova, autoridade, rollout observado, agenda de recertificação | BLOCKED / NOT PROVEN |

Todos são obrigatórios para o objetivo integral. Falha, bloqueio, ausência ou evidência stale impede promoção. Repetições não podem apagar a primeira falha; erro de harness deve ser demonstrado, reparado e revalidado com caso negativo. Nenhum agente pode estreitar o denominador, ignorar branches, trocar teste por mock ou editar score/JSON para obter PASS.

## 5. Metas por dimensão — cobertura integral do diagnóstico

As metas são **alvos de avaliação**, não resultados prometidos nem substitutos dos gates. Adotar alvo ≥95 em cada dimensão e ≥97 na avaliação global final, com o método/denominador publicado antes da medição; não manipular pesos para esconder fraqueza. Para a média editorial das mesmas 18 dimensões, divulgar também média simples comparável, separada do scorecard normativo.

| Dimensão do relatório | Base /100 | Trabalho correspondente |
|---|---:|---|
| Arquitetura/fronteiras | 80 | PROD-041, 042, 043; Q07 |
| Manutenibilidade/governança | 74 | PROD-001, 047, 049, 060; Q01/Q07 |
| API/HTTP | 80 | PROD-005, 016, 020, 024, 026; Q02/Q03/Q04 |
| Dados/transações/migrações | 80 | PROD-004, 011, 024, 034, 037; Q02/Q09 |
| Segurança/IAM/privacidade | 70 | PROD-019–023, 033, 048; Q03 |
| Cadastros/atendimento | 78 | PROD-026, 027, 055, 063; Q04/Q06 |
| Núcleo clínico | 79 | PROD-015, 024–026, 035; Q02/Q04 |
| Financeiro/pagamentos | 77 | PROD-006–009, 015, 030, 053; Q04 |
| Apoio/integrações | 76 | PROD-028–034, 052–053, 064–065; Q04 |
| Frontend/design system | 82 | PROD-035, 042, 054–059; Q06 |
| Responsividade/a11y | 78 | PROD-035, 054–059; Q06 |
| Engenharia de testes | 82 | PROD-003, 010–018, 060–061; Q02 |
| Cobertura crítica | 70 | PROD-014–016, 018; Q02 |
| CI/CD | 80 | PROD-018, 039–040, 044; Q08 |
| Gate de release | 75 | PROD-010, 039, 045, 062; Q08/Q11 |
| Operação/backup/recuperação | 65 | PROD-025, 037–038, 044, 047, 049–051; Q05/Q09 |
| Performance/endurance/observabilidade | 60 | PROD-036, 038, 041–043, 047, 050; Q10 |
| UAT/liberação | 25 | PROD-027–035, 044–046; Q04/Q11 |

## 6. Direção de UX e visual

Tese: **precisão clínica com baixa carga cognitiva**. Operadores devem identificar paciente, contexto, estado e próxima ação antes de decoração. Preservar identidade CVG e tokens semânticos; HTML/CSS/componentes para UI e texto, assets existentes com proveniência. Não gerar nova identidade, mascote ou hero sem necessidade demonstrada.

Definir antes de BUILD um contrato de cada jornada: usuário/perfil, tarefa principal, campos essenciais, sequência, navegação/retorno, estados e erros. Priorizar nome+contato no tutor, primeiro item útil na Agenda tablet e feedback de salvamento/recuperação. Separar ações irreversíveis, manter versões/conflitos visíveis, evitar duplo envio e abandono silencioso.

| Item visual do relatório | Base | Cartões e evidência final |
|---|---:|---|
| Hierarquia | 78 | 054/055/057: geometria e tarefa principal nas larguras intermediárias |
| Tipografia | 83 | 056/058: papéis consistentes, números alinhados, fallback e texto longo |
| Espaçamento/layout | 77 | 054/055/057: grid e densidade por tarefa, sem overflow |
| Cor | 88 | 058/059: tokens, contraste e estados não dependentes só de cor |
| Consistência | 85 | 042/056/058: contratos comuns sem padrões concorrentes |
| Usabilidade | 82 | 035/055/057: tarefa real, erros, recuperação e estudo humano |
| Responsividade | 78 | 054/057/059: 375/721/768/1024/1440 + breakpoints reais e limites |
| Acessibilidade | 83 | 035/059: teclado/foco/semântica/zoom/AT e política AA contratada |
| Marca | 90 | 058: identidade preservada, sem alegações inventadas |
| Assets | 86 | 058: proveniência, uso, resolução, peso e recorte |
| Polimento | 84 | 056–059: estados completos, movimento reduzido, loading/empty/error |
| Interação | 84 | 035/057/059: teclado/touch, submit, conflito, retry e retorno |
| Densidade | 72 | 054/055/057: informação essencial sem rolagem decorativa |
| Especificidade | 83 | 026/035/056: linguagem e conteúdo reais do fluxo veterinário |

Renderização não executada nesta entrega documental. A nova nota visual só será atribuída após evidência atual. Metas laboratoriais iniciais propostas: LCP ≤2,5s e CLS ≤0,1 nas rotas contratadas, com dispositivo/rede/dataset e repetições fixados antes de medir; INP e orçamento de API dependem de perfil real e política aprovada. Não chamar medição de laboratório de RUM de produção.

## 7. Decisões humanas e dependências externas

| Decisão | Dono a designar | Momento limite / trabalho que pode continuar |
|---|---|---|
| Identidade OIDC, vínculo de usuário/tenant, provisionamento e logout | Produto + Segurança | Antes de PROD-020; testes/harness e especificação podem avançar |
| Origem/acesso dos dados em docs; retenção e tratamento de cópias/histórico | DPO + Segurança | Antes de remoção irreversível; inventário restrito e exemplos sintéticos locais podem ser preparados |
| Expiração de pontos e tratamento de saldo já concedido | Produto + Financeiro | Antes de PROD-053; probe/contrato comparativo em PROD-052 |
| Runtime por ambiente e alvos de evidência | Plataforma + Release owner | Antes de deploy/drills; matriz proposta em PROD-049 |
| SLO/RPO/RTO, workload, duração, destinos de alertas e on-call | Operações + Produto | Antes da certificação 036–038; instrumentos e testes locais podem avançar |
| Trust roots, signers, retenção, revogação e required checks | Segurança + Admin repo | Antes de aceitar prova externa ou mudar configuração remota |
| Provedor fiscal/pagamento/lab/marketing/Vetus e sandboxes | Dono de domínio | Antes de homologação; contratos determinísticos não dependem de credenciais reais |
| Participantes, regras e aceite clínico/financeiro/UAT | Responsáveis de negócio | Antes de homologar jornadas; não usar aprovação simulada |
| Orçamento, janela e Go/No-Go | Sponsor + Release owner | Antes de rollout; código pronto não cria essa autoridade |

Registrar uma decisão com pessoa, escopo, data, alvo, validade e evidência. Credenciais entram por secret manager, nunca em documentos/chat/fixtures. Se a resposta faltar, bloquear apenas a tarefa dependente e escolher outra tarefa pronta; não fabricar aprovação nem encerrar o programa como AAA.

## 8. Execução, controle e evidência

Os IDs PROD-001–047 são preservados; PROD-048–065 tornam explícitas lacunas adicionais. O backlog novo é o contrato de escopo/aceite; `.agent/backlog.json` continuará sendo a fonte de status de execução, após reconciliação em PROD-001. As tabelas desta publicação são planejamento, não um segundo ledger de DONE.

Em PROD-001, ler o estado e o ExecPlan ativo completos, backlog, gates e ledgers; preservar snapshots e history; reconciliar somente com provas atuais. O plano operacional deve permanecer em `.agent/plans/` usando o contrato/template do engineering-framework, não apontar diretamente para este documento executivo. Atualizar artefato/plano → backlog → verificação/log → estado por último. Nenhum gate antigo será apagado para ocultar dívida.

Cada tarefa terá: ID, dono, escopo/allowlist, pré-condições, contrato WHAT/HOW, dependências, risco, casos positivos/negativos, execução pública, regressão, reversão, prova e próximo passo. Se o cartão distante ainda exigir decisão ou descoberta, subdividir antes de marcá-lo READY. Um relatório de implementação não autoriza DONE.

Prova mínima por tentativa: timestamp, tarefa, SHA + manifesto de bytes/config/build, ambiente, comando/versão, resultado/exit, stdout/stderr saneados, checksums, limitações, diff e parecer independente. Guardar em `artifacts/state-of-art/PROD-NNN/<run-id>/`; o caminho é proposto, será criado durante a execução. Como `artifacts` é ignorado pelo Git, PROD-002 deve assegurar retenção controlada externa; não publicar dados sensíveis.

Regra de freshness: mudança em fonte, teste, gerador, lockfile, config, schema, regra, provider, alvo ou política invalida a prova afetada. Recertificar depois de integrar; não colher cinco shards e editar suas entradas depois. Manter conhecido-bom/ruim dos verificadores, incluindo hash errado, alvo errado, prova expirada, produtor não confiável, medição duplicada e limiar ausente.

## 9. Capacidade, acompanhamento e encerramento

Planejar por entregas demonstráveis, não calendário fictício. Capacidade inicial sugerida: um Lead, até dois executores em fronteiras disjuntas e um slot de revisão; ajustar ao host e às pessoas disponíveis. WIP máximo um cartão por executor, uma coleta global/integração por vez. Não instalar dependências, migrar banco ou renovar manifesto em paralelo a uma coleta que consome esses bytes.

Tamanhos P/M/G no backlog são relativos; G exige decomposição antes de despacho. Ao concluir as primeiras fatias, medir throughput/tempo de revisão, estimar cenário provável e conservador e acrescentar lead time externo. Endurance 24/72h contém duração física e não pode ser comprimido para satisfazer uma data. Não há prazo de produção aprovado nesta publicação.

Painel por marco: P0 abertos; déficits por componente; pass/fail/skip; paridade aceita; Critical/High de UX; proporção de provas atuais; autoridades pendentes; incidentes/recuperação; riscos e próxima ação. Reportar separadamente implementação local, verificação integrada e aceite externo. Não usar quantidade de arquivos/testes ou cartões escritos como progresso de produto.

**Próxima ação única: PROD-001, reconciliação de continuidade baseada na auditoria de 14/09.** A criação deste planejamento não inicia PROD-004 automaticamente e não altera o estado operacional por atalho. A promoção final depende de PROD-045; a operação em produção depende de PROD-046 com autorização específica.

## 10. Aceite desta publicação, não do produto

Critérios documentais: PL01 todos os A01–A13 e itens pontuados mapeados; PL02 cartões com dono/dependência/aceite/prova; PL03 DAG sem ciclos e início executável; PL04 história/IDs preservados e precedência explícita; PL05 limites humanos e gates sem auto-PASS; PL06 comandos e isolamento seguros; PL07 metadados/links consistentes. Validar documentos e grafo, revisar separadamente e registrar limites. Nenhum teste de runtime ou nova nota de produto será inferido dessa validação.
