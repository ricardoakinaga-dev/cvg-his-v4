# Governança de validação ML

Este documento define o gate local para recomendações de ML do CVG-HIS. Os serviços de previsão continuam assistivos: não alteram prontuário, faturamento ou agenda automaticamente. Uma versão só pode ser habilitada depois de uma avaliação holdout reproduzível, fingerprint do conjunto de dados e revisão humana identificada.

`packages/modules/ml/src/validation.service.ts` calcula accuracy, precisão macro, cobertura e MAE para classificação, regressão e forecasting. O resultado distingue `passed`, `failed` e `insufficient_data`; amostra insuficiente, dados não finitos e métricas abaixo da política falham fechado. `canUseMlResult` exige `passed` e `reviewerId`, mantendo a revisão profissional obrigatória.

O registro deve conservar `modelVersion`, `datasetFingerprint`, política, métricas, horário UTC, motivos e revisor. O fingerprint precisa ser calculado fora do serviço a partir do dataset imutável usado na avaliação. A validação local não é evidência de acurácia clínica, homologação regulatória ou desempenho em produção; essas etapas continuam dependentes de dados autorizados, revisão clínica e ambiente-alvo.

Validação executada em 05/09/2026: `pnpm --filter @cvg-his-v2/module-ml test` (37 testes) e `pnpm --filter @cvg-his-v2/module-ml typecheck` (exit 0). Artefato de execução: `artifacts/consolidacao-2026-09-05/ml-validation.log`.
