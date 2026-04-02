# Módulo Tutores — Fase 03 — Frontend Listagem e Formulário

## 1. Objetivo

Substituir a página atual simplificada de Tutores por uma experiência operacional robusta para recepção, administrativo e equipe clínica, sem romper a navegação existente do sistema.

## 2. Revisão do owners.ts atual

O arquivo atual [`apps/web/src/pages/owners.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts):

- possui formulário curto;
- salva payload reduzido;
- renderiza listagem simples em tabela;
- abre detalhe mínimo;
- busca por `q`;
- não possui paginação real;
- não possui filtros estruturados;
- não possui bloco de pacientes vinculados;
- não possui fluxo de `Salvar e adicionar paciente`.

## 3. Mudanças esperadas na listagem

### Tipo de alteração

- refatoração da listagem;
- expansão da UI;
- adaptação ao novo contrato de list.

### Objetivos

- permitir localização rápida de cadastro existente;
- reduzir duplicidade;
- exibir resumo operacional útil;
- expor ações principais.

### Elementos mínimos

- cabeçalho com título e CTA de novo tutor;
- barra de busca;
- filtros por status e origem;
- tabela ou cards responsivos;
- paginação;
- indicador de loading;
- empty state;
- mensagens de erro.

### Colunas recomendadas

- nome;
- documento;
- contato principal;
- e-mail principal;
- status;
- pacientes vinculados;
- última atualização;
- ações.

## 4. Mudanças esperadas no formulário

### Tipo de alteração

- expansão do formulário;
- reorganização em blocos;
- adequação ao payload real da API.

### Estrutura em blocos

#### Bloco 1 — Identificação

- nome completo;
- nome de exibição;
- tipo de documento;
- número do documento.

#### Bloco 2 — Contatos

- contatos repetíveis;
- telefone principal;
- e-mail principal;
- indicador de WhatsApp;
- flags de recebimento clínico/financeiro;
- método preferencial.

#### Bloco 3 — Endereço

- CEP;
- rua;
- número;
- complemento;
- bairro;
- cidade;
- estado;
- país.

#### Bloco 4 — Dados administrativos

- status;
- origem;
- responsável financeiro;
- observações administrativas.

#### Bloco 5 — Ações

- salvar;
- salvar e adicionar paciente;
- cancelar.

## 5. Campos novos

Campos novos esperados na UI:

- `displayName`
- `document.type`
- `document.number`
- `contacts[]`
- `preferredContactMethod`
- `preferredContactWindow`
- `address.*`
- `origin`
- `financialResponsible`
- `administrativeNotes`
- `status`

## 6. Máscaras

### Obrigatórias

- CPF/CNPJ;
- telefone;
- CEP.

### Regras

- máscara é responsabilidade visual;
- valor final deve ser enviado sem ruído desnecessário;
- não confiar na máscara como validação final.

## 7. Validações

### Frontend deve validar

- obrigatórios mínimos;
- documento em formato plausível;
- e-mail em formato plausível;
- pelo menos um contato;
- um único contato principal;
- coerência básica do status.

### Backend continua sendo fonte da verdade

Qualquer validação do frontend deve refletir o contrato de erro do backend.

## 8. UX de erro, sucesso e loading

### Loading

- loading inicial;
- loading de busca;
- loading de submissão;
- loading de detalhe, quando aplicável.

### Success

- cadastro criado;
- edição salva;
- redirecionamento para paciente preparado.

### Error

- erro de duplicidade;
- erro de validação por campo;
- erro de rede;
- erro ao carregar detalhe ou pacientes vinculados.

## 9. Ajuste do payload enviado à API

O frontend não poderá continuar enviando apenas:

- `fullName`
- `documentId`
- um único `contacts[0]`
- `administrativeNotes`
- `financialResponsible`

Ele deve passar a montar o payload do contrato novo, preservando compatibilidade com o backend implementado na Fase 02.

## 10. Coerência entre types/interfaces e contrato backend

### Arquivos prováveis

- [`apps/web/src/pages/owners.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts)
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`

### Regra

- o shape usado para renderização e submit deve bater com o contrato da API;
- se houver adaptação transitória de `owner` para `Tutor`, ela deve ser explícita e centralizada.

## 11. Busca e filtros

### Busca principal

- nome;
- documento;
- telefone;
- e-mail.

### Filtros mínimos

- status;
- origem;
- possui pacientes;
- responsável financeiro.

## 12. Arquivos candidatos a alteração

- [`apps/web/src/pages/owners.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/pages/owners.ts)
- [`apps/web/src/index.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/index.ts)
- `apps/web/src/styles.ts`

## 13. Dependências

- Fase 02 concluída ou com API estável;
- contrato compartilhado atualizado;
- erro estruturado da API disponível.

## 14. Ordem recomendada da fase

1. adaptar consumo do list;
2. reconstruir layout da listagem;
3. reconstruir formulário em blocos;
4. ligar validações e máscaras;
5. integrar create/update;
6. revisar estados de UX;
7. validar coerência com payloads e respostas reais.

## 15. Critérios de conclusão da fase

- listagem operacional com busca;
- formulário robusto;
- criação de tutor concluindo com sucesso;
- edição básica funcional;
- erros legíveis;
- payload coerente com backend;
- experiência apta para recepção antes da integração aprofundada com pacientes.
