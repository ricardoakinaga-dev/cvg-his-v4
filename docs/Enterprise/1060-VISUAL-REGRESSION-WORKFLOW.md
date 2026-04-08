# Visual Regression — Workflow Operacional

> Curto. Para consulta rápida quando o CI de visual regression falhar.

---

## Resumo Rápido

| Situação                     | Ação                                         |
| ---------------------------- | -------------------------------------------- |
| CI falhou com diff visual    | Investigue: é bug ou mudança intencional?    |
| Mudança intencional (design) | Atualize baseline localmente e commite no PR |
| Diff pequeno e inesperado    | Corrija o código, não o baseline             |
| Diff por dados de teste      | Verifique se seed do banco está consistente  |
| Falha intermitente           | Rebuild sem mudanças, verifique se persiste  |

---

## Fluxo Detalhado

### 1. CI Falhou — O que fazer?

1. Baixe o artifact `visual-regression-diffs` do workflow run
2. Abra o HTML report (`visual-regression-report`)
3. Compare:
   - `.actual.png` → screenshot que o CI gerou
   - `.expected.png` → baseline atual no repositório
   - `.diff.png` → diferençasHighlighted em rosa

### 2. É mudança intencional?

**Sim, atualize o baseline:**

```bash
# Asegure que API e SPA estão rodando com dados consistentes
pnpm dev:api &
pnpm --filter @cvg-his-v2/spa run dev

# Atualize snapshots
pnpm test:visual:update

# Commit
git add e2e/spa/snapshots/
git commit -m "feat(visual): update baseline — [descrição da mudança]"
```

**Não, é bug:**

- Corrija o código que gerou a regressão
- Não commite mudanças no diretório `snapshots/`
- Rode `pnpm test:visual` localmente para confirmar que o teste passa

### 3. Checklist antes de commitar baseline update

- [ ] A mudança visual foi revisada por alguém do time?
- [ ] O diff é consistente entre múltiplas execuções locais?
- [ ] O PR inclui apenas o update de baseline + a mudança de código?

---

## Regras de Ouro

1. **Baseline update em PR separado?** Preferível, mas não obrigatório. O importante é que o diff do PR mostre claramente o que mudou visualmente.

2. **Baseline update com design system?** Sim, quando o design system muda com impacto visual intencional. Commite junto com a mudança do design.

3. **Grandes mudanças visuais (ex: redesign completo)?** Considere se fazer em stages, atualizando baselines incrementalmente.

4. **Teste passou localmente mas falhou no CI?** Verifique: mesmo seed de banco? Mesmo locale/timezone? Mesma versão do Chrome? threshold adequado para a página?

---

## Comandos Úteis

```bash
# Validar sem fazer update
pnpm test:visual

# Atualizar baseline
pnpm test:visual:update

# Debug com navegador visível
pnpm test:visual:headed

# Apenas uma página
npx playwright test --config playwright-spa.config.ts -g "login page"

# Com update de baseline para uma página
npx playwright test --config playwright-spa.config.ts -g "login page" --update-snapshots
```

---

## thresholds

Thresholds por snapshot estão calibrados no arquivo de teste (`e2e/spa/visual/visual-regression.spec.ts`). Se um diff está constantemente no limite, o threshold pode ser ajustado — mas document o porquê.

| Página                                  | Threshold atual |
| --------------------------------------- | --------------- |
| login                                   | 50 px           |
| lists (owners, patients, encounters...) | 100 px          |
| kanban                                  | 150 px          |
| detail pages                            | 120–150 px      |
