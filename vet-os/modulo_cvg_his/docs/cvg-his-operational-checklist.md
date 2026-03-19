# CVG-HIS — Plano operacional (checklist)

## A. Saneamento do his-api
- [ ] Capturar baseline atual do build/teste global do `his-api`
- [ ] Corrigir configuração TypeScript/monorepo (`rootDir`, resolução entre packages, imports cross-package)
- [ ] Rerodar build global do `his-api`
- [ ] Classificar erros remanescentes em: estrutural / tipagem / regra de negócio
- [ ] Corrigir erros estruturais restantes
- [ ] Rerodar testes principais do `his-api`
- [ ] Validar que a stack Docker continua íntegra após os ajustes
- [ ] Registrar baseline limpa e pendências residuais

## B. Fechamento do R3.1 ponta a ponta
- [ ] Revisar contratos finais de `services` e `products`
- [ ] Validar rotas/backend do catálogo comercial mínimo
- [ ] Integrar `his-web` às rotas reais de catálogo
- [ ] Revisar permissões/RBAC no frontend
- [ ] Testar fluxo real de criação, edição e listagem
- [ ] Corrigir bordas de UX/validação
- [ ] Confirmar persistência no Postgres
- [ ] Registrar fluxo utilizável no ambiente local

## C. Preparação executiva do R3.2/R3.3
- [ ] Quebrar R3.2 billing em entregas pequenas
- [ ] Definir dependências de billing sobre catálogo
- [ ] Delimitar o que agenda (R3.3) pode esperar
- [ ] Consolidar ordem recomendada: R3.1 → R3.2 → R3.3

## Execução iniciada
- [x] Checklist operacional criado
- [x] Baseline do build do `his-api` capturada
- [x] Primeira correção estrutural aplicada (`rootDir` removido de `his-api`/`his-worker`)
- [x] Build do `@cvg-his/db` validado
- [x] Build do `@cvg-his/his-worker` validado
- [x] Primeiro lote de saneamento aplicado no `his-api` (env de testes, imports ESM, casts de DTO em rotas)
- [ ] Próximo lote: erros remanescentes de tipagem em handovers, protocolVersions, patientContext, encounterBilling e wards
