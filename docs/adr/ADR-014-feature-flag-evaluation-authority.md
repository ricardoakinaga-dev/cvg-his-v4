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
- o cache não pode sobreviver à expiração da flag nem crescer sem limite;
- mutações administrativas invalidam as decisões locais antes da próxima
  avaliação;
- uma falha de infraestrutura não pode habilitar uma decisão cujo kill switch
  persistido ficou desconhecido.
- um gate de request deve avaliar a conta e o usuário do principal
  autoritativo, não apenas o snapshot de bootstrap do processo;
- um override nunca pode apontar para uma flag de outra conta, mesmo que um
  chamador consiga contornar a camada de serviço.

## Decisão

O provider mantém a fronteira existente de `DatabaseFeatureFlagRepository`,
mas recebe o menor contrato de leitura necessário (`findByKey` e
`listOverrides`). Ele carrega todos os overrides da flag dentro da conta
tenant-scoped, seleciona a maior especificidade (usuário, conta, ambiente) e
aplica o estado/expiração antes da avaliação. Percentuais inválidos são
rejeitados de forma fail-closed. Conta ausente ou flag não cadastrada pode usar
o provider de bootstrap; falhas de infraestrutura são observáveis, mas
permanecem fail-closed para não contornar um estado persistido desconhecido.
As operações de banco exigem `accountId` UUID e usam `withTenantQueryExplicit`,
sem resolver silenciosamente a conta `default`.

O cache continua local e bounded por TTL e capacidade, com o limite adicional de
`expiresAt`, cópia defensiva das decisões, chave contextual completa e
invalidação por flag. O wrapper de métricas propaga a invalidação para as rotas
administrativas. Nenhum TTL de autorização ou cache de sessão foi introduzido.

A persistência grava e atualiza o `enabled` autoritativo. Overrides usam um
índice único PostgreSQL `NULLS NOT DISTINCT` sobre as dimensões da regra e
`INSERT ... ON CONFLICT`, evitando que dois usuários concorrentes compartilhem
ou sobrescrevam a linha errada. A migração `0174` adiciona uma chave estrangeira
composta `(flag_id, account_id) -> feature_flags(id, account_id)`, fechando a
fronteira de ownership no banco; o repositório também repete o predicado de
conta nas leituras e rejeita `userId` não-UUID antes de persistir.

O bootstrap expõe `evaluate(key, context)` como autoridade request-scoped. As
rotas autenticadas passam o `accountId`/`userId` do principal após a autorização
e mantêm os booleanos escalares apenas como compatibilidade para testes e
ligações processuais. O callback de lembretes WhatsApp reavalia a conta do
agendamento; flags de infraestrutura que controlam o processo permanecem
explicitamente process-wide e não são apresentadas como rollout por conta.

As rotas administrativas validam o JSON recebido antes de chamar o repositório:
booleanos não são coagidos (`"false"` não vira `true`), escopos são enumerados,
percentuais ficam entre 0 e 100 e identificadores direcionados devem ser UUID.

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
expiração com cache, allowlist default-deny, fallback de bootstrap, falha
fail-closed, invalidação/limite de cache, cache sensível à definição,
validação de payloads, avaliação request-scoped e persistência/upsert em
`packages/modules/feature-flags/src/repositories/database-feature-flag.repository.test.ts`,
`tests/unit/api/feature-flags.test.ts` e
`tests/unit/api/feature-flags-routes.test.ts`. A FK `0174` também foi aplicada
em PostgreSQL de teste dentro de uma transação revertida com sucesso.
Typecheck e lint do workspace continuam obrigatórios. Esses testes não
substituem a execução PostgreSQL/RLS, o CI do candidato, UAT ou a autoridade de
release; essas provas permanecem explicitamente `NOT PROVEN` até serem
executadas no ambiente correspondente.
