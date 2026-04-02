# PROMPT CIRURGICO — SEGUNDA RECUPERACAO PARA 85+ / PRODUCAO ENTERPRISE

Objetivo:
Executar uma segunda rodada cirurgica de recuperacao tecnica no projeto `cvg-his-v2` para elevar a prontidao de producao de aproximadamente `81/100` para pelo menos `85/100`, sem reabrir escopo funcional e sem dispersar em refatoracoes amplas.

Base obrigatoria:
- `/root/.openclaw/workspace/cvg-his-v2/docs/90-hardening-global.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/98-matriz-prontidao-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/137-relatorio-correcao-lacunas-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/138-relatorio-auditoria-prontidao-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/139-relatorio-validacao-staging-go-live-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/140-decisao-final-prontidao-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/142-prompt-master-recuperacao-85-plus-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/150-release-rollback-procedure-enterprise.md`

Contexto atual:
- nota estimada atual: `81/100`
- status atual: `nao pronto para producao`
- ganhos recentes ja feitos:
  - constraints de banco
  - versionamento em pacientes com incremento de versao
  - primeiros testes HTTP de contrato
  - procedimento de release/rollback documentado
- bloqueios remanescentes:
  1. suite ampla da API ainda nao totalmente verde
  2. testes HTTP ainda incompletos para modulos centrais
  3. `expectedVersion` ainda incompleto nos updates sensiveis
  4. observabilidade basica ausente
  5. padrao transversal de lifecycle ainda nao formalizado

Missao:
Resolver apenas os bloqueios que mais impactam a nota e a prontidao real para tentar levar o sistema a `85+/100`, com evidencias tecnicas verificaveis.

Nao fazer:
- nao criar novos modulos
- nao abrir features novas
- nao redesenhar frontend
- nao fazer refatoracao ampla por preferencia
- nao alterar contratos sem necessidade clara e coordenada
- nao declarar pronto para producao sem cumprir todos os criterios

Ordem obrigatoria:
1. Fechar a suite ampla da API
2. Completar `expectedVersion` nos updates sensiveis restantes
3. Expandir testes HTTP de contrato para modulos centrais faltantes
4. Implementar observabilidade basica minima e util
5. Formalizar o padrao transversal de lifecycle endpoints
6. Recalcular a matriz e emitir decisao tecnica honesta

Escopo tecnico prioritario:
- `apps/api/src/runtime.test.ts`
- `apps/api/src/contract.http.test.ts`
- `apps/api/src/server.ts`
- `apps/api/src/runtime.ts`
- `packages/modules/patients`
- `packages/modules/medical-records`
- `packages/modules/prescriptions`
- `packages/modules/diagnostics`
- `packages/modules/inpatient`
- `packages/modules/prescription-executions`
- `packages/modules/discharges`
- documentacao operacional em `/docs`

Tarefas obrigatorias:

## Bloco 1 — Suite ampla

- identificar exatamente os testes restantes que ainda falham
- separar:
  - falha real
  - flakiness
  - fixture/setup
  - auth/seed
  - teardown/async residual
- corrigir os casos ate a suite ampla da API fechar de forma reproduzivel

## Bloco 2 — Versionamento otimista real

- identificar updates sensiveis que ainda nao validam `expectedVersion`
- implementar verificacao de conflito explicita nos modulos restantes de maior risco
- priorizar:
  - `medical-records`
  - `prescriptions`
  - `diagnostics`
  - `discharges`
  - `prescription-executions`
  - `patients` se ainda faltar validacao de conflito, nao so incremento

## Bloco 3 — Testes HTTP de contrato

- expandir `apps/api/src/contract.http.test.ts`
- cobrir no minimo:
  - `medical-records`
  - `prescriptions`
  - `diagnostics`
  - `inpatient`
  - `discharges`
- validar:
  - create
  - list
  - detail
  - update/transicao principal
  - payload enriquecido esperado pelo frontend
  - autorizacao minima relevante

## Bloco 4 — Observabilidade basica

- implementar o minimo util para operacao e debugging:
  - correlation/request id simples ou equivalente
  - logging estruturado minimo nas rotas/servicos criticos
  - registro claro de erro operacional
- manter simples
- nao transformar isso em plataforma completa de observabilidade

## Bloco 5 — Lifecycle transversal

- registrar em documentacao um padrao claro:
  - quando usar endpoint dedicado
  - quando usar `PATCH` generico
  - como manter compatibilidade
- ajustar apenas inconsistencias pequenas e de alto valor
- nao reabrir todos os modulos se nao for necessario

## Bloco 6 — Validacao final

- rodar `typecheck`
- rodar `build`
- rodar suite ampla
- rodar testes HTTP de contrato
- recalcular nota estimada com base na matriz

Criterios de sucesso:
- suite ampla da API verde
- testes HTTP cobrindo os modulos centrais faltantes
- `expectedVersion` validado nos pontos criticos restantes
- observabilidade basica implementada
- padrao de lifecycle documentado e coerente
- nova nota estimada `>= 85`
- nenhum criterio critico abaixo de `80`

Entrega final obrigatoria:
1. lista de arquivos alterados
2. lista de arquivos criados
3. resumo por bloco executado
4. resultado do `typecheck`
5. resultado do `build`
6. resultado da suite ampla
7. resultado dos testes HTTP
8. nova nota estimada
9. pendencias remanescentes, se houver
10. usar a confirmacao final exata apenas se os criterios forem atingidos:

`Recuperacao cirurgica para 85+/100 concluida`

Se os criterios nao forem atingidos:
- nao use a confirmacao acima
- informe a nota real alcancada
- informe os bloqueios que ainda impedem `85+/100`
