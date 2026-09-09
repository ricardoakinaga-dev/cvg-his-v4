# Triple-A — 06 Worker Reliability

**Status:** PARTIAL

O runner de jobs passou a isolar falha por conta/job e continuar o tick com as demais contas. A política de retry/DLQ está em [`JOB_RETRY_AND_DLQ_POLICY.md`](../operations/JOB_RETRY_AND_DLQ_POLICY.md), e os testes do worker passaram no escopo local.

Não foram executados live DB/queue, soak, timeout de job pendurado, lease fencing sob concorrência ou prova de DLQ em ambiente alvo.
