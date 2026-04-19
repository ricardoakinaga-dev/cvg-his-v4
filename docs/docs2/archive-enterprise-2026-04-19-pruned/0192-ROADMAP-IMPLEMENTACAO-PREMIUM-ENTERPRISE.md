# 0192 - Roadmap de Implementacao Premium Enterprise

**Status:** vivo
**Data de validacao:** 2026-04-12
**Escopo:** roadmap executivo de implementacao do plano completo
**Baseline executavel atual:** `69/100`
**Meta intermediaria:** `80/100`
**Meta premium enterprise:** `90/100`

---

## 1. Objetivo

Este roadmap organiza a implementacao completa do plano enterprise em uma sequencia executavel, com foco em:

- recuperar a capacidade de entrega real do repositorio
- estabilizar a operacao do produto
- fechar o gap para uma estrutura Premium Enterprise
- transformar backlog disperso em uma trilha unica de execucao

---

## 2. Principios de execucao

| Principio | Regra |
| --- | --- |
| Codigo primeiro | Score so sobe quando o repositorio sustenta a entrega |
| Gate antes de narrativa | `typecheck`, `build`, testes e coverage mandam mais que docs |
| Premium Enterprise real | observabilidade, config, security, backup e runtime sao parte do produto |
| Sequencia disciplinada | primeiro recuperar o executavel, depois endurecer plataforma, depois escalar |
| Uma trilha viva | roadmap, backlog, riscos e operacao precisam apontar para a mesma verdade |

---

## 3. Estrutura alvo Premium Enterprise

Ao final do plano, a estrutura esperada do programa e:

| Pilar | Estado alvo |
| --- | --- |
| Produto | SPA canonica completa, sem dependencia residual do legado |
| Plataforma | API modular, worker estavel, runtime observavel e operavel |
| Configuracao | schema central, fail-fast e inventario de variaveis por app |
| Observabilidade | metrics, logs estruturados, traces OpenTelemetry com export OTLP |
| Security | CORS restritivo, scans obrigatorios, rotacao de segredos e manager dedicado |
| Qualidade | gates reais de release, coverage progressivo e regressao controlada |
| Runtime | backup/restore testado, rate limiter distribuido, feature flags governadas |
| Operacao | runbooks, SLOs, DR, evidencias para auditoria e SOC2 path |
| Escalabilidade | Helm charts, trilha Kubernetes e ADRs de runtime |
| Arquitetura | roadmap event-driven governado e decisoes estruturais registradas |

---

## 4. Fases do roadmap

## Fase R0 - Recuperacao Executavel

**Janela:** semana 1-2  
**Score esperado:** `69 -> 75`

**Objetivo:** fazer o repositorio voltar a sustentar o caminho basico de entrega.

**Entregas:**
- corrigir erros de typecheck/build no design system
- fechar regressao da SPA em notifications e skeleton loader
- revalidar `release:check`
- limpar conflitos documentais criticos de frontend canonico

**Saida obrigatoria:**
- `pnpm typecheck` verde
- `pnpm build` verde
- suite SPA afetada verde
- docs canonicas sem conflito principal de frontend

## Fase R1 - Entrada em 80

**Janela:** semana 2-4  
**Score esperado:** `75 -> 80`

**Objetivo:** atingir o primeiro patamar defensavel de maturidade operacional.

**Entregas:**
- elevar coverage real para o minimo imediato de `15%`
- focar testes em `prescriptions`, `fiscal` e fluxos centrais da SPA
- comecar extracao do `apps/api/src/server.ts`
- estabilizar backlog e roadmap como fonte de verdade

**Saida obrigatoria:**
- `pnpm test:coverage` acima do threshold atual
- regressao principal resolvida
- inicio de modularizacao da API com evidencia no codigo

## Fase R2 - Hardening Enterprise Inicial

**Janela:** mes 2-3  
**Score esperado:** `80 -> 84`

**Objetivo:** sair de produto funcional para plataforma minimamente enterprise.

**Entregas:**
- validacao rigorosa de config com Zod
- inventario de variaveis por app
- bootstrap fail-fast
- CORS restritivo por ambiente
- secret scanning obrigatorio no CI
- headers e defaults de seguranca revisados

**Saida obrigatoria:**
- API, worker e SPA com schema de config explicito
- pipeline falha em configuracao invalida
- politica de seguranca operacional documentada

## Fase R3 - Observabilidade e Operacao Auditavel

**Janela:** mes 3-4  
**Score esperado:** `84 -> 87`

**Objetivo:** tornar o sistema explicavel, rastreavel e operavel sob pressao.

**Entregas:**
- OpenTelemetry com OTLP exporter
- correlacao entre trace id, request id e logs
- instrumentacao HTTP, DB e worker
- backup automatizado
- restore drill com evidencia
- SLOs e runbooks operacionais revisados

**Saida obrigatoria:**
- traces reais exportados
- backup e restore testados
- RCA possivel por trilha de trace/log/metric

## Fase R4 - Runtime Premium

**Janela:** mes 4-6  
**Score esperado:** `87 -> 89`

**Objetivo:** preparar a plataforma para escala, variacao de rollout e governanca de runtime.

**Entregas:**
- rate limiter distribuido em Redis
- feature flags com Unleash
- coverage progressivo `15 -> 40 -> 60`
- quality gates imutaveis de release
- avancar modularizacao da API por dominio

**Saida obrigatoria:**
- runtime sem dependencias locais para controle critico
- rollback funcional por feature flag
- cobertura em patamar intermediario sustentavel

## Fase R5 - Plataforma Premium de Longo Prazo

**Janela:** mes 6-9  
**Score esperado:** `89 -> 90+`

**Objetivo:** consolidar a estrutura premium enterprise de longo prazo.

**Entregas:**
- Helm charts para API, worker e SPA
- trilha Kubernetes com valores por ambiente
- ADR para Fastify com decisao explicita
- ADR para secrets manager dedicado
- roadmap event-driven com contratos, retries e DLQ governados
- coverage premium `80%` como target final

**Saida obrigatoria:**
- runtime multiambiente padronizado
- decisoes estruturais formalizadas
- plataforma com caminho claro para operacao enterprise em escala

---

## 5. Roadmap por trilha

| Trilha | R0 | R1 | R2 | R3 | R4 | R5 |
| --- | --- | --- | --- | --- | --- | --- |
| Build e release | corrigir gate | fechar `release:check` | endurecer CI | consolidar | manter verde | manter verde |
| QA e coverage | corrigir regressao | 15% | 40% | 60% | consolidar | 80% |
| Config | mapear gaps | preparar schema | Zod + fail-fast | validar em CI | consolidar | padronizar |
| Observabilidade | medir baseline | manter atual | preparar OTel | exportar OTLP | evoluir paineis | consolidar |
| Security | mapear defaults | limpar docs/policy | CORS + scans | rotacao | Vault plan | manager dedicado |
| Runtime | mapear pontos locais | preparar backlog | backup baseline | restore test | Redis + Unleash | Helm + k8s |
| Arquitetura | mapear hotspots | iniciar extracao API | seguir extracao | modularizar | ADR Fastify | roadmap event-driven |
| Compliance | alinhar docs | thresholds reais | controles basicos | evidencias | runbooks | SOC2 path maduro |

---

## 6. Marcos executivos

| Marco | Meta | Data alvo relativa | Definicao de pronto |
| --- | --- | --- | --- |
| M1 | Repositorio executavel | 2 semanas | typecheck + build + regressao SPA verdes |
| M2 | Score `80/100` | 4 semanas | coverage 15%, docs coerentes, gate basico sustentado |
| M3 | Hardening inicial | 8 semanas | Zod config, fail-fast, CORS restritivo, scans obrigatorios |
| M4 | Operacao auditavel | 12 semanas | OTel real, backup/restore testado, runbooks e RCA |
| M5 | Runtime premium | 16-20 semanas | Redis limiter, Unleash, coverage 40-60 |
| M6 | Estrutura premium enterprise | 24-36 semanas | Helm, k8s path, ADRs estruturais, secrets manager plan |

---

## 7. Gate de passagem por fase

| Fase | Gate de entrada | Gate de saida |
| --- | --- | --- |
| R0 | baseline `69/100` confirmada | build e typecheck verdes |
| R1 | gate basico recuperado | coverage `15%` e score `80/100` |
| R2 | score `80/100` | config fail-fast e security baseline |
| R3 | hardening inicial entregue | OTel real + backup/restore |
| R4 | observabilidade auditavel | runtime distribuido e coverage 40-60 |
| R5 | runtime premium intermediario | trilha enterprise de longo prazo formalizada |

---

## 8. Ordem de execucao recomendada

1. Recuperar gate de build e typecheck.
2. Fechar regressao ativa da SPA.
3. Bater coverage minima de `15%`.
4. Implantar config validation com Zod.
5. Endurecer security baseline.
6. Implantar OpenTelemetry com OTLP.
7. Automatizar backup e provar restore.
8. Migrar rate limiter para Redis.
9. Introduzir feature flags com governanca.
10. Formalizar ADRs de Fastify, Vault e Kubernetes.

---

## 9. Dependencias criticas

| Dependencia | Impacto |
| --- | --- |
| build/typecheck verdes | todo o resto perde confiabilidade sem isso |
| coverage minima real | qualidade e release continuam superestimados sem isso |
| config central | security e runtime premium ficam frageis sem schema |
| OTel + logs correlacionados | backup, SLO e RCA ficam incompletos sem observabilidade real |
| Redis | rate limiter distribuido e parte do runtime premium dependem dele |
| ADRs estruturais | Fastify, Vault e Kubernetes nao devem avancar sem decisao formal |

---

## 10. Resultado esperado

Se executado nesta ordem, este roadmap entrega:

- recuperacao do executavel no curto prazo
- subida real para `80/100`
- endurecimento da plataforma como estrutura Premium Enterprise
- caminho controlado para `90/100` sem inflar score por narrativa documental

