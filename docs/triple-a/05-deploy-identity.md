# Triple-A — 05 Deploy Identity

**Status:** PARTIAL / TARGET EVIDENCE OPEN

API e worker usam lockfile congelado e usuário não-root. Helm aceita digest explícito para API, worker e SPA. O workflow de release valida identidade e roda o gate antes de publicar artefatos.

O binário Helm não está disponível localmente, a imagem SPA não foi certificada como não-root nesta rodada e não há rollout/rollback real ou manifest de imagens por digest vinculado a um SHA final.
