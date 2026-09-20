---
document_status: historical
document_kind: roadmap
effective_date: 2026-09-15
owner: Liderança técnica, Produto e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
superseded_by: docs/2026-09-20-roadmap-nova-rodada-melhorias.md
---

# Roadmap pós-checkpoint — do FAIL21 ao Triplo AAA

[Auditoria vigente](2026-09-15-auditoria-checkpoint-state-of-art-triplo-aaa.md) ·
[Plano executivo](2026-09-14-plano-executivo-state-of-art-triplo-aaa.md) ·
[Backlog vigente](2026-09-15-backlog-pos-checkpoint-state-of-art-triplo-aaa.md)

## 1. Posição de partida

O programa parte de HEAD `324099e5` + worktree rev27, com **1 cartão PROD DONE,
16 BLOCKED e 48 TODO**; cinco itens macro históricos do controlador ficam fora
dessa contagem. Dez pacotes anteriores foram aceitos localmente, mas não
dez cartões integrais. Coverage continua `FAIL21`; auth falha em funções e
branches, roles/RLS em branches. SQL e Vue são candidatos especializados ainda
não promovidos. Release permanece `BLOCKED` e Triplo AAA `NOT PROVEN`.

As ondas abaixo são gates por resultado, não promessa de datas. Preparação pode
avançar em paralelo, mas o aceite só ocorre quando todas as dependências e
autoridades da saída estiverem satisfeitas.

## 2. Sequência executiva

| Onda | Objetivo e cartões | Entrada | Saída verificável / decisão |
|---|---|---|---|
| R0 Integridade do checkpoint | 001, 002, 013, 014, 048, 061 | Pacotes locais e auditoria 15/09 | Narrativa corrigida; retenção com ACL/restauração; incidente DB encerrado; semântica do coverage decidida por QA/release |
| R1 Coverage focal | 014-S1 e 014-S2 | Gate local de 014; instrumento congelado | Testes substantivos nas representações TS e processo, sem exclusões/thresholds reduzidos; auth e roles/RLS preparados para coleta |
| R2 Coleta única e confiança | 010–018, 039 parcial | S1/S2 concluídos, worktree congelado e decisão do instrumento registrada | Refresh de identidade; cinco shards recolhidos/promovidos na mesma janela; SQL/Vue renovados; checker zero deficit obrigatório; crítica fresca |
| R3 Invariantes e serviços críticos | 002–009, 019–025, 048–053, 060–062 | Harness e evidência durável; coverage confiável | SSO completo; dados/worker/notificações/jobs/PII/contratos financeiros comprovados em fronteira real |
| R4 Jornadas e paridade | 026–034, 063–065 | Invariantes estabilizados; contratos de negócio aprovados | Onze áreas com happy/negative/concurrent/restart aplicáveis, persistência reconciliada e providers homologados onde exigidos |
| R5 UX, arquitetura e qualidade transversal | 035, 041–043, 054–060 | Jornadas estáveis e ambientes reproduzíveis | Matriz visual/a11y/cross-browser, hotspots decompostos, lint semântico, crítico visual ≥95/HIGH e zero blocker essencial |
| R6 Operação e target | 036–040, 044, 047, 049 | Candidato integrado; alvos/metas/trust roots aprovados | CI remoto e required checks, supply chain, carga/endurance, alertas, restore/corrupção, instalação/upgrade/reversão em alvo |
| R7 Recertificação | 045 | Todos os cartões 001–044 e 047–065 integralmente aceitos | Freeze do SHA/digest/config/schema; score ≥97/95/0, todos gates PASS, crítico novo e Go formal |
| R8 Entrada controlada | 046 | Go de 045, alvo/janela/abort autorizados | Rollout observado, reconciliação correta, janela encerrada pelo release owner e sustentação transferida |

## 3. Caminho crítico imediato

```text
PROD-014-S1 (unit/TS)
        ↓
PROD-014-S2 (HTTP/processo) ─────┐
        ↓                        │
decisão QA/release do instrumento│
        ↓                        │
freeze de bytes + PROD-014-S3 ◀──┘
        ↓
5 shards + SQL/Vue + checker + crítico fresco
        ↓
PROD-015/016 → 017 → 018 → 039/040 → 044 → 045 → 046
```

`PROD-014` possui dependências integrais em 005/011/013/020/024 e está
`BLOCKED`. O gate `implementation-ready-prod-014-20260914.json` autoriza apenas
a fatia local de testes com waiver explícito de 020/024; não fecha esses
cartões, não autoriza SSO/DB de homologação e não promove 014.

## 4. Três trilhas administrativas que não podem sumir

| Trilha | Dono/autoridade | Prazo relativo | Critério de fechamento |
|---|---|---|---|
| Retenção das evidências | Segurança/SRE + Lead | Antes de usar pacotes fora deste host e antes de DONE de 002 | Destino durável, ACL, retenção, integridade e restauração verificadas; conteúdo saneado |
| Incidente `.env`/DB dev | Dono do DB + Segurança | Imediato; não esperar S3 | Auditoria de DML/efeitos, contenção/rotação se aplicável, decisão e evidência restrita de encerramento |
| Identidade de coverage | QA/release authority | Antes de S3 e obrigatoriamente antes de 018/045 | Manter união multiambiente ou unificar por regra versionada; denominador, migração, known-bads e impacto recalculado por procedimento preservado |

Essas trilhas podem correr enquanto S1/S2 escrevem testes. Falta de resposta
não autoriza o agente a inventar decisão; apenas impede os gates que dependem
dela.

## 5. Paralelismo seguro

| Frente | Pode avançar | Locks e proibições |
|---|---|---|
| Auth unit | Testes de rotas/index/OIDC/WebAuthn/MFA/repos in-memory | Owner único de auth; não alterar instrumento/threshold |
| Auth processo | Cenários HTTP de brute-force, MFA, sessão, OIDC e acesso | Stack/portas/banco próprios; não usar `.env` do usuário |
| Governança | Retenção, incidente e decisão do denominador | Sem segredo/PII em docs; nenhuma autoaprovação |
| Demais domínios | Especificação e datasets sintéticos de cartões sem lock compartilhado | Não coletar shards finais enquanto houver escrita em inputs |

Manifesto, conversor, CI/gate, migrations, lockfile, API root/router e `.agent`
são integração serializada pelo Lead. A coleta S3 ocorre sem escritores sobre
fontes, testes, config ou harness.

## 6. Gates de saída por horizonte

### Horizonte H1 — coverage confiável

- Auth e roles/RLS ≥85 em lines/statements/functions/branches no instrumento
  aprovado.
- Cinco shards atuais, zero mismatch/stale, SQL e Vue especializados PASS.
- Casos reais de bypass/negação/MFA/tenant/replay; zero exclusão oportunista.
- Crítico fresco reexecuta conhecidos bons e ruins; falhas anteriores ficam
  preservadas.

### Horizonte H2 — candidato integrado

- Todos os invariantes clínicos, financeiros, tenant/RLS e worker exercitados
  em PostgreSQL/Redis/processos reais.
- Onze áreas de jornada e matriz visual/a11y completas.
- Zero Critical/High aberto sem decisão válida; build/typecheck/lint semântico
  e regressão integral no mesmo candidato.

### Horizonte H3 — candidato operável

- CI remoto/required checks do SHA; digest, SBOM, provenance, assinatura e scans.
- Restore/corrupção/mismatch, carga/endurance e alerta recebido em target.
- UAT e providers externos homologados por autoridades identificadas.
- `PROD-045` concede Go; `PROD-046` executa rollout controlado. Antes disso,
  qualquer “AAA” é apenas objetivo.

## 7. Política de reabertura e freshness

Mudança em fonte, teste, manifesto, config, lockfile, harness, schema ou build
invalida somente as provas afetadas, mas impede promoção enquanto não forem
renovadas. Falha ambiental é preservada e diagnosticada; não vira PASS por
rerun. Migração aplicada não é editada. Operação externa irreversível não é
repetida sem consulta à fonte autoritativa e confirmação de idempotência.

O roadmap será revisto após: decisão do instrumento; fechamento de 002;
conclusão S3; mudança do candidato; falha material; ou nova autoridade/alvo.

## 8. Estado da execução em 15/09 — PROD-014-S1

S1 tem implementação e evidência local condicionada: suites de Auth/MFA,
feature flags, rotas, helpers e setup-token verdes; o shard unitário corrente
passou sem testes ausentes; e a remoção temporária da checagem de permissão em
cópia compilada foi detectada pelo teste conhecido-bad. O cartão não avança
para S2 no controlador até existir crítica fresh independente válida. As duas
tentativas bounded de crítica terminaram indisponíveis e não constituem
aprovação. Depois desse gate, a sequência permanece S2 real em stack privada →
D1 de identidade → S3 com os cinco shards; release e AAA continuam bloqueados.

## 9. Atualização após crítica fresh — próxima ação S2

O crítico `Copernicus` retornou aprovação independente de S1 local
condicionado. Isso satisfaz o gate de crítica para avançar a sequência, mas
não satisfaz o aceite do cartão nem qualquer gate de release: o checker segue
`FAIL` (24 erros; Auth functions 72,28%), e S2 real, D1 e S3 continuam abertos.
A próxima ação única é `PROD-014:PROD-014-S2-20260915`, usando apenas stack
privada de PG/Redis/processos e mantendo thresholds, denominador e inventário
congelados.

## 10. Atualização após S2 — espera D1

S2 foi aprovado condicionalmente por crítica fresh após 11 suítes/45 testes em
stack privada. O controlador agora aguarda `PROD-014:PROD-014-D1-20260915`:
autoridade QA/release deve escolher entre manter o merge normativo das duas
representações ou autorizar unificação versionada com impacto explicitamente
recalculado. Enquanto essa decisão não existir, S3 não inicia; nenhuma
alteração de threshold, denominador ou inventário é permitida.

## 11. Checker pós-S2

A execução do checker depois de S2 eliminou os mismatches de input e deixou
`FAIL19` exclusivamente métrico; Auth functions permanece 72,28%, enquanto
roles/RLS supera 85 em todas as métricas. O pedido D1 continua aguardando
autoridade, portanto S3 não inicia.

## 12. PROD-048 — bloqueio documental explícito

PROD-048-R1 fechou a inspeção local redacting-first sem fechar o aceite:
67 arquivos foram inventariados e 28/28 candidatos ficaram em revisão
obrigatória; a cópia legada esperada não existe no worktree. O pacote é
redacted, tem manifesto de identidade e SHA256SUMS verificáveis, e não contém
valores ou conteúdo de linha. Testes 4/4, lint e controller checker PASS.

O REJECT de Locke foi preservado como STALE porque avaliou bytes anteriores ao
hardening final. Lorentz e Averroes não produziram crítica fresh após timeout;
não há aprovação independente current. O backlog move PROD-048 para BLOCKED e
aguarda owner Segurança/DPO. Nenhuma decisão de limpeza, substituição,
histórico, ACL ou retenção é inferida localmente; o release permanece BLOCKED /
Triplo AAA NOT PROVEN. Depois de resolver esse bloqueio, a frente independente
seguinte pode ser despachada sem substituir D1/S3 de PROD-014.
 A frente independente seguinte, PROD-019, foi despachada e posteriormente
 estacionada BLOCKED no escopo local; esta atualização é detalhada na seção 14.

## 13. PROD-049 — precedente ambiente/runtime

PROD-049-R1 foi a frente P0 independente anterior. A matriz declarativa agora
separa cinco contextos e fixa Helm como runtime primário de staging/produção,
mantendo Compose dev/E2E e Compose v2 como desenvolvimento, runner efêmero ou
rehearsal/candidato single-host. Os documentos 130/131/132, ADR-011,
RELEASE_IDENTITY, o release gate e a CI apontam para a mesma fonte estrutural.

Evidência local: good/bad 2/2, matriz 5 ambientes, deploy surface scanned=202,
deploy:check 12/12, docs:validate, diff e SHA256SUMS PASS. A ausência do Helm
v3.15.4 impede a prova executável do chart; target, CI remoto, origins,
digests, secrets provider, migration aplicada, worker health, UAT, rollback e
autoridade Platform/Release continuam sem prova. Peirce e Avicenna foram
encerrados sem produzir crítica fresh current; o card foi estacionado BLOCKED
com próxima ação única de obter parecer independente e decisão autorizada.

## 14. PROD-019 — contrato de identidade corporativa

PROD-019-R1 foi implementado como contrato local revisável para SSO/OIDC, sem
provider, credenciais ou alteração funcional. A saída cobre C1-C6, R1-R6,
critérios temporais, threat model e FAIL-001 a FAIL-012, preservando issuer +
sub como chave externa e proibindo vínculo por email.

Os checks locais e o pacote hash-bound passaram: contrato good/bad 7/7, lint,
documentação, guards, matriz runtime, superfície de deploy, deploy-check 12/12
e SHA256SUMS. Isso é implementação contratual, não integração. Discovery/JWKS,
sessão ERP, tenant/RBAC, MFA final, browser/API/DB/SPA, provider, UAT e logout
remoto continuam sem prova.

A crítica fresh independente Epicurus excedeu 120 segundos e foi encerrada sem
veredito. PROD-019 fica BLOCKED na ação de obter crítica current ou substituto
autorizado e decisão Product/Security. PROD-020/021 permanecem dependentes; o
release e Triplo AAA continuam BLOCKED / NOT PROVEN.

## 15. PROD-052 — contrato de expiração de pontos

PROD-052-R1 foi implementado como contrato comparativo local de expiresAt,
cobrindo vencimento, timezone, corte, ordem de consumo, saldo legado e
restituição sem alterar saldos, migrations ou comportamento funcional. C1-C6 e
R1-R6 seguem PENDING_AUTHORITY; a implementação atual é observação e a
execução normativa depende de PROD-053.

O guard, 8/8 testes good/bad, release-gate 53/53, lint, documentação, matriz
runtime, superfície de deploy, deploy-check 12/12, diff e checker 11/11
passaram. A crítica fresh de Hegel permaneceu running além de três janelas e
foi encerrada sem veredito. O card está BLOCKED na ação
PROD-052:PROD-052-PRODUCT-FINANCE-OWNER-20260915; decisão Product/Financeiro,
oracle temporal, dataset legado, concorrência API/DB, reconciliação, target,
UAT e produção continuam pendentes.

## 16. PROD-027 — matriz comportamental das 11 áreas

PROD-027-R1 é uma preparação contratual local explicitamente replanejada:
PROD-003 continua dependência integral e o cartão permanece BLOCKED. A matriz
preserva a observação 4/11 verified por manifesto e 7/11 blocked, cobre os
cenários universais e explicita tracks comerciais sem tratar presença de arquivo
como paridade.

O worktree contém 46 diretórios de módulos contra a narrativa de 45; workflows
é mantido como delta PENDING_AUTHORITY. Guard, 9/9 good/bad, lint,
documentação, release-gate e checker 11/11 passaram. Erdos permaneceu running
por três janelas de crítica fresh, foi encerrado sem veredito e o fato está
preservado no pacote R1. O próximo avanço requer revisão fresh atual ou
substituto autorizado, decisão Product/QA/donos de domínio, PROD-003, fixtures
e provas públicas antes de qualquer promoção de PROD-027/DONE/Triplo AAA.

## 17. PROD-062 — verificadores por família

PROD-062 entrou como fatia `CONTRACT_ONLY_PREPARATION` independente de
PROD-010, sem alterar a dependência nem promover o release. O slice substituiu
o encaminhamento genérico de 13 critérios por contratos explícitos de testes,
RLS, backup, UAT, deploy, proteção de branch e autoridade, com digest dos bytes,
issuer/workflow, alvo, medições gate-owned, frescor e autoridade verificável.

O caso bom é sintético e usa política aprovada/verificador injetado somente para
provar o contrato; produção permanece `PENDING_AUTHORITY` e ausência de
verificador retorna `PARTIAL`. Hash, issuer, target, status, limites,
duplicidade, frescor e autoridade falsos falham fechado. O inventário está em
`docs/triple-a/19-prod-062-family-verifier-inventory.md` e o pacote R1 em
`artifacts/state-of-art/PROD-062/attempt-20260915T161317Z-R1/`.

O card continua BLOCKED na ação de crítica fresh/autoridade: PROD-010, CI e
providers remotos, branch protection efetiva, target/Helm, restore, UAT e
decisão do release owner ainda não foram provados.
