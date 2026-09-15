---
document_status: current
document_kind: independent_review
effective_date: 2026-09-12
owner: Engenharia
---

# Parecer independente MA-03-R2 — REJECT

Revisor: sessão fresca `/root/ma03r2_fresh_review_current`, fork sem contexto, independência I1. Não criou descendentes. O integrador preservou este parecer em docs após a conclusão; não alterou os arquivos julgados. Escopo: slice local MA-03-R2, não certificação do ERP. Release **BLOCKED / NOT PROVEN**.

## Identidade julgada

HEAD: `324099e5a54537ca1349f3310639c3a12afbae36`. Fingerprints pré/pós conferidos pelo crítico, sem alteração:

| Arquivo | SHA-256 |
| --- | --- |
| scripts/run-triple-a-release-gate.mjs | e80864f3285532a1597a45c428477e207a3524d5bede7f15ae4cea94a0d1a96a |
| tests/unit/infra/triple-a-release-gate.test.ts | dc7be7bb34ba6b62ac1da98cd28849d7dddefc246b40f37f99e44ac52a0871b3 |
| scripts/generate-triple-a-evidence-package.mjs | 6cfcf376302d8e0a5a1f6a9a88a8be6aeebd3520bdada3fb5e92af9d83de5a0a |
| scripts/generate-triple-a-evidence-package.test.mjs | c4e3dedb9d952fc700d6155c321bd3d9e3e7ceda4a2bdfa1651422d1a913929d |
| docs/triple-a/12-release-gate.md | 28f9e9bc9b70cdaf6467c1a525dec6061eb9c77804e303cb417ab4b90b97c2d8 |
| artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json | ea4a3d3c3eda1e7e766e406a9f574dfddcac42c71f0ed2b5f2ef125fe5175d01 |
| docs/triple-a/QUALITY_BAR_V1.json | 26ff154d84ce80036b28886325b8d8462883e3b830282f2cf884394054b5c0e4 |
| pnpm-lock.yaml | 8766baa8956f683c253a9ff9a500958f6f7f1a72fa50b530fc351bcc13de531e |

O documento foi julgado sob identidade atual explicitamente emendada antes da revisão, não sob o hash histórico `93a18…` do attempt-3. Não substituir retroativamente a identidade do pacote anterior.

## Achados materiais

**R2-F1 — High, confiança alta:** dimensão duplicada sobrepõe medição reprovada. Em `scripts/run-triple-a-release-gate.mjs:1005`, `measurementsById.set(dimension.id, measurements)` substitui a primeira entrada. A avaliação posterior consulta o último valor. SOAK com duration_hours=-1 e mínimo 0 retorna FAIL; acrescentar outra dimensão duration com valor 1 transforma o mesmo envelope em PASS. Rejeitar duplicatas antes de construir o mapa; não normalizar silenciosamente nem escolher uma das entradas.

**R2-F2 — High, confiança alta:** política aprovada sem limites pode retornar PASS. Em `scripts/run-triple-a-release-gate.mjs:1028`, a guarda só rejeita quando ambos os limites são exatamente null; a política existente omite um dos lados (undefined). Clonar a política SOAK e preencher apenas APPROVED e expected_targets permite PASS mantendo os limites numéricos ausentes. Exigir regra válida antes de comparar: pelo menos um limite numérico finito; rejeitar tipos inválidos, não finitos e intervalo invertido; documentar explicitamente lados opcionais.

Ambos reproduzidos pelo seam de função com política e verificador sintéticos. **Não foi demonstrado bypass do CLI com a política real PENDING_AUTHORITY**, que continua PARTIAL. São defeitos locais do contrato de suficiência aprovado, não falta de infraestrutura.

## Critérios e execução

| Critério | Parecer / limite |
| --- | --- |
| 1. Flag antiga | PASS nos focais com e sem flag; nenhuma promoção observada |
| 2. Bytes autenticados | PASS nos focais de swap, digest, saída inválida/ambígua/vazia e verificador indisponível/rejeitado; inspeção confirmou comparação de subject e shell:false |
| 3. Raiz de confiança | Allowlist em código confirmada; governança externa e integridade do runner/PATH não provadas |
| 4. Suficiência | FAIL: R2-F1 e R2-F2 reproduzidos independentemente |
| 5. Autoridade | PASS no escopo focal: UAT/release continuam separados |
| 6. Replay/revogação | Limitação: janela reutilizável, sem registro de revogação consumido ou vínculo a versão de política; não homologado |
| 7. Seam e caminho real | Injeção por função; produção usa gh externo; autenticação real NOT_RUN |
| 8. Regressão | 42/42 gate; frozen bar e canônico inalterados |
| 9. Gerador | 6/6, v1 rejeitado e coerência gate/pacote; defeitos novos não eram cobertos |

Comandos do crítico:

- `pnpm exec vitest run tests/unit/infra/triple-a-release-gate.test.ts --config /tmp/ma03-i1-JJj6I1/vitest.config.mts`: 42 PASS.
- `node --test scripts/generate-triple-a-evidence-package.test.mjs`: 6 PASS.
- `git diff --check`: sem diagnósticos.
- `node /tmp/ma03-i1-JJj6I1/probe.mjs`: matriz abaixo.
- `command -v gh`: ausente.

O config temporário importou o config do repositório, desativou global/setup hooks relacionados a DB e coverage/.tmp e redirecionou cache para /tmp. Logo, **não equivale à execução integral da configuração prescrita**. Nenhum DB, build, install, deploy ou serviço foi iniciado. O crítico conferiu o canônico antes/depois de cada run, sem alteração; não encontrou resíduos synthetic em artifacts/remediation. Serviços externos e Vitest de outro repositório foram observados, sem build/install concorrente identificado neste candidato.

| Prova sintética independente | Resultado |
| --- | --- |
| Política real pendente | PARTIAL |
| Política APPROVED, alvo definido, limites originais ausentes | PASS indevido |
| Política aprovada com limites válidos | PASS |
| Medição abaixo do mínimo | FAIL |
| Mesmo negativo + dimensão duplicada aprovada | PASS indevido |
| Alvo não aprovado | FAIL |

A revisão parou após rejeição concreta. Não executou nova matriz adversarial CLI completa nem pnpm docs:validate; não apresentar testes do builder como reprodução própria do crítico.

## Próximo despacho — MA-03-R3

Owner: Agente 1, rework estreito de R2-F1/F2. Antes de editar, verificar identidade, reservar janela e reconciliar o parecer em .agent/** (Lead-only). Allowlist proposta: gate, teste focal, gerador/teste somente se necessário à coerência, doc do gate e pacote novo de evidências. Não autoriza dependências, auth, thresholds, produtores, deploy ou aprovação de política.

Aceite: duplicatas rejeitadas em ambas as ordens; política APPROVED sem limite finito rejeitada; casos null/undefined, NaN/Infinity, string e intervalo invertido cobertos; limites unilaterais válidos e fronteiras inclusivas preservados; política real pendente permanece PARTIAL; negativos propagados ao gerador; controles positivos não artificiosamente removidos. Não inventar min/max/alvos de produção.

Reexecutar focais e matriz pública aplicável em outputs privados, preservar sentinelas do canônico e ambiente, declarar qualquer configuração adaptada. Guardar nova tentativa sem sobrescrever antigas e revalidar identidade. Entregar IMPLEMENTED / REVIEW REQUIRED para outro crítico fresco; não autoaprovar nem declarar release.

## Probe original preservado

Cópia textual do probe independente, sem adaptação. Escreve apenas no diretório temporário explícito, usa import absoluto do candidato e atestação I1-SYNTHETIC. Em nova execução, alocar diretório temporário exclusivo e ajustar root/import; não executar sobre artefatos canônicos. Esta preservação evita depender exclusivamente da retenção de /tmp.

```js
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {OPERATIONAL_EVIDENCE_POLICY as original, validateOperationalEvidenceEnvelope as validate} from '/home/ricardo/cvg-his-v4/scripts/run-triple-a-release-gate.mjs';
const root='/tmp/ma03-i1-JJj6I1';
const digest=x=>createHash('sha256').update(x).digest('hex');
writeFileSync(root+'/payload.txt','synthetic measurements only\n');
const now=new Date().toISOString();
const base={schema_version:3,evidence_type:'cvg-his-operational-evidence',status:'PASS',commit_sha:'a'.repeat(40),observed_at:now,target:{environment:'approved-target',reference:'run://synthetic'},producer:{kind:'github-actions-workflow',run_id:'synthetic',workflow:'.github/workflows/release-artifacts.yml'},verification:{verified:true,method:'github-artifact-attestation',verifier_id:'gh-attestation-verify',verified_at:now},artifacts:[{path:'payload.txt',sha256:'sha256:'+digest(readFileSync(root+'/payload.txt'))}],results:{outcome:'PASS',dimensions:Object.entries(original.SOAK.dimensions).map(([id,spec])=>({id,status:'PASS',artifact:'payload.txt',measurements:Object.entries(spec.measurements).map(([name,s])=>({name,value:1,unit:s.unit}))}))}};
function run(label,policy,artifact=base){const bytes=JSON.stringify(artifact);writeFileSync(root+'/envelope.json',bytes);const result=validate({rootDir:root,value:'envelope.json',artifact,commitSha:base.commit_sha,evidenceId:'SOAK',envelopeSha256:digest(bytes),operationalPolicy:policy,verifyOperationalEvidence:input=>({status:'PASS',subject_sha256:input.envelopeSha256,workflow:input.declaredWorkflow,provenance:'I1-SYNTHETIC'})});console.log(JSON.stringify({label,...result}));}
run('pending-policy',original);
const approved=structuredClone(original);approved.SOAK.approval.status='APPROVED';approved.SOAK.expected_targets=['approved-target'];
run('approved-with-original-null-and-omitted-bounds',approved);
const bounded=structuredClone(approved);for(const d of Object.values(bounded.SOAK.dimensions)){for(const s of Object.values(d.measurements)){s.min=0;s.max=10;}}
run('approved-valid-control',bounded);
const failing=structuredClone(base);failing.results.dimensions[0].measurements[0].value=-1;
run('below-threshold-control',bounded,failing);
failing.results.dimensions.push(structuredClone(base.results.dimensions[0]));
run('duplicate-dimension-last-value-overrides-failing-measurement',bounded,failing);
const target=structuredClone(base);target.target.environment='unapproved';run('unapproved-target-control',bounded,target);
```

