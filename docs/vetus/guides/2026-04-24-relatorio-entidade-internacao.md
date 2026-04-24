# Relatório da Entidade Internação

Data-base da inspeção: 24 de abril de 2026

Escopo:

- análise específica do módulo `internação`;
- foco em estrutura operacional, animal internado, mapa de medicações, eventos clínicos, boxes e relação com `comanda`;
- inspeção somente leitura, sem registrar entrada, sem aplicar medicação e sem finalizar internação.

Evidências principais:

- [internacao-lista.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-21-08-764Z-internacao/screenshots/internacao-lista.png)
- [internacao-lista.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-21-08-764Z-internacao/internacao-lista.json)
- [internacao-lista.html](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-21-08-764Z-internacao/internacao-lista.html)
- [network.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-24T00-21-08-764Z-internacao/network.json)
- [01-PLANEJAMENTO-ERP-ENTERPRISE.md](/root/cvg-his-v2/docs/vetus/guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md:294)
- [03-MODELO-DADOS.md](/root/cvg-his-v2/docs/vetus/guides/03-MODELO-DADOS.md:573)
- [04-ESPECIFICACAO-APIS.md](/root/cvg-his-v2/docs/vetus/guides/04-ESPECIFICACAO-APIS.md:1133)
- [2026-04-23-relatorio-entidade-comanda.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-comanda.md)
- [2026-04-24-relatorio-entidade-vacinas-vermifugos.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-24-relatorio-entidade-vacinas-vermifugos.md)

Nota de segurança:

- a análise foi feita por UI, HTML, rede e documentação interna do projeto;
- não houve `entrada` de internação;
- não houve `aplicação` de medicamento;
- não houve `alta` ou finalização.

## 1. Síntese executiva

`Internação` apareceu nesta rodada como um dos módulos legados mais densos de operação clínica.

O que ficou confirmado diretamente:

- a rota `Internação` está ativa no legado;
- existe um bloco `Animais Internados`;
- existe um bloco `Mapa de Medicamentos`;
- havia ao menos um caso real visível de internação;
- a tela expõe ação explícita `Abrir a Comanda`;
- o HTML interno confirma eventos clínicos, medicamentos e aplicação por horário.

Leitura objetiva:

- `internação` é o ponto onde o ERP sobe da rotina ambulatorial para cuidado contínuo;
- ele combina estado clínico, monitorização, agenda terapêutica e vínculo financeiro/comercial;
- é o módulo em que o elo com `comanda` deixa de ser hipótese e aparece de forma explícita.

## 2. Arquitetura do módulo

Rota confirmada:

- `https://erp.vetus.com.br/Sistema/Internacao/Internacao.htm`

Fluxo de acesso confirmado:

- login no `erp-beta.vetus.com.br`;
- SSO para `erp.vetus.com.br`;
- operação efetiva no legado.

Tecnologia observada:

- formulários `POST` na mesma rota;
- recursos `javax.faces.resource`;
- múltiplos fluxos `PrimeFaces.ab(...)`;
- diálogos e painéis auxiliares para detalhes, eventos, medicamentos e aplicação.

Leitura:

- `internação` continua legado-operacional;
- o shell beta não substitui esse front na operação diária;
- a complexidade da tela é compatível com módulo clínico maduro e antigo.

## 3. Superfície principal da tela

A UI principal expôs estes blocos:

- `Animais Internados`
- `Mapa de Medicamentos`

Também apareceu um caso real visível:

- `Jessica Conceição da Silva`
- `Laion , PINSCHER`
- ação `Abrir a Comanda`

Leitura:

- a tela já entra em modo operacional, não em listagem administrativa vazia;
- `internação` é tratada como acompanhamento em andamento;
- o tutor e o animal aparecem juntos na superfície principal.

## 4. Estrutura funcional observada

Os cabeçalhos detectados mostram duas camadas muito claras.

Camada de mapa por hora:

- `Animal`
- horas `00` a `23`

Camada de detalhe/eventos:

- `Data/Hora`
- `Observação`
- `Peso`
- `Profissional`
- `Abrir`
- `Excluir`
- `Medicamento`
- `Status`
- `Via`
- `Quantidade`
- `Aplicar`

Leitura:

- o módulo organiza a internação tanto em visão temporal quanto em visão de evento;
- a grade horária serve como mapa de administração/rotina;
- a grade de eventos e medicamentos serve como detalhe executável.

## 5. Relação com comanda

Aqui a relação saiu do campo de hipótese e ficou confirmada por evidência direta.

Sinal confirmado:

- botão `Abrir a Comanda` visível na tela de internação.

A documentação interna também reforça isso:

- o planejamento do projeto prevê `Abertura de comanda vinculada` em [01-PLANEJAMENTO-ERP-ENTERPRISE.md](/root/cvg-his-v2/docs/vetus/guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md:301).
- a modelagem de `hospitalizations` prevê `command_id` em [03-MODELO-DADOS.md](/root/cvg-his-v2/docs/vetus/guides/03-MODELO-DADOS.md:587).

Leitura:

- a internação é assistencial, mas não isolada do fluxo econômico;
- a comanda funciona como reflexo transacional da permanência e do consumo;
- esse é um dos vínculos mais explícitos entre clínica contínua e faturamento dentro do ERP.

## 6. Boxes e ocupação

Mesmo sem abrir um cadastro de box específico nesta passada, a estrutura do módulo revelou o conceito com clareza.

Sinais confirmados:

- campo `formDialogs:internacaoBox_input`
- referência de menu a `Boxes de Internação`
- modelagem prevista de `hospitalization_boxes`

Leitura:

- a internação não é apenas lista de pacientes;
- ela se ancora em recurso físico alocável;
- o box é parte da entidade operacional, não só metadado periférico.

Isso aproxima o módulo de:

- capacidade física;
- disponibilidade;
- gestão de ocupação.

## 7. Eventos clínicos e monitorização

Essa foi a parte mais rica da inspeção.

O formulário interno `formDialogs` revelou campos para:

- `estado`
- `profissionalEvento`
- `peso`
- `temperatura`
- `frequenciaCardiaca`
- `frequenciaRespiratoria`
- `comportamento`
- `apetite`
- `dor`
- `pasPam`
- `glicemia`
- `pulsoArterial`
- `emese`
- `fezes`
- `mucosas`
- `observacao`

Leitura:

- a internação tem monitorização clínica estruturada;
- o módulo cobre sinais vitais, comportamento, apetite, dor e eliminação;
- não é só prescrição e medicação, mas também evolução de enfermagem/observação clínica.

Isso confirma uma entidade muito mais próxima de prontuário operacional do que de simples hospedagem do animal.

## 8. Estados e escalas clínicas

Os valores observados nos `selects` internos ajudam a entender a modelagem qualitativa.

Estados confirmados:

- `Não Definido`
- `Estável`
- `Grave`
- `Gravíssimo`

Comportamento:

- `Não definido`
- `Dócil`
- `Agressivo`
- `Inquieto`

Apetite:

- `Nenhum`
- `Reduzido`
- `Médio`
- `Bom`
- `Muito Bom`

Dor:

- `Sem Dor`
- `Pouca`
- `Média`
- `Muita Dor`

Também apareceram conjuntos estruturados para:

- `pulso arterial`
- `emese`
- `fezes`
- `mucosas`

Leitura:

- a internação usa taxonomia clínica padronizada;
- o preenchimento foi pensado para rotina de equipe, não só para texto livre;
- isso favorece repetição, leitura rápida e comparação longitudinal.

## 9. Mapa de medicamentos

A presença de `Mapa de Medicamentos` não foi só textual.

O HTML mostrou uma tabela específica de medicamentos com colunas:

- `Medicamento`
- `Status`
- `Via`
- `Quantidade`
- `Aplicar`

Estado observado na captura:

- tabela sem itens visíveis, com mensagem `Nenhum medicamento`.

Mesmo assim, a estrutura é suficiente para confirmar:

- existe agenda de medicação por paciente internado;
- cada item possui status, via e quantidade;
- a aplicação é uma ação operacional do módulo.

Leitura:

- o mapa funciona como plano terapêutico executável;
- a visão por hora `00..23` sugere distribuição temporal da terapêutica;
- a entidade `hospitalization_medications` prevista na modelagem fica muito coerente com a UI.

## 10. Aplicação de medicamento

O módulo possui fluxo dedicado para aplicar medicamento.

Campos confirmados:

- `formDialogs:profissionalAplicacao_input`
- `formDialogs:dataHoraAplicacao_input`
- `formDialogs:observacaoItemAplicacao`

Ação confirmada:

- botão `Aplicar`

Leitura:

- a aplicação não é só marcar checkbox;
- há rastreabilidade de quem aplicou, quando aplicou e com qual observação;
- isso aproxima o módulo de execução assistencial auditável.

## 11. Relação com animal, profissional e equipe

`Internação` é claramente centrada em `animal`, mas opera fortemente com equipe.

Sinais confirmados:

- o animal aparece no bloco de internados;
- há campo de `profissionalEvento`;
- há campo de `profissionalAplicacao`;
- os eventos e aplicações são registrados com profissional associado.

Leitura:

- o paciente é o centro clínico;
- a equipe é o vetor de execução;
- o tutor aparece na superfície, mas como contexto relacional e não como unidade de cuidado.

## 12. Relação com agenda, vacinas e demais módulos clínicos

### 12.1 Agenda

A UI não mostrou integração direta com o módulo geral `Agenda`, mas a lógica temporal é evidente:

- mapa por hora;
- `Data/Hora` em eventos;
- `Data/Hora Aplicação` em medicação.

Leitura:

- `internação` possui agenda interna própria;
- ela é mais clínica e contínua do que a agenda ambulatorial.

### 12.2 Vacinas e prevenção

A relação com `vacinas` não apareceu diretamente na UI desta passada.

Leitura:

- `vacinas` e `internação` pertencem a polos diferentes do cuidado;
- uma é recorrência preventiva;
- a outra é cuidado intensivo/contínuo.

### 12.3 Estoque e medicação

A presença de `medicamento`, `via`, `quantidade` e a modelagem com `stock_transaction_id` em `hospitalization_medications` sugerem uma ponte forte com estoque.

Importante:

- esse vínculo não foi percorrido por fluxo vivo nesta passada;
- ele deve ser tratado como inferência sustentada por modelagem e UI, não como integração de rede explicitamente observada.

## 13. Modelagem prevista do domínio

Os documentos internos reforçam a leitura observada na tela.

No planejamento:

- `Gestão de internação de animais`
- `Controle de boxes/enfermarias`
- `Mapa de internação visual`
- `Medicações e cuidados programados`
- `Eventos de internação (alimentação, medicação, curativo)`
- `Abertura de comanda vinculada`
- `Finalização de internação`

Na modelagem de dados:

- `hospitalizations`
- `hospitalization_boxes`
- `hospitalization_events`
- `hospitalization_medications`

Campos mais relevantes:

- `animal_id`
- `box_id`
- `professional_id`
- `reason`
- `admission_date`
- `expected_discharge_date`
- `discharge_date`
- `status`
- `command_id`

Leitura:

- a UI legado e a modelagem alvo estão muito alinhadas;
- a entidade tem profundidade suficiente para sustentar ocupação, monitorização, terapêutica e fechamento.

## 14. APIs previstas

Na especificação interna, a seção `16. INTERNAÇÃO` prevê:

- `GET /hospitalizations?status=active&animalId=`
- `POST /hospitalizations`
- `POST /hospitalizations/{id}/events`
- `GET /hospitalizations/{id}/events`
- `GET /hospitalization-boxes`
- `POST /hospitalization-boxes`
- `PUT /hospitalization-boxes/{id}`
- `POST /hospitalizations/{id}/discharge`

Leitura:

- a API planejada separa bem internação, eventos e boxes;
- o fechamento da internação é uma operação própria;
- isso combina com a leitura de módulo clínico de longa duração.

Importante:

- essas rotas vieram da documentação interna;
- não foram observadas como chamadas modernas nesta passada;
- portanto representam especificação-alvo, não backend novo confirmado em produção.

## 15. Limitações da inspeção

Esta passada teve limites claros:

- a UI carregou com um caso real visível, mas eu não abri seus detalhes para não correr risco de persistência incidental;
- os fluxos `Entrada`, `Eventos` e `Aplicar` foram confirmados por estrutura HTML, não executados;
- não houve inspeção separada do cadastro de `Boxes de Internação`;
- o vínculo com estoque e faturamento medicamentoso ficou sustentado por modelagem e UI, não por chamada de rede específica.

## 16. Conclusão

`Internação` é um módulo legado altamente operacional, com profundidade clínica e vínculo explícito com `comanda`.

O que ficou firme nesta rodada:

- há internações ativas visíveis em operação;
- existe mapa de medicamentos por hora;
- existem eventos clínicos estruturados;
- existe aplicação de medicamento com rastreabilidade;
- existe uso de box;
- existe abertura de comanda vinculada.

Conclusão objetiva:

- `internação` é o módulo que melhor fecha o eixo entre cuidado contínuo, equipe clínica, terapêutica e reflexo transacional;
- ele representa um nível de complexidade superior ao de `agenda`, `vacinas` e `comanda` isoladamente;
- dentro do ERP, é uma das entidades centrais para entender a operação hospitalar real.
