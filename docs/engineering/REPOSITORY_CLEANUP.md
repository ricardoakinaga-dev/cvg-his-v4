# Limpeza do repositório

Status: arquivamento e auditoria de integridade concluídos; resultados funcionais delimitados pela versão verificada.

O programa ativo usa `apps/api`, `apps/spa`, `apps/worker`, 67 pacotes,
`packages/db/migrations` e `infra/helm/cvg-his-v2`. Identificadores V2 usados
pelo runtime são compatibilidade ativa e foram mantidos.

O arquivo `legado/manifest.json` registra origem, destino, tamanho e SHA-256 de
cada item arquivado. A conferência integral validou 80.213 entradas e
9.347.960.819 bytes, sem divergências de hash e sem fontes órfãs reaparecidas
na árvore ativa. Foram preservados históricos documentais, trilhas antigas
de SQL/Helm, fontes sem consumidores, pacotes predecessores, capturas externas,
scaffolds vazios, outputs antigos e controles de sessões anteriores. Nada foi
apagado definitivamente. Outputs antes ignorados pelo Git permanecem locais.
Links simbólicos foram preservados sem seguir seus destinos; o hash corresponde
ao texto do alvo. A restauração deve verificar o hash e não sobrescrever um
caminho original que tenha sido recriado por outra execução.

## Decisões de manutenção

| Superfície | Decisão |
| --- | --- |
| API, SPA, worker e pacotes atuais | Mantidos; grafo de imports, exports, entrypoints, testes e referências dinâmicas inspecionados. |
| Scripts, infraestrutura, ferramentas e benchmarks | Mantidos quando consumidos por comandos, testes, CI ou procedimentos ativos; capturadores externos Vetus arquivados. |
| Migrations e Helm | Somente trilhas canônicas ativas; guards rejeitam reintrodução das trilhas antigas sem depender do arquivo legado. |
| Documentação | Baseline de 06/09, políticas, contratos, specs, ADRs, runbooks e templates permanecem; relatos superados ficam no arquivo. |
| Qualidade | Contrato de 30 subcritérios preservado em `quality-subcriteria.json`; teste do CI permanece ativo. |
| Evidência de cobertura | Manifesto reconciliado com fontes atuais, sem reduzir thresholds ou conceder cobertura não executada. |
| Dependências, segredos locais e builds atuais | Preservados; caches/outputs novos são resultados das verificações, não comprovação histórica de release. |
| Novos controles de outra execução | Preservados como trabalho ativo; não confundir com os históricos já arquivados. |

`legado/` é excluído de Docker, Prettier, ESLint, Semgrep, buscas usuais e
inventários de fontes. Workspaces e configurações de build/teste usam somente
as árvores ativas. Citações históricas não são dependências operacionais.

## Evidências disponíveis

- Compilação e lint completos no repositório; 1.143 testes unitários aprovados.
- Cópia isolada sem legado, outputs anteriores, caches ou `.env`: instalação
  offline com lockfile congelado e compilação completa aprovadas, inclusive
  após atualização da cópia com mudanças concorrentes.
- Fluxo clínico no navegador aprovado nessa cópia: tutor, paciente, atendimento,
  entrada clínica, cobrança e fechamento, com API/SPA próprias e dados em memória.
- Repetição final de API/worker: 563 e 140 testes aprovados, respectivamente.
- SPA: 1.521 testes aprovados na cópia isolada; mais 98 testes nas cinco suítes
  afetadas pelas mudanças concorrentes de composables, formulário e design system.
- Quatro testes PostgreSQL aprovados em clusters temporários próprios, incluindo
  repetição da preparação de schema/seed e encerramento do processo pertencente ao teste.
- Ferramentas documentais, namespaces, deploy, backup, critérios de qualidade,
  integridade do manifesto e inventário validados sem dependência do arquivo.

A suíte ampla de ferramentas encontrou duas falhas no conversor V8 com Node
24.20.0, reproduzidas também no repositório original em código não alterado pela
limpeza. Outras falhas foram resolvidas com o carregador TypeScript exigido e
os diretórios explícitos do PostgreSQL temporário. Testes exclusivos de Windows
não executam neste host Linux. Isso não constitui certificação global de
cobertura, providers, produção ou paridade Vetus.

Uma execução concorrente de frontend continua alterando fontes. A cópia foi
atualizada e os resultados estão vinculados aos 2.211 arquivos registrados em
`artifacts/repository-cleanup/validated-source-snapshot.json`; diferenças
posteriores são registradas em `concurrent-source-drift.json`. Essas mudanças
ativas foram preservadas. A conclusão da limpeza não certifica alterações
posteriores, nem exige arquivar evidências do trabalho ainda em execução.

Logs preservados em `artifacts/repository-cleanup/verification-logs/`. O arquivo
`archive-integrity.json` registra a identidade do manifesto conferido.

Detalhes e procedimentos de recuperação: `.agent/plans/repository-cleanup.md`.
Integridade e inventário atual: `artifacts/repository-cleanup/`.
