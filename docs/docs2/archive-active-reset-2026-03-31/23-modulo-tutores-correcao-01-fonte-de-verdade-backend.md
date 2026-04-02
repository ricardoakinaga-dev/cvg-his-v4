# Modulo Tutores — Correcao 01 — Fonte de Verdade Backend

## 1. Objetivo

Corrigir o problema arquitetural mais grave do modulo Tutores: o backend de `owners` ainda usa estado principal em memoria no `OwnersService`, em vez de usar persistencia como fonte real de verdade.

## 2. Problema atual do OwnersService em memoria

Hoje, o modulo `owners`:

- inicializa um `Map` interno em memoria;
- usa esse `Map` como base principal para `list`, `getOrThrow`, `create` e `update`;
- chama o repositorio de banco apenas como persistencia secundaria;
- nao hidrata o estado a partir do banco;
- nao faz leitura operacional real do que foi persistido.

Na pratica, o banco foi evoluido, mas o runtime principal do modulo nao depende dele como deveria.

## 3. Impacto disso na sincronizacao fullstack

Impactos diretos:

- o backend pode divergir do banco em restart ou ambiente real;
- o frontend pode enxergar dados que so existem na memoria do processo atual;
- a migration e o schema deixam de ser fonte confiavel de operacao;
- o contrato documental de sincronizacao banco/backend/frontend fica quebrado;
- staging real perde confiabilidade.

## 4. Alternativas de correcao compativeis com a arquitetura real

### Alternativa A

Fazer `OwnersService` operar prioritariamente sobre `OwnerRepository`.

Caracteristicas:

- melhor aderencia ao modelo atual do projeto;
- menor retrabalho arquitetural;
- preserva o modulo `owners` existente;
- exige refatoracao localizada.

### Alternativa B

Manter o `Map`, mas hidrata-lo do banco e sincroniza-lo sempre.

Caracteristicas:

- menor impacto imediato;
- mas continua deixando memoria como centro de controle;
- e inferior do ponto de vista de arquitetura e auditoria.

### Alternativa C

Criar novo servico paralelo so para banco.

Caracteristicas:

- nao recomendada;
- reabre arquitetura;
- adiciona acoplamento e dualidade desnecessaria.

## 5. Estrategia preferencial

Adotar a Alternativa A.

### Diretriz

`OwnerRepository` deve ser a fonte primaria de leitura/escrita quando estiver disponivel. O `Map` em memoria so pode permanecer como fallback de ambiente sem persistencia.

### Comportamento esperado

- se existir repositrio configurado, `list` e `get` devem consultar o repositrio;
- `create` e `update` devem persistir e retornar a versao consistente resultante;
- em fallback sem banco, o `Map` pode continuar existindo;
- o comportamento deve continuar compativel com a estrategia atual de in-memory fallback do projeto.

## 6. Arquivos reais provaveis a alterar

- [packages/modules/owners/src/index.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/index.ts)
- [packages/modules/owners/src/repositories/database-owner.repository.ts](/root/.openclaw/workspace/cvg-his-v2/packages/modules/owners/src/repositories/database-owner.repository.ts)
- [apps/api/src/runtime.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.ts)
- [apps/api/src/bootstrap.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/bootstrap.ts)
- eventualmente testes relacionados em [apps/api/src/runtime.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/runtime.test.ts) e [apps/api/src/db-persistence.test.ts](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/db-persistence.test.ts)

## 7. Cuidados de refatoracao minima

- nao reescrever o modulo `owners` inteiro;
- nao criar nova camada paralela de servico;
- preservar fallback em memoria quando banco nao estiver configurado;
- evitar quebrar os demais modulos que dependem de `ownerId`;
- manter o contrato externo de `owners` estavel durante a correcao.

## 8. Ordem recomendada da correcao

1. revisar a interface atual de `OwnerRepository`;
2. garantir que ela suporte listagem e leitura completas do contrato atual;
3. adaptar `OwnersService` para usar o repositorio como fonte primaria quando presente;
4. deixar memoria apenas como fallback;
5. revisar bootstrap/runtime para garantir que o repositorio esta sendo injetado corretamente;
6. validar create/list/detail/update em ambiente com persistencia e sem persistencia.

## 9. Criterios objetivos para considerar o backend alinhado ao banco

- `list` nao depende mais do `Map` quando ha repositorio;
- `get`/`detail` nao depende mais do `Map` quando ha repositorio;
- `create` e `update` persistem e refletem a leitura seguinte a partir da persistencia;
- restart de runtime nao perde os dados do modulo em ambiente persistente;
- a estrategia de fallback em memoria fica explicita e restrita a ambiente sem banco;
- a auditoria deixa de apontar divergencia entre persistencia e runtime.
