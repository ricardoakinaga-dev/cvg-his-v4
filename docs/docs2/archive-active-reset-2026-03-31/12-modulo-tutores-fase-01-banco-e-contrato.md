# Módulo Tutores — Fase 01 — Banco e Contrato

## 1. Objetivo

Fechar a base estrutural do módulo Tutores antes da implementação de API e frontend. Esta fase deve produzir um contrato estável para a entidade Tutor e alinhá-lo ao schema atual de `owners`.

## 2. Revisão do schema atual de owners

O schema atual em [`packages/shared/database/src/schemas/index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts) contém:

- `id`
- `accountId`
- `documentType`
- `documentNumber`
- `name`
- `email`
- `phone`
- `address` em `jsonb`
- `status`
- `createdAt`
- `updatedAt`

Limitações atuais:

- não há `contacts` estruturados;
- não há `origin`;
- não há `financialResponsible`;
- não há `administrativeNotes`;
- não há auditoria de `createdByUserId` / `updatedByUserId`;
- não há campo para `primaryContactId`;
- documento ainda está dividido em colunas simples sem estrutura expandida;
- não há `inactiveReason`, `preferredContactMethod`, `version`.

## 3. Evolução necessária da entidade Tutor

### Criação

Campos novos obrigatórios ou fortemente recomendados:

- `fullName` como nome semântico principal;
- `contacts` em estrutura repetível;
- `origin`;
- `financialResponsible`;
- `preferredContactMethod`;
- `administrativeNotes`;
- `createdByUserId`;
- `updatedByUserId`;
- `version`.

### Expansão do contrato

Campos adicionais:

- `displayName`;
- `preferredContactWindow`;
- `inactiveReason`;
- `lastVerifiedAt`;
- `primaryContactId`.

### Hardening

Campos de normalização e concorrência:

- `document.normalizedNumber`;
- `contacts[].normalizedValue`;
- `version`.

## 4. Campos a manter por retrocompatibilidade

Enquanto a implementação não migrar todo o ecossistema:

- manter tabela `owners`;
- manter coluna `name` enquanto `fullName` não for internalizado por camada de transformação;
- manter `documentType` e `documentNumber`;
- manter `email` e `phone` raiz como espelhos transitórios do contato principal;
- manter `address` em `jsonb`.

Essa retrocompatibilidade é necessária porque vários pontos do sistema ainda usam `ownerId` e modelos simples.

## 5. Campos que precisam ser quebrados em estrutura melhor

### Documento

Hoje:

- `documentType`
- `documentNumber`

Evolução:

- manter persistência compatível, mas expor `document` estruturado no contrato.

### Contatos

Hoje:

- `phone`
- `email`

Evolução:

- introduzir `contacts` estruturado;
- manter `phone`/`email` como projeções transitórias do principal.

### Endereço

Hoje:

- `address` já é `jsonb`, mas sem contrato documental garantido.

Evolução:

- formalizar shape de endereço;
- manter `jsonb` nesta fase;
- evitar tabela separada até haver necessidade real.

## 6. Mudanças esperadas no schema do banco

### Arquivo candidato

- [`packages/shared/database/src/schemas/index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/schemas/index.ts)

### Alterações esperadas

- expansão da tabela `owners` com colunas novas;
- possível adição de `contacts` em `jsonb`;
- possível inclusão de `origin`, `financialResponsible`, `preferredContactMethod`, `administrativeNotes`, `inactiveReason`, `lastVerifiedAt`, `createdByUserId`, `updatedByUserId`, `version`;
- índices adicionais para busca e duplicidade, principalmente documento normalizado.

## 7. Impacto em migrations

### Tipo de alteração

- expansão incremental;
- não destrutiva;
- compatível com dados já existentes.

### Arquivos candidatos

- `packages/shared/database/src/migrations/*`

### Regras

- não remover colunas antigas na primeira migration;
- preencher defaults seguros para registros existentes;
- documentar retrocompatibilidade;
- garantir que o bootstrap/persistência atual continue lendo registros antigos.

## 8. Impacto nos tipos compartilhados

### Arquivos candidatos

- [`packages/shared/contracts/src/index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/contracts/src/index.ts)
- [`packages/shared/types/src/index.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/types/src/index.ts)

### Alterações esperadas

- criar ou expandir tipos de `TutorCreateInput`, `TutorUpdateInput`, `TutorListItem`, `TutorDetail`;
- manter alias transitórios para `owner`;
- refletir contatos, documento, endereço, status e origem;
- garantir que `patient.ownerId` continue tipado enquanto a semântica do contrato evolui.

## 9. Impacto em payload create/update/detail/list

### Create

Deve aceitar shape amigável para UI e converter para persistência.

### Update

Deve permitir patch parcial sem quebrar consistência.

### Detail

Deve suportar dados expandido do tutor e pacientes vinculados.

### List

Deve ser padronizado em envelope paginado.

## 10. Ordem recomendada das mudanças

1. revisar e congelar o contrato dos campos;
2. decidir estratégia de `contacts` em `jsonb`;
3. atualizar tipos compartilhados;
4. expandir schema;
5. criar migration incremental;
6. validar compatibilidade com dados atuais;
7. liberar Fase 02.

## 11. Pré-requisitos

- documentos 01 a 11 aprovados;
- decisão explícita de manter `owners` como naming técnico transitório;
- confirmação de que a camada atual suporta migration incremental.

## 12. Dependências

- nenhum código de frontend deve ser refeito antes deste contrato ficar estável;
- backend da Fase 02 depende deste shape.

## 13. Riscos de migração

- colunas novas sem defaults quebrarem registros existentes;
- `contacts` virar `jsonb` sem validação consistente;
- `email` e `phone` raiz ficarem divergentes de `contacts`;
- listagens antigas continuarem usando `name` enquanto o novo contrato assume `fullName`;
- índices de busca não cobrirem os novos campos normalizados.

## 14. Critérios para fechar esta fase

- schema alvo definido;
- migrations planejadas e aplicáveis;
- contratos compartilhados atualizados;
- campos transitórios documentados;
- estratégia de normalização e retrocompatibilidade explicitada;
- nenhuma lacuna crítica entre banco e payloads esperados.
