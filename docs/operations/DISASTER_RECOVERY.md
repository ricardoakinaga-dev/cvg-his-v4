# Disaster Recovery Policy

**Status:** normative baseline; drill certification pending.
**Canonical components:** PostgreSQL, Redis operational state, attachment storage, secrets/configuration, images and migrations.

## Recovery principles

1. Backups are encrypted in transit and at rest, access-controlled, integrity-checked and retained according to the target policy.
2. PostgreSQL data, globals/roles, migrations, attachment objects and metadata are recovered as a consistent release-compatible set.
3. Restore runs in a disposable or explicitly approved isolated environment before traffic is accepted.
4. Recovery preserves tenant isolation, audit immutability, idempotency/dedupe state and attachment safety.
5. Every drill records candidate SHA, backup ID, start/end time, RPO/RTO, checksums, schema version, representative clinical graph checks and cleanup result.

## Required scenarios

- Full database plus attachment restore.
- Database-only restore.
- Attachment-only restore with missing-object detection.
- Corrupted checksum/TOC and incomplete backup rejection.
- Migration-version mismatch and rollback/forward compatibility.
- Redis loss/restart and worker/API restart with no duplicate durable side effect.

The repository contains backup-v2 and restore-drill scaffolding, but a source validator is not a completed recovery drill. No production recovery claim is made until current timed artifacts exist.
