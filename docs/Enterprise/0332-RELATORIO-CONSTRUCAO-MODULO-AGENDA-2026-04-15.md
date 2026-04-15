# 0332 - RELATORIO DE CONSTRUCAO - MODULO AGENDA - 2026-04-15

**Data UTC:** `2026-04-15`  
**Escopo:** avaliacao comparativa e melhoria da construcao frontend do modulo Agenda no `apps/spa`  
**Referencias principais:** `docs/vetus/guides/10-modulo-agenda.md`, evidencias visuais da agenda Vetus, `0174`, `0196`, `0205`

---

## 1. Contexto e objetivo

O modulo de agenda do `cvg-his-v2` ja havia avancado para um cockpit multiprofissional com:

- leitura de overview;
- mini fluxo rapido de criacao;
- filtros laterais;
- visoes de dia, semana e mes;
- integracao com fila operacional.

Mesmo assim, havia uma necessidade clara de comparar a entrega com a referencia do Vetus para verificar se a construcao estava realmente aderente ao padrao operacional esperado.

O objetivo desta rodada foi:

1. confrontar a implementacao atual com a referencia Vetus;
2. identificar gaps reais de construcao;
3. corrigir o que fosse possivel diretamente no frontend atual, sem inventar escopo ficticio de backend;
4. registrar o estado real do modulo apos as melhorias.

---

## 2. Referencia analisada

Foi usada como base a documentacao local:

- [10-modulo-agenda.md](/root/.openclaw/workspace/cvg-his-v2/docs/vetus/guides/10-modulo-agenda.md)

Leituras centrais da referencia Vetus:

- a agenda funciona como **cockpit de operacao ambulatorial**;
- o cabecalho combina CTA forte, navegacao temporal, `Hoje` e alternancia entre `Mes`, `Semana` e `Dia`;
- o painel esquerdo concentra **mini calendario + filtros operacionais**;
- a visao diaria e multiprofissional;
- a visao semanal conserva leitura matricial por janela maior;
- a criacao de agendamento e **centrada no cliente**, com fluxo inline/modal;
- o modulo tem densidade operacional e nao apenas aparencia de calendario.

---

## 3. Diagnostico do modulo antes da melhoria

### 3.1 O que ja estava forte

Antes desta rodada, a agenda do `cvg-his-v2` ja entregava varios pontos importantes:

- overview operacional real via `/scheduling/overview`;
- filtros por profissional, servico, unidade, especialidade e busca;
- mini calendario lateral;
- criacao rapida de agendamento centrada em cliente por modal;
- visao diaria multiprofissional com coluna `Sem profissional`;
- integracao com fila e encounter;
- leitura mensal analitica.

### 3.2 Gaps reais encontrados

Apesar disso, a comparacao com a referencia Vetus mostrou gaps concretos:

1. o titulo e a apresentacao do modulo ainda estavam mais “premium cockpit” do que “agenda operacional”;
2. a ordem e a leitura do toggle de visao nao estavam alinhadas ao padrao `Mes > Semana > Dia`;
3. a visao semanal ainda nao estava resolvida como **grade matricial temporal**;
4. o painel lateral ainda estava menos denso em contexto operacional do que a referencia;
5. nao havia legenda operacional/visual consolidando status e marcadores;
6. faltava filtro contextual mais explicito para **Cliente/Tutor**;
7. faltava uma camada leve de marcadores operacionais no cockpit.

Leitura objetiva:

- o modulo ja era funcional;
- o gap restante era mais de **acabamento operacional e aderencia de UX** do que de ausencia estrutural.

---

## 4. Arquivos alterados

### Codigo

- `apps/spa/src/pages/appointments/AppointmentsListPage.vue`

### Testes

- `apps/spa/src/pages/appointments/__tests__/AppointmentsListPage.test.ts`

### Documentacao

- `docs/Enterprise/0332-RELATORIO-CONSTRUCAO-MODULO-AGENDA-2026-04-15.md`

---

## 5. Melhorias implementadas

### 5.1 Alinhamento do cabecalho e da linguagem do modulo

O topo da pagina foi ajustado para reforcar leitura de **Agenda** como modulo operacional principal, e nao apenas cockpit premium.

Mudancas:

- titulo passou para `Agenda`;
- subtitulo foi reescrito para refletir mini calendario, filtros operacionais e visoes temporais alinhadas ao fluxo ambulatorial;
- CTA principal permaneceu forte e centrado no fluxo de criacao.

### 5.2 Painel lateral mais aderente ao benchmark

O painel esquerdo foi reforcado para ficar mais proximo da referencia Vetus.

Melhorias:

- preservacao do mini calendario com navegacao mensal;
- inclusao de filtro explicito de `Cliente/Tutor`;
- inclusao de filtro de `Marcador`;
- manutencao dos filtros de profissional, servico, unidade, especialidade e busca geral;
- texto do botao padronizado para `Limpar filtros`.

### 5.3 Reordenacao do toggle de visao

O alternador passou a seguir a sequencia:

- `Mês`
- `Semana`
- `Dia`

Isso aproxima a leitura visual do que foi observado no Vetus.

### 5.4 Visao semanal matricial real

Esse foi o principal gap corrigido.

Antes:

- a visao semanal reaproveitava a estrutura geral, mas nao entregava a leitura matricial temporal da referencia.

Depois:

- a visao `week` passou a renderizar uma matriz real;
- colunas por dia visivel;
- eixo vertical por horario;
- blocos operacionais por slot;
- agendamentos por slot temporal;
- leitura de disponibilidade por janela semanal maior.

Isso aproxima a experiencia da captura semanal do Vetus sem abandonar o contrato atual do sistema.

### 5.5 Legenda operacional

Foi adicionada uma legenda visual ao modulo com:

- status visiveis da agenda;
- marcadores derivados do contexto do compromisso.

Essa camada melhora legibilidade e reforca uso continuado pelo operacional.

### 5.6 Filtros locais e marcadores derivados

Sem exigir backend novo nesta rodada, foi criada uma camada frontend para:

- filtrar por cliente/tutor usando cache de nomes;
- filtrar por marcador;
- derivar marcadores como:
  - `Retorno`
  - `Vacina`
  - `Vermífugo`
  - `Ajuste operacional`
  - `Sem profissional`

Isso trouxe parte da densidade operacional da referencia sem falsificar contrato de API.

### 5.7 KPIs coerentes com o que está visivel

Os cards de resumo passaram a refletir os itens realmente visiveis apos filtros locais.

Isso evita descompasso entre:

- dados filtrados na grade;
- e numeros exibidos no topo.

---

## 6. O que nao foi alterado nesta rodada

Para manter honestidade de escopo:

- nao foi criado endpoint agregado novo de agenda;
- nao foi implementado backend persistente de marcadores;
- nao houve remodelagem do contrato de scheduling overview;
- nao foi refeito o modal de cliente, apenas preservado e mantido como base centrada no cliente;
- nao houve alteracao do dominio de disponibilidade/availability.

Leitura correta:

- a rodada focou em **fechar gaps reais de construcao frontend**;
- nao em inflar o escopo com trabalho estrutural nao necessario.

---

## 7. Validacao executada

| Comando | Resultado |
|---|---|
| `pnpm exec vitest run src/pages/appointments/__tests__/AppointmentsListPage.test.ts --config vitest.config.ts` em `apps/spa` | `PASS` |
| `pnpm exec vue-tsc --noEmit --pretty false` em `apps/spa` | `PASS` |

Cobertura adicionada/ajustada:

- renderizacao do cockpit da agenda;
- presenca de coluna profissional;
- presenca de legenda operacional;
- presenca do filtro `Cliente/Tutor`;
- transicao para visao semanal com novo carregamento do overview;
- preservacao do fluxo de criacao centrado no cliente.

---

## 8. Resultado apos a melhoria

Depois desta rodada, a agenda do `cvg-his-v2` fica mais proxima da referencia Vetus em pontos centrais:

- cabecalho operacional mais alinhado;
- mini calendario lateral como contexto permanente;
- filtros mais densos e claros;
- visao semanal mais crivel e util;
- legenda operacional com melhor leitura;
- criacao ainda centrada no cliente;
- continuidade entre agenda, fila e encounter preservada.

Leitura objetiva:

- o modulo ja era forte;
- agora esta mais coerente com a referencia;
- e o gap restante ficou menor e mais localizado.

---

## 9. Gaps remanescentes

Ainda existem pontos que podem evoluir em rodadas futuras:

1. marcadores persistentes e governados por backend;
2. filtros laterais ainda mais ricos por cliente/servico/status no estilo “cards operacionais”;
3. maior densidade visual por profissional na visao dia;
4. expansao do fluxo rapido para cobrir mais etapas inline;
5. melhor suporte a cenarios de alta densidade horizontal e responsividade extrema.

Esses gaps sao de aprofundamento, nao de ausencia estrutural.

---

## 10. Proximos passos recomendados

1. persistir marcadores de agenda no backend;
2. ampliar os filtros laterais com estados mais ricos por cliente, servico e profissional;
3. avaliar se a visao diaria deve ganhar mais recursos de “slot board” para cenarios com muitas especialidades;
4. documentar formalmente no backlog enterprise que a agenda SPA ja se encontra em nivel alto de aderencia operacional;
5. registrar screenshots atuais da agenda do SPA para evidencia comparativa futura.

---

## 11. Conclusao

A conclusao desta rodada e direta:

- o modulo Agenda do `cvg-his-v2` **ja tinha base forte**;
- a comparacao com o Vetus mostrou **gaps reais, mas localizados**;
- esses gaps foram tratados principalmente na camada de UX operacional e leitura semanal;
- a entrega atual fica mais coerente com a ideia de **cockpit ambulatorial multiprofissional** descrita na referencia.

O sistema ainda nao replica integralmente toda a profundidade do Vetus, mas a construcao do modulo Agenda agora esta mais consistente, mais legivel e mais fiel ao uso operacional continuo.
