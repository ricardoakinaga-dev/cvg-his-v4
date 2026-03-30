# PROMPT MASTER — CVG-HIS-V2 — VALIDAÇÃO DE STAGING E GO-LIVE ENTERPRISE

## Objetivo

Executar a validacao final de staging/go-live do CVG-HIS-V2 apos o fechamento das lacunas tecnicas, assegurando que o comportamento operacional do sistema seja consistente com o que foi auditado.

## Bases obrigatorias

- `/docs/98-matriz-prontidao-producao-enterprise.md`
- `/docs/138-relatorio-auditoria-prontidao-producao-enterprise.md` quando existir
- evidencias tecnicas mais recentes de build, typecheck e suite ampla
- documentos de deploy e rollout em `/docs`

## Escopo

- build final
- typecheck final
- validacao de ambiente
- smoke tests dos fluxos centrais
- validacao de migrations
- checagem de rollback basico
- coerencia entre ambiente e contratos auditados

## Fluxos minimos para smoke test

- autenticacao
- tutores
- pacientes
- atendimentos
- prontuario
- prescricoes
- exames
- internacao
- execucao de prescricao
- alta

## Regras

- nao abrir novas features
- nao usar staging para corrigir estruturalmente o sistema
- qualquer falha critica reenfileira o projeto para correcao antes do go-live

## Entregavel obrigatorio

Criar:

- `/docs/139-relatorio-validacao-staging-go-live-enterprise.md`

Com:

1. ambiente validado
2. comandos executados
3. fluxos testados
4. falhas encontradas
5. decisao:
   - go
   - go com ressalvas
   - no-go
