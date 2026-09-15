# PROD-049 — Matriz de ambiente e runtime

**Status:** PROPOSED / PENDING AUTHORITY  
**Data:** 2026-09-15  
**Escopo:** coerência entre ambiente, Compose/Helm, runbook, alvo, owner e
smoke local; não é autorização de deploy.

## Regra de precedência

A matriz JSON em docs/engineering/environment-runtime-matrix.json é a fonte
estrutural desta decisão. O papel do Compose e do Helm depende do ambiente:

| Ambiente | Runtime primário | Compose | Helm | Alvo/owner |
|---|---|---|---|---|
| local-development | docker-compose.dev.yml | desenvolvimento local | paridade/dry-run opcional | workstation ou kind/k3s efêmero; Developer + Platform |
| ci-e2e | docker-compose.e2e.yml | runner efêmero | não aplicável | GitHub Actions efêmero; QA + CI |
| staging | infra/helm/cvg-his-v2 + values.staging.yaml | ensaio production-like somente | alvo primário | cluster Kubernetes a designar; Platform + Release owner |
| production | infra/helm/cvg-his-v2 + values.prod.yaml | ensaio production-like somente | alvo primário | cluster Kubernetes a designar; Release owner + Platform |
| production-single-host | docker-compose.v2.yml | candidato alternativo de cutover | não aplicável | host Linux a designar; Platform + DBA + Release owner |

Assim, docker-compose.v2.yml continua válido para o cutover host-based e para
rehearsal local descrito nos documentos 130/131, mas não é a superfície primária
do alvo Kubernetes de staging ou produção. O chart Helm continua sendo a
superfície ativa de staging/produção conforme ADR-011. Nenhum alias v2 é
renomeado ou removido por este card.

## Runbook e smoke

O procedimento comum é este documento, com a matriz JSON como entrada:

1. Para desenvolvimento, executar apenas a configuração do Compose dev e os
   validadores locais; não publicar.
2. Para CI/E2E, usar Compose e2e no runner efêmero e destruir o ambiente pela
   própria automação; não tratar o resultado como homologação de produção.
3. Para staging, validar superfície, chart e cutover documental localmente;
   somente um owner autorizado pode escolher o cluster, injetar secrets e
   executar Helm no alvo.
4. Para produção, exigir os mesmos checks locais, digest imutável nas imagens,
   alvo Kubernetes aprovado, janela, backup, rollback e release owner. O
   comando de cutover host-based não deve ser aplicado ao cluster Kubernetes.

Os smoke commands da matriz são deliberadamente não mutantes: config,
validadores e documentação. Eles não provam cluster, provider, segredo,
readiness, migração aplicada, UAT, rollback ou release.

## Conflitos mantidos como decisões abertas

O inventário não mascara as divergências que ainda impedem aceite:

- origens de Caddy, env example, values e runbook não estão reconciliadas;
- staging registra API em production-like e worker em staging, sem decisão única
  de semântica do processo;
- values de staging/produção deixam a ligação de imagem ao SHA/digest para a
  autoridade de release;
- produção Helm ativa Vault, mas a configuração efetiva do provider e os
  parâmetros do Vault não estão provados;
- o runbook host-based usa o runner de migration do host, enquanto Compose/Helm
  usam artefatos compilados e reconciliação de roles;
- Compose embute PostgreSQL/Redis, enquanto os perfis Helm de staging/produção
  usam serviços externos;
- a decisão do worker descreve processo sem HTTP, mas os manifests usam probes
  HTTP;
- units systemd listados em 130 têm upstream/env diferente da trilha Compose e
  aguardam classificação explícita como não canônicos ou correção.

Esses conflitos são referências de auditoria, não exceções aprovadas. Os
smokes atuais só validam configuração e superfície; nenhum API/worker/SPA foi
subido por esta execução.

## Autoridade e aceitação

O validador local exige que staging e production permaneçam
PENDING_AUTHORITY com alvo e owner ainda não atribuídos. A matriz é coerente
como contrato local, mas o aceite integral do PROD-049 fica BLOCKED até que
Platform e Release owner confirmem a precedência, o alvo, a janela e o
runbook de execução. Não há produção, credencial, cluster ou dado PHI usado
nesta execução.

Verificação local:

    pnpm validate:environment-runtime
    pnpm validate:deploy-surface
    pnpm validate:helm
    pnpm deploy:check

Fontes: 132 — Superficie Canonica de Deploy e Migracao; ADR-011 Container
Runtime; RELEASE_IDENTITY; documentos 130/131. O resultado não altera a
Quality Bar nem autoriza o Triplo AAA.
