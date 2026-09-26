---
document_status: supporting
document_kind: improvement-backlog
effective_date: 2026-09-23
owner: Liderança técnica, Produto, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-task-completion-or-blocker-change
---

# Backlog executável — 50 melhorias

[Auditoria](2026-09-23-relatorio-auditoria-repositorio.md) · [Lista priorizada](2026-09-23-lista-50-melhorias.md) · [Plano executivo](2026-09-23-plano-executivo-melhorias.md) · [Roadmap](2026-09-23-roadmap-melhorias.md)

## Contrato de execução

Os 50 itens abaixo são **propostas**, não 50 tickets novos automaticamente abertos. Antes de executar, mapear cada `M-xx` para o `REM` existente em `.agent/backlog.json` ou justificar um novo item. `.agent` continua a fonte mutável de status; este arquivo define escopo, dependência e aceite. Owners são funções sugeridas, sujeitos a designação real.

**Pronto para iniciar:** escopo, ambiente, dados sintéticos, contrato, dependências e autoridade conhecidos. **Concluído:** comportamento ou artefato observado na fronteira correta, checagem proporcional aprovada, evidência com SHA/ambiente/data, documentação sincronizada e nenhuma aprovação pendente. `BLOCKED`/`NOT_PROVEN` não equivale a `DONE`. Dependências nesta tabela são IDs `M` e não precisam impedir preparação independente.

## Alta prioridade

| ID | Owner sugerido | Depende de | Entrega e aceite observável |
| --- | --- | --- | --- |
| M-01 | Plataforma | — | Backup recuperável das refs/diffs; reconciliação local/remota documentada; commits exclusivos preservados; refs de publicação sem blob ≥100 MiB. |
| M-02 | Liderança técnica | M-01 | Checkout limpo com SHA e manifesto de evidências; `git status` sem mudanças pertinentes; identidade única usada nos gates. |
| M-03 | Operações/QA | — | Validador de backup e teste de mutação referem W3/REM-024; `ops:backup:check` passa; ensaio real continua pendente em M-14. |
| M-04 | DBA/Operações | — | Credencial de migração funciona em banco descartável com privilégio mínimo; segredo ausente de Git e logs. |
| M-05 | DBA/Backend | M-04 | Migration 0175 aplicada e verificada em banco isolado; schema esperado e caminho de rollback/mixed version documentados. |
| M-06 | Backend | M-05 | API com PostgreSQL/Redis reais responde `/ready` com sucesso e executa fluxo persistente; modo memória claramente identificado. |
| M-07 | QA/Plataforma | M-05, M-06 | Comando canônico roda raiz, workspaces e integração isolada; falha induzida na raiz derruba o gate. |
| M-08 | QA/Backend | M-07 | Relatório fresco de coverage ≥82% em branches, sem novos excludes injustificados; casos críticos identificados. |
| M-09 | Plataforma | M-02, M-07, M-08 | CI remoto termina verde no SHA exato com logs/artefatos de todos os gates obrigatórios. |
| M-10 | Plataforma/Segurança | M-09 | Digest OCI, SBOM, scan, assinatura e attestations apontam ao mesmo SHA; promoção por digest sem rebuild. |
| M-11 | DBA/Segurança | M-05, M-10 | Testes target com roles reais provam RLS/FORCE RLS, leitura/escrita cross-tenant negadas e exceção justificada. |
| M-12 | Backend/Operações | M-06, M-10 | Worker reinicia/redeliver sem perda ou efeito externo duplicado; logs e dados comprovam idempotência. |
| M-13 | Produto/QA | M-06, M-11 | Jornada cadastro→agenda→prontuário→comanda→recebimento→estoque→auditoria reproduzida em banco real com critérios de domínio. |
| M-14 | Operações/DBA | M-03, M-10 | Restore/rollback em alvo aprovado; hashes, contagens, isolamento tenant e RPO/RTO medidos contra limites aprovados. |
| M-15 | Operações/QA | M-10, M-13 | Perfil de carga/soak aprovado; latência, erros, capacidade e alertas registrados no target. |
| M-16 | Produto/QA | M-13 | As sete áreas antes bloqueadas têm casos sucesso/falha por domínio; matriz passa de 4/11 para 11/11 com prova funcional. |
| M-17 | Produto/Backend | M-10 | Cada provider crítico homologado com ambiente/contrato, erro, timeout e reconciliação; simulação rotulada separadamente. |
| M-18 | Produto/QA/A11y | M-13, M-16 | UAT por papel e revisão assistida de teclado/leitor de tela; defeitos e aceites vinculados ao candidato. |
| M-19 | Segurança/Release | M-09–18 | Cada P0 fechado por seu critério real; registry, Quality Bar e `.agent` reconciliados no mesmo SHA, sem exceções implícitas. |
| M-20 | Autoridades de release | M-19 | Go/no-go formal com risco residual, aceite de Produto/Operação/Segurança-DPO e candidato identificado. |

## Média prioridade

| ID | Owner sugerido | Depende de | Entrega e aceite observável |
| --- | --- | --- | --- |
| M-21 | Backend | M-07 | `server.ts` dividido por boundaries; contratos HTTP, auth e regressão focada preservados; complexidade medida. |
| M-22 | Frontend | M-07 | Páginas grandes separadas em componentes/estado por domínio; fluxos e responsividade regressados. |
| M-23 | Arquitetura | M-21, M-22 | Inventário de hotspots inclui arquivos >2.000 linhas relevantes; guard e owners versionados. |
| M-24 | Frontend/Produto | M-22 | Loading, vazio, erro e recuperação demonstrados em fluxos críticos, inclusive mobile. |
| M-25 | Frontend/QA | M-18, M-24 | Automação a11y e revisão manual de foco/semântica/leitor de tela com defeitos rastreados. |
| M-26 | Backend/Frontend | M-06 | Erros, paginação e idempotência documentados no OpenAPI; cliente e API testados juntos. |
| M-27 | Backend/Segurança | M-06 | Upload nega tipo/tamanho/acesso inválido; falha de storage segura; auditoria e contrato cobertos. |
| M-28 | QA/Segurança | M-11 | Casos negativos tenant para API, jobs, relatórios, exportações e arquivos passam com roles reais. |
| M-29 | QA | M-07 | Skips inventariados; cada remoção tem fixture/shard; policy rejeita skip não autorizado. |
| M-30 | Plataforma | M-02 | Helm versionado executa lint/template com values dev/staging/prod e known-bads, além do validador estático. |
| M-31 | DBA/DX | M-04 | Preflight informa credencial/schema/migration incompatível antes da API ou teste, sem expor segredo. |
| M-32 | DBA/Backend | M-05 | Install/upgrade/rollback/mixed version e lock em banco sintético descartável; resultados e limites documentados. |
| M-33 | Operações/Backend | M-13 | Trace/metric/log correlacionam jornada crítica; alerta dispara em falha conhecida sem PII. |
| M-34 | Operações | M-33 | SLOs aprovados e runbooks API/worker/DB/provider executados em simulação controlada. |
| M-35 | Backend/Financeiro | M-17 | Timeout, duplicidade e callback fora de ordem de pagamento convergem ao saldo esperado com trilha auditável. |
| M-36 | Produto/QA | M-13 | Relatório/exportação respeita papel, filtros, datas e volume representativo; saída conferida contra dados fonte. |
| M-37 | Release/QA | M-02 | Snapshots e docs declaram SHA/ambiente corretos; evidência antiga não aparece como prova corrente. |
| M-38 | Arquitetura/DX | M-07 | Todos os pacotes aplicáveis têm lint semântico; saída separa lint, typecheck e geração; CI usa scripts canônicos. |
| M-39 | Plataforma/DX | — | Node/pnpm suportados versionados; instalação frozen reproduzível sem engine mismatch. |
| M-40 | Produto/Segurança | M-11 | Matriz papel×ação aprovada; testes de menor privilégio e auditoria em fluxos clínicos/administrativos. |

## Baixa prioridade

| ID | Owner sugerido | Depende de | Entrega e aceite observável |
| --- | --- | --- | --- |
| M-41 | Documentação | — | Quatro links históricos resolvem para destino preservado ou são corrigidos com nota contextual. |
| M-42 | Documentação | M-37 | `docs/README.md` aponta baseline, plano, roadmap, backlog e limites atuais sem contradizer o manifesto. |
| M-43 | Operações/DX | M-01 | Política de retenção/limpeza de artefatos com dry-run, exclusões protegidas e limite de espaço. |
| M-44 | Backend/Frontend | M-21, M-22 | Avisos `any` reduzidos nas fronteiras alteradas, sem casts cegos; typecheck permanece verde. |
| M-45 | QA/DBA | M-32 | Testes FK/migration usam nomes de cenário e expectativa legíveis; falha aponta causa. |
| M-46 | DX/Operações | M-33 | Logs locais mantêm IDs e erros úteis com menor ruído; nenhum dado sensível novo. |
| M-47 | Documentação/DX | M-06 | Guia local explica memória vs. persistência, `/health` vs. `/ready` e preflight para banco. |
| M-48 | Plataforma/DX | M-01 | `.gitignore` e geração impedem novo estado volumoso versionado; fixture confirma comportamento. |
| M-49 | DX | M-31, M-39 | Exemplos de configuração e setup levam a preflight aprovado sem credenciais reais. |
| M-50 | Release/Documentação | M-37 | Changelog por candidato registra SHA, data, ambiente, gates, falhas e limitações, com link a evidências. |

## Sequência de ingestão

1. Reconciliar `M-01…M-50` com os itens operacionais `REM` vigentes (incluindo `REM-056`) e com os P0; registrar mapeamento no controle operacional antes de mudar status.
2. Executar W0 em checkout/ambiente que preserve o estado atual. Preparar banco descartável e credenciais aprovadas para W1.
3. Em cada gate do [roadmap](2026-09-23-roadmap-melhorias.md), anexar evidência da execução no SHA correto e reabrir itens afetados por mudança posterior.
4. Encerrar o programa somente pela Quality Bar e decisão formal, não pela soma de 50 cartões concluídos.
