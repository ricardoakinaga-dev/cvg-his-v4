# Execução da onda 1 de paridade Vetus

**Data:** 2026-07-11
**Status:** em execução
**Backlog:** `2026-07-11-backlog-executavel-100-paridade-vetus.md`

## Entregas concluídas

### DATA-001A - bloqueio incorreto por prefixo

- Teste RED: o caso que institucionalizava o bloqueio foi invertido para exigir criação com `patient_*` e `owner_*`.
- Implementação: removidos alerta, botão desabilitado e early return baseados apenas no prefixo.
- Evidência: `EncounterFormPage.test.ts`, 15/15 testes passando.
- Evidência UI: login real, paciente DANI, motivo preenchido, criação e navegação para `/encounters/{uuid}`.

### DATA-001B - distinguir repository SQL de repository em memória

- Teste RED: repository em memória com IDs opacos era rejeitado como se fosse PostgreSQL.
- Implementação: `requireUuidIdentifiers` passou a ser capacidade explícita do runtime.
- PostgreSQL canônico exige UUID; runtime em memória não infere persistência pelo simples fato de existir repository.
- O servidor não preserva seeds de cadastro por padrão quando repositories persistentes são usados.
- Evidência: 21/21 testes do módulo encounters e teste focado do servidor passando.

### CLIN-001 - proteção de prontuário encerrado, parte de domínio

- Teste RED: add/update/archive, anexos e eventos avançados eram aceitos após o atendimento mudar para `closed`.
- Implementação: as operações consultam o atendimento e lançam `Closed encounter is read-only`; prontuário ausente também não é criado após fechamento.
- Cache frio: entrada carregada do repository agora hidrata o prontuário e a coleção antes de update/archive após restart.
- Evidência: 16/16 testes do módulo medical-records passando.

### DB-001A - governança de acesso canônica e multitenant

- Teste RED: a trilha canônica exigiu as sete tabelas `access_*`; os sete casos falharam antes da migration.
- Implementação: criada `0060_access_governance_tenant_scope.sql` com `account_id` explícito, tipos UUID compatíveis, FKs compostas contra vínculo cruzado, índices e RLS nas sete tabelas.
- Repository: escritas passaram a persistir `account_id`; memberships e grants usam escopo direto da conta.
- Teste de integração: migration limpa passou com 105/105 casos, 132 tabelas e 298 FKs.
- Teste RLS real: 3/3 casos passaram com role sem `BYPASSRLS`, incluindo leitura restrita e rejeição de escrita/vínculo cruzado.
- Gate estático: falhas obrigatórias reduziram de 13/111 para 6/111; as seis restantes continuam abertas e visíveis.
- Teste RED adicional: hidratar conta B apagava equipes, setores, vínculos, roles e grants da conta A.
- Implementação: a hidratação agora substitui somente o estado previamente carregado da conta atual e preserva as demais.
- Revisão independente: corrigido o `upsert` que poderia atualizar grant de outra conta no caminho de conflito quando a conexão ignora RLS.
- Teste RED da revisão: usuário com somente role legada não era hidratado; o repository agora enumera usuários da conta antes de resolver roles.
- Schema Drizzle: FKs compostas, índices únicos de suporte e checks `allow/deny` passaram a refletir a migration SQL.
- Upgrade: `0061_access_governance_hardening.sql` aplica checks nomeados também em bancos onde `0060` já havia sido registrada.
- Evidência: módulo access-control 27/27 testes, builds do módulo e DB, e suíte migration + RLS 108/108 passando.
- Ambiente local: migrations `0060` e `0061` aplicadas de forma incremental ao PostgreSQL local.
- Risco separado ainda aberto em `SEC-001`: a aplicação local usa `postgres`; RLS real exige role de runtime não privilegiada.

### DB-001B - ponte persistente do estoque operacional

- Teste RED: `inventory_items` e `inventory_consumptions` passaram a ser tabelas críticas; ambos os casos falharam antes da migration.
- Implementação: `0062_inventory_runtime_persistence.sql` criou os dois recursos, converteu `inventory_stock_movements.account_id` para UUID, adicionou FKs compostas por conta, checks, índices e RLS.
- Schema Drizzle: novo `inventory_runtime.ts` representa os três recursos sem fingir equivalência com o modelo distinto `stock_*`.
- Evidência de migration limpa: 108/108 passou; catálogo passou de 132 para 134 tabelas e de 298 para 303 FKs.
- Evidência RLS: 3/3 passou para leitura A/B e rejeição de consumo/movimento apontando para item de outra conta.
- Testes RED de serviço: hidratar B apagava consumos/movimentos de A; `createItem` respondia antes da Promise de persistência e deixava rejeição não tratada.
- Implementação de serviço: hidratação substitui somente dados da conta atual; arrays recebem novas cópias; create/update aguardam repository antes de publicar estado em memória; rotas aguardam o resultado.
- Revisão independente encontrou dois vazamentos críticos: detalhe/edição usavam ID global e consumo não comparava conta do encontro, item e principal.
- Testes RED: item de outra conta era legível, consumo assistencial cruzado debitava estoque e venda aceitava item de outra conta.
- Correção: `getItemOrThrow`, `consume`, `updateItem` e `consumeForSale` agora exigem conta; rotas passam a conta autenticada; adapter de venda filtra SKU pela conta.
- Repository: update persiste todos os campos editáveis, exige `rowCount = 1` e mantém predicado explícito de tenant.
- Evidência: módulo inventory 12/12 testes, builds do inventory, DB e API passando.
- PostgreSQL local: `0062` aplicada incrementalmente.
- Decisão: `inventory_*` é ponte compatível com o domínio atual. A consolidação definitiva em `products + stock_items + stock_lots + stock_movements` continua no backlog de `INV-001`.
- Riscos altos mantidos abertos: saldo, consumo e ledger ainda usam transações separadas e não possuem lock/controle otimista contra consumo concorrente.

### DB-001C/DB-001D - agenda canônica e ativação PostgreSQL

- Teste RED: migration não expunha `visit_type`, `reason`, staff/serviço operacionais; novos appointments usavam `appt_*` contra PK UUID.
- Decisão: `start_at/end_at` permanecem como única fonte temporal. `scheduledAt` é mapeado para início e `durationMinutes` é derivado do intervalo; não foram criadas colunas duplicadas `scheduled_at/duration`.
- Implementação: migrations `0063` e `0064` adicionaram contrato operacional, profissional opcional, backfill, checks, UUIDs, FKs compostas e integridade paciente-tutor.
- Repository: criação e remarcação calculam `end_at`; queries usam escopo explícito do GUC; payload integral de B sob contexto A é rejeitado mesmo com conexão privilegiada.
- Compatibilidade sem perda: status canônico e tipo clínico são preservados durante remarcações; `professional_user_id` permanece sincronizado a partir do staff enquanto o contrato legado existir.
- Serviço: novos agendamentos usam UUID; create/cancel/reschedule só publicam estado em memória após persistência confirmada.
- Testes RED da revisão: contexto A conseguia gravar B, tutor incorreto era aceito e cirurgia confirmada virava consulta agendada. Todos foram revertidos para GREEN.
- Evidência: repository PostgreSQL 6/6, módulo scheduling 45/45, build API/DB/shared-types e migration estrutural passando; banco limpo possui 134 tabelas e 309 FKs.
- Ativação: API iniciou sem `API_DISABLE_INCOMPATIBLE_DB_REPOS`, declarou `persistenceMode=database`, reiniciou repetidas vezes e permaneceu saudável.
- Massa demonstrativa persistente criada pela API: tutor `Ricardo Demo`, paciente `DANI Demo` e agendamento UUID; os três foram relidos após restart.
- Login local validado em banco: `admin` / `CvgLocal#2026`.
- Risco mantido em SEC-002: check-in atualiza appointment e fila em operações separadas; falta Unit of Work atômica.

### DB-001E - isolamento dos módulos dependentes e cuidados avançados

- Testes RED: `owner_patient_links`, `inpatient_progress` e `surgery_cases` foram promovidas a tabelas críticas; a suite falhou antes das migrations.
- Migration `0065`: adicionou tenant UUID, backfill validado, FKs compostas e RLS a MFA, timeline, deliveries de webhook e vínculos tutor-paciente.
- Vínculos primários foram materializados a partir de `patients.owner_id`; o ambiente local passou a ter um vínculo primário persistente para `DANI Demo`.
- MFA: toda operação passou a receber `accountId`; o challenge de login guarda a conta resolvida pelo usuário e não depende de `X-Account-ID` público.
- Webhooks: leituras, updates, deletes e deliveries usam conta explícita; `WebhookDeliverySummary` carrega `accountId`; a consulta de pendências deixou de ser global.
- Timeline: removido `acc_cvg_demo` fabricado; insert, leitura e mapeamento persistem a conta real.
- Tutor-paciente: repository e memória filtram por conta e preservam `financial_responsible` separado de vínculo primário; o domínio rejeita tutor/paciente de outra conta.
- Gate corrigido: o analisador RLS agora reconhece `account_id` adicionado por migration posterior, com teste RED próprio.
- Migration `0066`: criou `inpatient_progress` e `surgery_cases` canônicas com UUID, FKs compostas, checks, índices e RLS.
- Repositories de progressos e cirurgias exigem contexto e predicado explícito de conta; IDs novos são UUID.
- Evidência: `pnpm validate:rls` passou com 117/117 tabelas; migration 134/134; advanced care 15/15; MFA 51/51; webhooks 17/17.
- PostgreSQL local: `0065` e `0066` aplicadas; API reiniciada em modo `database`, HTTP 200; tutor, paciente e agendamento demo relidos.
- Checkpoint posteriormente superado pelas migrations `0072-0074`: `inpatient_stays`, progressos, ocorrências e diárias agora usam o agregado canônico, com hidratação por conta e referências tenant-aware.
- Revisão de código: o bootstrap deixou de habilitar progressos isoladamente quando stays permanecem em memória, evitando FK inválida com erro silencioso.
- Migration `0069`: evolução agora referencia conjuntamente a internação e o atendimento dela; combinações coerentes apenas isoladamente são rejeitadas.
- Migration `0068`: atendimentos receberam FKs compostas para paciente, tutor e usuários; o domínio também rejeita entidades de outra conta.
- Migration `0070`: atendimento exige conjuntamente conta, paciente e tutor primário; o teste RED provou que outro tutor da mesma clínica era aceito antes da correção.
- Migration `0071`: a FK permanente foi substituída por validação no vínculo do atendimento. O tutor histórico permanece imutável e a troca futura de tutor primário continua permitida; teste RED/GREEN cobre os dois comportamentos.
- MFA: `challengeId` passou a ser obrigatório e consumido; a SPA persiste e devolve o identificador emitido após a senha e executa enrollment quando a credencial ainda não existe.
- E2E encontrou 403 silencioso em orçamentos, prescrições, preventivo e serviços para o admin. O teste RED do catálogo falhou, e `0067` alinhou 21 permissões operacionais e grants do admin.
- Evidência local após restart: `quote.read`, `service.read` e `prescriptions.read` constam na sessão; `/quotes`, `/vaccines-dewormers`, `/prescriptions` e `/services` retornam HTTP 200.

## Atualização dos bloqueios de 2026-07-11

### Internação e cirurgia

- `0072` reconciliou estados, localização, alta e transferência da internação operacional.
- `0073-0074` adicionaram FKs compostas de conta para internação, paciente, atendimento, usuários, leitos, ocorrências e diárias; setores legados receberam guard tenant-aware.
- A admissão SPA/API passou a selecionar atendimento, setor e leito e grava o usuário autenticado como autor.
- A criação da internação e a ocupação do leito usam a mesma Unit of Work PostgreSQL; falha reverte as duas operações antes da resposta.
- Hidratação por conta foi ativada para internações e cirurgias. Após restart real, a API releu 1 internação, 1 evolução, 1 ocorrência, 1 diária e 1 cirurgia da massa DANI Demo.

### PostgreSQL de runtime e autenticação

- API e worker iniciam com `cvg_runtime`, `NOSUPERUSER`, `NOBYPASSRLS`, sem `CREATEDB`, `CREATEROLE` ou `REPLICATION`; bootstrap falha fechado quando `DATABASE_REQUIRE_RLS_ROLE=1`.
- O Compose reaplica a role em volumes existentes por `runtime-role-init`; Helm exige a verificação RLS em API e worker.
- Grants de escrita ficaram restritos às tabelas RLS; catálogos de controle têm somente leitura e `audit_events` é append-only para a aplicação.
- Queries tenant-aware configuram `app.current_account_id` dentro da transação. A admissão usa Unit of Work explícita na mesma conexão.
- Login não escolhe silenciosamente um usuário homônimo de outra conta; username ambíguo exige `accountId`. Logout, refresh e revogações persistem sob o contexto da sessão.

### Dependências e interface clínica

- `pnpm audit --prod` passou com zero vulnerabilidades conhecidas.
- O prontuário foi dividido em quatro etapas operacionais: Anamnese, Exame, Avaliação e Plano; somente a etapa ativa é renderizada.
- A lista de internação removeu o resumo duplicado e calcula ocupação usando leitos ativos.
- Um restart manual comprovou a reidratação; em seguida, o E2E `advanced-care-persistence.spec.ts` validou no Chromium a mesma massa persistida na internação, evolução, ocorrência, diária, cirurgia e prontuário segmentado. O teste não reinicia o processo por conta própria.

### Riscos que permanecem fora deste recorte

- o E2E clínico completo, do agendamento ao recebimento, ainda não está concluído;
- a jornada simultânea com dois tenants reais continua pendente;
- atomicidade entre diária e item da comanda, e o salvamento multi-entrada da ficha clínica, permanecem em `BILL-002`/`CLIN-004`;
- esta entrega não representa paridade global 100/100 com o Vetus.

## Testes executados

| Comando/fluxo                                       | Resultado                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| teste RED EncounterFormPage                         | falhou pelo aviso legado, como esperado                           |
| EncounterFormPage após implementação                | 15/15 passou                                                      |
| teste RED repository em memória                     | falhou pela exigência UUID implícita                              |
| módulo encounters após implementação                | 21/21 passou                                                      |
| teste RED prontuário encerrado                      | falhou porque escrita era aceita                                  |
| módulo medical-records após implementação e revisão | 16/16 passou                                                      |
| build API e módulos alterados                       | passou                                                            |
| `vue-tsc --noEmit` SPA                              | passou                                                            |
| walkthrough UI animal -> atendimento                | passou até detalhe do atendimento em modo memória                 |
| teste unitário do analisador RLS                    | 8/8 passou                                                        |
| migration canônica de acesso em banco limpo         | 108/108 passou; 132 tabelas e 298 FKs naquele checkpoint          |
| RLS de governança com role restrita                 | 3/3 passou                                                        |
| módulo access-control após correção multitenant     | 27/27 passou; build passou                                        |
| migration limpa após ponte de estoque               | 108/108 passou; 134 tabelas e 303 FKs                             |
| RLS de estoque com role restrita                    | 3/3 passou                                                        |
| módulo inventory após persistência e isolamento     | 12/12 passou; builds inventory/API/DB passaram                    |
| agenda repository PostgreSQL                        | 6/6 passou, incluindo tenant/tutor e preservação semântica        |
| módulo scheduling                                   | 45/45 passou                                                      |
| API sem guard + restart                             | passou; `persistenceMode=database`, HTTP 200                      |
| massa tutor/paciente/agendamento após restart       | passou; 1/1/1 registros relidos pela API                          |
| migration após `0065-0071`                          | 136/136 passou; 137 tabelas, 334 FKs                              |
| cuidados avançados PostgreSQL                       | 15/15 passou; round-trip, cross-tenant, FKs e role RLS            |
| MFA / webhooks                                      | 51/51 e 17/17 passaram                                            |
| integração PostgreSQL MFA + webhooks                | 27/27 passou após alinhar UUID, username e contrato tenant-aware  |
| catálogo operacional/admin                          | RED falhou; quatro endpoints auxiliares retornaram HTTP 200       |
| atendimento cross-tenant                            | RED falhou; domínio e FKs compostas passaram após `0068`          |
| migration limpa após `0075`                         | passou; 137 tabelas, 38 enums e 352 FKs                           |
| módulos auth / users / inpatient                    | 30/30, 9/9 e 16/16 passaram                                      |
| role runtime após reprovisionamento                 | API e worker prontos em modo database; bootstrap fail-closed      |
| auditoria de produção                               | zero vulnerabilidades conhecidas                                 |
| restart manual + E2E de cuidados avançados          | reidratação comprovada; depois 1/1 passou no Chromium              |
| `pnpm validate:rls` endurecido                      | passou: 117/117 tabelas protegidas                                |
| API local após `0065/0066`                          | iniciou em `127.0.0.1:3111`; `persistenceMode=database`, HTTP 200 |
| massa tutor/paciente/agendamento após novo restart  | passou; `Ricardo Demo`, `DANI Demo` e appointment UUID relidos    |

## Estado das notas

As notas globais não foram elevadas nesta onda. Os defeitos foram corrigidos, porém os critérios exigem PostgreSQL, restart, tenant real e jornada até recebimento. Subir a nota agora repetiria o erro metodológico das auditorias antigas.

## Próxima execução

1. tornar o E2E de cuidados avançados autossuficiente e automatizar o restart no harness;
2. estender Unit of Work tenant-aware para diária/comanda e ficha clínica multi-entrada;
3. executar DANI Demo do agendamento ao recebimento em PostgreSQL;
4. tornar check-in/fila e estoque/ledger atômicos e concorrentes;
5. concluir CLIN-001 com reabertura autorizada e auditada.
