# LEGACY_HELM_TRACK=NON_CANONICAL

# Legacy Helm charts — non-canonical

`charts/helm` is retained as a historical compatibility artifact only. It is
not an active deployment surface and must not be installed, rendered for a
release, or used as evidence of CVG-HIS V4 readiness.

The canonical Helm track is:

```text
infra/helm/cvg-his-v2
```

Use the repository-owned checks from the project root:

```bash
pnpm validate:deploy-surface
pnpm validate:helm
```

The legacy track is intentionally not referenced by CI, package scripts or
active deployment automation. Before any future removal or alignment, confirm
all consumers, record the migration decision and run a fresh re-audit. This
README does not authorize deletion or a global V2→V4 rename.
