# 899 - Decisão de Escopo: Fluxo Operacional vs RH/Governança

Data: 2026-05-01
Status: decisão de escopo registrada
Origem: revisão do handoff clínico, inbox mínima da recepção e inspeção do RH/governança atual.

Complemento: `docs/900-templates-conversacionais-governanca-acesso.md` define a linguagem humana para conversar sobre templates sem transformar nomes de cargos, setores ou grupos em autorização hardcoded.

## 1. Decisão

O handoff e a inbox da recepção devem modelar o **fluxo de atendimento**, não a matriz rígida de quem pode executar cada ação.

A autorização fina de atividades pertence a **RH / Usuários / Grupos de Acesso / Equipes / Setores / Permissões**.

Portanto:

- a frente operacional define o que acontece depois de quê;
- RH/governança define quem pode executar cada rotina;
- usuário autenticável carrega identificação, login, senha/status e permissões efetivas;
- profissional/equipe carrega a identidade operacional/assistencial usada em agenda, receitas, relatórios e prontuários;
- prontuário, receitas, relatórios, diagnóstico e prescrição seguem protegidos por permissões configuráveis da própria rotina;
- recepção pode ser conduzida pelo fluxo para etapas administrativas/financeiras/documentais, mas a autorização real deve vir da matriz de acesso.

## 2. Separação correta

### Fluxo operacional

Responsabilidade: orientar a jornada.

Exemplos:

- clínica envia handoff para recepção;
- recepção recebe o caso;
- recepção identifica pendências operacionais;
- recepção segue para atendimento, paciente, tutor, comanda, cobrança, documentos ou agendamento conforme a jornada;
- sistema mostra o estado operacional do atendimento.

Essa camada não deve hardcodar que "recepção sempre pode X".

### RH e governança de acesso

Responsabilidade: autorizar capacidades.

Exemplos:

- qual sujeito de acesso pode consultar, inserir, alterar ou excluir em cada rotina;
- quais grupos de acesso concedem ou negam cada permissão;
- quais setores organizacionais herdam permissões;
- quais permissões vêm de usuário, grupo, setor ou modelo inicial;
- quais permissões podem ser customizadas por conta, sem depender do nome do cargo, setor ou profissão.

Essa camada define quem pode fazer.

Modelo esperado:

- usuário tem login, senha, identificação, status e vínculo opcional com profissional;
- grupo de acesso é uma política coletiva reutilizável;
- grupos pré-configurados podem existir como modelos iniciais editáveis;
- novos grupos de acesso podem ser criados pela operação e receber qualquer combinação válida de permissões;
- setor organizacional pode herdar permissões, sem substituir a permissão individual;
- usuário individual pode receber `allow` ou `deny` por rotina, mesmo quando pertence ao mesmo grupo/setor de outro usuário;
- profissional é o cadastro usado para responsabilidade técnica, agenda, comissão, receitas, relatórios e prontuários, não o mecanismo primário de autorização.

## 3. Estado real encontrado no código

### Usuários

Arquivos principais:

- `packages/modules/users/src/index.ts`
- `packages/modules/users/src/repositories/database-users.repository.ts`
- `apps/spa/src/pages/users/UsersListPage.vue`
- `apps/api/src/routes/users-staff-quotes-routes.ts`

Estado:

- existe serviço de usuários com senha hash, status, criação, edição e hidratação;
- existe repositório SQL em `users`;
- tela `/users` está dentro de `RH > Usuários > Usuários`;
- usuário autenticável está documentado como separado de profissional de agenda;
- ainda há limitações: `UsersService.create()` mantém `accountId` fixo no serviço e `UserSummary` não expõe, por si só, a matriz completa de vínculos.

### Profissionais/equipe operacional

Arquivos principais:

- `packages/modules/staff/src/index.ts`
- `packages/modules/staff/src/repositories/database-staff.repository.ts`
- `apps/spa/src/pages/staff/StaffListPage.vue`

Estado:

- existe cadastro de profissionais em `staff`;
- profissional pode ter vínculo opcional com `userId`;
- possui departamento, cargo, status e persistência SQL;
- tela `/staff` está em `RH > Cadastros > Profissionais`;
- serve bem para agenda, produção, folgas e comissão;
- não deve ser confundido com autorização fina.

### Grupos, setores e permissões

Arquivos principais:

- `packages/modules/access-control/src/index.ts`
- `packages/modules/access-control/src/repositories/database-access-control.repository.ts`
- `packages/db/src/schema/access_governance.ts`
- `apps/api/src/routes/access-control-routes.ts`
- `apps/spa/src/pages/access-control/AccessControlPage.vue`

Estado:

- existe catálogo de permissões e roles legadas;
- existe repositório SQL para:
  - `access_teams`;
  - `access_sectors`;
  - `access_team_memberships`;
  - `access_sector_memberships`;
  - `access_user_permissions`;
  - `access_team_permissions`;
  - `access_sector_permissions`;
- runtime injeta `DatabaseAccessControlRepository`;
- `AccessControlService.hydrateFromDatabase(accountId)` carrega roles, permissões, equipes, setores, memberships e grants;
- API expõe criação/listagem de equipes e setores, vínculos usuário-equipe/setor, roles legadas, grants e permissão efetiva;
- tela `/access-control` já permite trabalhar com usuários, grupos, setores e matriz.
- a matriz da UI já opera com estados `Herdar`, `Conceder` e `Negar` para usuário, grupo/equipe e setor;
- a resolução de permissão prioriza `deny`/`allow` direto do usuário, depois setor, grupo/equipe e, por último, role legada.

## 4. Ponto crítico para o handoff

Hoje o handoff usa permissões existentes de forma genérica:

- listar/ler handoff: `encounters.read`;
- enviar para recepção: `encounters.manage`;
- confirmar recebimento: `encounters.manage`;
- billing: `billing.read` / `billing.manage`;
- comanda: `counter_sale.read` / `counter_sale.write`;
- prontuário: `medical-records.read` / `medical-records.manage`.

Isso confirma que a próxima evolução do fluxo não deve criar permissões fixas dentro do handoff. Se surgir necessidade de liberar ou restringir uma ação, a solução correta é ajustar a matriz de acesso no RH/governança.

Exemplos práticos para o fluxo:

- alterar agenda depende da permissão da rotina de agenda, por exemplo `scheduling.manage`;
- lançar/editar comanda depende da permissão da rotina de comanda, por exemplo `counter_sale.write`;
- criar cobrança/billing depende da permissão da rotina financeira, por exemplo `billing.manage`;
- escrever prontuário, diagnóstico, prescrição e relatório depende das permissões das rotinas correspondentes, por exemplo `medical-records.manage` e permissões correlatas;
- ler ou escrever qualquer rotina não deve ser liberado por atalho de fluxo; deve vir da matriz de acesso.

## 5. Implicação para a próxima tarefa

Antes de avançar para um fluxo pós-atendimento mais amplo, há duas opções válidas:

1. **Continuar no fluxo operacional**, usando as permissões existentes como contratos de acesso e sem criar regra fixa por setor.
2. **Focar no módulo RH/governança**, se a operação precisa primeiro customizar permissões por usuário, equipe ou setor antes de liberar etapas como comanda, cobrança e documentos dentro da recepção.

## 6. Validação RH-VAL-1

Status em 2026-05-01: concluída.

Resultado:

- `/access-control` cria grupo pré-configurado editável e novo grupo criado pela operação;
- vincula usuário a grupo e setor;
- aplica grants `allow`, `deny` e `inherit`;
- calcula permissão efetiva por rotina;
- bloqueia endpoint protegido quando a permissão efetiva não existe;
- rejeita escrita cross-account em vínculo, grant e atualização de grupo.

Essa validação usa a terminologia do doc `900`: nomes como recepção, clínica ou financeiro são templates conversacionais/editáveis, não regras de autorização.

## 7. Alinhamento HOFF-GOV-1

Status em 2026-05-01: concluído.

Resultado:

- os docs `891`, `892`, `893` e `894` foram alinhados para tratar nomes como recepção, clínica, financeiro, caixa, gestor e coordenação como templates conversacionais/operacionais;
- as ações do handoff passaram a apontar para permissões técnicas candidatas, como `clinical_handoff.send`, `clinical_handoff.acknowledge`, `clinical_handoff.return`, `clinical_handoff.complete` e `clinical_handoff.cancel`;
- endpoint, service e UI futura devem validar permissão efetiva no `/access-control`;
- filtros por setor, destino ou responsável continuam sendo roteamento operacional, não autorização.

## 8. Fechamento HOFF-001/HOFF-002

Status em 2026-05-01: concluído.

Resultado:

- `HOFF-001`: pré-handoff, `HOFF-MIN-1` e handoff completo ficaram separados.
- `HOFF-002`: `clinicalStatus`, `operationalStatus`, `billingStatus` e `handoffStatus` ficaram separados.
- `pronto_para_recepcao` não deve ser tratado como status clínico.
- No estágio atual, recepção aguardando ação é leitura derivada de `handoffStatus = sent_to_reception`; HOFF-025 e HOFF-026 fecharam que `Queue` e `Encounter` exibem leitura derivada, sem absorver `handoffStatus`.
- O fechamento não libera DEV novo, automação financeira, comanda automática, devolução clínica, conclusão/cancelamento de handoff ou inbox completa.

## 9. Fechamento HOFF-003/HOFF-004

Status em 2026-05-01: concluído.

Resultado:

- `HOFF-003`: handoff completo será entidade própria `ClinicalHandoff`, integrada a `Encounter`, `Queue` e eventos auditáveis.
- `Encounter` não absorve a state machine do handoff.
- `Queue` pode refletir leitura operacional derivada, mas não substitui a entidade de handoff.
- Eventos auditáveis registram as transições, mas não substituem a entidade ativa que a recepção precisa listar e assumir.
- `HOFF-004`: recepção/finalização operacional é checkpoint padrão antes de financeiro.
- Caminho direto clínica -> financeiro não está aprovado para a próxima fatia.

## 10. Fechamento HOFF-005/HOFF-006

Status em 2026-05-01: concluído.

Resultado:

- estados aprovados para a próxima fatia: `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- transições aprovadas: ACK, marcar pendência, resolver pendência, devolver à clínica, reenviar à recepção e encaminhar ao financeiro;
- estados fora da próxima fatia: `draft`, fluxo completo de `ready_to_send`, `waiting_owner_decision`, `in_billing`, `completed` e `cancelled`;
- transições diretas sem ACK, conclusão/cancelamento e integração Billing/CounterSales completa seguem bloqueadas.

## 11. Fechamento HOFF-008/HOFF-009

Status em 2026-05-01: concluído.

Resultado:

- bloqueios gerais definidos para conta, permissão efetiva, estado válido, auditoria, idempotência/conflito e automação indevida;
- bloqueios específicos definidos para envio/reenviar à recepção, ACK, pendência, devolução clínica e envio ao financeiro;
- pendências críticas definidas como `clinical`, `documentation`, `billing_origin`, `owner_guidance`, `diagnostic`, `operational_owner` e `accountability`;
- pendência crítica aberta bloqueia envio ao financeiro e conclusão futura;
- pendência não crítica pode seguir somente com dono e justificativa auditável.

Próximo passo lógico:

**`HOFF-011` e `HOFF-012` foram detalhados no checkpoint seguinte.**

## 12. Fechamento HOFF-011/HOFF-012

Status em 2026-05-01: concluído.

Resultado:

- `HOFF-011`: a recepção/finalização passa a ter jornada aprovada de receber, assumir por ACK, conferir contexto e decidir próximo passo;
- a conferência inclui resumo, tutor, paciente, atendimento, documentos, prescrições, exames, retornos, serviços realizados, origem financeira e pendências;
- pendências devem ter tipo, motivo, dono e criticidade;
- recepção/finalização só encaminha ao financeiro quando não houver pendência crítica aberta e existir origem financeira rastreável;
- `HOFF-012`: o financeiro recebe `sent_to_finance` como encaminhamento operacional, não como cobrança automática;
- cobranças, comandas, pagamentos, baixas, parcelas, notas e ajustes continuam nas rotinas próprias, por ação explícita e permissão efetiva;
- continuam bloqueados `completed`, `in_billing`, cancelamento, financeiro direto clínica -> financeiro, inbox completa e automação financeira.

Próximo passo lógico:

**`HOFF-021` e `HOFF-022` foram fechados no checkpoint seguinte.**

## 13. Fechamento HOFF-021/HOFF-022

Status em 2026-05-01: concluído.

Resultado:

- endpoints candidatos aprovados para a próxima fatia: `mark-pending`, `resolve-pending`, `return-to-clinic` e `send-to-finance`;
- payloads mínimos e opcionais aprovados no `894`;
- pendência passa a ser endereçável por `pendingId`;
- resolver pendência exige `pendingId`, resolução ou justificativa;
- devolução clínica exige motivo e destino, sem editar prontuário pela recepção;
- envio ao financeiro exige conferência operacional e origem financeira rastreável;
- nenhuma ação aprovada cria cobrança, comanda, pagamento, baixa, parcela, nota ou `in_billing`.

Próximo passo lógico:

**`HOFF-023` foi fechado no checkpoint seguinte.**

## 14. Fechamento HOFF-023

Status em 2026-05-01: concluído.

Resultado:

- eventos auditáveis aprovados para envio/ACK, pendência marcada, pendência resolvida, devolução clínica e envio ao financeiro;
- todo evento deve carregar conta, handoff, atendimento, ator, permissão efetiva usada, estado anterior, novo estado e data/hora;
- eventos de pendência apontam `pendingId`;
- eventos de devolução registram motivo e destino;
- evento de envio ao financeiro registra conferência operacional e origem financeira rastreável;
- eventos não substituem a entidade ativa, pendências estruturadas, Billing ou CounterSales;
- eventos não carregam conteúdo clínico/financeiro completo nem dados pessoais desnecessários.

Próximo passo lógico:

**`HOFF-013` e `HOFF-016` foram fechados no checkpoint seguinte.**

## 15. Fechamento HOFF-013/HOFF-016

Status em 2026-05-01: concluído.

Resultado:

- inbox da próxima fatia aprovada para os estados `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- filtros visuais aprovados: status/grupo, criticidade, tipo de pendência, responsável atual, prioridade, atraso, origem e busca operacional;
- campos mínimos aprovados por item: identidade, estado, contexto clínico-operacional, pendências, financeiro contextual e ações;
- estados vazios aprovados: carregando, sem handoffs ativos, sem resultado, sem crítica, erro e dados incompletos;
- estados sem permissão aprovados: sem leitura, leitura sem ação, sem ACK, sem devolução, sem financeiro e sem prontuário;
- todos os estados sem permissão dependem de permissão efetiva no `/access-control`, sem autorização por nome de setor, cargo, profissão ou grupo.

Próximo passo lógico:

**`HOFF-014` e `HOFF-015` foram fechados no checkpoint seguinte.**

## 16. Fechamento HOFF-014/HOFF-015

Status em 2026-05-01: concluído.

Resultado:

- resumo mínimo aprovado para envio/reenvio com atendimento, tutor/paciente quando aplicáveis, resumo clínico-operacional, instruções, destino, prioridade, pendências declaradas e status de origem financeira;
- campos condicionais aprovados para exames, prescrições, documentos, billing, orçamentos e resposta à devolução;
- devolução clínica aprovada com tipo controlado, motivo, destino clínico e pendência relacionada quando houver;
- motivos controlados: `summary_missing`, `documentation_needed`, `prescription_clarification`, `diagnostic_clarification`, `reassessment_needed`, `billing_origin_clinical` e `other`;
- recepção não edita prontuário, prescrição, laudo ou relatório pela devolução;
- pendência puramente financeira não deve ser devolvida à clínica.

Próximo passo lógico:

**`HOFF-024` foi fechado no checkpoint seguinte.**

## 17. Fechamento HOFF-024

Status em 2026-05-01: concluído.

Resultado:

- filtros de listagem da inbox/API aprovados como consulta operacional;
- filtros por grupo, responsável, origem, atraso ou pendência não concedem permissão;
- listagem exige permissão efetiva `clinical_handoff.read` e isolamento por `accountId`;
- query params candidatos aprovados para status, grupo visual, criticidade, pendência, responsável, prioridade, origem, tutor, paciente, atendimento, Queue, busca, datas, atraso visual e origem financeira;
- paginação, ordenação e erros de filtro inválido ficaram definidos no `894`;
- limiares de atraso/SLA foram encaminhados para `HOFF-017`.

Próximo passo lógico:

**`HOFF-017` foi fechado no checkpoint seguinte.**

## 18. Fechamento HOFF-017

Status em 2026-05-02: concluído.

Resultado:

- SLA/alerta de atraso aprovado como leitura derivada da permanência do handoff no grupo atual;
- `normal`, `attention` e `overdue` são buckets visuais/operacionais, não estados;
- limiares candidatos definidos por grupo de inbox e pendência;
- atraso não concede permissão, não substitui matriz de acesso e não usa nome de setor, cargo, profissão ou grupo como autorização;
- atraso não dispara transição automática, devolução clínica, envio ao financeiro, cobrança, comanda, conclusão ou cancelamento.

Próximo passo lógico:

**`HOFF-018` foi fechado no checkpoint seguinte.**

## 19. Fechamento HOFF-018

Status em 2026-05-02: concluído.

Resultado:

- `completed` aprovado como conclusão operacional futura do handoff, sem virar fechamento clínico ou financeiro;
- conclusão futura exige ACK, conferência operacional, permissão efetiva `clinical_handoff.complete`, ausência de pendência crítica e origem financeira tratada;
- pendência residual só pode permanecer se for não crítica, justificada, com dono e auditável;
- conclusão não cria cobrança, comanda, pagamento, baixa, nota, exame, prescrição, documento ou edição clínica;
- cancelamento, `in_billing`, automação financeira e inbox completa continuam fora desta decisão.

Próximo passo lógico:

**`HOFF-019` foi fechado no checkpoint seguinte.**

## 20. Fechamento HOFF-019

Status em 2026-05-02: concluído.

Resultado:

- checklist operacional aprovado para validar handoff por papel, transição, bloqueio, permissão e auditoria;
- resultado de validação deve ser marcado como `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`;
- P0/P1 bloqueiam BUILD;
- validação confirma que permissões vêm da matriz configurável e não de nome de setor/cargo/profissão/grupo;
- checklist não libera implementação, API final, automação financeira, cancelamento, `in_billing` ou inbox completa.

Próximo passo lógico:

**`HOFF-020` foi fechado no checkpoint seguinte.**

## 21. Fechamento HOFF-020

Status em 2026-05-02: concluído.

Resultado:

- `ClinicalHandoff` confirmado como entidade própria e fonte do `handoffStatus`;
- schema futuro aprovado em três camadas: handoff base, pendências estruturadas e eventos auditáveis;
- `Encounter`, `Queue`, Billing e eventos não substituem a entidade;
- RLS por `accountId`, idempotência, histórico append-only e bloqueio cross-account são obrigatórios em migration futura;
- decisão não libera migration, endpoint novo, automação financeira, conclusão, cancelamento ou inbox completa.

Próximo passo lógico:

**`HOFF-025` foi fechado no checkpoint seguinte.**

## 22. Fechamento HOFF-025

Status em 2026-05-02: concluído.

Resultado:

- Queue mantém state machine própria e não recebe novos status persistidos para handoff nesta fase;
- `ClinicalHandoff` continua fonte do `handoffStatus`;
- Queue pode exibir somente leitura/overlay derivado do handoff;
- endpoints de Queue não criam ou alteram handoff automaticamente;
- endpoints de handoff não concluem, cancelam, reabrem ou movem Queue automaticamente;
- inconsistência entre Queue terminal e handoff ativo vira alerta ou pendência, não autocorreção;
- decisão não libera migration, endpoint novo, sincronização bidirecional, automação financeira, conclusão, cancelamento ou inbox completa.

Próximo passo lógico:

**`HOFF-026` foi fechado no checkpoint seguinte.**

## 23. Fechamento HOFF-026

Status em 2026-05-02: concluído.

Resultado:

- Encounter mantém status próprio e não recebe `handoffStatus` persistido;
- `ClinicalHandoff` continua fonte do estado do handoff;
- Encounter é âncora obrigatória para contexto, timeline resumida e navegação;
- envio/reenvio exige Encounter válido, da mesma conta e não fechado;
- `closeEncounter` não completa, cancela, devolve, envia ao financeiro ou reconhece handoff;
- completar handoff futuramente não fecha Encounter automaticamente;
- inconsistência entre Encounter fechado e handoff ativo vira alerta ou pendência, não autocorreção;
- decisão não libera migration, endpoint novo, automação financeira, conclusão, cancelamento ou inbox completa.

Próximo passo lógico:

**`HOFF-027` foi fechado no checkpoint seguinte.**

## 24. Fechamento HOFF-027

Status em 2026-05-02: concluído.

Resultado:

- `sent_to_finance` é encaminhamento operacional, não criação de cobrança;
- handoff não cria Billing, Encounter Billing, CounterSales, recebível, pagamento, baixa, parcela, nota ou movimento de caixa;
- handoff não chama rotas financeiras ou comerciais como side effect;
- Billing/CounterSales continuam rotinas próprias, por ação explícita e permissão própria;
- falta de origem financeira vira pendência `billing_origin`;
- risco de duplicidade financeira bloqueia avanço ou exige justificativa auditável futura;
- decisão não libera `in_billing`, `completed`, automação financeira, endpoint novo, migration ou inbox completa.

Item executado no checkpoint seguinte:

**`HOFF-028`: permissões técnicas.**

## 25. Fechamento HOFF-028

Status em 2026-05-02: concluído.

Resultado:

- permissões técnicas do handoff foram aprovadas como matriz configurável em `/access-control`;
- autorização continua por usuário, grupo de acesso, setor organizacional, rotina, permissão e grants `Herdar`, `Conceder` ou `Negar`;
- matriz aprovada inclui leitura, escrita/preparo, envio, ACK, marcar pendência, resolver pendência, devolver à clínica, enviar ao financeiro, concluir futuramente e cancelar futuramente;
- nomes como clínica, recepção, financeiro, caixa, gestor e coordenação seguem como templates conversacionais/editáveis;
- `clinical_handoff.reopen` não foi aprovado para a próxima fatia;
- permissões de handoff não substituem permissões próprias de Billing, CounterSales, prontuário, agenda, documentos, relatórios, caixa, pagamentos ou auditoria global;
- decisão não libera endpoint novo, migration, alteração de catálogo, inbox completa, automação financeira, conclusão, cancelamento ou BUILD.

Item executado no checkpoint seguinte:

**`HOFF-029`: migration futura.**

## 26. Fechamento HOFF-029

Status em 2026-05-02: concluído.

Resultado:

- migration futura do handoff foi aprovada como plano, sem criar ou aplicar SQL;
- a `0045_clinical_handoffs` continua baseline do `HOFF-MIN-1`;
- próxima migration deve ser aditiva, compatível, com RLS por `accountId`, validação cross-account, hidratação após restart e rollback operacional;
- `clinical_handoffs` deve ser ampliada sem transferir autorização para setor, cargo, grupo ou template;
- pendências e eventos devem ser tabelas próprias, não campos soltos em Queue, Encounter, Billing ou CounterSales;
- backfill não deve inventar eventos, pendências, financeiro, cobrança, comanda, conclusão ou cancelamento;
- decisão não libera endpoint novo, migration real, automação financeira, inbox completa, `completed`, `cancelled` ou BUILD.

Item executado no checkpoint seguinte:

**`HOFF-030`: plano de testes unitários da state machine/service.**

## 27. Fechamento HOFF-030

Status em 2026-05-02: concluído.

Resultado:

- plano de unitários do service/state machine foi aprovado sem implementar testes;
- testes devem validar regra de domínio, estado final, evento append-only e ausência de side effects;
- regressões do handoff mínimo continuam obrigatórias;
- ações futuras cobertas: pendência, resolução, devolução clínica, reenvio e envio ao financeiro;
- bloqueios futuros cobertos: transição inválida, pendência crítica, origem financeira ausente, duplicidade financeira, financeiro direto sem ACK, `completed`, `cancelled`, `in_billing` e `reopen`;
- testes de API, status HTTP, autenticação e permissão por endpoint ficam para `HOFF-031`;
- matriz completa de transições válidas/inválidas fica para `HOFF-032`;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Item executado no checkpoint seguinte:

**`HOFF-031`: plano de testes de API, rotas, contratos de erro e permissões por endpoint.**

## 28. Fechamento HOFF-031

Status em 2026-05-02: concluído.

Resultado:

- plano de testes de API/HTTP foi aprovado sem implementar testes;
- rotas mínimas atuais e rotas futuras da próxima fatia foram separadas;
- cada endpoint deve ser testado para autenticação, permissão efetiva, `accountId`, payload, erro, auditoria e ausência de side effects;
- permissões futuras usam `clinical_handoff.*`; permissões atuais `encounters.read/manage` ficam como compatibilidade temporária do mínimo existente;
- erros cross-account devem responder sem vazamento de existência;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Item executado no checkpoint seguinte:

**`HOFF-032`: matriz de transições válidas e inválidas da state machine.**

## 29. Fechamento HOFF-032

Status em 2026-05-02: concluído.

Resultado:

- matriz de transições válidas e inválidas da state machine foi aprovada sem implementar testes;
- ações válidas da próxima fatia ficam restritas a ACK, pendência, resolução, devolução clínica, reenvio e envio ao financeiro com pré-condições;
- ações bloqueadas incluem financeiro sem ACK, devolução sem ACK, `in_billing`, `completed`, `cancelled`, `reopen` e fluxo completo de rascunho;
- matriz valida fluxo, não autorização nominal;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Próximo passo lógico:

**Item executado no checkpoint seguinte: `HOFF-033`, validação UX por papel antes de BUILD.**

## 30. Fechamento HOFF-033

Status em 2026-05-02: concluído.

Resultado:

- validação UX por papel foi aprovada como roteiro pré-BUILD;
- papéis são templates conversacionais e não matriz de autorização;
- walkthrough deve validar clínica, recepção/finalização, financeiro/caixa e coordenação;
- cada jornada deve cobrir caminho feliz, bloqueio por permissão, dados incompletos, estado vazio, erro e atraso;
- ações financeiras e clínicas continuam dependentes das permissões próprias de cada rotina;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Próximo passo lógico:

**Item executado no checkpoint seguinte: `HOFF-034`, smoke visual da inbox/Encounter/Queue quando aplicável.**

## 31. Fechamento HOFF-034

Status em 2026-05-02: concluído.

Resultado:

- smoke visual aprovado como validação pré-BUILD, sem criar UI nova;
- evidências devem cobrir inbox, Encounter e Queue quando aplicáveis;
- desktop, largura intermediária e mobile devem ser verificados conforme superfície;
- validação deve impedir tela em branco, overflow, sobreposição, CTA incoerente, status só por cor e exposição indevida por permissão;
- Queue e Encounter seguem como leitura/contexto; `ClinicalHandoff` continua fonte da state machine;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Próximo passo lógico:

**Item executado no checkpoint seguinte: `HOFF-035`, auditoria/eventos da próxima fatia.**

## 32. Fechamento HOFF-035

Status em 2026-05-02: concluído.

Resultado:

- auditoria/eventos foram aprovados como trilha append-only da próxima fatia;
- eventos validam fluxo e responsabilidade, não autorização nominal;
- ação aceita deve gerar evento; ação recusada por permissão, conta, payload, estado ou conflito não gera evento operacional de handoff;
- eventos devem ser correlacionáveis, idempotentes em retry e mínimos em payload;
- timeline de Encounter e overlay de Queue seguem consumidores, não fonte da auditoria;
- decisão não libera código, endpoint novo, migration, event store, automação financeira, inbox completa ou BUILD.

Próximo passo lógico:

**Item executado no checkpoint seguinte: `HOFF-036`, rollback e mitigação.**

## 33. Fechamento HOFF-036

Status em 2026-05-02: concluído.

Resultado:

- rollback/mitigação aprovados como condição para BUILD futuro;
- rollback é desativação controlada da fatia nova, não deleção apressada de dados;
- `HOFF-MIN-1` deve continuar funcionando com envio, listagem/detalhe, ACK e auditoria mínima;
- estados novos devem continuar legíveis e auditáveis mesmo com ações novas desativadas;
- nenhuma mitigação pode criar cobrança, comanda, pagamento, baixa, documento, exame, prescrição, edição clínica ou status persistido em Queue/Encounter;
- decisão não libera código, endpoint novo, migration, feature flag real, automação financeira, inbox completa ou BUILD.

Próximo passo lógico e final desta fase:

**Item executado no checkpoint seguinte: `HOFF-037`, validação com operação antes de BUILD.**

## 34. Fechamento HOFF-037

Status em 2026-05-02: concluído.

Resultado:

- validação com operação aprovada;
- pacote HOFF-001 a HOFF-037 encerra a fase de planejamento pré-BUILD;
- escopo validado continua sendo fluxo de handoff/inbox, não autorização nominal;
- BUILD não está liberado automaticamente;
- qualquer próxima ação de construção exige autorização explícita do responsável;
- não criar `HOFF-038` sem nova decisão explícita.

Decisão pendente fora desta fase:

**Autorizar BUILD da primeira fatia pequena, pausar a frente ou reabrir item específico por bloqueio real.**

## 35. Guardrail

- Não codificar autorização nominal dentro do handoff; toda capacidade deve vir da matriz de permissões.
- Não permitir edição de prontuário/documentação fora das permissões configuradas da rotina.
- Não usar `staff.department` como autorização.
- Não confundir setor assistencial/físico com setor organizacional de acesso.
- Não abrir fluxo financeiro automático a partir do handoff sem ação explícita e permissão adequada.
