# Relatorio de equivalencia Vetus x CVG-HIS - atendimento, prontuario e receituario

Data: 2026-06-01  
Escopo: comparar o ERP CVG-HIS implementado com as evidencias em `docs/vetus`, focando fluxo de atendimento, prontuario e receituario.  
Leitura central: o CVG-HIS tem boa cobertura estrutural, mas ainda nao transmite integralmente a "cara Vetus" porque parte da experiencia esta distribuida em satelites e parte do fluxo ainda e inferida, nao modelada como estado operacional explicito.

## 1. Veredito executivo

O sistema atual nao esta vazio nem distante do Vetus em termos de modulos. O gate `pnpm vetus:parity`, reexecutado nesta revisao, retornou `91/100`, sem area abaixo da meta `88/100`.

Mesmo assim, a percepcao do usuario de que "ainda nao consigo ver o ERP CVG-HIS com a cara do Vetus" e tecnicamente defensavel. O motivo e que a equivalencia automatica mede presenca de superficies, arquivos, rotas e testes, enquanto o Vetus observado em `docs/vetus` e mais forte em tres aspectos de experiencia:

- ficha do animal como cockpit principal e primeiro lugar natural do trabalho clinico;
- esteira como controle operacional de setor, responsavel, urgencia, atendimento e comanda;
- receituario como card/acao longitudinal do animal, com acoes diretas de ver, imprimir, editar, salvar e incluir.

Nota focada nesta revisao:

| Area | Equivalencia funcional | Equivalencia de experiencia Vetus | Leitura |
| --- | ---: | ---: | --- |
| Fluxo de atendimento | 82/100 | 70/100 | Existe recepcao, agenda, esteira, atendimento e handoff minimo, mas o estado operacional ainda e parcialmente inferido. |
| Prontuario | 86/100 | 76/100 | Existe ficha clinica estruturada e cockpit animal, mas o prontuario longitudinal ainda disputa protagonismo entre paciente, atendimento e prontuario. |
| Receituario | 78/100 | 62/100 | Existe API, tela de prescricoes e execucao, mas faltam acoes Vetus-like diretas e formato de receita imprimivel/editavel no card do animal. |

Conclusao curta: **o CVG-HIS esta funcionalmente proximo em atendimento/prontuario, mas visual e operacionalmente ainda nao esta equivalente ao Vetus no receituario e na esteira completa.**

## 2. Fontes Vetus usadas

Principais documentos da pasta `docs/vetus`:

- `docs/vetus/guides/20-anexo-atendimento.md`
- `docs/vetus/guides/2026-04-24-relatorio-esteira-de-atendimento.md`
- `docs/vetus/guides/2026-04-24-relatorio-cockpit-clinico-detalhe-animal.md`
- `docs/vetus/guides/2026-04-27-relatorio-prontuario-cliente-animal-autorizados.md`

Pontos Vetus confirmados nessas fontes:

- Atendimento inclui agenda, comandas, cadastros, pacotes, vendas, esteira, esteira de exames, orcamentos, vacinas e resgate.
- Esteira de Atendimento tem filtros `Setor Atual`, `Profissional Responsavel`, `Cliente`, `ID Animal`, `Todas` e grade com setor, recebido em, enviado por, cliente, animal, responsavel ativo, atendimento, urgencia e comanda.
- Detalhe do animal e cockpit clinico longitudinal, com identidade do animal, tutor, risco clinico, ultimos atendimentos, anamneses, vacinas/vermifugos, agenda, exames, internacao, receituario, peso, imagens e historico clinico.
- Receituario no Vetus aparece no contexto do animal/prontuario com acoes como `Ver Receita`, `Imprimir`, `Editar`, `Salvar`, `Ver mais Receitas` e `Incluir Nova Receita`.

## 3. Evidencias do CVG-HIS atual

### 3.1 Fluxo de atendimento

Evidencias implementadas:

- `apps/spa/src/pages/reception/ReceptionGatewayPage.vue` implementa mesa de recepcao, busca tutor/paciente, funil operacional e atalhos para agenda, esteira, paciente, tutor, atendimento e comanda.
- `apps/spa/src/pages/scheduling/QueuePage.vue` implementa `Esteira de Atendimento`, com filtros de setor, responsavel, cliente, ID animal e `Todas`; tambem mostra situacao operacional, recebido em, origem, cliente, animal, responsavel, proximo passo, prioridade, cobranca/comanda e acoes.
- `packages/modules/scheduling/src/index.ts` implementa estados de fila `waiting`, `called`, `in_triage`, `in_care`, `observation`, `completed`, `cancelled`, com transicoes controladas.
- `packages/modules/encounters/src/index.ts` implementa atendimento com estados `reception`, `in_triage`, `in_care`, `observation`, `closed`.
- `apps/api/src/server.ts` sincroniza atendimento e fila via `attachEncounter`, `transitionQueueForEncounter` e `syncQueueWithEncounter`.

Equivalencias com Vetus:

| Vetus | CVG-HIS atual | Status |
| --- | --- | --- |
| Busca operacional por tutor/paciente | Recepcao com busca contextual e acoes rapidas | Forte |
| Esteira com setor/responsavel/cliente/animal | Filtros e tabela existem na QueuePage | Forte na UI |
| Urgencia/prioridade | Prioridade existe e aparece na esteira | Forte |
| Atendimento e prontuario a partir da esteira | Acoes `Abrir atendimento` e `Prontuario` existem | Forte |
| Comanda ligada ao fluxo | Links para cobranca e comanda existem | Parcial, porque Billing e CounterSales continuam superficies separadas |
| Setor atual/responsavel como estado persistido | A UI infere setor/responsavel a partir do status e contexto | Parcial |
| Historico formal de transferencias setoriais | Ha timeline/handoff minimo, mas nao um historico de esteira equivalente ao bloco Vetus | Parcial |

Lacuna principal: o Vetus trata a esteira como verdade operacional de movimentacao por setor/responsavel. No CVG-HIS, a tela imita bem a grade, mas `currentSector`, `currentResponsible`, `operationalStatus` e historico de encaminhamento ainda nao aparecem como campos centrais persistidos da fila/atendimento. Isso reduz a sensacao de esteira hospitalar real.

### 3.2 Prontuario

Evidencias implementadas:

- `apps/spa/src/pages/patients/PatientDetailPage.vue` implementa `Detalhes do Animal`, cockpit 360, timeline 360, ficha do animal, dados criticos, tutor, cards colapsaveis e modulos do animal.
- A ficha do animal exibe doenca cronica, alergia, temperamento, sexo, nascimento, especie, raca, porte, castrado, chip, pedigree, cor, ID legado Vetus, situacao, peso e data de cadastro.
- O detalhe do animal tem cards para ultimos atendimentos, anamneses, vacinas/vermifugos, agenda, comanda, exames, internacao, receituario, grafico de peso, imagens e historico clinico.
- `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue` implementa prontuario estruturado por queixa principal, anamnese, exame fisico, sinais vitais, exames, avaliacao, plano, prescricao, conduta e observacoes.
- O mesmo prontuario tambem traz blocos Vetus-like secundarios: ultimos atendimentos, anamneses, vacinas, agenda, exames, internacao, receituario, peso, imagens, cobranca e historico clinico.
- `packages/modules/medical-records/src/index.ts` garante prontuario por atendimento, entradas clinicas, timeline e revisoes.

Equivalencias com Vetus:

| Vetus | CVG-HIS atual | Status |
| --- | --- | --- |
| Animal como cockpit clinico | `PatientDetailPage` tem layout Vetus-like e cards do animal | Forte |
| Identidade + tutor + risco clinico | Campos criticos e vinculo com tutor existem | Forte |
| Cards colapsaveis do animal | Cards colapsaveis existem | Forte |
| Historico clinico longitudinal | Existe card e timeline 360, mas escrita depende de atendimento focal | Parcial |
| Anamnese como card proprio | Existe card e acao para anamnese | Forte |
| Exames, internacao, imagens, peso | Existem cards e atalhos | Medio/Forte |
| Prontuario por atendimento | Existe ficha estruturada robusta | Forte |
| Prontuario longitudinal do animal como fonte primaria | Ainda dividido entre `PatientDetailPage` e `MedicalRecordsDetailPage` | Parcial |

Lacuna principal: o Vetus parece fazer o usuario sentir que o detalhe do animal e o prontuario longitudinal central. No CVG-HIS, ha duas experiencias fortes, mas separadas: `Detalhes do Animal` como cockpit e `Prontuario clinico` como ficha estruturada do atendimento. Isso e funcionalmente bom, mas dilui a sensacao de "uma ficha Vetus" quando o usuario espera trabalhar sempre a partir do animal.

### 3.3 Receituario

Evidencias implementadas:

- `apps/spa/src/pages/patients/PatientDetailPage.vue` tem card `Receituario`, lista receitas do animal e oferece `Incluir Nova Receita`.
- `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue` tem secao `Prescricao / receituario` e card Vetus-like `Receituario`.
- `apps/spa/src/pages/clinical/PrescriptionsPage.vue` tem tela dedicada de prescricoes, contexto do atendimento, formulario de nova prescricao e lista de prescricoes do atendimento.
- `apps/spa/src/pages/clinical/PrescriptionExecutionsPage.vue` tem tela dedicada para execucoes, com administrar, suspender, retomar e registrar evento.
- `apps/spa/src/services/prescriptions.ts` cria receitas via `/prescriptions`, garantindo `medicalRecordId` a partir do prontuario do atendimento.
- `apps/api/src/routes/prescription-routes.ts` lista por atendimento ou paciente.
- `packages/modules/prescriptions/src/index.ts` modela prescricao como entrada clinica `entryType = prescription`, com medicamento, posologia, via e frequencia.

Equivalencias com Vetus:

| Vetus | CVG-HIS atual | Status |
| --- | --- | --- |
| Card de receituario no animal | Existe | Forte |
| Incluir nova receita a partir do animal | Existe atalho, mas abre superficie dedicada | Medio |
| Receita vinculada a animal, atendimento e prontuario | Existe via `patientId`, `encounterId`, `medicalRecordId` | Forte |
| Listar receitas do animal | Existe `listByPatient` | Forte |
| Ver receita | Nao ha acao explicita no card; ha lista/resumo | Parcial |
| Imprimir receita | Nao identificado como acao de receituario | Ausente/Fraco |
| Editar/salvar receita no fluxo Vetus | Modulo de dominio tem update/archive, mas UI focada mostra criar/listar e execucao | Parcial |
| Execucao/adminstracao de prescricao | Existe modulo mais avancado que Vetus observado no card | Forte funcional, diferente de experiencia |

Lacuna principal: o receituario e funcionalmente presente, mas nao tem ainda o mesmo comportamento perceptivel do Vetus no cockpit do animal. No Vetus, a receita parece uma entidade documental direta: ver, imprimir, editar, salvar e incluir. No CVG-HIS, ela aparece como entrada clinica e como tela satelite de prescricao/execucao. Isso e tecnicamente defensavel, mas menos "Vetus-like".

## 4. Por que o usuario ainda nao ve "a cara do Vetus"

Ha quatro causas principais:

1. **O gate de paridade e estrutural.** Ele prova que existem paginas, rotas e testes; nao prova que o usuario sente a mesma jornada.
2. **O fluxo clinico esta distribuido.** Animal, atendimento, prontuario, prescricao, execucao, comanda e billing estao conectados, mas ainda parecem telas diferentes, nao um cockpit continuo.
3. **A esteira tem boa UI, mas modelo operacional incompleto.** Setor/responsavel aparecem, porem parte e derivada; o Vetus preserva a ideia de transferencia e historico de esteira com mais naturalidade.
4. **Receituario nao esta documental o suficiente.** Falta a experiencia de receita como documento clicavel/imprimivel/editavel dentro do card do animal.

## 5. Prioridades recomendadas

### P0 - Fazer a esteira virar fonte operacional explicita

Adicionar ou consolidar no modelo persistido:

- `currentSector`;
- `currentResponsibleUserId` ou `currentResponsibleStaffId`;
- `nextSector`;
- `operationalStatus`;
- historico de transferencias com `fromSector`, `toSector`, `sentBy`, `receivedAt`, `urgency`, `encounterId`, `billingId/counterSaleId`.

Impacto: aumenta muito a equivalencia com a Esteira Vetus.

### P0 - Transformar receituario em documento operacional no card do animal

No card `Receituario` do `PatientDetailPage`, adicionar acoes por receita:

- `Ver Receita`;
- `Imprimir`;
- `Editar`;
- `Arquivar/Cancelar` com motivo;
- `Incluir Nova Receita` em modal/drawer contextual, sem obrigar o usuario a sentir que saiu do animal.

Impacto: fecha a lacuna mais visivel apontada pelo usuario.

### P1 - Unificar o protagonismo do prontuario longitudinal

Fazer o detalhe do animal ser a porta principal:

- manter ficha Vetus-like no topo;
- cards colapsados por padrao;
- abrir anamnese, exame fisico, plano, conduta e receita em drawer contextual;
- gravar tudo como entradas do prontuario, mas sem quebrar o contexto visual do animal.

Impacto: melhora a sensacao de cockpit Vetus e reduz navegação fragmentada.

### P1 - Criar historico de esteira visivel no atendimento/comanda

Adicionar no atendimento e/ou comanda:

- historico de setor;
- enviado por;
- recebido em;
- responsavel atual;
- urgencia;
- acao de encaminhar para outro setor.

Impacto: aproxima a rotina `Encaminhar Esteira` e `Historico de Esteira` observada no Vetus.

### P2 - Polimento visual e nomenclatura

Padronizar labels e breadcrumbs para bater com o Vetus onde isso ajuda a operacao:

- `Cliente` para tutor em superficies Vetus-like, mantendo `Tutor` onde a linguagem clinica do CVG-HIS for superior;
- `Animal` em vez de `Paciente` nas telas de atendimento Vetus-like;
- `Comanda` como primeira linguagem operacional, com `Billing/Cobranca` como detalhe financeiro.

Impacto: aumenta reconhecimento imediato para usuarios vindos do Vetus.

## 6. Checklist de aceite para dizer "agora esta com cara de Vetus"

O sistema deve permitir esta jornada sem parecer que o usuario saiu do cockpit:

1. Abrir `Detalhes do Animal`.
2. Ver tutor, risco clinico, ultimos atendimentos, agenda, comanda, exames, internacao, receituario, peso, imagens e historico.
3. Clicar `Incluir Nova Receita` no card do animal.
4. Salvar receita.
5. Ver a receita aparecer imediatamente no mesmo card.
6. Abrir `Ver Receita`.
7. Imprimir.
8. Editar e salvar nova versao com auditoria.
9. Abrir Esteira.
10. Ver o mesmo animal com setor atual, responsavel, urgencia, atendimento e comanda.
11. Encaminhar o caso para outro setor e ver o historico de transferencia no atendimento/comanda.
12. Abrir prontuario e visualizar a narrativa longitudinal sem perder o contexto do animal.

## 7. Conclusao

O CVG-HIS ja implementou grande parte das pecas certas. A lacuna atual nao e "falta tudo"; e uma lacuna de **composicao operacional**.

Para atendimento e prontuario, a base esta em bom estado e precisa de integracao mais centrada no animal. Para receituario, a base tecnica existe, mas a experiencia ainda precisa virar documento Vetus-like com acoes diretas no cockpit.

Se a proxima fase atacar apenas visual generico, a percepcao do usuario provavelmente nao muda. A maior mudanca perceptivel vira de tres entregas concretas:

1. receituario documental completo dentro do card do animal;
2. esteira com setor/responsavel/historico persistidos;
3. prontuario longitudinal operado por drawers/contexto a partir do detalhe do animal.
