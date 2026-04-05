# RISK REGISTER — Enterprise Transformation

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
