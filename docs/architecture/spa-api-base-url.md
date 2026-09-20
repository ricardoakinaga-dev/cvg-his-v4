---
document_status: current
document_kind: architecture-contract
effective_date: 2026-09-20
owner: Plataforma e Frontend CVG-HIS
---

# Contrato de endpoint da SPA

`VITE_API_BASE_URL` é uma configuração de build, não de runtime. O valor é
incorporado pelo Vite no bundle durante `pnpm --filter @cvg-his-v2/spa run build`.

Em imagens de produção o valor deve permanecer vazio. O navegador chama
`/api/...` na mesma origem e o nginx da imagem/chart encaminha esse caminho
para o Service de API da release. Assim cookies de refresh permanecem
same-origin e o pod não depende de uma variável de ambiente que uma SPA
estática não relê depois do build.

Builds locais que precisam falar diretamente com uma API descartável podem
passar `VITE_API_BASE_URL` como `--build-arg` ou variável do Vite. Isso não é
configuração de produção e não deve conter segredo.

O chart não renderiza `VITE_API_BASE_URL` no ConfigMap da SPA. O contrato é
protegido por `infra/scripts/validate-helm.mjs` e pelo teste focal
`tests/unit/infra/validate-helm-script.test.mjs`; o proxy same-origin é coberto
pela configuração nginx e pelos servidores E2E da CI.
