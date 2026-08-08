# Auditoria de produto, UX e paridade Vetus

**Data:** 2026-07-11
**Escopo:** documentação, aplicação em execução, código, testes e benchmark de mercado
**Veredito:** o CVG-HIS V4 ainda não entrega uma jornada equivalente ao Vetus
**Nota global atual:** **46/100**

## 1. Resumo executivo

O produto possui uma base funcional ampla, porém os módulos não formam uma operação clínica contínua. O principal problema não é ausência de telas: é a ruptura entre cadastro, episódio clínico, prontuário, internação, exames, comanda e recebimento.

A simulação pedida pelo usuário reproduziu o defeito central:

1. a lista de Animais exibe dois pacientes e oferece `Abrir atendimento`;
2. ambos chegam a `/encounters/new` com paciente e tutor preenchidos;
3. a tela classifica os identificadores como legados;
4. o botão principal fica desabilitado;
5. não existe ação de migração ou correção no próprio fluxo.

Portanto, o caminho mais básico `animal cadastrado -> atendimento -> prontuário` está **bloqueado no estado demonstrado**. O produto também apresenta prontuários encerrados editáveis, internação sem admissão pelo SPA/API, exames com transições simuladas e duas fontes financeiras independentes para comanda e cobrança.

### Notas de topo

| Item | Nota | Situação |
|---|---:|---|
| Produto integrado | **46/100** | Parcial, com rupturas P0 |
| Jornada clínica principal | **49/100** | Estrutura visível, conclusão não confiável |
| Maturidade das provas automatizadas | **54/100** | Núcleo útil, sem prova até recebimento |
| Paridade funcional comprovada com Vetus | **0/100** | 0 de 11 domínios verificados |
| Cobertura estrutural do gate documental | **85/100** | Mede presença de camadas, não paridade |
| UX e consistência operacional | **41/100** | Excesso de conteúdo e comandos concorrentes |
| Governança documental antes desta revisão | **26/100** | Fontes conflitantes e scores obsoletos |
| Governança documental após esta revisão | **78/100** | Índice e precedência corrigidos; conteúdo técnico ainda requer revisão |

Não é tecnicamente correto garantir equivalência com o Vetus neste momento. A garantia só pode ser emitida quando os critérios de aceite da seção 11 passarem em ambiente persistente.

## 2. Método e régua

A nota global combina:

- completude funcional: 30%;
- continuidade do fluxo e facilidade de uso: 25%;
- persistência e integração entre módulos: 20%;
- testes e evidência executável: 15%;
- segurança, auditoria e operação: 10%.

Faixas usadas:

| Faixa | Interpretação |
|---|---|
| 0-39 | insuficiente ou bloqueado |
| 40-59 | parcial, risco alto |
| 60-79 | utilizável em piloto controlado |
| 80-89 | candidato a homologação |
| 90-99 | produção comprovada |
| 100 | paridade integral homologada |

Limites contra nota inflada:

- presença de arquivo, rota ou screenshot sem comportamento: máximo 10;
- teste unitário com serviços totalmente mockados: máximo 25;
- E2E somente em memória: máximo 45;
- etapa obrigatória com `skip`: máximo 59;
- fallback silencioso, dado hardcoded ou ação principal bloqueada: domínio não pode ser aprovado.

## 3. Benchmark atualizado

O Vetus continua sendo a referência de escopo brasileiro: divulga agenda até pagamento, prontuário integrado, comandas, estoque, laboratório, esteira de exames, internação com mapa de medicamentos, financeiro, fiscal e multiunidade. Fonte: [Vetus - funcionalidades e planos](https://vetus.com.br/new/).

O benchmark não deve copiar apenas telas. Os melhores produtos conectam o trabalho por paciente:

- [SimplesVet](https://simples.vet/clinica-veterinaria/): referência brasileira de linguagem simples, prontuário, agenda, vacinas, internação, estoque, PDV e comunicação.
- [Digitail](https://digitail.com/?hsLang=en): referência principal para jornada centrada no paciente, flowboard em tempo real e ações clínicas a partir de uma mesma superfície.
- [ezyVet](https://www.ezyvet.com/features): referência para templates clínicos, agenda configurável, captura automática de cobrança, estoque por lote/validade e integrações.
- [Covetrus Pulse](https://covetrus.com/covetrus-platform/workflow-and-productivity-tools/covetrus-pulse/): referência para treatment board, tarefas vencidas, formulários integrados ao prontuário e ecossistema de integrações.
- [NuvemVet](https://www.nuvemvet.com/): referência brasileira de escopo enxuto e compreensível para clínica e pet shop, com atendimento, exames, receita, vacinas, caixa, estoque, fiscal e internação.

### Adequação como referência para o CVG-HIS

Estas notas medem utilidade como benchmark, não qualidade absoluta do concorrente.

| Produto | Adequação | O que adotar |
|---|---:|---|
| Vetus | **100/100** | Escopo brasileiro, comanda, fiscal, hospital e continuidade agenda-pagamento |
| Digitail | **96/100** | Linha do tempo do paciente, flowboard e trabalho clínico em uma tela |
| ezyVet | **92/100** | Ações clínicas gerando cobrança e estoque automaticamente |
| Covetrus Pulse | **90/100** | Coordenação visual, tarefas, formulários e integrações |
| SimplesVet | **89/100** | Simplicidade para recepção, caixa e comunicação brasileira |
| NuvemVet | **76/100** | Clareza e baixo atrito para operações menores |

### Princípios de produto derivados

1. O paciente é o contexto persistente; módulos não devem obrigar nova busca.
2. Uma ação clínica gera seus efeitos financeiros, de estoque e auditoria de forma atômica.
3. A recepção enxerga chegada, situação e próxima ação; o veterinário enxerga história, episódio e pendências.
4. Cada etapa tem um comando primário e comandos secundários discretos.
5. Instruções longas pertencem à ajuda contextual, não à superfície diária.
6. Status internos devem virar verbos operacionais: `Chamar`, `Iniciar triagem`, `Internar`, `Liberar`, `Receber`.

## 4. Jornada clínica atual

| Etapa | Nota | Evidência e problema principal |
|---|---:|---|
| Cadastrar e identificar animal | **68/100** | Vínculo com tutor existe, mas tutor é escolhido duas vezes e há campos/instruções em excesso |
| Localizar animal e abrir atendimento | **32/100** | Boa estrutura de busca; pacientes demonstrados são bloqueados como IDs legados |
| Cockpit do atendimento | **66/100** | Contexto preservado e passos visíveis; falta admissão e há linguagem de máquina |
| Cockpit longitudinal do animal | **61/100** | Cobertura ampla; hierarquia carregada e atendimento encerrado pode virar contexto atual |
| Prontuário | **55/100** | Sequência clínica existe; conteúdo duplicado e episódio fechado continua editável |
| Receita | **46/100** | Contexto parcial; formulário reaproveita receita anterior e favorece duplicação |
| Exames | **38/100** | Pedido existe; coleta, resultado e assinatura são colapsados/simulados |
| Internação | **18/100** | Não há admissão ponta a ponta na SPA/API |
| Comanda e cobrança | **37/100** | Dois ledgers; comanda descarta vínculo com paciente e atendimento |
| Fechamento e handoff | **35/100** | Não bloqueia pendências clínicas, financeiras, internação ou confirmação de handoff |

**Média ponderada da jornada:** **49/100**.

## 5. Achados P0 no código

### 5.1 Abertura bloqueada por identificador

`EncounterFormPage.vue` desabilita o botão quando paciente ou tutor usa prefixos tratados como legados. A lista, entretanto, apresenta esses registros como ativos e oferece o CTA. É uma promessa de interface que o backend/identidade não consegue cumprir.

Correção requerida: migrar identificadores para IDs canônicos, manter mapeamento Vetus separado e oferecer correção transacional para registros ainda não migrados.

### 5.2 Episódio encerrado reutilizado

`PatientDetailPage.vue` seleciona o atendimento ativo mais recente ou, na ausência dele, o último de qualquer status. Assim, ações como adicionar anamnese, receita, exame ou comanda podem apontar para episódio encerrado.

Correção requerida: separar explicitamente `activeEncounter` de `lastEncounter`; um episódio encerrado é somente leitura até reabertura autorizada e auditada.

### 5.3 Prontuário encerrado editável

A interface continua exibindo ações de escrita e o serviço aceita novas entradas sem validar o estado do atendimento.

Correção requerida: invariantes no domínio e na API, não apenas botões desabilitados. Reabertura exige papel, justificativa, versão e audit log.

### 5.4 Internação sem admissão

O domínio possui `admit`, mas a SPA não expõe chamada e a rota não oferece o POST correspondente. A interface só gerencia internações que já existam.

Correção requerida: admissão ligada ao atendimento, leito, responsável, plano inicial, comanda e estoque.

### 5.5 Comanda e billing separados

O fluxo de comanda salva tutor e observação, mas perde `patientId` e `encounterId`. O financeiro do atendimento lê outro serviço. Um pagamento na comanda não quita necessariamente o atendimento.

Correção requerida: um ledger canônico por atendimento/comanda, com itens, pagamentos, estornos e efeitos de estoque transacionais.

### 5.6 Exames simulados

Uma mesma ação avança `requested -> collected -> resulted` e utiliza IDs fixos para coletor/assinante. Anexo pede nome, MIME e checksum em vez de upload real.

Correção requerida: estados separados, identidade real, arquivo binário seguro, laudo assinado, entrega e trilha de auditoria.

## 6. Notas por módulo funcional

| Módulo | Nota | Estado |
|---|---:|---|
| Tutor, paciente e cadastros | **58/100** | CRUD útil; migração e vínculos canônicos incompletos |
| Agenda e agendamento | **67/100** | Fluxo básico provado; faltam concorrência, recorrência e no-show completo |
| Check-in, esteira e handoff | **61/100** | Caminho básico existe; faltam SLA, múltiplos setores e colisões |
| Atendimento e prontuário | **73/100** | Melhor núcleo; integridade pós-fechamento ainda falha |
| Receita, execução e alta | **65/100** | API parcial; UX, documento e autorização incompletos |
| Comanda, billing e recebimento | **49/100** | Provas parciais e fontes financeiras divergentes |
| Estoque e consumo clínico | **47/100** | Baixa simples; lote, validade e atomicidade incompletos |
| Laboratório e exames | **43/100** | Testes com `skip`; esteira e laudo incompletos |
| Internação | **41/100** | Persistência parcial; admissão e mapa terapêutico bloqueados |
| Preventivo e vacinas | **31/100** | Predomínio de mocks, sem ciclo completo |
| Compras, NF e transferências | **46/100** | Cobertura fragmentada |
| Financeiro, caixa, cartão e PIX | **40/100** | Simulações e ações inativas ainda presentes |
| Fiscal e NFS-e | **34/100** | Sem provider homologado e cenários de rejeição completos |
| RH, folgas e comissões | **34/100** | Regras e fechamento insuficientemente provados |
| Relatórios e entregas agendadas | **39/100** | Páginas/mock maiores que a prova operacional |
| Marketing e comunicação | **25/100** | Sem ciclo de consentimento, envio e retry comprovado |
| Integrações, webhooks e importação | **42/100** | Webhook mais forte; importação e conectores frágeis |
| Acesso, auditoria e LGPD | **33/100** | RLS/tenant não garantidos ponta a ponta |

## 7. UX, design e arquitetura da informação

| Item | Nota | Diagnóstico |
|---|---:|---|
| Arquitetura da informação | **38/100** | Navegação expõe muitos módulos e decisões antes da tarefa |
| Clareza da próxima ação | **34/100** | CTAs concorrentes e ações que terminam bloqueadas |
| Consistência visual | **42/100** | Cabeçalhos, breadcrumbs, alertas, emojis, raios e gradientes variam |
| Terminologia | **36/100** | Animal/paciente, cliente/tutor e comanda/billing/cobrança alternam sem contrato |
| Densidade cognitiva | **30/100** | Resumos, boas práticas e módulos repetidos aumentam varredura |
| Feedback e tratamento de erro | **40/100** | Mistura componentes do design system, `alert()` e bloqueios sem resolução |
| Acessibilidade operacional | **44/100** | Estrutura semântica parcial; diálogos nativos e excesso de ícones prejudicam |
| Manutenibilidade da UI | **30/100** | Quatro páginas centrais somam cerca de 10,4 mil linhas |

### Fluxo alvo para o veterinário

`Esteira ou busca -> abrir paciente -> iniciar atendimento -> registrar SOAP/anamnese -> solicitar ou prescrever -> decidir alta/internação -> revisar pendências -> enviar para recebimento`.

Na tela clínica:

- rail compacto: identidade, tutor, alertas, alergias e status;
- centro: episódio atual e editor clínico;
- lateral ou drawer: pendências, pedidos, prescrições e comanda;
- timeline longitudinal sob demanda;
- um CTA primário contextual por estado;
- módulos históricos recolhidos, sem repetir o mesmo conteúdo.

## 8. Qualidade da prova

O gate atual retorna cobertura de evidência `85/100`, mas `0/11` domínios verificados. Essa aparente contradição ocorre porque o primeiro número mede presença de arquivos/camadas.

| Área de prova | Nota |
|---|---:|
| Identidade, tenant e RBAC | **32/100** |
| Tutor e paciente | **58/100** |
| Agenda | **67/100** |
| Check-in e handoff | **61/100** |
| Prontuário e auditoria | **73/100** |
| Receita e alta | **65/100** |
| Comanda e recebimento | **49/100** |
| Estoque | **47/100** |
| Laboratório | **43/100** |
| Internação | **41/100** |
| Preventivo | **31/100** |

**Maturidade ponderada da prova clínica:** **54/100**.

Há 14 `skip` condicionais nos E2E inventariados. O script `test:e2e` também não representa toda a coleção de specs. Testes de páginas com serviços integralmente mockados são válidos como testes de apresentação, mas não comprovam operação.

## 9. Reorganização documental executada

Antes da revisão:

- 151 arquivos soltos na raiz de `docs/`;
- 549 arquivos em `docs/docs2/`, incluindo 65 artefatos soltos ou em governança antiga;
- índices apontando para arquivos inexistentes;
- múltiplos documentos de “score final” entre 85 e 96/100 conflitantes com a aplicação.

Alterações:

- raiz ativa reduzida de 151 para 18 arquivos antes da inclusão deste relatório;
- 133 documentos antigos da raiz arquivados;
- 65 artefatos soltos/legados de `docs2` consolidados;
- 32 documentos da antiga trilha `Enterprise` arquivados;
- 119 relatórios de `construcoes-futuras` arquivados;
- `docs/README.md`, `430-fonte-de-verdade-documental.md` e `docs/docs2/README.md` reconstruídos;
- nenhum documento apagado.

O manifesto está em `docs/docs2/archive-documentation-reset-2026-07-11/README.md`.

## 10. Roadmap de correção

### P0 - restaurar a jornada básica (0-30 dias)

1. Migrar IDs e desbloquear atendimento para todos os animais exibidos.
2. Impedir escrita em atendimento encerrado e implementar reabertura auditada.
3. Unificar comanda, billing, pagamentos e vínculo com atendimento/paciente.
4. Criar admissão de internação ponta a ponta.
5. Transformar fechamento em checklist transacional de pendências.
6. Criar dois E2E P0 sem atalhos por API: agendado e avulso.
7. Redesenhar Animais e Novo Atendimento para uma ação primária clara.

### P1 - tornar o trabalho clínico natural (31-60 dias)

1. Dividir cockpit longitudinal e episódio atual.
2. Consolidar prontuário em SOAP/anamnese, pedidos, receita e plano.
3. Corrigir receita para não reaproveitar conteúdo nem atendimento encerrado.
4. Implementar esteira real de exames, upload e assinatura.
5. Padronizar cabeçalhos, alertas, terminologia e navegação SPA.
6. Reduzir as quatro páginas gigantes por domínio e jornada.

### P2 - fechar paridade operacional (61-120 dias)

1. Estoque por lote/validade, compra XML, consumo, devolução e transferência.
2. Caixa, múltiplos pagamentos, estorno, conciliação e fiscal homologado.
3. Mapa terapêutico 24h, administração, farmácia, diária e alta.
4. Preventivo, comunicação consentida e lembretes idempotentes.
5. Relatórios operacionais/financeiros com worker e entrega comprovada.
6. Migração Vetus idempotente com reconciliação de contagens e saldos.

## 11. Critérios de aceite para nota 90+

1. Dois E2E partem de login real e terminam em comanda recebida/fechada, com Postgres real, `retries=0` e zero `skip`.
2. Cadastro, agenda, fila, atendimento, prontuário, handoff, comanda e recebimento sobrevivem a restart e são conferidos em UI, API e banco.
3. A mesma chave de idempotência não duplica comanda, pagamento, estoque ou financeiro.
4. Falha injetada entre comanda, estoque e financeiro reverte todos os efeitos.
5. Dois tenants executam o mesmo cenário sem leitura ou escrita cruzada e sem role `BYPASSRLS`.
6. Internação prova disputa de leito, prescrição, aprazamento, administração, consumo, diária, ocorrência e alta.
7. Exames provam pedido, coleta, análise, laudo, assinatura, entrega e recoleta.
8. Fechamento rejeita pendência clínica, internação ativa, handoff incompleto ou divergência financeira.
9. Um usuário de recepção abre atendimento de animal já cadastrado em até duas ações primárias, sem ajuda e sem bloqueio.
10. Teste moderado com recepção, veterinário e caixa atinge ao menos 90% de conclusão sem assistência nos fluxos P0.
11. Máquinas de estado P0 têm 100% das transições válidas e inválidas testadas e cobertura global mínima de 80%.
12. Vinte execuções consecutivas do gate P0 passam sem flake, retry ou skip.

## 12. Decisão recomendada

Suspender a expansão horizontal de módulos até a jornada principal atingir pelo menos 80/100 e os bloqueadores P0 serem eliminados. A prioridade deve ser integrar e simplificar o que já existe.

O alvo de produto deve combinar:

- **Vetus** para escopo brasileiro e operação comercial/hospitalar;
- **Digitail** para jornada centrada no paciente;
- **ezyVet** para efeitos automáticos entre clínica, estoque e cobrança;
- **SimplesVet** para clareza de uso na recepção e no caixa;
- **Covetrus Pulse** para coordenação visual, tarefas e integrações.

Somente depois dos critérios da seção 11 deve o projeto declarar paridade ou prontidão enterprise.

## 13. Fontes e evidências

### Fontes oficiais externas, consultadas em 2026-07-11

- [Vetus](https://vetus.com.br/new/)
- [SimplesVet](https://simples.vet/clinica-veterinaria/)
- [Digitail](https://digitail.com/?hsLang=en)
- [ezyVet](https://www.ezyvet.com/features)
- [Covetrus Pulse](https://covetrus.com/covetrus-platform/workflow-and-productivity-tools/covetrus-pulse/)
- [NuvemVet](https://www.nuvemvet.com/)

### Evidências locais principais

- `apps/spa/src/pages/patients/PatientsListPage.vue`
- `apps/spa/src/pages/encounters/EncounterFormPage.vue`
- `apps/spa/src/pages/patients/PatientDetailPage.vue`
- `apps/spa/src/pages/encounters/EncounterDetailPage.vue`
- `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue`
- `apps/spa/src/pages/clinical/PrescriptionsPage.vue`
- `apps/spa/src/pages/clinical/DiagnosticsPage.vue`
- `apps/spa/src/pages/inpatient/InpatientListPage.vue`
- `apps/spa/src/pages/sales/CounterSalesPage.vue`
- `packages/modules/medical-records/src/index.ts`
- `packages/modules/encounters/src/index.ts`
- `packages/modules/counter-sales/src/index.ts`
- `packages/modules/financial/src/index.ts`
- `tests/e2e/`
- `scripts/lib/vetus-parity-audit.mjs`
- `2026-07-10-auditoria-paridade-funcional-vetus.md`
