# Progresso Fase 4 - Onboarding operacional Premium

Data: 2026-05-28

## Objetivo

Avancar a experiencia Premium levando parte do guia operacional para dentro da SPA, sem criar uma tela de marketing. A tela inicial passa a orientar demo, piloto e suporte com passos acionaveis.

## Entregue

- Adicionado o bloco `Roteiro operacional Premium` na tela inicial `/`.
- O roteiro apresenta cinco passos com links reais:
  - entrada pela recepcao em `/reception`;
  - busca federada em `/master-search`;
  - cockpit 360 a partir de `/owners`;
  - auditoria em `/audit`;
  - SLO e suporte em `/api-client`.
- O bloco fica abaixo da `Central executiva Premium`, conectando leitura executiva com acao operacional.
- O layout foi criado como uma grade responsiva, mantendo dimensoes estaveis para desktop e mobile.
- O teste da tela inicial passou a validar os textos do roteiro operacional.

## Evidencias tecnicas

- `apps/spa/src/pages/DashboardPage.vue`
- `apps/spa/src/pages/__tests__/DashboardPage.test.ts`
- `docs/construcoes-futuras/2026-05-28-guia-operacional-premium-enterprise.md`

## Validacao executada

- `pnpm --dir apps/spa exec vitest run src/pages/__tests__/DashboardPage.test.ts --pool=forks` - 1/1 teste passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.

## Impacto no Premium Enterprise

A tela inicial deixa de ser apenas um painel de indicadores e passa a funcionar como ponto de partida assistido para demo e piloto controlado. Isso reduz friccao para usuarios novos, suporte e decisores, usando rotas ja implementadas.

## Proximos passos recomendados

- Criar uma central de onboarding por perfil quando a matriz RBAC/ABAC estiver estabilizada.
- Adicionar checklists persistentes por unidade/conta para implantacao assistida.
- Conectar o roteiro operacional a evidencias automatizadas dos gates enterprise.

