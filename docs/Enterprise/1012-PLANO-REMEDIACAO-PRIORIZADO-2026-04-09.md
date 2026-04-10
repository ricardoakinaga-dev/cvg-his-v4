# PLANO DE REMEDIACAO PRIORIZADO — CVG-HIS-V2

**Data:** 09/04/2026
**Base:** [`1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md`](./1011-RELATORIO-AUDITORIA-CODEX-2026-04-09.md)
**Objetivo:** levar o projeto de “bom com drift” para “auditavel de verdade”

---

## 1. Principios do Plano

- corrigir primeiro o que impede confiar no estado do programa;
- restaurar verdade executavel antes de expandir escopo;
- atacar multi-tenancy e contratos publicos antes de melhorias cosmeticas;
- separar claramente correcoes de produto, infraestrutura e documentacao;
- toda afirmacao executiva deve voltar a ter evidencia por comando executado.

---

## 2. Priorizacao por Faixa

## P0 — Bloqueantes de Confianca

Itens que impedem afirmar que o sistema esta verde, auditavel ou pronto para evolucao segura.

1. Corrigir `module-ml` para restaurar `pnpm typecheck` e `pnpm build`.
2. Corrigir borda multi-tenant da API e propagacao de `accountId`.
3. Remover hardcode de `accountId` da persistencia de patients/owner links.
4. Fazer `/openapi.json` e `/openapi.yaml` servirem a spec real.
5. Normalizar setup de banco de testes e tornar falha de DB explicitamente bloqueante quando a suite depender dele.

## P1 — Bloqueantes de Integridade de Dominio

Itens que comprometem fluxo funcional central ou seguranca operacional.

1. Corrigir falhas reais da suite foundational.
2. Revisar fluxo scheduling -> queue -> encounter.
3. Revisar inconsistencias de auth seed e storage keys.
4. Consolidar uma unica estrategia de acesso ao banco.

## P2 — Endurecimento Operacional

Itens que elevam o projeto ao patamar enterprise sustentavel.

1. endurecer coverage e gates;
2. reduzir fallback silencioso para in-memory em contextos criticos;
3. limpar artefatos gerados commitados;
4. alinhar documentacao executiva com evidencias automaticas;
5. evoluir event bus de outbox local para integracao real.

## P3 — Excelencia e Escalabilidade

1. maturar ML somente apos P0/P1;
2. ampliar observabilidade e runbooks;
3. fortalecer LGPD e RLS com evidencias de ponta a ponta;
4. expandir automacao de release readiness.

---

## 3. Ordem Exata de Correcao

## Etapa 1 — Restaurar Verdade Executavel

### Objetivo

Fazer `pnpm typecheck` e `pnpm build` voltarem a ser sinal confiavel.

### Tarefas

1. Corrigir imports e tipos de `packages/modules/ml`.
2. Ajustar contrato de `createVector` para incluir `values` ou alinhar interface e implementacao.
3. Corrigir queries Drizzle quebradas no repositório de modelos.
4. Reexecutar:
   - `pnpm typecheck`
   - `pnpm build`

### Critério de saida

- `pnpm typecheck` = PASS
- `pnpm build` = PASS

### Esforco estimado

- **Severidade:** critica
- **Esforco:** medio
- **Dependencia:** nenhuma

---

## Etapa 2 — Fechar Multi-Tenancy na Borda

### Objetivo

Garantir que o contexto de tenant/account seja real, nao placeholder.

### Tarefas

1. Trocar a injecao de `accountId: 'pending'` na API por resolucao real do principal ou dos headers.
2. Integrar o middleware de tenant/context ao runtime HTTP real.
3. Fazer a SPA enviar `x-account-id` e `x-tenant-id` quando aplicavel, ou embutir isso de forma derivada do principal autenticado.
4. Revisar repositories que dependem de `requireAccountId()`.

### Critério de saida

- nenhum request autenticado opera com `accountId = 'pending'`;
- suites de tenant-context e RLS passam com contexto real;
- traces e logs mostram account/tenant corretos.

### Esforco estimado

- **Severidade:** critica
- **Esforco:** medio-alto

---

## Etapa 3 — Corrigir Persistencia com Drift de Tenant

### Objetivo

Eliminar hardcodes ou atalhos anti-multi-tenant na camada de dados.

### Tarefas

1. Corrigir `database-patient.repository.ts` para obter `accountId` real.
2. Auditar outros repositórios por hardcodes equivalentes.
3. Criar teste de regressao especifico para account isolation em owner-patient links.

### Critério de saida

- nenhum `accountId` hardcoded em repositorios de dominio;
- teste de isolamento cobrindo patients/links;
- aderencia maior ao modelo enterprise multi-tenant.

### Esforco estimado

- **Severidade:** critica
- **Esforco:** medio

---

## Etapa 4 — Alinhar Runtime OpenAPI com o Contrato Documentado

### Objetivo

Fazer a API publicar a spec real que a documentacao enterprise declara.

### Tarefas

1. Servir `apps/api/src/openapi.yaml` de verdade.
2. Fazer `/openapi.json` derivar da spec real, nao de objeto vazio.
3. Adicionar teste para `/openapi.json` conter `paths` nao-vazios.
4. Se `/openapi.yaml` continuar fora de escopo, corrigir imediatamente a documentacao.

### Critério de saida

- `/openapi.json` reflete a spec real;
- `/openapi.yaml` disponivel ou documentacao corrigida;
- claim API-first passa a ser verificavel.

### Esforco estimado

- **Severidade:** critica
- **Esforco:** baixo-medio

---

## Etapa 5 — Estabilizar Ambiente de Testes Criticos

### Objetivo

Separar falha de ambiente de falha do produto.

### Tarefas

1. Padronizar porta e credenciais de DB entre local e CI.
2. Tornar suites DB-dependent explicitamente skipped ou blocked quando o banco nao estiver disponivel.
3. Fazer `global-setup` falhar cedo quando a suite escolhida exigir DB.
4. Documentar bootstrap local de testes criticos.

### Critério de saida

- `pnpm test:critical` falha apenas por defeito real, nao por setup opaco;
- contribuidores conseguem reproduzir o mesmo ambiente do CI.

### Esforco estimado

- **Severidade:** critica
- **Esforco:** medio

---

## Etapa 6 — Corrigir Falhas Reais de Dominio na Suite Foundational

### Objetivo

Restaurar confianca nos encadeamentos entre modulos centrais.

### Tarefas

1. Corrigir `ICT-001` para respeitar assincronia real do `UsersService.create`.
2. Corrigir `ICT-007` pela mesma causa e revisar expectativa de listagem.
3. Corrigir `ICT-008` ajustando o fluxo queue -> called -> in_triage -> encounter, ou a regra de negocio correspondente.
4. Corrigir `ICT-010` revisando reflexo billing/inventory e IDs esperados.

### Critério de saida

- suite foundational verde;
- contratos intermodulares coerentes;
- testes passam a documentar o produto real, nao uma expectativa desatualizada.

### Esforco estimado

- **Severidade:** alta
- **Esforco:** medio

---

## Etapa 7 — Endurecer Auth e Consistencia de Cliente

### Objetivo

Reduzir risco de seguranca e drift entre SDK e SPA.

### Tarefas

1. Isolar credenciais seed apenas para dev/test.
2. Impedir seu uso acidental em staging/producao.
3. Unificar storage keys entre SPA e `shared-auth-sdk`.
4. Rever payload JWT consumido pela SPA.

### Critério de saida

- seeds previsiveis fora do caminho de runtime sensivel;
- SDK e SPA usam as mesmas chaves e convencoes.

### Esforco estimado

- **Severidade:** alta
- **Esforco:** baixo-medio

---

## Etapa 8 — Consolidar Camada de Banco

### Objetivo

Eliminar duplicidade e reduzir drift entre `packages/shared/database` e `packages/db`.

### Tarefas

1. definir camada canonica;
2. migrar consumidores secundarios;
3. remover duplicidades de schema/client/migration utilities;
4. documentar a arquitetura final de dados.

### Critério de saida

- uma unica fonte de verdade para acesso e schema de banco;
- menos risco de divergencia futura.

### Esforco estimado

- **Severidade:** alta
- **Esforco:** alto

---

## Etapa 9 — Recalibrar Documentacao Executiva

### Objetivo

Fazer a documentacao voltar a representar o estado verdadeiro do sistema.

### Tarefas

1. atualizar scorecards e execution tracker;
2. remover claims de PASS sem evidencia atual;
3. vincular cada claim executiva a um comando ou artefato verificavel;
4. distinguir “implementado”, “compila”, “testado”, “operacional”.

### Critério de saida

- documentacao confiavel para tomada de decisao;
- reducao de drift entre plano e realidade.

### Esforco estimado

- **Severidade:** alta
- **Esforco:** baixo

---

## Etapa 10 — Endurecimento Enterprise

### Objetivo

Fechar a transicao de “funciona” para “auditavel”.

### Tarefas

1. elevar thresholds de coverage gradualmente;
2. incluir SPA e worker em cobertura mais representativa;
3. adicionar gates para tenancy, openapi e runtime contracts;
4. evoluir event bus para dispatch real;
5. remover artefatos `dist/` do versionamento onde nao forem essenciais.

### Critério de saida

- CI passa a medir o que realmente importa;
- o repositorio fica mais limpo e revisavel;
- claims enterprise tornam-se sustentaveis.

### Esforco estimado

- **Severidade:** media-alta
- **Esforco:** medio-alto

---

## 4. Matriz Severidade x Esforco

| ID | Frente | Severidade | Esforco | Prioridade |
|----|--------|------------|---------|------------|
| P0-01 | Corrigir module-ml | Critica | Medio | Maxima |
| P0-02 | Fechar tenant/account na borda | Critica | Medio-Alto | Maxima |
| P0-03 | Remover hardcodes de accountId | Critica | Medio | Maxima |
| P0-04 | Alinhar OpenAPI runtime | Critica | Baixo-Medio | Maxima |
| P0-05 | Estabilizar setup de testes DB | Critica | Medio | Maxima |
| P1-01 | Corrigir foundational tests | Alta | Medio | Alta |
| P1-02 | Endurecer auth/seed/storage | Alta | Baixo-Medio | Alta |
| P1-03 | Consolidar camada de banco | Alta | Alto | Alta |
| P2-01 | Recalibrar documentacao executiva | Alta | Baixo | Alta |
| P2-02 | Endurecimento CI/coverage/event bus | Media-Alta | Medio-Alto | Media |

---

## 5. Sequencia Recomendada de Execucao

### Sprint 1

1. `module-ml`
2. multi-tenancy na API
3. hardcodes de accountId
4. OpenAPI runtime

### Sprint 2

1. setup de testes criticos
2. foundational tests
3. auth seeds e storage keys

### Sprint 3

1. consolidacao de database layer
2. recalibracao documental
3. coverage e gates

### Sprint 4

1. event bus real
2. endurecimento final para auditoria

---

## 6. Definicao de “Auditavel de Verdade”

Considerarei o projeto em estado auditavel quando, simultaneamente:

- `pnpm typecheck` = PASS
- `pnpm build` = PASS
- `pnpm test:critical` = PASS em ambiente reproduzivel
- OpenAPI runtime = spec real
- tenant/account isolation = fechado ponta a ponta
- documentacao executiva = coerente com evidencia real

---

## 7. Proximo Passo Operacional

Executar **P0-01 a P0-04** antes de qualquer nova expansao funcional.

Esses itens tem o melhor ganho de confianca por unidade de esforco e destravam o restante do programa.

