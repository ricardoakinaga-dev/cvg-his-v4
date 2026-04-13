# VETUS — Estrutura de Rotas, Integração e API
**Base combinada:** evidências visuais do acervo + documentação de tráfego já existente no repositório  
**Objetivo:** explicar por que a mesma rotina aparece ora como SPA funcional, ora como legacy direto, ora como indisponibilidade

## 1. Leitura correta da arquitetura

As evidências combinadas apontam para uma arquitetura em três camadas:

| Camada | Papel | Evidência |
|---|---|---|
| `erp-beta.vetus.com.br` | Shell SPA e módulos modernos | `agenda-*`, `comandas-*`, `animais-*`, `produtos`, `fiscal-*` |
| `erp.vetus.com.br` | Rotinas legacy / JSF / PrimeFaces | `modulos/fin-*`, `modulos/lab-*`, `modulos/int-*`, `modulos/att-*` |
| `dorylus.vetus.com.br` | API de autenticação e suporte ao beta | documentação prévia de `auth`, `menu` e recursos REST |

## 2. O que o acervo visual prova

### 2.1 Há rotas internas SPA

Essas rotas renderizam telas modernas e coerentes com o shell:

- `/agenda`
- `/comandas`
- `/cadastro/animais`
- `/cadastro/clientes`
- `/produtos`
- `/estoques`
- `/fabricantes`
- `/icms`
- `/cfop`
- `/tabela-fiscal-nfse`

### 2.2 Há rotas externas ou legadas

Diversos itens de menu remetem a páginas herdadas do legado, por exemplo:

- `/Sistema/Atendimento/Vendas.htm`
- `/Sistema/Atendimento/Esteira.htm`
- `/Sistema/Laboratorio/Laudos.htm`
- `/Sistema/Financeiro/ContasAReceber.htm`

Quando acessadas por um caminho errado, proxy incompleto ou vínculo quebrado, surgem as telas de indisponibilidade preservadas no acervo.

## 3. Padrão híbrido de menu

A hipótese arquitetural mais forte é:

- o menu da SPA guarda itens com `to` internos;
- outros itens apontam para URLs absolutas do legado;
- a experiência do usuário tenta manter um shell unificado, mas nem toda rotina resolve corretamente dentro dele.

Esse comportamento aparece repetidamente nas capturas.

## 4. Fluxo de autenticação consolidado

Com base na documentação anterior e no comportamento visual:

1. o usuário autentica no ecossistema Vetus;
2. recebe token e contexto de empresa;
3. entra no shell beta;
4. o shell abre módulos nativos ou encaminha para rotinas legadas;
5. a qualidade dessa transição varia conforme a rotina.

## 5. Como interpretar os conflitos do acervo

### 5.1 Exemplo: laboratório

- `screenshots/laboratorio-laudos-01.png` mostra indisponibilidade no shell;
- `modulos/lab-02-laudos.png` mostra a tela legacy de laudos funcional.

Interpretação:

- o domínio funcional existe;
- a tela existe;
- o problema está na ponte SPA -> legacy, não necessariamente no módulo em si.

### 5.2 Exemplo: internação

- `screenshots/internacao-01.png` está indisponível;
- `modulos/int-01-internacao.png` está funcional.

Mesma leitura: o recurso existe, mas o encadeamento entre navegação e destino não está estável.

### 5.3 Exemplo: pacotes

- `screenshots/atendimento-pacotes-01.png` funciona no beta;
- `modulos/att-02-pacotes.png` é `HTTP 404`.

Aqui o cenário inverte:

- o beta parece ter uma implementação própria ou uma rota funcional;
- a captura direta legada falhou.

## 6. O que isso significa para documentação e engenharia

Se a equipe estiver usando o acervo para produto, descoberta ou reconstrução, o modelo correto é:

- documentar **domínio funcional** separado de **mecanismo de entrega**;
- distinguir `beta nativo`, `legacy funcional` e `rota quebrada`;
- não assumir que uma falha visual invalida o domínio inteiro;
- não assumir que a existência no legacy implica disponibilidade imediata no beta.

## 7. Superfícies mais prováveis da API

Pelo acervo e pela documentação já presente, a API dá suporte principalmente a:

- autenticação;
- contexto de usuário e empresa;
- construção do menu;
- entidades beta como agenda, clientes, animais e comandas.

Já boa parte das telas legacy parece depender de backends e sessões herdadas do ERP clássico.

## 8. Conclusão

O guia de API e rotas deve ser lido menos como uma especificação REST completa e mais como uma explicação de arquitetura operacional:

- **beta** para a experiência moderna;
- **legacy** para rotinas especializadas;
- **integração parcial** entre as duas camadas.

Essa é a chave para interpretar corretamente o restante da documentação premium de `docs/vetus/guides`.
