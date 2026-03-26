# Reconstruction Rationale

## Contexto

O repositorio atual possui um conjunto funcional relevante de modulos, schemas, telas e integracoes. Apesar disso, a base foi expandida por iteracoes sucessivas e concentra sinais de acoplamento estrutural:

- modulos de negocio e infraestrutura misturados na mesma arvore operativa
- fronteiras de dominio pouco consistentes entre clinico, financeiro e estoque
- convencoes importantes espalhadas entre frontend, backend e banco
- documentacao historica orientada a evolucao incremental, nao a uma fundacao nova

## Decisao

O `cvg-his-v2` sera reconstruido como uma base nova, modular e auditavel. O legado sera mantido como referencia funcional e fonte de regras descobertas, mas nao como baseline arquitetural.

## Objetivos arquiteturais da reconstrucao

- separar claramente `apps`, `packages/modules`, `packages/shared`, `infra` e `tools`
- explicitar bounded contexts antes de telas e fluxos detalhados
- concentrar regras clinicas relevantes em backend e dominio, nunca apenas em UI
- tornar auditoria, autorizacao e rastreabilidade parte da fundacao
- preparar crescimento por fases, com dependencias e checkpoints claros

## Criterios para reaproveitamento seletivo

Um artefato legado so pode ser reaproveitado se atender simultaneamente aos criterios abaixo:

1. representar regra de negocio valida e estavel
2. possuir fronteira de responsabilidade compreensivel
3. nao arrastar acoplamento estrutural indesejado para o V2
4. poder ser encapsulado em modulo, shared package ou contrato bem definido
5. preservar rastreabilidade e seguranca

## Criterios de descarte

Um artefato deve ser descartado como base do V2 quando:

- mistura dominios sem fronteira clara
- codifica autorizacao diretamente em tela ou handler sem policy
- embute regra clinica material apenas no frontend
- depende de naming, shape ou schema incoerente com o modelo alvo
- reflete workaround operacional e nao uma decisao de produto

## Guardrails de execucao

- o legado nao sera reestruturado para "virar V2"
- a implementacao comeca por dominio, arquitetura e contratos
- cada fase precisa gerar documentacao e relatorio em `/docs`
- qualquer excecao arquitetural exige registro em `decision-log.md`
