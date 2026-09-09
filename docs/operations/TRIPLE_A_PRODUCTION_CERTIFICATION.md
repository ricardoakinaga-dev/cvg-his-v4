# Triple-A Production Certification

This document defines the final certification contract. It is not a certification by itself.

## Required inputs

- Candidate SHA, release manifest, image digests, SBOM and provenance/signature verification.
- Green Main evidence and required-check/branch-protection confirmation.
- Typecheck, lint, build, unit, critical/integration, E2E, accessibility/visual and performance evidence.
- Clinical criticality matrix, safety invariants, negative authorization/tenant/replay tests and clinical/product sign-off.
- Worker retry/DLQ/fairness evidence, audit/idempotency/event governance and migration evidence.
- Backup/restore, RPO/RTO, game-day, alert delivery, SLO/error-budget and rollback artifacts.
- Security matrix, dependency/image scans, secret scan, license/abandonment review and residual-risk authority.

## Decision rule

The candidate may be labeled `TRIPLE-A VERIFIED` only when `TRIPLE_A_RELEASE_EVIDENCE.json` reports PASS, score is at least 97, critical score is at least 95, open P0 is zero, main is green, evidence is current and the required human release authority is present. Otherwise the label is `NOT PROVEN` or `BLOCKED`.

## Current decision

As of 2026-09-09, this repository is `NOT PROVEN`. The release gate is implemented and deliberately blocks on missing operational evidence, incomplete policy/clinical proof and the current complexity failure.
