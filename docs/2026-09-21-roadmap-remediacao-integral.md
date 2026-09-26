---
document_status: historical
document_kind: roadmap
effective_date: 2026-09-21
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
superseded_by: docs/2026-09-26-roadmap-rodada-2.md
---

# Roadmap de remediação integral

[Auditoria](2026-09-21-auditoria-profunda-repositorio.md) ·
[Plano executivo](2026-09-21-plano-executivo-remediacao-integral.md) ·
[Backlog](2026-09-21-backlog-remediacao-integral.md) ·
[Prompt Codex](2026-09-21-prompt-codex-remediacao-integral.md)

## Como interpretar

As janelas abaixo são faixas relativas de planejamento, não promessa de prazo.
Dependem de disponibilidade de ambiente, credenciais, providers e autoridades.
Uma onda só promove o candidato quando seu gate obrigatório passa; trabalho de
preparação da onda seguinte pode ocorrer em paralelo sem declarar fechamento.

## Visão executiva

| Onda | Horizonte relativo | Resultado | Itens principais | Gate de saída |
| --- | --- | --- | --- | --- |
| W0 — preservar e reproduzir | D0–D2 | trabalho protegido e baseline no Node oficial | REM-001, 003–008 | backup verificável; falhas reproduzidas em Node 22.23.2 |
| W1 — tornar publicável | D2–D7 | histórico publicável e gates locais verdes | REM-002, 009–017, 026, 031–033 | checkout limpo passa gate local integral |
| W2 — provar CI/release | Semana 2 | SHA remoto candidate-bound | REM-018–021, 034–035 | CI/release/OCI/attestation no mesmo SHA |
| W3 — certificar target | Semanas 2–4 | dados, recovery e performance comprovados | REM-022–025, 030 | evidência target aprovada |
| W4 — fechar produto/UAT | Semanas 3–8 | paridade 11/11 e aceite de uso | REM-027–029, 036–042 | fluxos/providers/UAT aprovados |
| W5 — reduzir dívida | Semanas 6–12 | arquitetura e DX sustentáveis | REM-043–052 | hotspots, lint, testes e retenção melhorados |
| W6 — reauditar e decidir | após W0–W5 | pacote de go/no-go | REM-053–055 | zero P0 e decisão formal |

## Caminho crítico

```text
REM-001 preservação e plano de limpeza
  → autorização humana para reescrita
  → REM-002 remoção segura do blob proibido
  → REM-003 ambiente Node oficial
  → REM-004/005 contratos de teste
  → REM-006 coverage ≥ 82 sem reduzir threshold
  → REM-007 teste canônico raiz + workspaces
  → REM-009 gate local integral
  → REM-018 freeze do SHA publicável
  → autorização de push
  → REM-019 CI exato
  → REM-020/021 OCI, SBOM, scan, assinatura e release
  → REM-022–025 target/recovery/performance
  → REM-027–029 produto/UAT/autoridades
  → REM-053 reconciliação
  → REM-054 reauditoria
  → REM-055 go/no-go humano
```

## W0 — preservar e reproduzir

### Objetivo

Eliminar o risco de perda antes de qualquer alteração destrutiva e tornar o
ambiente local comparável ao CI.

### Execução

1. Inventariar refs, commits, blob de `.gauntlet/state.json` e conteúdo que
   precisa ser preservado.
2. Criar backup recuperável fora da árvore que será reescrita e validar hashes.
3. Produzir dry-run da estratégia de history rewrite; pausar para aprovação.
4. Ativar Node 22.23.2/pnpm 10.33.0 e reinstalar de forma congelada.
5. Reproduzir coverage, complexidade e warning set da baseline.
6. Reconciliar o programa com o control plane sem marcar tarefas como concluídas.

### Saída

- recuperação ensaiável;
- nenhuma ação destrutiva ainda não autorizada;
- baseline determinística no runtime oficial.

## W1 — tornar o candidato local publicável

### Objetivo

Fechar todos os bloqueadores que independem de serviços externos.

### Execução

1. Após aprovação, remover o blob proibido do intervalo de push e impedir
   recorrência.
2. Corrigir mocks de `METRICS_AUTH_TOKEN` e consolidar a semântica 413.
3. Aumentar branch coverage com casos comportamentais relevantes.
4. Fazer o comando canônico de testes executar raiz e workspaces.
5. Decompor `server.ts` o suficiente para restaurar o gate de complexidade.
6. Executar Helm real, padronizar lint mínimo e classificar skips.
7. Corrigir documentação, Quality Bar e identidade sem afirmar CI externo.
8. Rodar a matriz local integral em checkout limpo.

### Saída

- nenhum blob proibido alcançável pelas refs a publicar;
- todos os gates locais obrigatórios em exit 0;
- novo SHA congelável e documentação coerente.

## W2 — provar CI, imagens e release

### Objetivo

Converter um candidato local em evidência remota candidate-bound.

### Execução

1. Solicitar autorização para push do SHA congelado.
2. Executar os checks requeridos, preservando logs e artefatos.
3. Construir API, worker e SPA uma vez; promover pelo digest.
4. Gerar SBOM, executar scan, assinar e emitir attestations.
5. Testar known-bads de substituição/rebuild/reorder.
6. Preencher `ci_sha` e `release_sha` somente após observação terminal.

### Saída

- CI verde no SHA exato;
- release encadeado sem rebuild;
- manifesto e artefatos verificáveis.

## W3 — certificar o ambiente-alvo

### Objetivo

Demonstrar que os controles locais sobrevivem à infraestrutura real.

### Execução

1. Obter target descartável/aprovado e credenciais de teste por canal seguro.
2. Testar RLS e `FORCE RLS` com roles equivalentes às de runtime.
3. Exercitar install/upgrade/mixed-version, locks e rollback de migrations.
4. Interromper/reiniciar worker e comprovar idempotência e redelivery.
5. Restaurar backup representativo e medir RPO/RTO.
6. Executar carga e soak conforme perfil aprovado; validar alertas.

### Saída

- provas target-bound assinadas pelos owners;
- riscos residuais e limites de capacidade explicitados.

## W4 — fechar paridade, integrações e UAT

### Objetivo

Transformar superfícies implementadas em jornadas de produto verificadas.

### Execução

1. Congelar matriz de 11 áreas, fixtures e critérios pelos donos de domínio.
2. Fechar laboratório, fiscal, pagamentos, marketing, relatórios, usuários/LGPD
   e integrações com testes de sucesso e falha.
3. Executar browser matrix e acessibilidade assistida.
4. Conduzir UAT com perfis hospitalares representativos.
5. Registrar decisões sem inserir PII desnecessária nos artefatos.

### Saída

- paridade 11/11 comprovada no escopo acordado;
- defeitos de UAT resolvidos ou aceitos pela autoridade correta.

## W5 — reduzir dívida estrutural

### Objetivo

Diminuir custo de mudança depois que o caminho de release estiver estável.

### Execução

1. Extrair composição/infraestrutura de `server.ts` em fatias verificáveis.
2. Dividir páginas SPA por domínio, estado e boundary de renderização.
3. Isolar relatórios e worker runner sem alterar contratos públicos.
4. Adotar lint semântico mínimo para todos os pacotes aplicáveis.
5. Criar testes do pacote chaos e contratos runtime onde tipos puros não bastam.
6. Reduzir `any` nas fronteiras críticas.
7. Compactar Git e implementar retenção/limpeza segura de artefatos.
8. Corrigir ruído, ESM, `.gitignore` e diagnósticos dos testes.

### Saída

- hotspots em tendência descendente;
- feedback de CI mais rápido e acionável;
- políticas de armazenamento e qualidade automatizadas.

## W6 — reauditar e decidir

### Objetivo

Encerrar o programa com evidência, não com narrativa.

### Execução

1. Reconciliar código, identidade, P0 registry, Quality Bar, `.agent` e docs.
2. Reexecutar todas as evidências que ficaram stale.
3. Realizar crítica independente contra a régua congelada.
4. Publicar scorecard final com limitações e risco residual.
5. Solicitar go/no-go às autoridades nomeadas.

### Saída

- `RELEASE_READY` técnico se e somente se todos os critérios obrigatórios
  passarem;
- decisão humana separada, registrada e vinculada ao candidato.

## Paralelismo permitido

- Depois de W0, correções dos testes de secrets e payload podem ocorrer em
  paralelo porque têm superfícies distintas.
- Preparação de scripts target e agendas de UAT pode começar em W1, mas a
  execução só vale depois do freeze de W2.
- Cada integração de produto pode avançar por domínio após critérios aprovados;
  contratos compartilhados exigem integração serial.
- Refatorações grandes não devem entrar no candidato entre freeze e decisão de
  release, salvo blocker indispensável com novo freeze e recertificação.

## Stop conditions

Manter `BLOCKED` e parar a ação de risco quando:

- não houver backup verificável antes da reescrita;
- a autoridade não aprovar push, target, credenciais ou operação destrutiva;
- testes forem enfraquecidos para produzir verde;
- qualquer OCI/digest diferir do manifesto;
- scan encontrar blocker não aceito;
- ocorrer acesso cross-tenant, perda de dados ou duplicidade financeira;
- restore não cumprir RPO/RTO;
- performance exceder limite aprovado;
- UAT ou autoridade formal negar o candidato.

## Cadência de controle

- A cada tarefa: teste focal, diff, regressão proporcional e evidência.
- A cada milestone: atualização de docs, `.agent`, riscos e SHA.
- A cada mutação após freeze: invalidar CI/OCI/target/UAT afetados.
- Antes de release: reauditoria em checkout limpo e pacote final independente.
