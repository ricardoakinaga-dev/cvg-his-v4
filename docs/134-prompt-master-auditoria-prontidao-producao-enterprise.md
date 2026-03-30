# PROMPT MASTER — CVG-HIS-V2 — AUDITORIA DE PRONTIDÃO PARA PRODUÇÃO ENTERPRISE

## Objetivo

Executar uma auditoria executiva e tecnica de prontidao para producao do CVG-HIS-V2 com base na matriz oficial, verificando se o sistema pode subir de `78/100` para o patamar minimo de `85/100`.

## Bases obrigatorias

- `/docs/98-matriz-prontidao-producao-enterprise.md`
- `/docs/90-hardening-global.md`
- `/docs/91-prompt-master-hardening-global-transversal.md`
- relatorios finais de reauditoria modulares
- evidencias tecnicas mais recentes de build, typecheck, suite ampla e validacoes

## Escopo da auditoria

Auditar:

- cobertura funcional consolidada
- integracao entre modulos
- consistencia fullstack
- integridade de dados e persistencia
- arquitetura operacional
- qualidade de testes
- seguranca e autorizacao
- readiness operacional
- processo de release e governanca de mudanca

## Regras

- nao implementar correcoes
- apenas auditar
- nao inflar nota por inercia
- nao aprovar producao com gate global aberto
- diferenciar bloqueio critico de ressalva moderada

## Entregavel obrigatorio

Criar:

- `/docs/138-relatorio-auditoria-prontidao-producao-enterprise.md`

Estrutura minima:

1. resumo executivo
2. nota por criterio da matriz
3. comparacao com a nota anterior
4. bloqueios criticos
5. ressalvas
6. decisao:
   - pronto para producao
   - pronto para producao controlada com ressalvas
   - nao pronto para producao

## Critério de aprovacao

So classificar como pronto para producao se:

- nota final >= 85
- nenhum criterio critico < 80
- suite ampla da API verde
- hardening global formalmente concluido
