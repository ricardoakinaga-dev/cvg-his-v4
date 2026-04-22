# Baseline visual congelado — shell Vetus-aligned consolidado

Data: 2026-04-22
Repositório: `/root/cvg-his-v2`
Escopo: shell compartilhado SPA após quatro rodadas curtas de refino visual

## Objetivo
Congelar formalmente o estado atual do shell como baseline visual do produto antes de retomar a evolução funcional dos módulos.

A partir deste ponto:
- o shell deixa de ser a frente principal de trabalho;
- ajustes visuais futuros no shell devem ser pontuais e justificáveis;
- novas ondas devem priorizar comportamento de produto e profundidade funcional.

## Escopo congelado
O baseline visual congelado cobre principalmente:
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/components/AppPageHeader.vue`
- `apps/spa/src/pages/DashboardPage.vue`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`

## Estado visual considerado baseline

### 1. Topbar
Baseline aprovado para:
- barra branca estável;
- identidade do produto no topo;
- botão de recolher/expandir menu lateral;
- busca global como ação primária do shell;
- agrupamento consistente de utilitários;
- chip de usuário + ação de saída;
- breadcrumbs do shell acima do conteúdo.

### 2. Sidebar
Baseline aprovado para:
- contexto explícito de empresa no topo;
- busca local da navegação;
- grupos principais alinhados ao benchmark Vetus:
  - Início
  - Atendimento
  - Laboratório
  - Estoque
  - Financeiro
  - Marketing
  - RH
  - Relatórios
- subgrupos em corpo claro e estável;
- área de utilitários separada do tronco operacional.

### 3. Dashboard inicial
Baseline aprovado para:
- shell sem redundância estrutural excessiva no topo;
- hero/card inicial coerente com a linguagem do restante da página;
- KPIs operacionais em grade estável;
- blocos `Acesso rápido`, `Recentes` e `Favoritos` como superfícies secundárias previsíveis.

## Evidência principal
Commits que materializam o baseline:
- `9cb30a6` — `feat(spa): realign vetus shell navigation layout`
- `fa4a403` — `feat(spa): refine vetus shell visual hierarchy`
- `a4c5535` — `feat(spa): polish vetus shell consistency`

Última validação visual autenticada desta linha:
- screenshot: `/root/.hermes/cache/screenshots/browser_screenshot_1eeda325a9714e8ca0d45ef517f3f24f.png`

## Critérios de congelamento
O shell é considerado congelado para baseline porque:
1. a arquitetura de navegação está alinhada ao benchmark;
2. o shell autenticado já transmite hierarquia de produto consistente;
3. os desvios restantes são de microacabamento, não de estrutura;
4. continuar priorizando shell agora teria retorno menor do que retomar a frente funcional.

## Regras para mudanças futuras no shell
Mudanças futuras no shell só devem acontecer se atenderem pelo menos um destes critérios:
- corrigir regressão visual real;
- atender necessidade funcional nova que dependa do shell compartilhado;
- resolver problema claro de UX medido em fluxo real;
- alinhar componente compartilhado que afeta várias superfícies de uma vez.

Evitar:
- novas ondas amplas de polimento sem impacto funcional;
- mudanças cosméticas isoladas sem motivação operacional;
- retrabalho da hierarquia topbar/sidebar já estabilizada.

## Validação mínima associada ao baseline
Suíte mínima que deve continuar verde para proteger este baseline:
- `npm test -- src/navigation.test.ts src/router/routes.test.ts src/components/__tests__/AppPageHeader.test.ts`
- `npm run build`

## Conclusão
O shell Vetus-aligned está formalmente congelado como baseline visual do projeto.

O próximo ciclo do produto deve voltar a priorizar:
- profundidade funcional;
- backend dedicado onde fizer sentido;
- maturidade operacional dos módulos já expostos no menu.
