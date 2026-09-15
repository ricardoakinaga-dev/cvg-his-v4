# PROD-052 — Contrato de expiração de pontos

Status: PROPOSED_PENDING_AUTHORITY. Este é um contrato comparativo para decisão de Produto e Financeiro; não é uma alteração de saldo, migração ou aceitação do comportamento atual.

## Limite da tarefa

R1 registra alternativas, impactos, invariantes, observações do código e casos verificáveis para expiresAt. Não escreve, recalcula, expira, migra ou restitui pontos. O comportamento observado é evidência de implementação existente, não uma violação presumida.

O contrato normativo está em docs/engineering/loyalty-expiration-contract-prod-052.json e é validado por scripts/validate-prod-052-loyalty-expiration-contract.mjs. A implementação posterior depende de PROD-053 e de decisão Product/Financeiro.

## O que existe hoje

A tabela loyalty_points possui expires_at nullable TIMESTAMPTZ, source_type, source_id, is_blocked, created_at e account_id. awardPoints aceita expiresAt e o adaptador de banco o persiste quando informado. A projeção atual de saldo separa pontos bloqueados, soma lançamentos não bloqueados, subtrai resgates não cancelados e limita availablePoints a zero. O caminho observado não fixa política de comparação temporal nem ordem de lotes.

Esses fatos não definem a regra de negócio. Não há decisão vigente para vencimento, timezone, corte, ordem de consumo, saldo legado ou restituição.

## Invariantes

- Todo lançamento é tenant-scoped por account_id.
- Lançamentos não são editados ou apagados silenciosamente; correções são reversões vinculadas.
- expiresAt precisa de regra explícita de relógio, timezone, unidade e igualdade.
- Expirados e bloqueados não podem ser consumidos.
- Pontos são inteiros; ajustes negativos exigem origem, motivo, autorização e auditoria.
- Ordem de consumo e desempate são determinísticos.
- Saldo legado sem expiresAt não recebe prazo inventado.
- Restituição não duplica efeito e preserva a proveniência.
- PROD-052 não altera saldo.

## Decisões pendentes C1-C6

| ID | Pergunta | Recomendação não vinculante |
| --- | --- | --- |
| C1 | Regra de vencimento | Política explícita por programa/origem, sem reescrever concessões. |
| C2 | Relógio e timezone | Persistir UTC e declarar timezone do tenant quando houver corte civil. |
| C3 | Igualdade no corte | Limite exclusivo: disponível enquanto avaliação < expiresAt. |
| C4 | Ordem de consumo | FEFO determinístico, com regra para nulos e empate. |
| C5 | Saldo legado | Preservar sem prazo até decisão; qualquer cutover exige snapshot. |
| C6 | Restituição | Reversão append-only vinculada ao lançamento/resgate original. |

Todas permanecem PENDING_AUTHORITY. Product e Financeiro devem registrar a escolha, owner, validade e evidência antes de PROD-053.

## Requisitos R1-R6

| ID | Obrigação |
| --- | --- |
| R1 | Definir regra de expiração e projetar expirados fora de availablePoints. |
| R2 | Fixar clock, timezone, unidade, instante de avaliação e igualdade. |
| R3 | Separar estados do saldo e impedir disponibilidade negativa. |
| R4 | Definir ordem, desempate, concorrência e idempotência de consumo. |
| R5 | Tratar legado sem prazo inventado e exigir snapshot/rollback se migrar. |
| R6 | Reverter/cancelar com vínculo, auditoria e sem dupla restituição. |

## Casos e evidência

A matriz SCN-001 a SCN-010 cobre nulo, antes/durante/depois do corte, igualdade, lotes diferentes, bloqueio, legado, concorrência, retry e restituição. FAIL-001 a FAIL-010 exige falha segura para entradas temporais inválidas, cross-tenant, seleção de expirado, corrida, replay e cutover sem decisão.

O gate integral exige decisão assinada Product/Financeiro, oracle temporal, dataset legado autorizado, implementação posterior de PROD-053, prova API/DB concorrente, reconciliação de ledger/saldo e crítica independente fresh. Até lá, PROD-052 é apenas contrato local REVIEW_REQUIRED; PROD-053 e o Triplo AAA permanecem bloqueados.
