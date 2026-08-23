# Auditoria integral do corpus documental

Data da leitura: 2026-08-22
Escopo: todos os 1.445 arquivos sob `docs/`, incluindo arquivos compactados e imagens de referência Vetus.

## Cobertura determinística

| Estrato | Arquivos | Leitura/inspeção | Impressão de integridade |
| --- | ---: | --- | --- |
| Camada ativa raiz, ADR, SOC 2, Game Day e micro-builds | 67 | 10.290 linhas; 530.758 bytes | `c023c063d601478da84388102c3567a2ff3203f34a80095b8dce384ba93d84f3` |
| `docs/docs2/archive-documentation-reset` | 350 Markdown | 57.782 linhas; 2.907.408 bytes | `56b77ae5415abf63787ac390270b616ec68f5a1abac1ced82c965b3858d86578` |
| `docs/docs2/archive-active-reset` e README | 240 | 237 textos/Markdown e os 30 Markdown internos do gzip lidos; JSON analisado | `c30046aec26604bb9ccf5ea11b4c9b4425d91b52e589f2fc5d9f95e2149142f8` (nomes) |
| Outros arquivos históricos de `docs/docs2` | 245 Markdown | 59.427 linhas; 2.388.972 bytes | `76856306db7c8e5c57a24dbc04f81d7c51fb5cd7ad8509abee7bd57bd2e6bb1a` |
| Guias, módulos, screenshots e README do Vetus | 219 | 67 Markdown/24.189 linhas e 152 PNG; 92 estados visuais distintos inspecionados | Markdown `0b844277484f4e4b291a46b647b63f5943c8c7ab1692e31955f173241e420f17`; PNG `a40e0887e03f6e00a5b7cfd94ed4cd8f58be9bfae75c4612e2615efe915f8190` |
| Inspeção técnica Vetus | 324 | 128 JSON analisados, 67 HTML lidos, 103 PNG inspecionados e 26 Markdown lidos; 32.871.752 bytes | 280 hashes únicos; 31 grupos duplicados/44 redundâncias |

Os números totalizam exatamente 1.445 arquivos no topo lógico do corpus. Hashes são marcadores de cobertura/reprodutibilidade, não prova de que o software implementa as afirmações contidas nos documentos.

## Autoridade reconciliada

1. Comportamento executado, testes atuais e estado persistido têm precedência sobre qualquer documento.
2. A camada documental ativa é a tríade de 2026-08-07:
   - `docs/2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md`, seção final 10;
   - `docs/2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md`, seção final 13;
   - `docs/2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md`, seção final 13.
3. Os dois documentos não rastreados de 2026-08-10 sobre primeiro acesso e segurança são uma sobreposição candidata, não uma nova decisão de release.
4. Julho e `docs/docs2` são históricos: preservam requisitos, contradições e pistas de investigação, mas não provam conclusão atual.

## Verdades atuais extraídas

- O gate local G0 passou historicamente; G1/G2/G3 continuam parciais, G4 está pendente e G5 bloqueado.
- O score estrutural de prontidão é 95/100, mas a paridade estrita permanece em 0/11 áreas gerais e 0/3 clínicas. Presença de arquivos ou telas não substitui uma jornada funcional.
- Go-live de produção não está autorizado.
- O próximo encadeamento obrigatório é: instalação/sessão segura; encontro clínico até recebimento atômico; espinha de verificação; paridade; homologação de provedores; certificação operacional.
- O produto-alvo preserva o fluxo rápido cliente/animal, agenda e comanda do Vetus, mas requer estados explícitos, privacidade, acessibilidade, profundidade hospitalar/laboratorial/financeira e uma experiência única em vez da divisão beta/legado.
- A inspeção Vetus encontrou tokens persistidos em `localStorage` e transportados em query string, PII sem mascaramento, 23 hosts externos e ausência de prova negativa/mutável. Essas são referências anti-padrão e não devem ser copiadas.

## Contradições e documentos inseguros

- `docs/430` está obsoleto; ADRs divergem entre `apps/web`/`apps/spa` e caminhos de banco.
- O Game Day sugere escrita em memória durante falha do banco, contrariando a política ativa de falha fechada. Não executar o runbook sem correção e nova autorização.
- Afirmações SOC 2 e gates de CI não bloqueantes não possuem evidência suficiente para uma declaração de conformidade.
- Há referências quebradas e um segredo histórico literal em documentação de julho; ele não é reproduzido aqui e deve ser tratado como potencialmente exposto.
- A sobreposição de setup de 2026-08-10 propõe registrar token de bootstrap, contrariando a barra de segurança congelada.

## Implicação para aceitação

O programa exige oito jornadas E2E em PostgreSQL real, sem atalhos de API, `retry` ou `skip`, incluindo reinício, dois tenants, concorrência e injeção de falha. Evidência estrutural antiga permanece útil para descoberta, mas todas as decisões de PASS precisam ser vinculadas à revisão e ao ambiente observados.

## Reauditoria de continuidade — 23 de agosto de 2026

O inventário determinístico foi reexecutado após os checkpoints de API-key e
documentação. O corpus então continha 1.447 arquivos, 90 diretórios e
53.728.402 bytes: 995 Markdown, 255 PNG, 129 JSON, 67 HTML e 1 gzip. Foram
identificados 1.191 arquivos textuais para leitura/varredura; a classificação
por caminho separa 46 arquivos ativos raiz/especiais, 23 notas de
`micro-build/`, 543 arquivos de referência `vetus/` e 835 arquivos históricos
em `docs2/`. O hash do manifesto ordenado desta execução é
`52ab7100d5272df769f61fb6323da250987b10f404a9fb8fc0fdf4198d19c5bf`.

A autoridade não mudou: runtime/testes e estado persistido vencem documentos;
`docs/README.md`, `docs/430-fonte-de-verdade-documental.md` e a camada ativa de
agosto vencem julho/Vetus/`docs2`; Vetus é referência de produto e não prova de
implementação. A reauditoria também confirmou que o backlog e o ExecPlan
tinham ponteiros de retomada atrasados em relação ao `CVG-002B2B`; o checkpoint
de 23/08/2026 é agora o ponto de entrada curto e o próximo slice continua sendo
DLQ operacional, política multi-réplica e projeção mínima do principal.

Limitações: o manifesto registra nomes, tipos, tamanhos e hashes; imagens e o
gzip são inventariados, não convertidos em requisito executável. A pesquisa de
mercado permanece em `docs/2026-08-22-auditoria-integral-e-pesquisa-erp.md`.

## Recontagem pós-DLQ — 23 de agosto de 2026

Após a inclusão do runbook `docs/runbooks/pix-settlement-dlq.md` e dos
checkpoints de reconciliação, a recontagem intermediária do working tree
encontrou 1.449 arquivos, 90 diretórios e 53.746.820 bytes sob `docs/`: 997 Markdown, 255 PNG,
129 JSON, 67 HTML e 1 gzip. A auditoria textual/hash de 1.447 arquivos
continua sendo a última leitura integral do corpus; esta atualização é uma
recontagem de inventário e não transforma imagens ou histórico em requisitos
executáveis. O checkpoint vigente é
`docs/2026-08-23-checkpoint-continuacao.md`, e os dois novos artefatos
operacionais são cobertos por testes e pelo handoff do DLQ.

## Recontagem e correção de autoridade — 23 de agosto de 2026

Uma verificação read-only posterior confirmou 1.449 arquivos, 90 diretórios e
53.746.820 bytes naquela revisão intermediária. A fonte de verdade `docs/430-fonte-de-verdade-documental.md`
agora aponta para o checkpoint curto de 23/08; o handoff de 22/08 permanece
como histórico detalhado. Esta verificação não relê integralmente os 1.449
arquivos e não promove nenhum requisito de produto a comportamento comprovado.

## Recontagem após a consolidação desta sessão — 23 de agosto de 2026

Depois da inclusão do artefato de principal/rate-limit, das regressões e desta
atualização de controle, a soma dos tamanhos dos arquivos sob `docs/` é
53.750.467 bytes: 1.449 arquivos, 90 diretórios, 997 Markdown, 255 PNG, 129
JSON, 67 HTML e 1 gzip. A contagem exclui o diretório raiz `docs/`; não é uma
nova leitura integral do corpus.
