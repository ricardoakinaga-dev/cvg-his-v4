# 733. FINAL ADVERSARIAL AUDIT

Executar auditoria final fresh-context.

Objetivo:

# TENTAR REPROVAR O CANDIDATO

Não confirmar conclusões anteriores.

Procure ativamente:

```text id="1jck7w"
cross-tenant bypass
authorization bypass
stale evidence
SHA mismatch
race condition
duplicate material effect
lost event
lost audit
unsafe retry
RLS pool leak
migration incompatibility
restore inconsistency
supply-chain mismatch
performance regression
CI bypass
skip-ci abuse
unsafe default
secret exposure
unverified human claim
```

---

# 734. ADVERSARIAL AUDIT RESULT

Resultado permitido:

```text id="xkrwn7"
APPROVE
APPROVE_WITH_NONBLOCKING_FINDINGS
REJECT
```

Qualquer finding Critical ou P0:

```text id="i3c3rv"
REJECT
```

---

# 735. REOPEN AFTER FINAL AUDIT

Se auditoria final encontrar blocker:

```text id="uhf76g"
reopen P0
↓
invalidate dependent evidence
↓
fix
↓
retest
↓
rerun critics
```

Não manter aprovação antiga.

---

# 736. FINAL CERTIFICATION TRANSACTION

Tratar certificação como operação lógica única:

```text id="mnyg3r"
freeze candidate
↓
validate identity
↓
validate evidence graph
↓
validate P0 registry
↓
validate freshness
↓
calculate score
↓
validate hard gates
↓
validate target
↓
validate human approvals
↓
generate final manifest
↓
generate final verdict
```

---

# 737. NO PARTIAL CERTIFICATION

Se falhar no meio:

nenhum `TRIPLE-A VERIFIED` parcial.

---

# 738. FINAL VERDICT IMMUTABILITY

Depois de emitido para um release específico:

preservar historicamente.

---

# 739. FINAL CERTIFICATION ID

Gerar identificador único.

Exemplo conceitual:

```text id="sz97lq"
CVG-HIS-V4-AAA-<version>-<short-sha>
```

Não depender desse formato se o projeto já tiver convenção melhor.

---

# 740. CERTIFICATION RECORD

Registrar:

```text id="dm48v1"
certification_id
behavior_sha
release_sha
manifest_digest
timestamp
overall_score
critical_score
open_p0
verdict
```

---

# 741. CERTIFICATION DOES NOT MODIFY SOURCE

Gerar certificação não deve alterar comportamento do candidato.

Se geração modificar código executável:

candidate mudou e precisa revalidar.

---

# 742. DOC-ONLY CERTIFICATION COMMIT

Se for necessário commit posterior apenas para documentação de certificação:

marcar claramente como docs-only e preservar behavior SHA.

---

# 743. RELEASE TAG AFTER CERTIFICATION

Tag/release deve apontar para lineage correta.

---

# 744. FINAL RELEASE ARTIFACTS

Publicar apenas artefatos permitidos pela política.

Não publicar:

```text id="11m09p"
secrets
raw sensitive logs
production credentials
patient data
private key
```

---

# 745. FINAL CI ARTIFACT INDEX

CI deve permitir localizar:

```text id="g7omii"
test reports
security
performance
recovery
SBOM
attestation
manifest
verdict
```

---

# 746. FINAL FAILURE BEHAVIOR

Se certificação falhar:

final report deve dizer:

```text id="x31x3s"
WHY BLOCKED
WHAT REMAINS
WHO/WHAT IS REQUIRED
NEXT ACTION
```

---

# 747. FINAL SUCCESS BEHAVIOR

Se certificação passar:

não apenas escrever:

```text id="td9i68"
SUCCESS
```

Gerar evidência suficiente para reprodução/auditoria.

---

# 748. MECHANICALLY VERIFIABLE SUCCESS BLOCK

O bloco de sucesso final deve ser derivado do `final-verdict.json`.

Exemplo:

```text id="7rrszh"
TRIPLE_A_VERIFIED=true
CANDIDATE_SHA=<sha>
OVERALL_SCORE=<score>
CRITICAL_SCORE=<score>
OPEN_P0=0
EVIDENCE_GRAPH=PASS
TARGET=PASS
HUMAN_UAT=PASS
RELEASE_AUTHORITY=PASS
```

Não digitar esses valores manualmente.

---

# 749. SUCCESS BLOCK HASH

Opcionalmente registrar digest do `final-verdict.json`.

---

# 750. FINAL COMMAND OUTPUT

`pnpm release:triple-a` deve imprimir resumo curto.

Exemplo conceitual:

```text id="iwj85m"
CVG-HIS V4 — Triple-A Release Gate

Candidate: abc123
Evidence: VALID
Overall: 98
Critical: 97
Open P0: 0
Target: PASS
Human: PASS

VERDICT: TRIPLE-A VERIFIED
```

---

# 751. BLOCKED COMMAND OUTPUT

Exemplo:

```text id="c49txy"
CVG-HIS V4 — Triple-A Release Gate

Candidate: abc123
Evidence: VALID
Overall: 94
Critical: 91
Open P0: 3

BLOCKERS:
- P0-DATA-RLS-RUNTIME
- P0-RECOVERY-RESTORE
- P0-HUMAN-UAT

VERDICT: BLOCKED
```

---

# 752. EXIT CODES

Definir de forma consistente.

Exemplo conceitual:

```text id="9o8i2q"
0 = verified
1 = blocked/failure
2 = invalid evidence/candidate
```

Adapte ao padrão atual.

Não quebrar consumidores existentes desnecessariamente.

---

# 753. CI MUST CONSUME EXIT CODE

GitHub Actions deve falhar corretamente quando release gate bloquear.

---

# 754. NO `continue-on-error` FOR HARD GATES

Hard gate não deve usar:

```text id="yd5jvt"
continue-on-error: true
```

---

# 755. ADVISORY CHECKS

Checks genuinamente advisory devem ser claramente separados dos mandatory.

---

# 756. MANDATORY CHECK INVENTORY

Criar machine-readable inventory.

Exemplo:

`docs/triple-a/MANDATORY_GATES.json`

---

# 757. MANDATORY GATE DRIFT

CI deve detectar se gate obrigatório desapareceu do workflow.

---

# 758. WORKFLOW CONTRACT TESTS

Preservar/expandir testes que validam estrutura do GitHub Actions.

---

# 759. RELEASE WORKFLOW TAMPER TESTS

Testar que alterações como:

```text id="x9c39p"
remove scan
move publication before gate
continue-on-error
remove attestation verify
```

fazem contract tests falharem.

---

# 760. QUALITY BAR TAMPER TEST

Testar que redução não autorizada de:

```text id="h13pss"
97
95
0 P0
```

é detectada, se o projeto possuir quality bar freeze.

---

# 761. P0 REGISTRY TAMPER TEST

Não permitir simplesmente excluir P0 aberto para aumentar score sem closure evidence.

---

# 762. EVIDENCE DELETION TEST

Evidence obrigatória removida:

```text id="3l5jsq"
gate = BLOCKED
```

---

# 763. STALE EVIDENCE TEST

Alterar behavior SHA artificialmente em fixture.

Evidence antiga deve virar:

```text id="k7b6vy"
STALE
```

---

# 764. HUMAN EVIDENCE VALIDATION

Human evidence deve possuir campos mínimos.

Mas automação não deve tentar validar subjetivamente se pessoa "realmente gostou" do sistema.

---

# 765. RELEASE AUTHORITY VALIDATION

Validar estrutura/identidade permitida conforme política.

Não inventar aprovação.

---

# 766. AUDITABILITY

Uma terceira pessoa deve conseguir responder:

> Por que este release recebeu Triple-A?

usando o evidence package.

---

# 767. REPRODUCIBILITY

Uma terceira pessoa com ambiente apropriado deve conseguir reproduzir os principais gates.

---

# 768. TRACEABILITY

Cada requisito crítico deve apontar para:

```text id="rq84cl"
code
test
evidence
```

---

# 769. NO ORPHAN TEST

Teste crítico sem requisito/risco claro deve ser revisado.

---

# 770. NO ORPHAN REQUIREMENT

Requisito crítico sem teste/evidence deve aparecer como gap.

---

# 771. FINAL REQUIREMENT COVERAGE

Gerar matriz:

```text id="qek8kw"
requirement
implementation
test
evidence
status
```

---

# 772. FINAL P0 COVERAGE

Todos os P0 devem aparecer nessa matriz.

---

# 773. FINAL ARCHITECTURE DOCUMENT

Atualizar arquitetura somente se mudanças desta campanha realmente alterarem desenho.

Não redesenhar diagramas sem necessidade.

---

# 774. FINAL ADR REVIEW

Garantir ADRs para decisões significativas feitas durante closure.

Exemplos:

```text id="vebquk"
evidence graph
performance regression vs certification
lease/fencing semantics
release promotion
```

---

# 775. NO ADR FOR TRIVIAL FIX

Não gerar ADR para cada bug pequeno.

---

# 776. FINAL OPERATIONAL DOC REVIEW

Confirmar:

```text id="69y8md"
deploy
rollback
backup
restore
incident
performance
UAT
```

---

# 777. FINAL SECURITY DOC REVIEW

Confirmar:

```text id="1tkuzb"
roles
RLS
secrets
supply chain
webhooks
uploads
```

---

# 778. FINAL CLINICAL DOC REVIEW

Confirmar:

```text id="zuh9bq"
criticality
safety invariants
workflow/handover
```

---

# 779. FINAL DEVELOPER DOC REVIEW

Confirmar:

```text id="z95kkv"
setup
test
build
candidate
release
```

---

# 780. FINAL DOCUMENT LINKS

Sem links internos quebrados.

---

# 781. FINAL README

README principal deve apontar para documentação canônica atual.

Não transformar README em relatório Triple-A gigantesco.

---

# 782. FINAL STATUS BADGES

Se usar badges, garantir que representam checks reais.

Não criar badge "Triple-A" estático sem release certificado.

---

# 783. CERTIFICATION BADGE

Se desejar badge Triple-A:

ele deve ser derivado de release certificado, não apenas main.

---

# 784. SECURITY BADGE LANGUAGE

Não usar "secure" absoluto.

---

# 785. FINAL REPOSITORY SIZE REVIEW

Verificar artefatos grandes.

---

# 786. GIT HISTORY

Não reescrever histórico remoto apenas para limpeza desta campanha.

---

# 787. NO FORCE PUSH

Não usar force-push em `main`.

---

# 788. SAFE BRANCHING

Se mudanças forem extensas, usar branch/PR conforme workflow atual.

---

# 789. MAIN DIRECT PUSH

Se repositório atualmente permite direct push, não usar isso como prova de boa governança.

Branch governance deve ser avaliada separadamente.

---

# 790. PR REVIEW

Quando policy exigir revisão humana:

```text id="d2hf6n"
HUMAN_REQUIRED
```

---

# 791. FINAL MERGE SHA

Registrar merge SHA quando houver.

---

# 792. MERGE VS BEHAVIOR SHA

Candidate identity deve lidar corretamente com merge commit sem confundir behavior lineage.

---

# 793. DOC DESCENDANT

Commit documental descendente pode apontar para behavior SHA certificado.

---

# 794. NO CODE IN DOC DESCENDANT

Guard deve provar que é docs-only.

---

# 795. FINAL SKIP-CI AUDIT

Auditar todos os `[skip ci]` relevantes da campanha.

---

# 796. FINAL BYPASS AUDIT

Procurar:

```text id="3owr3v"
skip
force
override
bypass
ignore
continue-on-error
allow-failure
```

e revisar contexto.

---

# 797. OVERRIDE INVENTORY

Overrides legítimos devem ser documentados.

---

# 798. OVERRIDE EXPIRY

Temporary override deve possuir expiry quando apropriado.

---

# 799. NO PERMANENT TEMPORARY BYPASS

Eliminar bypass temporário obsoleto.

---

# 800. FINAL SECURITY BOUNDARY REVIEW

Revisar todas as trust boundaries:

```text id="wnip5e"
browser → API
API → DB
API → Redis
API → provider
worker → DB
worker → provider
CI → registry
operator → production
```

---

# 801. THREAT MODEL REFRESH

Atualizar threat model se a campanha mudou boundaries relevantes.

---

# 802. STRIDE OR EQUIVALENT

Usar método estruturado existente.

Não gerar ameaça genérica sem ligação com sistema real.

---

# 803. ABUSE CASES

Revisar:

```text id="mpxv92"
cross-tenant enumeration
credential stuffing
webhook replay
malicious attachment
billing replay
admin misuse
```

---

# 804. FINAL SECURITY TEST MAPPING

Threats importantes devem apontar para controles/testes.

---

# 805. FINAL PRIVACY REVIEW

Verificar logs/events/metrics novamente.

---

# 806. FINAL SECRET SCAN OF HISTORY RANGE

Escanear range relevante da campanha quando tooling permitir.

---

# 807. FINAL SCA

Executar dependency vulnerability scan fresco.

---

# 808. FINAL CONTAINER SCAN

Nas imagens finais.

---

# 809. FINAL SBOM

Gerar das imagens/artefatos finais.

---

# 810. FINAL ATTESTATION VERIFY

Verificar de forma independente dentro do pipeline.

---

# 811. FINAL PROVENANCE CHECK

Confirmar source/repository/workflow/digest.

---

# 812. FINAL DEPLOY DIGEST CHECK

Deploy rehearsal/target deve usar digest certificado.

---

# 813. FINAL DATABASE ROLE CHECK

API e worker usando roles corretas.

---

# 814. FINAL RLS POOL LEAK CHECK

Obrigatório.

---

# 815. FINAL CLINICAL DUPLICATION CHECK

Obrigatório para medication/result/workflow.

---

# 816. FINAL FINANCIAL DUPLICATION CHECK

Obrigatório.

---

# 817. FINAL EVENT LOSS CHECK

Testar transactional outbox/failure boundary.

---

# 818. FINAL WORKER LOSS CHECK

Nenhum job crítico desaparece silenciosamente.

---

# 819. FINAL DLQ CHECK

Poison job chega a DLQ de forma observável.

---

# 820. FINAL REPLAY CHECK

Replay autorizado, auditável e idempotente.

---

# 821. FINAL HANDOVER CHECK

Se handover estiver no release scope:

testar.

Se ainda for roadmap:

não fingir completude.

---

# 822. FINAL FEATURE SCOPE

Antes de certification, congelar explicitamente:

```text id="9j4zfk"
IN_SCOPE
OUT_OF_SCOPE
```

---

# 823. OUT-OF-SCOPE DOES NOT BLOCK

Feature explicitamente fora do release não deve reduzir quality score por ausência, salvo quality bar exigir.

---

# 824. IN-SCOPE MUST BE COMPLETE

Feature in-scope crítica não pode ficar parcialmente implementada.

---

# 825. FINAL PRODUCT SCOPE DOCUMENT

Criar/atualizar documento enxuto com escopo do release.

---

# 826. FINAL PARITY REVIEW

Não usar concorrente como definição automática de qualidade.

---

# 827. FINAL CLINICAL WORKFLOW REVIEW

Priorizar operação real do CVG.

---

# 828. FINAL OPERATOR WORKFLOW REVIEW

Perguntar:

```text id="wz2emc"
A informação necessária está disponível?
A ação é rápida?
O erro é compreensível?
O estado é auditável?
```

---

# 829. FINAL LATENCY UX REVIEW

Mesmo backend dentro do SLO pode gerar UX lenta.

Revisar.

---

# 830. FINAL ERROR UX REVIEW

Erro clínico não deve aparecer apenas como:

```text id="zpxgxa"
Something went wrong
```

quando orientação segura puder ser dada.

Não revelar detalhes sensíveis.

---

# 831. FINAL CONFLICT UX

409/concurrency conflict deve ser tratável pelo usuário.

---

# 832. FINAL PERMISSION UX

403 deve ser claramente diferente de erro técnico.

---

# 833. FINAL OFFLINE/DEGRADED UX

Se sistema não suporta offline, não fingir.

Mostrar indisponibilidade de forma segura.

---

# 834. FINAL PRINT/EXPORT UX

Se fluxos hospitalares dependem de impressão/export, validar escopo.

---

# 835. FINAL MOBILE UX

Mobile não precisa ter paridade total se não for requisito.

Mas telas que suportam mobile devem funcionar.

---

# 836. FINAL TABLET UX

Importante para operação clínica se estiver em scope.

---

# 837. FINAL KEYBOARD UX

Recepção pode se beneficiar fortemente.

Preservar produtividade.

---

# 838. FINAL COMMAND PALETTE

Se existente, validar autorização e navegação.

Não permitir acessar rota proibida apenas pelo command palette.

---

# 839. FINAL GLOBAL SEARCH

Cross-tenant e permission tests.

---

# 840. FINAL NOTIFICATION CENTER

Testar:

```text id="ktmhv1"
read
unread
ack
link target
tenant
```

---

# 841. FINAL WORKFLOW NOTIFICATIONS

Task/reminder não deve apontar para paciente errado.

---

# 842. FINAL DEEP LINK SECURITY

Deep link precisa passar autorização normal.

---

# 843. FINAL BROWSER HISTORY

Back/forward não deve expor dados proibidos após logout de maneira indevida.

---

# 844. FINAL CACHE-CONTROL

Respostas sensíveis devem usar policy apropriada.

---

# 845. FINAL LOGOUT

Após logout, superfícies protegidas não devem continuar utilizáveis via state/cache inseguro.

---

# 846. FINAL SESSION EXPIRY UX

Expiração deve ser tratada de forma previsível.

---

# 847. FINAL CLOCK UX

Datas e horários clínicos devem ser inequívocos.

---

# 848. FINAL AUDIT TIMESTAMP

Audit deve registrar timestamp consistente.

---

# 849. FINAL TIMEZONE TEST

Rodar CI crítico com timezone explícito.

---

# 850. FINAL LOCALE TEST

Rodar superfícies críticas em pt-BR.

---

# 851. FINAL ERROR RATE

Performance certification deve validar error rate, não só latência.

---

# 852. FINAL AVAILABILITY

Mesma coisa.

---

# 853. FINAL SATURATION

Registrar CPU/memory/
