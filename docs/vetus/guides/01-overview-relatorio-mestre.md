# VETUS ERP — Relatório Mestre de Inspeção
**Projeto:** documentação de referência do Vetus  
**Data da consolidação:** 2026-04-12  
**Pastas inspecionadas:** `docs/vetus/screenshots` e `docs/vetus/modulos`  
**Acervo visual total:** 152 arquivos PNG  
**Estados visuais distintos:** 92  

## 1. Escopo desta revisão

Este guia consolida a leitura de todo o acervo visual importado para `docs/vetus`. O objetivo não é apenas listar telas, mas separar:

- o que pertence ao **shell SPA beta**;
- o que representa módulos **nativos do beta**;
- o que foi capturado como **legacy direto**;
- o que é apenas repetição de **erro / indisponibilidade / rota quebrada**.

Essa distinção é crítica porque os dois diretórios analisados não representam a mesma camada do produto.

## 2. Como o acervo se organiza

### 2.1 `screenshots/`

A pasta `screenshots` concentra capturas do ambiente com shell SPA do Vetus:

- topbar;
- sidebar;
- dashboard;
- módulos nativos do beta, como agenda, comandas, cadastros, produtos e parte de fiscal;
- diversas rotas abertas a partir do menu que retornam páginas de indisponibilidade dentro do shell.

### 2.2 `modulos/`

A pasta `modulos` concentra capturas mais próximas do legado operacional:

- formulários JSF / PrimeFaces de atendimento;
- telas financeiras clássicas;
- laboratório;
- internação;
- cálculo de comissões.

Nessa pasta também há estados de erro HTTP, inclusive `404` e `500`, preservados como evidência.

## 3. Achados principais

### 3.1 O produto é híbrido

O Vetus documentado aqui não é uma única aplicação homogênea. As evidências mostram um arranjo híbrido:

- **SPA beta** para shell, navegação, dashboard e módulos modernos;
- **legacy** para parte relevante da operação clínica, financeira e laboratorial;
- **pontes incompletas** entre beta e legacy, visíveis nas capturas que retornam "Desculpe, página indisponível", `404` ou `500`.

### 3.2 O shell visual é consistente

Independentemente do módulo, há um padrão visual recorrente:

- fundo cinza-azulado claro;
- cards brancos com borda sutil;
- laranja como cor primária de ação;
- azul para pesquisa e ações secundárias;
- sidebar fixa à esquerda;
- topbar fixa com busca, suporte, WhatsApp e perfil;
- widget de NPS sobreposto no canto inferior esquerdo;
- footer institucional do lado legacy e de algumas telas beta.

### 3.3 Nem toda captura representa uma tela funcional

O acervo contém muita repetição de erro:

- 57 arquivos em `screenshots/` são duplicatas exatas agrupadas em 4 clusters;
- os maiores clusters são estados de "página indisponível";
- 8 arquivos em `modulos/` também são duplicatas exatas, associados a erro `HTTP 500`.

Conclusão prática: quantidade de arquivos não equivale a quantidade de telas úteis.

### 3.4 Há rotas com comportamento contraditório conforme o contexto

O mesmo domínio funcional aparece em estados diferentes dependendo da origem da captura.

Exemplos objetivos:

- `screenshots/atendimento-pacotes-01.png` mostra **Pacotes** funcional no shell beta;
- `modulos/att-02-pacotes.png` registra **HTTP 404** para o mesmo domínio de negócio;
- `screenshots/laboratorio-laudos-01.png` está indisponível no shell;
- `modulos/lab-02-laudos.png` mostra a tela legacy de **Laudos** funcional;
- `screenshots/internacao-01.png` está indisponível;
- `modulos/int-01-internacao.png` mostra a tela legacy de **Internação** funcional.

Documentar essa ambiguidade é mais importante do que tentar "unificar" artificialmente o acervo.

## 4. Mapa executivo de cobertura

| Bloco | Evidência principal | Situação documentada |
|---|---|---|
| Shell global | `01-navbar-*`, `09-topbar-isolado.png`, `vetus-dashboard.png` | Estável e consistente |
| Dashboard / Início | `vetus-dashboard.png`, `vetus-after-login.png` | Funcional |
| Agenda | `agenda-*.png` | Funcional no beta |
| Comandas | `comandas-*.png` | Funcional no beta |
| Cadastros de animais e clientes | `animais-*.png`, `clientes-02-detalhe.png` | Funcional no beta |
| Pacotes | `screenshots/atendimento-pacotes-01.png` | Funcional no beta |
| Produtos, estoques e fiscal | `estoque-*.png`, `fiscal-*.png` | Maior parte funcional no beta |
| Dashboard financeiro | `financeiro-dashboard-01.png` | Funcional no beta |
| RH profissionais | `rh-profissionais-01.png` | Funcional no beta |
| Atendimento legacy | `modulos/att-*.png` | Misto: parte funcional, parte 404/500 |
| Financeiro legacy | `modulos/fin-*.png` | Forte cobertura funcional |
| Laboratório legacy | `modulos/lab-*.png` | Funcional no legacy |
| Internação legacy | `modulos/int-*.png` | Parcialmente funcional |
| Comissões legacy | `modulos/com-*.png` | Funcional no legacy |
| Marketing / relatórios / várias rotas SPA | diversos `screenshots/*` | Forte incidência de indisponibilidade |

## 5. Leitura recomendada dos guias

Para entender o acervo na ordem correta:

1. `02-shell-estrutura-global.md`
2. `03-shell-mapa-de-navegacao.md`
3. `10-modulo-agenda.md`
4. `11-modulo-comandas.md`
5. `12-modulo-cadastros-animais-clientes.md`
6. `14-modulo-estoque-fiscal.md`
7. `15-modulo-rh-marketing-relatorios.md`
8. `16-catalogo-de-evidencias.md`

Os relatórios `20-anexo-*` a `24-anexo-*` devem ser lidos como anexos operacionais por módulo.

## 6. Implicações para migração ou benchmark

Se essa documentação estiver sendo usada como base para reproduzir o Vetus em outro produto, as prioridades mais seguras são:

- reproduzir primeiro o **shell** e os módulos que já são SPA nativos;
- mapear separadamente os módulos que ainda dependem do **legacy**;
- não tratar screenshots de indisponibilidade como requisito funcional;
- usar os clusters de erro como evidência de **lacunas de integração entre menu, rota e backend**.

## 7. Síntese final

O acervo analisado não descreve "um sistema pronto e uniforme". Ele descreve:

- uma camada SPA moderna com boa qualidade visual;
- um legado ainda muito presente;
- uma transição incompleta entre as duas camadas;
- um conjunto de módulos realmente maduros no beta;
- e uma quantidade relevante de telas que servem mais como evidência de lacuna do que como referência de produto acabado.

Essa leitura foi incorporada nos guias detalhados e no catálogo final de evidências.
