# Backend Architecture

## Papel do `apps/api`

- resolver actor e contexto institucional
- aplicar autenticacao e policy
- orquestrar casos de uso por modulo
- persistir via adapters
- emitir eventos e auditoria

## Estrutura esperada

- camada de transporte HTTP
- composition root dos modulos
- adapters de persistencia, fila e integracoes
- serializacao e padronizacao de erro

## Regras

- transporte nao carrega regra de negocio
- mutacao de estado exige validacao, policy e auditoria
- comunicacao entre modulos acontece por surface publica e contratos
