# Relatório de auditoria e fechamento P1 — CVG-HIS-V4

**Data da auditoria inicial:** 11/08/2026  
**Última verificação executável:** 13/08/2026  
**Nota geral inicial:** **67/100**  
**Nota geral após o P1:** **78/100**  
**Nota conservadora após a remediação local:** **81/100**  
**Classificação histórica deste documento:** fechamento P1; consulte o fechamento técnico atual antes de decidir release.

> **Atualização de 13/08/2026:** a [auditoria de fechamento](2026-08-13-relatorio-fechamento-meta-95.md) registra **95/100 de nota técnica local** e readiness automatizado de **97/100**. O aceite de produção permanece em `HOLD` porque o RC estrito exige três evidências externas reais: CI remoto, restore em homologação/staging e cutover no ambiente alvo. As notas 78/81 abaixo são preservadas como fotografia histórica do P1, não como estado atual.

> Atualização de 12/08/2026: as 48 ocorrências de vulnerabilidade de dependências foram eliminadas, o gap RLS de sessões foi fechado e o gate alcançou 98/98 tabelas tenant protegidas. O programa residual até 95 está documentado no [plano executivo](2026-08-12-plano-executivo-meta-95.md), [roadmap](2026-08-12-roadmap-meta-95.md) e [backlog](2026-08-12-backlog-meta-95.md).

## Escopo

Foi lida a documentação ativa e histórica de `docs` e inspecionado o monorepo: API, SPA, worker, módulos, banco, migrações, testes, infraestrutura, CI/CD e scripts operacionais. O levantamento inicial encontrou aproximadamente 1.425 arquivos em `docs`, 3.290 arquivos versionados e cerca de 327 mil linhas de TypeScript/Vue/testes, excluindo `dist` e `node_modules`.

## Veredito executivo

Os quatro bloqueadores P1 solicitados foram tratados:

1. integrações e persistência não caem silenciosamente para serviços locais em `production`, `staging`, `prod` ou `stage`;
2. a composição pesada de `server.ts` foi extraída para módulos de gateways, segurança, caos e catálogos;
3. rotas, autenticação, repositório de sessões, gateways e integração com PostgreSQL ganharam testes executáveis;
4. documentação, links ativos, scores, IDs numéricos e referência de migration foram reconciliados.

O sistema ainda não deve receber aceite enterprise definitivo porque a cobertura RLS estática 98/98 precisa ser complementada por role production-like sem bypass, `FORCE RLS` e matriz negativa completa. Também permanecem trilhas históricas de migração e ausência de smoke test real com provedores externos e cutover produtivo. O bloqueador de vulnerabilidades de dependências e o vazamento de sessões foram resolvidos em 12/08/2026.

## Notas finais por item analisado

| Item analisado | Nota | Avaliação após o P1 |
|---|---:|---|
| Organização da documentação | 84 | Índices e fontes de verdade mais claros; relatório vivo e regras editoriais adicionados. |
| Coerência documentação ↔ código | 83 | Links absolutos/antigos corrigidos, scores históricos identificados e referências inválidas de IDs removidas. |
| Arquitetura e modularidade | 76 | `server.ts` caiu de aproximadamente 6.785 para 3.658 linhas; gateways, segurança, caos e catálogos foram isolados. |
| Qualidade e manutenibilidade | 75 | Limite de corpo JSON, composição menor e datas determinísticas; ainda há arquivos extensos e dívida histórica. |
| Frontend e cobertura funcional | 86 | SPA passou integralmente; regressão de data local/timezone e rota duplicada de navegação foram corrigidas. |
| Backend e módulos de negócio | 87 | API extensa; regressão ampliada saneou contratos de rotas, handoff e webhooks. |
| Worker e processamento assíncrono | 78 | Build e testes existentes passam; ainda falta validação operacional prolongada em ambiente real. |
| Banco, schema e migrações | 78 | Suite crítica reproduzida com 125 tabelas; migrations `0057`/`0058` persistem e isolam sessões. |
| Multi-tenancy e RLS | 64 | `validate:rls` cobre 98/98 tabelas e teste negativo bloqueia sessões cross-tenant; role/`FORCE RLS` e matriz completa ainda faltam. |
| Autenticação, sessões e MFA | 77 | Repositório persistente e isolamento de sessão foram testados; WebAuthn/MFA real ainda precisa de smoke operacional. |
| RBAC, autorização e auditoria | 87 | Matriz RBAC/ABAC e trilha de auditoria continuam consistentes e ganharam regressões HTTP. |
| Segurança da aplicação e dependências | 94 | Fallbacks locais bloqueados, payload limitado, secret scan limpo e zero vulnerabilidades conhecidas em qualquer severidade; falta completar SAST/DAST/SBOM/container scan do pacote RC. |
| Contratos e OpenAPI | 88 | OpenAPI e rotas dedicadas continuam validados; paridade runtime completa ainda não é demonstrada. |
| Testes, cobertura e QA | 92 | API 233/233, crítica 171/171, SPA 969/969 e integração ampliada 1.682/1.682; cobertura formal permaneceu acima do gate. |
| Observabilidade e SLOs | 80 | Métricas, tracing, readiness e SLOs presentes; falta ensaio operacional com telemetria externa. |
| Deploy, backup e operação | 72 | Configuração fail-fast e checklist atualizados; cutover, backup/restore e proxy produtivo ainda não foram ensaiados neste ambiente. |
| Paridade funcional com Vetus | 83 | Matriz funcional sólida e documentação reconciliada; ainda há gaps de experiência e fluxos comerciais. |
| Readiness de release | 80 | Gates locais, audit zero, RLS 98/98 e regressão ampliada reproduzidos; homologação externa e ensaios operacionais ainda impedem promoção enterprise. |

As notas acima passam a média simples de **78,28 para 81,33**, arredondada conservadoramente para **81/100**. A meta 95 não é declarada por projeção: depende das evidências residuais do programa executivo.

## Alterações implementadas

### 1. Fallbacks e configuração de produção

- `apps/api/src/integration-gateways.ts` concentra a seleção de PIX, e-mail, SMS e Google Calendar.
- Mock/local só é criado com flag explícita; em ambientes production-like, mock ou credencial ausente gera erro de configuração.
- `bootstrapServices` exige PostgreSQL saudável em produção, rejeita `API_DISABLE_INCOMPATIBLE_DB_REPOS` nesse ambiente e não devolve repositórios em memória após falha.
- Catálogos de termos, raças, espécies, cores, grupos e preventivos não fazem fallback silencioso em produção.
- A migration `0057_auth_sessions.sql` habilita `DatabaseSessionRepository`; o bootstrap valida tabelas persistentes críticas antes de prosseguir.
- `.env.v2.example` e `docker-compose.v2.yml` passaram a expor as credenciais e flags de modo explícito.

### 2. Modularização da API

Foram extraídos:

- `apps/api/src/integration-gateways.ts`;
- `apps/api/src/api-security-services.ts`;
- `apps/api/src/chaos-registration.ts`;
- `apps/api/src/catalog-stores.ts`;
- `apps/api/src/http/cors.ts`, `apps/api/src/http/security-headers.ts` e `apps/api/src/helpers/common.ts` como pontos de composição reutilizáveis.

O `server.ts` permanece grande por conter o dispatch HTTP e parte do domínio legado, mas deixou de concentrar a composição de integrações, segurança, caos e seis famílias de catálogos.

### 3. Cobertura e repetibilidade

- API: **233/233** testes no comando `pnpm --filter @cvg-his-v2/api test`.
- Integração PostgreSQL: **4 arquivos, 171/171** testes em `pnpm test:critical`.
- SPA: **969/969** testes na execução completa final desta rodada (165 arquivos).
- Monorepo: `pnpm test` passou na execução completa da rodada; após os últimos ajustes, os pacotes afetados foram reexecutados separadamente — API 233/233, SPA 969/969 e worker 23/23.
- Integração ampliada: **131 arquivos, 1.682/1.682 testes** em `REQUIRE_TEST_DB=1 pnpm test:integration`.
- Cobertura formal: **1322 testes em 106 arquivos**, com **85,60% statements**, **85,60% lines**, **88,97% functions** e **80,96% branches**.
- Testes novos cobrem configuração de gateways, erros de provedores, rotas de autenticação, persistência de sessões, limite de payload, composição de segurança e bootstrap production-like.
- Inventário e preventivos deixaram de depender do dia corrente para definir vencimento ou data inicial.

## Evidências e gates

| Gate | Resultado |
|---|---|
| `pnpm typecheck` | passou; escopo de 62/69 projetos |
| `pnpm build` | passou |
| `pnpm lint` | passou |
| `pnpm --filter @cvg-his-v2/api test` | 233/233 passou |
| `pnpm test:critical` | 4 arquivos, 171/171 passou com PostgreSQL 16 em Docker |
| `pnpm test` + revalidação dos pacotes afetados | execução completa passou; após os últimos ajustes, API 233/233, SPA 969/969 e worker 23/23 passaram separadamente |
| `pnpm test:coverage` | 106 arquivos, 1322 testes; 85,60% statements/lines, 88,97% functions e 80,96% branches; threshold global de 80% passou |
| `REQUIRE_TEST_DB=1 pnpm test:integration` | 131 arquivos, 1.682/1.682 passou; inclui RLS, persistência, contrato SPA/API e migrations 0057/0058 |
| `pnpm validate:rls` | passou em 12/08/2026: 98/98 tabelas tenant protegidas, 0 exceções |
| `pnpm validate:openapi` | passou em 12/08/2026: 293 paths, 39 tags e 334 schemas |
| `pnpm vetus:parity` | passou em 12/08/2026: matriz automatizada 91/100; a nota manual Vetus-like permanece 83 por incluir gaps de UX/operação ainda não demonstrados |
| `pnpm security:enterprise` | passou em 12/08/2026; secret scan limpo e `pnpm audit --audit-level=low` sem vulnerabilidades conhecidas |
| `pnpm install --frozen-lockfile` | passou; lockfile reproduzível e workspace sem atualização pendente |
| `pnpm ops:backup:check` / `pnpm deploy:check` | passaram nos checks estáticos; execução real permanece pendente em staging |

## Remediação de dependências — 12/08/2026

- Baseline reproduzido: **44 advisories únicos / 48 ocorrências**, sendo 3 críticas, 27 altas, 14 moderadas e 4 baixas.
- Vitest foi atualizado para a linha segura 3.2.7 nos pacotes afetados; Vite para 6.4.3 e tsx/esbuild para versões corrigidas.
- OpenTelemetry foi alinhado à linha `sdk-node`/exporter `0.221` e resources/core/Jaeger `2.10`.
- Transitivos vulneráveis corrigidos: `@babel/core`, `@grpc/grpc-js`, `brace-expansion`, `fast-uri`, `js-yaml`, `nanoid`, `postcss`, `protobufjs`, `shell-quote` e `undici`.
- O script `security:enterprise` deixou de tolerar dívida moderada e agora bloqueia qualquer advisory a partir de severidade baixa.
- Resultado final: `pnpm audit --audit-level=low` retorna `No known vulnerabilities found`.

## Fechamento RLS e regressão ampliada — 12/08/2026

- O gate encontrou `sessions` como a única tabela tenant sem RLS: 1/98.
- Um teste RED confirmou leitura de sessão do tenant B pelo tenant A.
- A migration aditiva `0058_auth_sessions_rls.sql` habilitou RLS com `USING` e `WITH CHECK`, preservando bancos que já aplicaram 0057.
- O teste GREEN comprovou bloqueio de leitura e de escrita cross-tenant; `validate:rls` passou em 98/98.
- A suíte ampliada expôs cinco contratos desatualizados; foram corrigidos persistência de handoff, sessão em banco, URL de webhook, contrato SPA/API e duplicidade de navegação.
- Resultado final da integração: 131 arquivos e 1.682/1.682 testes.

## Estado dos bloqueadores P1

| Bloqueador | Estado | Evidência |
|---|---|---|
| Fallback local silencioso | **Resolvido para runtime production-like** | validação de configuração, gateways explícitos, bootstrap DB fail-fast e catálogos sem fallback |
| `server.ts` monolítico | **Reduzido e modularizado** | 6.785 → 3.658 linhas; composição extraída e catálogos isolados em 2.909 linhas |
| Cobertura de rotas/auth/repos/integrations | **Resolvido no gate local** | 233 API + 171 DB/integração + regressões de auth/sessão/gateways |
| Docs, links, scores e IDs | **Resolvido na trilha ativa** | relatório vivo, referências corrigidas, IDs ativos sem duplicidade e histórico explicitamente marcado |
| Vulnerabilidades de dependências | **Resolvido** | 48 ocorrências → 0; audit bloqueante em todas as severidades |
| RLS de sessões | **Resolvido no gate local** | migration 0058, teste negativo e 98/98 tabelas tenant protegidas |

## Riscos e trabalho restante antes do aceite enterprise

- Sustentar o gate de dependências em zero e responder a novos advisories pelos SLAs do backlog rumo a 95.
- Remover a dependência operacional de superusuário, aplicar `FORCE RLS` onde cabível e ampliar a prova cross-tenant para todos os domínios críticos.
- Executar E2E com API real, smoke dos provedores Pagar.me/Resend/Twilio/Google e teste de proxy/cutover.
- Ensaiar backup/restore, rotação de segredos, Redis distribuído e estabilidade do worker por janela operacional definida.
- Continuar a extração do dispatch legado restante de `server.ts` em módulos por domínio.
- Consolidar a política única de migrações e revisar os documentos históricos que ainda descrevem trilhas antigas.

## Conclusão

O P1 solicitado, a remediação das 48 ocorrências conhecidas e o isolamento RLS de sessões estão implementados e verificáveis localmente. A nota sobe de **67/100 para 78/100 no P1 e para 81/100 após a remediação local**, mas essa melhoria não deve ser confundida com autorização de produção enterprise: a promoção depende sobretudo da role RLS production-like, homologação externa e evidência operacional real.
