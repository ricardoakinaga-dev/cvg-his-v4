# RISK REGISTER — Enterprise Transformation

**Taxonomia:** `APOIO`
**Papel no sistema documental:** registro de riscos corporativos que sustenta priorizacao, mitigacoes e decisoes de plataforma
**Ler em conjunto com:** `README.md`, `0334-PLANO-EXECUTIVO-REALINHAMENTO-ENTERPRISE-2026-04-17.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`, `100-ROADMAP-VISAO-GERAL.md`, `0323-PLANO-PLATAFORMA-LONGA-KUBERNETES-HELM-2026-04-14.md`

| ID | Risco | Prob | Impacto | Onda | Mitigação |
|----|-------|------|---------|------|-----------|
| R-01 | Multi-tenancy quebra funcionalidade existente | Alta | Crítico | 1 | Migração gradual, feature flag, testes exaustivos |
| R-02 | Migração Vue 3 demora mais que 5 meses | Média | Alto | 2 | Priorizar páginas críticas, manter legado como fallback |
| R-03 | LGPD pipeline incompleto gera risco legal | Média | Crítico | 1 | Consultoria jurídica, auditoria antes do go-live |
| R-04 | Integração de pagamento com instabilidade | Média | Alto | 3 | Múltiplos provedores, fallback manual |
| R-05 | AI models com baixa precisão | Alta | Médio | 4 | Fallback para regras manuais, A/B testing |
| R-06 | Performance degrada com multi-tenancy | Média | Alto | 1 | Índices otimizados, read replicas, cache |
| R-07 | Time insuficiente para todas as ondas | Alta | Alto | Todas | Priorização rígida, MVP por onda |
| R-08 | Design system não é adotado pelo time | Média | Médio | 2 | Storybook como gate de PR |
| R-09 | SOC2 falha na primeira tentativa | Baixa | Médio | 5 | Pre-qualification com auditor |
| R-10 | WhatsApp API tem limitações de negócio | Média | Médio | 3 | Email/SMS como fallback |
| R-11 | Configuração inválida entra em produção por falta de validação fail-fast | Alta | Alto | 5 | Zod schema central, CI de env example e bootstrap abortando em erro |
| R-12 | CORS permissivo ou headers frágeis expõem superfície indevida | Média | Crítico | 5 | Allowlist por ambiente, testes de segurança e revisão de defaults |
| R-13 | Secrets em `.env` local ou pipeline causam vazamento operacional | Alta | Crítico | 5 | Secret scanning, rotação e migração para Vault/secret manager |
| R-14 | Falha operacional sem backup testado amplia perda de dados | Média | Crítico | 5 | Backup automatizado, restore drill e evidência trimestral |
| R-15 | Observabilidade parcial sem OTel dificulta RCA e auditoria | Alta | Alto | 5 | OpenTelemetry com OTLP exporter e runbooks de tracing |
| R-16 | Rate limiter local não escala horizontalmente | Média | Alto | 5 | Redis central para limiter, testes de concorrência e fallback seguro |
| R-17 | Ausência de estratégia Kubernetes/Helm trava operação enterprise multiambiente | Média | Médio | 5 | Helm charts mínimos, ADR de runtime e plano progressivo de adoção |
| R-18 | Paridade Vetus documentada avança mais rapido que APIs persistidas | Alta | Alto | Vetus | Quebrar por fatias verificaveis, registrar limites em `0347`, exigir OpenAPI/testes antes de declarar modulo fechado |
| R-19 | Telas novas com dados locais serem confundidas com capacidade operacional final | Media | Alto | Vetus | Marcar status como `Fechado parcial`, priorizar serviços/API e substituir mocks por integração real |
| R-20 | Validacao Helm nao reexecutavel no ambiente local por falta do binario | Media | Medio | Plataforma | Instalar `helm` no runner ou mover `validate:helm` para ambiente com toolchain completo |
