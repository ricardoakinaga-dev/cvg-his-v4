# Auditoria integral e pesquisa de ERPs veterinários — checkpoint 2026-08-22

**Escopo:** leitura consolidada de `docs/`, `docs/docs2/`, `docs/vetus/`, auditoria read-only do código e pesquisa de referências oficiais de ERPs/PIMS veterinários.

**Status:** documento de decisão e rastreabilidade, atualizado em 23/08/2026. Não representa paridade concluída, prontidão de produção ou homologação de provider.

## 1. Autoridade e estado comprovado

A precedência vigente é: comportamento reproduzido no runtime e testes; código e contratos; programa e procedimentos atuais de agosto; ADRs; auditorias de julho; acervo Vetus; histórico `docs2/`. Documentação isolada nunca transforma uma tela, rota ou migration em prova funcional.

O estado executável auditado nesta sessão registra:

| Evidência | Resultado | Interpretação |
|---|---:|---|
| `pnpm readiness:enterprise` | 95/100; 42 PASS, 3 WARN, 1 FAIL | readiness estrutural alto, mas o FAIL é a paridade funcional Vetus |
| `pnpm vetus:parity:audit` | 0/11 verificado | paridade geral bloqueada |
| `pnpm vetus:clinical-parity` | 0/3 verificado | paridade clínica bloqueada |
| `pnpm validate:rls` | 153/154 tabelas protegidas | uma exceção documentada ainda precisa de decisão/fechamento |
| `pnpm validate:openapi` | 335 paths, 40 tags, 386 schemas | contrato estrutural; não prova comportamento dos handlers |
| `node tools/migration-consistency-report.mjs` | falhou por manifesto ausente | falta `docs/phase-9-migration-manifest.json` no caminho esperado |

O programa `CVG-002B2B` segue `IN_PROGRESS/PARTIAL`. B1/B2a estão verificados; a extensão B1 foi extraída para `packages/modules/pix` e a regressão focada está em 18/18. O verificador raw-body/HMAC, ingresso HTTP→PostgreSQL, migration 0111/0112, filtros de principal, ACL/RLS e um consumer B1 cercado possuem evidência focada verde, mas continuam slices limitados: UoW compartilhada, restart/takeover/redrive, fronteira legada `410`, providers reais, paridade Vetus e produção ainda não estão certificados.

## 2. Lacunas de maior impacto no código

1. **Durabilidade incompleta:** ainda existem fallbacks `Map`/in-memory em agenda, entregas de comunicação, Google Calendar, importação laboratorial, logs de importação Vetus, WebAuthn/challenges e OIDC. Isso impede restart seguro, múltiplas réplicas e recuperação de filas.
2. **Atomicidade cross-domain insuficiente:** o maior risco financeiro é uma comanda atualizar parcialmente atendimento, estoque/lote, recebível, caixa/pagamento, auditoria ou outbox. O rate limit de API key agora possui consumo atômico no PostgreSQL, mas ainda não há prova multi-réplica.
3. **Evidência de cobertura enviesada:** a configuração global exclui `server.ts`, rotas, repositórios, migrations e grande parte dos módulos críticos. A cobertura declarada não substitui E2E PostgreSQL.
4. **Frontend com lacunas explícitas:** existe rota administrativa placeholder e páginas monolíticas que dificultam evolução e revisão; rotas declaradas não equivalem a jornadas completas.
5. **Deploy ainda não comprovado:** values de produção declaram réplicas/Vault, mas a injeção de segredos de PIX, fiscal, comunicação, calendário, Redis e Vault precisa de renderização e smoke reais; fallback de secrets deve falhar fechado em produção.
6. **CI não fecha o gate premium:** k6 e visual regression estão configurados como `continue-on-error`; o gate de release exige mais do que os gates obrigatórios atuais.

## 3. Padrões observados nos PIMS veterinários líderes

As capacidades abaixo são declarações oficiais dos fornecedores, não uma certificação independente. O valor para o CVG-HIS é o padrão recorrente que deve virar requisito executável e teste de jornada.

| Referência | Capacidades recorrentes | Aplicação no CVG-HIS |
|---|---|---|
| ezyVet/IDEXX | prontuário configurável, SOAP, cobrança automática, inventário por lote/validade, portal, permissões e relatórios | charge capture ligado ao ato clínico; FEFO; portal; RBAC por função/local |
| Shepherd | SOAP, estimativas → plano de tratamento, automações que atualizam prontuário/fatura/alta, whiteboard, tarefas, inventário e portal | flowboard hospitalar e eliminação de dupla digitação |
| Digitail | intake/agendamento, app do tutor, laboratório/farmácia, pagamentos, comunicação, analytics e ecossistema de integrações | portal/app, lab bidirecional e marketplace com escopos |
| Vetspire | colaboração multiusuário em tempo real, tarefas acionadas por eventos, pagamentos, API GraphQL, webhooks e sandbox | concorrência explícita, outbox/inbox, replay e API pública mínima |
| Covetrus Ascend/Impromed | sinais vitais, planos de cuidado, quadro hospitalar, laboratórios, whiteboard, DICOM e relatórios profundos | inpatient check-in → alta, imagem e relatório operacional |
| Provet Cloud | automação por item/fatura, multiunidade, APIs e integrações | regras de charge capture e operações multiunidade |

Padrões que entram como critérios de produto:

- prontuário centrado no paciente com timeline, SOAP, templates, autosave, versionamento, retificação e autoria;
- flowboard/whiteboard com chegada, triagem, consulta, procedimento, internação, alta, responsáveis e SLA;
- uma aplicação clínica podendo gerar registro, cobrança, consumo de lote e evento auditável na mesma unidade de trabalho;
- laboratório/imagem bidirecionais com proveniência, versão e anexação ao episódio;
- portal do tutor com agenda, consentimento, resultado, prescrição/refil, pagamento e mensagens vinculadas;
- API com sandbox, webhooks, idempotência, escopos mínimos, rotação, revogação e observabilidade;
- relatórios de ocupação, tempo até atendimento, charge leakage, validade/estoque, margem, produtividade e preventivos;
- IA somente como assistência revisável: modelo/versão, origem, consentimento, retenção, revisão e aceite profissional registrados.

## 4. Requisitos regulatórios e de interoperabilidade

Para telemedicina veterinária no Brasil, a Resolução CFMV nº 1.465/2022 exige atendimento presencial como padrão-ouro, relação prévia presencial para teleconsulta, exclusão de urgências/emergências, consentimento, confidencialidade, registro no prontuário e assinatura compatível com o documento/medicamento. O domínio não deve ser um botão de vídeo: precisa guardar modalidade, elegibilidade, RPVAR, consentimento, participantes, CRMV/ART, plataforma, timestamps, anexos e assinatura.

Dados de saúde são sensíveis na LGPD. O backlog operacional precisa incluir classificação, minimização, trilha append-only, retenção, incidente, restauração e RPO/RTO reais. Para interoperabilidade, FHIR deve usar profiles/terminologias veterinárias próprias; imagens devem seguir DICOMweb (QIDO-RS, WADO-RS e STOW-RS) sem misturar o modelo clínico ao payload de imagem.

## 5. Ordem de execução derivada da auditoria

1. Fechar `CVG-002B2B`: parser/schema autenticado, ingresso append-only, `0111` com RLS/ACL, principal de serviço, UoW compartilhada, worker com fencing/retry e HTTP real por socket.
2. Executar o slice vertical financeiro-clínico: atendimento → comanda → estoque por lote → recebível → PIX/cartão/caixa → recibo → auditoria/outbox, com uma transação PostgreSQL, rollback, retry, restart e dois tenants.
3. Remover fallbacks produtivos e consolidar uma única trilha Drizzle/migrations/roles; corrigir renderização Helm, secrets e health do worker.
4. Fechar providers/sandboxes de fiscal, pagamentos, laboratório e comunicação; executar as oito jornadas E2E sem `skip`/retry.
5. Completar paridade Vetus `11/11` + clínica `3/3`, WCAG 2.2 AA, performance, DR/Game Day e 20 rodadas sem flake.

## 6. Fontes oficiais consultadas

- [ezyVet — features](https://www.ezyvet.com/features)
- [Shepherd — features](https://www.shepherd.vet/features/)
- [Digitail — produto e integrações](https://digitail.com/)
- [Vetspire — features/API](https://www.vetspire.ai/features/all)
- [Covetrus Ascend](https://software.covetrus.com/apac/veterinary-solutions/ascend-cloud-veterinary-software/)
- [Provet Cloud — first opinion clinics](https://www.provet.cloud/product/first-opinion-clinics)
- [Stripe — assinatura exige corpo cru](https://docs.stripe.com/webhooks/signature?lang=node)
- [Stripe — eventos assíncronos e respostas 2xx](https://docs.stripe.com/webhooks?lang=node)
- [Adyen — verificar, persistir e responder antes da lógica de negócio](https://docs.adyen.com/development-resources/webhooks/handle-webhook-events/)
- [Node.js — `timingSafeEqual`](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
- [PostgreSQL — `SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html)
- [PostgreSQL — RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
- [CFMV — Resolução nº 1.465/2022](https://manual.cfmv.gov.br/arquivos/resolucao/1465.pdf)
- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [HL7 FHIR — overview](https://hl7.org/fhir/overview-dev.html)
- [DICOMweb + FHIR](https://www.dicomstandard.org/using/dicomweb/dicomweb-and-hl7-fhir)

## 7. Checkpoint de implementação atualizado

O parser/fingerprints, a migration expand-only `0111`, o repository de receipt/delivery e a capability HTTP sintética continuam preservados em commits publicados. O slice HTTP agora inclui `POST /webhooks/pix/synthetic/v1`, leitura de bytes crus com limite de 64 KiB, HMAC/key binding/freshness, rate limit antes do corpo, framing manual via `node:net`, abort, headers duplicados, ACK diferido, erro de conflito opaco, rejeição de CORS/browser-auth para a callback e contrato OpenAPI (`334` paths, `385` schemas) alinhado aos regexes reais do verifier. A evidência focada atual é `13/13` na integração HTTP, `35/35` no verificador/keyring, `32/32` no shared-config, `6/6` no startup e lint/API/OpenAPI verdes.

Isso continua sendo evidência limitada de fronteira: não prova ainda HTTP→PostgreSQL em outra conexão, principal de serviço não interativo, UoW compartilhada, worker claim/fence/backoff, consumer B1, fronteira legada `410`, provider real, produção, deploy, paridade Vetus ou release. Nenhuma conclusão de produção, homologação ou paridade deve ser inferida deste documento.

## 8. Atualização do benchmark oficial de PIMS/ERP — 22/08/2026

A pesquisa read-only foi repetida em fontes oficiais e classificada pela força da evidência: manual/API/release note operacional é forte; página de produto específica é média; métricas e depoimentos do próprio fornecedor são somente hipóteses. O relatório integral do scout está preservado no handoff de continuidade.

| Produto | Capacidades observáveis úteis | Fonte primária |
| --- | --- | --- |
| ezyVet/IDEXX | prontuário, agenda, portal, assinatura, diagnóstico com retorno, permissões, lote/validade, multi-local, charge capture e API REST com OAuth/paginação/throttling | [Knowledge Center](https://docs.ezyvet.com/en/browse-documentation/ezyvet), [API](https://developers.ezyvet.com/docs/v1/), [inventário](https://developers.ezyvet.com/guides/managing-inventory.html) |
| Shepherd | SOAP ligado a tratamento/estimativa, prontuário, fatura, estoque e alta; whiteboard, tarefas, autosave, activity log e portal | [features](https://www.shepherd.vet/features/), [automação](https://www.shepherd.vet/clinical-tools/automation/) |
| Digitail | app do tutor, timeline, whiteboard/flowboard, anestesia, laboratório/farmácia, pagamentos, comunicação, analytics e audit log | [produto](https://digitail.com/), [integrações](https://digitail.com/integrations/), [release abril/2026](https://digitail.com/blog/digitail-product-updates-april-2026-recap/) |
| Vetspire | GraphQL com produção/staging/sandbox, schema tipado, subscriptions e integrações bidirecionais de laboratório/farmácia/comunicação | [developer portal](https://developer.vetspire.com/), [manual de integrações](https://manual.vetspire.com/vetspire-user-manual/ok/Commercial/vetspire-integrations), [API overview](https://support.vetspire.com/support/solutions/articles/70000636887-vetspire-s-api-overview) |
| Covetrus Ascend | fluxo de internação visível do check-in à alta, vitais/tarefas/documentos/imagens e stocktake com barcode, localização e trilha de alterações | [Ascend](https://software.covetrus.com/apac/veterinary-solutions/ascend-cloud-veterinary-software/), [stocktake](https://software.covetrus.com/emea/stocktake/) |
| Provet Cloud | templates/reason types que geram cobrança, lembretes/notas/alta, integrações de laboratório/pagamento/suprimentos e transferências com permissão | [first-opinion clinics](https://www.provet.cloud/product/first-opinion-clinics), [release 1.111](https://www.provet.cloud/hubfs/Provet%20Cloud%20Release%20Notes/1.111%20Release%20Notes_complete.pdf) |

Requisitos executáveis derivados, em ordem: (1) ato clínico transacional numa UoW única com cobrança, lote, caixa, auditoria e outbox; (2) internação/whiteboard 24h com tratamento, handoff, SLA, consumo, diária e alta; (3) laboratório/imagem bidirecional com resultado corrigido, proveniência e anexos; (4) plataforma de integração com sandbox, scopes mínimos, rotação, replay/DLQ e observabilidade; (5) prontuário colaborativo com autosave, autoria, retificação e conflito `409`; (6) estoque/procurement multi-local com FEFO, reserva, devolução, recebimento parcial e reconciliação financeira; (7) portal do tutor e analytics somente depois da identidade, consentimento e durabilidade estarem comprovados.

A distinção de confiança deve permanecer explícita: ezyVet e Vetspire têm documentação pública mais verificável; Shepherd, Digitail, Ascend e Provet fornecem sinais de produto, porém não contratos públicos equivalentes. O benchmark orienta prioridades e critérios de aceitação, nunca substitui testes, observação runtime ou homologação.

## 9. Atualização executável — checkpoint EVT-0060 a EVT-0065

O incremento mais recente fechou um slice de segurança/durabilidade do callback PIX, sem promover o ERP para produção:

| Slice | Evidência fresca | Estado honesto |
| --- | --- | --- |
| HTTP → PostgreSQL | 2/2; `202` somente após receipt+delivery visíveis em segunda conexão; failpoint sem linha parcial | PASS limitado |
| Principal de serviço | migration 0112 + schema 3/3 + PostgreSQL 5/5; FK tenant-local, purpose único, `FORCE RLS` | PASS limitado; backfill legado ainda não é provado com linha pré-existente |
| Auth/cache/MFA | guard 7/7, users 13/13, auth 30/30, typecheck | PASS limitado; adaptador `SessionRepository.create` direto ainda pode gravar órfão não legível |
| ACL/RLS | unit 7/7 + integração 1/1; API mínima, worker identity-only read, `NOINHERIT`, rerun e role herdada adversarial | PASS limitado; falta executar a query real sob role worker |
| Worker B1 | consumer unit 6/6, integração PostgreSQL 3/3, worker 47/47, build/lint/typecheck | PASS limitado; falta UoW compartilhada, retry transitório, restart/takeover/redrive e `410` |

Arquivos de continuidade: [handoff CVG-002B2B](2026-08-22-handoff-cvg-002b2.md) e [artefato principal/worker](../.agent/artifacts/CVG-002B2B-service-principal-worker-2026-08-22.md). O checkpoint foi publicado em `26f3281` na branch `agent/sync-v4-full-program`. O código usa apenas identificadores sintéticos `local-pix`; nenhuma credencial, provider externo ou mutação de produção foi usada.

### Decisões que a próxima sessão deve preservar

- Não conceder `UPDATE` ao worker para contornar `FOR UPDATE`: a fronteira read-only é intencional e foi validada contra o PostgreSQL.
- Não reaproveitar `idempotency_requests` no consumer B2b; o B1 compartilhado continua responsável pela idempotência financeira e pelo CAS final da delivery.
- Não classificar o consumer como “completo”: erros desconhecidos são fail-closed/terminal hoje, e ainda faltam restart, takeover, redrive/DLQ e observabilidade de operação.
- Não declarar paridade Vetus, UX, jornada clínica-financeira, provider real, deploy, restore, WCAG ou produção a partir dos números acima.

## 10. Atualização executável — EVT-0068 a EVT-0071

O checkpoint de implementação `46b84cb` fechou um conjunto local de lacunas do B2b, sempre com escopo sintético e não produtivo:

| Slice | Evidência fresca | Estado honesto |
| --- | --- | --- |
| UoW shared/B1 + CAS | helper canonical, 3/3 unit e integração contextual | PASS limitado; sem `idempotency_requests` |
| Worker/retry/redrive | worker 48/48 e PostgreSQL 5/5; retry transitório, takeover por lease expirado, stale fence e redrive auditado | PASS limitado; crash/restart real e DLQ/observabilidade ainda abertos |
| Role worker real | ACL 8/8, com query de principal sob `SET ROLE` e negação de `password_hash` | PASS limitado; a fronteira read-only foi preservada |
| Barreira legada | rota/API key 410 3/3, sem gateway nem `payment.pix.confirmed`; OpenAPI 335/386 | PASS limitado; falta integração HTTP→PostgreSQL específica e jornada SPA |

O próximo passo permanece comportamental: provar reinício de processo e takeover multi-pool, fechar observabilidade/DLQ e repetir as regressões B1/B2a/ingress/HTTP. O benchmark de ezyVet, Shepherd, Digitail, Vetspire, Covetrus Ascend e Provet continua sendo critério de produto, não evidência de paridade. O ERP geral, Vetus `11/11 + 3/3`, WCAG, providers, deploy e produção permanecem não concluídos.

## 11. Pesquisa oficial atualizada — capacidades que elevam o MVP em 2026

A pesquisa foi atualizada em 22/08/2026 usando documentação e páginas oficiais. A regra continua sendo separar capacidade observável de promessa comercial: endpoints, release notes, schemas e manuais são evidência forte; páginas de produto e depoimentos orientam hipóteses, mas não substituem testes comportamentais.

| Produto/fonte | Sinal atual verificável | Decisão de produto para o CVG HIS |
| --- | --- | --- |
| [ezyVet API release notes](https://developers.ezyvet.com/release-notes.html) | A versão 45.5 liga resultado diagnóstico a DICOM Study UID; as versões 45.3/45.2 adicionam disponibilidade/calendário, paginação por cursor para estoque e endpoints de espécie/raça, além de datas explícitas de descontinuação. | Tratar interoperabilidade como contrato versionado: DICOM Study UID write-once, cursores estáveis, timezone/site explícitos, compatibilidade e migração antes do sunset. |
| [Shepherd features](https://www.shepherd.vet/features/) e [single-page SOAP](https://www.shepherd.vet/blog/ring-in-the-new-year-with-shepherd/) | SOAP, charge capture, instruções de alta, tarefas, whiteboard, autosave, activity log, portal, inventário e IA aparecem no fluxo clínico, incluindo visualização para tablet. | O prontuário deve ser a fonte do ato clínico: autosave/versionamento, cobrança derivada, alta e tarefas rastreáveis, sem telas administrativas desconectadas. |
| [Digitail product](https://digitail.com/?hsLang=en), [atualização de abril/2026](https://digitail.com/blog/digitail-product-updates-april-2026-recap/) e [critérios de escolha](https://digitail.com/blog/questions-you-should-ask-when-choosing-a-pims/) | Flowboard/whiteboard, anestesia, laboratório/farmácia, app do tutor, AI SOAP, pagamentos, relatórios em tempo real, alertas de estoque/validade dentro da venda e comissões baseadas no dinheiro efetivamente recebido. | Priorizar visibilidade operacional ao vivo, FEFO/validade no ponto de venda, comissão sobre caixa liquidado, portal integrado e telemetria de no-show, SLA e margem. |
| [Vetspire API](https://developer.vetspire.com/) | GraphQL tipado com queries/mutations por domínio, subscriptions, ambientes production/staging/sandbox, API keys revogáveis, limite de profundidade e cobertura de clínica, hospitalização, laboratório, inventário, billing e telemedicina. | Entregar uma plataforma de integração com sandbox separado, scopes mínimos, rotação/revogação, limites de consulta, subscriptions/outbox e schema público versionado; nunca expor segredo no cliente. |
| [IDEXX Neo](https://software.idexx.com/products/neo/features) e [portfólio IDEXX](https://software.idexx.com/products) | Dashboard com pendências, prontuário e templates, diagnóstico em tempo real, boarding, pagamentos/assinatura digital, lembretes, inventário/purchase order e comparação explícita entre operação generalista e hospital/especialidade. | Oferecer onboarding/treinamento rápido sem sacrificar profundidade hospitalar: dashboard de exceções, templates clínicos, diagnóstico assíncrono, boarding, assinatura e estoque auditável no mesmo registro. |
| [DaySmart Vet](https://www.daysmart.com/vet/) e [operations](https://www.daysmart.com/vet/solution/operations-management-software/) | Cobre small animal, hospital, móvel, equino, emergência e multi-local; traz treatment board, SOAP colaborativo com autosave, wellness plans, pagamentos reconciliados, inventário/validade, 40+ integrações e workflows de voz para SOAP. | Projetar por contexto operacional (consultório, hospital, móvel, equino, emergência), com sincronização offline/online segura, planos preventivos, autosave colaborativo, reconciliação e integrações sem acoplamento. |
| [Covetrus Ascend stocktake](https://software.covetrus.com/emea/stocktake/) e [inpatient/mobile](https://software.covetrus.com/apac/veterinary-solutions/ascend-cloud-veterinary-software/) | Stocktake por localização com barcode, responsável, edição, aprovação e trilha; visão de internação/surgery em tela e acesso móvel para registrar tarefas e valores no local. | Estoque precisa de contagem cíclica, aprovação, barcode, localização e auditoria; internação precisa de flowboard 24h, handoff, tarefas e uso em tablet. |
| [Provet Cloud release notes 2.3](https://www.provet.cloud/hubfs/Provet%20Cloud%20Release%20Notes/2.3%20Release%20Notes%20Complete.pdf) | Releases recentes continuam corrigindo autenticação de gateway laboratorial, ingestão de resultados e dados de pagamentos. | Integrar laboratório de forma resiliente: estados pendentes, retry/DLQ, proveniência, correção versionada, erro opaco e reconciliação financeira; não tratar “integração” como apenas uma tela de configuração. |

### Critérios derivados para a construção

1. **Ação clínica como unidade de trabalho:** SOAP, tratamento, consumo de lote, cobrança, autorização/consentimento, auditoria e outbox precisam compartilhar correlação, autoria e rollback; rede externa fica fora do lock e retorna para saga/reconciliação.
2. **Operação em tempo real:** flowboard de consulta e internação deve expor estado, localização, responsável, próximo passo, atraso e risco; cada transição precisa ser idempotente, observável e recuperável após restart.
3. **Estoque e caixa verdadeiros:** lotes, validade/FEFO, reserva, transferência, recebimento parcial, devolução, stocktake aprovado, comissão por pagamento liquidado e reconciliação devem produzir movimentos append-only e relatórios auditáveis.
4. **Interoperabilidade evolutiva:** contratos têm versionamento, cursor, timezone, DICOM/FHIR provenance, ambientes separados, limites de uso, rotação/revogação, replay/DLQ e compatibilidade com sunsets publicados.
5. **IA como assistência governada:** qualquer resumo/SOAP/diferencial deve registrar modelo/versão, origem, consentimento, revisão, aceite profissional, correção e retenção; sem autonomia silenciosa ou alteração clínica irreversível.
6. **Experiência unificada:** portal/app do tutor, consentimento/e-signature, agenda, mensagens, resultados, prescrição/refil e pagamento devem compartilhar o mesmo paciente/episódio e nunca criar uma segunda fonte de verdade.

Esses critérios atualizam a prioridade do backlog, mas não alteram o veredito: a implementação atual ainda é um slice de durabilidade PIX; paridade Vetus, fluxo clínico-financeiro completo, UX, integrações reais e certificação operacional exigem provas próprias.

## 12. Checkpoint executável — recovery, DLQ/observabilidade e HTTP→PostgreSQL

O checkpoint seguinte foi validado em PostgreSQL efêmero e no workspace local, sem provider externo ou credencial real. A implementação adiciona promoção observável de deliveries esgotadas, evento terminal seguro e métricas agregadas sem labels de tenant, delivery, evento, worker ou código de erro. O teste de takeover usa dois pools independentes: o pool A perde o lease depois do claim e antes de B1/CAS; o pool B assume com token/lease version novos, rejeita a execução stale e aplica B1 apenas uma vez.

| Evidência | Resultado |
| --- | ---: |
| Worker completo | 54/54 |
| Contexto transacional shared | 4/4 |
| API payments route | 4/4 |
| Worker PostgreSQL fencing/restart | 6/6 |
| Service principals/RLS | 5/5 |
| HTTP→PostgreSQL legacy/rate-limit | 4/4 |
| API keys module | 13/13 |
| API-key mapper + auth helper | 3/3 + 2/2 |
| Runtime ACL/RLS | 1/1 |
| OpenAPI / RLS / secret scan / diff check | PASS — 335 paths/386 schemas; 153/154 RLS |

A integração HTTP prova que um `pix_transactions.payment_attempt_id` persistido retorna `410 LEGACY_PIX_CONFIRMATION_DISABLED` antes de gateway e outbox; uma API key de outro account recebe `404` opaco; um PIX direto sem vínculo continua `200` com um gateway e um evento; oito requests concorrentes com uma chave limitada resultam em dois `201` e seis `429`. O harness usa agora o `DatabaseApiKeyRepository` real: lookup pré-contexto por capability `SECURITY DEFINER`, mapper JSONB estrito, probe PIX sem retorno de `account_id` e tabelas de uso/rate-limit tenantizadas. Este é um resultado local/descartável, não uma conclusão de produção.

O próximo ciclo deve publicar DLQ/runbook/alertas e abrir o gate B2c/SPA separadamente. O rate limit atômico ainda precisa de benchmark multi-réplica/política operacional. A prova não promove o ERP, a paridade Vetus, providers, UX, operações ou release.

## 13. Atualização de continuidade — capability API-key e cutover — 23/08/2026

Esta sessão fechou a lacuna funcional que havia forçado o adapter do teste HTTP (implementação publicada em `62db87e`): `DatabaseApiKeyRepository.findActiveByKeyHash` usa uma função pré-contexto estreita; `mapDatabaseApiKeyRow` aceita o formato JSONB do driver `pg`; o role worker não possui acesso a `api_keys`, `api_key_usage` ou `api_key_rate_limits`; e o helper das rotas extraídas aplica rate limit antes de `last_used_at`. O probe PIX retorna apenas `true`, `false` ou `NULL` (ausente), nunca o `account_id` estrangeiro.

A migration `0113` e os scripts de runtime/Helm usam `cvg_api_key_auth` sem login, inherit, bypass RLS ou memberships. A função API-only é reconciliada depois da migration no cutover e no serviço `database-migrate` do Compose; a integração ACL/HTTP valida o privilégio efetivo, o worker/PUBLIC negados e a matriz 410/404/200/429. O estado canônico continua `IN_PROGRESS/PARTIAL`: restart real, DLQ operacional, providers, SPA/Vetus parity, WCAG, target environment e release ainda não foram provados.

## 14. Reconciliacao pos-DLQ e ponteiro de continuidade — 23/08/2026

O slice de DLQ operacional foi publicado em `35f68fd`, a semântica de
observabilidade multi-réplica foi corrigida em `1217882` e a última
reconciliação de ledger publicada está em `d525acc`; os documentos derivados
desta onda foram publicados em `76f7ec5`. A recontagem intermediária de `docs/`
era 1.449 arquivos, 90 diretórios e 53.746.820 bytes; após a consolidação desta
sessão, a soma atual dos arquivos é 53.750.467 bytes. A leitura integral anterior de
1.447 arquivos permanece preservada no artefato de auditoria e não foi
reclassificada como nova leitura.

O ponto de entrada para a próxima sessão é
[`2026-08-23-checkpoint-continuacao.md`](2026-08-23-checkpoint-continuacao.md).
O próximo gap executável é a política de rate limit entre réplicas, a projeção
mínima do principal autenticado e a matriz real de SIGKILL/restart, seguida das
regressões B1/B2a/ingress/HTTP. O ERP geral continua sem paridade Vetus,
provider homologado, SPA, WCAG, target operations ou release evidence.

## 15. Atualização de pesquisa e implementação — 23/08/2026

Fontes oficiais consultadas novamente (Shepherd, ezyVet, Digitail, Covetrus
Ascend e Vetspire) reforçam que autosave/versionamento clínico, flowboard 24h,
charge capture, estoque auditável, portal do tutor e APIs com sandbox são
capacidades competitivas observáveis. O benchmark detalhado e os links
primários estão em [`.agent/artifacts/market-benchmark.md`](../.agent/artifacts/market-benchmark.md).

No código, a fronteira pré-contexto de API key foi estreitada para oito campos
de autenticação/rate-limit e o runtime agora falha fechado quando o backend
distribuído exigido está indisponível. Duas instâncias HTTP no mesmo PostgreSQL
provaram a janela compartilhada (`2×201`, `6×429` em oito requests). Isso é
progresso verificável de segurança e operação, mas não altera o estado
`CVG-002B2B IN_PROGRESS/PARTIAL` nem prova SIGKILL/restart real, provedor,
paridade, SPA, WCAG ou produção.

## 16. Reauditoria integral e benchmark de continuidade — 23/08/2026

### Corpus documental atual

O corpus vigente foi enumerado e lido integralmente nesta sessão, incluindo
arquivos textuais e inventário dos binários. O estado reproduzível é:

| Medida | Resultado |
| --- | ---: |
| Arquivos sob `docs/` | 1.449 |
| Textuais / binários | 1.193 / 256 |
| Bytes totais | 53.766.604 |
| Extensões | 997 Markdown, 129 JSON, 67 HTML, 255 PNG, 1 gzip |
| Linhas textuais pelo contador do script | 357.608 |
| Manifesto SHA-256 | `d23f84a7000e42943093090e706db12e01a6e4189f61f5bd833f67b5e92ea2db` |

O acervo contém 543 referências Vetus, 835 arquivos históricos `docs2/`,
8 ADRs e material ativo de arquitetura, operação e micro-build. A precedência
não mudou: runtime/testes e estado persistido, código/contratos, camada ativa
de agosto, ADRs, auditorias antigas, Vetus e `docs2/`. O inventário confirma
cobertura documental; não certifica as capacidades descritas nas referências.

### Estado executável preservado

- `HEAD` e `origin/agent/sync-v4-full-program` estão alinhados em
  `48a3ad11b2a1a122751590b31b4760406a018de6` antes desta publicação.
- `pnpm readiness:enterprise` continua em 95/100 (42 PASS, 3 WARN, 1 FAIL),
  com o FAIL estrutural esperado da paridade estrita. `pnpm vetus:parity:audit`
  permanece em 0/11 e `pnpm vetus:clinical-parity` em 0/3.
- As evidências locais mais recentes permanecem limitadas: Redis 21/21 sob
  política fail-closed, PostgreSQL descartável do cutoff 2/2, HTTP de auth
  fail-closed 1/1, API 324/324, worker 58 + build, processo stale-fence 5/5,
  diária idempotente 2/2 e builds/secret scan/diff check aprovados.
- O PostgreSQL compartilhado usado em rodadas efêmeras entrou em recovery;
  isso é limitação de ambiente e não deve ser contado como evidência de
  release. Novas integrações devem usar um container descartável dedicado.

### Benchmark web oficial de 23/08

Uma consulta adicional a fontes primárias de mercado confirmou os seguintes
padrões competitivos: Shepherd combina SOAP, autosave, charge capture,
whiteboard, tarefas, inventário e alta; ezyVet/IDEXX combinam prontuário,
agenda, diagnóstico, inventário e analytics; Digitail enfatiza flowboard,
hospitalização, AI SOAP, portal e laboratório/farmácia; Vetspire expõe API
GraphQL tipada com ambientes de produção/staging/sandbox; Covetrus Ascend
apresenta internação móvel e stocktake auditável; Provet Cloud combina planos
de tratamento, faturamento, pagamentos, integrações e permissões; IDEXX
Cornerstone, Oracle Health e SAP S/4health reforçam a ligação entre admissão,
recursos, faturamento, supply chain e interoperabilidade.

As fontes consultadas são [Shepherd](https://www.shepherd.vet/features/),
[ezyVet](https://www.ezyvet.com/features),
[Digitail](https://digitail.com/),
[Vetspire Developer Portal](https://developer.vetspire.com/),
[Covetrus Ascend](https://software.covetrus.com/apac/veterinary-solutions/ascend-cloud-veterinary-software/),
[Provet Cloud](https://www.provet.com/),
[IDEXX Cornerstone](https://software.idexx.com/products/cornerstone),
[Oracle Health Revenue Cycle](https://www.oracle.com/health/revenue-cycle/) e
[SAP S/4health](https://www.sap.com/products/erp/partners/atsp-gmbh-s4health-patient-management-billing-on-sap-s4hana.html).
São sinais de produto e alegações dos fornecedores, não homologação
independente nem autorização para contratar provedores.

### Quality Bar congelada para a próxima implementação

1. `ERP-CLIN-001`: admissão → handoff/permanência → diária → consumo de
   estoque → alta → item/recebimento em PostgreSQL real, com dois tenants e
   evidência persistida em clínica, billing, caixa, auditoria e outbox.
2. `ERP-ATOMIC-002`: RED/GREEN de rollback entre `billing.addItem` e
   `markDailyChargeBilled`, sem item órfão, dupla cobrança ou estado
   irreconciliável.
3. `ERP-RLS-003`: leituras e escritas cruzadas entre tenants A/B negadas para
   todas as tabelas do slice, sob role sem `BYPASSRLS`.
4. `ERP-IDEM-004`: replay e concorrência convergem por chave de origem; payload
   divergente retorna conflito e nenhuma cobrança/baixa/receipt duplica.
5. `ERP-AUDIT-005`: ledger, caixa, estoque, audit log e outbox mantêm
   invariantes append-only e correlação de ator/episódio.
6. `ERP-E2E-006`: depois do backend, o fluxo deve passar pela SPA real, sem
   atalhos de API, `skip` ou retry mascarando falha.

### Próxima retomada

Não repetir os slices já publicados. Começar pela RED de rollback clínico-
financeiro, usar PostgreSQL descartável, atualizar a matriz de evidências e
reexecutar as regressões afetadas. Em paralelo, manter como gates separados
Redis failover/clock-skew, remoção de fallbacks em memória, provedores/sandbox,
SPA, paridade Vetus `11/11 + 3/3`, WCAG 2.2 AA, cobertura significativa,
deploy/restore/SLO e release. O status canônico permanece
`CVG-002B2B IN_PROGRESS/PARTIAL`; nada nesta seção declara produção ou
perfeição do ERP.

### Atualização de implementação — rollback de diária clínica-financeira

Na continuação de 23/08/2026, o RED da fronteira `billing.addItem` ↔
`markDailyChargeBilled` foi convertido em GREEN local. A rota de cobrança agora
usa `runTenantCommand` com a operação `inpatient.daily-charges.bill`, inclui a
auditoria aguardada na mesma operação e reidrata caches após erro. A prova
PostgreSQL descartável confirmou rollback de billing record e item (`0/0`),
diária ainda `pending` e vínculo nulo após failpoint depois de
`billing.addItem`. O artefato completo está em
`.agent/artifacts/CVG-002C-inpatient-daily-billing-rollback-2026-08-23.md`.

Isso atende somente a fronteira de atomicidade da diária. A barra congelada
`ERP-CLIN-001` ainda exige a jornada admissão → handoff/permanência → estoque →
alta → recebimento/ledger/audit/outbox, dois tenants, replay/concurrency e SPA;
nenhuma alegação de produção ou perfeição foi alterada.
