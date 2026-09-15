---
document_status: current
document_kind: independent_review
effective_date: 2026-09-12
owner: Engenharia
---

# Auditoria consolidada — F-NATIVE, MA-04 e S1-R2

## Decisão

**MA-02-F-NATIVE: REJECT independente I1 no critério de completude.** A revisão 3 corrigiu os três paths, mas o CLI aceita a ausência de todo o inventário nativo, mesmo quando requiredShards exige native-api/native-worker. S1-R2 continua WAITING_FOR_DEPENDENCY, sem autorização de captura/coleta.

MA-03-R3 foi integrado em .agent revisão 33 segundo controles diretamente inspecionados; seu aceite local não é reaberto por este defeito de inventário. MA-04 mantém evidência funcional favorável, mas o teste de dispatch ainda está fora de vitestTests/executionInputs. Release BLOCKED / NOT PROVEN.

## Revisão independente de MA-02-F-NATIVE

Crítico final: `/root/native_inventory_sealed_final`, fork none, I1, nenhum descendente. Contrato recebido diretamente, sem leitura do pacote narrativo, relatórios builder ou críticas anteriores. Uma sessão preliminar foi interrompida após ler seção excluída: não é usada como parecer final.

Identidade julgada:

| Arquivo | SHA-256 |
| --- | --- |
| docs/engineering/critical-coverage-scope.json | 8f622ac2ad7adde3c3c74f12e8327d37c3f82157d0506673ac5d45d45998c357 |
| scripts/lib/native-test-inventory.mjs | b2746c17b4e5a233a7b9335289839ea050788faec6ff2663c42ab78c28604ab5 |
| scripts/lib/critical-source-identity.mjs | d2136513ea2761a425baf3b104380e9ee421b4240037287009d713b9ae8e3e14 |
| scripts/refresh-critical-source-manifest.mjs | 750b620f12187e9b6a68566208bac32808a6b1a7a180b1808f0551036c51dcdc |

### F-NATIVE-R1-01 — ausência integral não rejeitada

Severidade High para a garantia fail-closed do inventário; confiança alta. Reprodução independente sobre cópia /tmp dos inputs atuais:

1. Manter requiredShards com native-api e native-worker.
2. Remover somente a propriedade nativeTests do manifesto da cópia.
3. Executar o CLI real `node scripts/refresh-critical-source-manifest.mjs --check` na cópia.
4. Observado: exit 0, status PASS, errors []. Esperado: exit não zero e diagnóstico de inventário obrigatório ausente.

Causa diretamente inspecionada: `scripts/lib/critical-source-identity.mjs:52` retorna lista vazia quando nativeTests é undefined; `:243` só chama a validação quando a propriedade existe. Não é um fixture legado sem exigência nativa: a reprodução mantém a obrigação do candidato.

Limite: não prova liberação do release nem que o runner aceite manifesto ausente; prova que o --check prometido não cumpre a completude obrigatória. Não remover requiredShards para contornar o achado.

| Critério | Resultado |
| --- | --- |
| 1. Inventário obrigatório completo | FAIL — omissão integral passa no CLI |
| 2. Descoberta AST e paths | Não certificado nesta revisão, interrompida após falha material |
| 3. Refresh/histórico/noop | Não certificado nesta revisão |
| 4. Compilados/source maps | Não certificado nesta revisão |
| 5. Invariantes de escopo | Não certificado integralmente nesta revisão |

Não tratar os itens 2–5 como falhas comprovadas ou infraestrutura bloqueada: ficaram fora da conclusão após a parada antecipada.

Execuções próprias do crítico: três arquivos focados node:test 22/22, exit 0; --check do manifesto real exit 0; probe de omissão integral no CLI exit 0 indevido. Nenhum build de produto, DB, Redis ou coleta. Sentinelas de 2.127 paths antes/depois sem mudança, incluindo manifesto/tooling/config/state/fontes/inputs; git status igual. O coordenador alterou somente documentação MA-04 fora do conjunto julgado.

Origem: `/tmp/cvg-native-i1-sVzFdp/`. Seis arquivos textuais com conteúdo e digest preservados pelo coordenador em `artifacts/remediation/MA-02-F-NATIVE/fresh-review-i1/raw-evidence.json`. Snapshots completos e cópia permanecem em /tmp; retenção durável externa pendente.

- public-probe.mjs: `f8093aa9801795dfc353182284cb6c6f716fb74861e097a987cb380bd6e1317e`
- public-check.log: `424a9957570e9cbc11ef4d863383071ce99fcf7d5e6b921680f0d8c593ad7379`
- tests.log: `b81f1ade0e2a2a37e7bad94dcf512dd782ec03aace39dd2b6a13d72ad5a4a160`
- before.json / after.json: `039d68a9c0694179d44567ba3a45f2729e8537c65484380f6a434ad607ef2f81`

## Auditoria do coordenador sobre as demais entregas

- Conferidos 7/7 fingerprints do pacote F-NATIVE e --check atual PASS revisão 3. Manifesto: worker 12, API 73, inputs 2.119. Esses dados não anulam o contraexemplo independente.
- SHA256SUMS dos pacotes MA-04 integration-20260912T2245Z-324099e5 e S1 attempt-20260912T2250Z-waiting: exit 0. Fontes MA-04 coincidem com hashes julgados. Novos testes 35/35 e 18/18 são evidência do executor MA-04, não reexecução do coordenador nesta rodada.
- Confirmada omissão de `tests/unit/api/auth-dispatch-contract.test.ts` em ambos os inventários na revisão 3. É pendência técnica de rastreabilidade, não apenas administrativa. Slice separado proposto: MA-02-F-DISPATCH.
- Corrigido em docs MA-04: inclusão de teste não muda sourceSetSha256 se files permanecer igual; vitestTests contém strings, não objetos components; vínculo auth/http-routes deve usar estrutura apropriada.
- Requisitos MA-08 R1–R6 permanecem obrigatórios; a redação do handoff que os junta às decisões não aprovadas é incorreta. C1–C6/T2 continuam pendentes, nenhum slice SSO autorizado.
- S1-R2 corretamente não capturou candidato nem instalou/construiu/coletou. O candidato prospectivo revisão 3 não é shard produzido.
- Falha de branch zero-hit em run-native-critical-coverage.test.mjs consta nos logs atuais e no comparativo pré-mudança do builder. Classificação pré-existente é sustentada por esses logs, não reproduzida pelo coordenador nesta rodada; não é green e exige diagnóstico separado antes de confiar na correção da medição. Não usar esse achado para reescrever o escopo do rework F-NATIVE.

## Próxima sequência e ownership

1. Agente 1: **MA-02-F-NATIVE-R1**, reparar a omissão integral e apresentar nova revisão. Somente ele reconcilia .agent/**; coordenador não cria outro escritor.
2. Após aceite, **MA-02-F-DISPATCH**: incluir teste MA-04 em inventário Vitest/inputs por tooling com histórico e regressões, preservando files. Manter o aceite funcional MA-04 separado da completude do inventário.
3. Agente 3: preservar WAITING; não iniciar coleta até despacho explícito sobre identidade final. Aguardar também a disposição do erro de medição zero-hit antes de apresentar shard como prova confiável.
4. Agente 2: nenhuma nova alteração de auth; handoff aceito como evidência, decisões SSO permanecem humanas.

A inclusão planejada de dispatch antes da coleta é decisão de sequenciamento para evitar recaptura de candidato; não é um defeito adicional imputado a F-NATIVE. Não integrar revisão 3 como aprovada nem reabrir R3.

