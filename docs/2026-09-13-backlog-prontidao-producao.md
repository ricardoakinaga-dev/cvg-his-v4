---
document_status: historical
document_kind: backlog
effective_date: 2026-09-13
owner: Liderança técnica, Produto e Operações CVG-HIS
review_cycle: archived
superseded_by: docs/2026-09-26-backlog-rodada-2.md
---

# Backlog executável — prontidão para produção

## Revisão de status e próximo despacho — pós-checkpoint

Fonte: [reauditoria do checkpoint](2026-09-13-reauditoria-checkpoint-prod-001-005.md). **Não confirmar 5/47 DONE no candidato atual.** Os 47 cartões originais permanecem, sem renumeração ou eliminação de MA/REM. R1 identifica trabalho corretivo dentro de cada cartão; não aumenta o total. Esta tabela é um snapshot auditado; a próxima execução deve reconciliá-la com o estado canônico em `.agent`, preservando o ledger histórico.

| Cartão | Estado auditado | Falta para aceite integral |
| --- | --- | --- |
| PROD-001 | PARCIAL / reconciliação necessária | Próxima ação sem divergência semântica e rastreabilidade individual dos PROD |
| PROD-002 | PARCIAL / retenção externa pendente | Cinco inputs stale e restauração de destino durável aprovado |
| PROD-003 | PARCIAL / smoke limitado | Fonte/build vinculados, stack integrada repetível e recursos exclusivos |
| PROD-004 | REABERTO | Envelopes parciais com eventId presente/nulo e worker sobre legados migrados |
| PROD-005 | REABERTO | Payload real e IDs de relatórios; HTTP primeira execução/replay/revogação |
| PROD-006–047 | PLANEJADAS no recorte | Aceites e dependências originais, acrescidos dos reparos abaixo |

### PROD-001-R1 — Reconciliar significado da retomada (CP-04, P0)

**Primeira ação do agente.** Ler state, plano, backlog, logs e provas; registrar recovery append-only. Manter IDs antigos como história, dar a cada PROD status/evidência no modelo canônico suportado e escolher uma única ação executável. Estado, `next_action`, marcador e primeiro passo devem expressar o mesmo trabalho, não apenas repetir um ID antigo. Atualizar narrativa para rev12/246 e 194 especializadas. Não alterar resultados passados.

Aceite: checker 11/11 e revisão semântica por outro agente, que recupera a mesma próxima ação e distingue aprovado no passado, parcial, stale e reaberto. Superfície: `.agent`/ExecPlan e referências documentais; um único Lead. Saída desbloqueia os reparos locais seguintes.

### PROD-003-R1 — Ligar harness a fontes e recursos próprios (CP-05, P0)

Após reconciliação e registro da identidade de trabalho, tornar scripts de smoke parametrizáveis, eliminar dependência de caminho fixo/porta livre presumida, reconstruir outputs da cópia congelada e registrar seus hashes. Executar duas vezes PG+Redis+API+SPA com a comunicação pertinente entre componentes, dado sintético persistido, readiness e teardown exclusivos. Controle negativo de dist antigo deve invalidar a prova. Não usar fuser global nem recursos de produção. Capturas e testes de UI continuam com PROD-035; isso não dispensa a stack reproduzível exigida aqui.

Aceite: duas execuções isoladas completas, origem dos builds conferida, nenhum recurso alheio afetado e receita retomável em diretório novo. Binários temporários existentes podem ser reutilizados após conferência; não considerar sua mera existência uma prova de stack.

### PROD-004-R1 — Completar reparo de envelopes parciais (CP-01, P0)

Depende do harness comprovado; investigar a nova migration apropriada ao histórico de aplicação, sem modificar 0170/0171 aplicadas. Incluir `_meta` com eventId válido mas campos obrigatórios ausentes, eventId nulo/vazio/tipo inválido, envelope completo e combinações já cobertas. Definir validade pelo consumidor real, preservar identidade/campos válidos e auditar linhas elegíveis.

Aceite: migração sobre banco anterior, controle conhecido ruim reproduzindo CP-01, todos os legados elegíveis aceitos pelo parser, válidos preservados, segunda execução segura e worker real consumindo **essas mesmas linhas migradas**, com efeitos/IDs/duplicação conferidos. Revisor independente deve rejeitar testes que substituam fixtures migradas por novas linhas já válidas.

### PROD-005-R1 — Reparar autorização de relatórios sem regredir replay (CP-02, P0)

Depende do harness comprovado. Mapear execute/export/schedule e resolver identidade por body/path de acordo com o handler; preservar wrapper usado na chave/hash. Não simplesmente dispensar o guard de relatórios. Testar guard e wiring completo com requisições reais.

Aceite: HTTP/PG com primeira execução válida, replay autorizado, revogação persistida negada, permissão dinâmica da definição, tenant/ator/chave/payload, inexistente sem leak e efeitos não duplicados. Regressões de compras e famílias relevantes do inventário permanecem verdes. Medical replay continua obrigação de PROD-026; não encerrar seu aceite por proxy. Respeitar budget de complexidade, sem elevá-lo para acomodar o reparo.

### PROD-002-R1 — Restaurar freshness e fechar retenção (CP-03/05, P0)

**Duas saídas separadas:** registrar identidade local antes de usar o harness; após estabilizar 004-R1/005-R1 e outros inputs alterados, recolher e promover shards afetados em janela sem escrita. O helper está nos executionInputs; curadoria de métricas é um conjunto diferente. Preservar os candidatos ef9eff… como históricos STALE, sem editar seus hashes.

Aceite de freshness: checker real sem mismatch para os novos inputs; se persistirem 241 erros substantivos (ou outros de novo escopo), registrar FAIL e encaminhar 011–018. Aprovar vínculo não aprova cobertura. Atualizar obrigações de escopo em 011/047 sem reduzir denominadores.

Aceite de retenção: Operações define destino durável controlado, owner, acesso e prazo; recuperar de lá em diretório novo e conferir hashes. Cópia para `/tmp` e política escrita não bastam. Se faltar acesso/decisão, manter esse critério BLOCKED e avançar trabalho local independente. Não apagar a única cópia de prova nem transferir dados a serviço externo sem autorização aplicável.

### Retomada de PROD-006–009 e restante do programa

PROD-006 é a próxima frente financeira, não a primeira ação de retomada do checkpoint. Pode avançar em paralelo aos reparos backend com arquivos/recursos isolados, após 003-R1. Aceite de 006: query API/DB com paginação, ordenação estável e filtros de vencimento no conjunto completo; mais de 20 linhas, datas-limite, estados loading/erro e mudança de filtro/página sem resultados obsoletos. Agregados devem explicitar escopo e permanecer consistentes, refinados em 008. 007 exige semântica real de cancelamento; 009 exige decisão explícita para entrada avulsa.

Atualização dos contratos transversais: 011 parte de **169 SQL atuais**, incluindo 0171 e novas correções quando registradas; 012 mantém 25 Vue; 018 exige known-bad de hash stale e execução do checker real; 032 inclui regressões de autorização de relatórios; 047 distingue fontes com métricas, inputs de execução, outputs compilados e validade de autoridades. 045 depende de todos os contratos originais e dos reparos aqui definidos, no mesmo candidato. Nenhuma prova local substitui SSO/provider/UAT/Operações/autoridade humana.



[Auditoria atual](2026-09-13-relatorio-estado-atual-erp-cvg-his-v4.md) · [Plano executivo](2026-09-13-plano-executivo-prontidao-producao.md) · [Roadmap](2026-09-13-roadmap-prontidao-producao.md)

Este backlog especifica **47 entregas de trabalho remanescente**. Na decomposição original todas estavam PLANEJADAS. A revisão abaixo registra o resultado auditado de PROD-001–005; PROD-006–047 permanecem planejadas no recorte verificado. Não interpretar isso como código inexistente. A baseline global histórica de 63 é descrita pela auditoria inicial; os status operacionais serão registrados exclusivamente em `.agent/backlog.json` pelo Lead ao ativar a execução. Não substituir IDs históricos: PROD detalha e relaciona MA/REM. Os contratos anteriores continuam preservados.

**Contrato comum de execução e conclusão**

Cada cartão herda: ler instruções aplicáveis, auditoria/achado e fontes atuais; preservar usuário/tenant/auth/transação/idempotência e dados; reproduzir baseline; fixar allowlist de arquivos exatos e recursos antes de escrever; implementar; testar conhecido bom/ruim na fronteira real; submeter a crítico distinto; corrigir/retestar; integrar; publicar evidência com hashes e limites. Builder entrega IMPLEMENTED, não autoatribui DONE. A revisão exige ausência de Critical/High no escopo; autoridade clínica/operacional não é substituída por outro agente.

Superfícies abaixo são **pontos de entrada para refinamento**, não permissão irrestrita de editar diretórios. Novos arquivos/testes/migrations devem ser nomeados no despacho. Uma tarefa G deve ser fatiada em entregas verticais menores com o mesmo aceite final. P/M/G representam esforço relativo e incerteza, não dias prometidos. Owners são papéis a designar, não pessoas já comprometidas. P1 também é obrigatório no escopo atual; não é adiamento implícito.

Dependência significa saída técnica necessária verificada. Não significa esperar todas as dependências para ler fonte, preparar fixtures, especificar contratos ou solicitar decisões externas. Evidência histórica válida pode satisfazer parte do contrato após revalidação; nunca repetir reparo já feito apenas para preencher cartão. Provas externas bloqueiam seu próprio aceite, sem impedir trabalho local independente.

Evidência por tentativa em `artifacts/remediation/PROD-NNN/<runId>/`: objetivo/aceite, HEAD+diff/inputs, ambiente/versões/recursos, comandos+exit, raw output sanitizado, digests, delta antes/depois, verificador distinto, limitações/validade e próxima ação. Não inventar flags de runner; inspecionar `package.json` e scripts. A pasta artifacts é ignorada pelo Git: retenção remota/backup controlado e restauração de prova são obrigações de PROD-002. Config/cache temporária não pode alterar o artefato julgado.

Há dois fechamentos: **pré-produção**, PROD-001–045 e configuração 047; **entrada efetiva**, PROD-046 após decisão humana. Sustentação periódica 047 continua após entrada, sem depender de observar meses futuros para aprovar sua configuração.

**Índice e dependências**

| ID | Entrega | Prioridade | Owner | Porte | Depende de |
| --- | --- | --- | --- | --- | --- |
| PROD-001 | Reconciliar controle e próxima ação | P0 | Lead | P | — |
| PROD-002 | Congelar identidade de trabalho e reter evidências | P0 | Lead/QA | P | 001 |
| PROD-003 | Disponibilizar harness exclusivo de verificação | P0 | Plataforma/QA | M | 002 |
| PROD-004 | Corrigir backfill de envelopes legados | P0 | Backend/Dados | M | 003 |
| PROD-005 | Reautorizar toda resposta de replay protegido | P0 | Backend/Segurança | M | 003 |
| PROD-006 | Corrigir paginação e filtros de vencimento | P0 | Frontend/Backend financeiro | M | 003 |
| PROD-007 | Resolver filtro de títulos cancelados | P0 | Financeiro/Frontend/Backend | P | 006 |
| PROD-008 | Preservar saldo e reconciliar cartões financeiros | P0 | Frontend/Financeiro | P | 006, 007 |
| PROD-009 | Corrigir erro/vazio e definir ação avulsa | P1 | Frontend/Produto financeiro | M | 008 |
| PROD-010 | Vincular promoção aos bytes realmente consumidos | P0 | QA/Tooling | P | 002 |
| PROD-011 | Implementar evidência especializada de SQL | P0 | Dados/QA | G | 004, 010 |
| PROD-012 | Implementar evidência especializada de Vue | P0 | Frontend/QA | G | 009, 010 |
| PROD-013 | Resolver instrumentação vazia de type-only | P0 | QA/Arquitetura | M | 010 |
| PROD-014 | Elevar coverage auth e roles/RLS | P0 | Backend/QA segurança | G | 005, 011, 013, 020, 041 |
| PROD-015 | Elevar coverage clínica e faturamento | P0 | Backend/QA clínico | G | 004, 005, 011, 013, 026 |
| PROD-016 | Elevar coverage HTTP, repositórios, PIX e webhooks | P0 | Backend/QA integração | G | 010, 011, 013, 024, 025, 041, 043 |
| PROD-017 | Fechar gate global 82, dependências e higiene | P0 | DX/QA | G | 012, 013 |
| PROD-018 | Tornar coverage crítica e contratos checks obrigatórios | P0 | Plataforma/QA | M | 010, 011, 012, 013, 014, 015, 016, 017 |
| PROD-019 | Fechar contrato SSO e decisões de produto | P0 | Produto/Segurança + Lead | M | 001 |
| PROD-020 | Implementar SSO backend e deadline ponta a ponta | P0 | Backend/Auth | G | 003, 005, 019 |
| PROD-021 | Entregar jornada SSO SPA e homologar provider | P0 | Frontend/Auth/Segurança | G | 020 |
| PROD-022 | Minimizar logs e estabelecer retenção | P1 | Backend/Segurança/DPO | M | 003 |
| PROD-023 | Aplicar política de edge e diagnóstico | P1 | Plataforma/Segurança | M | 022 |
| PROD-024 | Certificar DB/RLS, upgrade e auditoria durável | P0 | Dados/Backend/Segurança | G | 004, 005, 011, 003 |
| PROD-025 | Certificar worker, outbox/inbox e recovery | P0 | Backend/Worker | G | 004, 005, 024 |
| PROD-026 | Homologar jornadas clínicas com regras explícitas | P0 | QA clínico/Backend/Produto | G | 005, 024, 025 |
| PROD-027 | Congelar matriz comportamental das 11 áreas | P0 | Produto/QA | M | 001, 003 |
| PROD-028 | Homologar laboratório e equipamentos | P1 | Laboratório/Backend | G | 024, 025, 026, 027 |
| PROD-029 | Homologar ciclo fiscal | P1 | Fiscal/Backend | G | 024, 027 |
| PROD-030 | Homologar pagamentos, estorno e conciliação | P0 | Financeiro/Backend/QA | G | 005, 009, 024, 025, 027 |
| PROD-031 | Homologar marketing e consentimento | P1 | Marketing/Backend | G | 022, 025, 027 |
| PROD-032 | Certificar relatórios e entregas agendadas | P1 | Relatórios/Backend/Frontend | G | 024, 025, 027 |
| PROD-033 | Homologar acesso, DSR e ciclo de dados | P0 | Segurança/DPO/Backend | G | 005, 022, 023, 024, 027 |
| PROD-034 | Homologar importação Vetus e conectores transversais | P1 | Dados/Produto/Backend | G | 028, 029, 030, 031, 032, 033 |
| PROD-035 | Certificar UX/a11y e executar UAT integral | P0 | Frontend/UX/QA/Usuários | G | 012, 021, 026, 028, 029, 030, 031, 032, 033, 034, 042 |
| PROD-036 | Certificar performance e soak representativos | P0 | SRE/Performance/Produto | G | 024, 025, 038, 041, 042, 043 |
| PROD-037 | Certificar backup, restore e game day | P0 | Dados/SRE | G | 004, 024, 025, 033 |
| PROD-038 | Provar traces, alertas e resposta operacional | P0 | SRE/Backend | G | 022, 024, 025 |
| PROD-039 | Completar supply chain e intake de provas reais | P0 | Plataforma/Segurança | G | 002, 010, 017 |
| PROD-040 | Provar required checks e autoridade de promoção | P0 | Lead/Admin repositório | M | 018, 039 |
| PROD-041 | Decompor composição da API com caracterização | P1 | Arquitetura/Backend | G | 020, 023, 024 |
| PROD-042 | Decompor SPA e manter continuidade de navegação | P1 | Frontend/UX | G | 009, 021, 032 |
| PROD-043 | Decompor worker sem duplicar política | P1 | Backend/Worker | G | 025, 038 |
| PROD-044 | Ensaiar instalação, upgrade, deploy e rollback | P0 | Plataforma/SRE/Dados | G | 023, 024, 035, 036, 037, 038, 039, 040 |
| PROD-045 | Congelar candidato e emitir Go/No-Go verificável | P0 | Lead/QA/Crítico/Autoridades | G | 001–044 e 047 |
| PROD-046 | Executar entrada controlada em produção | P0 | Release owner/SRE/Produto | G | 045 |
| PROD-047 | Configurar freshness e sustentação contínua | P1 | Lead/QA/SRE | M | 001, 018 |

Os números na coluna de dependência usam o prefixo PROD-. A ordem numérica não substitui o grafo; por exemplo,041–043 precedem a medição final de fronteiras alteradas.

**PROD-001 — Reconciliar controle e próxima ação**

Origem: A09; MA-01/34; REM-001/002/030.

Superfície: `.agent/state.json; .agent/backlog.json; .agent/plans/repository-state-of-art-remediation-execplan.md; ledgers .agent`.

Entrega: Corrigir as quatro falhas do checker: marcador e primeiro passo coerentes, kind IMPLEMENT/VERIFY aplicável em vez de BUILD. Registrar o novo plano e os vínculos PROD↔MA↔REM, preservando histórico.

Aceite: Checker canônico sem falhas; um único owner e próxima ação; nenhuma tarefa de implementação marcada concluída pela publicação deste plano.

Prova: python3 /home/ricardo/.agents/skills/engineering-framework/scripts/check_state.py .; pnpm docs:validate; revisão do delta append-only.

**PROD-002 — Congelar identidade de trabalho e reter evidências**

Origem: A07/A09; MA-02/34; REM-006/030.

Superfície: `scripts/refresh-critical-source-manifest.mjs; docs/engineering/critical-coverage-scope.json; artifacts e política de retenção`.

Entrega: Registrar HEAD, diff, arquivos novos, lockfile, ferramentas e contratos; gerar manifesto reproduzível. Reter o pacote da auditoria e futuras provas com digests em armazenamento controlado.

Aceite: Cópia exclusiva tem inputs idênticos; alteração não registrada invalida prova; pacote recuperável após remover apenas a cópia temporária criada para o teste. Commit/merge só no fluxo autorizado da execução.

Prova: Manifest --check; testes de identidade/refresh; comparação antes/depois e restauração de pacote em diretório novo.

**PROD-003 — Disponibilizar harness exclusivo de verificação**

Origem: MA-11; REM-007/010; incidente de colisão temporária.

Superfície: `scripts/lib/private-postgres.mjs; infra/scripts; playwright-spa.config.ts; runtime privado`.

Entrega: Alocar diretórios aleatórios, PostgreSQL/Redis/API/SPA e sockets/portas exclusivos; seeds sintéticos e lifecycle observável. Neutralizar wrappers fuser -k/down -v usando configuração isolada do runner.

Aceite: Smoke persistido; readiness; zero acesso a DB de desenvolvimento/produção; teardown atinge apenas recursos da tentativa; segunda execução sem colisões; fonte/config hashadas.

Prova: Inspecionar runner inteiro, iniciar stack privada, gravar/ler dado sintético, encerrar e conferir PIDs/recursos próprios. Não substituir banco real por mock.

**PROD-004 — Corrigir backfill de envelopes legados**

Origem: A01; MA-12/13/24; REM-007/009.

Superfície: `packages/db/migrations/0170_outbox_event_envelope.sql (referência histórica); nova migration; packages/modules/event-bus/src`.

Entrega: Criar correção forward-only para dados sem _meta; preservar checksums de migrations já aplicadas. Tratar envelope ausente, vazio, JSON null, parcial e válido; preservar campos protegidos/identidade.

Aceite: Aplicar sobre dados anteriores; todas as linhas elegíveis corrigidas e válidas preservadas; reexecução segura; consumer processa legado sem efeito duplicado; falha parcial não deixa estado inválido.

Prova: Reproduzir backend-migration-repro.sql do pacote; teste de upgrade integral + worker real após migração; comparar IDs/contagens e efeitos antes/depois.

**PROD-005 — Reautorizar toda resposta de replay protegido**

Origem: A02; MA-12/14/21; REM-007/024.

Superfície: `apps/api/src/helpers/idempotency-authorization.ts; helpers/tenant-command.ts; server.ts; packages/shared/database/src/tenant-unit-of-work.ts`.

Entrega: Inventariar todas as mutações no envelope genérico e ligar permissão antes do replay; manter tenant, ator, hash e atomicidade. Tratar rota não mapeada de modo explícito e seguro.

Aceite: HTTP real: sucesso, revogação persistida, replay negado; sessão ativa não basta. Mapeadas/não mapeadas, ator distinto, tenant distinto e payload diferente cobertos; comando não duplica efeito.

Prova: Ampliar probe composicional para integração HTTP/PostgreSQL real, especialmente POST /inventory/purchases; regressão das jornadas já mapeadas.

**PROD-006 — Corrigir paginação e filtros de vencimento**

Origem: A03; MA-18/26; REM-021/011.

Superfície: `apps/spa/src/pages/billing/BillingListPage.vue; apps/spa/src/services/financialReceivables.ts; contrato/handler financeiro correspondente`.

Entrega: Permitir percorrer toda população e aplicar vencimento no escopo correto; definir semântica de total de página versus total filtrado, preservando compatibilidade API.

Aceite: 21 e mais de 40 títulos acessíveis; filtros e paginação reconciliados no banco; mudança de filtro reinicia página; resposta atrasada não sobrepõe estado novo; sem salto de tenant.

Prova: Repetir fixture 21×R$100; testes de contrato e browser→API→PostgreSQL com valores e totais esperados.

**PROD-007 — Resolver filtro de títulos cancelados**

Origem: A04; MA-18/26; REM-021/011.

Superfície: `BillingListPage.vue; tipos de status e endpoint de recebíveis`.

Entrega: Fechar com dono financeiro o significado de cancelamento neste subledger; implementar filtro/estado suportado. Se o estado não pertence ao contrato, retirar opção enganosa somente com decisão explícita de produto.

Aceite: Selecionar Cancelada produz consulta coerente e apenas resultados esperados, ou opção removida conforme decisão registrada; aberto/recebido preservados; sem conversão silenciosa em Todos.

Prova: Interação real, request capturado e dados persistidos de estados distintos; teste negativo da conversão atual para vazio.

**PROD-008 — Preservar saldo e reconciliar cartões financeiros**

Origem: A03/A05; MA-18/26; REM-021/011.

Superfície: `BillingListPage.vue; packages/design-system/src/vue/DsStatCard.vue; testes financeiros`.

Entrega: Separar saldo positivo de erro técnico; tornar rótulos/valores claros e uniformizar população de contagem, original, recebido e pendente.

Aceite: R$2.100 permanece visível com saldo aberto; zero, parcial, estornado e filtros reconciliam com o subledger; nenhuma dupla contabilização ou soma de universos diferentes.

Prova: Probes de 21 títulos, parcial e erro; screenshot e assertions de valor; leitura do banco confirma KPIs.

**PROD-009 — Corrigir erro/vazio e definir ação avulsa**

Origem: A10/A11; MA-26/33; REM-011/027.

Superfície: `apps/spa/src/pages/owners/OwnersListPage.vue; BillingListPage.vue; DataTable e testes`.

Entrega: Distinguir erro 503 de lista vazia e oferecer retry preservando contexto. Decidir geração avulsa com regras financeiras; implementar fluxo completo ou retirar CTA não ofertada, sem fingir entrega.

Aceite: 503 não sugere cadastrar primeiro tutor; retry recupera; empty/loading/permission distintos. Conta avulsa, se ofertada, exige autorização, persistência, idempotência e auditoria, não apenas habilitar botão.

Prova: Browser com 503/recuperação/lista vazia e jornada financeira correspondente à decisão; não mascarar console ou falhas.

**PROD-010 — Vincular promoção aos bytes realmente consumidos**

Origem: A06; MA-05/D7; REM-006.

Superfície: `scripts/promote-critical-shard.mjs; promote-critical-shard.test.mjs; check-critical-coverage.mjs`.

Entrega: Comparar destino real e digest de coverageFile/testResultFile com os arquivos aprovados; validação antes de publicar; preservar publicação anterior.

Aceite: Referência irmã corrompida, swap, symlink/escape, digest errado e JSON inválido rejeitados; candidato válido promove; falha não sobrescreve slot corrente.

Prova: Repetir release-promotion-probe.mjs; negativos pelo CLI e consumo pelo checker real; conferir publicação antes/depois.

**PROD-011 — Implementar evidência especializada de SQL**

Origem: A01/A07; MA-05/D5; REM-006/007.

Superfície: `scripts/check-critical-coverage.mjs; docs/engineering/critical-coverage-scope.json; packages/db/migrations; tooling especializado novo`.

Entrega: Definir contrato por migration: criação limpa, upgrade com dados prévios, constraints/RLS, erro/recovery, hashes e aplicabilidade. Implementar produtor e consumidor para as 168 SQL, sem simular coverage JS.

Aceite: 168/168 fontes têm obrigação e prova válida ou classificação técnica independente explícita; migration omitida/stale/inválida e upgrade quebrado falham. A01 deve ser negativo discriminante.

Prova: Rodar migrations em cluster privado com datasets anteriores e casos de interrupção; checker especializado real e negativos de evidência ausente/adulterada.

**PROD-012 — Implementar evidência especializada de Vue**

Origem: A07/A11; MA-05/D5/26; REM-006/011.

Superfície: `25 fontes Vue do manifesto; tooling especializado; e2e/spa/visual/visual-regression.spec.ts`.

Entrega: Definir por fonte comportamento/estado e instrumentação pertinente; vincular build/render/testes à fonte; retirar DOM fabricado como prova de comportamento.

Aceite: 25/25 fontes têm evidência atual aceita; ausência/hash errado/DOM substituído sem execução do componente não aprova comportamento; renderer e ações reais usados.

Prova: Vitest Vue e browser com estados reais, integração onde exigida; testes known-bad do produtor/checker, sem excluir fontes do escopo.

**PROD-013 — Resolver instrumentação vazia de type-only**

Origem: A07; MA-05; REM-006.

Superfície: `scripts/lib/source-metric-presence.mjs; manifesto crítico; checker`.

Entrega: Classificar semanticamente os 18 casos vazios, distinguindo type-only, reexport runtime e função executável. Definir evidência apropriada sem inserir hits artificiais.

Aceite: Fonte executável vazia falha; type-only só recebe tratamento específico comprovado por AST/typecheck e revisão independente; adicionar função transforma obrigação e é detectado.

Prova: Contraprovas com função/branch/reexport acrescentados; revisão do denominador antes/depois; histórico de escopo preservado.

**PROD-014 — Elevar coverage auth e roles/RLS**

Origem: A07; MA-05/12; REM-006.

Superfície: `fontes auth e roles-rls do manifesto; testes de domínio/HTTP/DB`.

Entrega: Cobrir erros, revogação, isolamento, expiração e concorrência reais; priorizar functions 70,53/62,09 e branches 84,25/71,38.

Aceite: Cada métrica desses componentes ≥85, inclusive após mudanças SSO/composição; nenhuma exclusão, mock da fronteira julgada ou threshold reduzido.

Prova: Recolher shards afetados após freeze local e recomputar checker; anexar casos de segurança e métricas por fonte/componente.

**PROD-015 — Elevar coverage clínica e faturamento**

Origem: A07; MA-05/14; REM-006/007.

Superfície: `componentes billing-cash/inpatient/records/prescriptions; suites correspondentes`.

Entrega: Cobrir estados inválidos, rollback, concorrência, permissões, cálculos e invariantes com dono clínico/financeiro.

Aceite: As quatro métricas de cada componente ≥85; negativa de autorização e falha parcial deixam estado persistente consistente; regra clínica não inventada pelo agente.

Prova: Testes domínio + PostgreSQL e HTTP; shards hash-bound; medidas e efeitos de banco reconciliados.

**PROD-016 — Elevar coverage HTTP, repositórios, PIX e webhooks**

Origem: A07; MA-05; REM-006.

Superfície: `componentes http-routes/repositories/pix/webhooks; suites HTTP/processo`.

Entrega: Priorizar repositories functions 59,98/branches 65,58 e webhooks functions 62,93; cobrir paginação/contratos, falhas DB/provider, replay, timeout e idempotência.

Aceite: Cada componente ≥85 nas quatro métricas; nenhum handler crítico fora da matriz; fronteiras persistentes e de processo exercitadas.

Prova: Cinco shards recolhidos sobre identidade estável; checker real, raw maps e negatives de falha de dependência.

**PROD-017 — Fechar gate global 82, dependências e higiene**

Origem: A07/A12; MA-06/33; REM-013/026/027.

Superfície: `vitest.config.ts; packages e lockfile; setups SPA; scripts de coverage`.

Entrega: Recalcular global 82 com tooling atual e casos adequados; resolver diagnósticos acionáveis sem suprimir console; impedir cache rastreado e teste dependente de dist stale. Manter auditoria de dependências.

Aceite: 82 em lines/functions/branches/statements no denominador contratado; zero skip crítico; findings de segurança tratados; build prévio explícito e check não altera fontes/caches rastreados.

Prova: pnpm test:coverage, typecheck/lint/test, pnpm audit --json e security:secrets em cópia própria; equivalência/validade do conversor e fingerprint antes/depois.

**PROD-018 — Tornar coverage crítica e contratos checks obrigatórios**

Origem: A07; MA-07; REM-006/012.

Superfície: `.github/workflows/ci.yml; scripts de shards/checker/promoção`.

Entrega: Executar coleta e checker reais no CI, agregando todos os shards da mesma identidade. Artefatos ausentes/falhos não podem virar job opcional ou success.

Aceite: Run remoto do candidato correto executa checker real; skip/hash errado/métrica baixa/missing shard causam required check vermelho; zero dependência de artifacts locais ignorados.

Prova: Execução CI válida e ensaio conhecido ruim em branch de teste autorizada; mapa job→critério e raw results retidos.

**PROD-019 — Fechar contrato SSO e decisões de produto**

Origem: A08; MA-08; REM-003/005.

Superfície: `docs/2026-09-12-ma08-decisao-e-despacho-proposto.md; ledger de autoridade`.

Entrega: Confirmar procedência D1 e decidir C1–C6: UserInfo, provisionamento, logout, redirect allowlist, provider e kill-switch; registrar T1–T3. Preservar R1–R6 obrigatórios.

Aceite: Decisões identificam dono, escopo e validade; sem associação por coincidência de email; SSO continua no escopo salvo mudança explícita do usuário. Agente prepara opções concretas antes de solicitar decisões faltantes.

Prova: Contrato revisado por Produto/Segurança; nenhuma aprovação sintética. Preparação não exige aguardar todos os outros tickets.

**PROD-020 — Implementar SSO backend e deadline ponta a ponta**

Origem: A08; MA-08/B1–B5; REM-003/005.

Superfície: `packages/modules/auth/src/oidc.ts; auth-routes.ts; server.ts; sessão/usuários/access-control; OpenAPI`.

Entrega: Validar config no boot, state único/PKCE/nonce, JWKS e iss/aud/exp, vínculo issuer/sub→tenant/RBAC interno, sessão ERP e logout/revogação. Propagar orçamento/cancelamento a provider e DB aplicável.

Aceite: Token inválido/expirado/replay/redirect indevido/inativo/ambíguo/timeout não cria sessão; mesma flag fecha login/callback/logout; cancelamento interrompe trabalho sem efeito duplicado.

Prova: Provider local controlado + HTTP/PG; cancelamento real e claims negativos; API/runtime bidirecional preservada; homologação externa em 21.

**PROD-021 — Entregar jornada SSO SPA e homologar provider**

Origem: A08; MA-08/B6–B7; REM-003/005.

Superfície: `LoginPage.vue; router/public-routes.ts; stores/auth.ts; callback novo; e2e`.

Entrega: Login corporativo, callback, erros, expiração, tenant/permissões e logout completos. Usar sandbox provider autorizado para aceite final.

Aceite: Browser volta autenticado à sessão ERP correta; tenant/conta errados/replay/logout negados; não expor tokens em URL/log; provider real assina identidade válida.

Prova: E2E provider sandbox→SPA→API→PG, com evidência sanitizada; indisponibilidade externa bloqueia apenas homologação, não a implementação local.

**PROD-022 — Minimizar logs e estabelecer retenção**

Origem: A12; MA-09; REM-015.

Superfície: `packages/modules/auth/src/brute-force.ts e produtor efetivo; packages/shared/logging; políticas`.

Entrega: Localizar produtores/sinks; pseudonimizar identificadores e redigir tokens/payloads sensíveis, preservando correlação; fixar retenção/acesso com dono.

Aceite: Canários sintéticos não aparecem brutos nos sinks; erro de auth mantém diagnóstico útil; retenção e acesso aprovados e exercitados no target posteriormente.

Prova: Testes de não vazamento em logs API/worker/provider e revisão da política; nunca usar PII real para teste.

**PROD-023 — Aplicar política de edge e diagnóstico**

Origem: A12; MA-10; REM-014.

Superfície: `server.ts health/metrics; infra/helm; ingress/proxy e probes`.

Entrega: Separar liveness público mínimo, readiness e detalhes/metrics restritos; preservar coletores autorizados.

Aceite: Matriz origem/identidade/path nega diagnóstico indevido e permite probes legítimas; sem exposição de dependências/segredos. Aceite inclui ingresso real em 44.

Prova: Testes locais de acesso e probes; ensaio via ingress no ambiente de homologação; ausência de configuração não conta como proteção.

**PROD-024 — Certificar DB/RLS, upgrade e auditoria durável**

Origem: A01/A02; MA-12; REM-007.

Superfície: `packages/db; tenant-context; shared/database; audit; tests/integration/database e rls`.

Entrega: Exercitar roles runtime, tenantsA/B, grants, FORCE RLS, rollback, append-only, checksum e upgrade de dados representativos com aplicação antiga/nova onde necessário.

Aceite: Acesso cruzado e mutação de auditoria negados; falha transacional não deixa efeito parcial; upgrade/retomada preservam relações/saldos/outbox; não usar superuser como role julgada.

Prova: pnpm test:db/test:critical no harness privado + testes de versão anterior; queries, roles, contagens/checksums e erros sanitizados.

**PROD-025 — Certificar worker, outbox/inbox e recovery**

Origem: A01/A02; MA-13; REM-007/009/018.

Superfície: `apps/worker/src/runner.ts; event-bus; event-consumers; process suites`.

Entrega: Crash antes/depois do commit/publicação; lease takeover/fencing/heartbeat; retry limitado/backoff, DLQ, poison/reorder e replay de cada consumidor crítico.

Aceite: Processos reais retomam sem dupla cobrança/efeito durável; eventos não somem silenciosamente; falhas permanentes visíveis e reparáveis; recuperação de legado incluída.

Prova: pnpm test:critical:process e casos faltantes; timeline PID/evento/efeito persistido; restart real, sem promessa de exactly-once geral.

**PROD-026 — Homologar jornadas clínicas com regras explícitas**

Origem: MA-14; REM-007.

Superfície: `e2e/tests; encounters/inpatient/records/prescriptions/discharges/triage/surgery`.

Entrega: Cobrir agenda→atendimento→prontuário→exames/receita→internação/alta→cobrança/auditoria, autoria, permissões e falhas/concorrência; validar regras com responsável clínico.

Aceite: Estados inválidos negados; dados e saldo sobrevivem reload/restart; zero skip crítico; aceite de regra por humano designado, independente do executor.

Prova: Jornadas HTTP/PG/processo e navegador; matriz jornada→invariante→teste→owner. SSO tem prova própria 21 e integração final 45.

**PROD-027 — Congelar matriz comportamental das 11 áreas**

Origem: MA-15; REM-008.

Superfície: `scripts/lib/vetus-parity-contract.mjs; docs/vetus; requisitos e matriz de paridade`.

Entrega: Mapear todas as áreas, inclusive as quatro marcadas verified, a positivo/negativo/permissão/persistência/reconciliação e dono. Separar disponibilidade de arquivo de prova atual.

Aceite: 11 áreas têm contratos completos, fixtures e evidência requerida; novos A02/A03–A05 reabrem aceite afetado. Alterações de escopo somente por decisão explícita.

Prova: Revisão de matriz e teste do checker contra fixture de arquivos presentes porém comportamento falho; encerramento funcional depende de 28–35/45, sem ciclo.

**PROD-028 — Homologar laboratório e equipamentos**

Origem: MA-16; REM-019.

Superfície: `packages/modules/diagnostics; adapters laboratory/Live Lab; rotas/provider ingress`.

Entrega: Pedido/coleta/resultado/laudo, recoleta e entrega integrados; configurar sandbox/equipamento alvo e chaves protegidas.

Aceite: Resultado duplicado, inválido, fora de ordem e replay tratados; identidade/amostra/tenant preservados; laudo e auditoria reconciliados; owner homologa.

Prova: Contrato local+E2E/PG e mensagens reais sanitizadas em sandbox autorizado; não declarar conector equivalente por simulador.

**PROD-029 — Homologar ciclo fiscal**

Origem: MA-17; REM-020.

Superfície: `packages/modules/fiscal; adapters NFS-e; secrets/config`.

Entrega: Emissão, consulta, rejeição, cancelamento e reconciliação de XML/PDF no município/provider alvo.

Aceite: Certificado via secret manager; timeout/replay não duplica emissão; artefato e estado consistentes, rejeitos acionáveis, dono fiscal aprova.

Prova: Sandbox municipal autorizado e negativos; log sanitizado, protocolos e hashes XML/PDF. Nenhuma emissão de produção durante teste.

**PROD-030 — Homologar pagamentos, estorno e conciliação**

Origem: A03–A05; MA-18; REM-021.

Superfície: `payments/financial/pix/cash/billing; gateways e ledger`.

Entrega: Fechar PIX/cartão/split/refund aplicáveis e conciliação com provider sandbox; corrigir lacunas de captura/repasse conforme escopo contratado.

Aceite: Callbacks duplicados/fora de ordem, timeout e crash sem cobrança/estorno duplo; ledger e provider reconciliam por operação/dia/tenant; permissões preservadas.

Prova: E2E sandbox→API→DB/worker→SPA e reconciliação automatizada; sem dinheiro real e sem edição manual de saldo para passar.

**PROD-031 — Homologar marketing e consentimento**

Origem: MA-19; REM-022.

Superfície: `marketing/notifications/notifications-whatsapp; adapters email/SMS/WhatsApp`.

Entrega: Consentimento/opt-out, supressão, rate limit, retries e bounce com provider real de sandbox e destinatários sintéticos.

Aceite: Opt-out impede envio futuro inclusive fila/retry; isolamento tenant, bounce/rejeito e auditoria observáveis; nenhuma mensagem para clientes reais.

Prova: Captura de entrega e supressão, webhook de bounce/replay e reconciliação persistida; owner homologa.

**PROD-032 — Certificar relatórios e entregas agendadas**

Origem: MA-20; REM-023.

Superfície: `packages/modules/reports; apps/spa/src/pages/reports; worker de reports`.

Entrega: Reconciliação por família Vetus e fonte, filtros/timezone, exportações, limites e grandes volumes; entrega agendada e reprocessamento auditável.

Aceite: Totais/CSV/JSON/XLSX/PDF aplicáveis batem na fonte; truncamento declarado/paginado; tenant/permissão/retry e status de entrega corretos.

Prova: Dataset conhecido com fronteiras UTC/local; snapshots de totais e exports; job real + sandbox de entrega e falha/replay.

**PROD-033 — Homologar acesso, DSR e ciclo de dados**

Origem: A02/A12; MA-21; REM-024.

Superfície: `access-control/audit/lgpd; destinos/backups/integradores; políticas`.

Entrega: Inventariar dados/destinos, retenção, anonimização/DSR, exceções legais e acesso privilegiado; implementar lacunas técnicas segundo decisão DPO.

Aceite: Permissões, DSR e retenção exercitados em todos destinos contratados; restauração não reintroduz dado indevido; auditabilidade e dever de preservação compatibilizados pelo responsável.

Prova: Dados sintéticos, trilha por destino, verificação de backup/integração e aceite DPO. Agente não emite parecer jurídico.

**PROD-034 — Homologar importação Vetus e conectores transversais**

Origem: MA-22; REM-025.

Superfície: `importadores Vetus; webhooks; conectores Live Pet/Live Lab; schema`.

Entrega: Fechar equivalência com operação alvo, relações e saldos; implementar conectores contratados ausentes; validar dry-run, rejeitos, resume e compensação.

Aceite: Checksums/relações/totais reconciliados; interrupção/concorrrência/replay não duplicam; tenant isolado; reversão ou roll-forward ensaiado com dono.

Prova: Cópia sanitizada autorizada ou corpus sintético representativo + sandbox; relatório antes/depois e negativação de arquivo inválido.

**PROD-035 — Certificar UX/a11y e executar UAT integral**

Origem: A03–A05/A10/A11; MA-26; REM-011.

Superfície: `SPA/design-system; e2e/spa; runbook de usabilidade`.

Entrega: Matriz 375/768/1440 e temas suportados; keyboard/foco/modal/zoom/reflow/leitor de tela, erros/rede lenta/longos/permissões; capturas reais e UAT de papéis hospitalares.

Aceite: Zero Critical/High aberto aplicável; Axe e manual aprovados; jornadas persistidas concluídas por usuários responsáveis; sem innerHTML para provar estado funcional; 11 áreas com aceite atual.

Prova: SHA→build→render→inspeção/crítico→UAT vinculados; screenshots e resultados sanitizados; aceite de Produto/Clínica, não do próprio agente.

**PROD-036 — Certificar performance e soak representativos**

Origem: A12; MA-23; REM-009/029.

Superfície: `benchmarks/k6; scripts/measure-spa-performance.mjs; políticas SLO/load`.

Entrega: Aprovar antecipadamente dataset/mix/VUs/duração/latência/erro/metas e medir API/DB/Redis/worker/storage/SPA, com dependência degradada. Otimizar gargalo medido e repetir.

Aceite: Metas aprovadas atendidas; margem/saturação documentadas; duração de soak vigente preservada (artefato soak-72h quando exigido); sem reduzir carga/tempo para obter verde.

Prova: k6/SPA/soak no target representativo, raw series e recursos; sign-off SRE. Preparar perfil/decisões desde F0; medição final após refactors.

**PROD-037 — Certificar backup, restore e game day**

Origem: A01/A12; MA-24; REM-009.

Superfície: `infra/scripts de backup/restore/game-day; operações/RPO_RTO_POLICY`.

Entrega: Aprovar RPO/RTO e abort; restaurar dados+objetos em ambiente isolado, validar clínica/financeiro/audit/outbox/DSR; simular corrupção/migration mismatch/indisponibilidade.

Aceite: Recuperação cronometrada dentro das metas aprovadas; checksums/relações/saldos reconciliados; restore inclui chaves/objetos/config necessários; failures detectados e runbook executável.

Prova: Drill representativo real + relatório de consistência/tempo e game day; backup existente ou tabela mínima não substitui recuperação.

**PROD-038 — Provar traces, alertas e resposta operacional**

Origem: A12; MA-25/03; REM-028/009.

Superfície: `API tracing/observability; worker; collector/Prometheus/alert routing; produtor ops`.

Entrega: Correlacionar SPA→API→DB/Redis→worker→provider; alertas com dono/dedupe/runbook/retention e evidência de entrega/atendimento.

Aceite: Falha sintética detectada e alerta recebido/acionado; trace útil sem PII; perda de telemetria observável; produtor byte-bound aceito pelo gate sob política aprovada.

Prova: Incidente controlado no target, trace e recibo sanitizados; known-bad de produtor/alvo/tempo/medição rejeitado.

**PROD-039 — Completar supply chain e intake de provas reais**

Origem: A06/A12; MA-03/27; REM-004/010/012.

Superfície: `release-artifacts.yml; run-triple-a-release-gate.mjs; geradores/verificadores de envelopes; containers`.

Entrega: Preservar scan OCI pré-quarentena e manifesto pós-gate. Completar verificadores de backup/UAT/autoridade e demais envelopes genéricos que hoje ficam PARTIAL; definir trust roots/revogação com autoridade.

Aceite: Imagem/digest/SBOM/provenance/assinatura verificados; quarantine ACL/retention/cleanup testados; same-byte e suficiência obrigatórias; autoridade não autodeclarada; replay/revogação de evidência tratados.

Prova: Contratos CLI known-good/known-bad e ensaio em registry sandbox autorizado; evidência dos tickets produtores deve ser consumível por 45. Não permitir fake gh em certificação.

**PROD-040 — Provar required checks e autoridade de promoção**

Origem: A07/A12; MA-29; REM-010/012.

Superfície: `GitHub rulesets/branch protection; GREEN_MAIN_POLICY; workflows`.

Entrega: Mapear jobs obrigatórios e rota de merge/publicação; consultar governança autenticada e corrigir configuração remota quando autorizada.

Aceite: Candidato não contorna gates; workflow/actions do SHA certo; bypasses/roles explícitos e aceitos; run terminal verde e autoridade identificável.

Prova: Export sanitizado autenticado e tentativa negativa de promoção em sandbox; 401/ausência de acesso fica UNKNOWN, não PASS.

**PROD-041 — Decompor composição da API com caracterização**

Origem: MA-30; REM-016.

Superfície: `apps/api/src/server.ts e handlers/composição nomeados no slice`.

Entrega: Extrair fronteiras por família de rota/política, preservando ordem auth→tenant→transação→dispatch; diminuir concentração e duplicação reais.

Aceite: Arquivo e acoplamento reduzidos com responsabilidade clara; nenhum novo god module; testes de auth/replay/tenant/transação passam; budget não aumentado para ocultar crescimento.

Prova: Mapa dependências antes/depois, linhas/budget e caracterização HTTP; revisar um slice por vez e recolher coverage posterior.

**PROD-042 — Decompor SPA e manter continuidade de navegação**

Origem: MA-31; REM-017.

Superfície: `apps/spa/src/router/routes.ts; PatientDetailPage.vue; subcomponentes e stores`.

Entrega: Fatiar por domínio/estado; preservar aliases/deep links/history/foco/guards/chunks e linguagem visual.

Aceite: Concentração/custo de mudança reduzidos; retorno à tarefa, foco e estado clínico preservados; novo render e regressão de navegação sem reutilizar aprovação visual antiga.

Prova: Browser/rotas unitárias, bundle e capturas antes/depois;35 certifica a versão integrada depois da decomposição.

**PROD-043 — Decompor worker sem duplicar política**

Origem: MA-32; REM-018.

Superfície: `apps/worker/src/runner.ts; políticas/handlers por job`.

Entrega: Extrair famílias de job e composição mantendo retry/lease/DLQ/cancelamento comuns; reduzir acoplamento real.

Aceite: Responsabilidades menores; crash/recovery/fencing e idempotência preservados; observabilidade permanece correlacionada; sem simples deslocamento do monólito.

Prova: Mapa antes/depois e nova suite de processos reais;16/36 revalidam cobertura/performance após mudanças.

**PROD-044 — Ensaiar instalação, upgrade, deploy e rollback**

Origem: A01/A12; MA-28; REM-010.

Superfície: `infra/helm; compose/containers; scripts install-upgrade/cutover/rollback; migrations`.

Entrega: Definir target/topologia/capacidade, TLS/DNS/secrets, persistência, digest, compatibilidade e estratégia de rollout. Instalar limpo, atualizar base anterior e reverter app sem fingir rollback de dados.

Aceite: Readiness/smoke clínico-financeiro, isolamento edge e digest executado corretos; reversão/roll-forward preservam dados; abort/timeouts/on-call exercitados.

Prova: Helm lint/template e deploy real no ambiente autorizado; logs/digests, smoke e recovery cronometrado. Sem migrar produção nesta etapa.

**PROD-045 — Congelar candidato e emitir Go/No-Go verificável**

Origem: MA-35; REM-012; todos os achados.

Superfície: `checkout candidato; CI; release gate/evidence package; scorecard/autoridade`.

Entrega: Integrar todos itens 1–44 e configuração 47; frozen SHA/lock/build/digests; recolher evidências invalidadas e executar gate completo, sem flags de diagnóstico. Obter revisão independente nova.

Aceite: Zero P0 e nenhum gate obrigatório falho; cobertura 82/85; 11/11 comportamento atual; CI terminal verde; 97/95/0; provas operacionais/UAT/autoridade do mesmo candidato/alvo. Mudança material reabre afetados.

Prova: pnpm release:triple-a sem skip execution/build/tests; known-bad permanece bloqueante; manifesto autenticado, scorecard e decisão humana. Se faltar prova: No-Go explícito.

**PROD-046 — Executar entrada controlada em produção**

Origem: MA-28/35; REM-010/012.

Superfície: `ambiente produção autorizado; runbook de cutover e hypercare`.

Entrega: Preparar pacote concreto de mudança: digest, janela, backup verificado, migração, tráfego, smoke, responsáveis, rollback/roll-forward e limiares de abort. Obter autorização final antes da ação real.

Aceite: Rollout progressivo conforme topologia suportada; negócio/telemetria/dados corretos; nenhum incidente crítico aberto; janela de observação encerrada pelo responsável com evidências.

Prova: Executar só procedimento homologado 44; monitorar critérios aprovados 36–38; falha aciona abort/recuperação. Autoridade e duração de hypercare definidas antes, sem inventar 24h/7d.

**PROD-047 — Configurar freshness e sustentação contínua**

Origem: A09/A12; MA-34; REM-030.

Superfície: `políticas/ledgers/CI de evidência; EVIDENCE_RISK_DASHBOARD; owners`.

Entrega: Definir expiração por código/ambiente/política/autoridade, revisão mensal e abertura automática de obrigação; runbook de incidentes/dependências/hotspots e responsáveis.

Aceite: Fonte/threshold/provider/alvo alterado invalida prova; expiração e revogação conhecidas barram promoção; backup/restore/rotações/revisões recorrentes têm dono e agenda.

Prova: Teste de evidência stale e exercício de retomada por outro agente. Configuração fecha antes de 45; execuções periódicas reais ocorrem após 46, sem alegar histórico futuro.

**Mapa de cobertura dos contratos anteriores**

| MA original | PROD que o concretiza | REM relacionados |
| --- | --- | --- |
| MA-01 | 001/002 | 001/002 |
| MA-02 | 002/010/045 | 006 |
| MA-03 | 010/038/039/045 | 012/028 |
| MA-04 | 005/020/018/045 | 003 |
| MA-05 | 010–018/045 | 006 |
| MA-06 | 017/039 | 013 |
| MA-07 | 018/040/045 | 006/012 |
| MA-08 | 019–021 | 003/005 |
| MA-09 | 022 | 015 |
| MA-10 | 023/044 | 014 |
| MA-11 | 003 | 007/010 |
| MA-12 | 004/005/011/024 | 007 |
| MA-13 | 004/025 | 007/009/018 |
| MA-14 | 005/026 | 007 |
| MA-15 | 027 | 008 |
| MA-16 | 028 | 019 |
| MA-17 | 029 | 020 |
| MA-18 | 006–009/030 | 021 |
| MA-19 | 031 | 022 |
| MA-20 | 032 | 023 |
| MA-21 | 005/033 | 024 |
| MA-22 | 034 | 025 |
| MA-23 | 036 | 009/029 |
| MA-24 | 004/037 | 009 |
| MA-25 | 038 | 028/009 |
| MA-26 | 006–009/012/035 | 011 |
| MA-27 | 039 | 004/010 |
| MA-28 | 023/044/046 | 010 |
| MA-29 | 040 | 010/012 |
| MA-30 | 041 | 016 |
| MA-31 | 042 | 017 |
| MA-32 | 043 | 018 |
| MA-33 | 009/012/017 | 026/027 |
| MA-34 | 001/002/047 | 030 |
| MA-35 | 045/046 | 012 |

A01→004/011/024/025/037; A02→005/024/026/033; A03→006/008/030; A04→007; A05→008; A06→010; A07→011–018; A08→019–021; A09→001/002/047; A10→009; A11→009/012/035; A12→022/023/028–040/044–047. Todos os achados A01–A12, 35 MA e 30 REM têm destino; nenhum item antigo é encerrado por esta tabela.

**Primeiro despacho ao agente executor**

```text
Audite a autorização atual e leia os quatro documentos vigentes, a reauditoria
2026-09-13-reauditoria-checkpoint-prod-001-005.md, AGENTS.md e o estado .agent.
A primeira ação é PROD-001-R1: recovery append-only e uma única próxima ação
semanticamente coerente. Não confirme 5/47 DONE nem use o PASS estrutural como
prova de atualidade. Preserve todos os arquivos e PASS históricos com limites.
Prepare PROD-003-R1; depois execute PROD-004-R1 e PROD-005-R1, em recursos
isolados. Após estabilizar os bytes, feche freshness de PROD-002-R1; retenção
externa permanece com Operações até prova real. Financeiro 006–009 pode avançar
em paralelo com allowlists disjuntas e harness verificado.
Execute o restante dos 47 cartões pelo grafo, sem reduzir 82/85/97/95/0.
Cada aceite exige prova atual, revisão independente e ledger atualizado.
Não edite hashes antigos para tornar shards verdes nem dispense o guard de reports.
Mantenha release NO-GO até todos os gates e autoridades. Prepare pacote concreto
antes de pedir a aprovação final de produção; não execute deploy por implicação.
```

O prompt descreve o início da futura execução; a entrega destes documentos não executa PROD-001 nem concede autoridade de deploy. Atualizações do status ficam em `.agent`, não nesta especificação. Revisão mensal e novas auditorias podem acrescentar trabalho mediante evidência, sem redefinir sucesso em torno do que já passou.
