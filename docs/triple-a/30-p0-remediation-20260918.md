# Remediação dos P0 e dos checks k6 — 2026-09-18

**Fonte do candidato:** `b8609d08813a162ea185b884f126408d64cf7eed`. **CI publicado:** pendente. **Certificação:** BLOCKED / NOT PROVEN.

## Correções

- k6: contadores por cada um dos16 checks, rejeição de evidência ausente/inconsistente e bloqueio com qualquer falha. CI, certificação e comando local usam o parser obrigatório.
- Gerador: cache de uma resposta completa e um booleano por VU. Comparação exata do corpo; qualquer alteração exige nova decodificação integral. Carga, requisições, quatro CPUs, GOMAXPROCS=1, nove SLOs e health<50ms preservados.
- PostgreSQL: migração0177 protege timeline e audit contra UPDATE, DELETE, cascatas e TRUNCATE CASCADE pelo usuário iniciador. Manutenção por owner/superuser continua possível. Exclusão de atendimento com histórico retorna conflito409; rascunhos sem evidência e alterações normais continuam funcionando.
- Release: build antes de typecheck/lint; atestação verificável do relatório de segurança por repositório/workflow/main/SHA/digest; preservação dos diagnósticos de falhas. Ausência de assinatura continua bloqueando.
- Governança: fechamento de P0 exige dependências fechadas; consumidores compartilham lista de17 jobs obrigatórios. Manifesto crítico87 preserva555 fontes anteriores e adiciona0177: **556 fontes,176 migrações,183 artefatos SQL**, sem reduzir thresholds.

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

## Revisão e requisitos pendentes

Revisor independente do builder identificou e verificou a correção da cascata e da validação SQL anterior à escrita do manifesto. Revisões também cobriram o cache k6, assinatura de segurança e comandos consumidores. Não se declara revisão em contexto novo: a abertura desse agente foi recusada pelo limite de threads.

O registro permanece com13 P0 abertos durante a revalidação da nova migração. A identidade foi congelada; a prova anterior de PostgreSQL foi marcada stale. O CI anterior [35356621431](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35356621431) é histórico, pertence a b81e8655 e não foi promovido a prova do novo código.

Ainda são necessários ambiente descartável aprovado, configuração de acesso, limites de carga/soak/RPO/RTO, usuários hospitalares para UAT e responsáveis Product/Clinical/Security/Operations para go/no-go. O GitHub mostrou apenas a conta do owner como colaboradora; foi solicitado outro revisor antes de exigir aprovação independente. Políticas de proteção foram preparadas, sem presumir aplicação remota.

Nenhum resultado local fecha critérios de target, UAT ou autoridade. O relatório será atualizado com as execuções remotas efetivamente observadas.
