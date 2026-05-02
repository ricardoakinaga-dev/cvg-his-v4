# 885 - SPEC de Produto do Cabecalho Contextual

Data: 2026-04-28
Status: SPEC de produto para validacao, sem autorizacao de BUILD
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/881-roadmap-ux-operacional.md`, `docs/882-backlog-ux-operacional.md`, `docs/2026-04-28-mapa-auditoria-fluxos-ux-operacional.md`

## 0. Guardrail

Este documento nao autoriza implementacao.

Ele nao cria componente, nao altera `AppPageHeader`, nao altera rotas, nao define API, nao define permissao tecnica final e nao substitui especificacao tecnica futura.

Todo item DEV relacionado ao cabecalho contextual permanece bloqueado ate aprovacao explicita do responsavel.

## 0.1 Resumo operacional do componente

O cabecalho contextual e o controlador de jornada da tela.

Ele nao e decorativo, nao e apenas breadcrumb e nao deve ser tratado como area generica para acumular botoes. Sua funcao operacional e orientar a decisao imediata do usuario dentro da esteira do hospital.

O cabecalho define:

- onde o usuario esta;
- qual caso, item, paciente, tutor, comanda, pedido ou atendimento esta sendo tratado;
- quem e o responsavel atual, quando houver jornada operacional ativa;
- qual acao move o fluxo para frente;
- quais acoes nao fazem sentido no estado atual.

Na pratica, o cabecalho deve funcionar como um mini-orquestrador de UX. Ele traduz `Queue`, `Encounter`, papel do usuario, estado operacional e pendencias em localizacao, contexto minimo, CTA primaria, CTAs secundarias e acoes ocultas.

Se o cabecalho nao ajuda o usuario a decidir o proximo passo em poucos segundos, ele falhou como componente operacional, mesmo que esteja visualmente correto.

## 1. Objetivo

Reduzir confusao operacional nas telas principais, substituindo cabecalhos carregados por um cabecalho que explique:

- onde o usuario esta;
- qual caso/contexto esta sendo trabalhado;
- qual acao move a jornada global;
- quais proximos passos sao relevantes agora;
- quais acoes devem ficar ocultas por nao fazerem sentido no momento.

## 2. Problema operacional

Cabecalhos carregados com muitos botoes, textos longos e acoes concorrentes aumentam a carga cognitiva, especialmente em recepcao, atendimento clinico, fila, comanda, financeiro, laboratorio e internacao.

O usuario precisa decidir rapidamente o proximo passo. Quando todas as acoes aparecem ao mesmo tempo, a tela parece completa, mas a jornada fica menos clara.

## 2.1 Contrato comportamental

O cabecalho contextual deve sempre responder cinco perguntas operacionais.

1. Onde estou?
2. Qual item estou operando?
3. Quem e o responsavel atual?
4. Qual e o proximo passo?
5. O que nao posso fazer agora?

Se qualquer uma dessas respostas nao estiver clara para uma tela com jornada operacional ativa, o cabecalho esta incorreto.

Regras de interpretacao:

- `Onde estou?` deve ser respondido pela trilha clicavel e pela etapa atual.
- `Qual item estou operando?` deve ser respondido pelo contexto minimo.
- `Quem e o responsavel atual?` deve aparecer quando houver `Queue`, `Encounter`, comanda, pedido, exame, internacao ou pendencia operacional.
- `Qual e o proximo passo?` deve ser respondido pela CTA primaria e, quando util, por proximos passos secundarios.
- `O que nao posso fazer agora?` deve ser respondido por ocultacao, bloqueio com motivo ou ausencia deliberada da acao.

Ausencias aceitaveis:

- em tela puramente administrativa sem jornada ativa, `responsavel atual` pode ser omitido;
- em tela de consulta historica, `proximo passo` pode ser substituido por retorno seguro ou acao de leitura;
- em tela sem item operacional selecionado, o contexto minimo pode ser omitido, mas a localizacao ainda deve estar clara.

Ausencias nao aceitaveis:

- fila sem responsavel atual ou estado operacional;
- prontuario ativo sem paciente e etapa;
- comanda sem origem ou status financeiro;
- exame sem etapa tecnica;
- tela operacional com duas CTAs primarias concorrentes;
- tela operacional sem CTA primaria quando ha proximo passo esperado.

## 3. Estrutura alvo

O cabecalho contextual deve separar cinco responsabilidades.

### 3.1 Trilha clicavel a esquerda

A trilha mostra a jornada, nao apenas a URL tecnica.

Exemplos conceituais:

- `Inicio > Recepcao > Entrada > Queue`;
- `Inicio > Cliente > Animal > Atendimento > Anamnese`;
- `Inicio > Queue > Atendimento > Exames`;
- `Inicio > Atendimento > Recepcao > Cobranca`;

Regras:

- cada item clicavel deve representar retorno seguro para uma etapa anterior;
- a trilha deve ser curta;
- a ultima etapa deve indicar a posicao atual;
- a trilha nao deve repetir breadcrumbs tecnicos sem valor operacional;
- quando nao houver jornada ativa, usar localizacao administrativa simples.

### 3.2 Contexto minimo

O contexto minimo mostra apenas o necessario para tomar decisao.

Campos candidatos:

- tutor;
- animal;
- especie, quando util;
- horario de entrada;
- status operacional;
- responsavel atual;
- setor atual;
- prioridade;
- pendencias criticas.

Regras:

- nao transformar o header em prontuario, ficha ou dashboard;
- nao mostrar todo dado cadastral;
- contexto sensivel deve aparecer apenas quando necessario ao papel;
- se o usuario esta em cadastro administrativo sem jornada ativa, o contexto pode ser omitido.

### 3.3 Proximos passos a direita

Os proximos passos sao sugestoes contextuais.

Exemplos:

- `Enviar para atendimento`;
- `Pegar ficha`;
- `Solicitar exame`;
- `Criar receita`;
- `Indicar orcamento`;
- `Enviar para recepcao`;
- `Iniciar cobranca`;
- `Fechar comanda`;

Regras:

- exibir poucas opcoes;
- ordenar por relevancia operacional;
- priorizar o passo que move a jornada global;
- esconder acoes que dependem de estado, papel ou pendencia nao satisfeita;
- quando houver muitas possibilidades, agrupar em menu secundario.

### 3.4 CTA primaria

A CTA primaria deve mover a jornada global, nao apenas salvar a tela.

Exemplos por contexto:

| Contexto | CTA primaria candidata |
| --- | --- |
| Recepcao criando entrada | `Enviar para atendimento` |
| Recepcao finalizando retorno da clinica | `Iniciar cobranca` |
| Veterinario com ficha aberta | `Enviar para recepcao` |
| Veterinario registrando atendimento | `Salvar e continuar` ou `Finalizar clinica` |
| Laboratorio com pedido em execucao | `Liberar resultado` |
| Financeiro em comanda | `Fechar cobranca` |

Regras:

- uma unica CTA primaria por tela;
- label deve descrever resultado operacional;
- evitar CTAs genericas como `Salvar` quando o efeito real for maior;
- quando salvar rascunho for necessario, deve ser secundaria;
- CTA primaria deve indicar bloqueios antes de executar a transicao.

### 3.4.1 Regra deterministica da CTA primaria

Deve existir exatamente uma CTA primaria por tela operacional.

Regras deterministicas:

- se existir mais de uma CTA primaria, ha erro de design;
- se nao existir nenhuma CTA primaria em tela com jornada ativa, ha erro de fluxo;
- a CTA primaria deve estar ligada ao estado do `Encounter`, ao estado da `Queue`, ao papel do usuario e as pendencias atuais;
- a CTA primaria deve representar a proxima transicao operacional mais relevante, nao uma acao local arbitraria;
- a CTA primaria deve mudar quando o estado operacional, papel ou pendencias mudarem;
- a CTA primaria nao deve competir visualmente com CTAs secundarias;
- quando a transicao principal estiver bloqueada, a CTA primaria pode aparecer bloqueada somente se o motivo do bloqueio for util para a decisao; caso contrario, deve ser substituida por uma CTA de resolucao da pendencia.

Regra:

```text
CTA primaria = funcao(estado_operacional, papel, pendencias)
```

Entradas conceituais obrigatorias:

| Entrada | Pergunta que resolve | Exemplo |
| --- | --- | --- |
| `estado_operacional` | Em que etapa o item esta? | `aguardando_atendimento`, `em_atendimento`, `aguardando_cobranca` |
| `papel` | Quem esta operando? | recepcao, veterinario, financeiro, laboratorio |
| `pendencias` | O que impede ou altera a transicao? | cadastro incompleto, exame pendente, pagamento pendente |

Saidas conceituais permitidas:

| Saida | Uso |
| --- | --- |
| CTA primaria ativa | Quando a transicao esta permitida |
| CTA primaria bloqueada com motivo | Quando o usuario precisa entender o bloqueio |
| CTA primaria de resolucao | Quando antes de avancar e necessario resolver pendencia |
| Sem CTA primaria operacional | Apenas para telas sem jornada ativa ou paginas puramente informativas |

Exemplos deterministico-operacionais:

| Estado operacional | Papel | Pendencia | CTA primaria esperada |
| --- | --- | --- | --- |
| Entrada pronta | Recepcao | Nenhuma critica | `Enviar para atendimento` |
| Entrada incompleta | Recepcao | Cadastro minimo ausente | `Completar dados minimos` |
| Aguardando atendimento | Veterinario | Nenhuma critica | `Pegar ficha` |
| Em atendimento | Veterinario | Registro clinico em rascunho | `Salvar e continuar` |
| Finalizacao clinica | Veterinario | Pendencias revisadas | `Enviar para recepcao` |
| Aguardando cobranca | Financeiro | Itens revisados | `Fechar cobranca` |
| Aguardando resultado | Laboratorio | Analise concluida | `Liberar resultado` |
| Pendencia operacional | Qualquer papel dono | Pendencia atribuida | `Resolver pendencia` |

Casos de erro:

- `Salvar` como CTA primaria quando a acao real esperada e `Enviar para recepcao`;
- `Cobrar` e `Fechar comanda` simultaneamente como CTAs primarias;
- `Solicitar exame` como CTA primaria para recepcao sem contexto clinico;
- `Liberar resultado` visivel para papel sem responsabilidade tecnica;
- header sem CTA primaria em atendimento ativo;
- CTA primaria que nao muda apos o item sair de `em_atendimento` para `aguardando_cobranca`.

### 3.5 CTAs secundarias

CTAs secundarias devem apoiar o trabalho sem competir com a primaria.

Exemplos:

- `Salvar rascunho`;
- `Adicionar observacao`;
- `Imprimir`;
- `Cancelar`;
- `Mais acoes`;
- `Ver historico`;
- `Reatribuir responsavel`.

Regras:

- usar secundaria, ghost ou menu quando a acao nao move a jornada;
- nao duplicar a mesma acao em header, card e tabela;
- acoes destrutivas devem ficar separadas e exigir confirmacao futura;
- relatorios, impressao e historico nao devem competir com transicao operacional.

## 4. Ocultacao de acoes irrelevantes

Acoes devem aparecer por contexto, papel, estado e pendencia.

Regras candidatas:

- nao mostrar `Cobrar` antes de existir item cobravel ou autorizacao;
- nao mostrar `Enviar para recepcao` se o usuario nao assumiu ficha ou nao tem permissao;
- nao mostrar `Liberar resultado` fora do papel laboratorio/imagem;
- nao mostrar `Fechar comanda` se ha pendencias financeiras criticas;
- nao mostrar `Solicitar exame` fora de contexto clinico ou autorizacao;
- nao mostrar acoes administrativas em telas clinicas de uso rapido;
- quando uma acao estiver bloqueada mas importante, exibir motivo em estado desabilitado apenas se isso ajudar a decisao.

## 5. Regras por papel

### 5.1 Recepcao

Necessidades:

- entender entrada, fila, retorno da clinica e cobranca;
- identificar tutor, animal, horario, status e pendencias;
- mover o caso para atendimento, financeiro ou fechamento.

CTA primaria candidata por etapa:

- entrada: `Enviar para atendimento`;
- retorno da clinica: `Revisar pendencias`;
- pos-clinica com itens: `Iniciar cobranca`;
- venda balcao: `Finalizar venda`;
- pendencia: `Resolver pendencia`.

Acoes secundarias candidatas:

- `Salvar rascunho`;
- `Adicionar observacao`;
- `Reatribuir`;
- `Abrir comanda`;
- `Mais acoes`.

### 5.2 Veterinario

Necessidades:

- entender paciente, tutor, status, prioridade e etapa clinica;
- registrar atendimento sem navegar por modulos desconectados;
- gerar exames, terapeutica, prescricao, receita, orcamento e encaminhamento;
- devolver para recepcao com pendencias claras.

CTA primaria candidata por etapa:

- fila clinica: `Pegar ficha`;
- atendimento em andamento: `Salvar e continuar`;
- finalizacao clinica: `Enviar para recepcao`;
- caso exige internacao: `Encaminhar para internacao`.

Acoes secundarias candidatas:

- `Solicitar exame`;
- `Prescrever`;
- `Criar receita`;
- `Indicar orcamento`;
- `Adicionar evolucao`;
- `Salvar rascunho`.

### 5.3 Financeiro

Necessidades:

- entender origem da cobranca;
- conferir itens, pagamentos, descontos, pendencias e status;
- fechar ou marcar pendencia sem depender de comunicacao informal.

CTA primaria candidata por etapa:

- comanda pronta: `Fechar cobranca`;
- pagamento parcial: `Registrar pagamento`;
- pendencia: `Marcar pendencia financeira`;
- divergencia: `Enviar para revisao`.

Acoes secundarias candidatas:

- `Aplicar desconto`;
- `Adicionar forma de pagamento`;
- `Ver origem`;
- `Imprimir recibo`;
- `Cancelar item`.

### 5.4 Laboratorio e imagem

Necessidades:

- entender pedido, origem, paciente, prioridade, coleta, execucao e resultado;
- retornar laudo ao prontuario;
- sinalizar resultado critico ao responsavel clinico.

CTA primaria candidata por etapa:

- pedido novo: `Iniciar coleta`;
- coleta concluida: `Iniciar analise`;
- resultado pronto: `Liberar resultado`;
- resultado critico: `Notificar responsavel`.

Acoes secundarias candidatas:

- `Adicionar observacao tecnica`;
- `Reagendar coleta`;
- `Cancelar pedido`;
- `Ver atendimento de origem`.

## 6. Matriz de visibilidade candidata

| Acao | Recepcao | Veterinario | Financeiro | Laboratorio |
| --- | --- | --- | --- | --- |
| Enviar para atendimento | Primaria quando entrada pronta | Oculta | Oculta | Oculta |
| Pegar ficha | Oculta ou leitura | Primaria na fila clinica | Oculta | Oculta |
| Solicitar exame | Oculta | Secundaria contextual | Oculta | Oculta |
| Liberar resultado | Oculta | Leitura | Oculta | Primaria |
| Enviar para recepcao | Leitura ou aceite | Primaria na finalizacao | Oculta | Contextual quando exame conclui |
| Iniciar cobranca | Primaria pos-clinica | Oculta | Primaria quando caixa assume | Oculta |
| Fechar comanda | Secundaria ou primaria conforme papel local | Oculta | Primaria | Oculta |

Esta matriz e candidata e depende de validacao de permissoes e processos reais.

## 7. Criterios de aceite de UX

O cabecalho contextual sera considerado aprovado quando:

- a tela tiver uma CTA primaria clara;
- a CTA primaria mover a jornada global;
- a trilha permitir entender a etapa atual em ate 5 segundos;
- o contexto minimo nao competir com o conteudo principal;
- acoes irrelevantes estiverem ocultas ou agrupadas;
- recepcao enxergar status e proximo passo sem interpretar prontuario;
- veterinario enxergar paciente, etapa clinica e proximo passo sem abrir modulos paralelos;
- financeiro enxergar origem da cobranca e pendencias antes de fechar;
- laboratorio enxergar pedido, etapa tecnica e retorno ao responsavel;
- nenhuma acao DEV for liberada sem PRD/SPEC aprovado.

## 8. Lacunas para validacao

- Quais papeis finais devem existir alem de recepcao, veterinario, financeiro e laboratorio?
- Qual e o vocabulário aprovado para CTAs primarias?
- Quais acoes devem ficar sempre visiveis por exigencia operacional?
- Quais acoes podem ir para `Mais acoes`?
- Quais dados clinicos podem aparecer no header sem excesso de exposicao?
- Como o header deve se comportar em mobile/tablet de bancada?
- Quais estados bloqueiam a CTA primaria?

## 9. Proximos passos

1. Validar esta SPEC com responsavel operacional.
2. Cruzar regras com `886-modelo-operacional-queue-encounter.md`.
3. Aplicar auditoria em telas criticas antes de qualquer BUILD.
4. Manter `UX-DEV-001` bloqueado ate autorizacao explicita.
