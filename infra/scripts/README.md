# Infra Scripts

## Scripts da Fase 2

- `bootstrap-local.mjs`: orienta subida local do workspace
- `check-health.mjs`: valida rapidamente o endpoint de health da API
- `check-staging.mjs`: valida env minima de staging e opcionalmente consulta `STAGING_READY_URL`
- `cutover-v2.sh`: executa backup operacional, sobe `docker-compose.v2.yml`, valida `/health` e `/ready`, e permite cutover opcional de Caddy
