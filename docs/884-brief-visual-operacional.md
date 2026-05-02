# 884 - Brief Visual Operacional

Data: 2026-04-28
Status: rascunho para validacao
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/881-roadmap-ux-operacional.md`, `docs/882-backlog-ux-operacional.md`, `docs/883-auditoria-ui-atual-ux-operacional.md`

## 0. Guardrail

Este documento nao autoriza implementacao.

Ele nao cria tema, componente, CSS, rota, tela, migration ou alteracao tecnica. Ele orienta discovery visual, auditoria, PRD, SPEC e backlog futuro.

Todo item DEV visual permanece bloqueado ate brief aprovado, SPEC aplicavel e autorizacao explicita do responsavel.

## 1. Objetivo

Definir a direcao visual operacional do `cvg-his-v2` para que a interface pareca um ERP hospitalar adulto, preciso e produtivo, e nao uma colecao de telas decorativas.

O objetivo visual e aumentar clareza, previsibilidade, densidade e velocidade de operacao.

## 2. Direcao visual

Direcao desejada:

- alema;
- sobria;
- funcional;
- previsivel;
- densa sem ser confusa;
- premium pela organizacao e acabamento;
- focada em operacao diaria.

Reduzir:

- decoracao sem funcao;
- emojis como linguagem estrutural;
- gradientes chamativos;
- sombras amplas;
- cards grandes demais;
- botoes simultaneos;
- arredondamento excessivo;
- textos promocionais em telas operacionais.

Aumentar:

- hierarquia;
- leitura rapida;
- tabelas e listas escaneaveis;
- estados claros;
- CTAs primarias deterministicas;
- contexto operacional;
- foco em proximo passo.

## 3. Principios

### 3.1 Clareza antes de ornamento

Toda tela operacional deve responder:

- onde estou;
- qual item estou operando;
- quem e responsavel;
- qual estado operacional;
- qual proximo passo.

### 3.2 Densidade com hierarquia

ERP de uso diario precisa mostrar informacao suficiente sem transformar a tela em painel decorativo.

### 3.3 Um foco operacional por area

Cada area da tela deve ter funcao clara: localizacao, contexto, lista, detalhe, formulario, pendencia ou acao.

### 3.4 Visual como suporte do fluxo

Visual nao deve competir com `Queue`, `Encounter`, cabecalho contextual, pendencias e CTA primaria.

## 4. Padroes candidatos

Estes padroes sao candidatos e nao representam implementacao final.

| Elemento | Direcao candidata |
| --- | --- |
| Cor | Base neutra, baixo ruido, cores semanticas para status e prioridade |
| Raio | Preferir 4px a 8px em componentes operacionais |
| Sombra | Minima, usada para profundidade funcional, nao decoracao |
| Iconografia | Icones lineares consistentes; reduzir emojis estruturais |
| Cards | Usar para itens repetidos ou conteudo realmente agrupado; evitar cards aninhados |
| Tabelas | Mais densas, escaneaveis, com colunas operacionais e status claro |
| Headers | Trilha, contexto minimo, CTA primaria e proximos passos |
| Botoes | Uma CTA primaria; secundarias discretas; acoes raras em menu |
| Badges | Semantica clara de status, prioridade, pendencia e setor |
| Empty states | Texto curto e proxima acao util |

## 5. Regras por superficie

| Superficie | Direcao |
| --- | --- |
| Recepcao | Entrada rapida, busca ampla, funil operacional e pouca decoracao |
| Queue | Lista/esteira de trabalho com dono, estado, prioridade, SLA e proximo passo |
| Prontuario/cockpit | Contexto clinico essencial, registro rapido e handoff claro |
| Financeiro/comanda | Origem da cobranca, pendencias, status e fechamento sem ambiguidade |
| Laboratorio/imagem | Fila tecnica por etapa e retorno claro ao prontuario |
| Internacao | Painel de comando assistencial, nao apenas mapa visual |
| Dashboards | Indicadores acionaveis ligados a filas, pendencias e gargalos |

## 6. Criterios de aceite

O brief visual sera considerado pronto para orientar SPEC/BUILD futuro quando:

- direcao sobria e funcional estiver aprovada;
- regras de reducao de emojis estiverem aprovadas;
- regras de botoes e CTA primaria estiverem alinhadas ao `885`;
- regras de cards, tabelas e headers estiverem claras;
- auditoria visual tiver telas prioritarias associadas;
- DEV permanecer bloqueado.

## 7. Proximos passos

1. Validar direcao visual com responsavel.
2. Cruzar este brief com `883-auditoria-ui-atual-ux-operacional.md`.
3. Criar checklist visual por tela critica.
4. Manter `UX-DEV-005` bloqueado ate autorizacao explicita.
