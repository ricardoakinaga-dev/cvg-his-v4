# Phase 1 Open Issues

## Pendencias

- fechar convencao definitiva de package naming no V2
- definir stack exata de runtime para `apps/api` e `apps/worker`
- definir estrategia concreta de events internos entre `api` e `worker`
- definir como `packages/shared/database` sera particionado sem virar acoplamento central

## Riscos

- shared packages crescerem demais e virarem novo monolito interno
- fase tecnica iniciar antes de contracts e ownership serem respeitados
- naming legado contaminar contratos publicos novos

## Dependencias

- abertura da Fase 2 para manifests, `turbo`, tsconfig refinado e skeleton executavel
- validacao futura das policies na Fase 3

## Recomendacao

A Fase 2 deve usar estes documentos como contrato de execucao e evitar qualquer implementacao que reintroduza mistura de prontuario, administrativo e estoque.
