# Onda estrutural — Console Enterprise

Data: 2026-04-22
Status: implementado
Escopo: alinhamento estrutural e aprofundamento inicial das superfícies enterprise de governança, integrações e utilidades

## 1. Objetivo

Fechar o maior gap estrutural remanescente fora do núcleo ERP operacional, consolidando o bloco `Console Enterprise` como uma camada coerente de:
- governança
- integrações
- utilidades transversais

## 2. Superfícies tratadas nesta onda

Bloco enterprise coberto:
- `access-control`
- `audit`
- `lgpd`
- `api-client`
- `api-keys`
- `master-search`

## 3. O que foi entregue

## 3.1 Breadcrumbs explícitos nas páginas

Páginas alinhadas com `AppPageHeader` explícito:
- `apps/spa/src/pages/access-control/AccessControlPage.vue`
  - `Console Enterprise > Governança > Governança de Acesso`
- `apps/spa/src/pages/audit/AuditPage.vue`
  - `Console Enterprise > Governança > Auditoria`
- `apps/spa/src/pages/lgpd/LgpdHubPage.vue`
  - `Console Enterprise > Governança > LGPD`
- `apps/spa/src/pages/api-client/ApiClientPage.vue`
  - `Console Enterprise > Integrações > Cliente API`
- `apps/spa/src/pages/api-keys/ApiKeysPage.vue`
  - `Console Enterprise > Integrações > Chaves de API`
- `apps/spa/src/pages/master-search/MasterSearchPage.vue`
  - `Console Enterprise > Utilidades > Busca Mestre`

Resultado:
- essas superfícies deixam de parecer páginas soltas ligadas ao dashboard;
- passam a comunicar melhor sua posição dentro do console enterprise.

## 3.2 Metadados de rota realinhados

Arquivo atualizado:
- `apps/spa/src/router/routes.ts`

Ajustes aplicados:
- `access-control` → `breadcrumbParent: 'Governança'`
- `audit` → `breadcrumbParent: 'Governança'`
- `lgpd` → `breadcrumbParent: 'Governança'`
- `api-client` → `breadcrumbParent: 'Integrações'`
- `api-keys` → `breadcrumbParent: 'Integrações'`
- `master-search` → `breadcrumbParent: 'Utilidades'`

Resultado:
- o shell deixa de ancorar essas rotas no `Dashboard` genérico;
- a topbar e a hierarquia passam a refletir a taxonomia do `Console Enterprise` já prevista em `navigation.ts`.

## 3.3 Leitura executiva da profundidade atual

Diferente de algumas ondas anteriores, aqui a principal entrega não foi criar páginas do zero em massa, porque várias dessas superfícies já tinham conteúdo operacional significativo.

Situação observada:
- `AccessControlPage.vue` já possui tabs, matriz, catálogo e workflow de grants;
- `AuditPage.vue` já possui timeline, filtros e leitura de risco;
- `LgpdHubPage.vue` já possui consentimento, DSR e ações operacionais;
- `ApiClientPage.vue` já possui health check, sessão, snippets e histórico;
- `ApiKeysPage.vue` já possui criação, permissões e governança de credenciais;
- `MasterSearchPage.vue` já possui busca transversal real.

Decisão correta desta onda:
- não reconstruir páginas já relativamente maduras;
- sim consolidar seu enquadramento taxonômico e a legibilidade do bloco enterprise como um conjunto coerente.

## 4. Testes

Arquivos atualizados/criados:
- `apps/spa/src/router/routes.test.ts`
- `apps/spa/src/pages/__tests__/EnterpriseSurfaces.test.ts`

Cobertura adicionada:
- verificação dos `breadcrumbParent` enterprise nas rotas;
- renderização com breadcrumbs explícitos nas superfícies enterprise principais.

## 5. Validação executada

Comando executado:

```bash
cd apps/spa
npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/__tests__/EnterpriseSurfaces.test.ts
```

Resultado:
- `Test Files 3 passed (3)`
- `Tests 21 passed (21)`

Observação:
- houve warnings não bloqueantes relacionados ao store `auth` (`pendingMfaUserId`) durante a montagem de algumas páginas em teste;
- mesmo assim, a suíte terminou verde e sem erro final de execução.

## 6. Leitura executiva do impacto

Antes desta onda:
- o núcleo ERP estava muito mais amadurecido que o console enterprise;
- as páginas enterprise existiam, mas ainda soavam pouco encaixadas na taxonomia do shell.

Depois desta onda:
- o bloco `Console Enterprise` comunica melhor suas três áreas internas:
  - Governança
  - Integrações
  - Utilidades
- o usuário percebe com mais clareza que essas páginas formam um console transversal, e não uma coleção de rotas isoladas.

## 7. O que ainda pode ser feito em ondas futuras

Evoluções naturais daqui para frente:
- testes específicos por página enterprise mais profunda;
- revisão do warning recorrente do store `auth` nos testes;
- eventual agrupamento adicional de quick actions entre superfícies enterprise;
- aprofundamento funcional pontual onde houver dependência de backend real.

## 8. Conclusão

A onda enterprise foi concluída com sucesso.

Ela não precisou “inventar” profundidade onde já havia bastante implementação; o principal ganho foi consolidar a arquitetura de informação do bloco enterprise dentro do shell Vetus-aligned.

Com isso, o projeto entra numa fase em que os grandes gaps estruturais principais do SPA já estão substancialmente reduzidos.