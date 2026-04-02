# Módulo Tutores — Backend

## 1. Objetivo

Estruturar o backend do módulo Tutores para suportar cadastro robusto, busca operacional, controle de duplicidade, integração com pacientes e rastreabilidade mínima, preservando compatibilidade temporária com o namespace técnico atual `owners`.

## 2. Situação atual observada

Hoje o backend expõe:

- `GET /owners`
- `POST /owners`
- `GET /owners/:id`
- `PATCH /owners/:id`

Também existem:

- `GET /patients`
- `POST /patients`
- `GET /patients/:id`
- `PATCH /patients/:id`
- `GET /owner-patient-links`
- `POST /owner-patient-links`

O estado atual é suficiente para CRUD básico, mas insuficiente para módulo enterprise.

## 3. Objetivos específicos do backend

- consolidar contrato estável de tutor;
- ampliar busca por múltiplas chaves;
- suportar paginação e filtros consistentes;
- aplicar validação server-side forte;
- reduzir duplicidade;
- expor dados consumíveis pelo frontend sem ambiguidade;
- integrar detalhe do tutor com pacientes vinculados;
- registrar auditoria mínima.

## 4. Rotas necessárias

### 4.1 Rotas principais do módulo

- `GET /owners`
- `POST /owners`
- `GET /owners/:id`
- `PATCH /owners/:id`

### 4.2 Rotas adicionais recomendadas

- `GET /owners/:id/patients`
- `POST /owners/:id/patients/quick-create`
- `GET /owners/search/suggestions`

Se houver oportunidade de limpeza futura, avaliar alias:

- `GET /tutors`
- `POST /tutors`

Mas esta mudança não deve ser requisito para a fase inicial.

## 5. Operações esperadas

### 5.1 Create

Deve:

- validar obrigatórios;
- normalizar documento, telefone, e-mail e CEP;
- validar `contacts`;
- definir `origin`, `status` e campos de auditoria;
- verificar duplicidade por documento e por contato forte;
- salvar tutor;
- responder com entidade criada.

### 5.2 List

Deve:

- aceitar paginação;
- aceitar busca livre e filtros estruturados;
- retornar envelope estável;
- permitir ordenação previsível;
- evitar carregar payload desnecessário.

### 5.3 Detail

Deve retornar:

- entidade do tutor;
- contatos;
- endereço;
- status e origem;
- pacientes vinculados resumidos;
- contagem de vínculos;
- metadados mínimos de auditoria.

### 5.4 Update

Deve:

- aceitar patch parcial;
- recalcular consistência de contatos;
- validar transição de status;
- bloquear alterações inválidas;
- registrar auditoria de atualização.

## 6. Busca por nome, documento, telefone e e-mail

### 6.1 Campos de busca obrigatórios

- nome completo;
- documento normalizado;
- telefone normalizado;
- e-mail normalizado.

### 6.2 Comportamento recomendado

- busca livre `q` continua existindo;
- backend deriva a busca em múltiplos índices;
- documento e telefone devem ignorar formatação;
- e-mail deve ser comparado em lowercase;
- nome deve aceitar busca parcial.

### 6.3 Sugestão de parâmetros

- `q`
- `status`
- `origin`
- `page`
- `pageSize`
- `sortBy`
- `sortOrder`

## 7. Paginação e filtros

### 7.1 Paginação

Contrato recomendado:

- `page` padrão `1`
- `pageSize` padrão `20`
- `pageSize` máximo `100`

### 7.2 Filtros

- `status`
- `origin`
- `hasPatients`
- `financialResponsible`
- `updatedFrom`
- `updatedTo`

## 8. Validações server-side

Backend deve ser fonte da verdade para:

- nome não vazio;
- documento consistente com tipo;
- no mínimo um contato válido no cadastro regular;
- máximo de um contato principal;
- formato mínimo de e-mail;
- telefone normalizado;
- CEP normalizado;
- status válido;
- origem válida;
- bloqueio de atualização inconsistente.

## 9. Proteção contra duplicidade

### 9.1 Regras mínimas

- bloquear duplicidade exata por documento normalizado dentro da mesma conta;
- sinalizar potencial duplicidade por telefone/e-mail principal;
- permitir override controlado apenas se houver decisão explícita de produto no futuro;
- registrar evento de tentativa de duplicidade relevante.

### 9.2 Estratégia

- índice por `accountId + documentNormalized`;
- busca auxiliar por `emailNormalized`;
- busca auxiliar por contato telefônico normalizado.

## 10. Regras de erro

Erros devem ser previsíveis, estruturados e amigáveis ao frontend.

### 10.1 Casos esperados

- `400` payload inválido;
- `404` tutor não encontrado;
- `409` duplicidade detectada;
- `422` regra de negócio violada;
- `403` permissão insuficiente.

### 10.2 Estrutura recomendada

```json
{
  "code": "OWNER_DUPLICATE_DOCUMENT",
  "message": "Já existe tutor com este documento.",
  "details": {
    "field": "document.number"
  }
}
```

## 11. Estrutura sugerida

### 11.1 Controller

Responsável por:

- parsing de request;
- autenticação/autorização;
- validação superficial de formato;
- serialização da resposta.

### 11.2 Service

Responsável por:

- normalização;
- regras de negócio;
- proteção contra duplicidade;
- transições de status;
- integração com pacientes;
- decisão de auditoria.

### 11.3 Repository

Responsável por:

- persistência;
- paginação;
- filtros;
- índices de busca;
- montagem de joins/sumários necessários.

### 11.4 Schema/validation

Responsável por:

- contratos de entrada;
- contratos de resposta;
- coerência tipada entre API e frontend.

## 12. Impacto em banco e migrations

### 12.1 Estado atual

Tabela `owners` atual contém:

- `documentType`
- `documentNumber`
- `name`
- `email`
- `phone`
- `address`
- `status`

### 12.2 Evolução recomendada

Avaliar inclusão de:

- `full_name` ou migração controlada de `name`;
- `display_name`;
- `origin`;
- `financial_responsible`;
- `preferred_contact_method`;
- `preferred_contact_window`;
- `administrative_notes`;
- `inactive_reason`;
- `last_verified_at`;
- `created_by_user_id`;
- `updated_by_user_id`;
- `version`;
- `contacts` em `jsonb` no primeiro corte, se não houver tabela própria.

### 12.3 Alternativa evolutiva

Se a equipe preferir granularidade maior, criar:

- `owner_contacts`
- `owner_addresses`

Para o primeiro corte enterprise, `jsonb` para contatos e endereço é aceitável se o contrato for estável.

## 13. Auditoria

Além do `appendAudit` já existente, o módulo deve registrar:

- criação de tutor;
- leitura de detalhe;
- atualização;
- inativação;
- tentativa de duplicidade relevante;
- criação rápida de paciente a partir do tutor;
- criação de vínculo tutor-paciente.

## 14. Estratégia de resposta da API

### 14.1 List

Retornar envelope estável com paginação.

### 14.2 Detail

Retornar objeto expandido.

### 14.3 Create/Update

Retornar entidade consolidada pós-normalização.

## 15. Contratos necessários para frontend

Frontend depende de:

- tipo estável de `TutorListItem`;
- tipo estável de `TutorDetail`;
- erro estruturado por campo;
- enumerações de `status`, `origin`, `preferredContactMethod`;
- pacientes vinculados resumidos;
- confirmação do `id` criado para fluxo rápido de paciente.

## 16. Pontos de atenção para produção

- não publicar implementação que aceite dados no frontend mas descarte no backend;
- não manter busca apenas por `q` sem normalização real;
- não tratar auditoria como opcional;
- não permitir pacientes operacionais sem tutor válido, salvo regras excepcionais explícitas;
- não expor resposta inconsistente entre listagem e detalhe.
