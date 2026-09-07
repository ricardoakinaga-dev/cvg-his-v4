# R05-010 — Reconciliação de identidades de fonte

Data: 06/09/2026. Estado: correção de medição revisada e aplicada; cobertura
integrada continua **FAIL**, sem certificação do ERP.

O manifesto anterior continha 616 entradas, incluindo 41 arquivos JavaScript
gerados junto dos seus 41 originais TypeScript. Uma correção anterior removeu
essas cópias do runtime, mas deixou suas entradas na lista de fontes exigidas.
O novo teste de integridade reproduziu a inconsistência: 41 caminhos ausentes.

A conferência de cada par provou que o original TypeScript já estava no
manifesto, com hash atual e todos os componentes exigidos pela cópia gerada.
Os hashes do JavaScript retirado e de seu mapa foram conferidos diretamente
no Git histórico. A compilação de 23 originais históricos reproduziu as cópias;
18 cópias estavam desatualizadas. Por exemplo, `accounts.js` não tinha a chave
estrangeira de tenant nem o índice que já existiam em `accounts.ts`.
Essas cópias não são código atual adicional a ser medido.

A correção mantém **575 fontes ativas e 41 registros de artefatos retirados**,
preservando as 616 identidades históricas. Nenhum original TypeScript, SQL ou
Vue foi retirado. As 575 entradas restantes permaneceram idênticas, inclusive
hashes, componentes e aplicabilidade. Permanecem os cinco shards e o mínimo
de 85% em cada métrica crítica. As 197 entradas SQL e 25 Vue continuam com
aplicabilidade especializada pendente; não foram dispensadas.

O novo campo `retiredGeneratedArtifacts` registra caminho/hash anteriores,
fonte canônica, componentes, commit histórico e hash do mapa. `scopeHistory`
registra a migração e o digest anterior. A troca do digest do manifesto invalida
a reutilização dos shards antigos, como já exige o gate.

## Revisão e verificação

O crítico `critic_source_identity`, I1 em contexto vazio e somente leitura,
aprovou a proposta exata após verificar os 41 pares no Git e preservar todas
as outras entradas. Hashes pré/pós inalterados:

- manifesto anterior: `cb015b0629b45ad085da7a2a36c3997f766c78a77dd385e11f1eee188bd4e8e1`;
- manifesto aplicado: `53c0508f846732e19e805bb1be493de2c9490f52f3f8ed49e8a2199828fad046`.

O teste de integridade passou após a correção e entrou no CI. A regressão de
identidade, resolução Vite, checker e finalizador passou **67/67**, sem skips.
O gate real continua falhando por evidências/aplicabilidades pendentes; nenhuma
aprovação histórica foi promovida pela correção da lista.

Limitação do guard: ele valida existência/hash dos arquivos ativos e relações
de aposentadoria fornecidas, mas não autentica sozinho o histórico Git nem
prova a completude de futuras alterações simultâneas do manifesto e do registro.
Alterações de escopo continuam sujeitas a comparação e revisão independente.

Artefatos locais em `artifacts/consolidacao-2026-09-05/source-identity-reconciliation/`:
`audit.json`, `manifest-before.json`, `manifest-proposed.json`, `identity-red.log`,
`regression.log` e `current-gate.json`.
