---
document_status: current
document_kind: security-role-matrix
effective_date: 2026-09-09
owner: Data Platform + Security
review_cycle: per migration and release candidate
---

# Database role matrix

Esta matriz é o contrato de separação entre bootstrap/migração e runtime. Ela
não concede privilégios: a fonte executável é
[`infra/postgres/init-runtime-role.sh`](../../infra/postgres/init-runtime-role.sh),
com a política compartilhada em
[`packages/db/src/runtime-role-policy.ts`](../../packages/db/src/runtime-role-policy.ts)
e a reconciliação em
[`packages/db/src/reconcile-runtime-roles.ts`](../../packages/db/src/reconcile-runtime-roles.ts).

## Papéis

| Role | Login | Uso permitido | Limites obrigatórios | Estado desta execução |
|---|---:|---|---|---|
| `cvg_api` | Sim | API HTTP, comandos autenticados e operações explicitamente atribuídas ao API | `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, `NOBYPASSRLS`; não herda papel de instalação | Política e contratos locais PASS; inspeção em ambiente-alvo NOT PROVEN |
| `cvg_worker` | Sim | Jobs duráveis, consumidores e tarefas explicitamente atribuídas ao worker | mesmas restrições; sem DML de autenticação sensível, sem `cvg_installer`, sem bypass de RLS | Política e contratos locais PASS; execução real sob credencial dedicada NOT PROVEN |
| `cvg_runtime` | Sim | Compatibilidade controlada com instalações legadas e rollback | nunca deve ser usado como credencial compartilhada de API e worker; mesmas flags restritivas | Provisionado para compatibilidade; uso efetivo em produção NOT PROVEN |
| `cvg_installer` | Não | Capacidade estreita para instalação/reconciliação, concedida ao API somente com `SET` explícito | `NOLOGIN`, `NOINHERIT`, sem credencial de serviço; não é runtime comum | Contrato estático e reconciliação cobertos; execução de migração alvo NOT PROVEN |
| `cvg_api_key_auth` | Não | Funções mínimas de resolução de API key | `NOLOGIN`, `NOINHERIT`, `NOBYPASSRLS`, sem memberships; sem leitura ampla | Contrato ACL e funções coberto; probe alvo NOT PROVEN |
| `cvg_pix_dlq_operator` | Não | Operação limitada do DLQ PIX, com identidade e auditoria | sem login interativo; somente tabelas/funções explicitamente concedidas | Contrato de ACL coberto; entrega de operação humana NOT PROVEN |
| `cvg_test_rls` | Não | Testes automatizados de isolamento em banco descartável | nunca usar em staging/produção; credencial não é evidência de runtime comum | Testes de RLS locais/CI; não é papel produtivo |
| `postgres`/admin | Conforme ambiente | Criação de banco, roles e aplicação de migrations | fora do processo API/worker; acesso deve ser protegido e temporário | Necessário para bootstrap; controles do ambiente alvo NOT PROVEN |

## Boundary de privilégios

- Ambos os logins de runtime só recebem DML amplo em tabelas com RLS durante a
  reconciliação; depois são aplicadas revogações específicas para tabelas de
  governança, auditoria, ingressos append-only e autenticação.
- O worker pode consultar o mapeamento de principal e atributos não secretos
  necessários ao job. Não pode ler `password_hash`, alterar sessões/MFA ou
  administrar RBAC.
- Eventos de workflow clínico são imutáveis para runtime; correção ou replay
  produz novo evento e não `UPDATE`/`DELETE` destrutivo do histórico.
- `NOBYPASSRLS`, `NOINHERIT` e ausência de memberships privilegiadas são
  invariantes. `PUBLIC` não recebe `EXECUTE` nas funções sensíveis.
- A API pode receber a capacidade `cvg_installer` somente através de operação
  explícita e auditada. A capacidade não vira herança permanente.

## Evidência executável

| Evidência | O que prova | Resultado atual |
|---|---|---|
| `tests/unit/infra/runtime-role-grants.test.ts` | Reexecução idempotente das revogações e separação API/worker | PASS local |
| `tests/integration/rls/runtime-role-sensitive-acl.test.ts` | ACL sensível, memberships, funções e flags de role em PostgreSQL | PASS quando executado em banco disponível; SHA remoto atual ainda deve ser anexado |
| `tests/integration/process/worker-runtime-entrypoint.test.ts` | Entrypoint real do worker com role dedicada e readiness | PASS quando executado com PostgreSQL; evidência do candidato atual NOT PROVEN |
| `packages/shared/database/src/client.ts` | Guard de startup que rejeita role insegura | PASS local |
| `infra/postgres/init-runtime-role.sh` | Provisionamento/reconciliação canônica | PASS estático |

O CI atual ainda inicializa alguns serviços de teste com `postgres` para criar
o banco e aplicar migrations. Isso é uma conveniência de bootstrap, não prova
que API e worker operam com credenciais dedicadas. A certificação externa deve
anexar, para o SHA exato, as consultas `current_user`, flags de role, ACLs,
RLS e um smoke do worker sob `cvg_worker`; sem isso o critério permanece
`NOT PROVEN`.

## Comandos de verificação alvo

Em banco descartável e autorizado, coletar sem exportar senhas:

```sql
SELECT rolname, rolcanlogin, rolsuper, rolinherit, rolbypassrls,
       rolcreatedb, rolcreaterole, rolreplication
  FROM pg_roles
 WHERE rolname IN ('cvg_api', 'cvg_worker', 'cvg_runtime', 'cvg_installer');

SELECT current_user, session_user;
SELECT has_table_privilege(current_user, 'public.clinical_workflow_tasks', 'SELECT');
SELECT has_table_privilege(current_user, 'public.clinical_workflow_task_events', 'DELETE');
```

O segundo `has_table_privilege` deve ser `false` para runtime. O resultado
precisa ser guardado em um envelope assinado/vinculado ao SHA; uma captura
manual sem identidade do banco não fecha o gate.
