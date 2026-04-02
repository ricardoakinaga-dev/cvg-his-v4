# PROMPT MASTER — CVG-HIS-V2 — FECHAMENTO FINAL PARA PRODUÇÃO ENTERPRISE

## Objetivo

Consolidar a decisao final de prontidao para producao do CVG-HIS-V2 apos:

- correcao das lacunas
- auditoria de prontidao
- validacao de staging/go-live

## Bases obrigatorias

- `/docs/98-matriz-prontidao-producao-enterprise.md`
- `/docs/137-relatorio-correcao-lacunas-producao-enterprise.md`
- `/docs/138-relatorio-auditoria-prontidao-producao-enterprise.md`
- `/docs/139-relatorio-validacao-staging-go-live-enterprise.md`

## Regras

- nao implementar correcoes nesta etapa
- apenas consolidar evidencias e emitir decisao final
- nao declarar pronto para producao se houver bloqueio tecnico critico aberto
- nao ignorar suite ampla quebrada

## Entregavel obrigatorio

Criar:

- `/docs/140-decisao-final-prontidao-producao-enterprise.md`

Estrutura minima:

1. resumo executivo
2. nota final da matriz
3. bloqueios inexistentes ou remanescentes
4. riscos operacionais
5. decisao final:
   - pronto para producao
   - pronto para producao controlada
   - nao pronto para producao
6. justificativa

## Critério de fechamento

So declarar `pronto para producao` se:

- matriz >= 85
- nenhum criterio critico < 80
- suite ampla verde
- staging validado
- sem bloqueio estrutural aberto
