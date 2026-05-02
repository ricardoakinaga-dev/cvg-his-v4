# 890 - Plano de Validacao Operacional

Data: 2026-04-28
Status: rascunho para validacao
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/881-roadmap-ux-operacional.md`, `docs/882-backlog-ux-operacional.md`, `docs/883-auditoria-ui-atual-ux-operacional.md`

## 0. Guardrail

Este documento nao autoriza implementacao.

Ele nao executa testes de codigo, nao cria telas, nao altera componentes, nao define API e nao substitui plano tecnico de QA. Ele define como validar operacionalmente PRD, SPEC, auditoria e prototipos futuros.

BUILD so pode ocorrer depois de PRD/SPEC aprovado e autorizacao explicita do responsavel.

## 1. Objetivo

Definir como validar se a UX operacional realmente melhora o trabalho diario do hospital veterinario.

A validacao deve confirmar se recepcao, veterinario, financeiro, laboratorio/imagem e internacao conseguem operar por jornada, com Agenda como coluna dorsal temporal, `Queue` como esteira imediata e `Encounter` como unidade operacional.

## 2. Validacao por papel

| Papel | Validar |
| --- | --- |
| Recepcao | Entrada, busca, cadastro minimo, agendamento, envio para Queue, retorno da clinica, cobranca e pendencias |
| Veterinario | Pegar ficha, atendimento ativo, cockpit clinico, exames, prescricao, orcamento e devolucao |
| Financeiro | Origem da cobranca, itens, pagamentos, descontos, pendencias e fechamento |
| Laboratorio/imagem | Pedido, coleta/execucao, resultado/laudo, retorno e pendencias |
| Internacao | Admissao, leito, evolucao, prescricao/execucao, transferencia e alta |

## 3. Walkthrough operacional

Cada walkthrough deve registrar:

- papel executando;
- objetivo do fluxo;
- URL/tela inicial;
- passos executados;
- telas, modais ou drawers usados;
- quantidade aproximada de cliques;
- informacao critica visivel;
- CTA primaria observada;
- proximo passo exibido;
- bloqueios ou ambiguidades.

## 4. Checklist por jornada

### 4.1 Recepcao

- [ ] Busca ampla funciona conceitualmente no fluxo validado?
- [ ] Tipo de entrada esta claro?
- [ ] Prioridade esta clara?
- [ ] Responsavel atual esta claro?
- [ ] Proximo setor esta claro?
- [ ] `Encounter` ou venda avulsa controlada esta definido?
- [ ] Quando for demanda futura, agendamento tem profissional/setor, data/hora, status, notas e log?
- [ ] Pendencias sao visiveis antes de cobranca?

### 4.2 Veterinario

- [ ] Ficha foi assumida?
- [ ] `Encounter` ativo esta claro?
- [ ] Se veio de agendamento, origem e notas de agenda estao visiveis?
- [ ] Queixa, anamnese, exame fisico e conduta estao representados?
- [ ] Exames e prescricoes nascem do atendimento?
- [ ] Handoff para recepcao tem resumo e pendencias?

### 4.3 Financeiro

- [ ] Origem da cobranca esta clara?
- [ ] Itens cobraveis sao rastreaveis?
- [ ] Pendencias bloqueantes aparecem?
- [ ] Status financeiro final e compreensivel?

### 4.4 Laboratorio/imagem

- [ ] Pedido tem origem e justificativa?
- [ ] Etapa tecnica esta clara?
- [ ] Resultado retorna ao responsavel clinico?
- [ ] Resultado critico tem regra de notificacao futura?

### 4.5 Internacao

- [ ] Paciente tem leito/setor?
- [ ] Responsavel atual esta claro?
- [ ] Pendencias assistenciais aparecem?
- [ ] Alta ou transferencia tem proximo setor?

### 4.6 Handoff clinico -> recepcao -> financeiro - HOFF-019

- [ ] Clinica envia ou reenvia com resumo minimo, destino, prioridade, pendencias declaradas e origem financeira.
- [ ] Recepcao confirma ACK antes de qualquer devolucao, financeiro ou conclusao futura.
- [ ] Inbox mostra tutor, paciente, atendimento, origem, pendencias, responsavel atual, proximo passo e tempo aguardando.
- [ ] Pendencia critica bloqueia envio ao financeiro e conclusao futura.
- [ ] Pendencia nao critica tem dono, motivo e justificativa de nao bloqueio.
- [ ] Devolucao clinica exige tipo, motivo, destino e nao edita prontuario pela recepcao.
- [ ] Envio ao financeiro exige conferencia operacional e origem rastreavel, sem criar cobranca/comanda automaticamente.
- [ ] SLA/atraso aparece como `normal`, `attention` ou `overdue`, sem transicao automatica.
- [ ] `completed` e apenas criterio futuro de finalizacao operacional, sem BUILD liberado.
- [ ] Permissoes vem do `/access-control`, sem regra por nome de setor, cargo, grupo ou profissao.
- [ ] Auditoria registra ator, permissao efetiva, estado anterior/novo, motivo e timestamp nas transicoes candidatas.
- [ ] Resultado de cada item fica marcado como `Aprovado`, `Bloqueado`, `Ajustar` ou `Nao se aplica`.

## 5. Evidencias esperadas

Cada evidencia deve conter:

- screenshot, quando autorizado;
- URL/tela;
- problema;
- impacto operacional;
- recomendacao;
- papel afetado;
- prioridade;
- backlog relacionado;
- decisao pendente, quando houver.

## 6. Validacao desktop/tablet

Validar:

- desktop de operacao administrativa;
- tablet ou tela de bancada, quando aplicavel;
- leitura no primeiro viewport;
- toque/click em CTAs principais;
- densidade de tabelas/listas;
- ausencia de sobreposicao visual.

## 7. Acessibilidade basica

Validar em nivel documental e visual:

- foco visivel;
- contraste suficiente;
- labels compreensiveis;
- estados de erro e bloqueio;
- textos de CTA claros;
- navegacao por teclado nos fluxos criticos, quando aplicavel;
- informacao sem depender apenas de cor.

## 8. Criterios de aceite

Uma frente operacional sera considerada validada quando:

- walkthrough por papel estiver concluido;
- problemas P0/P1 estiverem registrados;
- screenshots ou descricoes visuais existirem;
- criterios de aceite do PRD/SPEC forem verificaveis;
- responsavel aprovar o resultado;
- DEV continuar bloqueado ate autorizacao explicita.

## 9. Proximos passos

1. Validar este plano com responsavel.
2. Aplicar primeiro em recepcao, Agenda, Queue, prontuario e header.
3. Registrar evidencias em documento de validacao por frente.
4. Manter BUILD bloqueado ate aprovacao explicita.
