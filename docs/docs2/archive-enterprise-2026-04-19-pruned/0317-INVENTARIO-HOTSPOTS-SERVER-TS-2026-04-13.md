# 0317 - Inventario de Hotspots de `server.ts`

**Status:** concluido para `PR-01`  
**Data de validacao:** 2026-04-13  
**Escopo:** baseline de linhas e mapa de hotspots para abrir a Onda 1 do backlog `0316`

---

## 1. Baseline objetivo

Comando observado no repositorio:

```bash
wc -l apps/api/src/server.ts
```

Resultado atual:

- `apps/api/src/server.ts`: `5411` linhas

Referencias correlatas no momento da abertura:

- `apps/api/src/bootstrap.ts`: `780` linhas
- `apps/api/src/runtime.ts`: `601` linhas
- `apps/api/src/server.test.ts`: `1757` linhas

Leitura:

- a documentacao anterior marcava `5270` linhas;
- o working tree atual esta acima disso e confirma que o gap continua aberto;
- o arquivo segue atuando como composition root, pipeline HTTP, auth gateway e roteador de dominios.

---

## 2. Hotspots por faixa

| Bloco | Faixa aproximada | Linhas | Leitura operacional |
|------|-------------------|--------|---------------------|
| helpers HTTP pre-server | `181-305` | `125` | security headers, CORS e utilitarios de request |
| bootstrap imediato de `createApiServer` | `306-524` | `219` | runtime, limiter, OIDC, WebAuthn, SOC2 e wiring inicial |
| envelope de `handleRequest` | `525-800` | `276` | tracing, correlation, tenant resolution e operacionais publicos |
| auth + MFA + WebAuthn + OIDC | `801-1252` | `452` | maior hotspot transversal de seguranca |
| LGPD | `1253-1673` | `421` | dominio grande e autocontido, candidato natural a extracao |
| medical-records | `1674-1863` | `190` | prontuario, entries, revisions e timeline |
| attachments | `1864-1942` | `79` | pequeno, mas fortemente acoplado ao prontuario |
| inpatient + notifications | `1943-2061` | `119` | dois dominios juntos no mesmo trecho |
| encounters | `2062-2232` | `171` | fluxo central clinico e operacional |
| triage | `2233-2372` | `140` | bloco clinico proprio, bom candidato a handler dedicado |
| owners + patients + links | `2373-2583` | `211` | cadastro principal ainda inline |
| users + staff + quotes | `2584-3093` | `510` | hotspot administrativo grande demais |
| products + services + access-control | `3094-3542` | `449` | mistura catalogo e governanca |
| audit + sectors + beds + CEP | `3543-3870` | `328` | bloco heterogeneo, nao deveria estar junto |
| discharges + billing + prescription-executions | `3871-4493` | `623` | maior hotspot de negocio residual |
| inventory | `4494-4691` | `198` | dominio isolavel com baixo risco estrutural |
| webhooks + payments + api-keys + events + WhatsApp | `4692-5241` | `550` | hotspot operacional/integracao muito concentrado |
| tail helpers auth/audit | `5242-5329` | `88` | contratos reutilizaveis que devem sair do monolito |
| leitura/corpo/validacao global | `5330-5411` | `82` | utilitarios globais candidatos a `helpers/common.ts` |

---

## 3. Pontos quentes prioritarios da Onda 1

### Hotspot H1 - pipeline HTTP duplicado

Sinais observados:

- `health`, `metrics` e `openapi` aparecem antes e depois do tenant context;
- `handleRequest` ainda faz trabalho de middleware e de dispatch de dominio.

Impacto:

- aumenta risco de regressao em extracoes;
- espalha regras operacionais em dois caminhos;
- atrapalha testes de smoke e leitura do fluxo principal.

Acao imediata:

- `PR-02` e `PR-03` devem sair antes de qualquer extracao de dominio grande.

### Hotspot H2 - auth/safety bootstrap misturado ao transport root

Sinais observados:

- rate limiter, OIDC, WebAuthn, MFA e SOC2 sao instanciados junto do bootstrap HTTP;
- o bloco `801-1252` sozinho ja tem `452` linhas.

Impacto:

- risco alto de regressao sensivel;
- dificulta testes menores e contratos reaproveitaveis.

Acao imediata:

- Onda 2 deve atacar este bloco logo apos a limpeza do pipeline.

### Hotspot H3 - dominios residuais em blocos heterogeneos

Pontos mais criticos:

- `discharges + billing + prescription-executions`: `623` linhas;
- `webhooks + payments + api-keys + events + WhatsApp`: `550` linhas;
- `users + staff + quotes`: `510` linhas;
- `products + services + access-control`: `449` linhas;
- `lgpd`: `421` linhas.

Impacto:

- reduz previsibilidade de PR;
- aumenta chance de conflito entre trilhas;
- mantem `server.ts` como gargalo para qualquer nova feature.

---

## 4. Ordem recomendada de ataque dentro da Onda 1

1. remover duplicacao de operacionais publicos
2. extrair middleware HTTP compartilhado
3. extrair tenant/tracing request pipeline
4. so depois abrir a extracao de auth e dominios grandes

Motivo:

- esse caminho reduz acoplamento estrutural antes de mover blocos de negocio;
- sem isso, a equipe corre o risco de apenas deslocar complexidade para outros arquivos.

---

## 5. Riscos e restricoes observados

- o working tree ja esta sujo em varios arquivos relevantes de API;
- `server.ts` esta sendo alterado em paralelo no repositorio, entao PR grande aumenta chance de conflito;
- `server.test.ts` ainda concentra muito comportamento e pode mascarar falta de testes por modulo.

Restricao operacional:

- evitar PR multi-dominio enquanto o pipeline principal nao estiver limpo.

---

## 6. Saida executiva do `PR-01`

`PR-01` fica considerado concluido quando este inventario existir e sustentar as proximas execucoes com:

- baseline objetivo de linhas;
- agrupamento de hotspots por faixa;
- priorizacao real da Onda 1;
- ordem de ataque que favorece reducao de acoplamento.

Estado na abertura:

- `PR-01`: `DONE`
- `PR-02`: `TODO`
- `PR-03`: `TODO`
- `PR-04`: `TODO`

---

## 7. Atualizacao pos-`PR-02`

Resultado observado apos a extracao de middleware HTTP compartilhado:

- `apps/api/src/server.ts` caiu para `5077` linhas;
- CORS e security headers sairam de `server.ts` para `apps/api/src/http/cors.ts` e `apps/api/src/http/security-headers.ts`;
- `readHeader`, `readJsonBody` e `validateRequestBody` passaram a ser consumidos a partir de helpers compartilhados;
- duplicacoes de `readJsonBody` foram removidas de `laboratory-routes.ts` e `prescription-routes.ts`;
- validacoes executadas: `typecheck`, `build` e `test` da API em `PASS`.

Estado atual:

- `PR-01`: `DONE`
- `PR-02`: `DONE`
- `PR-03`: `TODO`
- `PR-04`: `TODO`

---

## 8. Proximo PR recomendado

`PR-03` - extracao de operacionais publicos

Escopo minimo:

- unificar `health`, `live`, `ready`, `metrics` e docs/OpenAPI em fluxo unico;
- remover a duplicacao atual de checks publicos antes e depois do tenant context;
- deixar `server.ts` apenas delegando para um handler operacional dedicado.

Saida esperada:

- nova reducao de linhas com eliminacao de duplicacao de pipeline;
- base limpa para `PR-04`;
- menos risco de regressao operacional durante a extracao de dominios.
