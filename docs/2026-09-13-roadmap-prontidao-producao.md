---
document_status: historical
document_kind: roadmap
effective_date: 2026-09-13
owner: Liderança técnica, Produto e Operações CVG-HIS
review_cycle: archived
superseded_by: docs/2026-09-15-roadmap-pos-checkpoint-state-of-art-triplo-aaa.md
---

[Relatório atual](2026-09-13-relatorio-estado-atual-erp-cvg-his-v4.md) · [Plano executivo](2026-09-13-plano-executivo-prontidao-producao.md) · [Roadmap](2026-09-13-roadmap-prontidao-producao.md) · [Backlog executável](2026-09-13-backlog-prontidao-producao.md)

# Roadmap — prontidão para produção

## Onda imediata de reparo após auditoria

Conforme a [reauditoria do checkpoint](2026-09-13-reauditoria-checkpoint-prod-001-005.md), inserir a onda **R0** antes do aceite de F0/F1. Fases representam saídas verificadas; cinco relatórios de entrega não encerram F0/F1. As oito fases originais e 47 IDs continuam preservados.

| Ordem | Pacote dentro do cartão | Saída obrigatória | Dependência local |
| --- | --- | --- | --- |
| R0.1 | PROD-001-R1 | Recovery append-only e uma próxima ação realmente coerente | Leitura desta auditoria e controle atual |
| R0.2 | PROD-003-R1 | Build vinculado à fonte, stack privada reproduzível duas vezes, teardown exclusivo | R0.1 e identidade de trabalho registrada |
| R0.3a | PROD-004-R1 | Envelopes parciais corrigidos e consumidos pelo worker real sem duplicação | R0.2 |
| R0.3b | PROD-005-R1 | Relatórios HTTP válidos/replay/revogação sem regressão de compras | R0.2; integrações em arquivos compartilhados sequenciais |
| R0.4 | PROD-002-R1, freshness | Bytes estabilizados, shards afetados recoletados e nenhum mismatch | R0.3a/b concluídos e janela sem escrita |
| Frente externa | PROD-002-R1, retenção | Recuperação do destino durável aprovado | Operações; não bloqueia código independente |
| Próxima frente de produto | PROD-006 → 007 → 008 → 009 | Consulta paginada e filtrada corretamente, valores e estados confiáveis | R0.2; regressões afetadas e integrações reais do cartão |

A dependência original PROD-003→PROD-002 usa as saídas técnicas de identidade/isolamento necessárias ao harness; cópia externa pendente bloqueia o aceite integral de 002 e o release, sem criar espera artificial para testes locais. O reforço final de identidade em R0.4 sucede os reparos: não é pré-requisito circular para fazê-los.

Após essa onda, executar o restante do grafo. 011 recebe 169 SQL atuais (e futuras migrations adicionadas), 012 recebe 25 Vue; helpers fora da curadoria de métricas não estão automaticamente fora de executionInputs. 018 deve consumir checker real e rejeitar prova stale; 045 só aceita todos os contratos fechados no candidato final.


A sequência parte do estado **63/100, FAIL/BLOCKED** e termina com uma liberação aprovada e observada. As fases são marcos de resultado, sem datas artificiais. Trabalho preparatório pode ocorrer antes; a conclusão de cada cartão exige as dependências do backlog. Não é necessário esperar toda uma fase para iniciar um pacote independente da próxima.

## Fases, entregas e gates

| Fase | Pacotes PROD | Resultado e critério de saída |
| --- | --- | --- |
| F0 — Controle e preparação | 001, 002, 003, 019, 027 | Estado consistente, identidade e retenção definidos, harness exclusivo reproduzível, contrato SSO decidido e matriz de 11 áreas com responsáveis/aceites. Preparar cedo providers, perfil de carga, RPO/RTO e autoridades de confiança. |
| F1 — Reparos prioritários | 004–010, 022, 023 | Backfill legado completo, replay reautorizado, valores/filtros financeiros corretos, estados de tela coerentes, promoção vinculada aos bytes, logs/edge com política testada. Casos adversariais A01–A06 e A10–A11 resolvidos no escopo correspondente. |
| F2 — Contratos fundamentais | 011–013, 020, 021, 024–026 | SQL/Vue e type-only com evidência apropriada; SSO ponta a ponta; isolamento, migração, durabilidade e recuperação de eventos; jornadas clínicas homologadas. |
| F3 — Integração e estrutura | 028–034, 038, 041–043 | Domínios e providers homologados, importação conferida, alertas/traces reais e refatorações com contratos preservados. Ausência de Critical/High na revisão de cada pacote. |
| F4 — Certificação transversal | 014–018, 035–037, 039, 040, 047 | Coverage global/crítica, CI real, UAT/a11y, carga/soak, restore, supply chain, autoridades e recertificação configurada aprovados no escopo válido. |
| F5 — Ensaio no alvo | 044 | Instalação limpa, upgrade com dados prévios, deploy, smoke e rollback executados no ambiente representativo; runbook e evidência aceitos por Operações. |
| F6 — Candidato e decisão | 045 | SHA/artefatos congelados, todos os gates e aceites válidos, revisão independente e parecer GO/NO-GO. Qualquer falta mantém NO-GO. |
| F7 — Produção e acompanhamento | 046 | Após autorização: rollout controlado, verificação dos sinais, conclusão do período de observação aprovado e transferência para sustentação. Rotinas configuradas em 047 continuam recorrentes. |

Os 47 cartões aparecem uma vez na atribuição de fases. Isso não cria barreiras globais: por exemplo, PROD-017 pode avançar quando suas dependências terminarem, mesmo com uma homologação externa de F3 pendente. O contrato completo, owner, porte, dependências e provas de cada entrega estão no backlog.

## Caminho crítico e paralelismo

Um encadeamento técnico longo é `001 → 002 → 003 → 004 → 011 → 024 → 025 → 038 → 043 → 016 → 018 → 040 → 044 → 045 → 046`. Ele é ilustrativo: os demais pré-requisitos continuam obrigatórios e disponibilidade externa pode dominar o prazo.

SSO segue `019 → 020 → 021`, alimentando revisão de autorização, refatoração SPA e UAT. Financeiro segue `006 → 007 → 008 → 009`, alimentando provas Vue, pagamentos e SPA. Homologação de domínios converge em importação/conectores e UAT. Carga final aguarda as refatorações de API/SPA/worker; medir somente antes delas não certifica o candidato depois das mudanças.

Após PROD-003, dados/autorização e financeiro podem avançar em recursos isolados. O trabalho em integridade de evidência PROD-010 pode ocorrer com os reparos de produto. Preparação de cenários e acordos externos pode continuar enquanto código é corrigido. Alterações em arquivos compartilhados, manifesto, lockfile e controle canônico passam por um único integrador. Não paralelizar apenas porque os nomes dos tickets são diferentes.

## Planejamento e previsão

F0 termina com capacidade nominal por papel, pacotes G decompostos, responsáveis por acessos e decisões, estimativa em faixas e agenda dos ensaios. P/M/G no backlog mede esforço relativo, não dias. Reestimar após as primeiras entregas reais. Reservar explicitamente recursos para banco/Redis isolados, homologação, revisão independente, 72 horas de soak quando exigidas, restore e janela de mudança.

Uma espera por credencial ou aceite deve registrar responsável, informação faltante e impacto no caminho crítico. Avançar trabalho independente durante a espera; não substituir provider real por mock e declarar homologação. Provas sintéticas permanecem úteis para testes locais, com esse limite explícito.

## Tratamento de reprovação e mudança

- Falha de integridade, permissão ou dinheiro retorna ao cartão de origem e bloqueia seus consumidores.
- Falha de cobertura mantém denominador e limiares; corrigir comportamento/testes/coletores segundo o contrato vigente.
- Falha de performance exige diagnóstico e nova medição do artefato alterado; guardar a tentativa anterior.
- Falha de restore ou upgrade impede liberação, mesmo com aplicação saudável em instalação limpa.
- Mudança após o congelamento reabre PROD-045 e os ensaios afetados. Não reutilizar aprovação de outro SHA.

## Sequência de liberação

Antes de F6: reunir artefatos e digests, CI requerida, configuração e segredos por referência segura, migrações, inventário de infraestrutura, DNS/TLS, backup recuperável, runbook de instalação/upgrade/rollback, resultados de carga e UAT, responsáveis e riscos residuais. O checker de release deve executar efetivamente, sem flags diagnósticas que dispensem contratos.

Em F6: verificar todas as dependências de PROD-045, nota ≥97, dimensões críticas ≥95, zero P0 abertos e todos os gates. Obter aceites de Produto, domínio clínico/financeiro, Segurança/DPO e Operações conforme os contratos, com identidade e validade verificáveis. Apresentar a proposta concreta de produção, janela, impacto e plano de retorno para decisão final.

Em F7: confirmar backup e prontidão do plantão; aplicar o procedimento aprovado; executar migração/deploy e smoke; acompanhar erros, latência, filas, eventos e reconciliação de dados; abortar ou reverter segundo limites aprovados. Os valores de alerta, duração de hypercare e autoridade de rollback devem estar definidos antes da execução, sem serem inventados durante o incidente. Encerrar somente com estabilidade observada e aceite de Operações; manter a recertificação de PROD-047 ativa.

A aprovação do roadmap é aprovação de uma sequência de trabalho. O produto continua bloqueado até haver evidência suficiente e decisão de liberação para o candidato concreto.
