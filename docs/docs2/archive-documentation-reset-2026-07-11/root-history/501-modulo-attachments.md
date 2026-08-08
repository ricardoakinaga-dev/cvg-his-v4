# 501 — Módulo Attachments

## Objetivo

Gerenciar uploads de anexos clínicos vinculados a entidades do sistema (encounters, medical records, diagnostic orders), com validação de integridade via checksum SHA-256 e suporte a armazenamento em disco ou em memória.

## Superfície funcional real

- `upload(actorUserId, payload, fileContent?)` — cria um anexo vinculado a uma entidade. Valida a existência da entidade alvo via serviços dependentes. Suporta 3 modos de armazenamento:
  1. Com `fileStorage` injetado: armazena via `FileStorage.store()`, computa checksum real, valida contra checksum declarado.
  2. Sem `fileStorage` mas com `fileContent`: armazena com chave `local/{accountId}/{linkedEntityId}/{fileName}`, computa checksum real.
  3. Sem `fileContent`: armazena com chave `pending/{linkedEntityId}/{fileName}`, usa checksum declarado.
- `getById(id)` — busca por ID (repositório primeiro, fallback in-memory).
- `getFileContent(storageKey)` — recupera conteúdo do arquivo via `FileStorage.retrieve()`.
- `listByLinkedEntity(linkedEntityType, linkedEntityId)` — lista anexos por entidade vinculada.
- Tipos de entidade suportados: `encounter`, `medical_record`, `diagnostic_order`. Qualquer outro tipo lança `NotFoundError`.
- Categorias de anexo: definidas pelo contrato `CreateAttachmentRequest` (não validadas por enum no serviço).
- Exporta `DatabaseAttachmentRepository` (Drizzle ORM) e `LocalFileStorage` / `createMemoryFileStorage`.

## Principais dependências

- `@cvg-his-v2/module-encounters` — `EncountersService` (validação de existência)
- `@cvg-his-v2/module-medical-records` — `MedicalRecordsService` (validação de existência)
- `@cvg-his-v2/module-diagnostics` — `DiagnosticsService` (validação de existência)
- `@cvg-his-v2/shared-errors` — `NotFoundError`, `ValidationError`
- `@cvg-his-v2/shared-database` — Drizzle ORM (repositório)
- `node:crypto` — `createHash` para checksum SHA-256

## Regras de negócio relevantes

- O anexo só é criado se a entidade alvo existir (validação via `getOrThrow` / `getRecordOrThrowAsync`).
- O `accountId` do anexo é herdado da entidade alvo, não do actor.
- Checksum declarado no payload deve coincidir com o checksum computado do conteúdo real — mismatch lança `ValidationError` e deleta o arquivo armazenado.
- Sem `fileContent`, o anexo é registrado com status "pending" (chave `pending/...`).
- Não há método de delete de anexo no serviço (apenas no repositório).
- Não há método de update de anexo.

## Riscos atuais

- **Silent failure no repositório**: `repository.create()` é chamado com `await` mas sem try/catch — se o repositório falhar, o anexo já foi adicionado ao array in-memory, criando inconsistência.
- **Sem paginação**: `listByLinkedEntity` retorna todos os anexos de uma entidade sem limite.
- **Sem validação de categoria**: A categoria não é validada contra enum no serviço, depende do contrato externo.
- **Sem delete via serviço**: O repositório tem `deleteById` mas o serviço não expõe essa operação.
- **Armazenamento local sem controle de quota**: `LocalFileStorage` grava em disco sem limites de tamanho ou limpeza.
- **`as never` casts**: O código usa `as never` para contornar tipagem ao chamar `getOrThrow` dos serviços dependentes, indicando acoplamento frágil.

## Situação de persistência

- **Padrão**: Array in-memory `#attachments: AttachmentSummary[]`.
- **Repositório**: `DatabaseAttachmentRepository` usa Drizzle ORM com tabela `attachments`. Suporta `create`, `findById`, `findByLinkedEntity`, `deleteById`.
- **File storage**: Interface `FileStorage` com implementação `LocalFileStorage` (filesystem) e `createMemoryFileStorage` (Map in-memory).
- O serviço tenta persistir via repositório se injetado, mas o array in-memory é a fonte primária de leitura quando o repositório não está presente.

## Situação de testes

- Arquivo: `packages/modules/attachments/src/attachments.test.ts`
- 6 testes cobrindo: upload vinculado a medical record, upload vinculado a diagnostic order, rejeição de tipo inválido, filtragem por entidade, checksum real com conteúdo de arquivo, rejeição de checksum mismatch.
- Testes usam mocks inline dos serviços dependentes (encounters, medicalRecords, diagnostics).
- Nenhum teste cobre o repositório de banco de dados.
- Nenhum teste cobre `getFileContent`.
- Nenhum teste cobre `LocalFileStorage`.

## Gaps para nível enterprise

1. Adicionar método de delete de anexo no serviço (com limpeza do storage).
2. Adicionar paginação em `listByLinkedEntity`.
3. Validar categorias contra enum explícito.
4. Tratar falhas de repositório com rollback do array in-memory.
5. Adicionar suporte a S3/object storage além de filesystem local.
6. Adicionar scan de vírus/malware em uploads.
7. Adicionar controle de quota por account.
8. Adicionar método de update de metadados de anexo.
9. Adicionar testes para `getFileContent`, `LocalFileStorage`, e repositório DB.
10. Resolver os `as never` casts com tipagem adequada.
