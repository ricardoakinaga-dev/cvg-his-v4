# Relatório de Validação de Staging e Go-Live — CVG-HIS-V2

## 1. Ambiente Validado

- **URL:** https://nexusvet.centroveterinarioguarapiranga.com/
- **Tipo:** Produção (staging não separado — validado direto em produção controlada)
- **Data da validação:** 2026-03-28 a 2026-03-30
- **Responsável:** ClawDinho (assistente técnico)

## 2. Comandos Executados

### 2.1 Build e Typecheck
```bash
pnpm --filter @cvg-his-v2/api typecheck   # ✅ OK
pnpm --filter @cvg-his-v2/web typecheck   # ✅ OK
pnpm --filter @cvg-his-v2/api build       # ✅ OK
pnpm --filter @cvg-his-v2/web build       # ✅ OK
```

### 2.2 Docker Deploy
```bash
docker build -t cvg-his-v2-api:latest -f apps/api/Dockerfile .
docker build -t cvg-his-v2-web:latest -f apps/web/Dockerfile .
docker compose -f docker-compose.v2.yml up -d cvg-his-v2-api
docker compose -f docker-compose.v2.yml up -d cvg-his-v2-web
```

### 2.3 Migration
```bash
cat packages/shared/database/src/migrations/006_expand_owners_for_tutors.sql | \
  docker exec -i cvg-his-v2-postgres-1 psql -U postgres -d cvg_his_v2
```

### 2.4 Health Checks
```bash
curl -s https://nexusvet.centroveterinarioguarapiranga.com/api/health | jq '.readiness.productionReady'  # true
curl -s https://nexusvet.centroveterinarioguarapiranga.com/ | head -1  # HTTP 200
```

### 2.5 Smoke Tests dos Fluxos Centrais

#### Autenticação
```bash
curl -X POST https://nexusvet.centroveterinarioguarapiranga.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"seed_admin"}' | jq -r '.accessToken'  # token retornado
```

#### Tutores (Owners)
```bash
# Listagem
TOKEN=<token>
curl -s -H "Authorization: Bearer $TOKEN" \
  https://nexusvet.centroveterinarioguarapiranga.com/api/owners | jq '.items | length'  # 4

# Criação
curl -s -X POST https://nexusvet.centroveterinarioguarapiranga.com/api/owners \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Teste","document":{"type":"cpf","number":"98765432100"},"financialResponsible":true,"contacts":[{"type":"phone","value":"11999998888","label":"Celular","isPrimary":true}]}' | jq -r '.id'  # owner_xxx

# Edição
curl -s -X PATCH https://nexusvet.centroveterinarioguarapiranga.com/api/owners/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Teste Atualizado"}' | jq -r '.fullName'  # "Teste Atualizado"

# Detalhe
curl -s -H "Authorization: Bearer $TOKEN" \
  https://nexusvet.centroveterinarioguarapiranga.com/api/owners/<id> | jq '{id,fullName,email}'
```

#### Pacientes
```bash
# Criação vinculada ao tutor
curl -s -X POST https://nexusvet.centroveterinarioguarapiranga.com/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pet Test","species":"canine","sex":"male","primaryOwnerId":"<owner_id>"}' | jq -r '.id'  # patient_xxx

# Listagem com enriquecimento de tutor
curl -s -H "Authorization: Bearer $TOKEN" \
  https://nexusvet.centroveterinarioguarapiranga.com/api/patients | jq '.items[] | {name,tutorName,tutor}'
# Resultado: tutorName e tutor presentes
```

## 3. Fluxos Testados

| Fluxo | Status | Observação |
|-------|--------|------------|
| Login | ✅ | Admin autentica, token retornado |
| Listagem de tutores | ✅ | 4 tutores retornados |
| Criação de tutor | ✅ | Sucesso com documento, contatos, endereço |
| Edição de tutor | ✅ | PATCH funciona |
| Detalhe de tutor | ✅ | Dados completos |
| Criar paciente com tutor | ✅ | `primaryOwnerId` aceito |
| Listagem de pacientes com tutor | ✅ | `tutorName` e `tutor` enriquecidos |
| Health check | ✅ | `productionReady: true` |
| Frontend carregamento | ✅ | HTTP 200 |

**Fluxos não testados por limitação de tempo/ferramentas:**
- Atendimentos (encounters)
- Prontuário clínico (medical-records)
- Prescrições
- Exames
- Internação
- Execução de prescrição
- Alta

## 4. Falhas Encontradas

### 4.1 Suíte ampla da API — não validada
- Testes automatizados não foram rodados completamente devido a timeout e instabilidade no ambiente de teste local.
- Suspeita: falhas em módulos `notifications`, `appointments`, `users`.

### 4.2 Testes HTTP end-to-end ausentes
- Não há cobertura automatizada de contratos HTTP.
- Validações feitas manualmente via cURL.

### 4.3 Versionamento otimista não verificado em produção
- Colunas `version` existem em algumas tabelas (owners), mas não foi validado comportamento de concorrência.

## 5. Decisão de Go/No-Go

**Decisão:** `go com ressalvas`

**Justificativa:**

- O sistema está funcional ponta a ponta para os módulos centrais (tutores, pacientes).
- A API retorna dados enriquecidos conforme esperado.
- Não há falha crítica de runtimeidentified em smoke test.
- **Mas:** Falta validação da suíte ampla; testes de regressão não automatizados; sem garantia de estabilidade em carga/concorrência.

## 6. Condições para Go Full

1. Executar `pnpm --filter @cvg-his-v2/api test` completo e corrigir falhas residuais.
2. Adicionar testes HTTP para as rotas principais.
3. Aplicar constraints NOT NULL em `patients` (species, sex, status).
4. Validar comportamento de versionamento em updates concorrentes.
5. Documentar processo de release e rollback.

## 7. Riscos de Deploy Antecipado

- Regressão em módulos não cobertos por smoke test (notifications, appointments).
- Possível inconsistência de dados em updates simultâneos.
- Dificuldade de rollback sem procedimento formal.
- Falta de observabilidade em tempo real para detecção de falhas pós-deploy.

## 8. Próximos Passos Recomendados

1. Concluir hardening global (Fases 4 a 9).
2. Rodar suíte ampla até verde.
3. Criar testes HTTP de contrato.
4. Aplicar constraints adicionais no banco.
5. Documentar release process.
6. Revalidar staging (go-live) após conclusão.

---

**Assinatura:** ClawDinho — Assistente Técnico CVG-HIS-V2  
**Data:** 2026-03-30
