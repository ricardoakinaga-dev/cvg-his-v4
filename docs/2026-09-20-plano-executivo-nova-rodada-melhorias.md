---
document_status: current
document_kind: plan
effective_date: 2026-09-21
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
---

# Plano executivo — nova rodada de melhorias

[Auditoria vigente](2026-09-20-auditoria-scorecard-db07cd02.md) ·
[Roadmap](2026-09-20-roadmap-nova-rodada-melhorias.md) ·
[Backlog](2026-09-20-backlog-nova-rodada-melhorias.md)

## Objetivo

Transformar a árvore auditada em `be2dc76a` em um candidato publicável e
auditável, sem promover evidência antiga: primeiro restaurar os gates locais;
depois congelar uma identidade única e executar CI/release no SHA exato; por
fim obter provas de target e autoridades externas.

## Estado atual após a rodada local

- runtime corrente: `29b03941c5d46a4598c11f27bbb7125d1d205f0f`; a identidade do candidato será congelada após o próximo freeze limpo;
- supply-chain 17/17, dependências, segredos, segurança enterprise e
  backup/restore documental passam localmente;
- `/metrics` exige token dedicado e cache bounded; upload usa 25 MiB/413 em
  API, OpenAPI e ingress;
- Helm oficial 3.15.4, RLS, runtime, tracing, lint, typecheck, build, suíte
  monorepo, PostgreSQL crítico 623/623, processos críticos 11/11, SPA E2E
  424/424 e imagens production-shaped passam localmente;
- identidade e controles documentais estão sendo reconciliados ao candidato;
- Trivy não está instalado e não há CI/release/target/UAT/autoridade externos;
  o estado global permanece `LOCAL_COMPLETE / EXTERNAL_BLOCKED`.

## Estratégia

1. Restaurar os quatro gates automatizados sem enfraquecer seus known-bads e
   corrigir `AUD21-09/10` antes do freeze.
2. Reexecutar regressão local, banco crítico, Helm obrigatório e segurança.
3. Congelar um novo SHA e reconciliar identity, registro P0 e snapshots.
4. Publicar somente após revisão independente do diff e autorização do owner.
5. Exigir CI exato e workflow de release encadeado para o mesmo SHA.
6. Separar o que é prova local, remota, de target e de autoridade.

## Milestones

### M-1 — gates locais novamente verdes (PASS-LOCAL)

Saída: regressão supply-chain 17/17 com fixture hermética; política de pnpm
coerente; scanner de segredos verde com known-bad preservado; backup/restore
reconciliado com roadmap/backlog; métricas protegidas, upload coerente e Helm
3.15.4 obrigatório disponível.

### M0 — runtime e controle confiáveis (PASS-LOCAL / TARGET-BLOCKED)

Saída local: Vault injetável por Secret, Helm obrigatório verde, smoke
production-shaped com Vault habilitado, controlador reconciliado e documentos
atualizados. A saída não é `DONE` enquanto a identidade não estiver congelada e
os aceites externos não existirem.

### M1 — candidato local congelado (PASS-LOCAL / EXTERNAL-BLOCKED)

Saída local: runtime validado em `29b03941`; identidade/P0/snapshots serão vinculados no freeze limpo
candidate-bound e gates locais reexecutados. As imagens locais passaram o gate
production-shaped e têm raízes por digest; Trivy segue `NOT_RUN` por ausência da
ferramenta e não há prova remota.

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
