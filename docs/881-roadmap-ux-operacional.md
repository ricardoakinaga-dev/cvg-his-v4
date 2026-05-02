# 881 - Roadmap de UX Operacional

Data: 2026-04-28
Status: rascunho para priorizacao
Plano executivo: `docs/880-plano-executivo-ux-operacional.md`

## 0. Resumo executivo

Este roadmap transforma o plano executivo `880-plano-executivo-ux-operacional.md` em fases menores, priorizadas e verificaveis.

A prioridade e reduzir risco antes de construir. A execucao deve comecar por validacao conceitual, auditoria visual e padronizacao de cabecalho, antes de qualquer refatoracao de interface ou alteracao operacional.

`Queue` e `Encounter` so devem entrar em BUILD depois de existir modelo operacional formal, com estados, responsabilidades, transicoes, excecoes, prioridade, SLA e impactos em recepcao, clinica, financeiro e setores especializados.

Cada fase deste roadmap deve ter:

- objetivo;
- escopo;
- fora de escopo;
- entregaveis;
- criterio de saida;
- risco principal;
- documento filho esperado.

Este roadmap ainda nao autoriza BUILD. Ele organiza a passagem entre discovery, PRD, SPEC, backlog, auditoria e execucao futura.

## 1. Objetivo

Organizar a evolucao da UX operacional em fases pequenas, verificaveis e alinhadas ao uso real do hospital.

O objetivo nao e construir imediatamente. O objetivo e reduzir ambiguidade, validar decisoes e preparar documentos executaveis para uma futura etapa de BUILD.

## 2. Sequencia macro

1. Fundacao conceitual.
2. Governanca do roadmap.
3. Auditoria da interface atual.
4. Brief visual e cabecalho contextual.
5. Modelo operacional de `Queue`, Agenda e `Encounter`.
6. Jornada da recepcao.
7. Jornada do veterinario clinico.
8. Fluxos especializados.
9. Validacao operacional.
10. Backlog e microconstrucao futura.

## 3. Governanca do roadmap

Regras obrigatorias:

- nenhuma fase pode avancar sem criterio de saida aprovado;
- BUILD so pode comecar depois de PRD/SPEC aprovados;
- auditoria de telas deve vir antes de refatoracao visual;
- alteracoes em `Queue`/Agenda/`Encounter` exigem documento proprio;
- mudancas em comanda, orcamento e financeiro exigem validacao de regra de negocio;
- documentos de discovery podem propor, mas nao autorizam implementacao;
- Codex/OpenClaw nao devem alterar codigo a partir deste roadmap.

Este roadmap e uma ponte entre plano executivo e documentos executaveis. Ele nao substitui PRD, SPEC, plano de testes ou backlog tecnico.

## 4. Fase 0 - Fechamento conceitual

### Objetivo

Validar as decisoes centrais antes de qualquer execucao.

### Escopo

- Aprovar `880-plano-executivo-ux-operacional.md`.
- Aprovar este `881-roadmap-ux-operacional.md`.
- Produzir ou aprovar `886-modelo-operacional-queue-encounter.md`.
- Confirmar `Queue` como esteira central.
- Confirmar `Encounter` como item operacional da fila.
- Confirmar busca por ID, telefone, RG, CPF, tutor e animal.
- Confirmar regras de comanda, venda de produto e venda de servico.
- Confirmar orcamento isolado.
- Confirmar cabecalho contextual.

### Fora de escopo

- Implementar telas.
- Alterar rotas.
- Alterar banco.
- Criar componentes.
- Refatorar `Queue`.
- Refatorar Agenda.
- Refatorar prontuario.

### Entregaveis

- Plano executivo validado.
- Roadmap validado.
- Lista de decisoes aprovadas.
- Lista de ambiguidades criticas.
- Diretriz para modelo formal de `Queue`/Agenda/`Encounter`.

### Criterio de saida

- decisoes conceituais aprovadas;
- ambiguidades criticas registradas;
- documento filho da `Queue`/`Encounter` definido ou iniciado;
- nenhum codigo autorizado ainda.

### Risco principal

Avancar para desenho ou BUILD com conceitos ainda ambiguos, gerando retrabalho em fila, atendimento, comanda e financeiro.

### Documento filho esperado

`886-modelo-operacional-queue-encounter.md`

## 5. Fase 1 - Auditoria da UI atual

### Objetivo

Mapear friccoes reais sem alterar codigo.

### Escopo

- Auditar telas atuais da recepcao.
- Auditar telas atuais do veterinario clinico.
- Auditar headers carregados.
- Auditar CTAs conflitantes.
- Auditar excesso de botoes.
- Auditar quebras de contexto entre modulos.
- Auditar uso de emojis e decoracao visual.

### Fora de escopo

- Corrigir layout.
- Redesenhar componentes.
- Implementar novo header.
- Ajustar design system.

### Entregaveis

Cada evidencia deve conter:

- URL/tela analisada;
- problema encontrado;
- impacto operacional;
- print ou descricao visual;
- prioridade;
- recomendacao.

Tambem devem ser produzidos:

- mapa da jornada atual da recepcao;
- mapa da jornada atual do veterinario clinico;
- lista de telas mais confusas;
- inventario de acoes redundantes;
- matriz de quick wins e riscos.

### Criterio de saida

- diagnostico com evidencias por tela e fluxo;
- problemas priorizados por impacto operacional;
- recomendacoes separadas em discovery, PRD, SPEC e BUILD futuro.

### Risco principal

Refatorar visualmente sem entender a friccao real, melhorando aparencia sem melhorar operacao.

### Documento filho esperado

`883-auditoria-ui-atual-ux-operacional.md`

## 6. Fase 2 - Brief visual sobrio

### Objetivo

Fechar a linguagem visual operacional antes de qualquer redesenho.

### Escopo

- Definir padrao alemao/sobrio/funcional.
- Reduzir decoracao.
- Reduzir emojis.
- Reduzir excesso de botoes.
- Aumentar densidade operacional.
- Definir ergonomia para uso diario.
- Definir regra para paleta, raio, sombra, icones, cards, tabelas e formularios.
- Definir regra de CTA primaria e acoes secundarias.

### Fora de escopo

- Aplicar CSS.
- Trocar componentes.
- Alterar `AppLayout`.
- Alterar `AppPageHeader`.
- Criar tema novo.

### Entregaveis

- brief visual;
- principios de sobriedade;
- regras para iconografia;
- regras para densidade;
- regras para botoes;
- regras para headers;
- exemplos de telas alvo em nivel conceitual.

### Criterio de saida

- guia visual aprovado para orientar PRD/SPEC e BUILD futuro;
- decisoes visuais suficientes para evitar redesenhos contraditorios.

### Risco principal

Continuar adicionando telas com estilos diferentes, mantendo a percepcao de interface confusa e infantilizada.

### Documento filho esperado

`884-brief-visual-operacional.md`

## 7. Fase 3 - Cabecalho contextual

### Objetivo

Especificar o cabecalho contextual que reduz confusao nas paginas principais.

### Escopo

Especificar:

- trilha clicavel;
- contexto minimo;
- proximos passos;
- CTA primaria;
- CTAs secundarias;
- regra de ocultar acoes irrelevantes;
- estados vazios;
- permissoes por papel.

Escopo inicial de analise:

- paginas de prontuario;
- paginas de atendimento;
- paginas de recepcao/fila;
- paginas de comanda/financeiro;
- paginas com excesso de botoes no topo.

### Fora de escopo

- Implementar componente.
- Alterar `AppPageHeader`.
- Alterar rotas.
- Criar novos menus.

### Entregaveis

- especificacao de comportamento do header;
- regras de trilha;
- regras de proximos passos;
- matriz de acoes por papel;
- exemplos por jornada;
- criterios de aceite de UX.

### Criterio de saida

- header contextual especificado;
- regras de visibilidade de acoes aprovadas;
- dependencias de permissao registradas;
- pronto para SPEC/BUILD futuro, mas BUILD ainda nao autorizado por este documento.

### Risco principal

Continuar com cabecalhos cheios de informacao e botoes, aumentando carga cognitiva no atendimento.

### Documento filho esperado

`885-spec-cabecalho-contextual.md`

## 8. Fase 4 - Queue e Agenda operacional

### Objetivo

Formalizar a `Queue` como centro real do trabalho imediato e a Agenda como coluna dorsal temporal da operacao.

### Escopo

Antes de BUILD, definir:

- state machine operacional;
- campos candidatos;
- responsaveis;
- prioridade;
- SLA;
- regras de transicao;
- excecoes;
- filtros;
- acoes por estado;
- relacao com `Encounter`;
- relacao com Agenda;
- estados de agendamento: pendente, confirmado, cancelado e excluido;
- log de agendamento;
- labels por clinica, ultrassom, raio-x, laboratorio, especialidade e profissional;
- relacao com recepcao, veterinario, exames, internacao, financeiro e setores especializados.

### Fora de escopo

- Alterar banco.
- Alterar API.
- Alterar tela de fila.
- Alterar tela de agenda.
- Implementar state machine.
- Criar migrations.

### Entregaveis

- modelo operacional da `Queue`;
- modelo operacional da Agenda integrada;
- modelo operacional do `Encounter` como item de fila;
- estados candidatos;
- transicoes candidatas;
- responsabilidades por papel;
- excecoes;
- impactos em comanda, orcamento e financeiro.

### Criterio de saida

- modelo aprovado;
- state machine revisada;
- regras de negocio criticas registradas;
- riscos de implementacao identificados;
- BUILD bloqueado ate SPEC tecnica.

### Risco principal

Construir uma fila visual sem resolver responsabilidade, status, SLA e transicoes reais.

### Documento filho esperado

`886-modelo-operacional-queue-encounter.md`

## 9. Fase 5 - Jornada da recepcao

### Objetivo

Detalhar a jornada da recepcao em subfluxos operacionais.

### Escopo

Subfluxos:

- entrada com animal;
- entrada sem animal;
- retorno;
- orcamento;
- venda balcao;
- finalizacao pos-clinica;
- cobranca;
- pendencia.

Tambem deve cobrir:

- busca ampla;
- cadastro minimo;
- comanda quando aplicavel;
- envio para `Queue`;
- recebimento de volta da clinica;
- fechamento ou encaminhamento.

### Fora de escopo

- Implementar entrada rapida.
- Implementar busca.
- Implementar comanda.
- Alterar financeiro.
- Alterar cadastro.

### Entregaveis

- PRD da jornada da recepcao;
- mapa de eventos;
- mapa de telas envolvidas;
- regras de negocio a confirmar;
- excecoes;
- criterios de aceite;
- dependencias com `Queue`, `Encounter`, comanda e financeiro.

### Criterio de saida

- subfluxos validados;
- lacunas de regra de negocio registradas;
- dependencia com `Queue`/Agenda/`Encounter` clara;
- pronto para SPEC futura.

### Risco principal

Manter recepcao dependente de multiplas telas e comunicacao informal para operar o dia.

### Documento filho esperado

`887-prd-jornada-recepcao.md`

## 10. Fase 6 - Jornada do veterinario clinico

### Objetivo

Detalhar o cockpit clinico e seus desdobramentos.

### Escopo

Subfluxos:

- pegar ficha;
- abrir prontuario;
- anamnese;
- exame fisico;
- parametros vitais;
- suspeita diagnostica;
- exames;
- terapeutica;
- prescricao/receita;
- orcamento;
- encaminhamento;
- retorno para recepcao.

### Fora de escopo

- Implementar prontuario.
- Implementar receitas.
- Implementar exames.
- Implementar prescricoes.
- Alterar comanda.
- Alterar financeiro.

### Entregaveis

- PRD da jornada do veterinario clinico;
- mapa de cockpit clinico;
- mapa de proximos passos;
- criterios de entrada e saida;
- regras de envio para recepcao;
- dependencias com exames, prescricao, orcamento, internacao e financeiro.

### Criterio de saida

- jornada clinica validada;
- desdobramentos priorizados;
- cabecalho contextual validado para o papel veterinario;
- pronto para SPEC futura.

### Risco principal

Veterinario continuar navegando por modulos desconectados para concluir um atendimento simples.

### Documento filho esperado

`888-prd-jornada-veterinario-clinico.md`

## 11. Fase 7 - Fluxos especializados

### Objetivo

Planejar jornadas proprias para areas especializadas sem criar sistemas isolados.

### Escopo

Fluxos iniciais:

1. Internacao.
2. Exames laboratoriais.
3. Ultrassom/RX.
4. Cirurgia.
5. Especialidades.

Cada fluxo deve definir:

- status proprio;
- fila ou tela de trabalho;
- responsavel atual;
- proximo destino;
- retorno para recepcao, prontuario ou financeiro;
- vinculo com tutor, animal, `Encounter`, `Queue` e financeiro quando aplicavel.

### Fora de escopo

- Implementar fluxos especializados.
- Criar telas.
- Criar endpoints.
- Criar regras clinicas finais.

### Entregaveis

- roadmap dos fluxos especializados;
- criterios para priorizacao;
- dependencias comuns;
- riscos de isolamento;
- padrao de retorno operacional.

### Criterio de saida

- fluxos especializados priorizados;
- integracoes obrigatorias definidas;
- decisoes que precisam de PRD proprio registradas.

### Risco principal

Cada setor virar uma ilha operacional, quebrando recepcao, prontuario e financeiro.

### Documento filho esperado

`889-roadmap-fluxos-especializados.md`

## 12. Fase 8 - Validacao operacional

### Objetivo

Confirmar que o desenho melhora o uso real antes de BUILD amplo.

### Escopo

Validacoes obrigatorias:

- walkthrough por papel;
- checklist de recepcao;
- checklist de veterinario;
- checklist financeiro;
- screenshots;
- teste desktop/tablet;
- revisao de acessibilidade;
- aprovacao do responsavel.

### Fora de escopo

- Teste automatizado de codigo;
- deploy;
- refatoracao;
- release.

### Entregaveis

- plano de validacao;
- checklists por papel;
- matriz de evidencias;
- criterio de aceite operacional;
- plano de ajustes antes de BUILD.

### Criterio de saida

- walkthrough aprovado;
- gaps remanescentes classificados;
- responsavel aprova avancar para SPEC/BUILD futuro.

### Risco principal

Construir uma solucao aparentemente correta que nao melhora a rotina real.

### Documento filho esperado

`890-plano-validacao-operacional.md`

## 13. Matriz de prioridade

| Prioridade | Frente | Motivo | Risco se adiar |
| --- | --- | --- | --- |
| 1 | Aprovar 880/881 | Alinha decisao executiva e ordem de trabalho | Agentes seguirem interpretacoes diferentes |
| 2 | Formalizar `Queue`/Agenda/`Encounter` | Base operacional imediata e temporal de toda a jornada | BUILD criar fila ou agenda superficial/inconsistente |
| 3 | Auditar UI atual | Evidencia o que realmente confunde o usuario | Redesenhar sem resolver friccao real |
| 4 | Definir brief visual | Evita novas telas com linguagem desalinhada | Persistir visual carregado e infantilizado |
| 5 | Especificar cabecalho contextual | Reduz excesso de botoes e perda de contexto | Header continuar confundindo atendimento |
| 6 | Especificar jornada da recepcao | Recepcao e porta de entrada e fechamento | Gargalos seguirem na operacao diaria |
| 7 | Especificar jornada veterinario | Clinica concentra risco assistencial | Veterinario continuar navegando por modulos soltos |
| 8 | Gerar BUILD | So deve ocorrer apos PRD/SPEC aprovados | Implementacao prematura gerar retrabalho |

## 14. Guardrail

Este documento nao autoriza implementacao.

Ele organiza priorizacao, fases, gates e documentos filhos. Qualquer BUILD precisa de PRD/SPEC aprovado, criterio de saida validado e autorizacao explicita do responsavel.

Codex/OpenClaw nao devem alterar codigo a partir deste roadmap.

Este documento serve como ponte entre o plano executivo e documentos executaveis:

- discovery;
- auditoria;
- PRD;
- SPEC;
- backlog;
- plano de validacao;
- BUILD futuro autorizado.
