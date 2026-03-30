# Módulo Tutores — Fase 02 — Backend API

## 1. Objetivo

Transformar o backend atual de `owners` em uma API de Tutores apta para suportar operação hospitalar real, mantendo compatibilidade com os consumidores existentes enquanto estabiliza o novo contrato.

## 2. Revisão das rotas atuais relacionadas a owners

Hoje existem em [`apps/api/src/server.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts):

- `GET /owners`
- `POST /owners`
- `GET /owners/:id`
- `PATCH /owners/:id`
- `GET /owner-patient-links`
- `POST /owner-patient-links`

Essas rotas hoje:

- atendem CRUD básico;
- usam `appendAudit`;
- não implementam paginação robusta;
- não expõem detalhe expandido com pacientes vinculados;
- não têm erro estruturado forte;
- não protegem duplicidade de forma enterprise;
- não contemplam contrato rico de contatos.

## 3. Ajustes necessários em server.ts

### Tipo de alteração

- expansão de contrato;
- refatoração incremental;
- hardening de rotas existentes.

### Ajustes esperados

- ampliar parsing de query params;
- normalizar payloads de entrada;
- padronizar envelopes de resposta;
- incluir listagem paginada;
- ampliar `GET /owners/:id` para devolver pacientes vinculados;
- reforçar `POST /owners` e `PATCH /owners/:id`;
- padronizar erros;
- integrar melhor com `owner-patient-links`.

## 4. Possíveis extrações/refatorações necessárias

Se `server.ts` ficar excessivamente inchado, extrair sem inventar arquitetura paralela:

- validador/normalizador de tutor;
- serializador de resposta de tutor;
- helper de duplicidade;
- helper de busca e paginação.

Essas extrações devem ser mínimas e orientadas a manter legibilidade, não a reescrever o backend inteiro.

## 5. Endpoints que precisam existir ao final

### Obrigatórios

- `GET /owners`
- `POST /owners`
- `GET /owners/:id`
- `PATCH /owners/:id`

### Recomendados para fechamento funcional

- `GET /owners/:id/patients` ou detalhe expandido já contendo vínculos;
- `GET /owner-patient-links?ownerId=...`
- `POST /owner-patient-links`

### Opcionais se o worker conseguir sem ampliar risco

- `POST /owners/:id/patients/quick-create`
- `GET /owners/search/suggestions`

## 6. Contratos de entrada e saída

### Entrada create

Deve aceitar:

- nome completo;
- documento estruturado;
- contatos estruturados;
- endereço estruturado;
- status;
- origem;
- observações administrativas;
- dados de responsável financeiro.

### Entrada update

Deve aceitar patch parcial e revalidar consistência final.

### Saída list

Deve retornar:

- `items`;
- `page`;
- `pageSize`;
- `totalItems`;
- `totalPages`.

### Saída detail

Deve retornar:

- dados completos do tutor;
- contatos;
- endereço;
- status;
- origem;
- pacientes vinculados resumidos;
- metadados de auditoria mínima.

## 7. Regras de busca

### Critérios obrigatórios

- nome parcial;
- documento normalizado;
- telefone normalizado;
- e-mail normalizado.

### Implementação

- manter `q` como busca principal;
- adicionar filtros estruturados;
- não depender de busca só em `name`/`documentNumber`;
- não exigir que o frontend saiba qual campo consultar.

## 8. Paginação e filtros

### Query params

- `q`
- `page`
- `pageSize`
- `status`
- `origin`
- `financialResponsible`
- `hasPatients`
- `sortBy`
- `sortOrder`

### Regras

- valores inválidos devem ser tratados ou rejeitados;
- paginação deve ser determinística;
- frontend deve poder confiar no envelope.

## 9. Validações server-side

### Obrigatórias

- nome não vazio;
- contatos consistentes;
- documento válido quando exigido;
- e-mail com formato mínimo;
- status permitido;
- origem permitida;
- no máximo um contato principal;
- `primaryContactId` coerente;
- inativação com motivo.

## 10. Proteção contra duplicidade

### Regras mínimas

- bloquear documento já existente na mesma conta;
- sinalizar duplicidade potencial por telefone ou e-mail principal;
- auditar tentativa relevante.

### Arquivos candidatos

- [`apps/api/src/server.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts)
- [`apps/api/src/bootstrap.ts`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/bootstrap.ts)

Se a persistência em bootstrap já tiver busca por owner/link, reaproveitar a base ao invés de duplicar lógica.

## 11. Regras de erro padronizadas

### Necessidade

Hoje o frontend tem mensagens genéricas. O backend precisa fornecer estrutura suficiente para UX amigável.

### Shape mínimo

- `code`
- `message`
- `details`

### Casos obrigatórios

- tutor não encontrado;
- payload inválido;
- duplicidade de documento;
- conflito de contato principal;
- status inválido;
- permissão insuficiente.

## 12. Integração com owner-patient-links

### Expectativa mínima

- detalhe do tutor deve refletir pacientes vinculados;
- backend deve reutilizar `owner-patient-links` existente;
- vínculo principal deve continuar compatível com `patients.ownerId`;
- não criar modelo paralelo redundante.

## 13. Logs e auditoria mínima

Continuar usando `appendAudit` e ampliar cobertura para:

- criação;
- leitura crítica de detalhe;
- edição;
- tentativa de duplicidade;
- criação de vínculo tutor-paciente;
- fluxo rápido de criação de paciente, se implementado.

## 14. Ordem recomendada da fase

1. revisar contratos compartilhados;
2. ajustar create/update;
3. ajustar listagem com paginação e filtros;
4. ajustar detalhe expandido;
5. integrar vínculos com pacientes;
6. padronizar erros;
7. revisar auditoria;
8. revisar compatibilidade com consumidores atuais.

## 15. Pré-requisitos

- Fase 01 concluída;
- migrations estáveis ou schema local equivalente;
- tipo do Tutor definido.

## 16. Critérios de conclusão da fase

- `GET /owners` funcional com busca e paginação;
- `POST /owners` validando e normalizando;
- `GET /owners/:id` retornando detalhe útil;
- `PATCH /owners/:id` preservando consistência;
- erros padronizados;
- auditoria mínima presente;
- integração básica com pacientes exposta.

## 17. Riscos caso backend e frontend fiquem desalinhados

- frontend salvar campos que o backend descarta;
- listagem quebrar por mudança de envelope;
- detalhe do tutor aparecer incompleto;
- fluxo de adicionar paciente continuar dependendo de id manual;
- mensagens de erro ficarem genéricas e improdutivas;
- módulo parecer “pronto” tecnicamente, mas continuar inviável para recepção.
