# Módulo Tutores — Fase 05 — Validações, Testes e Hardening

## 1. Objetivo

Fechar a robustez do módulo Tutores antes da auditoria formal, garantindo consistência de regras de negócio, integração tutor -> paciente e estabilidade suficiente para staging.

## 2. Validações de negócio

O worker deve validar explicitamente:

- nome obrigatório;
- documento válido quando exigido;
- contatos consistentes;
- e-mail válido;
- um único contato principal;
- `preferredContactMethod` coerente;
- status permitido;
- origem permitida;
- inativação com motivo;
- bloqueio de duplicidade forte.

## 3. Casos de erro obrigatórios

Devem ser exercitados e tratados:

- payload inválido;
- tutor não encontrado;
- documento duplicado;
- dois contatos principais;
- contato principal inexistente;
- status inválido;
- origem inválida;
- erro ao vincular paciente;
- permissão insuficiente.

## 4. Testes manuais prioritários

### Fluxo 1

Buscar tutor inexistente, cadastrar e seguir para paciente.

### Fluxo 2

Buscar tutor existente por documento e reutilizar cadastro.

### Fluxo 3

Editar contatos e confirmar reflexo na listagem e detalhe.

### Fluxo 4

Inativar tutor com pacientes vinculados e validar comportamento.

### Fluxo 5

Tentar cadastrar documento duplicado.

## 5. Testes de integração recomendados

Arquivos prováveis:

- [`apps/api/src/runtime.test.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts)
- [`apps/api/src/db-persistence.test.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/db-persistence.test.ts)

Casos recomendados:

- create/list/detail/update de tutor;
- busca por documento/telefone/e-mail;
- duplicidade por documento;
- detalhe do tutor retornando pacientes vinculados;
- criação de paciente a partir de tutor salvo.

## 6. Validação de busca

Conferir:

- busca por nome parcial;
- busca por documento com máscara e sem máscara;
- busca por telefone com máscara e sem máscara;
- busca por e-mail case-insensitive;
- paginação sem perda de consistência.

## 7. Validação de duplicidade

Conferir:

- bloqueio por documento normalizado;
- sinalização de possível duplicidade por contato principal;
- auditoria de tentativa crítica, quando aplicável.

## 8. Validação de edição

Conferir:

- `PATCH` parcial funciona;
- update não remove campos acidentalmente;
- troca de contato principal rebaixa o anterior;
- mudança de status reflete na listagem e detalhe.

## 9. Validação do vínculo com paciente

Conferir:

- criar paciente a partir do tutor salvo;
- detalhe do tutor refletir vínculo novo;
- paciente não nascer sem responsável válido em fluxo regular;
- vínculos adicionais não substituírem o principal por acidente.

## 10. Auditoria mínima

Antes de encerrar esta fase, validar que há rastreio de:

- create;
- update;
- detail crítico;
- criação de vínculo tutor-paciente;
- fluxo rápido de criação de paciente, se implementado.

## 11. Riscos para staging

- backend e frontend com contratos parcialmente divergentes;
- dados legados sem adaptação mínima;
- mensagens de erro insuficientes para operação;
- detalhe do tutor sem vínculos;
- busca inconsistente com máscara;
- regressão em módulos que ainda consomem `ownerId`.

## 12. Tipo de alteração desta fase

- hardening;
- testes;
- correção de integração;
- fechamento de lacunas de validação.

## 13. Ordem recomendada da fase

1. rodar testes de backend;
2. validar manualmente fluxo de frontend;
3. validar busca;
4. validar duplicidade;
5. validar edição;
6. validar integração tutor -> paciente;
7. revisar auditoria;
8. fechar pendências bloqueantes.

## 14. Critérios de conclusão da fase

- casos críticos passaram;
- erros bloqueantes corrigidos;
- fluxo tutor -> paciente está operacional;
- auditoria mínima ativa;
- regressões relevantes descartadas;
- módulo apto a entrar no gate de auditoria.
