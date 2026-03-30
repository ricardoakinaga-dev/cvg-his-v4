# PROMPT MASTER — CVG-HIS-V2 — EXECUÇÃO ENTERPRISE COMPLETA DE MÓDULO

## Objetivo

Executar de forma completa, controlada e auditável a implementação de um módulo do sistema CVG-HIS-V2, utilizando a documentação existente em `/docs` como contrato único de verdade, até entregar o módulo pronto para auditoria em nível enterprise.

Este prompt substitui execuções fragmentadas.
O Codex deve agir como orquestrador completo do ciclo de implementação.

## PRINCÍPIO CENTRAL

A documentação em `/docs` é a única fonte de verdade.

O código deve obedecer aos documentos.
Nunca o contrário.

Se houver divergência:

- ajustar o código para refletir o contrato documental
- nunca adaptar o contrato ao código existente sem justificativa explícita

## ESCOPO DE EXECUÇÃO

Executar TODAS as fases do módulo, do início até o estado:

`PRONTO PARA AUDITORIA`

Inclui:

- banco
- backend
- frontend
- integração entre módulos
- validações
- testes mínimos
- consistência fullstack

Não inclui:

- auditoria final (será etapa separada)

## FASES DE EXECUÇÃO (OBRIGATÓRIAS)

Seguir EXATAMENTE esta ordem:

- FASE 1 — INTERPRETAÇÃO DO PLANO
- FASE 2 — MAPEAMENTO DO CÓDIGO REAL
- FASE 3 — IMPLEMENTAÇÃO POR FASE
- FASE 4 — VALIDAÇÃO CONTÍNUA
- FASE 5 — CORREÇÕES AUTOMÁTICAS
- FASE 6 — PREPARAÇÃO PARA AUDITORIA

## FASE 1 — INTERPRETAÇÃO DO PLANO

Ações:

1. Ler TODOS os documentos do módulo em `/docs`
2. Extrair:
   - contrato de dados
   - regras de negócio
   - fluxos principais
   - dependências com outros módulos
   - critérios de aceite
3. Identificar:
   - campos obrigatórios
   - validações críticas
   - integrações obrigatórias

Saída interna:

`entendimento completo do módulo antes de alterar código`

PROIBIDO:

- começar implementação sem completar esta fase

## FASE 2 — MAPEAMENTO DO CÓDIGO REAL

Ações:

1. Mapear arquivos existentes:
   - backend
   - frontend
   - schema
   - contratos
2. Identificar:
   - o que já existe
   - o que está incompleto
   - o que está errado
   - o que precisa ser criado
3. Cruzar:
   - docs vs código real

Saída:

`mapa de gap entre documentação e código`

## FASE 3 — IMPLEMENTAÇÃO POR FASE

Executar exatamente nesta ordem:

### FASE 3.1 — BANCO / SCHEMA

- ajustar entidades
- adicionar campos
- garantir compatibilidade
- preparar persistência real

Regra:

`banco precisa suportar 100% do contrato`

### FASE 3.2 — BACKEND

- ajustar rotas
- ajustar services
- validar dados
- garantir persistência real
- garantir que banco é fonte de verdade

Regra crítica:

`backend NÃO pode depender de memória como fonte principal`

### FASE 3.3 — FRONTEND

- ajustar listagem
- ajustar formulário
- implementar UX correta
- implementar validações
- implementar estados (loading, erro, sucesso)

Regra:

`frontend deve refletir exatamente o contrato backend`

### FASE 3.4 — INTEGRAÇÕES

- conectar com outros módulos
- garantir fluxo real do usuário
- eliminar caminhos manuais frágeis

Exemplo:

- paciente deve usar tutor salvo
- não depender de ID digitado

### FASE 3.5 — VALIDAÇÕES

- backend: validação obrigatória
- frontend: validação UX
- garantir consistência

### FASE 3.6 — TESTES MÍNIMOS

- criar testes focados do módulo
- validar:
  - create
  - update
  - list
  - detail
  - integrações

## FASE 4 — VALIDAÇÃO CONTÍNUA

Após cada subfase:

- validar build
- validar typecheck
- validar funcionamento básico

Se algo quebrar:

`corrigir antes de avançar`

## FASE 5 — CORREÇÕES AUTOMÁTICAS

Antes de finalizar:

1. Identificar inconsistências:
   - backend vs frontend
   - contrato vs persistência
   - UX vs regra de negócio

2. Corrigir automaticamente:
   - nomes divergentes
   - campos não persistidos
   - validações faltantes
   - payload incorreto

Regra:

`não deixar débito técnico básico`

## FASE 6 — PREPARAÇÃO PARA AUDITORIA

Verificar:

- fluxo principal funciona ponta a ponta
- dados persistem corretamente
- backend usa banco como fonte real
- frontend está sincronizado
- validações mínimas existem
- integração entre módulos funciona

Se algo crítico falhar:

`voltar para fase anterior e corrigir`

## REGRAS GLOBAIS

1. Não improvisar arquitetura
2. Não criar complexidade desnecessária
3. Não criar abstrações prematuras
4. Não ignorar inconsistências
5. Não deixar divergência fullstack
6. Não depender de memória como fonte principal
7. Não permitir fluxo manual quando existe fluxo estruturado
8. Não avançar fase com erro aberto

## ENTREGA FINAL OBRIGATÓRIA

Ao final, entregar:

1. Lista de arquivos alterados
2. Lista de arquivos criados
3. Resumo por fase:
   - o que foi feito
4. Pontos de atenção
5. Pendências remanescentes (se houver)
6. Confirmação:

`Módulo pronto para auditoria`

IMPORTANTE:

Não declarar pronto para produção.
Apenas pronto para auditoria.

## CRITÉRIO DE SUCESSO

O módulo será considerado bem implementado se:

- funcionar ponta a ponta
- respeitar o contrato documental
- não tiver inconsistência estrutural
- não depender de fluxo manual frágil
- estiver apto para auditoria enterprise

## FIM DO PROMPT
