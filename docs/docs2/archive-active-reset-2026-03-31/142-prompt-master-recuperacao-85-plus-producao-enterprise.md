# PROMPT MASTER — CVG-HIS-V2 — RECUPERAÇÃO PARA 85+/100 EM PRODUÇÃO ENTERPRISE

## Objetivo

Executar uma frente única de recuperação técnica do projeto `cvg-his-v2` para elevar a prontidão de produção enterprise de `78/100` para pelo menos `85/100`, corrigindo os bloqueios críticos já identificados e sem reabrir escopo funcional de módulos já aprovados.

## Base obrigatória

- `/root/.openclaw/workspace/cvg-his-v2/docs/90-hardening-global.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/91-prompt-master-hardening-global-transversal.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/98-matriz-prontidao-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/137-relatorio-correcao-lacunas-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/138-relatorio-auditoria-prontidao-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/139-relatorio-validacao-staging-go-live-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/140-decisao-final-prontidao-producao-enterprise.md`

## Contexto atual obrigatório

- nota atual: `78/100`
- status atual: `não pronto para produção`
- bloqueios críticos já identificados:
  1. suíte ampla da API instável
  2. ausência ou cobertura insuficiente de testes HTTP de contrato
  3. versionamento otimista incompleto
  4. padronização de lifecycle endpoints incompleta
  5. processo de release/rollback ainda não formalizado o suficiente
- módulos funcionais já existem e não devem ser reabertos por escopo novo

## Missão

Fechar os bloqueios que impedem o sistema de atingir `85+/100` com evidência técnica suficiente para uma nova auditoria de prontidão de produção.

## Não fazer

- não criar novos módulos
- não abrir features novas
- não refatorar por preferência arquitetural
- não mexer em UX sem necessidade direta
- não declarar pronto para produção sem evidência objetiva

## Ordem obrigatória de execução

1. Estabilizar suíte ampla da API
2. Completar testes HTTP de contrato dos fluxos principais
3. Fechar versionamento otimista nos pontos restantes
4. Consolidar lifecycle endpoints em padrão transversal coerente
5. Fechar constraints e invariantes restantes que ainda impactem confiabilidade
6. Formalizar processo mínimo de release/rollback/go-live
7. Reexecutar validações finais e recalcular prontidão

## Escopo técnico mínimo desta recuperação

- `apps/api/src/server.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/runtime.test.ts`
- testes HTTP e helpers de teste da API
- módulos centrais já maduros:
  - `owners`
  - `patients`
  - `encounters`
  - `medical-records`
  - `prescriptions`
  - `diagnostics/exams`
  - `inpatient`
  - `prescription-executions`
  - `discharges`
- documentação operacional de release/rollback em `/docs`

## Critérios obrigatórios para considerar a recuperação bem-sucedida

- suíte ampla da API verde e reproduzível
- contratos HTTP principais cobertos por testes
- pontos críticos restantes com versionamento otimista implementado
- lifecycle endpoints padronizados ou compatibilidade transitória claramente documentada
- invariantes críticas protegidas por persistência quando aplicável
- processo de release/rollback documentado de forma utilizável
- nova nota estimada da matriz `>= 85`
- nenhum critério crítico abaixo de `80`

## Entregáveis obrigatórios

1. lista de arquivos alterados
2. lista de arquivos criados
3. resumo por bloco:
   - suíte ampla
   - testes HTTP
   - versionamento
   - lifecycle
   - constraints
   - release/rollback
4. resultado do typecheck
5. resultado do build
6. resultado da suíte ampla
7. lista de contratos HTTP adicionados à cobertura
8. pendências remanescentes, se houver
9. nova nota estimada da matriz
10. confirmação final exata somente se os critérios forem atingidos:

`Recuperação para 85+/100 concluída`

## Se os critérios NÃO forem atingidos

Não use a confirmação acima.

Nesse caso, entregue:

- o teto real alcançado
- a nota estimada atualizada
- os bloqueios que ainda impedem `85+/100`
