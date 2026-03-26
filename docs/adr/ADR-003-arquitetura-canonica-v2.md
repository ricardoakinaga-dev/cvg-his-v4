# ADR-003 Arquitetura Canonica do V2

**Data**: 2026-03-25
**Status**: Aprovado
**Contexto**: Decisao sobre trilhas canonicas do repositorio

---

## Decisao

O V2 define uma arquitetura canonica com as seguintes trilhas de apps:

| App       | Caminho       | Status   |
| --------- | ------------- | -------- |
| API V2    | `apps/api`    | Canonico |
| Web V2    | `apps/web`    | Canonico |
| Worker V2 | `apps/worker` | Canonico |

As trilhas legadas `apps/his-api`, `apps/his-web` e `apps/his-worker` sao **arquivadas** e nao devem ser usadas para desenvolvimento novo.

---

## Motivos

1. **Claridade arquitetural**: Dualidade de apps causa confusao sobre qual trilhar para evolucao
2. **Onboarding**: Novos membros precisam saber rapidamente onde trabalhar
3. **Manutencao**: Manter duas trilhas paralelas duplica esfuerzo de manutencao
4. **Evolucao**: O V2 foi desenhado com fronteiras de dominio mais claras que o legado

---

## Consequencias

### Positivas

- Desenvolvimento focado em uma trilha
- Documentacao e scripts apontam para arquitetura unica
- Reducao de ambiguidade para onboarding
- Limpeza do repositorio

### Negativas

- Legado fica apenas como referencia historica
- Migracao de funcionalidades especificas do legado pode ser necessaria manualmente

---

## Caminhos Arquivados

| Legado            | Status    | Destino                                     |
| ----------------- | --------- | ------------------------------------------- |
| `apps/his-api`    | Arquivado | Funcionalidades migradas para `apps/api`    |
| `apps/his-web`    | Arquivado | Funcionalidades migradas para `apps/web`    |
| `apps/his-worker` | Arquivado | Funcionalidades migradas para `apps/worker` |

---

## Implementacao

1. Criar README.md em apps/his-api, apps/his-web, apps/his-worker indicando arquivamento
2. Remover apps/his-\* do turbo.json para evitar build automatico
3. Atualizar README principal para apontar apenas para apps canonicos
4. Atualizar scripts para usar apenas apps canonicos

---

## Data de Arquivamento

2026-03-25

---

## Revisao

Esta decisao deve ser revisada se funcionalidade critica existir apenas no legado e nao puder ser migrada em tempo razoavel.
