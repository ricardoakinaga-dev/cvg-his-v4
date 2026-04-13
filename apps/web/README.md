# apps/web

Frontend legado congelado do CVG-HIS V2.

## Estado operacional

- `apps/spa` e o frontend canonico do produto
- `apps/web` nao recebe novas features, premiumizacao ou ampliacao de dominio
- este app existe apenas para rastreabilidade, suporte residual e rollback historico controlado
- qualquer excecao deve ser explicitamente justificada e passar pelo guardrail `pnpm guardrail:legacy-web`

## O que ainda existe aqui

- servidor HTTP Node com paginas HTML inline
- superficie historica usada durante a janela de transicao `web -> spa`
- smoke tests locais do legado para investigacao de regressao historica

## O que nao fazer

- nao tratar `apps/web` como frontend oficial
- nao adicionar telas, rotas ou fluxos novos aqui
- nao apontar deploy principal, proxy ou onboarding para este app

## Uso permitido

```bash
# suporte residual / investigacao historica
pnpm dev:legacy-web

# validacao isolada do legado
pnpm --filter @cvg-his-v2/web test
```

## Fonte de verdade do frontend oficial

- [README raiz](/root/.openclaw/workspace/cvg-his-v2/README.md)
- [114-frontend-architecture.md](/root/.openclaw/workspace/cvg-his-v2/docs/114-frontend-architecture.md)
- [0168-MATRIZ-CORTE-WEB-PARA-SPA-POR-DOMINIO.md](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0168-MATRIZ-CORTE-WEB-PARA-SPA-POR-DOMINIO.md)
- [0160-ROTEIRO-DESLIGAMENTO-OPERACIONAL-WEB.md](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0160-ROTEIRO-DESLIGAMENTO-OPERACIONAL-WEB.md)
