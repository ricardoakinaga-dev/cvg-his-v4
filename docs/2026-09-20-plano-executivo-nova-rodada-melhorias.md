---
document_status: current
document_kind: plan
effective_date: 2026-09-20
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
---

# Plano executivo — nova rodada de melhorias

[Auditoria vigente](2026-09-20-auditoria-scorecard-be2dc76a.md) ·
[Roadmap](2026-09-20-roadmap-nova-rodada-melhorias.md) ·
[Backlog](2026-09-20-backlog-nova-rodada-melhorias.md)

## Objetivo

Transformar a árvore auditada em `be2dc76a` em um candidato publicável e
auditável, sem promover evidência antiga: primeiro restaurar os gates locais;
depois congelar uma identidade única e executar CI/release no SHA exato; por
fim obter provas de target e autoridades externas.

## Estado de entrada

- melhoria `fromJSON`/`toJSON`: aprovada isoladamente, mas o harness completo
  regrediu porque uma mutação passou a corresponder a arquivo rastreado;
- runtime Helm de produção: ligação de Vault corrigida e validada localmente;
- identidade `6e365f4c`; registro P0 e snapshots `ec092d77`: divergentes/stale;
- controlador `.agent`: migração append-only concluída; `check_state.py` 11/11;
- Gauntlet: rodada corrente registrada como BLOCKED, sem finalização externa;
- gates internos: dependências, segredos, supply-chain regression e
  backup/restore documental falham;
- segurança/runtime: `/metrics` público agrega estado operacional cross-tenant;
  upload aceita 25 MiB na API, mas o ingress limita a requisição a 10 MiB;
- remoto: 30 commits atrás do `HEAD` auditado;
- externalidades: CI/release/target/UAT/autoridade continuam ausentes; 11 P0 do
  registro ainda abertos.

## Estratégia

1. Restaurar os quatro gates automatizados sem enfraquecer seus known-bads e
   corrigir `AUD21-09/10` antes do freeze.
2. Reexecutar regressão local, banco crítico, Helm obrigatório e segurança.
3. Congelar um novo SHA e reconciliar identity, registro P0 e snapshots.
4. Publicar somente após revisão independente do diff e autorização do owner.
5. Exigir CI exato e workflow de release encadeado para o mesmo SHA.
6. Separar o que é prova local, remota, de target e de autoridade.

## Milestones

### M-1 — gates locais novamente verdes (OPEN)

Saída: regressão supply-chain 17/17 com fixture hermética; política de pnpm
coerente; scanner de segredos verde com known-bad preservado; backup/restore
reconciliado com roadmap/backlog; métricas protegidas, upload coerente e Helm
3.15.4 obrigatório disponível.

### M0 — runtime e controle confiáveis (PARTIAL)

Saída local: Vault injetável por Secret, Helm obrigatório verde, smoke
production-shaped com Vault habilitado, controlador reconciliado e documentos
atualizados. A saída não é `DONE` enquanto a identidade não estiver congelada e
os aceites externos não existirem.

### M1 — candidato local congelado (BLOCKED-CANDIDATE)

Saída parcial: build/typecheck/lint e contratos críticos têm evidência local,
mas os gates de M-1 não estão verdes. Provas OCI/Trivy anteriores ficaram stale
após mudanças materiais. Não há fingerprint final candidate-bound.

### M2 — CI e release candidate-bound

Saída: push autorizado, 17/17 jobs no SHA, `workflow_run` encadeado, três OCI
escaneadas e publicadas por digest, attestations verificadas e pacote final
gerado sem reconstrução.

### M3 — target e aceite

Saída: deploy em ambiente aprovado, migração/RLS, restore/rollback, soak/SLO,
UAT e decisões Product/Clinical/Security/Operations no mesmo candidato.

### M4 — evolução arquitetural

Saída: hotspots reduzidos por fatias verticais sem alterar contratos; parser de
expressões apoiado por oracle diferencial e testes de fronteira explícitos.

## Quality Bar da rodada

- zero P0 interno conhecido;
- identidade única para fonte, CI, release, OCI, configuração e evidência;
- nenhum `PASS` de comando sem exit 0 atual;
- nenhuma prova local substitui target ou autoridade;
- known-bad obrigatório para Vault, parser, digest cruzado e evidência stale;
- críticos fresh distintos para código e integração;
- estado/documentação atualizados somente após a prova.

## Restrições e autoridade

Não fazer deploy, push, mudar branch protection, usar credenciais reais, rodar
drills destrutivos ou registrar aceite humano sem autorização explícita. A
correção local de código, testes e documentos não encerra UAT, recuperação,
compliance ou go/no-go.

## Recuperação

Se uma rodada falhar, preservar o primeiro erro, manter o candidato bloqueado e
voltar ao último SHA congelado. Não reutilizar OCI, scan ou parecer anterior a
uma mudança material. Não corrigir ledgers append-only por reescrita silenciosa.
