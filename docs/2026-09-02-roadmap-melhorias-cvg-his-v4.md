---
document_status: current
document_kind: roadmap
effective_date: 2026-09-02
owner: Engenharia e Produto CVG-HIS
review_cycle: monthly
---

> Atualizacao de execucao (2026-09-03): o progresso das ondas e os gates ainda externos estao na [matriz de implementacao](./2026-09-03-implementacao-plano-cvg-his-v4.md).

# Roadmap de melhorias do CVG-HIS V4

Este roadmap transforma o [plano executivo](./2026-09-02-plano-executivo-melhorias-cvg-his-v4.md) em ondas de entrega. A baseline e as notas estão no [relatório](./2026-09-02-relatorio-reauditoria-cvg-his-v4.md); os itens executáveis estão no [backlog](./2026-09-02-backlog-priorizado-cvg-his-v4.md).

As durações são faixas indicativas em sprints de duas semanas. A data de go-live não deve ser fixada antes de conhecer disponibilidade de equipe, sandboxes e janelas dos provedores.

## 1. Visão por ondas

| Onda                          | Horizonte indicativo       | Objetivo                                       | Entregas principais                                                                     | Gate de saída           |
| ----------------------------- | -------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| R0 — Segurança e determinismo | 1 sprint                   | eliminar bloqueadores P0                       | roles PostgreSQL, runner portável, cleanup/subprocesso e quatro regressões              | G0/G1 local verde       |
| R1 — Release reproduzível     | 1–2 sprints                | provar o mesmo SHA fora da máquina local       | coverage ≥82%, CI protegida, Helm real, artefatos, restore e rollback                   | G1/G2 verde             |
| R2 — ERP e operação interna   | 2–4 sprints                | fechar gaps sem dependência externa            | relatórios, cadastros financeiros, reconciliação, acessibilidade, SLO e observabilidade | ≥9/11 domínios          |
| R3 — Homologação externa      | 3–6 sprints, paralelizável | validar provedores e migração                  | laboratório, fiscal, pagamentos, comunicação, Live Pet/Live Lab e Vetus                 | 11/11 ou exceção formal |
| R4 — Certificação e cutover   | 1–2 sprints                | transformar o candidato em release operacional | freeze, regressão final, carga, DR, cutover/rollback e aceites                          | G4 e go/no-go           |

## 2. R0 — Segurança e determinismo

### Entregas

- criar um contrato único de capabilities para `cvg_api` e worker;
- alinhar `NOINHERIT`, memberships, privilégios de tabela, funções `SECURITY DEFINER` e `search_path`;
- manter `DATABASE_REQUIRE_RLS_ROLE=1` em qualquer ambiente de promoção;
- substituir comandos shell interpolados por execução com binário e argumentos estruturados;
- corrigir resolução do `pnpm` no teste de consumidores do worker;
- corrigir cleanup de prescrições respeitando a FK de revisions;
- corrigir paginação de auditoria e limites de data/estoque;
- adicionar regressões para caminhos com espaço, fuso e instante inicial/final.

### Critério de saída

- `safe=true` para todas as roles de runtime em banco recém-criado;
- suíte crítica oficial executa a partir do caminho atual;
- zero falha e zero erro na matriz PostgreSQL;
- nenhuma permissão extra concedida apenas para satisfazer o teste;
- evidência revisada por segurança e banco.

## 3. R1 — Release reproduzível

### Entregas

- elevar cobertura a 82% em todas as métricas, priorizando código de risco;
- tornar obrigatórios na `main` os checks de build, types, lint, testes, coverage, critical e security;
- executar a partir de checkout limpo e publicar relatórios/artefatos por SHA;
- renderizar e validar Helm com o binário real;
- ensaiar criação vazia, upgrade, backup, restore, deploy e rollback;
- registrar RPO/RTO, responsáveis e critérios go/no-go;
- executar 20 rodadas consecutivas da suíte crítica para detectar flakiness.

### Critério de saída

- G0, G1 e G2 verdes no mesmo commit;
- restore atende aos objetivos aprovados;
- `main` exige PR/revisão e não aceita merge com check pendente ou vermelho;
- nota projetada, somente após evidência: **89 global / 84 produção**.

## 4. R2 — ERP e operação interna

### Entregas

- completar relatórios históricos Vetus e entregas agendadas;
- corrigir e padronizar filtros de data com timezone explícito;
- persistir bancos, meios de pagamento, máquinas, regras de split e demais cadastros hoje estáticos;
- concluir settlement, refund e conciliação auditável;
- estabelecer SLOs por jornada e executar carga representativa;
- comprovar tracing ponta a ponta API → banco/Redis → worker/provedor;
- executar auditoria de acessibilidade e corrigir barreiras críticas;
- consolidar o índice documental e a identidade V4/versionamento.

### Critério de saída

- pelo menos 9/11 domínios Vetus verificados;
- relatórios críticos conciliam com a fonte contábil/operacional;
- SLOs têm baseline, margem e alertas acionáveis;
- nota projetada, somente após evidência: **91 global / 88 produção**.

## 5. R3 — Homologação externa

As trilhas abaixo devem ocorrer em paralelo quando houver equipe e sandbox disponíveis.

| Trilha                | Cenários mínimos                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Laboratório/Live Lab  | solicitação, aceite, resultado, correção, duplicidade, indisponibilidade e reconciliação |
| Fiscal/NFS-e          | emissão, rejeição, consulta, cancelamento, timeout, idempotência, XML/PDF e certificado  |
| Cartões/PIX           | autorização, captura, split, settlement, refund, chargeback/rejeição e conciliação       |
| Marketing/comunicação | envio real, opt-out, bounce, retry, rate limit e auditoria de consentimento              |
| Live Pet              | criação/atualização, duplicidade, erro, retry e reconciliação                            |
| Migração Vetus        | amostra assinada, contagens, checksums, reconciliação financeira/clínica e rollback      |
| LGPD                  | acesso, exportação, correção, retenção, anonimização, mascaramento e trilha de auditoria |

### Critério de saída

- 11/11 domínios verificados, ou exceção temporária assinada;
- nenhuma credencial real armazenada no repositório ou evidência;
- dashboards e runbooks de falha aprovados;
- nota projetada, somente após evidência: **93 global / 92 produção**.

## 6. R4 — Certificação e cutover

### Entregas

- congelar escopo e identificar o SHA candidato;
- rodar regressão completa, segurança, carga e verificação de dados;
- executar game day com falha de API, worker, Redis, banco e provedor;
- ensaiar cutover e rollback com cronômetro, responsáveis e comunicação;
- revisar acessos, segredos, retenção, backups e alertas;
- obter aceite de engenharia, QA, operação, produto, segurança/DPO e patrocinador.

### Critério de saída

- G4 verde e decisão go/no-go registrada;
- ausência de P0/P1 impeditivo;
- RPO/RTO e SLO cumpridos;
- nota alvo: **≥95 global / ≥95 produção**.

## 7. Dependências críticas

| Dependência                                 | Bloqueia     | Ação antecipada                                      |
| ------------------------------------------- | ------------ | ---------------------------------------------------- |
| disponibilidade de sandboxes e certificados | R3           | solicitar acessos e janelas durante R0               |
| equipe de negócio Vetus                     | R2–R4        | reservar responsáveis para critérios e reconciliação |
| ambiente semelhante à produção              | R1–R4        | provisionar antes de concluir correções locais       |
| metas de RPO/RTO/SLO                        | R1–R4        | aprovação executiva antes dos ensaios                |
| dados Vetus sanitizados e representativos   | R3           | definir amostra, custódia e descarte seguro          |
| branch protection e CI remota               | R1 em diante | configurar assim que os P0 estiverem corrigidos      |

## 8. Evolução esperada das notas

| Marco               | Global | Produção |                Paridade |
| ------------------- | -----: | -------: | ----------------------: |
| Baseline 2026-09-02 |     84 |       68 |                    4/11 |
| Saída R0            |     86 |       76 |                    4/11 |
| Saída R1            |     89 |       84 |                    4/11 |
| Saída R2            |     91 |       88 |                   ≥9/11 |
| Saída R3            |     93 |       92 | 11/11 ou exceção formal |
| Saída R4            |    ≥95 |      ≥95 |                   11/11 |

As notas acima são metas, não crédito antecipado. Cada uma deve ser recalculada a partir das evidências do commit promovido.

## 9. Cadência de gestão

- triagem diária curta dos P0 durante R0;
- revisão semanal de riscos, dependências externas e evidências;
- demonstração e aceite ao final de cada sprint;
- reauditoria parcial ao fechar cada gate;
- reauditoria integral antes do release candidate e antes do go-live;
- fechamento mensal de documentos obsoletos e exceções vencidas.
