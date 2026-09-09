# Triple-A — 03 Safety Invariants

**Status:** IMPLEMENTED PARTIALLY / NOT CERTIFIED

As invariantes estão em [`CLINICAL_SAFETY_INVARIANTS.md`](../clinical/CLINICAL_SAFETY_INVARIANTS.md). O envelope de idempotência agora grava o ator para novos registros, falha fechado para replay concluído legado sem ator e repete permissões nas famílias clínicas críticas antes do lookup.

Suíte unitária direcionada passou. Replay HTTP com permissão revogada, isolamento RLS em runtime, recuperação e UAT continuam abertos.
