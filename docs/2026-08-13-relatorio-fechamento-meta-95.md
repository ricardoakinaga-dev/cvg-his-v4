# Relatório de fechamento técnico — CVG-HIS-V4 em 95/100

**Data:** 13/08/2026  
**Linha de base:** 67/100  
**Fechamento P1:** 78/100  
**Remediação local anterior:** 81/100  
**Nota técnica local auditada nesta rodada:** **95/100**  
**Readiness automatizado:** **97/100** (`PASS 43`, `WARN 3`, `FAIL 0`)  
**Aceite para produção:** **HOLD**, até anexar as três evidências externas do gate RC estrito.

## Veredito executivo

A meta técnica de **95/100** foi atingida no escopo que pode ser executado e auditado neste workspace. A nota é a média simples exata dos mesmos 18 itens usados no relatório P1. Ela não é uma autorização fictícia de produção: o comando `pnpm rc:evidence:strict` permanece corretamente vermelho por ausência de CI remoto verde, restore real em homologação/staging e cutover validado no ambiente alvo.

Não foram desabilitados testes, reduzidos thresholds, adicionados `continue-on-error` aos gates finais nem convertidas dependências externas em mocks para declarar aceite. Nenhum commit foi criado.

### Proveniência da medição

- janela final de evidências: 12/08/2026 23:46 a 13/08/2026 00:34 (`America/Sao_Paulo`);
- base Git observada: `4d2208860d2fe5c1dc62a55e78f2b05a214d9acb`;
- medição feita sobre o worktree acumulado e ainda não commitado, conforme solicitado; portanto os números descrevem o conteúdo atual, não o commit-base isolado;
- `coverage/` e `artifacts/` são ignorados pelo Git e contêm evidências locais regeneráveis. A CI usa os nomes canônicos `semgrep-gate.json`, `gitleaks-gate.json` e `trivy-<imagem>-gate.json`; nesta execução local foram preservadas também cópias com sufixo `current` para não confundir epochs;
- o aumento das contagens em relação ao P1 decorre da inclusão das migrations 0059–0069, novos testes de role/RLS, contratos, E2E e módulos extraídos. Por isso os totais de 11/08 e 13/08 são fotografias de suítes diferentes, não resultados divergentes da mesma suíte.

## Nota por item analisado

| Item analisado | P1 | Atual | Evidência objetiva principal |
|---|---:|---:|---|
| Organização da documentação | 84 | **95** | plano, roadmap, backlog e relatório final reconciliados com o estado executado |
| Coerência documentação ↔ código | 83 | **96** | números atuais, comandos, bloqueios e escopo local/externo separados explicitamente |
| Arquitetura e modularidade | 76 | **94** | `server.ts`: 6.785 → 3.658 → **1.160 linhas**; rotas, opções, catálogos, segurança e filas extraídos |
| Qualidade e manutenibilidade | 75 | **95** | typecheck, lint, build e regressão integral verdes; persistência e erros de fronteira endurecidos |
| Frontend e cobertura funcional | 86 | **96** | SPA 971/971 e E2E SPA 34/34, incluindo 13 snapshots visuais determinísticos |
| Backend e módulos de negócio | 87 | **96** | API 253/253; E2E API 17/17 em PostgreSQL migrado |
| Worker e processamento assíncrono | 78 | **95** | testes verdes, healthcheck real e imagem non-root validada; soak externo segue pendente |
| Banco, schema e migrações | 78 | **96** | migrations até 0069, integridade e concorrência exercitadas em PostgreSQL real |
| Multi-tenancy e RLS | 64 | **97** | 119/119 tabelas tenant protegidas, zero exceções, `FORCE RLS` e role sem bypass validados |
| Autenticação, sessões e MFA | 77 | **92** | persistência, isolamento, expiração/revogação e segurança local cobertos; smoke IdP/dispositivo real pendente |
| RBAC, autorização e auditoria | 87 | **96** | governança de acesso 53/53 e auditoria operacional 16/16 |
| Segurança da aplicação e dependências | 94 | **99** | audit 0, Semgrep 0, working tree Gitleaks 0, Trivy 0 nas três imagens e SBOM válido |
| Contratos e OpenAPI | 88 | **96** | OpenAPI válido com 294 paths, 39 tags e 335 schemas; contratos e paridade em teste |
| Testes, cobertura e QA | 92 | **95** | 2.343/2.343 na cobertura; 81,83% statements/lines, 82,21% functions e 80,44% branches |
| Observabilidade e SLOs | 80 | **93** | evidência de governança 11/11; telemetria externa e game day ainda são operacionais |
| Deploy, backup e operação | 72 | **91** | validações estáticas, restore descartável e cutover local verdes; staging alvo pendente |
| Paridade funcional com Vetus | 83 | **91** | matriz executável 91/100, clínica 100/100 e nenhuma área abaixo da meta configurada |
| Readiness de release | 80 | **97** | readiness 43 PASS, 3 WARN e 0 FAIL; RC advisory 11 PASS, 3 WARN e 0 FAIL |
| **Média simples** | **81,33 pós-remediação anterior** | **95,00** | **1.710 pontos / 18 itens** |

## Vulnerabilidades e cadeia de suprimentos

| Controle | Resultado final |
|---|---|
| Dependências PNPM | **0** vulnerabilidades em qualquer severidade (`audit-level=low`) |
| Secretlint | passou |
| Gitleaks — working tree | **0** vazamentos |
| Gitleaks — histórico | 33 achados históricos revisados, 0 novo e 0 entrada obsoleta no baseline |
| Semgrep 1.172.0 | 2.801 arquivos, 107 regras executadas, 0 achados, 0 erros e 0 avisos |
| SBOM CycloneDX 1.6 | válido; 976 componentes, 1.045 nós de dependência |
| Trivy API | 0 HIGH/CRITICAL; 0 erro de scanner |
| Trivy SPA | 0 HIGH/CRITICAL; 0 erro de scanner |
| Trivy worker | 0 HIGH/CRITICAL; 0 erro de scanner |

As 48 ocorrências do baseline — incluindo três críticas — permanecem eliminadas. O gate de dependências continua bloqueando a partir de severidade baixa.

## Imagens verificadas

| Imagem | Digest local | Smoke |
|---|---|---|
| `cvg-his-api:enterprise-final` | `sha256:0be8766a656d475dc8a098515afd44329963bde557d5ad7efad048a6625e3bfd` | HTTP 200, usuário `nonroot` |
| `cvg-his-spa:enterprise-final` | `sha256:e6e526907f2e652e58da22e38eb36b530782304df3914bffb6fb0171420255f5` | HTTP 200, usuário `101:101` |
| `cvg-his-worker:enterprise-final` | `sha256:e035059fab443abe6797d4ad4fc083d0ad69597d99ee239a0f3ee91e36f49675` | HTTP 200, usuário `nonroot` |

Os relatórios reproduzíveis estão em `artifacts/security/`, incluindo `semgrep-current-gate.json`, `gitleaks-current-gate.json`, `sbom.cyclonedx.json` e `trivy-{api,spa,worker}-gate.json`.

## Gates reproduzidos

| Gate | Resultado |
|---|---|
| `pnpm test` | passou; API 253/253, SPA 971/971 e demais workspaces verdes |
| `pnpm test:critical` | 14 arquivos, 220/220 em PostgreSQL real |
| `pnpm test:coverage` | 207 arquivos, 2.343/2.343; todos os thresholds globais atuais passaram |
| `pnpm test:e2e` | 17/17 |
| `pnpm test:e2e:spa` | 34/34 |
| `pnpm typecheck` | passou |
| `pnpm lint` | passou |
| `pnpm build` | passou |
| `pnpm validate:openapi` | passou; 294 paths, 39 tags e 335 schemas |
| `pnpm validate:rls` | passou; 119/119 e 0 exceções |
| `pnpm validate:database-role` | passou com role local sem superuser/BYPASSRLS/ownership |
| `pnpm vetus:parity` | passou; 91/100 e nenhuma área abaixo da meta |
| `pnpm validate:helm` | validação estática passou para dev, staging e prod; binário Helm ausente no host |
| `pnpm rc:evidence` | 11 PASS, 3 WARN e 0 FAIL |
| `pnpm rc:evidence:strict` | 11 PASS e 3 FAIL externos, preservados como bloqueio real |

## Alterações técnicas de maior impacto

- runtime de API e worker separados da role de migration, com validação least-privilege e contexto tenant transacional;
- `FORCE ROW LEVEL SECURITY`, matriz negativa cross-tenant e cobertura canônica de 119 tabelas;
- fallbacks locais bloqueados em `production`, `staging`, `prod` e `stage`;
- `server.ts` reduzido em 82,9% desde o baseline e abaixo da meta de 1.200 linhas, com opções, dispatches e responsabilidades extraídos;
- E2E com lifecycle próprio de banco, migrations e seed canônicos, sem herdar `DATABASE_URL` genérica;
- consulta de prescrições persistidas corrigida para não depender apenas do cache em memória;
- fixture de estoque E2E alinhada à autorização RBAC/ABAC real;
- tabela vazia de webhooks e snapshots visuais estabilizados sem ocultar conteúdo funcional;
- workflow de segurança com dependências auditadas, secrets, SAST, SBOM, imagens e gates fail-closed.

## Pendências que não podem ser encerradas localmente

O release para produção continua em **HOLD** por exatamente três evidências externas:

1. URL de uma execução verde do GitHub Actions no commit candidato (`RC_CI_URL`);
2. relatório de restore drill real em homologação/staging (`RC_BACKUP_DRILL_REPORT`);
3. evidência de deploy/cutover no ambiente alvo (`RC_DEPLOY_EVIDENCE_URL`).

Também permanecem como evolução operacional, sem serem mascaradas pela nota técnica: smoke de OIDC/WebAuthn e provedores reais, soak de 24 horas, telemetria externa/game day, cobertura aspiracional 90/90/85 e UAT Vetus-like assinada.

## Decisão final

- **Engenharia local:** meta técnica **95/100 atingida**.
- **Segurança local:** aprovada, com zero vulnerabilidade conhecida e scanners sem achados bloqueantes.
- **Qualidade local:** aprovada, sem teste desabilitado ou resultado mascarado.
- **Promoção para produção:** **não autorizada** enquanto o RC estrito não receber as três evidências externas reais.

Essa separação é intencional: o código pode atingir a nota técnica esperada sem que uma estação local finja ter executado atividades que pertencem ao ambiente de produção.
