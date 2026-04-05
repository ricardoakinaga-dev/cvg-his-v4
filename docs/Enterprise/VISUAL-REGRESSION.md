# Visual Regression — Guia de Uso e Manutenção

> **Fases:** 2.27b (baseline + estabilização) + 2.28 (CI + detail pages)
> **Última atualização:** 05/04/2026

---

## Visão Geral

A suite de visual regression captura screenshots de páginas da SPA Vue 3 para detectar regressões visuais não intencionais. Ela roda localmente e no CI, com baseline versionado no repositório.

### Cobertura Atual

| Categoria    | Páginas                                                                            | Snapshots        |
| ------------ | ---------------------------------------------------------------------------------- | ---------------- |
| List Pages   | Login, Owners, Patients, Appointments (Kanban), Encounters, Inpatient, Billing     | 7                |
| Detail Pages | Owner Detail, Patient Detail, Encounter Detail, Billing Detail, Appointment Detail | 5                |
| **Total**    | **12 páginas**                                                                     | **12 snapshots** |

---

## Como Executar

### Pré-requisitos

- API rodando em `http://localhost:3001`
- SPA rodando em `http://localhost:3002`
- Banco de dados com dados seed (para páginas autenticadas)

### Comandos

| Comando                   | Descrição                                   |
| ------------------------- | ------------------------------------------- |
| `pnpm test:visual`        | Executa todos os testes visuais (headless)  |
| `pnpm test:visual:update` | Gera/atualiza baseline de snapshots         |
| `pnpm test:visual:headed` | Executa com navegador visível (debug)       |
| `pnpm test:e2e:spa`       | Executa todos os E2E da SPA (inclui visual) |

### Execução Direta com Playwright

```bash
# Todos os testes visuais
npx playwright test --config playwright-spa.config.ts -g "Visual"

# Atualizar snapshots (gerar baseline)
npx playwright test --config playwright-spa.config.ts -g "Visual" --update-snapshots

# Teste específico
npx playwright test --config playwright-spa.config.ts -g "login page"

# Com navegador visível
npx playwright test --config playwright-spa.config.ts -g "Visual" --headed
```

---

## Como Gerar o Baseline

O baseline é o conjunto de screenshots de referência contra o qual futuras execuções são comparadas.

### Primeira vez (ou após mudanças visuais intencionais)

```bash
# 1. Garanta que a API e SPA estão rodando com dados consistentes
# 2. Execute com --update-snapshots para gerar o baseline
pnpm test:visual:update
```

Os snapshots serão salvos em:

```
e2e/spa/snapshots/visual/visual-regression.spec.ts/
├── login-page.png
├── owners-list-page.png
├── patients-list-page.png
├── appointments-kanban-page.png
├── encounters-list-page.png
├── inpatient-list-page.png
├── billing-list-page.png
├── owner-detail-page.png
├── patient-detail-page.png
├── encounter-detail-page.png
├── billing-detail-page.png
└── appointment-detail-page.png
```

### Commit do baseline

```bash
git add e2e/spa/snapshots/
git commit -m "feat(visual): update baseline snapshots"
```

---

## Estabilização Visual

### Problemas Endereçados

A suite aplica estabilização automática para eliminar falsos positivos causados por:

| Fator de Instabilidade        | Estratégia                                        |
| ----------------------------- | ------------------------------------------------- |
| Animações CSS (shimmer, spin) | CSS injection: `animation-duration: 0.001s`       |
| Transições CSS (hover, focus) | CSS injection: `transition-duration: 0.001s`      |
| Skeleton loaders animados     | CSS injection: remove shimmer keyframes           |
| Spinners de loading           | CSS injection: remove ds-spin keyframes           |
| Tema dark/light               | Força tema light via localStorage + CSS           |
| Sidebar colapsada             | Força sidebar expandida via localStorage          |
| Nome do usuário no topbar     | CSS: `visibility: hidden`                         |
| Timestamps em tabelas         | CSS: `color: transparent` em seletores conhecidos |
| UUIDs truncados               | CSS: redação via seletores de classe              |

### Helper Reutilizável

O módulo `e2e/spa/visual/stabilize-visual.ts` exporta:

- `stabilizeVisual(page, options?)` — aplica CSS de estabilização
- `waitForPageSettled(page, options?)` — espera determinística por conteúdo
- `pageProfiles` — perfis pré-configurados por tipo de página

### Perfis de Página

```ts
pageProfiles.login; // Login: sem hide de UUIDs/timestamps
pageProfiles.listPage; // Listas: estabilização completa
pageProfiles.detailPage; // Detalhes: estabilização completa
pageProfiles.kanbanPage; // Kanban: sem hide de timestamps (horários são dados)
```

---

## Quando Atualizar Snapshots

### Atualize o baseline quando:

- Mudanças visuais intencionais foram feitas (design, layout, cores)
- Novos componentes foram adicionados às páginas snapshotadas
- O design system foi atualizado com mudanças visuais
- Após atualizar dependências que afetam rendering (ex: Chrome version)

### NÃO atualize o baseline quando:

- O teste falhou por mudança não intencional (investigar o bug)
- Dados de teste mudaram (verificar seed do banco)
- Falha intermitente (rodar novamente antes de atualizar)

---

## No CI

### Job Dedicado

O workflow `.github/workflows/ci.yml` inclui um job `test-visual` que:

1. Sobe PostgreSQL + Redis
2. Aplica schema e seed no banco
3. Inicia API + SPA
4. Executa apenas testes visuais (`-g "Visual"`)
5. Faz upload de artifacts em caso de falha

### Artifacts em Caso de Falha

| Artifact                   | Conteúdo                                    | Retenção |
| -------------------------- | ------------------------------------------- | -------- |
| `visual-regression-report` | HTML report do Playwright                   | 30 dias  |
| `visual-regression-diffs`  | `.diff.png`, `.actual.png`, `.expected.png` | 14 dias  |
| `visual-test-results`      | Test results directory                      | 14 dias  |

### Investigando Falhas no CI

1. Baixe o artifact `visual-regression-diffs`
2. Compare `.diff.png` (diferenças destacadas em rosa)
3. Compare `.actual.png` (screenshot atual) vs `.expected.png` (baseline)
4. Se a mudança é intencional: atualize baseline localmente e commit
5. Se a mudança é bug: investigue a causa e corrija

---

## Thresholds por Página

Cada snapshot tem um `maxDiffPixels` calibrado:

| Snapshot                     | Threshold | Justificativa                        |
| ---------------------------- | --------- | ------------------------------------ |
| login-page.png               | 50        | Página estática, sem dados dinâmicos |
| owners-list-page.png         | 100       | Dados seed consistentes              |
| patients-list-page.png       | 100       | Dados seed consistentes              |
| appointments-kanban-page.png | 150       | Kanban com mais elementos visuais    |
| encounters-list-page.png     | 100       | Dados seed consistentes              |
| inpatient-list-page.png      | 100       | Dados seed consistentes              |
| billing-list-page.png        | 100       | Dados seed consistentes              |
| owner-detail-page.png        | 120       | Mais conteúdo, mas dados estáveis    |
| patient-detail-page.png      | 120       | Mais conteúdo, mas dados estáveis    |
| encounter-detail-page.png    | 150       | Timeline de eventos pode variar      |
| billing-detail-page.png      | 150       | Itens de cobrança podem variar       |
| appointment-detail-page.png  | 150       | Detalhes podem variar por dados      |

---

## Limitações Conhecidas

1. **Detail pages dependem de dados existentes** — Se não houver registros no banco, o teste é skipped. Isso é intencional para evitar snapshots de empty state que não representam o uso real.

2. **Dados seed variam entre ambientes** — O baseline deve ser gerado com o mesmo seed usado no CI. Use `prepare-test-db.mjs` para consistência.

3. **Intl locale** — Formatação de datas/moedas depende do locale do sistema. O config força `locale: 'pt-BR'` e `timezoneId: 'America/Sao_Paulo'` para consistência.

4. **Font rendering** — Diferenças de font rendering entre sistemas operacionais podem causar diffs menores. O config usa `--font-render-hinting=none` para minimizar isso.

5. **Detail pages não cobrem todos os estados** — Apenas o "primeiro item" da lista é snapshotado. Páginas com dados diferentes podem ter aparência diferente.

---

## Próximos Passos Recomendados

- [ ] Adicionar snapshots de formulários (OwnerForm, PatientForm, EncounterForm)
- [ ] Adicionar snapshots de empty states para todas as páginas
- [ ] Configurar threshold por região (ignore regions para elementos inevitavelmente dinâmicos)
- [ ] Adicionar visual regression para modo dark theme
- [ ] Adicionar visual regression para responsividade (mobile viewport)
- [ ] Integrar com Percy/Chromatic para review visual em PRs
- [ ] Adicionar snapshots de Medical Records detail page
- [ ] Adicionar snapshots de Inpatient detail page
- [ ] Adicionar snapshots de Bed Board page

---

## Estrutura de Arquivos

```
e2e/spa/
├── visual/
│   ├── visual-regression.spec.ts    # Testes de visual regression
│   └── stabilize-visual.ts          # Helper de estabilização visual
├── snapshots/
│   └── visual/
│       └── visual-regression.spec.ts/
│           ├── login-page.png
│           ├── owners-list-page.png
│           ├── ...
│           └── appointment-detail-page.png
├── fixtures/
│   └── spa-fixture.ts               # Fixtures E2E compartilhadas
└── *.spec.ts                        # Outros testes E2E

playwright-spa.config.ts             # Configuração Playwright
```
