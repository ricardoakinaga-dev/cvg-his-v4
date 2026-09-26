# Evidências — auditoria local de 25/09/2026

Relatório: [auditoria completa](../../2026-09-25-auditoria-completa-repositorio.md). Backlog: [50 ações](../../2026-09-25-backlog-50-acoes-auditoria.md).

O objeto é o HEAD `ad2f0373f68635f2579253b013a4382219906921` mais os bytes locais listados no manifesto. Não é uma certificação de produção.

| Arquivo | Conteúdo |
|---|---|
| [execution-summary.json](execution-summary.json) | Estados terminais, horários, contagens, casos do navegador e resultados por arquivo; não soma testes sobrepostos. |
| [validator-summary.json](validator-summary.json) | Saída dos verificadores estruturais, incluindo o bloqueio P0 preservado. |
| [failure-evidence.json](failure-evidence.json) | Trechos selecionados das asserções reprovadas e identificação da falha de navegador. |
| [scorecard.json](scorecard.json) | Componentes I/R/V/O, pesos, notas de 26 áreas e cálculo da nota geral. |
| [backlog.json](backlog.json) | Exatamente 50 ações com prioridade, natureza, evidência, impacto e critério de conclusão. |
| [backlog-validation.json](backlog-validation.json) | Contagem e validação das referências de linha. |
| [inventory.json](inventory.json) | Inventário de fontes, módulos, testes e arquivos extensos. |
| [source-manifest-before.json](source-manifest-before.json) | SHA-256 e tamanho de 2.603 arquivos de código/configuração no início. |
| [snapshot-verification.json](snapshot-verification.json) | Comparação das fontes e do Git antes da publicação do relatório. |
| [database-inspection.json](database-inspection.json) | Consultas somente leitura ao catálogo de bancos sintéticos pertencentes à auditoria. |
| [documentation-recheck.json](documentation-recheck.json) | Revalidação da governança documental depois da publicação. |
| [cleanup.json](cleanup.json) | Encerramento somente dos três containers de propriedade comprovada desta auditoria. |
| [report-validation.json](report-validation.json) | Contagens, notas, links, manifesto de fontes e alterações finais. |

Os logs brutos e traces permaneceram em `/tmp/cvg-audit-20260925`, cuja retenção não é garantida. Esta cópia deliberadamente não inclui arquivos `.env`, valores de credenciais, headers de requisição, corpos de respostas de API ou dumps de pacientes. Os resultados do navegador foram reduzidos a arquivo, nome do caso, estado e duração. Os dados utilizados pelos testes eram sintéticos.

## Como interpretar e reproduzir

As execuções utilizaram Node 22.23.2/pnpm 10.33.0, build do workspace e PostgreSQL/Redis dedicados. Os comandos base foram `pnpm run build`, `pnpm run lint`, `pnpm audit --json`, `pnpm test` e `pnpm exec vitest run --config vitest.integration.config.ts`, além dos verificadores registrados. Preparar previamente banco descartável, migrações e role de runtime é parte necessária da reprodução; não apontar esses testes ao banco operacional.

A primeira configuração de navegador usou portas dinâmicas e provisão incompleta; a repetição utilizou provisão canônica e portas 3111/3112, com oito arquivos selecionados. A prova focal da cadeia API–worker manteve o teste e o produto, mas declarou a configuração sintética de autenticação das métricas exigida no modo staging. A suíte inteira de integração não foi reexecutada depois desse diagnóstico.

Alguns caminhos da aplicação carregam dotenv explicitamente. A execução não constitui promessa de isolamento universal de `.env`. Homologação de fornecedores, aceitação humana, CI remoto, carga e recuperação no alvo não foram realizadas.
