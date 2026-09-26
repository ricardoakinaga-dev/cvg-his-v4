---
document_status: historical
document_kind: baseline
effective_date: 2026-09-14
owner: Engenharia CVG-HIS
review_cycle: on-candidate-change
candidate_sha: 324099e5a54537ca1349f3310639c3a12afbae36
verdict: NOT_PROVEN
superseded_by: docs/2026-09-26-auditoria-completa-sistema.md
---

# Estado de construção do CVG-HIS V4 — 14/09/2026

## 1. Conclusão executiva

**Nota editorial consolidada: 73/100. Construção extensa e funcional, com fechamento de qualidade e operação ainda incompleto. Release: bloqueado pelo gate crítico. Produção e Triplo AAA: NÃO COMPROVADOS.**

O programa não é um protótipo de telas nem um conjunto de módulos vazios. Há aplicação Vue, API, workers, repositórios PostgreSQL, isolamento por tenant, transações, idempotência, outbox, migrações e suítes grandes de testes. O build completo e a checagem de tipos passaram nesta auditoria. Também passaram 1.891 testes da SPA, 595 testes nativos da API e 147 do worker.

Isso não demonstra conclusão integral do ERP. O checker crítico atual retorna **FAIL com 21 métricas abaixo de 85%**, apesar de aceitar a proveniência dos cinco shards e as evidências especializadas SQL/Vue. Permanecem SSO incompleto, sete áreas de paridade bloqueadas, lacunas de certificação operacional, homologação externa e evidência atual de recuperação/endurance. Há também problemas concretos de privacidade documental, contenção de jobs e usabilidade em tablet/mobile.

A nota 73 não é percentual de funcionalidades prontas, cobertura de código, probabilidade de segurança ou autorização para atender pacientes. É a média editorial arredondada das 18 dimensões da seção 4: soma 1.311 ÷ 18 = 72,83. Não se compara diretamente à antiga nota 63 de prontidão: o candidato, as evidências e a composição da avaliação são diferentes. Nenhuma média substitui gates obrigatórios.

## 2. Escopo, identidade e leitura de `docs`

Alvo: `/home/ricardo/cvg-his-v4`, branch `main`, HEAD `324099e5a54537ca1349f3310639c3a12afbae36`, com numerosas alterações locais preexistentes. O SHA de HEAD sozinho **não identifica os bytes auditados**. O inventário de 3.243 arquivos rastreados/não ignorados do worktree apresentou o mesmo digest antes/depois das verificações: `24326c6a86bb920781459274b8aac5624f1072d25486b3d51b53e8312f1adb74`. Essa sentinela começou depois das primeiras leituras e não abrange arquivos ignorados. As frentes também verificaram suas próprias sentinelas; nenhuma alterou fontes.

Foi preservado o programa. Build e testes potencialmente geradores de saídas foram executados em cópia temporária isolada, com dependências locais copiadas, sem os `.env` reais, sem banco compartilhado e sem provedores externos. Os novos arquivos desta entrega são relatório e evidências de auditoria; não houve implementação de correções, commit, push, deploy ou alteração de governança canônica.

### Cobertura de leitura: o que foi e o que não foi feito

O inventário inicial encontrou **18.256 arquivos / 2.506.053.146 bytes**, contra 430 caminhos visíveis ao `rg` padrão. A diferença vem principalmente de evidências ignoradas e caches. Todos os 18.256 arquivos foram consumidos integralmente em bytes e receberam SHA-256; isso **não equivale à interpretação visual de todas as imagens**.

| Material | Quantidade | Método e limite |
|---|---:|---|
| Markdown | 237 | Leitura semântica integral distribuída entre coordenador e três frentes; inclui o Markdown ignorado de performance |
| Fontes auxiliares | 5 MJS, 1 Python, 2 TXT | Leitura integral; harnesses históricos não foram executados |
| HTML | 9 | Caderno visual lido semanticamente; demais capturas HTML consumidas/analisadas como evidência gerada, não tratadas como navegação atual |
| JSON e source maps | 1.470 + 2.485 | 3.955 documentos parseados sem erro; contratos selecionados lidos integralmente; evidência gerada analisada programaticamente, não cada valor julgado individualmente |
| Logs | 419 | Leitura integral em buffer/inventário e análise de resultados; não inspeção semântica linha a linha de todos os logs históricos |
| PNG | 11.033 | Assinaturas e dimensões verificadas; não decodificação completa nem revisão visual de cada imagem |
| Outros binários | 1 WebP, 2 Blend, 1 MP4, 106 WebM | Inventário de bytes/hash; não reprodução integral de todos os vídeos nem abertura dos projetos Blender |
| JavaScript gerado | 2.485 | Inventário completo; cache gerado não auditado como código-fonte autoral |

Foram encontrados 4.504 hashes distintos e 13.752 arquivos repetidos por conteúdo. A classificação do inventário é: 254 documentos/fontes, 1.179 textos estruturados/gerados, 11.143 binários e 5.680 arquivos de cache. As categorias por finalidade e extensão são cortes diferentes, não totais adicionais.

Portanto, o pedido de leitura foi atendido integralmente para a documentação textual autoral, com tratamento explícito de todo o corpus. **Não se afirma leitura visual integral dos 11 mil binários, revisão de cada linha de cache ou exame semântico individual de toda evidência gerada.** A inspeção do código do programa foi focal, orientada pelos contratos e riscos, não leitura de todo método de todos os módulos.

Rastreabilidade: [inventário completo](../artifacts/auditoria-2026-09-14/evidencias/docs-inventory.json), [resumo](../artifacts/auditoria-2026-09-14/evidencias/inventory-summary.json), [análise do corpus](../artifacts/auditoria-2026-09-14/evidencias/corpus-analysis.json), [ledger dos 237 Markdown](../artifacts/auditoria-2026-09-14/evidencias/markdown-reading-coverage.json), [leituras backend](../artifacts/auditoria-2026-09-14/evidencias/audit-backend-reading-inventory.md), [leituras release](../artifacts/auditoria-2026-09-14/evidencias/release-doc-inventory.json) e [leituras frontend](../artifacts/auditoria-2026-09-14/evidencias/frontend/frontend-findings.md). Complemento final: os cinco MJS e o snapshot TXT inicialmente excluídos no parecer frontend foram depois lidos integralmente, totalizando 8.752 linhas/410.011 bytes.

## 3. Critério de nota e força da evidência

Escala aplicada: 0 = ausência demonstrada; 25 = preparação/esqueleto; 50 = implementação parcial; 75 = implementação substancial com prova parcial; 90 = validação ampla; 100 = atendimento integral demonstrado no escopo. Valores intermediários expressam julgamento de engenharia, não precisão estatística. Ausência de teste não foi convertida automaticamente em defeito.

As notas distinguem implementação, suficiência das provas e validação operacional. Confiança alta significa evidência direta no recorte, não garantia sobre o produto inteiro. Confiança baixa identifica inspeção arquitetural/documental sem fechamento comportamental focal. Não foram atribuídas notas fictícias a cada arquivo ou a funcionalidades não examinadas.

A barra Triplo AAA existente exige nota global 97, críticas 95, zero P0, CI verde, critérios obrigatórios PASS e autoridade real. Esses requisitos **não estão satisfeitos**. `QUALITY_BAR_V1.json` manteve SHA-256 `26ff154d84ce80036b28886325b8d8462883e3b830282f2cf884394054b5c0e4` na sentinela da frente release. “P0 de certificação” abaixo significa bloqueador de promoção, não alegação de incidente clínico ou exploração de segurança.

## 4. Notas consolidadas — 18 dimensões

| Item analisado | Nota /100 | Confiança | Fundamentação e principal limite |
|---|---:|---|---|
| Arquitetura e fronteiras | 80 | Média-alta | Monólito modular, UoW, eventos e contratos reais; composição muito concentrada |
| Manutenibilidade e governança documental | 74 | Alta | Validadores passam; hotspots, orientação de deploy conflitante e baselines numéricas envelhecidas |
| API e contratos HTTP | 80 | Média-alta | 430 paths OpenAPI, 595 testes nativos aprovados; não equivale a E2E de todos os paths |
| Dados, transações e migrações | 80 | Média | Locks, tenant binding e reparo forward-only; auditoria não executou upgrade completo em PostgreSQL |
| Segurança, IAM e privacidade | 70 | Média-alta | Defesas fail-closed reais; SSO parcial, aparentes dados pessoais em docs e identificação bruta em logs |
| Cadastros e atendimento básico | 78 | Média | Amplitude e persistência; paridade declarada em áreas centrais, jornada integral não reexecutada |
| Núcleo clínico | 79 | Média | Prontuário/versionamento/administrações/leitos; sem aceite clínico humano neste candidato |
| Financeiro e pagamentos | 77 | Média | Invariantes e locks concretos; conciliação, provedores e estornos externos incompletos |
| Domínios de apoio e integrações | 76 | Média-baixa | Estoque, campanhas, relatórios e fiscal reais; homologações e equivalência externa pendentes |
| Frontend e design system observados | 82 | Média | Cinco rotas, dois temas, estados reais renderizados com fixtures; não representa todas as telas |
| Responsividade e acessibilidade observadas | 78 | Média | Sem overflow nos 44 estados; Agenda tablet e prioridade de contato mobile precisam revisão |
| Engenharia e execução de testes | 82 | Média-alta | Build/tipos e grandes suítes aprovados; suíte raiz não ficou inteiramente verde, DB indisponível |
| Suficiência da cobertura crítica | 70 | Alta | Checker atual FAIL: 21 déficits, todas as dez áreas com pelo menos um déficit |
| Implementação de CI/CD | 80 | Média | Cinco shards e checker real no workflow; run remoto e required checks atuais não consultados |
| Engenharia do gate de release | 75 | Alta | Proteções reais contra auto-PASS; vários verificadores específicos e autoridades pendentes |
| Operação, backup e recuperação | 65 | Média-alta | Scripts/runbooks substanciais; drill atual em alvo e metas aprovadas não comprovados |
| Performance, endurance e observabilidade | 60 | Média | Instrumentação e cenários existem; carga-alvo, 24/72h e circuito de alerta humano não comprovados |
| Homologação/UAT e liberação em alvo | 25 | Média-alta | Protocolos preparados; provas e autoridades necessárias não apresentadas neste recorte |
| **Média editorial simples** | **73** | **Média** | **72,83 antes do arredondamento; não é gate nem percentual de conclusão** |

## 5. Estado por domínio funcional

O repositório contém 45 diretórios de módulos de negócio. A tabela agrupa domínios relacionados; as notas não alegam testes completos de cada módulo. Uma área pode ter implementação forte e continuar bloqueada por homologação.

| Domínio analisado | Nota /100 | Estado demonstrado / falta para fechar |
|---|---:|---|
| Tutores, pacientes e cadastros | 78 | Entidades, repositórios, API e interface; validar campos/estados e importação no uso real |
| Agenda, atendimento e comanda | 78 | Ciclos implementados; falta reexecutar jornada concorrente integral e corrigir prioridade visual em tablet |
| Prontuário e prescrições/administrações | 79 | Entradas/revisões atômicas, versão esperada e autoria; requer UAT clínico e cobertura de ramos |
| Internação e alta | 78 | Reserva/transição de leitos transacional; fechar jornada alta–faturamento e aceites clínicos |
| Laboratório e diagnósticos | 77 | Workflow persistente, locks, resultados e replay; sem homologação Live Lab/equipamentos |
| Estoque, compras e farmácia | 77 | Movimentações, reservas, transferências e consumo; confiança média-baixa na conciliação integral |
| Financeiro, caixa, pagamentos e PIX | 77 | Travas e validação após lock; prova externa de gateways/conciliação/estorno não fechada |
| Comercial, pacotes e fidelidade | 73 | Serviços e persistência reais; contrato de expiração dos pontos precisa decisão explícita |
| Fiscal | 72 | Calculador/emissor/repositório existem; certificado, município e rejeições reais não homologados |
| Profissionais e comissões | 73 | Módulos e regras documentadas; inspeção focal limitada, não certifica cálculo de repasse |
| Marketing e comunicação | 76 | Consentimento durável, retry e claim; falta entrega/bounce real e aceite operacional |
| Relatórios e entregas agendadas | 77 | Autorização dinâmica reparada, exportação e worker; famílias numéricas/Vetus não reconciliadas integralmente |
| SSO corporativo, como jornada própria | 50 | Troca OAuth e userinfo presentes; identidade interna, sessão ERP e logout integrado não fechados |
| Instrumentação do checker crítico | 85 | Proveniência, denominador e contratos fortes; deve distinguir-se do resultado insuficiente da cobertura |
| Observabilidade operacional, isoladamente | 60 | Métricas/traces/políticas; falta prova alvo → alerta → ação humana |

Referências focais e limites: [parecer backend](../artifacts/auditoria-2026-09-14/evidencias/audit-backend-digest.md) e [parecer release/operação](../artifacts/auditoria-2026-09-14/evidencias/release-audit-report.md). Não se converte existência de arquivo ou nome de módulo em conclusão de funcionalidade.

### Paridade Vetus

`pnpm vetus:parity:audit` terminou com exit 0, mas é um relatório, não aprovação de paridade: **4/11 áreas verified; 7/11 blocked**. As quatro verificadas pelo manifesto são atendimento, cadastros, estoque e profissionais/comissões. As sete bloqueadas são laboratório, fiscal, financeiro, marketing, relatórios, acesso/LGPD e integrações/migração. O indicador “100/100” de camadas de prova significa presença de UI/API/persistência/testes/E2E no registro, não 100% de equivalência funcional nem 100/100 nesta auditoria. [Saída atual](../artifacts/auditoria-2026-09-14/evidencias/check-8.log).

## 6. Verificações executadas agora

| Verificação | Resultado atual | Limite |
|---|---|---|
| `pnpm build` | PASS, exit 0 | Cópia do worktree; compila, não prova runtime em produção |
| `pnpm typecheck` | PASS, exit 0 | Tipos, não regras de negócio |
| `pnpm lint` | PASS, exit 0 | Predomina `tsc`; não confundir com análise estática profunda |
| SPA `pnpm test` | PASS: 217 arquivos, 1.891 testes | Testes de componentes/unidade; avisos jsdom não foram escondidos |
| API nativa, após build novo | PASS: 595/595, zero skip | Suite nativa selecionada pelo script do pacote, sem DB real |
| Worker nativo, após build novo | PASS: 147/147, zero skip | Doze arquivos numa execução `node --test`, sem provedores reais |
| Vitest raiz completo | NÃO PASSOU: 237 arquivos aprovados, 2 falhos, 1 ignorado; 2.619 testes aprovados, 1 falho, 3 ignorados | Uma suite PostgreSQL sem DB; um teste de docs por cópia incompleta de artefatos |
| Rerun governança documental | PASS: 4/4 | Após copiar os 29 artefatos históricos faltantes à cópia de auditoria |
| Checker de cobertura crítica | FAIL, exit 1, 21 métricas | Revalidou hashes/evidências existentes; não reexecutou os cinco shards |
| Contratos do checker | PASS: 42/42 | Testes do instrumento, não cobertura do ERP |
| Governança de docs | PASS | Links/estrutura; não resolve contradições semânticas |
| OpenAPI | PASS: 430 paths, 41 tags, 525 schemas | Sintaxe/estrutura não demonstram cada implementação |
| Namespaces, migrations source, deploy surface | PASS | Contratos estruturais |
| Supply chain e dependency policy | PASS | Referências imutáveis e políticas; não pentest/SCA remoto atual |
| Complexity budget | PASS | Teto aceito não significa boa modularidade |
| Estado do engineering-framework | PASS: 11 checks | Consistência estrutural de estado, não conclusão de 47 tarefas PROD |
| Navegação/renderização atual | 44 estados válidos, zero pageerrors/overflow | Chromium com API/auth sintéticas e origens externas bloqueadas |
| Axe na Agenda | Seis execuções, zero violações detectadas | Apenas Agenda; não certificação WCAG/tecnologia assistiva |

O Vitest raiz usou URLs explícitas de PostgreSQL/Redis indisponíveis em `127.0.0.1:9`, evitando serviços do usuário. O contrato `DatabaseModelRepository PostgreSQL` em `packages/modules/ml/src/ml.test.ts:273` tentou conectar e falhou. Isso é **limitação do ambiente**, não defeito demonstrado do repositório. O outro erro foi causado pela exclusão inicial de `artifacts` na cópia: documentos canônicos referenciam 29 arquivos de auditoria anterior. Esses arquivos existem no original; a validação no original passou e o rerun focado passou após copiá-los. A execução inteira não foi reclassificada como PASS.

Logs: [build](../artifacts/auditoria-2026-09-14/evidencias/build.log), [tipos](../artifacts/auditoria-2026-09-14/evidencias/typecheck.log), [lint](../artifacts/auditoria-2026-09-14/evidencias/lint.log), [SPA](../artifacts/auditoria-2026-09-14/evidencias/spa-tests.log), [API](../artifacts/auditoria-2026-09-14/evidencias/api-tests.log), [worker](../artifacts/auditoria-2026-09-14/evidencias/worker-tests.log), [raiz completo](../artifacts/auditoria-2026-09-14/evidencias/unit.log), [rerun documental](../artifacts/auditoria-2026-09-14/evidencias/docs-rerun.log), [contratos checker](../artifacts/auditoria-2026-09-14/evidencias/release-checker-contract.log). As contagens entre suítes não são somadas como testes únicos: existem sobreposições.

Não executados: matriz PostgreSQL completa/upgrade de legado, todo E2E público com persistência, teste de carga atual, endurance 24/72h, restore em alvo, scanner externo/pentest, homologação de provedores, navegador alternativo, leitor de tela e UAT humano. Não foi consultado CI remoto atual. Evidências históricas dessas atividades não foram promovidas a novas execuções.

## 7. Cobertura crítica: denominador atual e déficits exatos

Manifesto revisão 27: 551 fontes, 2.150 execution inputs, cinco shards obrigatórios. São 348 fontes JS, 25 Vue, 171 SQL ativos e sete SQL históricos. Evidência especializada SQL aceita: 171/171 ativos; Vue: 25/25. A revalidação não encontrou divergência de proveniência/hash nesta execução. Isso corrige a narrativa antiga de centenas de ausências, mas não fecha o gate.

| Componente | Linhas % | Statements % | Funções % | Branches % | Métricas abaixo de 85 |
|---|---:|---:|---:|---:|---|
| auth | 91,04 | 91,60 | 70,53 | 84,31 | Funções, branches |
| roles-rls | 92,56 | 92,18 | 87,82 | 73,28 | Branches |
| billing-cash | 89,35 | 89,77 | 83,05 | 82,77 | Funções, branches |
| inpatient | 91,01 | 91,08 | 91,04 | 81,53 | Branches |
| records | 85,17 | 85,73 | 78,60 | 78,63 | Funções, branches |
| prescriptions | 85,44 | 85,36 | 73,61 | 81,05 | Funções, branches |
| pix | 90,17 | 89,00 | 74,09 | 84,59 | Funções, branches |
| webhooks | 82,00 | 82,23 | 65,73 | 77,39 | Todas as quatro |
| http-routes | 86,41 | 86,25 | 86,32 | 79,07 | Branches |
| repositories | 73,35 | 72,33 | 60,46 | 66,24 | Todas as quatro |

Total: 21 déficits; todas as dez áreas falham em pelo menos uma métrica. Não se calcula média para esconder um déficit. Prioridade técnica: repositórios/webhooks e ramos de autorização, dinheiro e clínica, com cenários relevantes — não testes destinados apenas a aumentar contadores. [JSON completo do checker](../artifacts/auditoria-2026-09-14/evidencias/release-critical-coverage.json).

## 8. Achados priorizados

### A01 — Cobertura crítica impede certificação

Prioridade: P0 de certificação. Confiança alta. `scripts/check-critical-coverage.mjs:318–323` aplica o mínimo de 85 por métrica e componente. Resultado atual é FAIL21; não é erro de instalação nem evidência stale. Aceite: todas as métricas obrigatórias aprovadas no mesmo candidato, com os cinco shards e proveniência íntegros; não reduzir a barra para obter verde.

### A02 — Certificação em alvo não está completável apenas preenchendo JSON

Prioridade: P0 de certificação/operação. Confiança alta. Em `scripts/run-triple-a-release-gate.mjs:1277`, evidências genéricas permanecem PARTIAL mesmo íntegras; vários critérios precisam verificadores específicos. Quatro políticas operacionais ainda têm `PENDING_AUTHORITY` e `expected_targets:null`. É contenção honesta, mas também trabalho de implementação/governança pendente. Aceite: verificadores reais, produtor, alvo e autoridade definidos, evidência externa atual e PASS por critério. Não executar promoção apenas com declaração manual de sucesso.

### A03 — Aparentes dados pessoais copiados para documentação

Prioridade alta de privacidade documental. Confiança alta sobre presença; média sobre origem real. `docs/vetus/guides/02-ANALISE-SISTEMA-VETUS.md:308–340` e `04-ESPECIFICACAO-APIS.md:204–240` incluem registros com identificadores pessoais e contato; a própria documentação descreve captura do sistema de origem. Não reproduzimos os valores. O relatório de 27/04 em `docs/vetus/guides/2026-04-27-relatorio-prontuario-cliente-animal-autorizados.md:424` recomenda não copiar dados reais. Aceite: responsável avaliar origem/acesso, substituir por dados sintéticos e tratar histórico/cópias conforme política autorizada. Não foi feita remoção silenciosa nem avaliação jurídica.

### A04 — SSO é transporte OAuth parcial, não login ERP completo

Prioridade alta funcional. Confiança alta. `apps/api/src/routes/auth-routes.ts:1226–1239` troca código, consulta userinfo e devolve tokens/usuário; não cria sessão ERP nem associa identidade externa a tenant/RBAC interno nesse ramo. Logout em :1245 não integra revogação de sessão ERP. `packages/modules/auth/src/oidc.ts` contém PKCE/state, mas a normalização de tokens não equivale a verificação de assinatura/claims de ID token. Não foi demonstrado bypass ou tomada de conta. Aceite: contrato completo de identidade, validação OIDC, sessão, autorização e logout, testado com provedor e configuração-alvo.

### A05 — Job pendurado pode bloquear o processamento sequencial

Prioridade alta de resiliência. Confiança alta na estrutura. `apps/worker/src/account-job-runner.ts:41–52` aguarda cada `job.run` sem deadline/cancelamento no wrapper. Catch protege contra rejeição; não protege contra promise que nunca retorna. A política `docs/operations/JOB_RETRY_AND_DLQ_POLICY.md:28` reconhece a limitação. PIX possui timeout específico: a ausência não deve ser generalizada a todo provider. Aceite: orçamento/timeout por job, cancelamento ou isolamento efetivo e teste demonstrando progresso dos demais tenants. Não foi provocada indisponibilidade real.

### A06 — Recuperação/endurance ainda sem prova operacional atual

Prioridade P0 operacional. Scripts fazem dump/globals/storage/manifest/checksums, validação de TOC/path traversal e restauração; não são apenas runbooks. Porém RPO/RTO são propostas, artefatos 24/72h e restore estão NOT_PROVEN/outro SHA, e o runner de critical-soak exige 20 iterações — não 24/72 horas. Aceite: alvo e limites aprovados, restore/drill e endurance reais com identidade, tempos, reconciliação e responsável. Fonte: `infra/scripts/restore-drill-v2.sh:258–481`, `infra/scripts/run-critical-soak.mjs:54`, `docs/operations/RPO_RTO_POLICY.md`.

### A07 — Artefato canônico de release não representa este candidato

Prioridade alta de governança. `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json` ainda contém SHA sintético de 40 letras `a`, data 12/09 e BLOCKED/NOT PROVEN; outro artefato usa SHA antigo. Não usar seus scores 30/55 como nota atual. O teste atual protege saídas canônicas em diretórios privados; não foi demonstrado novo incidente de sobrescrita. Aceite: geração autorizada, imutável e retida para o candidato exato; não editar o resultado para simular aprovação.

### A08 — Orientação de deploy contraditória

Prioridade média-alta operacional. `docs/132-superficie-canonica-deploy-e-migracao.md:12` declara Compose oficial; ADR-011 em :44 define Kubernetes/Helm em produção; `docs/engineering/RELEASE_IDENTITY.md:20–21` admite Compose production-like e chart canônico. Check estrutural passou, mas não decide precedência. Aceite: matriz ambiente → runtime → runbook → autoridade coerente. Não remover Helm por considerá-lo automaticamente legado.

### A09 — Agenda tablet esconde a primeira informação útil

Prioridade média de UX, confiança alta no recorte. Em 768×900 a lista começa em y≈1.054; em 375 e 1440 começa em y≈592/590. `AppPageHeader.vue:1006` empilha abaixo de 1100, enquanto compactação de `AppointmentsListPage.vue:1637/2722` cobre até 720. O requisito de primeiro item útil na primeira tela está no plano frontend, :117. O harness histórico inclui 768, mas a asserção da primeira consulta na viewport só se aplica a ≤390 (`browser-continuity.mjs:5080`). Aceite: compactar composição tablet e testar 721/768/1024, temas e texto ampliado.

### A10 — Cadastro mobile prioriza opcionais antes do contato

Prioridade média de UX. Primeiro telefone em y≈1.032 e salvar em y≈1.770 no viewport 375×900; campos opcionais precedem contato essencial (`OwnerFormPage.vue:3/80/86/107`). Não se exige que um formulário completo caiba na tela. Aceite: nome + contato no bloco essencial, detalhes progressivos e ação acessível. Validação e proteção de saída funcionaram no teste observado.

### A11 — Manutenibilidade e linguagem operacional

Prioridade média para hotspots; baixa para estilo/copy. `apps/api/src/server.ts` tem 8.334 linhas, router SPA 2.920, worker runner 2.139 e PatientDetail 4.075. Passar no budget não remove acoplamento nem risco de revisão. No frontend há “Operations OS”, “Handoffs” e mistura serif/sans em superfícies operacionais. Aceite: reduzir responsabilidades com testes de contrato e revisar linguagem com operadores; não refatorar às cegas durante a auditoria.

### A12 — Semântica de fidelidade e conclusão parcial de notificações

Prioridade: decisão de contrato/teste focal, não violação clínica comprovada. Probe sintético no código clonado mostrou 100 pontos com `expiresAt` vencido disponíveis e resgatáveis; `commercial/src/index.ts:271` soma sem expiração. A documentação encontrada define o campo, mas não estabelece regra vinculante de vencimento: decidir contrato antes de chamar isso de defeito financeiro. Separadamente, `notifications/src/index.ts:211` marca job processed antes de atualizar notificação/hook; falha posterior pode deixar conclusão parcial. Não foi demonstrada perda runtime. Aceite: regras explícitas e testes de falha/atomicidade/redrive. [Probe](../artifacts/auditoria-2026-09-14/evidencias/audit-backend-loyalty-probe.mts).

### A13 — Identificadores em logs exigem política de minimização

Prioridade média de privacidade operacional. `packages/modules/auth/src/brute-force.ts:73/106` registra identificador normalizado nos eventos de bloqueio; a execução atual produziu identificadores sintéticos de teste. Isso demonstra o campo emitido, não vazamento de produção. Aceite: definir pseudonimização, retenção, acesso e rastreabilidade necessários; testar política sem perder capacidade de investigação.

## 9. Revisão visual: notas e evidências

Recorte: login, recepção, Agenda, novo tutor e pedidos laboratoriais; Chromium, larguras 375/768/1440, altura 900, temas claro/escuro. API e autenticação foram sintéticas; origens externas bloqueadas. O fallback Playwright foi usado porque Browser/IAB não estava disponível. É renderização do código atual, não screenshot conceitual.

| Item de design | Nota /100 | Observação |
|---|---:|---|
| Hierarquia | 78 | CTA clara, mas cabeçalho ocupa espaço operacional |
| Tipografia | 83 | Legível no recorte; mistura serif/sans |
| Espaçamento/layout | 77 | Consistência geral; tablet alongado |
| Cor | 88 | Temas coerentes, estado não apenas por cor |
| Consistência | 85 | Shell e componentes reconhecíveis |
| Usabilidade | 82 | Validação, recuperação e saída protegida funcionam; sem medição humana |
| Responsividade | 78 | Sem overflow; densidade não preservada em tablet |
| Acessibilidade observada | 83 | Foco/teclado e Axe positivos; amostra limitada |
| Marca | 90 | Identidade hospitalar específica, não genérica |
| Qualidade dos assets | 86 | Assets integrados nas telas amostradas |
| Polimento | 84 | Acabamento consistente com lacunas de copy e estados |
| Interação | 84 | Enter em ações secundárias, Escape e foco do diálogo verificados |
| Densidade operacional | 72 | Informação essencial chega tarde em tablet/form mobile |
| Especificidade de domínio | 83 | Paciente, horário, status, triagem e contexto clínico presentes |

Síntese frontend 82/100 é julgamento ponderado do recorte, não média simples desses 14 itens nem prova AAA. Fidelidade a screenshot exato não se aplica. Seis execuções Axe somente na Agenda tiveram zero violações detectadas; faltam leitor de tela, cross-browser, jornadas persistentes, estudo humano/SUS/tempos de tarefa e matriz completa.

Evidências: [Agenda tablet](../artifacts/auditoria-2026-09-14/evidencias/frontend/agenda-populated-768-light.png), [Agenda desktop escuro](../artifacts/auditoria-2026-09-14/evidencias/frontend/agenda-populated-1440-dark.png), [tutor mobile](../artifacts/auditoria-2026-09-14/evidencias/frontend/owner-initial-375-light.png), [erro laboratorial](../artifacts/auditoria-2026-09-14/evidencias/frontend/lab-error-375-dark.png), [diálogo de saída](../artifacts/auditoria-2026-09-14/evidencias/frontend/owner-dirty-dialog-768-dark.png), [44 estados e geometria](../artifacts/auditoria-2026-09-14/evidencias/frontend/interactions.json).

As primeiras capturas `appointments-*` são inválidas para julgar a Agenda, por fixture inicial malformada. Usar `agenda-populated-*`. Um nome sintético com encoding errado foi corrigido na fixture e não classificado como defeito. Os artefatos exploratórios foram preservados com essa ressalva, não escondidos nem contados como evidência válida.

## 10. O que melhorou em relação aos relatórios anteriores

1. A afirmação antiga de 246 problemas de coverage/revisão 12 não descreve o checker atual: revisão 27, proveniência aceita e 21 déficits métricos. SQL/Vue especializados agora passam.
2. O workflow atual contém `Critical Coverage Gate` e executa o checker fail-closed (`.github/workflows/ci.yml:812–1021`). Não repetir ausência antiga de wiring. O inventário explícito de jobs do verificador CI ainda precisa reconciliação; não foi demonstrado bypass, e o sucesso global do run continua relevante.
3. O guard de relatórios agora extrai identificadores de body/path/envelope e resolve autorização dinâmica (`idempotency-authorization.ts:82–160`, `server.ts:8048`). O antigo caso CP02 não foi reproduzido como defeito atual.
4. A migração 0172 adiciona reparo forward-only de envelope completo, preservando metadados válidos. A leitura da fonte não equivale a aplicar todos os cenários de upgrade; não carregar automaticamente o bug antigo de 0171 como estado atual.
5. O teste do gate de release agora isola saídas temporárias e protege o canônico. O artefato histórico sintético continua inadequado, mas não foi atribuída nova sobrescrita ao teste atual.

Documentos exploratórios Vetus são fontes de observação, não contratos absolutos. Propostas antigas de microserviços/Prisma foram superadas por decisões posteriores. Nomes internos `v2` compatíveis não demonstram por si só uma migração V4 incompleta. A matriz de tarefas `.agent` passou estruturalmente, mas seus números/textos históricos não substituem esta medição.

## 11. Sequência recomendada de fechamento

| Ordem | Frente | Critério de saída |
|---|---|---|
| 1 | Privacidade e identidade de evidências | Responsável avalia dados em docs; candidato/source-set e retenção definidos; artefatos canônicos não confundidos com fixtures |
| 2 | Cobertura e invariantes críticas | 21 déficits eliminados por testes substantivos; cinco shards/proveniência PASS; regressões de autorização/migração reexecutadas |
| 3 | Contratos incompletos | SSO integrado, timeout/isolamento de jobs, expiração de pontos e conclusão de notificações com aceites claros |
| 4 | Operação/release | Verificadores específicos, autoridades, alvo, RPO/RTO, restore, endurance e alerta real aprovados |
| 5 | Homologação de negócio/provedores | Fechar sete bloqueios de paridade com provas-alvo e UAT clínico/administrativo |
| 6 | UX operacional | Agenda tablet, essenciais do tutor e copy; matriz de tamanhos, teclado/AT e tarefas humanas |
| 7 | Promoção | Candidato imutável, CI atual verde, todas as exigências obrigatórias PASS, aprovação responsável |

Não há estimativa confiável em dias sem responsáveis, capacidade, alvos e contratos de provedores. A prioridade não é adicionar mais telas: é fechar provas e comportamentos críticos do que já existe.

## 12. Independência, skills e retenção

Foram usadas as quatro skills solicitadas: **gauntlet-loop** para barra congelada, separação entre achado/prova e veredito; **orchestrate** para três frentes delimitadas de backend, frontend e release; **engineering-framework** para identidade, preservação do worktree e verificação proporcional; **design-director** para renderização responsiva, estados interativos e crítica visual. O trabalho ficou em modo auditoria: não iniciou um ciclo de correção de produto sem autorização.

Independência de nível I1: agentes separados, mesmo sistema/modelo, não auditores humanos externos. Os scouts leram relatórios históricos porque isso fazia parte do pedido; não se afirma que fossem cegos ao histórico. O crítico final, em contexto novo e separado das três frentes, concluiu **audit-sufficiency PASS, confiança alta, sem bloqueadores materiais**. Conferiu matemática, leituras, hashes, resultados e fontes amostradas. [Parecer independente](../artifacts/auditoria-2026-09-14/evidencias/final-critic.md). O hash da versão substantiva revisada consta no parecer; o fechamento posterior acrescenta este veredito e links, sem alterar notas ou achados. Isso não certifica o software.

A [verificação de fechamento](../artifacts/auditoria-2026-09-14/evidencias/final-verification.json) registra zero alterações nos 18.256 documentos originais, 237 Markdown atribuídos, zero links quebrados e hash final deste relatório. Os 3.243 arquivos preexistentes da sentinela de fontes permaneceram iguais; o único acréscimo não ignorado foi este relatório. O servidor de renderização temporário foi encerrado; nenhum serviço do usuário foi desligado.

Evidências foram retidas localmente em `artifacts/auditoria-2026-09-14/evidencias/`, incluindo logs, inventários, probes, capturas e pareceres. [SHA256SUMS](../artifacts/auditoria-2026-09-14/evidencias/SHA256SUMS) permite conferir bytes. Essa pasta é ignorada pelo Git; os links funcionam neste workspace, mas dependem de cópia/retencão externa controlada para uso durável em release. Não foram copiados os lotes textuais integrais que continham os aparentes dados pessoais. Capturas novas usam dados sintéticos.

**Veredito final sobre o programa: construção avançada, média editorial 73/100; gate crítico FAIL; produção/Triplo AAA NOT PROVEN. A conclusão da auditoria não significa aprovação do produto.**

## Nota de publicação do programa executivo — 14/09/2026

Por solicitação posterior de planejamento, este relatório passa a baseline documental vigente; notas, achados e resultados da auditoria permanecem inalterados. A sentinela e o hash de fechamento da auditoria referem-se à versão anterior a esta mudança de metadados e a esta nota. [Original preservado](../artifacts/planejamento-state-of-art-2026-09-14/baseline-auditoria-original.md), SHA-256 `6418f8d1cc7a6eddba7e4a1a185f1f72b11a043cd46a9bf4a832b36f7644d740`. O novo [plano](2026-09-14-plano-executivo-state-of-art-triplo-aaa.md), [roadmap](2026-09-14-roadmap-state-of-art-triplo-aaa.md) e [backlog](2026-09-14-backlog-state-of-art-triplo-aaa.md) não alteram o veredito do produto.
