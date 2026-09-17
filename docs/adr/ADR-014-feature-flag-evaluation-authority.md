# ADR-014 — autoridade de avaliação de feature flags

## Problema e invariantes

O caminho da API usa o provider raw de `module-feature-flags`, enquanto o
provider compartilhado já possui regras mais completas. O provider raw buscava
um único override com igualdade exata de ambiente e conta; por isso podia
ignorar overrides globais, por ambiente e por usuário. Também não aplicava o
estado persistido `enabled` nem limitava o cache ao `expiresAt`.

As invariantes são:

- um kill switch persistido ou uma flag expirada nunca pode resultar em
  `enabled=true`;
- somente overrides compatíveis com ambiente, conta e usuário podem ser
  considerados;
- o override mais específico vence, com a ordem do repositório como desempate
  determinístico;
- uma allowlist sem correspondência, inclusive sem usuário, deve negar;
- o cache não pode sobreviver à expiração da flag.

## Decisão

O provider mantém a fronteira existente de `DatabaseFeatureFlagRepository`,
mas recebe o menor contrato de leitura necessário (`findByKey` e
`listOverrides`). Ele carrega todos os overrides da flag dentro da conta
tenant-scoped, seleciona a maior especificidade (usuário, conta, ambiente) e
aplica o estado/expiração antes da avaliação. Percentuais inválidos são
rejeitados de forma fail-closed; falhas de infraestrutura continuam usando o
fallback existente e permanecem observáveis por métricas.

O cache continua local e bounded pelo TTL configurado, com o limite adicional
de `expiresAt`. Nenhum TTL de autorização ou cache de sessão foi introduzido.

## Alternativas rejeitadas

- Corrigir apenas a query de igualdade exata: não resolveria os escopos
  wildcard nem a precedência de usuário/conta/ambiente.
- Trocar imediatamente pelo provider compartilhado: exigiria migrar o
  repositório raw e seu legado de resolução de conta, ampliando o risco sem
  necessidade demonstrada.
- Ignorar `enabled`/`expiresAt` até a migração: deixaria uma flag removida ou
  expirada potencialmente habilitada no caminho público da API.

## Evidência e limites

O boundary foi coberto por testes de seleção de escopo, kill switch persistido,
expiração com cache e allowlist default-deny em
`packages/modules/feature-flags/src/repositories/database-feature-flag.repository.test.ts`.
Typecheck e lint do workspace continuam obrigatórios. Esses testes não
substituem a execução PostgreSQL/RLS, o CI do candidato, UAT ou a autoridade de
release; essas provas permanecem explicitamente `NOT PROVEN` até serem
executadas no ambiente correspondente.
