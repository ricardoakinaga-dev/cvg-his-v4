# Módulo Tutores — Critérios de Aceite

## 1. Objetivo

Definir o checklist funcional e técnico que precisa ser atendido para considerar o módulo Tutores apto para staging e candidato a produção.

## 2. Aceite de cadastro

- é possível cadastrar tutor com os campos mínimos obrigatórios;
- o backend recusa payload inválido;
- contatos são persistidos corretamente;
- documento é normalizado;
- origem e status são persistidos;
- o retorno do cadastro contém `id` utilizável;
- mensagens de sucesso e erro são claras.

## 3. Aceite de edição

- é possível editar tutor existente;
- atualização parcial não quebra consistência;
- troca de contato principal funciona;
- atualização de documento dispara proteção contra duplicidade;
- mudança de status é salva e refletida na UI;
- alteração gera auditoria.

## 4. Aceite de listagem

- listagem carrega com paginação;
- colunas mínimas são exibidas;
- status do tutor é visível;
- pacientes vinculados são indicados;
- empty state é correto;
- loading e erro são coerentes.

## 5. Aceite de busca

- busca por nome funciona;
- busca por documento funciona sem depender de máscara;
- busca por telefone funciona com normalização;
- busca por e-mail funciona com lowercase;
- busca não retorna resultados incoerentes por falha de parsing.

## 6. Aceite de vínculo com paciente

- é possível criar paciente a partir de tutor salvo;
- vínculo principal é criado ou preservado automaticamente;
- o detalhe do tutor exibe pacientes vinculados;
- não é necessário digitar manualmente id do tutor em operação regular;
- vínculos secundários não quebram vínculo principal.

## 7. Aceite de validações

- campos obrigatórios são validados no frontend e backend;
- duplicidade por documento é bloqueada;
- contatos inválidos são rejeitados;
- e-mail inválido é rejeitado;
- status inválido é rejeitado;
- transições inconsistentes não passam silenciosamente.

## 8. Aceite de auditoria

- criação gera evento auditável;
- edição gera evento auditável;
- leitura de detalhe crítico pode gerar rastreio mínimo;
- criação rápida de paciente a partir do tutor é rastreável;
- tentativa de duplicidade relevante deixa rastro quando aplicável.

## 9. Aceite de sincronização frontend/backend

- frontend envia payload compatível com API;
- backend devolve estrutura compatível com frontend;
- listagem e detalhe usam contratos consistentes;
- tipos compartilhados refletem o shape real;
- não existem campos exibidos pela UI que o backend descarte silenciosamente.

## 10. Aceite para uso em staging

- fluxos principais executam sem erro crítico;
- busca operacional atende recepção;
- integração com pacientes está funcional;
- módulo suporta dados reais mínimos;
- erros são compreensíveis;
- auditoria básica está ativa.

## 11. Pendências que impedem produção

Qualquer item abaixo bloqueia produção:

- ausência de proteção contra duplicidade forte;
- ausência de integração funcional com pacientes;
- inconsistência entre banco, backend e frontend;
- ausência de auditoria mínima;
- busca incapaz de localizar tutor por dados operacionais reais;
- fluxo de cadastro que obriga digitação manual de id para criar paciente;
- edição que corrompe contatos ou vínculo principal.
