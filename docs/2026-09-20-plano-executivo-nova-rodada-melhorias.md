---
document_status: current
document_kind: plan
effective_date: 2026-09-20
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
---

# Plano executivo — nova rodada de melhorias

[Auditoria vigente](2026-09-20-reauditoria-candidato-a9ff1b1a.md) ·
[Roadmap](2026-09-20-roadmap-nova-rodada-melhorias.md) ·
[Backlog](2026-09-20-backlog-nova-rodada-melhorias.md)

## Objetivo

Transformar o candidato local `a9ff1b1a` em um candidato publicável e
auditável, sem promover evidência antiga: primeiro corrigir o runtime de
produção e a governança; depois executar CI/release no SHA exato; por fim obter
provas de target e autoridades externas.

## Estado de entrada

- melhoria `fromJSON`/`toJSON`: aprovada localmente;
- runtime Helm de produção: ligação de Vault corrigida e validada localmente;
- identidade/snapshots: stale;
- controlador `.agent`: migração append-only concluída; `check_state.py` 11/11;
- Gauntlet: rodada corrente registrada como BLOCKED, sem finalização externa;
- remoto: 28 commits atrás do candidato;
- externalidades: CI/release/target/UAT/autoridade continuam ausentes; 11 P0 do
  registro ainda abertos.

## Estratégia

1. Fechar defeitos internos que impedem startup e invalidam a prova.
2. Migrar/reconciliar o controle sem apagar histórico.
3. Congelar um novo SHA e executar a regressão proporcional.
4. Publicar somente após revisão independente do diff e autorização do owner.
5. Exigir CI exato e workflow de release encadeado para o mesmo SHA.
6. Separar o que é prova local, remota, de target e de autoridade.

## Milestones

### M0 — runtime e controle confiáveis (PASS-LOCAL)

Saída local: Vault injetável por Secret, Helm executável verde, smoke
production-shaped com Vault habilitado, controlador reconciliado e documentos
atualizados. A saída não é `DONE` enquanto a identidade não estiver congelada e
os aceites externos não existirem.

### M1 — candidato local congelado (BLOCKED-CANDIDATE)

Saída parcial: regressões focais, build/typecheck/lint, supply chain, Helm e
três imagens foram executados após o último byte observado; evidências locais e
críticos fresh existem. O guard de identidade recusa a worktree suja, portanto
não há candidato congelado nem fingerprint final candidate-bound.

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
