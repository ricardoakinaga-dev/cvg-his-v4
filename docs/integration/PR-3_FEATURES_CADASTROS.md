# PR-3: Cadastros + Navegacao Operavel

## Scope

- `/owners` agora eh tela funcional (lista + busca + modal create):
  - `apps/his-web/src/app/owners/page.tsx`
- `/owners/[id]` agora eh detalhe funcional (sem redirect para `/clients`):
  - `apps/his-web/src/app/owners/[id]/page.tsx`
- `/owners/new` redireciona para fluxo funcional:
  - `apps/his-web/src/app/owners/new/page.tsx`
- `/encounters` agora lista geral com busca + paginacao + CTA de criacao:
  - `apps/his-web/src/app/encounters/page.tsx`
- Corrigido runtime error do MAR (shape real do bedmap):
  - `apps/his-web/src/features/mar/MarConsole.tsx`
- Criadas paginas faltantes de protocolos para eliminar links quebrados:
  - `apps/his-web/src/app/protocols/new/page.tsx`
  - `apps/his-web/src/app/protocols/[id]/page.tsx`

## Root Cause Fixed

- `/owners` e `/owners/[id]` eram apenas redirects, quebrando expectativa enterprise de cadastros dedicados.
- `MarConsole` lia `data.wards.flatMap(...)` enquanto API entrega `{ ward, beds }`.
- Links de protocolos apontavam para rotas inexistentes.

## How To Test (Local)

1. Rodar web:
   - `cd apps/his-web && npm run dev`
2. Validar fluxos:
   - `/owners` lista e busca
   - `/owners/<id>` detalhe
   - `/encounters` lista geral + busca
   - `/inpatient/mar` sem crash de bedmap shape
   - `/protocols/new` e `/protocols/<id>` carregam
3. Login e navegacao:
   - efetuar login em `/login`
   - navegar via sidebar em Cadastros/Assistencial sem 404

## How To Test (EasyPanel)

1. Deploy `his-web` atualizado.
2. Acessar:
   - `https://<web-domain>/owners`
   - `https://<web-domain>/encounters`
   - `https://<web-domain>/protocols/new`
3. Validar requests no browser:
   - same-origin em `/api/proxy/*`
   - sem erro de runtime no console ao abrir MAR.
