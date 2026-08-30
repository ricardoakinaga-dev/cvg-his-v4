# CVG-001-REDIS-DISTRIBUTED-READINESS — Autoridade real do Redis no runtime

## Contrato

- Status: `PASS_BOUNDED`; parent CVG-001 remains `IN_PROGRESS/PARTIAL`.
- Stage/activity: `VERIFY` / `RECONCILE`.
- Parent: `CVG-001`; priority `P0`; tier `T4_CRITICAL`; risk `CRITICAL`; blast radius `CROSS_SYSTEM`.
- Owner: root integrator. A worker implementa, mas não aprova a própria entrega.
- Authority: `.agent/authority.jsonl#AUTH-CVG-001-REDIS-DISTRIBUTED-READINESS-IR-001`.
- Implementation-ready gate: `.agent/gates/implementation-ready-CVG-001-redis-distributed-readiness.json`.

## Gap confirmado

Quando `RUNTIME_DISTRIBUTED_STATE_ENABLED=true`, o estado operacional atual
considera o Redis saudável apenas porque `REDIS_URL` está configurada. O
`/ready` não consulta o backend, o processo crítico usa apenas o `/health` e
não existe uma prova de dois processos com outage, recuperação e sessão
autoritativa após reinício. Isso permite anunciar readiness enquanto o
rate-limiter distribuído está indisponível.

## Escopo congelado

1. Estender o contrato interno do rate limiter com health-check e encerramento
   explícitos, mantendo as operações atômicas e a conexão Redis reutilizada.
   O store Redis deve validar `PING`; o store em memória continua válido apenas
   quando o estado distribuído está desabilitado.
2. Integrar o health-check real ao `/ready`, `/health/ready`, `/health` e às
   métricas sem expor URL, senha ou erro sensível. Com o estado distribuído
   habilitado, Redis ausente, não verificável ou indisponível deve resultar em
   readiness `503` e modo `fail-closed`; `/live` continua liveness-only.
3. Mapear indisponibilidade do rate limiter de autenticação para uma resposta
   pública `503` estável, sem fallback para contador local e sem criar sessão.
4. Expandir a prova de processo de instalação/sessão para uma instância Redis
   descartável e dois processos API contra o mesmo PostgreSQL: setup, login,
   refresh/revogação entre réplicas quentes, reinício físico de uma réplica,
   outage Redis com readiness/auth fail-closed e restauração com continuidade.
5. Manter `RUNTIME_DISTRIBUTED_STATE_ENABLED=false` explicitamente compatível
   com testes/in-memory; não alterar o modelo de sessão autoritativo no
   PostgreSQL nem ampliar escopo para target, provedor, credencial, produção,
   deploy, release ou mutação externa.

## Critérios de aceitação

- [x] Redis real é distinguido de in-memory no contrato do rate limiter; o
      health-check não deixa conexão pendurada nem mascara falha.
- [x] `/ready` e `/health/ready` retornam `200` somente com PostgreSQL,
      repositórios, worker e Redis saudáveis quando o modo distribuído está
      habilitado; a resposta identifica a dependência Redis sem segredo.
- [x] `/health` não declara `ok=true` para um runtime distribuído cujo Redis
      esteja indisponível, enquanto `/live` segue `200`.
- [x] Falha do rate limiter em login retorna `503`, não usa memória e não
      materializa sessão.
- [x] Duas APIs quentes compartilham o mesmo Redis/PostgreSQL; setup/login,
      refresh CAS, logout/revogação e sessão atravessam as réplicas.
- [x] Após reinício físico de uma réplica, o token/sessão continua válido ou
      revogado segundo o banco compartilhado; nenhum cache local vira fonte de
      autoridade.
- [x] Outage e restauração do Redis são observados no mesmo teste com recursos
      descartáveis e cleanup explícito; não há escrita em stack de usuário.
- [x] TDD RED/GREEN, regressões de módulos/API, typecheck/build/lint,
      segurança/static, cobertura oficial e revisão independente são
      registrados antes de reconciliação bounded. O programa global permanece
      `IN_PROGRESS/PARTIAL`.

## Riscos e exclusões

Este slice prova apenas o contrato local de disponibilidade do Redis e a
continuidade de autenticação no harness descartável. Não certifica Redis
gerenciado, Sentinel/Cluster, target RLS, multi-região, backup/restore,
RTO/RPO, CI remoto ou release. O timeout e a política de reconnect devem
continuar bounded para que o probe não trave health checks.

## Resultado de verificação bounded — 2026-08-27

O contrato congelado passou localmente. A implementação usa PING Redis real
com deadline bounded, agrega auth/PIX/webhook, fecha conexões de forma
idempotente, falha fechada no login e integra `/ready`, métricas e estado
operacional. A prova real com dois processos e recursos descartáveis passou
no manifesto crítico `9/9`, sem skipped/pending/todo/falhas. O runner foi
ajustado para timeout finito de 360 s depois que a prova SIGKILL de domínio
inpatient demonstrou duração legítima de aproximadamente 298 s.

Os dois testes de recebimento que ainda consultavam a operação HTTP histórica
foram alinhados à operação canônica `encounter.cash-receipt.create`; ambos
passaram isoladamente e no manifesto. Compose v2 e E2E validam `/ready`, e o
exemplo de ambiente declara o placeholder obrigatório de
`WORKER_REPORTS_USER_ID`.

Evidência detalhada: `.agent/artifacts/CVG-001-redis-distributed-readiness-2026-08-27.md`.
Gate: `.agent/gates/verified-CVG-001-redis-distributed-readiness.json`.

As revisões independentes disponíveis permanecem `CONDITIONAL`, não são
aprovação de produção. Persistem os limites de Redis gerenciado/HA, target,
RLS/ownership real, CI remoto, backup/restore, RTO/RPO, provedores, release e
alguns riscos de harness (TOCTOU de porta, limpeza excepcional e possível
cache local de listagem de sessões). O resultado é somente `PASS_BOUNDED`.

## Próxima ação

Manter este slice como `PASS_BOUNDED`, o parent CVG-001 e o programa global como
`IN_PROGRESS/PARTIAL`, e obter nova autoridade antes de Redis gerenciado/HA,
Pub/Sub, cache de sessão, target operations, credenciais, provedores ou
qualquer ambiente externo.
