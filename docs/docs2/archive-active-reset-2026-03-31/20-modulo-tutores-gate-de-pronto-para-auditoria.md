# Módulo Tutores — Gate de Pronto para Auditoria

## 1. Objetivo

Definir quando o módulo Tutores pode sair da etapa de implementação e entrar na etapa formal de auditoria pós-implementação.

## 2. Requisitos mínimos obrigatórios

Para o módulo ser elegível à auditoria, todos os itens abaixo precisam estar atendidos:

- contrato de dados do Tutor refletido em banco, backend e frontend;
- create/list/detail/update implementados;
- busca por nome, documento, telefone e e-mail funcional;
- detalhe do tutor exibindo pacientes vinculados;
- fluxo de `Adicionar paciente` operacional a partir do tutor salvo;
- proteção contra duplicidade forte por documento;
- auditoria mínima ativa;
- erros estruturados e compreensíveis;
- compatibilidade transitória com `ownerId` preservada.

## 3. Sinais de implementação incompleta

O módulo não deve seguir para auditoria se qualquer um destes sinais estiver presente:

- formulário ainda simplificado como CRUD básico;
- detalhe do tutor ainda mínimo;
- ausência de pacientes vinculados no detalhe;
- busca ainda limitada a nome/documento de forma superficial;
- fluxo regular ainda exigir digitação manual de id;
- payload do frontend diferente do contrato backend;
- backend aceitando ou ignorando campos sem coerência documental.

## 4. Inconsistências bloqueantes

Bloqueiam a ida para auditoria:

- schema implementado diferente do contrato aprovado;
- listagem retornando shape diferente do usado pelo frontend;
- detalhe de tutor sem dados de contato/endereço quando estes já forem persistidos;
- divergência entre `email`/`phone` raiz e `contacts` sem regra transitória;
- vínculo principal do paciente inconsistente com `owner-patient-links`;
- ausência de auditoria em create e update;
- duplicidade forte não bloqueada.

## 5. Critérios de sincronização fullstack

O módulo só pode ir à auditoria se houver prova de sincronização entre:

### Banco

- schema atualizado;
- migration consistente;
- dados legados tratados.

### Backend

- payload de entrada compatível;
- resposta de list/detail padronizada;
- erros estruturados;
- normalização ativa.

### Frontend

- campos exibidos compatíveis com a API;
- submit coerente com o contrato;
- detalhe e listagem usando o mesmo modelo de dados.

## 6. Critérios de estabilidade funcional

Devem estar validados:

- cadastro de tutor novo;
- edição de tutor;
- busca por múltiplas chaves;
- visualização de pacientes vinculados;
- criação rápida de paciente;
- tratamento de erro de duplicidade;
- fluxo com tutor inativo, se implementado.

## 7. Critérios mínimos para liberar a Etapa 4 de auditoria

### Obrigatórios

- checklist do documento 19 com itens críticos concluídos;
- critérios de aceite do documento 08 atendidos em nível suficiente;
- plano de testes do documento 09 executado nos cenários críticos;
- nenhuma inconsistência bloqueante aberta;
- principal fluxo de recepção funcionando.

### Evidências esperadas

- respostas reais de API coerentes;
- interface funcional no frontend;
- testes de backend passando;
- rastros de auditoria visíveis;
- validação manual do fluxo tutor -> paciente.

## 8. Decisão final do gate

O resultado do gate deve ser um dos três:

- `Apto para auditoria`
- `Apto com restrições`
- `Não apto`

### Regras

- `Apto para auditoria`: sem bloqueios críticos e com fluxo mínimo completo.
- `Apto com restrições`: pequenas lacunas não bloqueantes, já registradas.
- `Não apto`: qualquer quebra de sincronização fullstack, duplicidade sem proteção ou falha no fluxo tutor -> paciente.
