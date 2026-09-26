# PROD-027 — pacote de decisão e preparação sintético primeiro

**Situação:** proposta de preparação, sem autoridade formal e sem autorização de execução.  
**Identificador:** `PROD-027-DECISION-PACKET-DRAFT-2026-09-26-R2`.  
**Direção registrada pelo operador em 26/09/2026:** começar por evidência sintética; considerar Vetus somente após aprovação formal do dono do dataset.  
**Estado normativo do contrato:** `PROPOSED_PENDING_AUTHORITY`; gate de aceite `PENDING_AUTHORITY`.  
**Situação operacional:** aceite comportamental de PROD-027 permanece bloqueado até as decisões e evidências formais exigidas.

## Decisão recomendada

Adotar a sequência sintético-primeiro: começar por contratos e jornadas com dados inteiramente sintéticos, isolados e determinísticos; só depois considerar acesso a Vetus, com autorização formal do dono do dataset e das autoridades de privacidade aplicáveis. Essa ordem não dispensa o gate atual: o contrato lista dataset Vetus autorizado e lacunas explícitas como evidência requerida para o aceite final. Assim, sintéticos podem avançar primeiro, mas não fecham PROD-027 sob os bytes atuais. Uma fonte alternativa só pode substituir esse requisito após decisão versionada de Product/QA/domínio e alteração aprovada do contrato.

Esta sequência reduz exposição de dados e permite repetir testes sem depender de uma extração legada. Ela não demonstra equivalência Vetus, não homologa providers e não substitui PROD-003. A resposta do operador define a ordem de preparação; não aprova taxonomia, regras de domínio, fixtures, execução, uso de dados ou aceite de Product/QA.

## Limites vigentes

O contrato `docs/engineering/behavioral-parity-contract-prod-027.json` permanece a fonte de escopo. Neste momento:

- `fixtureExecutionAllowed=false`, `realDataAllowed=false`, `functionalAcceptanceAllowed=false`, `behavioralClaimsAllowed=false` e `provider=NONE`;
- as sete áreas bloqueadas continuam sem aceite comportamental;
- a divergência entre 45 módulos narrativos e 46 diretórios observados, incluindo `workflows`, ainda requer reconciliação;
- as seis decisões C1–C6 seguem pendentes;
- Product, QA e donos de domínio ainda precisam registrar decisões versionadas;
- Dependências de implementação registradas: `PROD-003`, `PROD-026`, `PROD-035` e `PROD-045`. Pré-requisitos do gate de aceite: `PROD-026`, `PROD-028`, `PROD-035` e `PROD-045`. São conjuntos diferentes; este pacote não declara nenhum deles satisfeito nem substituído.

Este pacote é planejamento técnico para revisão. Não contém fixtures, valores de referência, resultados esperados normativos, dados Vetus ou execução de harness. Não altera os flags, gates, status de áreas ou critérios do contrato.

## Avaliação das rotas

| Rota | Vantagem | Limite principal | Avaliação |
|---|---|---|---|
| Sintético primeiro | Isolamento, repetibilidade e menor exposição; permite exercitar regras e falhas sem depender da origem legada. | Não responde sozinho se a migração ou o comportamento coincide com Vetus e não satisfaz, por si só, a evidência de dataset requerida no gate final vigente. | Recomendada como primeira etapa, após aprovações de escopo e criação/execução sintéticas. O aceite final continua bloqueado até resolver o requisito Vetus do contrato. |
| Vetus primeiro | Pode esclarecer diferenças históricas e regras implícitas da fonte. | Bloqueada sem autorização do dataset; aumenta dependência de classificação, minimização, sanitização, retenção e controle de acesso. | Não iniciar agora. Reavaliar somente com autorização formal específica; o uso continua vedado antes dela. |
| Sintético e Vetus em paralelo | Pode reduzir o tempo de comparação quando ambas as trilhas estão aprovadas. | Duplica superfícies e confunde defeitos de regra com defeitos de dados enquanto o contrato e as autoridades seguem pendentes. | Não recomendada nesta fase. |

### Sequência escolhida e requisito do aceite final

A direção do operador decide **a ordem**: evidência sintética primeiro e Vetus somente após aprovação formal do dono do dataset. Ela não altera o gate do contrato. Hoje, `acceptanceGate.requiredEvidence` inclui “dataset Vetus autorizado e lacunas explícitas”; por isso, executar apenas a etapa sintética pode produzir evidência parcial, mas não autoriza `DONE` nem aceite integral. Se Product/QA/domínio quiserem aceitar uma fonte alternativa ou uma limitação sem Vetus, devem aprovar e versionar a mudança do gate, definir o oracle substituto e registrar a limitação. Até essa decisão, preservar o requisito atual e manter o aceite final bloqueado. A aprovação do dono do dataset e de Privacy/Security continua obrigatória antes de qualquer acesso ou uso de Vetus.

## Sequência proposta e gates

| Etapa | Trabalho | Saída exigida para avançar |
|---|---|---|
| 0 — Preparação atual | Fechar este pacote de decisão, esclarecer C1–C6, reconciliar 45→46 e indicar donos por área. Nenhum dado ou teste comportamental. | Decisões e escopo versionados por Product, QA e donos pertinentes; PROD-003 e dependências explicitamente tratados. |
| 1 — Contratos por área | Definir jornada, fronteiras públicas, invariantes, negativos, permissões, persistência e reconciliação aplicáveis; identificar concorrência, retry, restart e efeitos externos conforme risco. | Aprovação versionada do contrato por área e autorização explícita para criar fixtures. Uma autorização separada deve identificar candidato demonstrado, ambiente, fronteiras e providers permitidos antes de qualquer execução; então revisar flags e gates. |
| 2 — Fixtures sintéticas | Gerar dados artificiais com origem, versão, determinismo, propósito e limites documentados; conferir que não foram derivados de registros reais. | Revisão de QA e donos de domínio; validação de privacidade e isolamento; hashes e retenção definidos. |
| 3 — Execução sintética | Rodar jornadas em ambiente isolado nas fronteiras acordadas, com providers falsos ou sandbox expressamente autorizado. | Evidência reproduzível por versão de contrato e fixture; reconciliação, findings e crítica independente atual. |
| 4 — Evidência Vetus exigida pelo gate vigente, ou alternativa aprovada | Se autorizado, comparar apenas lacunas não resolvidas por contrato, documentação aprovada ou sintéticos, com dataset/campos mínimos e acesso controlado. | O gate atual exige dataset Vetus autorizado e lacunas explícitas antes do aceite integral. Qualquer substituição exige alteração versionada aprovada por Product/QA/domínio; acesso a Vetus exige ainda dono do dataset e Privacy/Security. |
| 5 — Aceite e reabertura | Avaliar cada área contra o contrato aprovado e registrar decisão, limitações e evidências. | Aceite individual dos responsáveis; mudanças de fonte, regra, fixture ou superfície reabrem somente os escopos afetados, conforme política aprovada. |

Etapas 1–5 não começam por silêncio ou por este documento. Cada mudança de autorização deve estar refletida no contrato e no gate correspondente antes da ação coberta.

## Portfólio sintético candidato para as sete áreas

Os itens abaixo são temas para Product, QA e donos de domínio transformarem em casos aprovados. Não especificam regras, valores, mensagens ou resultados esperados.

| Área bloqueada | Autoridade de domínio, além de Product e QA/release | Tema para futura fixture sintética | Fronteira que continua fechada |
|---|---|---|---|
| `laboratorio-diagnosticos` — Laboratório e diagnósticos | Responsável de laboratório; autoridade clínica para regra clínica | Pedido e resultado inteiramente artificiais; proveniência, unidade/faixa e rejeição são definidos pelo domínio. | Equipamentos, Live Lab e providers reais ficam fora até gate próprio; sem resultado clínico normativo nesta proposta. |
| `fiscal` — Fiscal | Dono fiscal competente | Documento e ciclo de emissão artificiais, com rejeição definida pelo responsável. | Sem certificado, emissão, credencial ou transmissão real; sandbox exige autorização separada. |
| `financeiro` — Financeiro, caixa, pagamentos, PIX e comercial | Dono de Financeiro; responsáveis por ledger/pagamentos conforme escopo | Lançamentos artificiais entre pagamento, estorno e conciliação; COM-001..COM-004 seguem tracks explícitos. | Sem cobrança, PIX, callback ou saldo de produção; precisão e arredondamento não são decididos aqui. |
| `marketing-comunicacao` — Marketing e comunicação | Dono de Marketing e responsável de privacidade | Consentimento/opt-out artificial, fila e entrega simulada, incluindo retry conforme risco. | Sem contatos reais, mensagem externa ou retenção normativa não aprovada. |
| `relatorios-entregas` — Relatórios e entregas agendadas | Dono de relatórios e owner da fonte de dados | Fonte determinística artificial para totais, filtros temporais, timezone, exportação e agendamento. | Sem destinatários, exportação ou entrega real; fórmulas e números esperados dependem do owner. |
| `acesso-lgpd` — Acesso, segurança, auditoria e LGPD | Segurança e DPO/privacidade | Usuários, tenants e papéis artificiais para acesso permitido/negado, auditoria e solicitação sintética. | Sem identidades, tokens ou titulares reais; Security/DPO define controles, escopo e retenção. |
| `integracoes-migracao` — Integrações e migração | Dono de dados/plataforma e owners dos sistemas envolvidos | Dataset artificial com duplicidade, replay, interrupção/retomada e reconciliação de contagens. | Sem Vetus ou cutover real; dono do dataset e Privacy/Security aprovam qualquer etapa Vetus em gate separado. |

Em todas as áreas, QA deve confirmar quais dimensões comuns do contrato se aplicam: positivo, negativo, permissão/tenant, persistência e reconciliação; concorrência, restart, retry/replay e recuperação entram quando o risco exigir. Os donos aprovam conteúdo e oráculos antes de qualquer execução.

Os temas são apenas planejamento de cobertura. A lista não cria fixture, regra clínica/fiscal/financeira, número esperado, contato, credencial, dado de paciente ou aprovação de provider. As sete áreas permanecem `BLOCKED` até decisão formal versionada e evidência funcional posterior.

## Registro de decisão requerido

Uma decisão válida precisa identificar o contrato e sua versão/hash, data, aprovadores e papéis, escopo coberto, opção escolhida, limitações, validade/revalidação e evidências. Recomendações do pacote não preenchem esses campos.

| Decisão | Alternativas já registradas no contrato | Donos necessários | Estado |
|---|---|---|---|
| C1 — Taxonomia das 11 áreas | Preservar agrupamentos; reagrupar por jornada; uma área por módulo. | Product + QA + domain owners | `PENDING_AUTHORITY` |
| C2 — Semântica de evidência | Separar manifesto e comportamento; `verified` somente comportamental; manter `verified` documental. | Product + QA | `PENDING_AUTHORITY` |
| C3 — Mínimo de cenários | Cinco dimensões e aplicáveis; positivo/negativo; tudo em todas as áreas. | QA + domain owners | `PENDING_AUTHORITY` |
| C4 — Classificação de módulos | Área primária com crosslinks; áreas primárias múltiplas; somente por jornada. | QA + arquitetura + domain owners | `PENDING_AUTHORITY` |
| C5 — Diferenças e desconhecidos Vetus | Manter `UNKNOWN/BLOCKED`; inferir da implementação; bloquear tudo sem oracle. | Product + domain owners | `PENDING_AUTHORITY` |
| C6 — Aprovação e reabertura | Versão + owner + reabertura por impacto; aprovação por data; matriz mutável única. | Product + QA + domain owners | `PENDING_AUTHORITY` |

A preferência sintético-primeiro deve ser anotada como decisão de sequência deste plano. Ela não escolhe C5 nem libera `realDataAllowed`.

Os papéis acima seguem o campo `choices[].owner` de cada decisão. O gate de aceite final lista separadamente `QA/release` em `acceptanceGate.requiredAuthorities`; preserve ambos os papéis nos respectivos registros, sem presumir que os rótulos sejam equivalentes. A autorização de uso de Vetus é um gate adicional: dono do dataset e Privacy/Security não substituem nem alteram o owner da decisão C5.

## Cartão para registrar cada decisão formal

Preencher um registro por C1–C6 e por autorização de escopo que exija decisão. Campos vazios não significam aprovação. O aceite de escopo não equivale à autorização de executar nem ao aceite final da área. Registrar o resultado no ledger formal de autoridade ou no sistema de governança aprovado e apontá-lo a partir do contrato versionado.

```yaml
decision_id: C1 | C2 | C3 | C4 | C5 | C6 | AREA-SCOPE
decision_type: CONTRACT_SCOPE | SYNTHETIC_FIXTURE_CREATION | SYNTHETIC_EXECUTION | AREA_ACCEPTANCE
status: PENDING_AUTHORITY
contract_id: PROD-027
contract_schema_version: 1
contract_sha256: 31326c43a97606b9376b1911ea045b1f111b5781c9de8c5bb111f56fbc086ce7
packet_revision: PROD-027-DECISION-PACKET-DRAFT-2026-09-26-R2
selected_option_or_scope:
affected_areas: []
scope_and_limitations:
approver_name_and_role: []
decision_date:
valid_until_or_review_date:
candidate_sha256: null
environment_and_data_class:
evidence_references: []
reopen_triggers: []
dataset_authorization_reference: null
```

Uma decisão `CONTRACT_SCOPE` pode aprovar taxonomia ou contrato sem liberar execução. Antes de criar ou executar fixtures, o registro deve identificar um candidato com identidade demonstrada, o ambiente autorizado e declarar explicitamente `SYNTHETIC_FIXTURE_CREATION` ou `SYNTHETIC_EXECUTION`; Product, QA/release e os owners competentes devem estar nomeados. `AREA_ACCEPTANCE` só pode ser registrada após a evidência aprovada e a reconciliação previstas no contrato. Qualquer uso de Vetus requer autorização específica do dono do dataset e Privacy/Security, referenciada no campo próprio. A aprovação geral de PROD-027 não basta.

## Parecer técnico não vinculante para C1–C6

As opções abaixo reproduzem as recomendações já presentes no contrato `schemaVersion=1`; este parecer não altera o contrato nem decide por Product, QA ou pelos domínios. A proposta está vinculada ao SHA-256 `31326c43a97606b9376b1911ea045b1f111b5781c9de8c5bb111f56fbc086ce7` de `docs/engineering/behavioral-parity-contract-prod-027.json`. Seu identificador documental é `PROD-027-DECISION-PACKET-DRAFT-2026-09-26-R2`; todas as decisões seguem `PENDING_AUTHORITY`.

| Decisão | Recomendação para deliberação | Por que esta opção reduz risco | O que fica pendente | Papéis que precisam decidir |
|---|---|---|---|---|
| C1 — Taxonomia | **C1-O1 — preservar os 11 grupos da auditoria.** | Conserva o crosswalk histórico 4/11 observado por manifesto e 7/11 bloqueado; mudanças futuras ficam rastreáveis. | A taxonomia só se torna canônica depois do crosswalk bidirecional e das assinaturas. | Product + QA + domain owners. |
| C2 — Semântica da evidência | **C2-O1 — separar manifesto de comportamento.** | Distingue diretório/contrato, execução runtime, reconciliação e aceite humano; reduz falso `PASS` funcional. | A nomenclatura e o efeito de cada estado precisam ser aprovados antes de alterar contadores ou gates. | Product + QA. |
| C3 — Mínimo de cenários | **C3-O1 — cinco dimensões comuns e dimensões adicionais aplicáveis ao risco.** | Mantém positivo, negativo, permissão, persistência e reconciliação; concorrência, restart, retry/replay, recuperação ou cutover entram quando o risco justificar. | QA e cada domínio precisam registrar aplicabilidade, exclusões justificadas e oráculos antes de criar cenários. | QA + domain owners. |
| C4 — Classificação de módulos | **C4-O1 — uma área primária contável por módulo, com crosslinks para jornadas transversais.** | Evita dupla contagem e preserva tracks comerciais e técnicos sem deixar pacote sem owner. | A classificação de cada módulo continua provisória; o delta `workflows` exige decisão própria descrita abaixo. | QA + arquitetura + domain owners. |
| C5 — Diferenças e desconhecidos Vetus | **C5-O1 — preservar `UNKNOWN/BLOCKED` até existir fonte, regra e autoridade.** | Impede que a implementação atual ou um sintético seja promovido a oracle histórico. | Sintéticos podem validar o contrato aprovado, mas não demonstram equivalência com Vetus nem resolvem lacunas de origem. | Product + domain owners. |
| C6 — Aprovação e reabertura | **C6-O1 — versionar contrato, owner e escopo; reabrir apenas áreas afetadas.** | Mantém histórico e invalida evidência cujo código, fonte, regra, fixture ou owner mudou. | Cada reabertura deve apontar a versão/hash anterior, a nova versão/hash, áreas afetadas e evidência a repetir. | Product + QA + domain owners. |

As alternativas do contrato continuam disponíveis. Se uma autoridade preferir outra opção, o registro deve explicar o impacto no crosswalk, nos estados, no custo de cobertura e nas evidências; não se deve editar a recomendação para parecer uma decisão já tomada.

## Reconciliação recomendada do delta 45→46

O contrato informa 45 módulos esperados na fonte narrativa e 46 diretórios observados; `packages/modules/workflows` aparece como `BASELINE_COUNT_DRIFT_PENDING`. A recomendação é **manter os dois números visíveis e `workflows` em `PENDING_AUTHORITY` até a reconciliação com a fonte**. O `primaryArea=integracoes-migracao` atual é provisório e não aprova classificação nem inclusão no denominador.

Product, QA/release, arquitetura e o dono de domínio/dados devem registrar qual hipótese se aplica, com evidência da fonte e efeito na contagem:

- Se `workflows` for um módulo de negócio ausente da narrativa, publicar uma nova versão da baseline com 46 e o crosswalk correspondente.
- Se for infraestrutura compartilhada fora do denominador de negócio, manter o diretório no inventário observado, documentar a regra de exclusão e preservar o vínculo com as jornadas que atende.
- Se houver renomeação, duplicidade ou mudança de fronteira, mapear o nome/path antigo ao atual e justificar a contagem sem apagar o histórico.

Até essa decisão, nenhum módulo é descartado, nenhuma contagem é silenciosamente corrigida e nenhum `45/46` funciona como prova comportamental.

## Autorização adicional para a trilha Vetus

Antes de qualquer acesso ou uso de dataset Vetus, anexar autorização específica que identifique: dono e origem do dataset; finalidade e áreas/casos cobertos; campos e volume mínimos; classificação e transformação permitida; pessoas e ambiente autorizados; controles de acesso e exportação; prazo de retenção e descarte; limitações de uso e aprovação de privacidade/segurança. O gate deve ser limitado ao dataset, versão, campos, finalidade e período aprovados. Uma aprovação genérica de PROD-027 não substitui essa autorização.

Esse gate de acesso é distinto da sequência sintética. O aceite final vigente também requer evidência de dataset Vetus autorizado e lacunas explícitas. Se a autorização não existir, a preparação sintética pode avançar após seus próprios gates, mas o aceite final permanece `BLOCKED`; somente uma alteração versionada e aprovada do contrato pode substituir esse requisito por outra fonte/oracle.

Se a autorização não existir ou deixar dúvida sobre origem, classificação, escopo ou descarte, a trilha permanece bloqueada e a avaliação segue somente com contratos e sintéticos aprovados. Sob o gate atual, essa avaliação não fecha o aceite integral de PROD-027.

## Critério de pronto para a próxima etapa

O trabalho pode sair da preparação contratual para **criação de fixtures sintéticas** somente quando o registro versionado resolver as decisões aplicáveis, nomear Product/QA/donos de domínio, reconciliar a contagem 45→46, vincular o candidato demonstrado e autorizar explicitamente o escopo de criação. A **execução** exige autorização própria para ambiente e fronteiras públicas; o **aceite da área** vem depois e precisa de evidência reproduzível. O gate vigente exige também dataset Vetus autorizado e lacunas explícitas antes do aceite integral; até haver autorização do dono do dataset, nenhum acesso é permitido e o aceite permanece bloqueado. Se a autoridade quiser aceitar outro oracle, a substituição deve ser formal e versionada no contrato antes da promoção. Até o primeiro gate, o próximo trabalho permitido é revisão deste pacote e coleta das decisões formais.

## Referências

- [Contrato comportamental PROD-027](behavioral-parity-contract-prod-027.json)
- [Matriz comportamental das 11 áreas](../027-matriz-comportamental-11-areas.md)
- [Gate de preparação contratual](../../.agent/gates/implementation-ready-prod-027-20260915.json)
- [Relatório preparatório R1](../../artifacts/state-of-art/PROD-027/attempt-20260915T154928Z-R1/REPORT.md)
