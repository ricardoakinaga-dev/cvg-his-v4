# Release e Rollback Procedure — CVG-HIS-V2 Enterprise

## 1. Visão Geral

Este documento descreve o procedimento mínimo para deployment e rollback do CVG-HIS-V2 em ambiente de produção enterprise.

## 2. Pré-requisitos para Deploy

- [ ] Build da API e Web bem-sucedido
- [ ] Typecheck completo verificado
- [ ] Testes de suíte ampla passando
- [ ] Migrations aplicadas no banco (ordem correta)
- [ ] Health check reportando `productionReady: true`
- [ ] Acesso ao servidor de produção com permissões Docker

## 3. Deploy Staged

### 3.1 Build das imagens

```bash
cd /root/.openclaw/workspace/cvg-his-v2
docker build -t cvg-his-v2-api:latest -f apps/api/Dockerfile .
docker build -t cvg-his-v2-web:latest -f apps/web/Dockerfile .
```

### 3.2 Tag para compose

```bash
docker tag cvg-his-v2-api:latest cvg-his-v2-cvg-his-v2-api:latest
docker tag cvg-his-v2-web:latest cvg-his-v2-cvg-his-v2-web:latest
```

### 3.3 Pull e restart controlado

```bash
docker compose -f docker-compose.v2.yml up -d --no-deps --build cvg-his-v2-api
docker compose -f docker-compose.v2.yml up -d --no-deps --build cvg-his-v2-web
```

### 3.4 Health check

```bash
curl -s https://nexusvet.centroveterinarioguarapiranga.com/api/health | jq '.readiness'
```

Aguardar até `productionReady: true`.

## 4. Validação Pós-Deploy (Smoke Tests)

Executar manualmente ou via script:

```bash
# 1. Autenticação
TOKEN=$(curl -s -X POST https://nexusvet.centroveterinarioguarapiranga.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"seed_admin"}' | jq -r '.accessToken')

# 2. Owners
curl -s -H "Authorization: Bearer $TOKEN" https://nexusvet.centroveterinarioguarapiranga.com/api/owners | jq '.items | length' || echo "FAIL owners"

# 3. Patients
curl -s -H "Authorization: Bearer $TOKEN" https://nexusvet.centroveterinarioguarapiranga.com/api/patients | jq '.items | length' || echo "FAIL patients"

# 4. Encounters
curl -s -H "Authorization: Bearer $TOKEN" https://nexusvet.centroveterinarioguarapiranga.com/api/encounters | jq '.items | length' || echo "FAIL encounters"
```

Todos devem retornar HTTP 200 e JSON válido.

## 5. Rollback

### 5.1 Condições para rollback

- Health check reportando `productionReady: false` por mais de 2 minutos
- Erro 5xx em mais de 5% das requisições em 5 minutos
- Falha em smoke tests críticos

### 5.2 Procedimento

1. Identificar a imagem anterior (logger ou `docker images --filter=reference='*cvg-his-v2*' --format='{{.Repository}}:{{.Tag}} {{.ID}}'`)
2. Retaggear:

```bash
docker tag <previous_image_id> cvg-his-v2-cvg-his-v2-api:latest
docker tag <previous_image_id> cvg-his-v2-cvg-his-v2-web:latest
```

3. Reiniciar containers:

```bash
docker compose -f docker-compose.v2.yml up -d --no-deps cvg-his-v2-api
docker compose -f docker-compose.v2.yml up -d --no-deps cvg-his-v2-web
```

4. Validar health e smoke tests novamente.

## 6. Migrations

- Aplicar como parte do deploy, antes de subir a API.
- Ordene por número crescente.
- Toda migration deve ser idempotente (usar `IF NOT EXISTS`).
- Backfill de dados deve ser incluído na mesma migration.

## 7. Monitoração Pós-Deploy

- Acompanhar logs por 10 minutos: `docker logs -f cvg-his-v2-cvg-his-v2-api-1`
- Verificar métricas de erro no Caddy e API.
- Alertas configurados no servidor (fora do escopo deste documento).

## 8. Checklist de Pré-Produção

- [ ] Docker images construídas e testadas
- [ ] Typecheck passou
- [ ] Build passou
- [ ] Suíte ampla verde
- [ ] Migrations aplicadas
- [ ] Health check OK
- [ ] Smoke tests OK
- [ ] Rollback plan validado (imagem anterior identificada)
- [ ] Equipe de operações comunicada

## 9. Contatos

- Desenvolvedor responsável: ClawDinho (assistente técnico)
- Equipe de Infraestrutura: (a definir)

## 10. Versionamento

Esta procedure versão 1.0 — 2026-03-30.
