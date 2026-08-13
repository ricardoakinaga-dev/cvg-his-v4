# Plano executivo — CVG-HIS-V4 rumo a 95/100

**Data-base:** 12/08/2026  
**Entrada:** [relatório de auditoria P1](2026-08-11-relatorio-auditoria-p1.md)  
**Nota P1:** 78/100  
**Nota conservadora após remediação local:** 81/100  
**Meta de aceite:** 95/100 ou mais  
**Estado:** dependências e gap RLS de sessões concluídos; aceite enterprise ainda condicionado à role production-like, homologação real e resiliência operacional.

> **Atualização executiva — 13/08/2026:** a meta técnica local chegou a **95/100** e o readiness executável a **97/100**. Dependências, role production-like local, `FORCE RLS`, matriz tenant, E2E local, restore descartável, cutover local, SAST, SBOM e scan de imagens foram concluídos. O plano não converte isso em `GO` produtivo: o RC estrito ainda bloqueia CI remoto, restore real em staging e cutover no alvo. Evidências e notas atuais: [relatório de fechamento](2026-08-13-relatorio-fechamento-meta-95.md).

## 1. Decisão executiva

As 48 ocorrências de vulnerabilidade registradas no P1 foram eliminadas. O inventário reproduzido continha 44 advisories únicos — 3 ocorrências críticas, 27 altas, 14 moderadas e 4 baixas — e a nova execução de `pnpm audit --audit-level=low` retorna `No known vulnerabilities found`.

O gate `pnpm security:enterprise` também foi endurecido: qualquer advisory de severidade baixa ou superior agora bloqueia a promoção. Antes, vulnerabilidades moderadas eram apenas registradas como dívida.

A validação pós-upgrade encontrou ainda uma falha de isolamento na tabela `sessions`. A migration aditiva `0058_auth_sessions_rls.sql` habilitou RLS, bloqueou leitura e escrita cross-tenant e levou o gate estático a **98/98 tabelas tenant protegidas**. A suíte ampliada de integração também foi saneada e terminou com **1.682/1.682 testes**.

Essa correção remove o bloqueador de dependências, mas não autoriza sozinha produção enterprise. O programa deve seguir quatro ondas de execução para fechar isolamento multi-tenant, provas com infraestrutura/provedores reais, continuidade operacional e dívida arquitetural. A meta 95 somente será declarada quando todas as evidências forem reproduzidas no ambiente de homologação equivalente à produção.

## 2. Resultado já entregue nesta rodada

| Entrega | Resultado |
|---|---|
| Baseline de segurança | 44 advisories únicos / 48 ocorrências classificadas |
| Críticas, altas, moderadas e baixas | 0 conhecidas após atualização |
| Ferramentas de teste/build | Vitest seguro, Vite 6.4.3 e tsx/esbuild corrigidos |
| Observabilidade | OpenTelemetry alinhado à linha 0.221/2.10 |
| Transitivos vulneráveis | gRPC, Babel, brace-expansion, fast-uri, js-yaml, nanoid, postcss, protobufjs, shell-quote e undici corrigidos |
| Política futura | `security:enterprise` bloqueia a partir de `low` |
| Segredos | Secretlint passou |
| Isolamento de sessões | RLS 98/98; leitura e escrita cross-tenant negadas em teste com role sem bypass |
| Compatibilidade | build, typecheck, lint, API 233/233, suíte crítica 171/171 e integração 1.682/1.682 passaram |

## 3. Régua de nota

A nota pós-remediação é deliberadamente conservadora. A média dos 18 itens do relatório passa de 78,28 para 81,33; o ganho concentra-se em dependências, isolamento de sessões e regressão ampliada. A cobertura estática 98/98 não substitui a prova da role de runtime, `FORCE RLS`, smoke externo ou cutover.

| Item | P1 | Pós-remediação local | Meta | Evidência necessária para a meta |
|---|---:|---:|---:|---|
| Organização da documentação | 84 | 84 | 96 | fontes vivas únicas, owners e revisão de links/IDs automatizada |
| Coerência documentação ↔ código | 83 | 83 | 96 | documentação gerada/validada pelos gates de release |
| Arquitetura e modularidade | 76 | 76 | 94 | dispatch da API separado por domínio e arquivos críticos dentro dos limites acordados |
| Qualidade e manutenibilidade | 74 | 75 | 94 | complexidade, duplicação, dívida e ownership medidos e bloqueantes |
| Frontend e cobertura funcional | 85 | 86 | 95 | jornadas reais desktop/mobile, acessibilidade e falhas de rede validadas |
| Backend e módulos de negócio | 86 | 87 | 96 | rotas, persistência, idempotência e contratos exercitados em PostgreSQL real |
| Worker e processamento assíncrono | 78 | 78 | 95 | soak, retry, DLQ/idempotência e shutdown comprovados |
| Banco, schema e migrações | 77 | 78 | 96 | trilha única, upgrade/rollback e restore reproduzidos |
| Multi-tenancy e RLS | 58 | 64 | 97 | role sem superuser/BYPASSRLS, FORCE RLS e testes negativos cross-tenant |
| Autenticação, sessões e MFA | 73 | 77 | 96 | login, sessão, OIDC, WebAuthn/MFA e revogação em homologação real |
| RBAC, autorização e auditoria | 87 | 87 | 96 | matriz crítica 100% coberta e eventos de negação auditáveis |
| Segurança da aplicação e dependências | 65 | 94 | 98 | audit sempre zero, SBOM/SAST/DAST/container scan e gestão contínua |
| Contratos e OpenAPI | 88 | 88 | 96 | paridade runtime 100% e contract tests consumidor/provedor |
| Testes, cobertura e QA | 89 | 92 | 97 | cobertura ≥90% lines/statements, ≥90% functions e ≥85% branches, E2E real verde |
| Observabilidade e SLOs | 80 | 80 | 95 | traces/logs/métricas externos, alertas e game day com SLO |
| Deploy, backup e operação | 72 | 72 | 97 | backup/restore, cutover e rollback ensaiados com RTO/RPO medidos |
| Paridade funcional com Vetus | 83 | 83 | 95 | UAT por rotina e gaps críticos zerados |
| Readiness de release | 71 | 80 | 97 | pacote RC estrito, CI remoto, homologação e sign-off operacional |
| **Média** | **78,28** | **81,33** | **95,89** | **nenhum P0/P1 aberto e todas as evidências anexadas** |

## 4. Objetivos estratégicos

### O1 — Isolamento e identidade operacional

- retirar superuser/BYPASSRLS do runtime;
- aplicar contexto de conta/unidade por transação;
- sustentar as 98/98 tabelas tenant cobertas e aplicar `FORCE RLS` onde cabível;
- comprovar negação cross-tenant em API, jobs e acesso direto ao banco;
- validar MFA/WebAuthn, OIDC e ciclo de sessão em homologação.

**Saída esperada:** nota 85/100 e ausência de caminho conhecido de acesso entre tenants.

### O2 — Homologação real e integrações

- criar staging production-like sem fallback local;
- executar E2E contra API, PostgreSQL e Redis reais;
- validar Pagar.me, Resend, Twilio e Google Calendar em sandbox;
- provar idempotência, timeout, retry, indisponibilidade e reconciliação.

**Saída esperada:** nota 89/100 e jornadas críticas reproduzíveis fora de mocks.

### O3 — Resiliência, cutover e observabilidade

- ensaiar backup/restore e medir RPO/RTO;
- executar cutover e rollback completos;
- realizar soak de API/worker e Redis distribuído;
- enviar telemetria para backend externo e validar alertas/SLOs.

**Saída esperada:** nota 93/100 e operação recuperável sob falha.

### O4 — Qualidade estrutural e aceite final

- concluir extração do dispatch legado de `server.ts`;
- consolidar política única de migrations;
- fechar paridade OpenAPI/runtime e elevar cobertura;
- executar UAT Vetus-like, acessibilidade e pacote RC estrito;
- reconciliar documentação e emitir auditoria final independente.

**Saída esperada:** 95/100 ou mais, com aceite formal de Engenharia, Segurança, QA e Operações.

## 5. Critérios inegociáveis de aceite 95

1. `pnpm audit --audit-level=low` e `pnpm security:enterprise` com zero vulnerabilidades.
2. Runtime PostgreSQL usando role sem `SUPERUSER` e sem `BYPASSRLS`.
3. 100% das tabelas tenant protegidas ou cobertas por exceção formal revisada.
4. Testes negativos cross-tenant passando para todos os domínios P0/P1.
5. E2E real de login, recepção, agenda, atendimento, faturamento, estoque e relatórios 100% verde.
6. Smokes de Pagar.me, Resend, Twilio e Google Calendar verdes em sandbox/staging.
7. Backup restaurado com integridade; RPO e RTO medidos e dentro da meta aprovada.
8. Cutover e rollback ensaiados com evidência e sem intervenção não documentada.
9. Worker estável por 24 horas, sem perda/duplicação e com retry observável.
10. Cobertura ≥90% lines/statements, ≥90% functions e ≥85% branches.
11. OpenAPI e runtime sem drift; contratos de consumidores críticos verdes.
12. CI remoto, package RC estrito e sign-offs registrados.

## 6. Organização e capacidade recomendada

Responsabilidades mínimas, acumuláveis conforme o tamanho da equipe:

- Tech Lead/Arquitetura: decisões, modularização e gates;
- Backend/DB: RLS, roles, migrations, idempotência e integrações;
- Frontend: E2E, acessibilidade e jornadas operacionais;
- QA Automation: matriz de testes, cobertura e evidências;
- DevSecOps/SRE: scans, staging, telemetria, backup e cutover;
- Product Owner/Operação: UAT Vetus-like e aceite das rotinas.

Governança:

- checkpoint executivo semanal com nota, riscos e caminho crítico;
- demonstração de evidência ao fim de cada fase;
- nenhum item muda para concluído apenas por revisão documental;
- qualquer regressão crítica reabre o gate correspondente;
- a nota 95 é calculada somente após auditoria final reproduzível.

## 7. Riscos e respostas

| Risco | Impacto | Resposta |
|---|---|---|
| RLS validado com owner/superuser | Crítico | role dedicada, FORCE RLS e testes com usuário equivalente ao runtime |
| Credenciais sandbox indisponíveis | Alto | provisionar no início da Fase 2; não substituir por mock como aceite |
| Restore só validado estaticamente | Crítico | drill descartável e depois staging com massa representativa |
| E2E instável | Alto | dados isolados, seletores semânticos, traces e política de flaky test |
| Modularização quebrar rotas | Alto | characterization tests antes de cada extração e paridade OpenAPI |
| Nova vulnerabilidade durante o ciclo | Alto | audit diário/CI, lockfile imutável e SLA de correção por severidade |
| Evidência dispersa em documentos históricos | Médio | pacote RC único e links somente para fontes vivas |

## 8. Condição de encerramento

O programa termina quando a auditoria final calcular pelo menos 95/100, todos os critérios inegociáveis estiverem verdes e não houver vulnerabilidade conhecida nem item P0/P1 aberto. Até lá, a classificação correta é “homologação avançada”, não “enterprise production-ready”.
