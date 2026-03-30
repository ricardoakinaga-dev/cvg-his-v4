# ADR-009: Module Structure Simplified & Domain Package Status

**Status:** Accepted  
**Date:** 2026-03-30  
**Authors:** ClawDinho (assistente técnico)  
**Review:** Pending

---

## Contexto

O projeto definiu em `docs/113-module-contracts.md` uma estrutura de módulo canônica:

```
index.ts (surface pública)
contracts.ts (comandos, queries, eventos)
application/ (casos de uso)
domain/ (entidades, regras, value objects)
infrastructure/ (adapters)
```

Na implementação real, a estrutura de pastas dentro de `packages/modules/*` é mais simples:

- `src/index.ts` contém o serviço e interfaces de repositório
- `src/repositories/` contém as implementações de repositório
- Não há diretórios `application/`, `domain/`, `infrastructure/` separados
- Não há arquivo `contracts.ts` local; contracts são centralizados em `packages/shared/contracts/src/index.ts`

Além disso, existe um pacote `packages/domain` com entidades Zod-based (`patient.ts`, `encounter.ts`, etc.) que **não é utilizado** por nenhum módulo em `packages/modules/*`.

---

## Problema

Deve-se:

1. Manter a estrutura simplificada atual (`index.ts` + `repositories/`) como oficial?
2. Refatorar para a estrutura de camadas separadas (`application/`, `domain/`, `infrastructure/`)?
3. O que fazer com o pacote `packages/domain`?

---

## Decisão

1. **Estrutura simplificada (`index.ts` + `repositories/`) é aceita como implementação canônica** — não será refatorada para camadas separadas neste estágio. A arquitetura modular monolith com serviços e repositórios abstraídos atende aos objetivos de separação de responsabilidades e testabilidade.

2. **Contracts continuam centralizados em `packages/shared/contracts/src/index.ts`** — esta abordagem reduz duplicação e define a superfície pública de forma consistente. O documento `113-module-contracts.md` deve ser atualizado para refletir contracts centralizados, não locais.

3. **Pacote `packages/domain` é declarado legacy/experimental e será removido no futuro** — como não é utilizado e adiciona complexidade desnecessária, ele deve ser arquivado ou deletado na próxima limpeza de código. Nenhum novo desenvolvimento deve depositar lógica de domínio lá.

4. **Documentação arquitetural será atualizada** — `docs/113-module-contracts.md` e `docs/112-target-architecture.md` devem ser ajustados para corresponder à implementação real.

---

## Alternativas Consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| Refatorar para `application/domain/infrastructure` | Clareza de camadas; alinhamento pleno com DDD | Custo alto; risco; interrompe desenvolvimento atual; over-engineering para estágio atual |
| Manter estrutura atual (services em `index.ts`) | Simplicidade; baixo custo; já funciona | Pode misturar concerns se não houver disciplina; menos explícito que DDD puro |
| Usar `packages/domain` como fonte da verdade | Domínio puro isolado; reutilizável | Requer refatoração; quebra dependências atuais;DUPLICA effort |

A Opção 2 (simplificada) foi escolhida por **efetividade e pragmatismo**.

---

## Consequências

### Positivas

- Reduz complexidade de estrutura de pastas
- Mantém produtividade do time
- Evita refatoração massiva não urgente
- Centralização de contracts simplifica consumidores

### Negativas

- Documentação oficial (`113-module-contracts.md`) fica dessincronizada da implementação e precisa ser atualizada
- A presença do pacote `packages/domain` pode confundir novos desenvolvedores
- Limita exploração futura de DDD puro (mas não impede)

---

## Ações Imediatas

1. Atualizar `docs/113-module-contracts.md` com a estrutura real:
   - `src/index.ts` (service + repositories)
   - `src/repositories/` (abstração + implementação)
   - Contracts em `packages/shared/contracts`
2. Remover menções a `contracts.ts`, `application/`, `domain/`, `infrastructure/` como diretórios obrigatórios.
3. Marcar `packages/domain` como `deprecated` no README, planejando remoção.
4. Comunicar a decisão à equipe.

---

## Anexo: Estrutura de Módulo Real (Exemplo)

```
packages/modules/patients/
├── src/
│   ├── index.ts        # PatientsService + interfaces
│   └── repositories/
│       ├── patient.repository.ts
│       └── owner-patient-link.repository.ts
├── package.json
└── tsconfig.json
```

---

## Referências

- `docs/113-module-contracts.md` — Module Contracts (desatualizado)
- `docs/112-target-architecture.md` — Target Architecture
- `packages/domain/` — Domain package (unused)
