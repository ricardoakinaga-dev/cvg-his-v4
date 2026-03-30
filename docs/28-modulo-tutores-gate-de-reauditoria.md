# Modulo Tutores — Gate de Reauditoria

## 1. Objetivo

Definir o gate objetivo para liberar nova auditoria do modulo Tutores apos a rodada final de correcoes.

## 2. Checklist bloqueante

Todos os itens abaixo devem estar concluídos:

- [ ] `OwnersService` nao depende mais de memoria como fonte principal quando ha persistencia.
- [ ] create preenche `createdByUserId`.
- [ ] create preenche `updatedByUserId`.
- [ ] update preserva `createdByUserId`.
- [ ] update atualiza `updatedByUserId`.
- [ ] fluxo vindo de Tutores para Pacientes nao usa campo manual como caminho principal.
- [ ] mascaras de documento, telefone e CEP implementadas.
- [ ] validacoes client-side essenciais implementadas.
- [ ] contatos repetiveis reais implementados.
- [ ] testes automatizados focados no modulo Tutores adicionados.
- [ ] `typecheck` passa.
- [ ] `build` passa.
- [ ] suite ampla da API foi revalidada.

## 3. Checklist nao bloqueante

Podem ficar como ressalvas sem impedir reauditoria, desde que registrados:

- [ ] refinamentos adicionais de UX;
- [ ] melhorias de validacao mais avancadas;
- [ ] auto-complete de endereco;
- [ ] heuristicas extras de deduplicacao.

## 4. Sinais de que a correcao foi superficial

Se qualquer um destes sinais aparecer, a correcao deve ser considerada superficial:

- o `Map` em memoria continua sendo a leitura principal;
- autoria continua vazia no registro persistido;
- o campo manual de tutor continua visivel e relevante no fluxo principal;
- mascaras foram trocadas por placeholders sem validacao;
- “contatos multiplos” continuam sendo apenas dois campos fixos;
- testes focados no modulo nao foram realmente adicionados;
- a suite ampla da API nao foi reexecutada.

## 5. Criterios para liberar nova auditoria

Nova auditoria so deve ser liberada quando:

- checklist bloqueante estiver 100% concluido;
- os bloqueios do relatorio 21 nao estiverem mais presentes;
- houver evidencias tecnicas objetivas;
- o modulo estiver estavel o suficiente para ser reavaliado sem reabrir novas frentes.

## 6. Criterios para mudar a classificacao

### De “reprovado” para “aprovado com ressalvas”

Quando:

- todos os bloqueios estruturais forem corrigidos;
- os testes minimos passarem;
- a revalidacao da API for concluida;
- restarem apenas melhorias nao bloqueantes.

### De “reprovado” para “aprovado”

Quando:

- todos os bloqueios estruturais forem corrigidos;
- nao restarem divergencias relevantes entre banco, backend e frontend;
- fluxo tutor -> paciente estiver fechado de forma limpa;
- testes e revalidacao estiverem consistentes;
- a nova auditoria nao identificar gaps materiais.

## 7. Saida esperada do gate

O gate deve produzir uma decisao objetiva:

- `Liberado para reauditoria`
- `Nao liberado para reauditoria`

Se `Nao liberado`, a saida deve apontar exatamente quais itens bloqueantes continuam abertos.
