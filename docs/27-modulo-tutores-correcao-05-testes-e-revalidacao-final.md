# Modulo Tutores — Correcao 05 — Testes e Revalidacao Final

## 1. Objetivo

Fechar tecnicamente a rodada de correcao do modulo Tutores com evidencias suficientes para nova auditoria.

## 2. Testes automatizados minimos do modulo Tutores

Esta rodada precisa adicionar testes automatizados focados no modulo Tutores.

Cobertura minima obrigatoria:

- create de tutor com contrato novo;
- listagem com busca por nome;
- listagem com busca por documento;
- listagem com busca por telefone;
- listagem com busca por email;
- update de tutor com alteracao de contato;
- create preenchendo autoria;
- update preenchendo autoria;
- detalhe retornando pacientes vinculados.

## 3. Cenarios que precisam ser cobertos

### Backend

- create com payload completo;
- create rejeitando documento duplicado;
- update com status `inactive` exigindo motivo;
- listagem com filtros;
- detalhe com `linkedPatients`;
- leitura persistida apos reinicializacao quando houver repositorio.

### Integracao

- criar tutor;
- criar paciente a partir do tutor;
- confirmar vinculo no detalhe do tutor.

### Frontend

Se houver estrutura de testes viavel, cobrir pelo menos:

- montagem de payload coerente;
- validacao basica dos campos;
- fluxo sem campo manual de tutor no caminho principal.

## 4. Revalidacao da API

Revalidacoes obrigatorias:

- `typecheck` da API;
- `build` da API;
- testes automatizados do modulo;
- reexecucao da suite de runtime da API;
- confirmar que nao restaram falhas novas ou antigas impeditivas.

## 5. Evidencias tecnicas esperadas

Antes da reauditoria, devem existir evidencias de:

- comandos executados;
- `typecheck` passando;
- `build` passando;
- testes do modulo passando;
- suite de runtime revalidada;
- fluxo tutor -> paciente validado.

## 6. O que nao basta como evidencia

Nao basta:

- dizer que a tela “parece pronta”;
- rodar apenas `typecheck`;
- validar apenas o frontend;
- ignorar a suite ampla da API.

## 7. Ordem recomendada

1. corrigir fonte de verdade do backend;
2. corrigir autoria;
3. corrigir fluxo de pacientes;
4. corrigir mascaras/contatos/validacoes;
5. adicionar testes do modulo;
6. rodar `typecheck`;
7. rodar `build`;
8. rodar testes do modulo;
9. rodar suite ampla da API;
10. consolidar evidencias para reauditoria.

## 8. Criterios para considerar o modulo apto a reauditoria

- testes do modulo Tutores adicionados e passando;
- `typecheck` e `build` passando;
- suite ampla da API revalidada;
- nenhum bloqueio estrutural do relatorio 21 permaneceu aberto;
- evidencias tecnicas registradas de forma objetiva.
