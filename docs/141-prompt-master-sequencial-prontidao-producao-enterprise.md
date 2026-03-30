# PROMPT MASTER — CVG-HIS-V2 — SEQUENCIAL DE PRONTIDÃO PARA PRODUÇÃO ENTERPRISE

## Objetivo

Executar em sequência a trilha final de prontidão para produção enterprise do projeto `cvg-his-v2`, seguindo rigorosamente os documentos abaixo e sem pular etapas:

1. `/root/.openclaw/workspace/cvg-his-v2/docs/99-prompt-master-correcao-lacunas-producao-enterprise.md`
2. `/root/.openclaw/workspace/cvg-his-v2/docs/134-prompt-master-auditoria-prontidao-producao-enterprise.md`
3. `/root/.openclaw/workspace/cvg-his-v2/docs/135-prompt-master-validacao-staging-go-live-enterprise.md`
4. `/root/.openclaw/workspace/cvg-his-v2/docs/136-prompt-master-fechamento-producao-enterprise.md`

## Base obrigatória adicional

- `/root/.openclaw/workspace/cvg-his-v2/docs/90-hardening-global.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/91-prompt-master-hardening-global-transversal.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/98-matriz-prontidao-producao-enterprise.md`

## Modo de execução

- executar os 4 documentos exatamente nessa ordem
- não inverter etapas
- não declarar pronto para produção antes da etapa 4
- não mascarar bloqueios reais
- não reabrir escopo funcional sem necessidade direta
- usar o código real atual como fonte de evidência
- corrigir primeiro, auditar depois, validar staging depois, decidir por último

## Regras obrigatórias

1. Na etapa 1, corrigir apenas as lacunas reais para elevar prontidão de produção.
2. Na etapa 2, apenas auditar e pontuar com rigor usando a matriz.
3. Na etapa 3, apenas validar staging/go-live e emitir decisão `go`, `go com ressalvas` ou `no-go`.
4. Na etapa 4, consolidar a decisão final com base nos relatórios anteriores.
5. Não declarar `pronto para produção` se:
   - a nota final for menor que 85
   - houver critério crítico abaixo de 80
   - a suíte ampla da API não estiver verde
   - staging não estiver validado
   - restar bloqueio estrutural aberto

## Entregáveis obrigatórios que devem ser produzidos ao longo da execução

- `/root/.openclaw/workspace/cvg-his-v2/docs/137-relatorio-correcao-lacunas-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/138-relatorio-auditoria-prontidao-producao-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/139-relatorio-validacao-staging-go-live-enterprise.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/140-decisao-final-prontidao-producao-enterprise.md`

## Critério de sucesso

- as lacunas reais forem corrigidas ou delimitadas
- a matriz for recalculada com evidência técnica
- a validação de staging/go-live for executada
- a decisão final de produção for emitida com honestidade técnica

## Entrega final obrigatória para esta execução

1. lista de arquivos alterados
2. lista de arquivos criados
3. resumo curto do que foi feito em cada uma das 4 etapas
4. nota final recalculada da matriz
5. decisão final:
   - pronto para produção
   - pronto para produção controlada
   - não pronto para produção
6. referência explícita aos 4 relatórios gerados
7. se não atingir prontidão de produção, listar os bloqueios restantes

## Importante

- não parar no meio sem motivo técnico real
- não transformar ressalva em aprovação indevida
- não transformar progresso parcial em fechamento artificial
