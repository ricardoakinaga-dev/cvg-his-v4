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
