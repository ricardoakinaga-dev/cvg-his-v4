# PRD — Consolidação CVG-HIS V4

**Status:** aprovado para execução incremental  
**Data:** 2026-08-25  
**Owner:** Engenharia + Produto + Operações

## Problema

O sistema possui grande cobertura funcional, porém sua identidade de release, fonte de migrations, composição de runtime, tracks de deploy e prova de parity não estão suficientemente unificadas para uma operação veterinária 24x7. O risco maior é declarar “V4 pronto” por documentação ou presença de telas enquanto dados, integrações, recuperação ou isolamento ainda não foram provados.

## Objetivo

Consolidar o CVG-HIS em uma superfície operacional única, modular e verificável, preservando a implementação existente, compatibilidade de dados e jornadas clínicas. A consolidação deve reduzir ambiguidade, impedir regressões de segurança/tenant/auditoria, elevar a prova de disponibilidade e transformar parity Vetus em cenários comportamentais.

## Resultados esperados

- uma identidade de release explicitamente governada, com transição V2→V4 sem rename big-bang;
- uma trilha única de schema/migrations com checksum e sem `db:push` acidental;
- contrato de health/readiness/liveness/drain comum a Compose e Helm;
- API/worker capazes de shutdown gracioso, idempotente e observável;
- Owner→Patient→Encounter como núcleo clínico testado até fechamento financeiro/estoque/audit;
- RLS, roles, backup/restore e providers certificados por ambiente apropriado;
- parity Vetus com status `INVENTORIED`, `BOUNDED`, `VERIFIED` e evidência executável;
- CI cobrindo gates estáticos e promovendo somente o que tem prova atual.

## Não objetivos

- reescrever o produto ou criar V5;
- trocar Vue, PostgreSQL ou o modelo de deploy sem necessidade;
- introduzir microservices, Kafka ou Kubernetes como solução automática;
- apagar migrations aplicadas, dados, RLS, audit ou testes;
- afirmar go-live sem autoridade humana, provider homologado e ambiente-alvo;
- renomear centenas de pacotes em uma alteração sem mapa de consumidores.

## Usuários e jornadas prioritárias

1. recepção: owner/patient, agenda, fila e encounter;
2. veterinário: triage, prontuário, exame, prescrição, evolução e handoff;
3. internação: leito, diária, item cobrável, transferência, alta e auditoria;
4. financeiro/estoque: billing, receipt, payment, lot/movement, reconciliation;
5. operador: health, worker, DLQ, reports, backup/restore e cutover;
6. administrador: tenant, roles, MFA, LGPD, audit e governança.

## Métricas de sucesso

- zero novos imports entre namespaces canônico/legacy sem exceção registrada;
- zero mismatch de checksum aceito pelo runner;
- API/worker com shutdown process testado e sem request/job abandonado no cenário definido;
- restore drill com RTO/RPO registrados;
- 100% das tabelas críticas com prova de tenant/RLS no catálogo alvo;
- 11/11 domínios Vetus com cenário comportamental ou bloqueio explicitamente aceito;
- CI executa e publica os gates definidos na Quality Bar.
