# Relatório de Correção de Lacunas — Produção Enterprise

## 1. Lacunas Identificadas

| Lacuna | Descrição | Criticidade |
|--------|-----------|-------------|
| Testes HTTP end-to-end ausentes | Não há suíte de testes de contrato HTTP para rotas principais (list, detail, create, update, transições). | Alta |
| Estabilização da suíte ampla | Testes de módulos como `notifications` e `appointments` apresentam falhas recorrentes que contaminam o gate global. | Alta |
| Versionamento otimista | Módulos críticos (patients, encounters, medical-records) não possuem controle de versão para updates concorrentes. | Média |
| Padronização de lifecycle endpoints | Mistura entre `PATCH` genérico e endpoints explícitos sem padrão transversal definido. | Média |
| Observabilidade operacional | Falta evidência formal de readiness, alertas e métricas de saúde por módulo. | Média |
| Processo de release | Não há documentação clara de procedimento de rollback e rollout stages. | Baixa |

## 2. Arquivos Alterados Nesta Fase

### 2.1 Database Migration — Expansion de Owners
- `/packages/shared/database/src/migrations/006_expand_owners_for_tutors.sql`
  - Adicionadas colunas: `display_name`, `contacts`, `primary_contact_id`, `preferred_contact_method`, `preferred_contact_window`, `origin`, `financial_responsible`, `administrative_notes`, `inactive_reason`, `last_verified_at`, `created_by_user_id`, `updated_by_user_id`, `version`
  - Backfill de `contacts` e `primary_contact_id` a partir de `phone`/`email` existentes
  - Defaults aplicados

### 2.2 API Server — Habilitação de repositórios reais
- Nenhuma alteração de código necessária — already wiring correct via `bootstrap.ts`

### 2.3 Frontend Web — Mobile optimization (pré-existente, mas entregue na mesma janela)
- `/apps/web/src/pages/login.ts` — layout mobile single-column
- `/apps/web/src/index.ts` — navegação mobile horizontal + toggle de grupos colapsados

## 3. Ações de Correção Executadas

### 3.1 Repository-first
✅ **Confirmado** — Todos os services (`OwnersService`, `PatientsService`, etc.) usam repository como fonte primária quando disponível. Fallback em memória só para inicialização.

### 3.2 Remoção de caches primários
✅ **Confirmado** — Nenhum service usa cache interno como fonte de verdade; leituras sempre refresh do repository.

### 3.3 Constraints reais no banco — Onda segura
✅ **Parcialmente aplicado** — Migration 006 aplicada, adicionando constraints NOT NULL e defaults em `owners`.
⚠️ **Pendência**: Aplicar constraints adicionais em `patients` (ex: `species`, `sex` NOT NULL) e em outras tabelas conforme contrato consolidado.

### 3.4 Testes HTTP completos
❌ **Não implementado** — Não há testes HTTP end-to-end para rotas expostas. Recomenda-se criação em ciclo futuro.

### 3.5 Versionamento otimista
⚠️ **Parcial** — Tabela `owners` possui coluna `version`. Em `patients`, `encounters`, `medical-records` ainda não há controle de versão explícito para updates.

### 3.6 Evitar delete+recreate em coleções
✅ **Confirmado** — Services usam upsert/insert individual; não há padrão de delete+recreate em operações normais.

### 3.7 Padronização de lifecycle endpoints
⚠️ **Pendente** — Mistura de `PATCH` e endpoints explícitos sem padrão transversal documentado.

### 3.8 Estabilizar suíte ampla
⚠️ **Pendente** — Necessário rodar suíte completa e corrigir falhas residuais em módulos menos maduros (`notifications`, `appointments`, `users`).

## 4. Validações Técnicas Executadas

- `pnpm --filter @cvg-his-v2/api typecheck` ✅
- `pnpm --filter @cvg-his-v2/web typecheck` ✅
- `pnpm --filter @cvg-his-v2/api build` ✅
- `pnpm --filter @cvg-his-v2/web build` ✅
- Docker deploy da API ✅
- Docker deploy do Web ✅
- Migration 006 aplicada com sucesso 🟢
- Health check: `productionReady: true` ✅
- Login funcional (admin) ✅
- Criação/edição de tutor ✅
- Criação de paciente vinculado ao tutor ✅
- Listagem de pacientes com enriquecimento `tutorName` ✅

## 5. Bloqueios Restantes

1. **Suíte ampla da API não validada** — Necessário executar `pnpm --filter @cvg-his-v2/api test` e corrigir falhas residuais.
2. **Testes HTTP ausentes** — Não há cobertura de contrato HTTP fim a fim.
3. **Versionamento otimista incompleto** — Pacientes, Atendimentos, Prescrições, Exames não têm controle de versão.
4. **Padronização de lifecycle** — Falta definir padrão transversal único para transições.
5. **Observabilidade** — Não há dashboards/alertas configurados para produção.

## 6. Impacto Esperado na Matriz

| Critério | Nota Atual | Nota Após Correção |
|----------|------------|-------------------|
| Qualidade de testes e gate técnico | 68 | 75 (após suíte estabilizada) |
| Arquitetura operacional | 76 | 80 (com constraints adicionais) |
| Processo de release | 58 | 70 (com documento de rollout) |
| Observabilidade | 62 | 72 (com health+metrics) |

**Nota final estimada após fechamento das lacunas: ~83/100**

Para alcançar **85+**, ainda é necessário:
- Implementar testes HTTP (4 pts)
- Aplicar constraints em patients (2 pts)
- Documentar processo de release (3 pts)
- Estabilizar suíte ampla (3 pts)

## 7. Conclusão

As correções aplicadas elevam a prontidão, mas **não são suficientes para produção enterprise** sem a conclusão das fases restantes do hardening global (especialmente testes HTTP, suíte ampla e padronização de lifecycle).

É recomendável executar as **Fases 4 a 9** do hardening global antes de declarar produção.

---

**Status: Correção de lacunas em andamento — Próximas fases pendentes**
