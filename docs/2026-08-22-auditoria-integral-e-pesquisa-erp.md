# Auditoria integral e pesquisa de ERPs veterinários — checkpoint 2026-08-22

**Escopo:** leitura consolidada de `docs/`, `docs/docs2/`, `docs/vetus/`, auditoria read-only do código e pesquisa de referências oficiais de ERPs/PIMS veterinários.

**Status:** documento de decisão e rastreabilidade. Não representa paridade concluída, prontidão de produção ou homologação de provider.

## 1. Autoridade e estado comprovado

A precedência vigente é: comportamento reproduzido no runtime e testes; código e contratos; programa e procedimentos atuais de agosto; ADRs; auditorias de julho; acervo Vetus; histórico `docs2/`. Documentação isolada nunca transforma uma tela, rota ou migration em prova funcional.

O estado executável auditado nesta sessão registra:

| Evidência | Resultado | Interpretação |
|---|---:|---|
| `pnpm readiness:enterprise` | 95/100; 42 PASS, 3 WARN, 1 FAIL | readiness estrutural alto, mas o FAIL é a paridade funcional Vetus |
| `pnpm vetus:parity:audit` | 0/11 verificado | paridade geral bloqueada |
| `pnpm vetus:clinical-parity` | 0/3 verificado | paridade clínica bloqueada |
| `pnpm validate:rls` | 148/149 tabelas protegidas | uma exceção documentada ainda precisa de decisão/fechamento |
| `pnpm validate:openapi` | 333 paths, 40 tags, 382 schemas | contrato estrutural; não prova comportamento dos handlers |
| `node tools/migration-consistency-report.mjs` | falhou por manifesto ausente | falta `docs/phase-9-migration-manifest.json` no caminho esperado |

O programa `CVG-002B2B` segue `IN_PROGRESS/PARTIAL`. B1/B2a estão verificados; a extensão B1 foi extraída para `packages/modules/pix` e a regressão focada está em 18/18. O novo verificador raw-body/HMAC e leitor de bytes crus passou 25/25 testes unitários e o lint da API; ingresso HTTP, receipt/delivery, migration 0111, principal de serviço, worker, providers reais e produção continuam não implementados.

## 2. Lacunas de maior impacto no código

1. **Durabilidade incompleta:** ainda existem fallbacks `Map`/in-memory em agenda, entregas de comunicação, Google Calendar, importação laboratorial, logs de importação Vetus, WebAuthn/challenges e OIDC. Isso impede restart seguro, múltiplas réplicas e recuperação de filas.
2. **Atomicidade cross-domain insuficiente:** o maior risco financeiro é uma comanda atualizar parcialmente atendimento, estoque/lote, recebível, caixa/pagamento, auditoria ou outbox.
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

## 7. Próximo checkpoint

O próximo trabalho autorizado permanece reversível e local: validar JSON autenticado (UTF-8/BOM/chaves duplicadas/allowlist), escrever os REDs de receipt/delivery e então implementar a migration expand-only `0111`. Nenhuma conclusão de paridade, provider real, deploy ou produção deve ser inferida deste documento.
