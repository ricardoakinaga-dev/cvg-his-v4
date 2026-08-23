# Pesquisa de mercado — ERP veterinário (checkpoint)

**Data:** 23 de agosto de 2026<br>
**Uso:** contexto de produto para a próxima sessão; não substitui teste de
paridade comportamental nem decisão de fornecedor.

Esta rodada consultou páginas oficiais de produtos e documentação pública. As
observações abaixo são sinais de posicionamento e capacidade anunciada, não
provas de que cada fluxo funciona em produção.

| Produto / fonte oficial                                        | Sinal observado                                                                                 | Implicação para o CVG-HIS                                                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [ezyVet](https://www.ezyvet.com/)                              | Plataforma cloud para prática veterinária, com integrações e operação multi-unidade anunciadas. | Priorizar contratos de integração, permissões por tenant e operação multi-local.                                 |
| [Shepherd](https://www.shepherd.vet/)                          | Foco em workflow de clínica, hospital e rede, com visão operacional compartilhada.              | Tratar agenda, internação, handoff e faturamento como uma jornada única observável.                              |
| [Digitail](https://digitail.com/)                              | Posicionamento de plataforma conectada, automações e integrações para equipes veterinárias.     | Evitar módulos isolados: outbox/inbox, idempotência e reconciliação precisam atravessar domínios.                |
| [Covetrus Ascend](https://software.covetrus.com/)              | Ênfase em operação de clínica, inventário e ecossistema de serviços.                            | Estoque, consumo, cobrança e fornecedor devem compartilhar rastreabilidade e auditoria.                          |
| [Provet Cloud](https://www.provet.cloud/)                      | Cobertura de prática, hospital, inventário e segurança/controle operacional.                    | Readiness, RLS, trilhas de auditoria e recuperação devem ser critérios de produto, não apenas infraestrutura.    |
| [IDEXX Neo](https://www.idexx.com/en/veterinary/software/neo/) | PIMS cloud integrado ao ecossistema IDEXX e ao fluxo clínico.                                   | Manter laboratório, resultados, anexos e prescrição como contratos integráveis, sem acoplamento a um fornecedor. |
| [Vetspire](https://vetspire.com/)                              | Plataforma cloud/API e integrações para operação veterinária.                                   | Evoluir ports/adapters e webhooks duráveis antes de declarar API/ecossistema prontos.                            |
| [Instinct EMR](https://instinct.vet/)                          | Ênfase em prontuário, tratamento e colaboração clínica.                                         | Handoff, timeline e ordens clínicas precisam de autoria, versionamento e reconciliação cross-instance.           |

## Decisões de continuidade

1. A barra de paridade deve ser comportamental: cada promessa de mercado vira
   uma jornada PostgreSQL/HTTP com dois tenants, replay, concorrência,
   failpoint e evidência revision-bound.
2. “Integração” significa ingress autenticado, outbox, inbox, idempotência,
   retry/lease, DLQ e reconciliação; uma chamada HTTP síncrona não é prova de
   integração durável.
3. “Cloud/multi-unidade” exige isolamento tenant, recuperação de processo,
   observabilidade, migração aplicada e operação sob role sem `BYPASSRLS`.
4. O CVG-HIS ainda não deve alegar liderança, paridade ou produção até que os
   gates documentados em `docs/430-fonte-de-verdade-documental.md` e no
   checkpoint do worker estejam verdes com evidência executável.

## Revalidação oficial para a retomada — 23 de agosto de 2026

Uma nova consulta a fontes primárias refinou a barra de produto. Os sinais
abaixo são capacidades anunciadas ou contratos públicos; devem virar testes
locais antes de qualquer alegação de paridade.

| Fonte | Sinal observado | Decisão executável |
| --- | --- | --- |
| [Vetspire API](https://developer.vetspire.com/) | GraphQL, subscriptions, introspection e ambientes de produção/staging/sandbox; as chaves têm alcance organizacional amplo | usar escopos mínimos por tenant/unidade, rotação/revogação, auditoria e ambientes separados; não replicar chave equivalente a senha administrativa |
| [ezyVet API release notes](https://developers.ezyvet.com/release-notes.html) | exigência de `site_uid`, paginação por cursor, saldos de inventário e DICOM Study UID write-once | contratos versionados precisam carregar unidade, cursor, replay idempotente e identidade imutável de estudo |
| [Shepherd features](https://www.shepherd.vet/features/) | SOAP, activity log, autosave, charge capture, inventário, whiteboard e alta aparecem conectados | um episódio clínico deve versionar/autosalvar autoria, tarefas, cobrança e alta no mesmo grafo auditável |
| [Instinct Treatment Plan](https://instinct.vet/products/instinct-treatment-plan/) | boards em tempo real, tratamentos pendentes, folhas de anestesia, alertas e captura automática de cobrança | flowboard e tratamento 24h devem ser estados persistidos, observáveis e idempotentes |
| [Covetrus Ascend stocktake](https://software.covetrus.com/emea/stocktake/) | código de barras, contagem/correção, aprovação, localização e histórico de edição | lote/validade/FEFO, ajuste aprovado e autoria do estoque entram no contrato |
| [FHIR R5](https://hl7.org/fhir/R5/) | recursos clínicos, diagnósticos, medicamentos, workflow e financeiro, além de `Provenance`, `AuditEvent` e subscriptions | integrações devem transportar proveniência, consentimento, autoria e reconciliação |
| [DICOMweb](https://www.dicomstandard.org/News-dir/ftsup/docs/sups/sup248.pdf) | QIDO-RS, WADO-RS e STOW-RS | diagnóstico por imagem precisa de busca, ingestão, recuperação, UID write-once e auditoria |
| [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e [CFMV Resolução 1465/2022](https://manual.cfmv.gov.br/arquivos/resolucao/1465.pdf) | saúde é dado pessoal sensível e telemedicina veterinária tem regra específica | consentimento, minimização, retenção, autoria e revisão jurídica são gates; não declarar conformidade por documentação |

### Decisões que não mudam o estado atual

- Uma integração só é considerada durável com ingress autenticado, escopo,
  outbox/inbox, idempotência, retry, lease/fence, DLQ, reconciliação e prova
  de tenant.
- IA/scribe é assistiva: deve conservar modelo, versão, origem, consentimento,
  revisão e aceite humano; nunca deve escrever silenciosamente no prontuário,
  estoque ou financeiro.
- Flowboard, charge capture, inventário, portal e analytics serão priorizados
  depois que a jornada clínica-financeira persistente e a segurança de
  tenancy estiverem verdes.
- Estas fontes reforçam a prioridade do fluxo
  `admissão → handoff/permanência → consumo/lote → alta → billing →
  recebimento → ledger/audit/outbox`, mas não alteram o resultado atual de
  paridade (0/11 geral e 0/3 clínica).
