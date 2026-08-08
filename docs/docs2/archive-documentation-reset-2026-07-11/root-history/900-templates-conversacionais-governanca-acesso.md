# 900 - Templates Conversacionais de Governança de Acesso

Data: 2026-05-01
Status: diretriz de linguagem e configuração
Origem: revalidação Vetus read-only de RH e decisão `899`.

## 1. Objetivo

Criar uma linguagem comum para conversar sobre acesso sem transformar nomes humanos em regra fixa do sistema.

Os nomes habituais como recepção, clínica, financeiro, estoque, laboratório, administração ou coordenação podem ser usados como **templates conversacionais** e **modelos iniciais editáveis**.

Eles não são autorização hardcoded.

A autorização real continua sendo:

- usuário;
- grupo de acesso;
- setor organizacional;
- rotina;
- permissão;
- efeito `Herdar`, `Conceder` ou `Negar`.

## 2. Revalidação Vetus

Observação direta read-only feita em 2026-05-01 na sessão autenticada do Vetus:

- URL inicial confirmada: `https://erp-beta.vetus.com.br/inicio`;
- sem Cloudflare;
- sem tela de login;
- sem criação, edição, exclusão, importação, exportação, download, confirmação, baixa ou envio;
- sem cópia de dados pessoais, listas de usuários, contatos, valores, clientes ou animais.

Estrutura de RH confirmada no menu:

1. `RH > Usuários > Usuários`;
2. `RH > Usuários > Grupos de Acesso`;
3. `RH > Comissões > Cálculo de Comissões`;
4. `RH > Cadastros > Profissionais`;
5. `RH > Cadastros > Regras de Comissão`;
6. `RH > Cadastros > Folgas`;
7. `RH > Cadastros > Profissões`.

Rotas estruturais observadas:

- `Sistema/Usuarios/Usuarios.htm`;
- `Sistema/Usuarios/GruposDeAcesso.htm`;
- `Sistema/Comissoes/CalculoDeComissoes.htm`;
- `cadastro/profissionais`;
- `Sistema/Comissoes/RegrasDeComissao.htm`;
- `Sistema/Agenda/Folgas.htm`;
- `Sistema/Cadastros/Profissoes.htm`.

## 3. Vocabulário Canônico

Use estes termos quando a conversa precisar virar documentação, teste ou implementação:

| Termo | Significado |
| --- | --- |
| Usuário | Identidade autenticável: login, senha, status, sessão e vínculo opcional com profissional. |
| Profissional | Identidade operacional/assistencial usada em agenda, assinaturas, receitas, relatórios, prontuários, comissões e folgas. |
| Grupo de acesso | Pacote editável de permissões para facilitar configuração e onboarding. |
| Setor organizacional | Agrupamento organizacional que pode herdar permissões, sem substituir permissões diretas do usuário. |
| Rotina | Área funcional protegida, como agenda, comanda, billing, prontuário, estoque ou relatórios. |
| Permissão | Capacidade técnica exigida pela rotina, como ler, criar, alterar, excluir ou gerenciar. |
| Grant | Decisão de acesso aplicada a usuário, grupo ou setor: `Herdar`, `Conceder` ou `Negar`. |
| Template conversacional | Nome humano para facilitar a conversa. Não concede permissão sozinho. |

## 4. Regra de Tradução

Quando a conversa usar um nome humano, traduzir para a matriz antes de implementar.

Exemplos:

| Conversa | Tradução correta |
| --- | --- |
| "Recepção altera agenda" | Um grupo/setor/usuário recebeu a permissão da rotina de agenda. |
| "Clínica lança comanda" | Um grupo/setor/usuário recebeu a permissão da rotina de comanda. |
| "Financeiro fecha cobrança" | Um grupo/setor/usuário recebeu a permissão da rotina de cobrança/billing. |
| "Pode escrever prontuário" | Um grupo/setor/usuário recebeu a permissão da rotina de prontuário/documentação. |
| "Não pode fazer isso" | Existe ausência de permissão efetiva ou grant `Negar` na rotina. |

Nunca implementar a frase humana diretamente como regra.

## 5. Modelo de Template

Todo template conversacional deve seguir esta forma:

```text
Nome de conversa:
Tipo: template conversacional / grupo pré-configurado editável / setor organizacional
Objetivo operacional:
Rotinas candidatas:
Permissões sugeridas:
Permissões não incluídas por padrão:
Observações:
```

Campos importantes:

- `Nome de conversa` ajuda o time humano a se entender.
- `Rotinas candidatas` indica onde o template costuma atuar.
- `Permissões sugeridas` é ponto de partida, não regra fixa.
- `Permissões não incluídas por padrão` evita ambiguidade.
- qualquer conta pode criar novo grupo ou editar grupo existente.

## 6. Templates Iniciais de Conversa

Estes templates são apenas aliases para discussão e configuração inicial. Todos devem ser editáveis.

### Recepção

Tipo: template conversacional / possível grupo pré-configurado editável.

Objetivo operacional: entrada, agenda, cadastro, direcionamento e continuidade administrativa.

Rotinas candidatas:

- agenda;
- tutores/clientes;
- pacientes/animais;
- fila/esteira;
- atendimento em leitura ou transição operacional;
- comanda e cobrança somente se a matriz conceder.

Observação: o nome "Recepção" não concede acesso sozinho.

### Clínica

Tipo: template conversacional / possível grupo pré-configurado editável.

Objetivo operacional: atendimento assistencial, prontuário, conduta, prescrição e documentação.

Rotinas candidatas:

- atendimento;
- prontuário;
- prescrições;
- exames;
- anexos;
- internação/cirurgia quando aplicável;
- comanda somente se a matriz conceder.

Observação: o nome "Clínica" não concede acesso sozinho.

### Finalização Operacional

Tipo: template conversacional / possível grupo pré-configurado editável.

Objetivo operacional: conferência de pendências, comanda, cobrança, documentos e encerramento administrativo.

Rotinas candidatas:

- comanda;
- billing/cobrança;
- fiscal quando aplicável;
- relatórios operacionais;
- atendimento em leitura ou transição operacional.

Observação: não cria cobrança, baixa ou fechamento automático sem ação explícita e permissão.

### Governança

Tipo: template conversacional / possível grupo pré-configurado editável.

Objetivo operacional: usuários, grupos, setores, permissões, auditoria e segurança.

Rotinas candidatas:

- usuários;
- grupos de acesso;
- setores organizacionais;
- permissões;
- auditoria;
- configurações de segurança.

Observação: deve ser tratado como rotina sensível e auditável.

### Estoque

Tipo: template conversacional / possível grupo pré-configurado editável.

Objetivo operacional: produtos, saldos, lotes, movimentações e conferência de entrada.

Rotinas candidatas:

- produtos;
- estoque;
- lotes;
- entrada de nota;
- movimentações;
- relatórios de estoque.

### Laboratório/Diagnóstico

Tipo: template conversacional / possível grupo pré-configurado editável.

Objetivo operacional: exames, laudos, resultados, equipamentos e referências.

Rotinas candidatas:

- solicitações de exame;
- coleta;
- resultado;
- laudo;
- cadastros laboratoriais.

## 7. Guardrails

- Template não é permissão.
- Nome de cargo, profissão, setor ou grupo não deve ser usado como `if` de autorização.
- O fluxo operacional pode sugerir próximo passo, mas não libera ação.
- A UI deve exibir permissões efetivas quando a decisão depender de acesso.
- Grupos pré-configurados devem ser editáveis.
- A operação deve poder criar novos grupos de acesso.
- `Negar` direto no usuário deve prevalecer sobre herança quando essa for a regra da matriz.

## 8. Validações concluídas

Status em 2026-05-01: `RH-VAL-1` executado no `cvg-his-v2`.

Validação concluída:

- grupo pré-configurado editável;
- novo grupo de acesso criado pela operação;
- vínculo de usuário a grupo e setor;
- grants `Herdar`, `Conceder` e `Negar`;
- permissão efetiva calculada por rotina;
- bloqueio de endpoint protegido quando a permissão efetiva não existe;
- rejeição de escrita cross-account em vínculos, grants e atualização de grupo.

Status em 2026-05-01: `HOFF-GOV-1` executado no `cvg-his-v2`.

Alinhamento concluído:

- `891`, `892`, `893` e `894` usam templates conversacionais/operacionais para falar de clínica, recepção, financeiro, caixa, gestor e coordenação;
- autorização do handoff foi documentada como permissão técnica configurável, não como nome fixo de setor, cargo, grupo ou profissão;
- próxima expansão de inbox/pós-atendimento deve validar permissão efetiva no `/access-control`.

Status em 2026-05-01: `HOFF-001` e `HOFF-002` executados no `cvg-his-v2`.

Fechamento concluído:

- pré-handoff é contexto visual/operacional;
- `HOFF-MIN-1` é handoff mínimo persistido com envio para recepção e ACK;
- handoff completo continua futuro e bloqueado;
- `clinicalStatus`, `operationalStatus`, `billingStatus` e `handoffStatus` são dimensões separadas;
- `pronto_para_recepcao` não é status clínico e, por enquanto, é leitura derivada de `handoffStatus = sent_to_reception`.

Status em 2026-05-01: `HOFF-003` e `HOFF-004` executados no `cvg-his-v2`.

Fechamento concluído:

- handoff completo será entidade própria `ClinicalHandoff`;
- `Encounter`, `Queue` e eventos auditáveis são integrações, não substitutos da entidade;
- recepção/finalização operacional é checkpoint padrão antes de financeiro;
- financeiro direto não está aprovado para a próxima fatia.

Status em 2026-05-01: `HOFF-005` e `HOFF-006` executados no `cvg-his-v2`.

Fechamento concluído:

- próxima fatia usa `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- transições aprovadas: ACK, marcar pendência, resolver pendência, devolver à clínica, reenviar à recepção e enviar ao financeiro;
- conclusão, cancelamento, billing completo, decisão do tutor e rascunho clínico completo ficam fora da próxima fatia.

Status em 2026-05-01: `HOFF-008` e `HOFF-009` executados no `cvg-his-v2`.

Fechamento concluído:

- bloqueios definidos para conta, permissão efetiva, estado válido, auditoria e automação indevida;
- pendências críticas definidas: `clinical`, `documentation`, `billing_origin`, `owner_guidance`, `diagnostic`, `operational_owner` e `accountability`;
- pendência crítica aberta bloqueia envio ao financeiro e conclusão futura.

Próximo passo lógico:

- `HOFF-011` e `HOFF-012` foram detalhados no checkpoint seguinte.

Status em 2026-05-01: `HOFF-011` e `HOFF-012` executados no `cvg-his-v2`.

Fechamento concluído:

- recepção/finalização recebe via `sent_to_reception`, confirma ACK e confere contexto operacional antes de avançar;
- conferência inclui resumo, tutor, paciente, documentos, prescrições, exames, retornos, serviços, origem financeira e pendências;
- pendências exigem tipo, motivo, dono e criticidade;
- financeiro só recebe `sent_to_finance` quando houver conferência operacional, origem financeira rastreável e nenhuma pendência crítica aberta;
- `sent_to_finance` não cria cobrança, comanda, pagamento, baixa, parcela, nota ou `in_billing`;
- cobrança e comanda continuam nas rotinas próprias, por ação explícita e permissão efetiva.

Próximo passo lógico:

- `HOFF-021` e `HOFF-022` foram fechados no checkpoint seguinte.

Status em 2026-05-01: `HOFF-021` e `HOFF-022` executados no `cvg-his-v2`.

Fechamento concluído:

- endpoints candidatos aprovados: `mark-pending`, `resolve-pending`, `return-to-clinic` e `send-to-finance`;
- payloads aprovados sem autorização nominal por setor, cargo, grupo ou profissão;
- pendência é endereçável por `pendingId`;
- devolução clínica exige motivo e destino;
- envio ao financeiro exige conferência operacional e origem financeira rastreável;
- nenhuma ação cria cobrança, comanda, pagamento, baixa, parcela, nota ou `in_billing`.

Próximo passo lógico:

- `HOFF-023` foi fechado no checkpoint seguinte.

Status em 2026-05-01: `HOFF-023` executado no `cvg-his-v2`.

Fechamento concluído:

- eventos auditáveis aprovados: envio/ACK, pendência marcada, pendência resolvida, devolução clínica e envio ao financeiro;
- payload mínimo inclui conta, handoff, atendimento, ator, permissão efetiva, estado anterior, novo estado, data/hora, motivo quando aplicável e `pendingId` quando aplicável;
- eventos são append-only e não substituem entidade ativa ou pendência estruturada;
- eventos não carregam prontuário completo, cobrança completa, valor sensível ou dados pessoais desnecessários.

Próximo passo lógico:

- `HOFF-013` e `HOFF-016` foram fechados no checkpoint seguinte.

Status em 2026-05-01: `HOFF-013` e `HOFF-016` executados no `cvg-his-v2`.

Fechamento concluído:

- inbox da próxima fatia aprovada para trabalho ativo de recepção/finalização e acompanhamento financeiro;
- filtros visuais aprovados: status/grupo, criticidade, tipo de pendência, responsável atual, prioridade, atraso, origem e busca operacional;
- campos mínimos aprovados: identidade, estado, contexto clínico-operacional, pendências, financeiro contextual e ações;
- estados vazios e sem permissão definidos;
- permissões continuam vindo do `/access-control`, sem regra por nome humano.

Próximo passo lógico:

- `HOFF-014` e `HOFF-015` foram fechados no checkpoint seguinte.

Status em 2026-05-01: `HOFF-014` e `HOFF-015` executados no `cvg-his-v2`.

Fechamento concluído:

- resumo mínimo aprovado para envio/reenvio sem virar prontuário completo;
- pendências devem ser declaradas explicitamente;
- origem financeira deve ter status operacional;
- devolução clínica exige tipo controlado, motivo e destino;
- devolução não concede permissão de editar prontuário, prescrição, laudo ou relatório pela recepção;
- pendência puramente financeira não deve ser devolvida para clínica.

Próximo passo lógico:

- `HOFF-024` foi fechado no checkpoint seguinte.

Status em 2026-05-01: `HOFF-024` executado no `cvg-his-v2`.

Fechamento concluído:

- filtros de listagem da inbox/API aprovados como roteamento operacional e consulta, não autorização;
- filtros visuais mapeados para `handoffStatus`, `inboxGroup`, `criticality`, `pendingType`, `pendingStatus`, responsável atual, prioridade, atraso, origem e busca;
- filtros técnicos também cobrem tutor, paciente, atendimento, Queue, datas, origem financeira, paginação e ordenação;
- permissão de leitura e isolamento por conta continuam obrigatórios;
- limiares de SLA/atraso foram encaminhados para `HOFF-017`.

Próximo passo lógico:

- `HOFF-017` foi fechado no checkpoint seguinte.

Status em 2026-05-02: `HOFF-017` executado no `cvg-his-v2`.

Fechamento concluído:

- SLA/alerta de atraso aprovado como camada derivada da inbox/listagem;
- buckets aprovados: `normal`, `attention` e `overdue`;
- limiares candidatos definidos por grupo operacional, mas devem ser configuráveis futuramente;
- atraso não concede permissão, não muda `handoffStatus`, não bloqueia sozinho e não dispara automação;
- nomes como recepção, clínica e financeiro continuam templates de conversa, não regra de autorização.

Próximo passo lógico:

- `HOFF-018` foi fechado no checkpoint seguinte.

Status em 2026-05-02: `HOFF-018` executado no `cvg-his-v2`.

Fechamento concluído:

- finalização operacional futura aprovada como `completed`, sem fechar prontuário, Encounter, Queue, Billing ou comanda;
- critérios obrigatórios: ACK, conferência operacional, permissão efetiva, ausência de pendência crítica, origem financeira tratada e auditoria;
- pendência residual precisa ser não bloqueante, justificada e com dono;
- conclusão não cria cobrança, baixa, pagamento, nota, exame, prescrição, documento ou edição clínica;
- permissões continuam técnicas/configuráveis, sem regra por nome humano.

Próximo passo lógico:

- `HOFF-019` foi fechado no checkpoint seguinte.

Status em 2026-05-02: `HOFF-019` executado no `cvg-his-v2`.

Fechamento concluído:

- checklist operacional aprovado para validar handoff por papel, transição, bloqueio, permissão e auditoria;
- critérios cobrem clínica, recepção/finalização, financeiro, coordenação e governança;
- cada item deve registrar `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`;
- P0/P1 bloqueiam BUILD;
- nomes humanos seguem como templates conversacionais, não regra de autorização.

Próximo passo lógico:

- `HOFF-020` foi fechado no checkpoint seguinte.

Status em 2026-05-02: `HOFF-020` executado no `cvg-his-v2`.

Fechamento concluído:

- `ClinicalHandoff` confirmado como entidade base do fluxo;
- schema futuro aprovado em três camadas: handoff, pendências e eventos;
- pendências estruturadas sustentam bloqueios e roteamento, não autorização;
- eventos sustentam auditoria, não substituem a entidade ativa;
- migration futura deve respeitar `accountId`, RLS, idempotência e governança configurável.

Próximo passo lógico:

- `HOFF-025` foi fechado no checkpoint seguinte.

Status em 2026-05-02: `HOFF-025` executado no `cvg-his-v2`.

Fechamento concluído:

- Queue permanece como esteira operacional com state machine própria;
- handoff aparece para a Queue como leitura/overlay derivado, não como novo estado persistido;
- `ClinicalHandoff` continua fonte do `handoffStatus`;
- ações de Queue não criam ACK, pendência, devolução, envio financeiro, cobrança ou comanda;
- ações de handoff não concluem, cancelam, reabrem ou movem Queue automaticamente;
- divergências viram alerta ou pendência operacional.

Próximo passo lógico:

- `HOFF-026` foi fechado no checkpoint seguinte.

Status em 2026-05-02: `HOFF-026` executado no `cvg-his-v2`.

Fechamento concluído:

- Encounter é âncora contextual obrigatória do handoff;
- handoff aparece no Encounter como leitura derivada, não como novo status persistido;
- `ClinicalHandoff` continua fonte do `handoffStatus`;
- envio/reenvio exige Encounter válido, da mesma conta e não fechado;
- `closeEncounter` não conclui, cancela, devolve, envia ao financeiro, cobra ou cria comanda;
- completar handoff futuramente não fecha Encounter automaticamente;
- divergências viram alerta ou pendência operacional.

Próximo passo lógico:

- `HOFF-027` foi fechado no checkpoint seguinte.

Status em 2026-05-02: `HOFF-027` executado no `cvg-his-v2`.

Fechamento concluído:

- `sent_to_finance` é encaminhamento operacional, não cobrança automática;
- handoff não cria Billing, comanda, recebível, pagamento, baixa, parcela, nota ou movimento de caixa;
- rotinas financeiras/comerciais continuam separadas e dependem de permissão própria;
- falta de origem financeira vira pendência `billing_origin`;
- risco de duplicidade financeira vira bloqueio ou justificativa auditável.

Item executado no checkpoint seguinte:

- `HOFF-028`, permissões técnicas.

Status em 2026-05-02: `HOFF-028` executado no `cvg-his-v2`.

Fechamento concluído:

- permissões técnicas do handoff aprovadas como códigos configuráveis em `/access-control`;
- templates como clínica, recepção, financeiro, caixa e coordenação continuam linguagem de conversa e implantação, não regra fixa;
- matriz aprovada inclui leitura, escrita/preparo, envio, ACK, pendência, resolução, devolução, envio ao financeiro, conclusão futura e cancelamento futuro;
- `clinical_handoff.reopen` não entra na próxima fatia;
- permissões de handoff não liberam Billing, CounterSales, prontuário, agenda, documentos, relatórios, caixa, pagamentos ou auditoria global;
- não houve código, endpoint novo, migration, alteração de catálogo, automação financeira, inbox completa, `completed` ou `cancelled`.

Item executado no checkpoint seguinte:

- `HOFF-029`, migration futura.

Status em 2026-05-02: `HOFF-029` executado no `cvg-his-v2`.

Fechamento concluído:

- migration futura aprovada como plano documental, sem criar SQL;
- a `0045_clinical_handoffs` permanece baseline mínimo;
- próxima migration deve ser aditiva, compatível e protegida por RLS;
- pendências e eventos devem ser tabelas próprias com `accountId`, vínculos explícitos e índices;
- backfill não cria autorização, pendência, evento clínico completo, cobrança, comanda, conclusão ou cancelamento;
- não houve código, endpoint novo, migration aplicada, alteração de catálogo, inbox completa ou automação financeira.

Item executado no checkpoint seguinte:

- `HOFF-030`, plano de testes unitários da state machine/service.

Status em 2026-05-02: `HOFF-030` executado no `cvg-his-v2`.

Fechamento concluído:

- plano de unitários do service/state machine aprovado;
- regressões do `HOFF-MIN-1` preservadas;
- ações futuras de pendência, resolução, devolução, reenvio e envio ao financeiro ganharam recorte unitário;
- bloqueios e ausência de side effects ficaram obrigatórios nos testes;
- API/HTTP/permissões por endpoint ficam para `HOFF-031`;
- matriz completa de transições fica para `HOFF-032`;
- não houve código, endpoint novo, migration, inbox completa, automação financeira ou BUILD.

Item executado no checkpoint seguinte:

- `HOFF-031`, plano de testes de API, rotas, contratos de erro e permissões por endpoint.

Status em 2026-05-02: `HOFF-031` executado no `cvg-his-v2`.

Fechamento concluído:

- plano de testes de API/HTTP aprovado;
- rotas mínimas e rotas futuras foram separadas;
- testes devem cobrir autenticação, permissão, conta, payload, erro, auditoria e ausência de side effects;
- permissões futuras usam `clinical_handoff.*`, sem autorização por nome de template;
- não houve código, endpoint novo, migration, inbox completa, automação financeira ou BUILD.

Item executado no checkpoint seguinte:

- `HOFF-032`, matriz de transições válidas e inválidas da state machine.

Status em 2026-05-02: `HOFF-032` executado no `cvg-his-v2`.

Fechamento concluído:

- matriz de transições válidas e inválidas aprovada;
- ACK, pendência, resolução, devolução clínica, reenvio e envio ao financeiro ficaram como caminhos testáveis;
- financeiro sem ACK, `in_billing`, `completed`, `cancelled`, `reopen` e rascunho completo seguem bloqueados;
- matriz valida fluxo e não concede autorização nominal;
- não houve código, endpoint novo, migration, inbox completa, automação financeira ou BUILD.

Item executado no checkpoint seguinte:

- `HOFF-033`, validação UX por papel antes de BUILD.

Status em 2026-05-02: `HOFF-033` executado no `cvg-his-v2`.

Fechamento concluído:

- templates de conversa foram usados para estruturar o walkthrough UX, sem virar autorização;
- clínica, recepção, financeiro e coordenação têm cenários próprios de caminho feliz, sem permissão, dados incompletos, estado vazio, erro e atraso;
- recepção não edita prontuário pela inbox e financeiro não recebe cobrança/comanda automática;
- cada cenário deve registrar permissão efetiva, tela/rota, CTA, evidência e resultado `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`;
- não houve código, endpoint novo, migration, inbox completa, automação financeira ou BUILD.

Próximo passo lógico:

- item executado no checkpoint seguinte: `HOFF-034`, smoke visual da inbox/Encounter/Queue quando aplicável.

Status em 2026-05-02: `HOFF-034` executado no `cvg-his-v2`.

Fechamento concluído:

- smoke visual aprovado para inbox, Encounter e Queue quando aplicáveis;
- templates de conversa não alteram autorização visual; ações continuam dependentes de permissão efetiva;
- evidência deve registrar rota, viewport, massa de dados, permissão, estado visual, CTA e resultado;
- validação deve cobrir desktop, largura intermediária, mobile, estados vazios, erro, sem permissão, dados incompletos, atraso e itens ativos;
- não houve código, endpoint novo, migration, inbox completa, automação financeira ou BUILD.

Próximo passo lógico:

- item executado no checkpoint seguinte: `HOFF-035`, auditoria/eventos da próxima fatia.

Status em 2026-05-02: `HOFF-035` executado no `cvg-his-v2`.

Fechamento concluído:

- eventos auditáveis foram definidos como trilha append-only, não como autorização por template;
- cada evento registra ator, permissão efetiva e correlação sem expor conteúdo sensível;
- ações recusadas não viram evento operacional de handoff;
- leitura por Encounter/Queue/inbox pode resumir eventos, mas não substitui a fonte auditável;
- não houve código, endpoint novo, migration, event store, inbox completa, automação financeira ou BUILD.

Próximo passo lógico:

- item executado no checkpoint seguinte: `HOFF-036`, rollback e mitigação.

Status em 2026-05-02: `HOFF-036` executado no `cvg-his-v2`.

Fechamento concluído:

- rollback aprovado como desativação controlada da fatia nova;
- templates de conversa não participam do rollback como autorização;
- envio, listagem/detalhe, ACK e auditoria mínima do `HOFF-MIN-1` devem permanecer;
- estados novos devem ficar legíveis e auditáveis mesmo quando ações novas forem desligadas;
- não houve código, endpoint novo, migration, feature flag real, inbox completa, automação financeira ou BUILD.

Próximo passo lógico e final desta fase:

- item executado no checkpoint seguinte: `HOFF-037`, validação com operação antes de BUILD.

Status em 2026-05-02: `HOFF-037` executado no `cvg-his-v2`.

Fechamento concluído:

- fase de planejamento pré-BUILD encerrada;
- templates seguem como linguagem operacional, não autorização;
- pacote HOFF-001 a HOFF-037 está fechado;
- BUILD continua dependente de autorização explícita;
- não criar `HOFF-038` sem nova decisão explícita.

Decisão pendente fora desta fase:

- autorizar BUILD da primeira fatia pequena;
- pausar a frente;
- reabrir item específico por bloqueio real.

Arquivos técnicos:

- `apps/api/src/routes/access-control-routes.ts`;
- `apps/api/src/routes/access-control-audit-events.test.ts`.

Verificação:

- `pnpm exec tsx --test apps/api/src/routes/access-control-audit-events.test.ts`;
- `pnpm --filter @cvg-his-v2/module-access-control test`;
- `pnpm --filter @cvg-his-v2/api typecheck`;
- `pnpm --filter @cvg-his-v2/api build && node --test apps/api/dist/routes/access-control-audit-events.test.js`.
