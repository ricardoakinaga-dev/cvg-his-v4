---
document_status: current
document_kind: baseline
effective_date: 2026-09-07
owner: PMO, Engenharia, Produto e QA CVG-HIS
review_cycle: weekly
---

# Relatório de estado atual — ERP CVG-HIS V4

**Data da avaliação:** baseline de 06/09/2026; revalidação técnica em 07/09/2026 — America/Sao_Paulo
**Escopo:** código, testes, documentação, evidências locais disponíveis e prontidão operacional do worktree compartilhado.  
**Decisão atual:** **NO-GO para produção crítica e para certificação Triplo AAA.** O sistema tem uma base extensa e executável, mas ainda não há prova integrada suficiente de banco-alvo, provedores, paridade completa, operação e aceite humano.

Este relatório é a baseline ativa do programa [ERP State of Art / Triplo AAA](./2026-09-06-plano-executivo-erp-state-of-art-triplo-aaa.md). A nota mede maturidade observada; não substitui gates obrigatórios. Um único bloqueador de segurança, integridade financeira, isolamento, recuperação ou aceite pode impedir uma promoção mesmo com nota global alta.

## 0. Adendo de execução — 07/09/2026

A revalidação desta rodada confirmou avanço técnico, mas não mudou a nota
histórica nem a decisão de promoção. O worktree continua compartilhado e sem
um candidato imutável; portanto, esta seção registra `PASS_BOUNDED`, não
certificação.

| Evidência fresca           | Resultado observado                                                                                                                                                                                                                                                                    | Limite que permanece                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                | PASS, exit code 0 no workspace; API confirmou 564 testes; SPA confirmou 198 arquivos/1.668 testes; worker e pacotes compartilhados sem falha; 1 integração laboratorial opcional foi pulada por ambiente                                                                               | o harness usa o banco explícito do `.env` quando disponível e não substitui o critical gate em ambiente dedicado                    |
| `pnpm test:critical`       | **PASS_BOUNDED**, exit code 0; critical database/setup com 65 arquivos/594 testes e critical process com 10/10 cenários, em PostgreSQL/Redis locais efêmeros, sem fallback e com cleanup por cenário                                                                                   | não prova checkout limpo, CI remoto, target, providers ou repetição de recertificação                                               |
| E2E SPA scoped             | **PASS_BOUNDED**, exit code 0; 9/9 jornadas contra API, PostgreSQL e Redis reais; matriz visual 29/29 e auditoria master 299/299 também passaram com cleanup sem erro                                                                                                                  | não cobre internação/alta e financeiro amplo, WCAG independente, browsers adicionais, target, CI remoto, providers ou aceite humano |
| `pnpm typecheck`           | PASS, 67/68 projetos selecionados                                                                                                                                                                                                                                                      | checkout limpo e execução remota no mesmo SHA ainda não comprovados                                                                 |
| `pnpm lint` / `pnpm build` | PASS; API, worker e SPA/PWA construídos                                                                                                                                                                                                                                                | warnings de chunk/import dinâmico continuam como observação de performance                                                          |
| Contratos estáticos        | PASS em OpenAPI (413 paths, 40 tags, 518 schemas), namespaces, migration-source, deploy-surface, RLS (168/169 com 1 exceção documentada), docs e segurança enterprise (0 crítico/alto/moderado conhecido)                                                                              | roles/grants no target, CI remoto, rollout e evidência operacional real ainda faltam                                                |
| Prontidão/paridade         | `readiness:enterprise` 92/100: 28 PASS, 3 WARN, 1 FAIL; `vetus:parity:audit` confirma 4/11 domínios; `external:check` 0/10 prontos                                                                                                                                                     | o FAIL de paridade e os bloqueios externos continuam impedindo promoção; o score mede camadas de prova, não equivalência funcional  |
| Integridade de runtime     | guard estrito `REQUIRE_TEST_DB`; allocator durável de número de venda na migration 0162; migration 0163 aplica `FORCE RLS` incrementalmente; migration 0164 corrige cascata legítima de billing; API/worker exigem schema, policies e `FORCE RLS`; critical gate e E2E scoped passaram | E2E amplo, recuperação no target, CI remoto e aceitação de release ainda não executados                                             |
| Frontend                   | navegação, scroll/foco e componentes compartilhados receberam correções; E2E scoped 9/9, matriz visual 29/29 e auditoria master 299/299 estão verdes                                                                                                                                   | WCAG/leitor de tela independente, browsers adicionais, target e aceite humano continuam pendentes                                   |

Evidência visual adicional: os snapshots foram comparados com a implementação
vigente antes da promoção; o login usa poster estático para retirar variação do
vídeo decorativo, e a agenda visual seleciona a visão diária pela query pública.
A repetição sem `--update-snapshots` passou 29/29. A auditoria master passou
299/299 depois de cada rota receber uma página nova, eliminando o falso negativo
causado por acúmulo do renderer. Isso aumenta a confiança local de UX, mas não
é aceite independente de acessibilidade nem certificação AAA.

O lote crítico/enterprise subsequente passou **40/40** casos contra o mesmo
envelope real, cobrindo RBAC, internação, agenda, billing, axe, responsividade,
relatórios e finanças. As falhas anteriores de contrato da agenda e dos filtros
de relatório foram corrigidas e não reapareceram nessa execução.

O lote D também passou **40/40** no estado atual: NFS-e, setup, isolamento
tenant, fluxos Vetus, webhooks e as 29 provas visuais. O conjunto visual foi
executado sem atualização de snapshots e permaneceu verde.

A reexecução final do processo crítico precisou usar a URL administrativa de
migração apenas para criar/destruir as bases efêmeras e os binários Redis
privados explicitamente, pois o papel definido em `DATABASE_URL` no `.env` não
possui `CREATEDB`. O resultado funcional permaneceu 65/65 arquivos e 594/594
testes de banco, mais 10/10 processos; a diferença é um requisito de bootstrap
do host que deve ser resolvido no CI/target, não mascarado por fallback.

As tentativas de crítica independente em contexto fresco foram encerradas sem
parecer utilizável e sem tocar no checkout. Isso é uma lacuna de evidência, não
uma aprovação implícita. A nota global permanece **75/100** até uma nova
reavaliação dos 67 itens com evidência comparável.

## 1. Sumário executivo

| Dimensão                  |     Peso | Nota atual | Confiança                                     | Leitura executiva                                                                                                                                        |
| ------------------------- | -------: | ---------: | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engenharia                |      40% |   **85,5** | Alta para gates locais; média para integração | Código amplo, build e qualidade estática fortes; critical gate local agora é reproduzível, mas target, CI, coverage e checkout limpo permanecem abertos. |
| Produto e paridade        |      35% |   **75,6** | Média                                         | Núcleo clínico, cadastros e estoque são reais; providers e 7 dos 11 domínios de paridade permanecem sem homologação.                                     |
| Operação                  |      15% |   **58,4** | Média-baixa                                   | Há automação e runbooks, mas target, carga, restore/RTO-RPO, CI remoto e cutover não foram comprovados.                                                  |
| Governança                |      10% |   **59,4** | Média                                         | Documentação rica e controles locais existem; UAT humano, LGPD independente e controles SOC2 reais ainda não fecharam.                                   |
| **Nota global ponderada** | **100%** | **75/100** | Média                                         | **Avançar em construção/homologação; manter promoção bloqueada.**                                                                                        |

Fórmula: `0,40 × 85,5 + 0,35 × 75,6 + 0,15 × 58,4 + 0,10 × 59,4 = 75,3`, arredondada para **75**. As notas individuais não são porcentagens de código implementado; consideram comportamento, evidência atual, limites e risco de uso.

## 2. Evidência executada e limites — snapshot-base de 06/09

As linhas abaixo preservam o snapshot que originou a nota. Quando houver
divergência, o adendo de 07/09 é a evidência técnica mais recente; a ausência
de uma linha no adendo não significa que um gate externo tenha sido aprovado.

| Verificação                                            | Resultado observado em 06/09                                                                                  | Limite que permanece                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                       | PASS, 70/71 projetos selecionados                                                                             | não substitui teste de integração e execução no alvo                                                            |
| `pnpm lint`                                            | PASS                                                                                                          | análise estática não prova comportamento de runtime                                                             |
| `pnpm build`                                           | PASS; SPA construída com PWA gerado                                                                           | avisos de chunk/import dinâmico seguem não bloqueantes, mas devem ser acompanhados                              |
| `pnpm test`                                            | PASS local; SPA 1.521 testes e API 564 testes, além dos testes do worker                                      | uma integração opcional de laboratório foi pulada; o teste carregou o `.env` existente                          |
| `pnpm test:coverage`                                   | PASS do pacote: 2.433 testes, 1 skip; statements 82,32%, branches 82,29%, functions 85,01%, lines 82,32%      | o escopo instrumentado exclui rotas, repositórios e vários módulos críticos; não equivale a 85% de todo o ERP   |
| `pnpm docs:validate`                                   | PASS                                                                                                          | valida links/estrutura governada, não coerência semântica total                                                 |
| OpenAPI/namespaces/migration-source/RLS/deploy-surface | PASS local; OpenAPI com 413 paths, 40 tags e 518 schemas; RLS 167/168 tabelas com 1 exceção documentada       | render Helm executável, CI remoto, grants/target e rollout ainda faltam                                         |
| segurança                                              | secret scan e enterprise security PASS; zero crítico/alto conhecido no gate                                   | rotação, break-glass e revisão independente no alvo não executados                                              |
| `pnpm complexity:check`                                | PASS no limite configurado                                                                                    | hotspots não foram decompostos; não há margem segura para crescimento                                           |
| `pnpm vetus:parity:audit`                              | PASS do inventário; paridade funcional verificada em 4/11 domínios                                            | 7 domínios, providers e aceite de negócio continuam pendentes                                                   |
| `pnpm readiness:enterprise`                            | 95/100 estático: 42 PASS, 3 WARN, 1 FAIL                                                                      | o FAIL é paridade Vetus; o score mede camadas de prova, não feature parity                                      |
| `pnpm external:check`                                  | 0/10 dependências externas prontas; 10 bloqueadas, em modo advisory                                           | exige credenciais, decisão de provider, ambiente e responsáveis externos                                        |
| critical bootstrap                                     | FAIL: banco isolado `cvg_his_v4_test` indisponível; Docker não está instalado                                 | ausência de ambiente é limitação de reprodução, não diagnóstico automático de migração defeituosa               |
| `pnpm test:e2e:spa:setup`                              | FAIL após 30 s; API tentou PostgreSQL/Redis alvo, caiu em fallback de memória e ficou unhealthy               | não há prova browser-to-database no estado atual                                                                |
| worktree e release                                     | `git diff --check` PASS; checkout limpo FAIL com 676 entradas modificadas/deletadas/renomeadas/não rastreadas | candidato imutável, SHA único e CI remoto ainda não existem                                                     |
| evidência visual                                       | várias revisões scoped passam em 375/768/1440, estados, dark/light e teclado                                  | não há certificação visual global; dashboard tem mismatch com baseline e ainda falta revisão assistiva completa |

Os testes de pacote e cobertura preservaram explicitamente o banco definido no `.env` (`cvg_his_v2`); não devem ser descritos como execução em banco descartável limpo. A reprodução crítica precisa de banco e Redis dedicados, sem fallback silencioso.

## 3. Régua Triplo AAA

“State of Art” e “Triplo AAA” são objetivos de qualidade, não uma declaração já conquistada. O programa somente poderá usar o selo **AAA candidato** quando todos os critérios abaixo estiverem satisfeitos no mesmo candidato e com evidência fresca:

| Gate                | Critério mínimo de aprovação                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Engenharia          | build, tipos, lint, testes relevantes, critical gate, migrações, RLS, autorização, idempotência e contratos passam em checkout limpo; nenhum defeito Critical/High aberto.                                                     |
| Produto             | escopo de release definido; jornadas críticas persistem e recuperam após retry/restart/falha; os 11 domínios de paridade do escopo amplo têm cenários comportamentais e aceite de negócio, ou existe exceção formal explícita. |
| Integrações         | cada provider tem sandbox/ambiente aprovado, sucesso, rejeição, timeout, duplicidade, callback autenticado, retry/DLQ e reconciliação observados. Mock é pré-teste, nunca homologação final.                                   |
| Operação            | artefato imutável com SHA/digest/SBOM; instalação, upgrade, rollback, backup/restore, RTO/RPO, carga/endurance, alertas e game day no ambiente-alvo.                                                                           |
| UX e acessibilidade | matriz 375/768/1440, light/dark, loading/empty/error/success/recovery, teclado, foco, leitor de tela e WCAG 2.2 AA no escopo; revisão independente e evidência visual atual.                                                   |
| Governança          | evidências com SHA, ambiente, comando, resultado, owner e revisor; aprovação de Produto, Engenharia, QA, Operações, Segurança/DPO; decisão go/no-go registrada.                                                                |
| Nota de maturidade  | nota global ≥95/100, cada dimensão ≥90/100 e nenhum item crítico do release abaixo de 85/100. A nota nunca compensa falha de gate.                                                                                             |

Estado atual frente à régua: **nenhum AAA gate global está aprovado**. Há vários `PASS_BOUNDED` locais, que são progresso válido, mas não promoção.

## 4. Notas por item — engenharia

| Item                               | Nota /100 | Diagnóstico e limite principal                                                                                                                                        |
| ---------------------------------- | --------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitetura modular                |    **82** | Monorepo com apps e módulos reais; `server.ts`, roteamento e páginas críticas ainda concentram muita responsabilidade.                                                |
| TypeScript e consistência de tipos |    **96** | Typecheck global selecionado passou; falta manter a prova no candidato limpo e no CI remoto.                                                                          |
| Build e empacotamento              |    **96** | Build da SPA/API/worker passa; avisos de chunk e import estático precisam de acompanhamento de performance.                                                           |
| Lint e padrões estáticos           |    **94** | Lint passa com guardrails relevantes; padrão estático não cobre integração, dados e experiência final.                                                                |
| Testes unitários/componentes       |    **93** | Volume e regressão local são fortes; skips de dependências reais e mocks reduzem a confiança de release.                                                              |
| Cobertura e alcance da suíte       |    **78** | Percentuais globais passam o limiar local, mas rotas, repositórios e módulos críticos estão excluídos da instrumentação.                                              |
| Integração PostgreSQL              |    **62** | Nota baseline congelada: critical gate 594/594 e E2E scoped 9/9 passaram localmente; target, CI, escopo amplo e recertificação do mesmo SHA ainda não estão provados. |
| API e OpenAPI                      |    **92** | Superfície ampla, 413 paths e validação de contrato verde; readiness e providers reais ainda são fronteiras separadas.                                                |
| Schema e migrações                 |    **86** | Runner canônico, checksum, 168 migrações e guards existem; aplicação/upgrade positivo no target ainda não foi observado.                                              |
| Autenticação e MFA                 |    **86** | Limites de entrada, MFA e fail-closed têm testes; aceite de operação, rotação e configuração de produção seguem pendentes.                                            |
| RLS e isolamento tenant            |    **82** | Catálogo e provas locais são fortes; role/grants/`NOBYPASSRLS` no banco alvo e cross-tenant no ambiente de promoção não estão fechados.                               |
| Worker, leases e retry             |    **84** | Consumers, leases, DLQ e shutdown existem; providers, Redis/failover e cadeia distribuída precisam de ensaio integrado.                                               |
| Design system e componentes        |    **87** | Sistema visual específico, estados e revisões scoped comprovados; consistência global e regressão no candidato ainda faltam.                                          |
| Controle de complexidade           |    **72** | Guard passa com limites ajustados, porém hotspots grandes não têm decomposição e podem degradar rapidamente.                                                          |
| Segredos, dependências e SAST      |    **92** | Scans locais sem crítico/alto; rotação real, break-glass e prova de supply chain no target ainda não ocorreram.                                                       |

## 5. Notas por item — produto e funcionalidades

| Item                                           | Nota /100 | Diagnóstico e limite principal                                                                                             |
| ---------------------------------------------- | --------: | -------------------------------------------------------------------------------------------------------------------------- |
| Tutores e vínculos                             |    **88** | CRUD, vínculos e detalhe implementados; nova jornada completa no candidato ainda precisa de aceite.                        |
| Pacientes e cadastro clínico                   |    **86** | Cadastro e contexto clínico amplos; página crítica excede orçamento de complexidade.                                       |
| Agenda e agendamento                           |    **86** | Agenda, filtros e estados reais existem; recertificação browser/database do candidato falta.                               |
| Fila e esteira                                 |    **86** | Fluxo operacional implementado e testado; cobertura de produção e concorrência ainda são bounded.                          |
| Triagem                                        |    **84** | Registro e transições implementados; prova operacional transversal ainda não é completa.                                   |
| Atendimento                                    |    **88** | Abertura, cuidado, serviços e encerramento existem; jornada PostgreSQL limpa precisa ser repetida no SHA candidato.        |
| Prontuário e revisões                          |    **86** | Entradas, histórico e revisões presentes; provas de atomicidade não foram renovadas no ambiente alvo.                      |
| Prescrição e execução                          |    **84** | Criação, revisão, assinatura e administração existem; aceite clínico nominal e banco alvo faltam.                          |
| Internação, leitos, diárias e alta             |    **88** | Handoffs de idempotência e estados têm boa cobertura scoped; não promove ERP global.                                       |
| Cirurgia                                       |    **80** | Serviço e fronteiras existem; evidência operacional e de negócio é menor que no núcleo clínico.                            |
| Laboratório local                              |    **84** | Pedidos, resultados e laudos estruturados existem; equipamento e processo externo não homologados.                         |
| Live Lab e homologação laboratorial            |    **30** | Contratos locais existem, mas conector, sandbox e ciclo externo equivalente não foram comprovados.                         |
| Produtos, saldos e movimentações               |    **87** | Catálogo, ledger, lotes, validade e movimentações persistentes existem; falta ensaio no target.                            |
| Compras, fornecedores e entrada de notas       |    **82** | Compra/recebimento existem; cadastro mestre completo e livro fiscal não estão demonstrados.                                |
| Serviços e tabelas de preço                    |    **84** | Serviços e preços estão implementados; regras comerciais precisam de reconciliação de negócio.                             |
| Comandas, vendas e faturamento                 |    **86** | Itens, fechamento, cancelamento e cobrança existem; persistência limpa e conciliação ainda são necessárias.                |
| Caixa e recebimento em dinheiro                |    **83** | Fluxos transacionais e concorrência têm evidência anterior; recertificação no candidato permanece.                         |
| Contas a receber                               |    **81** | Subledger e pagamentos existem; conciliação externa e operação alvo não comprovadas.                                       |
| Contas a pagar                                 |    **81** | Cadastro/liquidação e relatórios persistentes existem; homologação e recuperação no alvo faltam.                           |
| Bancos, meios, máquinas e split                |    **85** | Catálogos e regras existem; cadastro de split não prova liquidação de provedor.                                            |
| Cartão e captura                               |    **68** | A validação do adaptador foi corrigida no worktree; captura, repasse e conciliação reais continuam sem sandbox homologado. |
| PIX e settlement                               |    **68** | Intent, webhook, journal, retry/DLQ e roles existem; provider, callback e reconciliação reais não foram aprovados.         |
| Estorno e conciliação não-caixa                |    **42** | Há componentes financeiros, mas o ciclo completo de refund, divergência e compensação não foi comprovado.                  |
| Fiscal e NFS-e                                 |    **60** | Adapter, emitter e persistência existem; município, certificado, rejeição, cancelamento e XML/PDF não homologados.         |
| Equipe, folgas e comissões                     |    **87** | Cadastros, regras e cálculo têm boa base; aceite nominal e operação real continuam separados.                              |
| Orçamentos                                     |    **83** | Itens, aprovação, conversão e impressão existem; alcance transversal ainda não certificado.                                |
| Pacotes e consumo                              |    **80** | Pacotes e consumo existem; ciclo comercial completo precisa de reconciliação.                                              |
| Fidelidade, pontos e PDV                       |    **72** | Serviços e jobs existem; prova operacional e regras de negócio são limitadas.                                              |
| Marketing, SMS, e-mail e WhatsApp              |    **60** | Campanhas, consentimento e adapters existem; bounce, opt-out, rate limit e providers reais não homologados.                |
| Relatórios operacionais e exportação           |    **79** | Fontes persistentes, CSV e semântica UTC existem; catálogo completo e entrega não estão certificados.                      |
| Histórico de cancelamentos                     |    **84** | `audit_events`, snapshots, API/export/worker e testes atuais existem; matriz de banco novo ainda falta.                    |
| Relatórios personalizados e paridade histórica |    **48** | Há fontes e workbenches, mas não a reconciliação comportamental completa com o Vetus.                                      |
| Entrega agendada de relatórios                 |    **75** | Worker, lease e adapter existem; entrega externa, retry final e recuperação no alvo não homologados.                       |
| Anexos e documentos                            |    **80** | Escopo tenant, validação e adapter ClamAV existem; storage/scanner reais e restore ainda faltam.                           |
| Webhooks e API keys                            |    **84** | Contratos, persistência e controle de acesso existem; cadeia distribuída completa ainda não observada.                     |
| Importação Vetus                               |    **78** | Idempotência, conflito e rollback possuem testes; dados sanitizados e destino alvo não homologados.                        |
| Live Pet e demais integrações                  |    **25** | Equivalência funcional, sync e reconciliação no destino não comprovados.                                                   |
| ML, previsões e auxiliares inteligentes        |    **52** | Feature store e serviços existem; precisão, segurança clínica e utilidade não foram validadas.                             |
| Navegação, responsividade e acessibilidade     |    **85** | Shell e várias telas têm identidade e QA scoped; não há cobertura global, leitor de tela e baseline atual completos.       |

## 6. Notas por item — operação e entrega

| Item                           | Nota /100 | Diagnóstico e limite principal                                                                                                             |
| ------------------------------ | --------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| CI/CD                          |    **65** | Scripts e guards são amplos; execução remota, ruleset e artefatos do SHA atual não foram observados.                                       |
| Release e artefatos imutáveis  |    **55** | Workflow por SHA/digest/SBOM existe; worktree está misto e ainda não há candidato imutável certificado.                                    |
| Compose, Helm e deploy         |    **68** | Superfície canônica valida estaticamente; Helm binário/cluster e rollout target não foram executados nesta sessão.                         |
| Instalação, upgrade e rollback |    **68** | Política e scripts existem; drill completo no alvo, compatibilidade e rollback cronometrado faltam.                                        |
| Backup e restauração           |    **65** | Restore local representativo bounded existe; RPO/RTO, retenção, storage e failover de produção não.                                        |
| Observabilidade e game day     |    **66** | Health, métricas e experimentos existem; alertas humanos e cadeia distribuída no alvo não foram provados.                                  |
| Performance e endurance        |    **50** | SLOs e perfis estão definidos; não há medição representativa atual de capacidade/endurance.                                                |
| Ambiente integrado             |    **30** | PostgreSQL/Redis locais provaram critical gate e E2E scoped 9/9; target, capacidade, escopo amplo e CI remoto continuam fora da evidência. |

## 7. Notas por item — governança e evidências

| Item                               | Nota /100 | Diagnóstico e limite principal                                                                                          |
| ---------------------------------- | --------: | ----------------------------------------------------------------------------------------------------------------------- |
| Documentação e consistência        |    **82** | Acervo é amplo e há índice/precedência; quantidade de baselines e documentos supporting ainda exige governança ativa.   |
| Identidade V4 e compatibilidade V2 |    **85** | ADR-012 e superfície canônica distinguem produto e namespaces; release final e target ainda não foram certificados.     |
| LGPD e acesso privilegiado         |    **70** | DSR, auditoria, MFA e controles existem; DPO, retenção, mascaramento e operação independente ainda não aceitaram.       |
| SOC2 e controles de conformidade   |    **25** | Parte da superfície gera resultados demonstrativos e DR sem executar restore/failover; não é certificação SOC2.         |
| UAT e certificação humana          |    **35** | Harness e contratos de certificação passam; aceite real de Produto, Operação, Segurança e acessibilidade está pendente. |

## 8. Riscos que governam a decisão

1. **Evidência local versus target:** critical gate e E2E scoped já são reproduzíveis em runtime efêmero local, mas a matriz browser-to-database completa, o target e o CI remoto ainda não foram provados; qualquer promoção baseada somente no envelope local continua inválida.
2. **Provedores externos bloqueados:** pagamentos, fiscal, laboratório, comunicação, storage e integrações exigem decisão, credenciais e sandbox autorizados.
3. **Paridade funcional incompleta:** o inventário tem evidência, mas apenas 4/11 domínios foram verificados por comportamento.
4. **Candidato não imutável:** o worktree compartilhado e sujo impede atribuir testes a uma versão única sem congelamento e checkout limpo.
5. **Cobertura de alcance reduzido:** os percentuais atuais não instrumentam toda a superfície crítica; ampliar ou justificar escopo exige mapa por risco.
6. **Qualidade visual scoped:** a matriz visual local está reproduzível em 29/29 e a auditoria master em 299/299; isso não sustenta AAA global sem WCAG independente, browsers adicionais, target e UAT.
7. **Complexidade sem margem:** o guard passa, mas páginas e composition roots estão no limite e aumentam o custo de cada mudança.

## 9. Decisão e próximos 10 dias úteis

**Decisão:** continuar desenvolvimento e homologação controlada; não habilitar produção crítica, não anunciar paridade completa e não usar “Triplo AAA” como status atual.

Prioridade executiva:

1. preservar o runtime local como evidência bounded e prover target/CI remoto sem fallback para os gates finais;
2. congelar um SHA candidato e reconciliar os contratos de CI, critical gate e cobertura;
3. ampliar o E2E browser-to-database com login/setup, atendimento, internação/alta, financeiro, recovery, a11y e tenant A/B; recertificar no target/CI;
4. fechar prova financeira de cartão, PIX, estorno e conciliação em sandbox;
5. transformar os 11 domínios de paridade em cenários comportamentais com aceite de Produto;
6. definir RPO/RTO, target, providers, owners, DPO e autoridade de go/no-go;
7. executar a matriz visual/a11y, carga, restore, cutover/rollback e recertificação final no mesmo SHA.

### Fontes canônicas relacionadas

- [Quality Bar e overlay Triplo AAA](./engineering/QUALITY_BAR.md)
- [Matriz de requisitos e evidências](./engineering/REQUIREMENT_EVIDENCE_MATRIX.md)
- [Painel de risco e evidência](./engineering/EVIDENCE_RISK_DASHBOARD.md)
- Checkpoint de salvamento de 06/09 (histórico arquivado: `legado/docs/2026-09-06-checkpoint-salvamento.md`)
- Relatório supporting de documentação versus implementação (histórico arquivado: `legado/docs/2026-09-05-relatorio-documentacao-versus-implementacao.md`)

Este relatório não realizou commit, push, deploy, migração no banco existente, contato com provider ou aceite humano. O worktree e os documentos históricos foram preservados.
