## Checklist de Merge

### Gates obrigatórios (devem estar verdes)

- [ ] `typecheck` — TypeScript compila
- [ ] `validate-openapi` — OpenAPI spec válida
- [ ] `build` — Compilação OK
- [ ] `unit-tests` — Testes unitários passando
- [ ] `integration-tests` — Testes de integração passando

### Checks informativos (não bloqueiam, mas vale dar uma olhada)

- [ ] `coverage` — Algum módulo com coverage muito baixo?
- [ ] `test-e2e-spa` — Falhou em algum teste novo?
- [ ] `test-visual` — Se falhou, mudanças são intencionais?

### Se `test-visual` falhou

Se o CI de visual regression falhou e as mudanças visuais são **intencionais**:

```bash
# Atualize o baseline localmente
pnpm test:visual:update

# Commit as mudanças
git add e2e/spa/snapshots/
git commit -m "feat(visual): update baseline"
```

Se as mudanças são **involuntárias** (bug), corrija o código e não o baseline.

Ver também: [docs/Enterprise/1060-VISUAL-REGRESSION-WORKFLOW.md](docs/Enterprise/1060-VISUAL-REGRESSION-WORKFLOW.md)

---

### Mudanças em `apps/api/src/openapi.yaml`

Se você adicionou/modificou endpoints da API:

- [ ] `validate-openapi` passou?
- [ ] A spec reflete corretamente o que foi implementado?

Ver também: [docs/Enterprise/1050-API-PREMIUM-OPENAPI.md](docs/Enterprise/1050-API-PREMIUM-OPENAPI.md)
