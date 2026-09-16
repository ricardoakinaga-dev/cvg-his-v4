# 617. FINAL VERDICT EXAMPLES

## Caso tecnicamente excelente, mas ainda incompleto

```text id="s9wdwz"
OVERALL: 97
CRITICAL: 97
OPEN P0: 0

AUTOMATED GATES: PASS
TARGET ASSURANCE: TARGET_REQUIRED
HUMAN UAT: HUMAN_REQUIRED
RELEASE AUTHORITY: HUMAN_REQUIRED

VERDICT:
TRIPLE-A CANDIDATE
```

Não emitir `TRIPLE-A VERIFIED`.

---

# 618. FINAL VERDICT — BLOCKED

Exemplo:

```text id="t8gtf6"
OVERALL: 98
CRITICAL: 98
OPEN P0: 1

BLOCKER:
RLS runtime cross-tenant test failed

VERDICT:
BLOCKED
```

O score alto não supera P0.

---

# 619. FINAL VERDICT — VERIFIED

Somente quando:

```text id="m92sq6"
OVERALL: >=97
CRITICAL: >=95
OPEN P0: 0

AUTOMATED GATES: PASS
TARGET GATES: PASS
HUMAN UAT: PASS
RELEASE AUTHORITY: PASS
FRESH CRITICS: PASS
EVIDENCE: VALID

VERDICT:
TRIPLE-A VERIFIED
```

---

# 620. FINAL VERDICT — INVALID

Se evidence graph estiver adulterado, inconsistente ou apontando para SHA errado:

```text id="0o7vsv"
VERDICT:
INVALID_CANDIDATE
```

Não apenas BLOCKED.

---

# 621. FINAL SCORE EXPLANATION

Relatório deve diferenciar:

```text id="6ip3df"
TECHNICAL QUALITY
```

de:

```text id="x1ls9b"
CERTIFICATION EVIDENCE
```

para evitar interpretar score de evidence como qualidade do código.

---

# 622. TECHNICAL QUALITY SCORE

Pode existir score técnico separado, desde que não substitua quality gate.

Exemplo:

```text id="c75s01"
Technical Engineering Score: 98
Triple-A Evidence Score: 84
Verdict: Candidate
```

---

# 623. NO CONFUSING SCORE LABELS

Não apresentar:

```text id="ypgmxg"
25/100
```

sem dizer claramente o que esse número mede.

---

# 624. FINAL EXECUTIVE SUMMARY

Resumo deve responder em poucas linhas:

1. O ERP está tecnicamente pronto?
2. O que foi comprovado?
3. O que ainda não foi comprovado?
4. Há P0?
5. Pode ser liberado?
6. Pode receber selo Triple-A?

---

# 625. FINAL CHANGE SUMMARY

Listar melhorias por domínio:

```text id="lyeh3j"
Architecture
Clinical
Database
Security
Workflow
Worker
Frontend
Performance
Recovery
Supply Chain
Governance
```

---

# 626. FINAL TEST SUMMARY

Informar:

```text id="qx8y4d"
unit
integration
DB
RLS
clinical
E2E
visual
security
performance
recovery
```

com contagens/resultados quando disponíveis.

Não inventar contagem.

---

# 627. FINAL FAILURE SUMMARY

Se algo falhar:

listar primeiro blockers, depois itens não bloqueadores.

---

# 628. FINAL HUMAN ACTIONS

Se houver `HUMAN_REQUIRED`, produzir uma seção:

```text id="g6q0qb"
AÇÕES HUMANAS NECESSÁRIAS
```

com passos objetivos.

---

# 629. FINAL TARGET ACTIONS

Se houver `TARGET_REQUIRED`, produzir:

```text id="x4h7va"
AÇÕES NO AMBIENTE-ALVO
```

com comandos/runbooks quando seguro.

---

# 630. NO FALSE COMPLETION

Não escrever:

```text id="f1ec8k"
"tudo concluído"
```

se UAT/target/release authority ainda estiverem pendentes.

---

# 631. PARTIAL SESSION COMPLETION

Se a sessão terminar antes:

registrar exatamente:

```text id="td90t2"
completed
in_progress
blocked
next action
```

---

# 632. RESUMABILITY

Outra sessão Codex deve conseguir continuar usando:

```text id="17gr9j"
CURRENT_CANDIDATE_IDENTITY.json
P0_REGISTRY.json
evidence-graph.json
EXECUTION_LOG.md
```

sem depender de memória da sessão anterior.

---

# 633. AGENT STATE IS NOT EVIDENCE

`.agent` pode controlar execução.

Mas estado do agente sozinho não prova qualidade.

Evidence deve apontar para testes/artefatos reais.

---

# 634. GAUNTLET STATE IS NOT PRODUCT TRUTH

Mesmo princípio para `.gauntlet`.

---

# 635. CODE + TEST + RUNTIME EVIDENCE

Quando documentação e runtime divergirem:

prioridade:

```text id="51mr3f"
executable behavior
+
tests
+
canonical deployment
+
fresh evidence
```

Depois corrigir documentação.

---

# 636. NO SILENT DOCUMENT FIX

Se documentação estava errada:

registrar a divergência.

Não reescrever história como se nunca tivesse existido.

---

# 637. NO MASSIVE DOCUMENT SPAM

Não gerar centenas de Markdown redundantes.

Preferir poucos documentos canônicos + evidence machine-readable.

---

# 638. DOCUMENTATION TARGET

Ao final, documentação principal deve ser fácil de navegar.

Sugestão:

```text id="c6n4v8"
docs/triple-a/
├── README.md
├── QUALITY_BAR_V1.json
├── CURRENT_CANDIDATE_IDENTITY.json
├── P0_REGISTRY.json
├── 13-final-scorecard.md
├── FINAL_REPORT.md
├── EXECUTION_LOG.md
├── RESIDUAL_RISK_REGISTER.md
└── scorecard-history/
```

Não reorganizar cegamente se estrutura existente já cumprir objetivo.

---

# 639. TRIPLE-A README

Criar/atualizar:

`docs/triple-a/README.md`

Explicar:

```text id="6bbnhp"
quality bar
candidate identity
evidence
how to run gates
verdict semantics
human requirements
```

---

# 640. ONE-COMMAND LOCAL CHECK

Idealmente oferecer:

```text id="ecw1jo"
pnpm triple-a:check
```

ou reutilizar comando existente.

Deve executar verificações seguras localmente.

Não tentar UAT/target automaticamente.

---

# 641. ONE-COMMAND CANDIDATE CHECK

Pode existir:

```text id="xrczgt"
pnpm triple-a:candidate
```

para verificar elegibilidade automatizada.

Reutilize comandos existentes quando possível.

---

# 642. RELEASE COMMAND

`pnpm release:triple-a`

continua sendo autoridade automatizada final.

---

# 643. RELEASE COMMAND MUST FAIL CLOSED

Qualquer evidence obrigatória:

```text id="lkg5ka"
missing
invalid
stale
failed
```

deve produzir exit code != 0.

---

# 644. MACHINE-READABLE EXIT

Além do exit code, produzir `final-verdict.json`.

---

# 645. NO PARTIAL PASS EXIT ZERO

Se verdict final for BLOCKED:

release command deve falhar.

---

# 646. CANDIDATE COMMAND MAY EXIT DISTINCTLY

Se útil, candidate check pode diferenciar:

```text id="sct5s9"
PASS_AUTOMATED_BUT_HUMAN_REQUIRED
```

sem confundir com release PASS.

---

# 647. CI SUMMARY

GitHub Actions summary deve mostrar:

```text id="h2x2o9"
Candidate
Overall
Critical
Open P0
Automated
Target
Human
Verdict
```

---

# 648. FAILURE LINKS

Summary deve apontar para artefatos/logs relevantes.

---

# 649. FINAL SECURITY SCAN

Antes do freeze final:

executar novamente:

```text id="w05u62"
secret scan
SAST
dependency audit
container scan
```

---

# 650. FINAL LICENSE SCAN

Executar policy existente.

---

# 651. FINAL OPENAPI CHECK

Executar runtime parity.

---

# 652. FINAL MIGRATION CHECK

Validar:

```text id="q8ldzk"
canonical migration source
integrity
upgrade
RLS
```

---

# 653. FINAL RLS CHECK

Cross-tenant tests precisam ser frescos.

---

# 654. FINAL WORKFLOW CHECK

Concurrency + fencing frescos.

---

# 655. FINAL CLINICAL CHECK

Golden path + negative paths frescos.

---

# 656. FINAL RECOVERY CHECK

Restore evidence precisa apontar para candidato/schema compatível.

---

# 657. FINAL PERFORMANCE CHECK

Performance evidence precisa apontar para candidate behavior.

---

# 658. FINAL SUPPLY-CHAIN CHECK

Images/digests/provenance precisam apontar para o mesmo candidato.

---

# 659. FINAL UAT CHECK

UAT deve apontar para candidate/release identity.

---

# 660. FINAL RELEASE AUTHORITY CHECK

Authority deve aprovar exatamente aquele release candidate.

---

# 661. FINAL EVIDENCE GRAPH FREEZE

Depois da certificação:

congelar graph final como artefato histórico.

---

# 662. FINAL SCORECARD FREEZE

Mesmo princípio.

---

# 663. FINAL RELEASE TAG

Se processo atual usar Git tag:

tag deve apontar para release correto.

Não criar tag falsa apenas para satisfazer gate.

---

# 664. TAG IMMUTABILITY

Não mover tag de release certificada.

---

# 665. RELEASE NOTES BINDING

Release notes devem apontar para:

```text id="c17jmh"
tag
SHA
manifest digest
```

---

# 666. POST-RELEASE MONITORING

Preparar checklist pós-release:

```text id="p7h9pe"
error rate
latency
DB
worker
DLQ
auth
clinical workflow
```

---

# 667. POST-RELEASE INCIDENT TRIGGER

Definir quando considerar rollback/rollforward.

---

# 668. POST-RELEASE CERTIFICATION STATUS

Se problema crítico surgir depois:

não reescrever evidence histórica.

Registrar incidente e estado operacional atual.

---

# 669. TRIPLE-A IS RELEASE-SPECIFIC

Reforço:

```text id="cmtb13"
release X was verified
```

não significa:

```text id="0br2mm"
all future main commits are verified
```

---

# 670. FINAL CLEAN WORKTREE

Antes de finalizar candidato:

```text id="ok6i91"
git status
```

deve estar limpo salvo artefatos explicitamente ignorados.

---

# 671. FINAL DIFF REVIEW

Inspecionar diff do candidato contra baseline anterior.

Procurar mudanças acidentais.

---

# 672. FINAL SECRET DIFF REVIEW

Verificar novamente que nenhum segredo entrou no Git.

---

# 673. FINAL GENERATED FILE REVIEW

Confirmar que nenhum arquivo runtime grande foi commitado acidentalmente.

---

# 674. FINAL DEPENDENCY DIFF

Revisar novas dependências adicionadas durante a campanha.

Remover dependências desnecessárias.

---

# 675. FINAL COMPLEXITY REVIEW

Executar complexity guard.

Não exigir perfeição cosmética, mas impedir regressão importante.

---

# 676. FINAL ARCHITECTURE BOUNDARY CHECK

Executar module-boundary guard.

---

# 677. FINAL CIRCULAR DEPENDENCY CHECK

Executar.

---

# 678. FINAL DOC VALIDATION

Executar:

```text id="pqqpnp"
docs:validate
```

ou equivalente.

---

# 679. FINAL DOC CONSISTENCY

Scorecard, report, identity e evidence devem concordar.

---

# 680. FINAL PROMPT TRACEABILITY

Registrar que esta campanha foi executada contra o master prompt correspondente.

Não usar o prompt como evidence de qualidade; apenas rastreabilidade.

---

# 681. MASTER PROMPT HASH

Se o projeto já mantém SHA-256 do prompt, atualizar corretamente.

---

# 682. REQUIREMENT TRACEABILITY

Mapear requisitos deste prompt para:

```text id="z5fgk1"
implemented
verified
blocked
not applicable
```

Não criar fake PASS para itens N/A.

---

# 683. NOT APPLICABLE

Use `NOT_APPLICABLE` apenas quando realmente não se aplica.

Registrar justificativa.

Não usar N/A para escapar de requisito difícil.

---

# 684. REQUIREMENT CROSSWALK

Atualizar crosswalk existente em vez de criar sistema paralelo.

---

# 685. FINAL CROSSWALK VALIDATION

Garantir que cada P0/requisito crítico tenha:

```text id="27zxzh"
implementation
test
evidence
status
```

---

# 686. FINAL BLOCKER REVIEW

Antes do verdict, listar todos os blockers ainda existentes.

Se lista não estiver vazia:

não emitir Verified.

---

# 687. FINAL HUMAN REVIEW PACKAGE

Preparar pacote enxuto para humanos:

```text id="xob3nm"
candidate
changes
known risks
UAT scenarios
performance
recovery
security
rollback
```

---

# 688. RELEASE AUTHORITY SHOULD NOT READ 1,000 FILES

Resumir evidence de forma auditável.

Permitir drill-down.

---

# 689. FINAL OPERATOR PACKAGE

Preparar:

```text id="9n7oyx"
deploy runbook
rollback runbook
DR runbook
incident runbook
```

---

# 690. FINAL CLINICAL USER PACKAGE

Preparar UAT e release notes relevantes para operação.

Não expor detalhes técnicos desnecessários aos usuários clínicos.

---

# 691. FINAL DEVELOPER PACKAGE

Documentar:

```text id="vkr4sq"
how to reproduce
how to run tests
how evidence works
how to create next candidate
```

---

# 692. POST-CERTIFICATION DEVELOPMENT FLOW

Depois do Triple-A:

novo desenvolvimento deve seguir:

```text id="7sp71l"
branch
↓
PR
↓
required checks
↓
main
↓
new candidate when releasing
```

---

# 693. REGRESSION PREVENTION

Todos os bugs críticos corrigidos nesta campanha devem possuir regressão permanente.

---

# 694. QUALITY BAR PRESERVATION

Não remover gates depois da certificação para acelerar desenvolvimento.

---

# 695. FAST FEEDBACK VS FINAL ASSURANCE

Pode haver CI rápido para PR.

Final release continua completo.

---

# 696. NO OVERENGINEERING

Não implementar mecanismo sofisticado se:

```text id="hvk2rw"
simple constraint
simple test
simple policy
```

resolve adequadamente.

---

# 697. MINIMAL SUFFICIENT CHANGE

Para cada finding:

fazer a menor mudança que resolve root cause de forma robusta.

---

# 698. MAINTAINABILITY

Novo código deve ser mais fácil de manter que o problema que resolve.

---

# 699. COMMENTS

Comentar decisões não óbvias.

Não comentar código trivial.

---

# 700. TYPES

Evitar:

```text id="4gqh39"
any
unknown casts
non-null assertions
```

sem justificativa.

---

# 701. ERROR HANDLING

Evitar:

```text id="yd4f5b"
catch {}
```

e erros engolidos.

---

# 702. NO SECRET FALLBACK

Nunca usar secret default inseguro em produção.

---

# 703. NO AUTH FALLBACK

Se auth provider falhar, não liberar acesso.

---

# 704. NO RLS FALLBACK

Se tenant context não estiver definido:

falhar fechado em superfícies tenant-bound.

---

# 705. NO MALWARE SCAN FALLBACK

Se policy exige scan e scanner está indisponível:

falhar conforme policy.

---

# 706. NO PAYMENT FALLBACK

Falha de provider não pode marcar pagamento como sucesso.

---

# 707. NO DIAGNOSTIC FALLBACK

Falha de ingestão não pode criar resultado clínico falso.

---

# 708. NO WORKFLOW SILENT DROP

Task/job não pode desaparecer por exceção silenciosa.

---

# 709. NO AUDIT SILENT DROP

Operação crítica não deve prosseguir silenciosamente se audit obrigatório falhar, conforme arquitetura/policy.

Definir comportamento explicitamente.

---

# 710. FAILURE ATOMICITY

Para cada fluxo P0, perguntar:

> O que acontece se falhar exatamente no meio?

Criar teste quando necessário.

---

# 711. CLINICAL TRANSACTION REVIEW

Especialmente:

```text id="5q3hm6"
medication
prescription
diagnostic result
admission
discharge
```

---

# 712. FINANCIAL TRANSACTION REVIEW

Especialmente:

```text id="7quj89"
payment
settlement
refund
cash
inventory-linked billing
```

---

# 713. WORKFLOW TRANSACTION REVIEW

Especialmente:

```text id="ad2kts"
claim
complete
retry
DLQ
replay
```

---

# 714. FINAL DATA CORRUPTION TESTS

Failure injection não pode produzir estado impossível.

---

# 715. FINAL DUPLICATE EFFECT TESTS

Redelivery/retry não pode duplicar efeito material crítico.

---

# 716. FINAL CROSS-TENANT TESTS

Executar novamente no candidato final.

---

# 717. FINAL ROLE TESTS

Executar least privilege.

---

# 718. FINAL SESSION TESTS

Executar revocation/auth.

---

# 719. FINAL PROVIDER CONTRACTS

Executar contract tests.

---

# 720. FINAL E2E

Executar suíte completa exigida.

---

# 721. FINAL VISUAL

Executar baselines atuais.

---

# 722. FINAL A11Y

Executar.

---

# 723. FINAL PERFORMANCE REGRESSION

Executar.

---

# 724. FINAL PERFORMANCE CERTIFICATION

Executar em ambiente controlado.

---

# 725. FINAL BACKUP

Gerar backup do dataset representativo.

---

# 726. FINAL RESTORE

Restaurar.

---

# 727. FINAL GAME DAY

Executar matrix exigida.

---

# 728. FINAL SOAK

Executar duração exigida pela policy.

---

# 729. FINAL SUPPLY CHAIN

Verificar artefatos finais.

---

# 730. FINAL HUMAN UAT

Aguardar/registrar humano.

---

# 731. FINAL AUTHORITY

Aguardar/registrar autoridade.

---

# 732. FINAL CRITICS

Executar.

---

# 733. FINAL ADVERSARIAL AUDIT

Execut
