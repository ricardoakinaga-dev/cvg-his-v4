# Módulo Tutores — Backlog Mestre

## 1. Objetivo do backlog

Este backlog converte os documentos 01 a 10 do módulo Tutores em um plano técnico executável, aderente ao estado real do projeto CVG-HIS-V2. O propósito é reduzir improviso na implementação, explicitar a ordem correta entre banco, backend e frontend, e permitir que um agente worker implemente o módulo com baixa ambiguidade.

O backlog parte da realidade atual:

- frontend simplificado em [`owners.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts);
- backend atual em [`server.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts);
- schema atual de `owners` e `patients` em [`index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts);
- integração já existente por `ownerId` e `owner-patient-links`.

## 2. Visão geral da execução

O módulo deve ser executado em cinco fases encadeadas:

1. banco e contrato;
2. backend e API;
3. frontend de listagem e formulário;
4. detalhe do tutor e integração com pacientes;
5. validações, testes e hardening.

Essa ordem é obrigatória porque:

- o frontend não pode estabilizar sem contrato de dados;
- o backend não pode ficar pronto sem evolução mínima do schema;
- a integração com pacientes depende de retorno consistente do tutor;
- testes de verdade só fazem sentido quando o fluxo tutor -> paciente estiver funcional.

## 3. Ordem macro das fases

### Fase 01

Banco e contrato fullstack do Tutor.

### Fase 02

Backend do módulo com rotas, validações, busca e auditoria.

### Fase 03

Frontend inicial de Tutores com listagem, busca e formulário robusto.

### Fase 04

Detalhe do tutor e integração operacional com Pacientes.

### Fase 05

Validações finais, testes, regressão, hardening e gate para auditoria.

## 4. Dependências entre fases

### Fase 01 depende de

- documentos 01 a 10 consolidados;
- decisão transitória sobre retrocompatibilidade do naming `owner`.

### Fase 02 depende de

- Fase 01 concluída ou mockada de forma estável;
- tipos compartilhados e shape do payload definidos.

### Fase 03 depende de

- Fase 02 com contratos utilizáveis;
- respostas de API consistentes para listagem, create, detail e update.

### Fase 04 depende de

- Fase 03 com fluxo de criação/edição funcional;
- Fase 02 com vínculo e resposta de detalhe suficientes.

### Fase 05 depende de

- fluxo fim a fim minimamente implementado;
- integração tutor -> paciente já operacional.

## 5. Marcos principais de entrega

### Marco A

Contrato de dados do Tutor refletido no schema, contratos compartilhados e payloads.

### Marco B

API de Tutores suportando:

- create;
- list;
- detail;
- update;
- busca por múltiplas chaves;
- erros previsíveis;
- auditoria mínima.

### Marco C

Tela de Tutores apta para:

- listar;
- buscar;
- cadastrar;
- editar;
- exibir estados de loading/error/success.

### Marco D

Fluxo real de recepção:

1. localizar ou criar tutor;
2. salvar tutor;
3. adicionar paciente a partir do tutor salvo;
4. ver paciente vinculado no detalhe do tutor.

### Marco E

Módulo apto para auditoria pós-implementação.

## 6. Riscos de quebrar sincronização frontend/backend

Os principais riscos são:

- backend continuar retornando `owners` simplificados enquanto o frontend espera `TutorDetail` expandido;
- frontend enviar `contacts` estruturados e backend continuar aceitando só `phone`/`email` simples;
- schema evoluir para `jsonb` de contatos sem tipos compartilhados refletirem isso;
- detalhe do tutor não trazer pacientes vinculados, obrigando chamadas ad hoc incoerentes;
- naming misto `owner`, `tutor`, `ownerId`, `tutorId` sem mapeamento explícito;
- paginação existir no backend e o frontend continuar assumindo array simples.

## 7. Definição do fluxo mínimo que precisa funcionar ao final

Ao final do backlog, o menor fluxo aceitável é:

1. usuário busca tutor por nome, documento, telefone ou e-mail;
2. se não encontrar, cadastra tutor com dados mínimos válidos;
3. backend normaliza e salva o tutor;
4. frontend confirma sucesso e permite seguir para criação de paciente;
5. paciente é criado já vinculado ao tutor salvo;
6. detalhe do tutor exibe pacientes vinculados;
7. duplicidade forte por documento é bloqueada;
8. ações críticas deixam rastro mínimo de auditoria.

## 8. O que é considerado concluído no módulo Tutores

O módulo só poderá ser considerado concluído quando:

- banco, backend e frontend refletirem o mesmo contrato;
- listagem, criação, detalhe e edição estiverem estáveis;
- integração com pacientes estiver funcional sem digitação manual de id;
- busca por múltiplas chaves estiver operante;
- duplicidade forte estiver protegida;
- auditoria mínima estiver ativa;
- os gates documentados em `20-modulo-tutores-gate-de-pronto-para-auditoria.md` forem atendidos.

## 9. Itens explicitamente fora do escopo desta execução

Não entram como requisito obrigatório desta rodada:

- renomeação global imediata de `owner` para `tutor` em todo o sistema;
- redesenho completo de outros módulos que consomem `ownerId`;
- motor avançado de deduplicação heurística;
- motor de consentimento ou autorização clínica detalhada por responsável;
- integração externa com CRM, ERP ou mensageria.

## 10. Diretriz para o worker

O worker deve tratar este backlog como contrato operacional e não como sugestão. Se algum passo revelar conflito com o código atual:

- preservar compatibilidade de curto prazo;
- não inventar novos módulos sem necessidade;
- explicitar o desvio documental;
- priorizar coerência fullstack sobre “solução rápida” local.
