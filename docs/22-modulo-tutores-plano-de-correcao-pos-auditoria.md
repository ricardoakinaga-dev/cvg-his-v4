# Modulo Tutores — Plano de Correcao Pos-Auditoria

## 1. Objetivo

Este documento organiza a rodada final de correcoes do modulo Tutores apos a auditoria ter classificado o modulo como reprovado para avanco. O foco aqui nao e expandir escopo, e sim fechar os gaps bloqueantes que impedem reauditoria positiva.

## 2. Resumo dos bloqueios encontrados

Bloqueios principais registrados na auditoria:

1. `OwnersService` ainda usa estado principal em memoria, e nao persistencia como fonte real de verdade.
2. `createdByUserId` e `updatedByUserId` existem no contrato e no schema, mas nao sao preenchidos.
3. `patients.ts` ainda expoe campo manual de tutor como caminho operacional relevante.
4. mascaras e validacoes client-side principais nao foram implementadas.
5. UI de contatos multiplos ficou parcial, sem estrutura repetivel real.
6. faltam testes automatizados focados no modulo Tutores.
7. a suite ampla da API precisa ser revalidada ao final da rodada.

## 3. Ordem obrigatoria das correcoes

Ordem de execucao obrigatoria:

1. corrigir a fonte de verdade do backend;
2. corrigir autoria de create/update;
3. corrigir o fluxo de pacientes para nao depender de campo manual;
4. corrigir mascaras, validacoes e contatos repetiveis;
5. adicionar testes do modulo e revalidar a API;
6. aplicar o gate de reauditoria.

Essa ordem e obrigatoria porque:

- o frontend nao deve ser ajustado em cima de backend desalinhado;
- os testes finais so fazem sentido quando backend e UX estiverem fechados;
- a reauditoria so deve ocorrer apos o fluxo tutor -> paciente e a trilha minima estarem corretos.

## 4. O que e bloqueante

Itens bloqueantes para reauditoria:

- `OwnersService` em memoria como fonte principal;
- autoria de create/update nao preenchida;
- fluxo de pacientes ainda dependendo de campo manual como caminho real;
- ausencia de mascaras e validacoes essenciais;
- contatos multiplos sem UI repetivel minima;
- falta de testes focados no modulo;
- ausencia de nova validacao da suite da API.

## 5. O que e secundario

Itens secundarios nesta rodada:

- refino visual adicional da tela de Tutores;
- heuristicas avancadas de deduplicacao por telefone/e-mail;
- reformulacao completa do naming tecnico `owner` para `tutor`;
- expansao de cenarios complexos de multiplos responsaveis alem do necessario para o fluxo atual;
- automacoes de auditoria formal alem do que o gate ja exige.

Esses pontos nao devem reabrir o escopo desta rodada.

## 6. Risco de nao corrigir cada item

### Fonte de verdade do backend

Risco alto:

- quebra sincronizacao fullstack;
- invalida staging real;
- torna o schema evoluido decorativo.

### Auditoria de autoria

Risco alto:

- rastreabilidade incompleta;
- create/update sem autoria confiavel.

### Fluxo de pacientes sem campo manual

Risco medio-alto:

- recepcao continua com caminho operacional fragil;
- fluxo tutor -> paciente segue parcialmente quebrado.

### Mascaras e validacoes

Risco medio:

- dados mal formatados;
- UX abaixo do contrato documental;
- aumento de erros operacionais.

### Contatos repetiveis

Risco medio:

- modulo continua incapaz de atender cenarios reais de contato;
- aderencia apenas parcial ao contrato de dados.

### Testes e revalidacao

Risco alto:

- regressao invisivel;
- falsa sensacao de modulo corrigido.

## 7. Definicao do que precisa ficar pronto para reauditoria

Antes de uma nova auditoria, deve estar pronto:

- leitura/escrita de `owners` alinhada com persistencia real;
- `createdByUserId` e `updatedByUserId` preenchidos;
- fluxo principal de pacientes sem depender de input manual de tutor;
- mascaras e validacoes basicas ativas;
- contatos repetiveis implementados no frontend;
- testes automatizados minimos do modulo Tutores;
- `typecheck`, `build` e revalidacao da API executados;
- gate de reauditoria atendido.

## 8. Resultado esperado desta rodada

Resultado minimo esperado:

- o modulo muda de `reprovado para avanco` para pelo menos `aprovado com ressalvas`;
- os bloqueios estruturais deixam de existir;
- o restante da analise passa a ser de acabamento, e nao de falha de base.
