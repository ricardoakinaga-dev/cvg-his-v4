# Unificação da main — 2026-09-18

## Escopo e histórico preservado

Pedido: revisar as melhorias de todas as branches, preservar as importantes e
deixar somente `main`. Baseline remota: `97d22de041c6474f8b30ea11264d0576da8a1493`.
O histórico completo foi salvo e verificado com `git bundle verify` em
`/home/ricardo/cvg-his-v4-backups/20260918-unification/before-unification.bundle`.
O bundle é um artefato local de recuperação, não uma alegação de backup externo.

| Branch antes da consolidação | Tip | Decisão baseada no conteúdo |
| --- | --- | --- |
| `codex/state-of-art-hardening-20260917` | `4c8200f2` | Ancestral de main; alterações preservadas |
| `codex/state-of-art-hardening-final-20260917` | `4c8200f2` | Mesmo ancestral; alterações preservadas |
| `fix/state-of-art-ci-assurance` | `fe5406c2` | Ancestral de main; alterações preservadas |
| `codex/state-of-art-hardening-final-ci-20260917` | `14f9c589` | Deltas úteis já incorporados; migration alternativa rejeitada |
| `main` local divergente | `b7e10072` | Melhorias incorporadas ou superadas pela main remota |
| `codex/triple-a-evidence-graph-import-20260917` local | `97d22de0` | Mesmo tip da baseline remota |

Uma revisão independente conferiu os 68 caminhos alterados na main local desde
o ancestral comum. Os patches de flags, autoridade por tenant, auth, tipografia,
snapshots, cobertura e CI estão preservados na main canônica. Os relatórios
históricos de CI 205/212/214/215/217 são idênticos nos dois históricos.

Na branch final-ci, os patches `59bbb1ac`, `8098e8be` e `271bc3c3` já estão em
`7df561ba`, `4e328b0a` e `686c47d0`. A migration alternativa `89128e01` registra
como trigger uma função `RETURNS void`; também conflita com a migration 0175
canônica e perde o endurecimento de 0176. O teste SQL `14f9c589` cobre somente
essa família alternativa; main já cobre as migrations canônicas. Documentação
com identidades antigas e gatilhos de CI para branches temporárias não são
melhorias pendentes. Nenhum cherry-pick adicional é necessário.

## Falhas reais da baseline

O [CI 35311529944](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35311529944)
falhou em três jobs. Logs e artefatos foram obtidos pelo GitHub API:

- Cobertura global: 2.926 testes passaram; branches 81,97%, contra 82% exigidos.
- Cobertura crítica: dois testes de fallback OpenAPI não ocultavam o YAML
  encontrado por caminhos relativos ao módulo no ambiente Node.
- Performance: query p95 202ms, contra 150ms; demais SLOs bloqueantes passaram.

## Reparos e verificação local

Os testes OpenAPI simulam indisponibilidade de todos os candidatos YAML e
restauram os bindings de filesystem após cada execução. Testes de gateways
cobrem idempotência, duração padrão e falhas de transporte com valores que não
são `Error`. Revisão independente I1 aprovou esses três arquivos após executar
20 testes em jsdom e 5 em Node, com hashes pré/pós idênticos.

Build, typecheck e lint passaram. A coleta crítica local posterior executou
2.965 testes: os testes OpenAPI passaram; uma falha restante identificou que o
teste WebAuthn tentava corromper uma assinatura trocando seu último caractere
base64url por `A`, operação que nem sempre altera os bytes assinados. Essa
primeira falha é preservada no log `critical-unit.log` do pacote local. O teste
agora inverte um byte da assinatura decodificada; a regressão WebAuthn passou
14/14 e a nova coleta unitária crítica passou **2.965/2.965**.

Os testes de despesas acrescentam rejeições de duplicatas/recursos ausentes,
filtros e paginação usando armazenamento temporário real. A coleta nativa da
API passou **679/679**, sem skips. Os testes de assinatura, caching e fallback
receberam revisão independente I1 com hashes pré/pós idênticos.

A coleta global após os testes de gateways passou com **2.928 testes** e
**82,01% de branches (8.158/9.947)**; os três skips existentes permanecem
explícitos. Essa coleta antecede a otimização OpenAPI; o CI final deve validar
novamente o conjunto completo. O gate crítico de 85% requer a união válida dos
cinco shards e das evidências especializadas; dois shards isolados não o provam.

O perfil de CPU identificou 17,24 segundos gastos na serialização repetida de
OpenAPI. A resposta JSON estática agora é serializada uma vez por processo,
preservando bytes, status, headers, YAML e fallback. Não há cache de sessão,
permissões ou dados de tenant nessa mudança.

| Teste local, workload `operational-minimum-v1`, até 60 VUs | Query p95 | Resultado |
| --- | --- | --- |
| Baseline com profiler | 210 ms | FAIL |
| JSON em cache, com profiler | 9 ms | 9/9 SLOs PASS |
| JSON em cache, confirmação sem profiler e com novo seed | 79 ms | 9/9 SLOs PASS |

A confirmação final teve zero erros e 100% de disponibilidade. O host e o
trabalho paralelo introduzem variância; esses números são evidência local e
não substituem o job remoto. Fonte, massa de dados, workload, limites e
autenticação foram mantidos. PostgreSQL/Redis descartáveis foram removidos.
Varredura de segredos e lint final da API passaram.

## Publicação e segunda rodada de performance

O commit `6e724d07` foi publicado por fast-forward. As quatro branches remotas
reconciliadas foram removidas atomicamente; as duas branches locais redundantes
também foram removidas após destacar a worktree limpa. A main local foi
sincronizada; `git ls-remote --heads origin` e a enumeração local confirmaram
somente `main`. O bundle anterior foi novamente verificado antes da operação.

O [CI 35343988828](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35343988828)
confirmou cobertura global de **82,02% de branches**, 2.928 testes aprovados e
três skips existentes. Segurança, dependências, tipos, lint, build, contratos,
testes unitários, integração, E2E e regressão visual passaram. O benchmark
remoto falhou: **query p95 191ms**, limite 150ms; 8/9 SLOs passaram, sem erros
HTTP. A revisão independente reprovou a aceitação automatizada desse snapshot.
O resultado local de 79ms não foi usado para sobrepor essa falha.

O mesmo CI terminou com falha no gate crítico: os cinco coletores passaram,
mas a promoção rejeitou o manifesto ainda ancorado em `97d22de0`, anterior às
mudanças de código. O refresh antes do commit atualizou hashes, porém não
poderia conhecer o futuro SHA de fonte. O reparo é executar o refresh canônico
com `--head` explícito **após** o commit de fonte, seguido por commit somente de
documentação/manifesto. As verificações de identidade e ancestralidade continuam
intactas. Nenhum resultado rejeitado foi promovido como cobertura aceita.

O artefato remoto não mostrou contenção relevante por locks ou I/O de banco.
Uma reprodução com API, PostgreSQL, Redis e k6 nos mesmos quatro CPUs lógicos
identificou custos de CPU no histórico de auditoria (5,051s em `write`) e na
retenção de métricas (2,329s em `pruneSloObservations`). O gerador de carga
também gasta CPU ao interpretar OpenAPI; seu workload permanece intacto.

A auditoria agora acrescenta eventos ao final do armazenamento interno e
materializa snapshots na ordem pública original, inclusive após refresh por
account e empates de timestamp. Nenhuma operação de persistência mudou.
A retenção SLO usa um cursor e compactação amortizada, preservando os últimos
20 mil registros ativos e as mesmas janelas de 5 minutos/1 hora. O armazenamento
de apoio fica abaixo de 40 mil posições; registros retirados dos cálculos podem
permanecer na memória até a próxima compactação. São apenas timestamps, duração
e status HTTP, sem payload de pacientes.

Manter o deslocamento por requisição preservaria o custo medido. Uma estrutura
circular introduziria mais estados/índices sem necessidade para esse limite.
Foi escolhido o cursor local, sem novas dependências, migrations, cache de
autoridade ou mudança de contrato. A reversão é uma alteração de código normal.

Os 50 testes focados de métricas/SLO e os 32 de auditoria passaram. A crítica
independente executou 35 testes e aprovou os quatro arquivos com fingerprints
pré/pós idênticos. A atualização canônica do manifesto crítico retornou `noop`:
esses dois arquivos não pertencem aos 555 caminhos congelados; o escopo de
cobertura permanece inalterado.

A cobertura global integrada passou com **2.932 testes, três skips existentes
e 82,03% de branches**. A nova coleta nativa da API passou **679/679**, sem
skips, com migrate/seed em PostgreSQL privado; run
`68e1c454-1843-4df4-b1fb-d3cc2e8cdd91`. O build integrado também passou.
O perfil seguinte reduziu o tempo próprio de `audit.write` de 5,051s para
0,536s; `pruneSloObservations` deixou de registrar tempo próprio amostrado.
A comparação de latência desse perfil teve interferência de carga concorrente
do host e não é usada como melhoria percentual de latência.

Na confirmação final sem profiler, com novo seed e quatro CPUs, passaram
**9/9 SLOs**, query p95 **29ms**, API p95 **26,44ms**, zero erros HTTP,
100% de disponibilidade e **4.322 iterações**. A carga e os limites são os
originais; o resultado continua sendo local e requer confirmação remota.

Fonte final: `d8d8b82196be8d29c6a06e7d3c15633bd06b5627`. O manifesto foi então
reancorado nesse SHA pela ferramenta canônica, revision83, sem mudar os hashes
dos 555 caminhos. O CI do novo candidato permanece pendente até publicação e
resultado terminal. A união diagnóstica dos cinco relatórios brutos do CI
anterior mostrou os 40 indicadores acima de 85%, mas não foi promovida nem
tratada como aceitação: somente a execução com identidade válida fecha o gate.

## Limites da conclusão

A consolidação do Git não concede certificação operacional. A régua
`QUALITY_BAR_V1.json` exige evidências atuais de target, UAT, recuperação,
proveniência e autoridade de release. O estado continua **BLOCKED / NOT PROVEN**
enquanto essas exigências não forem satisfeitas. Thresholds, escopo de cobertura,
workload k6 e controles de autenticação permanecem congelados.

Plano e critérios executáveis:
`.agent/plans/main-unification-20260918.md`. A consolidação Git está concluída;
a aceitação automatizada depende do CI final exato, e a certificação operacional
continua sujeita às evidências externas acima.
