# Módulo Tutores — Frontend

## 1. Objetivo

Definir a implementação frontend necessária para transformar a tela atual de `owners` em uma experiência operacional robusta para cadastro, busca, manutenção e integração com pacientes.

## 2. Situação atual observada

A página atual `apps/web/src/pages/owners.ts` é simplificada:

- botão de novo tutor;
- formulário curto;
- busca básica;
- tabela simples;
- detalhe mínimo;
- sem blocos de formulário;
- sem múltiplos contatos;
- sem endereço estruturado;
- sem UX de integração com pacientes.

## 3. Estrutura da página de listagem

### 3.1 Objetivos da listagem

- permitir busca rápida de tutores existentes;
- evitar duplicidade antes de criar novo cadastro;
- exibir resumo operacional útil;
- permitir abrir detalhe ou edição;
- expor atalho para criação rápida de paciente.

### 3.2 Blocos recomendados

- cabeçalho da página;
- barra de ações;
- barra de filtros;
- tabela/lista responsiva;
- paginação;
- empty state;
- alertas de erro e sucesso.

### 3.3 Colunas recomendadas

- nome do tutor;
- documento;
- contato principal;
- e-mail principal;
- status;
- pacientes vinculados;
- última atualização;
- ações.

## 4. Estrutura da página de criação

### 4.1 Princípios

- fluxo enxuto, mas não superficial;
- campos agrupados por contexto;
- obrigatórios claros;
- validações próximas do campo;
- pronto para recepção hospitalar.

### 4.2 Blocos do formulário

#### Identificação

- nome completo;
- nome de exibição;
- tipo de documento;
- número do documento.

#### Contatos

- contatos repetíveis;
- pelo menos um contato;
- marcação de contato principal;
- e-mail principal quando aplicável;
- preferências de contato.

#### Endereço

- CEP;
- logradouro;
- número;
- complemento;
- bairro;
- cidade;
- estado;
- país.

#### Dados administrativos

- responsável financeiro;
- origem do cadastro;
- status inicial;
- observações administrativas.

#### Ações

- salvar tutor;
- salvar e adicionar paciente;
- cancelar.

## 5. Estrutura da página de edição/detalhe

### 5.1 Objetivo

Unificar visualização e manutenção.

### 5.2 Blocos recomendados

- resumo do tutor;
- formulário editável;
- bloco de pacientes vinculados;
- bloco de auditoria resumida;
- bloco de ações contextuais.

### 5.3 Informações mínimas no detalhe

- nome;
- documento;
- status;
- origem;
- contatos;
- endereço;
- observações administrativas;
- pacientes vinculados;
- datas de criação/atualização;
- usuário criador/última alteração quando disponível.

## 6. UX para campos obrigatórios

- sinalização visual consistente;
- mensagem de erro por campo;
- não depender apenas de erro genérico no topo;
- bloquear submissão quando faltarem obrigatórios críticos;
- destacar o primeiro erro.

## 7. Máscaras e validações

### 7.1 Frontend deve aplicar

- máscara de CPF/CNPJ quando aplicável;
- máscara de telefone;
- máscara de CEP;
- lowercase visual para e-mail sem alterar a digitação de forma agressiva;
- trimming de espaços laterais.

### 7.2 Frontend não deve assumir verdade final

Toda validação do frontend deve ser espelhada ou reforçada no backend.

## 8. Estados de UI

### Loading

- loading inicial da listagem;
- loading de busca;
- loading de submit;
- loading de carregamento do detalhe.

### Empty

- nenhum tutor encontrado;
- nenhum paciente vinculado;
- sem resultados para filtro aplicado.

### Error

- erro de carregamento;
- erro de validação;
- erro de duplicidade;
- erro de integração com pacientes.

### Success

- tutor salvo com sucesso;
- tutor atualizado com sucesso;
- paciente criado a partir do tutor;
- vínculo criado com sucesso.

## 9. Fluxo após salvar tutor

### 9.1 Salvar padrão

1. backend cria tutor;
2. frontend exibe confirmação;
3. lista é atualizada;
4. detalhe do tutor pode ser aberto automaticamente.

### 9.2 Salvar e adicionar paciente

1. backend cria tutor;
2. frontend redireciona para criação de paciente;
3. `tutorId`/`ownerId` já vai preenchido;
4. usuário segue o cadastro do paciente sem precisar reescolher tutor.

## 10. Botão rápido para cadastrar paciente

Este botão é obrigatório no desenho funcional futuro.

### Regras

- só aparece habilitado quando o tutor já está salvo;
- pode existir na listagem e no detalhe;
- deve navegar para o fluxo de paciente com vínculo pré-preenchido;
- deve reduzir atrito operacional da recepção.

## 11. Listagem de pacientes vinculados

No detalhe do tutor, exibir:

- nome do paciente;
- espécie;
- status;
- papel do tutor no vínculo;
- indicador de vínculo principal;
- ação para abrir paciente.

## 12. Busca e filtros

### Busca principal

- nome;
- documento;
- telefone;
- e-mail.

### Filtros adicionais

- status;
- origem;
- possui pacientes vinculados;
- responsável financeiro.

## 13. Mensagens de erro amigáveis

O frontend deve mapear códigos de erro do backend para mensagens utilizáveis pela operação:

- documento duplicado;
- contato inválido;
- tutor não encontrado;
- erro ao salvar;
- erro ao vincular paciente.

## 14. Coerência entre types/interfaces e API

### Requisito obrigatório

Os tipos do frontend devem refletir o contrato da API. Não é aceitável:

- interface reduzida que ignore campos novos;
- divergência de nomes sem camada explícita de transformação;
- detalhe com campos inexistentes na listagem sem contrato formal;
- fluxo de paciente esperando `tutorId` enquanto o backend só devolve `ownerId` sem mapeamento claro.

## 15. Responsividade mínima

Mesmo não sendo foco visual desta fase, a tela deve suportar:

- desktop operacional;
- tablet;
- smartphone com formulários quebrados em seções legíveis.

Listagem em mobile pode usar cartões ao invés de tabela.

## 16. Pontos de implementação

Arquivos prováveis a tocar futuramente:

- `apps/web/src/pages/owners.ts`
- `apps/web/src/pages/patients.ts`
- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

Se o projeto evoluir para componentes mais estruturados, manter este documento como contrato funcional da UI.
