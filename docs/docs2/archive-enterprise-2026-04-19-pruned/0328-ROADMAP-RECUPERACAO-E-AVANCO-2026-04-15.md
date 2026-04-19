# 0328 - Roadmap de Recuperacao e Avanco - 2026-04-15

**Data UTC:** `2026-04-15`  
**Base:** `0326` e `0327`  
**Objetivo:** organizar a recuperacao e o avanço do projeto por horizonte de entrega

---

## 1. Leitura de horizonte

O roadmap abaixo separa:

- o que precisa acontecer **agora** para o projeto voltar a ser confiavel;
- o que precisa acontecer **depois** para elevar maturidade;
- o que pode acontecer **por ultimo** sem distorcer a prioridade real.

---

## 2. Horizonte H0 - Recuperacao imediata (`0-7 dias`)

**Objetivo:** sair do estado de workspace quebrado

Entregas:

1. corrigir erro de tipagem em `packages/shared/types`
2. voltar `pnpm typecheck` para verde
3. voltar `pnpm build` para verde
4. voltar `pnpm test:coverage` para verde no threshold atual
5. registrar baseline nova de score operacional

Resultado esperado:

- workspace novamente executavel
- release deixa de estar artificialmente inflada por docs antigos

---

## 3. Horizonte H1 - Estabilizacao tecnica (`1-3 semanas`)

**Objetivo:** reduzir os maiores riscos tecnicos residuais

Entregas:

1. reduzir ruido do worktree e organizar alteracoes abertas
2. continuar extracao de `server.ts`
3. proteger novos recortes com testes unitarios e de contrato
4. revisar hotspots de cobertura zerada em API e modulos administrativos

Resultado esperado:

- risco estrutural menor
- menos dependencia de um unico arquivo central
- base melhor para novas entregas

---

## 4. Horizonte H2 - Fechamento dos gaps enterprise (`3-6 semanas`)

**Objetivo:** aproximar o produto da profundidade enterprise real

Entregas:

1. aprofundar fiscal com backoffice e persistencia mais completos
2. ampliar financeiro administrativo e reconciliacao
3. melhorar hubs de relatorio por dominio administrativo
4. ampliar uso real de feature flags em trilhas sensiveis
5. expandir uso governado de Redis/runtime distribuido

Resultado esperado:

- ERP administrativo mais crivel
- menor gap entre shell forte e operacao rasa

---

## 5. Horizonte H3 - Operacionalizacao de plataforma (`6-10 semanas`)

**Objetivo:** transformar artefatos de plataforma em capacidade verificavel

Entregas:

1. validar Helm em template/dry-run e smoke deploy
2. alinhar values por ambiente
3. consolidar runbooks de deploy e rollback
4. integrar provider de segredos a cenarios reais de bootstrap
5. elevar evidencias operacionais de observabilidade e backup

Resultado esperado:

- plataforma longa deixa de ser apenas preparacao
- trilha de deploy passa a ser verificavel

---

## 6. Horizonte H4 - Excelencia sustentada (`10+ semanas`)

**Objetivo:** consolidar maturidade premium

Entregas:

1. elevar coverage para patamar mais serio
2. fechar hotspots ainda descobertos em dominios criticos
3. reduzir mais `server.ts`
4. endurecer performance, chaos e readiness operacional
5. alinhar docs vivas continuamente ao estado real do codigo

Resultado esperado:

- score de construcao acima de `85/100`
- score de prontidao de release acima de `75/100`

---

## 7. Marcos do roadmap

| Marco | Horizonte | Criterio |
|---|---|---|
| M1 | H0 | gates centrais verdes |
| M2 | H1 | `server.ts` menor e worktree mais controlado |
| M3 | H2 | fiscal/financeiro administrativo em nivel mais forte |
| M4 | H3 | Helm e segredos com validacao operacional minima |
| M5 | H4 | coverage, performance e operacao em nivel sustentavel |

---

## 8. Dependencias

Dependencias principais:

- H1 depende de H0
- H2 depende de H0 e parcialmente de H1
- H3 nao deve ultrapassar H0/H1 em prioridade
- H4 depende da consolidacao dos horizontes anteriores

Regra:

- **nao usar plataforma longa como fuga para nao resolver gates e risco estrutural atuais**

