# Remediação dos P0 e dos checks k6 — 2026-09-18

**Fonte do candidato:** `ec092d77b69e97b4c408422ca13cac0c7e525fdf`. **CI verificado:** [35408222214](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35408222214), 17/17 jobs em `470f87dbee3f0755e0fb740dfa78b113d75d05c9` (descendente apenas documental). **Certificação:** BLOCKED / NOT PROVEN.

## Resultado verificado no GitHub

| Verificação | Resultado |
| --- | --- |
| CI obrigatório | **17/17 jobs aprovados** |
| k6 | **70.576/70.576 checks; zero falhas; 9/9 SLOs** |
| Health máximo | **33,49 ms**, limite mantido em 50 ms |
| Equivalência e casos negativos k6 | 132/132; quatro fixtures com saídas esperadas |
| Cobertura global | 2.990 testes aprovados; 3 skips preexistentes; branches 82,04% (mínimo 82%) |
| Integração PostgreSQL | 68 arquivos; 623 testes; 11/11 contratos de processos |
| E2E SPA | 424 testes aprovados; exercício adicional de RC com 2 testes |
| Cobertura crítica | PASS em todo o escopo congelado de 556 fontes |
| Evidência SQL | 176 migrações ativas; 183 artefatos; cinco fases aprovadas, incluindo 0177 |
| Registro P0 | **3 fechados; 11 abertos** |

Relatório k6 SHA256: `a7a4b563705822a41e2199734f50c4d307682fc3c6b3627587bea8908395b2aa`.
Pacote crítico [10574475986](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35408222214/artifacts/10574475986), SHA256: `78a110a0562f358d9c6ccc44586ba0dcf14ddf7c2742f25dd9cb8394f431e7b1`, conferido após download.

A [avaliação por critério](evidence/p0-remediation-20260918.json) registra nomes dos testes, linhas dos logs, hashes e proveniência. É uma avaliação derivada dos artefatos reais, não uma assinatura ou um aceite externo. O manifesto e a evidência SQL usam a fonte congelada; as invocações dos testes identificam o commit exato do workflow. As alterações entre os dois commits são apenas documentais.

### Fechamentos e dependências

- `P0-CI-CANDIDATE-FREEZE`: fechado; identidade e documentos vinculados.
- `P0-DATA-POSTGRESQL-RUNTIME`: fechado novamente com evidência fresca para 0177. Aplicação limpa, upgrade, reexecução, recuperação de falha e invariantes passaram; checksum adulterado foi rejeitado.
- `P0-WORKFLOW-LEASE-FENCING`: fechado; claims concorrentes, tokens antigos, renovação/retry/DLQ, cancelamento/conclusão e replay preservam a transição e o efeito únicos.
- Fluxo clínico e auditoria: os oito critérios mapeados de DATA/WORKFLOW/CLINICAL passaram, mas os dois itens clínicos continuam bloqueados pelas dependências de RLS e recuperação no target. Testes de navegador complementam a prova HTTP; não se declara uma única jornada completa de internação e faturamento feita exclusivamente pelo navegador.
- Os demais itens continuam exigindo política de branch/revisão independente, target aprovado, limites operacionais, assinaturas/artefatos verificados, UAT ou autoridade humana. Nenhum aceite foi presumido.

A abertura temporária de 13 P0 durante a revalidação terminou. Comparado ao pedido inicial de 12 abertos, o resultado é **11 abertos**, com a evidência de banco renovada e um fechamento adicional de concorrência. **A certificação Triplo AAA permanece bloqueada.**

## Correções

- k6: contadores por cada um dos16 checks, rejeição de evidência ausente/inconsistente e bloqueio com qualquer falha. CI, certificação e comando local usam o parser obrigatório.
- Gerador: cache de uma resposta completa e um booleano por VU. Comparação exata do corpo; qualquer alteração exige nova decodificação integral. Carga, requisições, quatro CPUs, GOMAXPROCS=1, nove SLOs e health<50ms preservados.
- PostgreSQL: migração0177 protege timeline e audit contra UPDATE, DELETE, cascatas e TRUNCATE CASCADE pelo usuário iniciador. Manutenção por owner/superuser continua possível. Exclusão de atendimento com histórico retorna conflito409; rascunhos sem evidência e alterações normais continuam funcionando.
- Release: build antes de typecheck/lint; atestação verificável do relatório de segurança por repositório/workflow/main/SHA/digest; preservação dos diagnósticos de falhas. Ausência de assinatura continua bloqueando.
- Governança: fechamento de P0 exige dependências fechadas; consumidores compartilham lista de17 jobs obrigatórios. Manifesto crítico88 preserva555 fontes anteriores e adiciona0177: **556 fontes,176 migrações,183 artefatos SQL**, sem reduzir thresholds.

## Evidência local

| Verificação | Resultado |
| --- | --- |
| Benchmark pareado sem cache | 7 falhas de health em70.560 checks;9SLOs aprovados |
| Benchmark pareado corrigido | **75.168/75.168 checks; zero falhas;9SLOs aprovados** |
| Health máximo | 65,50 → 20,15ms; limite50ms |
| CPU do gerador | 79,67 → 18,25s |
| RSS máximo do gerador | 163.300 → 220.692KiB; aumento aproximado56MiB |
| Equivalência k6 nativa | 132/132; quatro fixtures do benchmark comprovam saídas corretas |
| Unidades do benchmark | 35/35 |
| Timeline/audit PostgreSQL | 7/7; falha anterior de cascata reproduzida |
| Repositório e restauração do cache | 32/32 |
| Segurança, gate e CI | 75/75; assinatura real ainda depende do workflow |
| Build → typecheck → lint | PASS em Node22.23.2 |

Os dois benchmarks utilizaram bancos novos e4.130 hashes idênticos de código/artefatos da aplicação nas quatro fronteiras. A versão de referência executou um helper externo com o predicado original; o manifesto de execução registra essa diferença. Foram testes locais sobre bytes depois commitados, não uma certificação GitHub ou de homologação. A atribuição exata dos106 checks históricos não é recuperável do relatório antigo; as reproduções atuais atribuíram suas falhas ao health.

Relatório local corrigido SHA256: `dc294051a939fac0a283b95cec4df8809fa0a4f99e5bdbc9781f26bdce8366b4`.
Comparação SHA256: `c4325a70cb2326331ad6ca5d0e88d5968a74bb83ff5c295ca6bb3589aa01d70a`.
Pacote local preservado: `/home/ricardo/cvg-his-v4-backups/20260918-p0-closure/`.

## Primeiro CI da remediação e correções

O [CI35405157837](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35405157837), em `9ee1b66f0e94fcb34aed14ff465047f7a7e500ac`, confirmou **69.536/69.536 checks, zero falhas,16 predicados e nove SLOs**. Health máximo32,17ms contra50ms. Relatório SHA256 `55533def88cc3aba6913e2a25a6aaa522238da9274dd78a3ae770a396a35187d`.

Os percentuais de cobertura global passaram, incluindo82,03% de branches, mas um teste ainda contava três atestações sem distinguir o novo relatório de segurança. Correção revisada exige três imagens, um relatório, digests/flags e ordem: **18/18 testes**. Integração teve619 aprovados e quatro falhas: o fixture dependia de EXECUTE público revogado pela suíte. Inicialização pelo reconciliador real resolveu a reprodução, com **24/24 testes PostgreSQL**, sem mudar grants de produção. Assertivas de imutabilidade agora exigem a constraint exata. Os testes mantêm sua sequência declarada no arquivo.

Esses resultados pertencem ao CI anterior ou à verificação local identificada; a revisão atual exige novo CI completo.

## Correção da gravação do fixture V8

O CI35407060110 expôs uma falha intermitente no teste de reexports: o checkpoint explícito de cobertura e a gravação automática na saída podiam compartilhar o nome com resolução de milissegundos. O segundo dump, após o reset dos contadores, sobrescrevia o primeiro. Os registros brutos foram preservados: reprodução29/30, com uma falha; controle corrigido30/30, cada caso com um único dump autenticado.

O fixture usa agora apenas a gravação real na saída. As assertivas de scriptId/URL, fonte, live=1, never=0, métricas vazias e agregação permanecem. Revisão independente PASS, contratos relacionados71/71 e comando exato do CI64/64. Nenhuma mudança no coletor de produção ou em thresholds. A revisão publicada exige novo CI completo.

## Revisão e requisitos pendentes

Revisor independente do builder identificou e verificou a correção da cascata e da validação SQL anterior à escrita do manifesto. Revisões também cobriram o cache k6, assinatura de segurança e comandos consumidores. Não se declara revisão em contexto novo: a abertura desse agente foi recusada pelo limite de threads.

Durante a revalidação, o registro ficou temporariamente com 13 P0 abertos. A prova anterior de PostgreSQL foi marcada stale e agora foi substituída por evidência fresca, preservando o histórico. O resultado atual é 11 abertos e 3 fechados. O CI anterior [35356621431](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35356621431) é histórico, pertence a b81e8655 e não foi promovido a prova do novo código.

Ainda são necessários ambiente descartável aprovado, configuração de acesso, limites de carga/soak/RPO/RTO, usuários hospitalares para UAT e responsáveis Product/Clinical/Security/Operations para go/no-go. O GitHub mostrou apenas a conta do owner como colaboradora; foi solicitado outro revisor antes de exigir aprovação independente. Políticas de proteção foram preparadas, sem presumir aplicação remota.

Nenhum resultado local ou de CI fecha critérios de target aprovado, UAT ou autoridade. Na geração deste relatório, o pipeline de release 35410186891 estava verificando a atestação real. Emissão de atestação isolada não foi tratada como verificação concluída; o status posterior deve ser consultado na execução do workflow.
