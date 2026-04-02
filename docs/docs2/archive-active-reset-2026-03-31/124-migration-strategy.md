# Migration Strategy

## Premissa central

Migracao nao e copia estrutural. O V2 recebe regras e dados por ondas controladas, apos consolidacao do modulo destino.

## Trilhas de migracao

- migracao funcional
- migracao de dados
- convivio operacional entre legado e V2

## Estrategia

1. inventariar capacidade real do legado
2. definir contrato alvo no V2
3. mapear correspondencia entre origem e destino
4. validar consistencia em ambiente controlado
5. migrar por dominio e ondas

## Ordem recomendada

- identidade e acesso
- cadastro mestre
- encounters
- prontuario base
- modulos avancados
- administrativo

## Regras

- nao migrar dados para modulo ainda nao validado funcionalmente
- toda carga precisa de reconciliacao
- rollback ou estrategia de contenção deve ser prevista por onda
