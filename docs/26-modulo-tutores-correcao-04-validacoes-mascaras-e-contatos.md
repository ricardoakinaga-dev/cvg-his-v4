# Modulo Tutores — Correcao 04 — Validacoes, Mascaras e Contatos

## 1. Objetivo

Fechar os gaps de UX e consistencia do frontend do modulo Tutores sem reabrir redesign do modulo inteiro.

## 2. Mascaras obrigatorias

Nesta rodada, devem ser obrigatorias:

- mascara de CPF/CNPJ;
- mascara de telefone;
- mascara de CEP.

Essas mascaras sao bloqueantes porque foram explicitamente previstas na documentacao e fazem parte da reducao de erro operacional.

## 3. Validacoes por campo

Validacoes minimas obrigatorias no frontend:

- nome completo obrigatorio;
- pelo menos um contato valido;
- documento com formato plausivel;
- e-mail com formato plausivel;
- CEP com formato plausivel;
- status `inactive` exige motivo de inativacao;
- nao permitir dois contatos marcados como principais.

## 4. Tratamento minimo de CPF/CNPJ, telefone e CEP

### CPF/CNPJ

- aplicar mascara visual;
- limpar para envio;
- validar formato basico no frontend;
- deixar a validacao final no backend.

### Telefone

- aplicar mascara visual compativel com telefone brasileiro;
- limpar para envio;
- validar quantidade minima de digitos.

### CEP

- aplicar mascara visual;
- limpar para envio;
- validar quantidade minima de digitos.

## 5. Evolucao de contatos para UI repetivel real

O contato adicional fixo nao basta para fechar a auditoria.

### O que precisa existir

- lista repetivel de contatos;
- adicionar contato;
- remover contato;
- definir principal;
- diferenciar tipo do contato;
- manter coerencia com `contacts[]` do contrato.

### O que nao precisa existir nesta rodada

- ordenacao complexa;
- agrupamento avancado;
- subformularios complexos demais.

O objetivo aqui e resolver a parcialidade da UI, nao reescrever o sistema de formularios inteiro.

## 6. O que e obrigatorio nesta rodada

- mascaras de documento, telefone e CEP;
- validacoes por campo essenciais;
- contatos repetiveis reais;
- coerencia entre o que a UI exibe e o que a API espera.

## 7. O que pode ficar para melhoria posterior sem bloquear reauditoria

- auto-complete de endereco por CEP;
- heuristicas de validacao mais avancadas para documento;
- controles visuais mais refinados de contatos;
- categorizacao extra de contatos alem do contrato minimo.

## 8. Arquivos provaveis a alterar

- [apps/web/src/pages/owners.ts](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts)
- `apps/web/src/styles.ts`, se a UI repetivel exigir ajuste minimo de layout

## 9. Ordem recomendada

1. introduzir funcoes utilitarias simples de mascara/normalizacao no frontend;
2. aplicar mascaras nos campos principais;
3. adicionar validacao por campo;
4. substituir contato adicional fixo por lista repetivel;
5. validar o payload final enviado;
6. revisar create e edit.

## 10. Criterios de conclusao

- mascaras ativas para documento, telefone e CEP;
- validacoes minimas por campo funcionando;
- contatos repetiveis implementados;
- nenhum campo novo fica so na UI sem bater com a API;
- a auditoria deixa de apontar parcialidade em contatos e ausencia de mascaras.
