# Módulo Tutores — Plano de Testes

## 1. Objetivo

Definir a estratégia de testes para validar o módulo Tutores em nível funcional, técnico e operacional.

## 2. Testes funcionais

Cobrir:

- cadastro de tutor com dados mínimos válidos;
- cadastro de tutor com dados completos;
- edição de tutor;
- listagem paginada;
- abertura de detalhe;
- criação rápida de paciente a partir do tutor;
- exibição de pacientes vinculados.

## 3. Testes de integração

Cobrir:

- frontend criando tutor via API;
- frontend atualizando tutor via API;
- frontend buscando tutor por múltiplos critérios;
- frontend criando paciente a partir de tutor salvo;
- frontend exibindo vínculos retornados pelo backend.

## 4. Testes de validação

### Casos mínimos

- nome vazio;
- documento inválido;
- e-mail inválido;
- telefone inválido;
- dois contatos principais;
- `primaryContactId` apontando para contato inexistente;
- status inválido;
- origem inválida.

## 5. Testes de erro

Cobrir:

- `404` tutor não encontrado;
- `409` duplicidade por documento;
- `422` regra de negócio violada;
- `403` usuário sem permissão;
- falha de rede ou backend indisponível;
- resposta parcial/inconsistente.

## 6. Testes de UX

Validar manualmente:

- clareza dos obrigatórios;
- mensagens de erro por campo;
- feedback após salvar;
- facilidade para localizar tutor existente;
- facilidade para seguir do tutor para o paciente;
- compreensão do status e dos pacientes vinculados.

## 7. Testes de regressão

Verificar que a evolução do módulo não quebra:

- dashboard que usa contagem de tutores;
- busca mestre;
- fluxo atual de pacientes;
- referências a `ownerId` em atendimento, fila e faturamento;
- permissões `owners.read` e `owners.manage`.

## 8. Cenários manuais prioritários

### Cenário 1

Cadastrar tutor novo, salvar e criar paciente.

### Cenário 2

Buscar tutor por CPF e reutilizar cadastro existente.

### Cenário 3

Editar telefone principal e validar reflexo na listagem.

### Cenário 4

Inativar tutor com pacientes vinculados e validar comportamento do sistema.

### Cenário 5

Tentar criar tutor duplicado por documento.

## 9. Cenários de busca

- nome completo;
- nome parcial;
- CPF formatado;
- CPF sem máscara;
- telefone com máscara;
- telefone sem máscara;
- e-mail em maiúsculas/minúsculas.

## 10. Cenários de vínculo com pacientes

- tutor salvo cria paciente com vínculo principal;
- tutor com pacientes existentes mostra vínculos no detalhe;
- paciente com vínculo adicional não perde vínculo principal;
- tentativa de criar paciente sem tutor válido é bloqueada, se essa for a política final.

## 11. Cenários de dados incompletos ou inválidos

- tutor sem documento em fluxo excepcional;
- tutor sem endereço;
- tutor com apenas um telefone;
- tutor com e-mail e telefone divergentes do contato preferencial;
- CEP inválido;
- documento vazio com status ativo em política que não permite isso.

## 12. Critério de conclusão dos testes

O plano de testes só será considerado concluído quando:

- cenários críticos passarem;
- erros de contrato forem corrigidos;
- regressões relevantes forem descartadas;
- a operação conseguir usar tutor -> paciente sem atrito estrutural.
