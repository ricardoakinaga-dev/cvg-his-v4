# Backlog da auditoria — 50 ações priorizadas

**Data:** 25 de setembro de 2026. **Repositório:** CVG HIS V4.  
**Base:** HEAD `ad2f0373f68635f2579253b013a4382219906921` mais o conteúdo local preservado no manifesto.  
**Total validado:** 50 ações — **20 Alta, 25 Média e 5 Baixa**.  
**Situação:** ações propostas a partir desta auditoria; nenhuma foi implementada nesta revisão.

Relatório, notas de 26 áreas, metodologia e limites: [auditoria completa](2026-09-25-auditoria-completa-repositorio.md). Versão estruturada: [backlog.json](audits/2026-09-25/backlog.json). Resultados terminais: [execution-summary.json](audits/2026-09-25/execution-summary.json).

## Critério de prioridade e uso

**Alta** identifica impacto relevante em segurança, integridade, efeitos financeiros, continuidade ou liberação do uso hospitalar. **Média** identifica deficiência importante de confiabilidade, experiência, capacidade de prova ou manutenção. **Baixa** identifica melhorias com menor impacto imediato. A prioridade é um julgamento técnico; não é uma classificação CVSS.

Uma lacuna de homologação não significa que o fornecedor falhou. Requisitos de fornecedor ou arquitetura aplicam-se ao que for efetivamente adotado no escopo de produção. Defeito estático é distinto de falha reproduzida e de evidência ainda ausente. A conclusão de cada ação exige o efeito e a prova descritos, sem remover controles para produzir um resultado verde.

A numeração preserva a identidade dos achados. O índice está ordenado por prioridade; os detalhes seguem os IDs. As ações 3 e 4 têm efeitos diferentes: revogar consentimentos e modelar/realizar tratamento de dados com retenções explícitas. As ações 14 e 15 distinguem recuperabilidade do conteúdo e proteção do bundle.

## Índice das 50 ações

| ID | Prioridade | Ação |
|---:|---|---|
| 01 | **Alta** | [Exigir o MFA já ativado também para perfis não críticos](#acao-01) |
| 02 | **Alta** | [Preservar anexos confirmados quando um reenvio falha](#acao-02) |
| 03 | **Alta** | [Executar a revogação de consentimento antes de concluir a solicitação](#acao-03) |
| 04 | **Alta** | [Distinguir plano de tratamento de dados de eliminação ou anonimização executada](#acao-04) |
| 05 | **Alta** | [Conectar o Pix real à tentativa de pagamento do atendimento](#acao-05) |
| 06 | **Alta** | [Persistir a identidade da intenção Pix direta antes da chamada externa](#acao-06) |
| 07 | **Alta** | [Tornar durável o envio de lembretes WhatsApp](#acao-07) |
| 08 | **Alta** | [Separar accountSid e authToken na configuração WhatsApp Twilio](#acao-08) |
| 09 | **Alta** | [Persistir o acompanhamento de email, SMS e Calendar da API](#acao-09) |
| 10 | **Alta** | [Rejeitar NFS-e configurada somente com certificado enquanto esse transporte não existir](#acao-10) |
| 11 | **Alta** | [Vincular a prontidão do worker ao progresso recente](#acao-11) |
| 12 | **Alta** | [Disponibilizar a ServiceAccount antes do hook Helm de primeira instalação](#acao-12) |
| 13 | **Alta** | [Consolidar um candidato reproduzível e vincular todas as evidências](#acao-13) |
| 14 | **Alta** | [Demonstrar recuperação conjunta do PostgreSQL e dos anexos do alvo](#acao-14) |
| 15 | **Alta** | [Proteger explicitamente o bundle de backup e seu material de autenticação](#acao-15) |
| 16 | **Alta** | [Executar UAT hospitalar humana no candidato que será implantado](#acao-16) |
| 24 | **Alta** | [Vincular o benchmark ao SHA/digest efetivamente servido pelo alvo](#acao-24) |
| 32 | **Alta** | [Testar upgrade a partir da última release realmente suportada](#acao-32) |
| 35 | **Alta** | [Validar storage privado e scanner reais no ambiente alvo](#acao-35) |
| 37 | **Alta** | [Homologar autorização, captura e conciliação de cartões no adquirente](#acao-37) |
| 17 | **Média** | [Aplicar deadlines e cancelamento aos transports externos que ainda não os têm](#acao-17) |
| 18 | **Média** | [Implementar atualização e reconciliação de eventos Calendar já sincronizados](#acao-18) |
| 19 | **Média** | [Validar o contrato de conta, autenticação e payload do adapter SMS](#acao-19) |
| 20 | **Média** | [Restaurar o fechamento acessível do menu lateral em viewport compacto](#acao-20) |
| 21 | **Média** | [Alinhar labels de ambiente do Prometheus aos alertas do worker](#acao-21) |
| 22 | **Média** | [Preservar a proporção de erros HTTP em tráfego baixo](#acao-22) |
| 23 | **Média** | [Comprovar que achados SAST bloqueantes reprovam o CI](#acao-23) |
| 25 | **Média** | [Medir e certificar o escopo crítico de cobertura separado da suíte geral](#acao-25) |
| 26 | **Média** | [Incluir os arquivos Vue na análise semântica adequada ao framework](#acao-26) |
| 28 | **Média** | [Reduzir a concentração de composição e dispatch em server.ts](#acao-28) |
| 29 | **Média** | [Decompor páginas clínicas extensas por responsabilidade e estado](#acao-29) |
| 31 | **Média** | [Substituir limpeza E2E por porta/nome genérico por ownership de processos](#acao-31) |
| 33 | **Média** | [Certificar carga e failover no perfil de implantação adotado](#acao-33) |
| 34 | **Média** | [Definir renovação e recuperação da credencial Calendar](#acao-34) |
| 36 | **Média** | [Homologar a entrada de resultados com o equipamento ou bridge laboratorial utilizado](#acao-36) |
| 38 | **Média** | [Homologar o ciclo de NFS-e no município/provedor efetivo](#acao-38) |
| 39 | **Média** | [Validar entrega e callbacks dos canais de comunicação configurados](#acao-39) |
| 40 | **Média** | [Demonstrar tracing distribuído e retenção consultável](#acao-40) |
| 41 | **Média** | [Ensaiar entrega, reconhecimento e resolução de alertas](#acao-41) |
| 42 | **Média** | [Reexecutar as comparações visuais com o ambiente estabilizado](#acao-42) |
| 43 | **Média** | [Executar as jornadas críticas em Firefox e WebKit](#acao-43) |
| 44 | **Média** | [Manter o timeout da API até terminar a leitura do corpo da resposta](#acao-44) |
| 45 | **Média** | [Aplicar timeout e recuperação ao refresh compartilhado de autenticação](#acao-45) |
| 48 | **Média** | [Tornar autossuficiente e diagnosticável o teste da cadeia API–worker](#acao-48) |
| 49 | **Média** | [Distinguir heurísticas e parsing textual de capacidades OCR/ML validadas](#acao-49) |
| 27 | **Baixa** | [Reduzir os 161 avisos de lint e explicitar exceções de tipagem](#acao-27) |
| 30 | **Baixa** | [Organizar o catálogo de rotas por domínio sem perder a validação global](#acao-30) |
| 46 | **Baixa** | [Corrigir os nomes de variáveis OTel no guia de observabilidade](#acao-46) |
| 47 | **Baixa** | [Centralizar URLs e portas padrão das fixtures E2E](#acao-47) |
| 50 | **Baixa** | [Consolidar shards e contagens sem duplicar testes entre root e workspaces](#acao-50) |

## Detalhamento e critérios de conclusão

<a id="acao-01"></a>

### 01. [Alta] Exigir o MFA já ativado também para perfis não críticos

**Natureza:** Defeito estático.  
**Áreas relacionadas:** A05 — Autenticação, MFA e sessão (67/100).

**Achado e impacto:** O login condiciona o segundo fator ao papel obrigatório; um fator voluntariamente ativado fica fora dessa condição.

**Evidência:** [packages/modules/auth/src/index.ts:195](../packages/modules/auth/src/index.ts#L195); [packages/modules/auth/src/index.ts:240](../packages/modules/auth/src/index.ts#L240); [packages/modules/mfa/src/service.ts:40](../packages/modules/mfa/src/service.ts#L40).

**Critério de conclusão:** Usuário com fator ativo recebe desafio em todos os perfis; perfis obrigatórios sem fator seguem o cadastro seguro. Cobrir as duas condições por papel.

<a id="acao-02"></a>

### 02. [Alta] Preservar anexos confirmados quando um reenvio falha

**Natureza:** Risco estático de integridade.  
**Áreas relacionadas:** A17 — Anexos, armazenamento e inspeção (59/100).

**Achado e impacto:** A chave S3 é reutilizável para o mesmo conteúdo/nome; a compensação de um envio recusado pode apagar o objeto de um anexo anterior.

**Evidência:** [packages/modules/attachments/src/file-storage.ts:365](../packages/modules/attachments/src/file-storage.ts#L365); [packages/modules/attachments/src/index.ts:444](../packages/modules/attachments/src/index.ts#L444); [packages/modules/attachments/src/index.ts:507](../packages/modules/attachments/src/index.ts#L507).

**Critério de conclusão:** Usar staging/identidade de tentativa ou compensação com prova de propriedade. Reenvio com checksum incorreto e falha de metadados devem preservar integralmente o anexo anterior.

<a id="acao-03"></a>

### 03. [Alta] Executar a revogação de consentimento antes de concluir a solicitação

**Natureza:** Defeito estático.  
**Áreas relacionadas:** A18 — Privacidade, consentimento e auditoria (47/100).

**Achado e impacto:** A conclusão registra candidatos à revogação, sem executar a revogação correspondente no ramo inspecionado.

**Evidência:** [packages/modules/lgpd/src/service.ts:351](../packages/modules/lgpd/src/service.ts#L351); [packages/modules/lgpd/src/service.ts:477](../packages/modules/lgpd/src/service.ts#L477).

**Critério de conclusão:** Consentimentos aplicáveis deixam de estar ativos de forma transacional/auditável, ou a solicitação permanece pendente com motivo explícito. Testar o efeito nos dados.

<a id="acao-04"></a>

### 04. [Alta] Distinguir plano de tratamento de dados de eliminação ou anonimização executada

**Natureza:** Incoerência funcional estática.  
**Áreas relacionadas:** A18 — Privacidade, consentimento e auditoria (47/100).

**Achado e impacto:** Um plano de retenção pode levar a status concluído sem comprovação de execução. Isso não determina que registros sujeitos à retenção devam ser apagados.

**Evidência:** [packages/modules/lgpd/src/service.ts:440](../packages/modules/lgpd/src/service.ts#L440); [packages/modules/lgpd/src/service.ts:473](../packages/modules/lgpd/src/service.ts#L473).

**Critério de conclusão:** Estados separados para plano, retenção fundamentada, execução e conclusão; demonstrar efeitos e exceções por tipo de dado, com decisão de retenção validada pela autoridade responsável.

<a id="acao-05"></a>

### 05. [Alta] Conectar o Pix real à tentativa de pagamento do atendimento

**Natureza:** Lacuna de implementação/homologação.  
**Áreas relacionadas:** A14 — Pagamentos externos: Pix e cartões (45/100).

**Achado e impacto:** O adapter HTTP direto existe, mas o caminho de tentativa/dispatch/settlement inspecionado usa provider sintético, corretamente bloqueado em produção.

**Evidência:** [apps/api/src/routes/payments-routes.ts:165](../apps/api/src/routes/payments-routes.ts#L165); [apps/worker/src/bootstrap.ts:274](../apps/worker/src/bootstrap.ts#L274); [apps/api/src/routes/pix-provider-webhook-routes.ts:27](../apps/api/src/routes/pix-provider-webhook-routes.ts#L27).

**Critério de conclusão:** Provider real integrado ao comando durável, callback autenticado, reconciliação e baixa única; homologar duplicatas, ordem invertida, timeout e reinício em sandbox.

<a id="acao-06"></a>

### 06. [Alta] Persistir a identidade da intenção Pix direta antes da chamada externa

**Natureza:** Risco estático.  
**Áreas relacionadas:** A14 — Pagamentos externos: Pix e cartões (45/100).

**Achado e impacto:** A criação remota antecede a persistência local, sem chave de idempotência nesse caminho; retries e crashes podem deixar operações duplicadas ou órfãs.

**Evidência:** [packages/modules/pix/src/adapters/pagarme.adapter.ts:99](../packages/modules/pix/src/adapters/pagarme.adapter.ts#L99); [packages/modules/pix/src/adapters/pagarme.adapter.ts:147](../packages/modules/pix/src/adapters/pagarme.adapter.ts#L147); [apps/api/src/payment-gateway.ts:417](../apps/api/src/payment-gateway.ts#L417).

**Critério de conclusão:** Identidade estável vinculada ao tenant/payload antes do POST, idempotência suportada pelo provedor e reconciliação de resultado ambíguo; provar uma única cobrança em retries concorrentes.

<a id="acao-07"></a>

### 07. [Alta] Tornar durável o envio de lembretes WhatsApp

**Natureza:** Risco estático.  
**Áreas relacionadas:** A07 — Recepção, agenda, triagem e atendimento (84/100); A16 — WhatsApp, email, SMS e Calendar (41/100); A19 — Eventos, outbox, workers e concorrência (75/100).

**Achado e impacto:** O lembrete é uma tarefa assíncrona solta no processo da API, sem retomada pelo manifesto de consumidores inspecionado.

**Evidência:** [apps/api/src/runtime.ts:493](../apps/api/src/runtime.ts#L493); [apps/api/src/runtime.ts:503](../apps/api/src/runtime.ts#L503); [packages/modules/notifications-whatsapp/src/reminder-workflow.ts:68](../packages/modules/notifications-whatsapp/src/reminder-workflow.ts#L68); [apps/worker/src/consumer-composition.ts:17](../apps/worker/src/consumer-composition.ts#L17).

**Critério de conclusão:** Intenção persistida junto ao evento, execução com claim/lease, dedupe e estados terminais; reiniciar antes e depois da aceitação remota sem perder nem duplicar a entrega.

<a id="acao-08"></a>

### 08. [Alta] Separar accountSid e authToken na configuração WhatsApp Twilio

**Natureza:** Defeito estático.  
**Áreas relacionadas:** A16 — WhatsApp, email, SMS e Calendar (41/100).

**Achado e impacto:** A factory atribui a mesma apiKey aos dois campos que a própria classe modela separadamente.

**Evidência:** [packages/modules/notifications-whatsapp/src/adapters.ts:21](../packages/modules/notifications-whatsapp/src/adapters.ts#L21); [packages/modules/notifications-whatsapp/src/adapters.ts:229](../packages/modules/notifications-whatsapp/src/adapters.ts#L229).

**Critério de conclusão:** Schema, configuração e injeção aceitam credenciais independentes; testes verificam a construção da requisição sem revelar seus valores.

<a id="acao-09"></a>

### 09. [Alta] Persistir o acompanhamento de email, SMS e Calendar da API

**Natureza:** Defeito estático de durabilidade.  
**Áreas relacionadas:** A16 — WhatsApp, email, SMS e Calendar (41/100).

**Achado e impacto:** Os três históricos usam memória mesmo com adapters externos, enquanto o perfil de implantação admite múltiplas réplicas.

**Evidência:** [apps/api/src/server.ts:1026](../apps/api/src/server.ts#L1026); [apps/api/src/server.ts:1034](../apps/api/src/server.ts#L1034); [apps/api/src/server.ts:1046](../apps/api/src/server.ts#L1046); [infra/helm/cvg-his-v2/values.prod.yaml:6](../infra/helm/cvg-his-v2/values.prod.yaml#L6).

**Critério de conclusão:** Repositórios duráveis por tenant; operação criada na réplica A deve ser consultável/reconciliável na B e após reinício, com histórico e identidade preservados.

<a id="acao-10"></a>

### 10. [Alta] Rejeitar NFS-e configurada somente com certificado enquanto esse transporte não existir

**Natureza:** Defeito estático.  
**Áreas relacionadas:** A15 — Fiscal e NFS-e (41/100).

**Achado e impacto:** A validação inicial aceita uma combinação que o emissor rejeita por não implementar a assinatura PFX.

**Evidência:** [apps/api/src/server.ts:583](../apps/api/src/server.ts#L583); [packages/modules/fiscal/src/nfse-emitter.ts:389](../packages/modules/fiscal/src/nfse-emitter.ts#L389).

**Critério de conclusão:** O guard corresponde às capacidades reais: certificado isolado falha na configuração, ou assinatura/transporte são implementados e homologados. Cobrir todas as combinações de credenciais.

<a id="acao-11"></a>

### 11. [Alta] Vincular a prontidão do worker ao progresso recente

**Natureza:** Risco estático.  
**Áreas relacionadas:** A19 — Eventos, outbox, workers e concorrência (75/100); A22 — Observabilidade, tracing e alertas (56/100).

**Achado e impacto:** Um trabalho que não termina pode conservar lastError nulo e readiness positiva sem concluir novos ciclos.

**Evidência:** [apps/worker/src/health.ts:60](../apps/worker/src/health.ts#L60); [apps/worker/src/health.ts:65](../apps/worker/src/health.ts#L65); [apps/worker/src/index.ts:745](../apps/worker/src/index.ts#L745).

**Critério de conclusão:** Limites de inicialização e idade do último progresso; job suspenso com HTTP vivo deve fechar readiness no prazo e recuperá-la após progresso válido.

<a id="acao-12"></a>

### 12. [Alta] Disponibilizar a ServiceAccount antes do hook Helm de primeira instalação

**Natureza:** Defeito estático de implantação.  
**Áreas relacionadas:** A23 — Implantação, backup e recuperação (54/100).

**Achado e impacto:** O hook pre-install usa uma conta criada como recurso normal pelo mesmo chart; o namespace novo não possui essa dependência.

**Evidência:** [infra/helm/cvg-his-v2/templates/database-maintenance-jobs.yaml:10](../infra/helm/cvg-his-v2/templates/database-maintenance-jobs.yaml#L10); [infra/helm/cvg-his-v2/templates/database-maintenance-jobs.yaml:23](../infra/helm/cvg-his-v2/templates/database-maintenance-jobs.yaml#L23); [infra/helm/cvg-his-v2/templates/serviceaccount.yaml:1](../infra/helm/cvg-his-v2/templates/serviceaccount.yaml#L1).

**Critério de conclusão:** Contrato explícito para a criação prévia, com privilégio mínimo; primeira instalação em namespace vazio e upgrade subsequente concluem a manutenção do banco.

<a id="acao-13"></a>

### 13. [Alta] Consolidar um candidato reproduzível e vincular todas as evidências

**Natureza:** Bloqueio observado de release.  
**Áreas relacionadas:** A24 — Release, documentação e coerência de evidências (56/100).

**Achado e impacto:** O worktree contém 667 alterações preexistentes; o validador P0 rejeitou a ausência de um snapshot limpo. Um SHA histórico não representa os bytes locais auditados.

**Evidência:** [docs/triple-a/CURRENT_CANDIDATE_IDENTITY.json:4](../docs/triple-a/CURRENT_CANDIDATE_IDENTITY.json#L4); [scripts/run-triple-a-release-gate.mjs:509](../scripts/run-triple-a-release-gate.mjs#L509); [scripts/lib/candidate-binding.mjs:8](../scripts/lib/candidate-binding.mjs#L8).

**Critério de conclusão:** Preservar o trabalho, revisar e fixar um candidato; build, CI, imagens/digests, SBOM e decisão de release referenciam seus bytes. Alteração posterior de código invalida a certificação.

<a id="acao-14"></a>

### 14. [Alta] Demonstrar recuperação conjunta do PostgreSQL e dos anexos do alvo

**Natureza:** Lacuna de prova operacional.  
**Áreas relacionadas:** A04 — Banco, migrações e integridade estrutural (84/100); A17 — Anexos, armazenamento e inspeção (59/100); A23 — Implantação, backup e recuperação (54/100).

**Achado e impacto:** O bundle local usa Compose e diretório de arquivos; o perfil alvo usa banco externo e S3. O check de contrato executado não restaura esse conjunto.

**Evidência:** [infra/scripts/backup-v2.sh:103](../infra/scripts/backup-v2.sh#L103); [infra/scripts/backup-v2.sh:125](../infra/scripts/backup-v2.sh#L125); [infra/helm/cvg-his-v2/values.prod.yaml:84](../infra/helm/cvg-his-v2/values.prod.yaml#L84); [docs/operations/DISASTER_RECOVERY.md:8](../docs/operations/DISASTER_RECOVERY.md#L8).

**Critério de conclusão:** Drill isolado com o mecanismo real de backup, objetos e metadados, roles/RLS, dedupe e grafo clínico; registrar hashes, objetos ausentes e RPO/RTO medidos.

<a id="acao-15"></a>

### 15. [Alta] Proteger explicitamente o bundle de backup e seu material de autenticação

**Natureza:** Risco estático dependente do ambiente.  
**Áreas relacionadas:** A18 — Privacidade, consentimento e auditoria (47/100); A23 — Implantação, backup e recuperação (54/100).

**Achado e impacto:** Permissões e confidencialidade dependem do ambiente; o dump de globals pode conter verificadores de roles. SHA-256 fornece integridade, não sigilo.

**Evidência:** [infra/scripts/backup-v2.sh:89](../infra/scripts/backup-v2.sh#L89); [infra/scripts/backup-v2.sh:116](../infra/scripts/backup-v2.sh#L116); [infra/scripts/backup-v2.sh:204](../infra/scripts/backup-v2.sh#L204); [docs/operations/DISASTER_RECOVERY.md:8](../docs/operations/DISASTER_RECOVERY.md#L8).

**Critério de conclusão:** Permissões restritas e criptografia demonstradas em toda cópia/armazenamento; definir reprovisionamento de credenciais e comprovar recuperação das chaves e do bundle sintético.

<a id="acao-16"></a>

### 16. [Alta] Executar UAT hospitalar humana no candidato que será implantado

**Natureza:** Lacuna de aceitação operacional.  
**Áreas relacionadas:** A07 — Recepção, agenda, triagem e atendimento (84/100); A08 — Prontuários e histórico clínico (84/100); A09 — Internação, cirurgia e alta (79/100); A10 — Prescrição e execução de medicação (85/100); A12 — Produtos, estoque e suprimentos (79/100); A13 — Faturamento, caixa e financeiro interno (79/100).

**Achado e impacto:** Testes automáticos de personas não substituem a aceitação dos profissionais nos oito cenários do protocolo.

**Evidência:** [docs/operations/HOSPITAL_UAT_PROTOCOL.md:10](../docs/operations/HOSPITAL_UAT_PROTOCOL.md#L10); [docs/operations/HOSPITAL_UAT_PROTOCOL.md:34](../docs/operations/HOSPITAL_UAT_PROTOCOL.md#L34).

**Critério de conclusão:** Recepção, veterinário, internação e administração executam os cenários aplicáveis com dados sintéticos, casos negativos, evidências vinculadas ao SHA e decisão nominativa de go/no-go.

<a id="acao-17"></a>

### 17. [Média] Aplicar deadlines e cancelamento aos transports externos que ainda não os têm

**Natureza:** Risco estático.  
**Áreas relacionadas:** A03 — API, contratos e fronteiras de domínio (80/100); A26 — Desempenho, resiliência e capacidade no alvo (45/100).

**Achado e impacto:** As chamadas selecionadas ficam sujeitas à duração da rede/provedor; nem todos os adapters possuem o timeout já existente em outros caminhos.

**Evidência:** [packages/modules/pix/src/adapters/pagarme.adapter.ts:112](../packages/modules/pix/src/adapters/pagarme.adapter.ts#L112); [packages/modules/fiscal/src/nfse-emitter.ts:397](../packages/modules/fiscal/src/nfse-emitter.ts#L397); [apps/api/src/email-gateway.ts:61](../apps/api/src/email-gateway.ts#L61); [apps/api/src/google-calendar-gateway.ts:72](../apps/api/src/google-calendar-gateway.ts#L72).

**Critério de conclusão:** Orçamento por operação, cancelamento de headers/body e classificação de resultado ambíguo; simular retenção de resposta, 429, 5xx e conexão interrompida sem retry financeiro cego.

<a id="acao-18"></a>

### 18. [Média] Implementar atualização e reconciliação de eventos Calendar já sincronizados

**Natureza:** Defeito estático.  
**Áreas relacionadas:** A16 — WhatsApp, email, SMS e Calendar (41/100).

**Achado e impacto:** O gateway usa POST para agendamentos não cancelados, mesmo com identidade determinística já usada; o upsert atual é somente do histórico local.

**Evidência:** [apps/api/src/google-calendar-gateway.ts:50](../apps/api/src/google-calendar-gateway.ts#L50); [apps/api/src/routes/google-calendar-routes.ts:55](../apps/api/src/routes/google-calendar-routes.ts#L55); [apps/api/src/routes/google-calendar-routes.ts:65](../apps/api/src/routes/google-calendar-routes.ts#L65).

**Critério de conclusão:** Primeiro envio, repetição, remarcação e cancelamento mantêm um único evento remoto correto, com vínculo persistido e tratamento de conflito.

<a id="acao-19"></a>

### 19. [Média] Validar o contrato de conta, autenticação e payload do adapter SMS

**Natureza:** Inconsistência local; contrato externo não homologado.  
**Áreas relacionadas:** A16 — WhatsApp, email, SMS e Calendar (41/100).

**Achado e impacto:** O SMS não recebe accountSid independente e sua construção de request diverge do outro adapter Twilio. Fetch simulado não comprova compatibilidade externa.

**Evidência:** [apps/api/src/sms-gateway.ts:45](../apps/api/src/sms-gateway.ts#L45); [packages/modules/notifications-whatsapp/src/adapters.ts:65](../packages/modules/notifications-whatsapp/src/adapters.ts#L65); [tests/unit/api/operational-boundaries-coverage.test.ts:101](../tests/unit/api/operational-boundaries-coverage.test.ts#L101).

**Critério de conclusão:** Conferir documentação oficial vigente do fornecedor, corrigir schema/transporte e validar requisições e rejeições em teste de contrato e sandbox autorizado.

<a id="acao-20"></a>

### 20. [Média] Restaurar o fechamento acessível do menu lateral em viewport compacto

**Natureza:** Defeito reproduzido no navegador.  
**Áreas relacionadas:** A20 — Interface, navegação e acessibilidade (79/100).

**Achado e impacto:** O cabeçalho fica inert com o menu aberto; o botão visível de recolher não recebe o clique. A mesma falha ocorreu em duas execuções independentes.

**Evidência:** [apps/spa/src/layouts/AppLayout.vue:18](../apps/spa/src/layouts/AppLayout.vue#L18); [apps/spa/src/layouts/AppLayout.vue:36](../apps/spa/src/layouts/AppLayout.vue#L36); [e2e/spa/deleted-sales-report-flow.spec.ts:143](../e2e/spa/deleted-sales-report-flow.spec.ts#L143).

**Critério de conclusão:** Oferecer controle de fechar operável dentro da área ativa, manter foco/teclado coerentes e validar abertura/fechamento após resize e reload em 390 px sem force-click.

<a id="acao-21"></a>

### 21. [Média] Alinhar labels de ambiente do Prometheus aos alertas do worker

**Natureza:** Defeito estático de observabilidade.  
**Áreas relacionadas:** A22 — Observabilidade, tracing e alertas (56/100).

**Achado e impacto:** O scrape fornecido marca development enquanto os alertas específicos selecionam production/staging; a combinação pode coletar métricas sem ativar esses alertas.

**Evidência:** [docker-compose.v2.yml:189](../docker-compose.v2.yml#L189); [infra/observability/prometheus.yml:26](../infra/observability/prometheus.yml#L26); [infra/observability/prometheus-alerts.yml:188](../infra/observability/prometheus-alerts.yml#L188).

**Critério de conclusão:** Labels refletem o ambiente real; testes das regras demonstram disparo e resolução para perda de progresso, banco e persistência.

<a id="acao-22"></a>

### 22. [Média] Preservar a proporção de erros HTTP em tráfego baixo

**Natureza:** Defeito matemático estático.  
**Áreas relacionadas:** A22 — Observabilidade, tracing e alertas (56/100).

**Achado e impacto:** clamp_min da taxa total em 1 reduz artificialmente a proporção quando há menos de uma requisição por segundo.

**Evidência:** [infra/observability/prometheus-alerts.yml:25](../infra/observability/prometheus-alerts.yml#L25); [infra/observability/prometheus-alerts.yml:35](../infra/observability/prometheus-alerts.yml#L35).

**Critério de conclusão:** Tratar ausência de tráfego e tamanho de amostra sem alterar a razão; 0,002 erros/s em 0,2 requests/s deve resultar em 1%, não 0,2%.

<a id="acao-23"></a>

### 23. [Média] Comprovar que achados SAST bloqueantes reprovam o CI

**Natureza:** Lacuna de bloqueio demonstrável.  
**Áreas relacionadas:** A06 — Autorização, tenant e controles de segurança (86/100); A24 — Release, documentação e coerência de evidências (56/100).

**Achado e impacto:** O job publica scan e contagens sem política explícita de fail-on-findings nessa etapa; proteção remota adicional não foi verificada.

**Evidência:** [.github/workflows/ci.yml:104](../.github/workflows/ci.yml#L104); [.github/workflows/ci.yml:122](../.github/workflows/ci.yml#L122).

**Critério de conclusão:** Severidades e exceções definidas; fixture que viola uma regra produz falha e impede promoção, enquanto o caso limpo passa.

<a id="acao-24"></a>

### 24. [Alta] Vincular o benchmark ao SHA/digest efetivamente servido pelo alvo

**Natureza:** Lacuna de identidade da evidência.  
**Áreas relacionadas:** A24 — Release, documentação e coerência de evidências (56/100); A26 — Desempenho, resiliência e capacidade no alvo (45/100).

**Achado e impacto:** O nome do artifact usa o SHA solicitado, mas a URL medida é independente e o relatório não prova a identidade do deployment servido.

**Evidência:** [.github/workflows/performance-certification.yml:92](../.github/workflows/performance-certification.yml#L92); [.github/workflows/performance-certification.yml:108](../.github/workflows/performance-certification.yml#L108); [benchmarks/k6/api-benchmark.js:365](../benchmarks/k6/api-benchmark.js#L365).

**Critério de conclusão:** Ler identidade confiável antes/depois da carga e comparar com o candidato; registrar recursos/perfil e rejeitar alvo com versão diferente.

<a id="acao-25"></a>

### 25. [Média] Medir e certificar o escopo crítico de cobertura separado da suíte geral

**Natureza:** Lacuna de cobertura certificada.  
**Áreas relacionadas:** A10 — Prescrição e execução de medicação (85/100); A21 — Testes, cobertura e confiabilidade das suítes (73/100).

**Achado e impacto:** A cobertura geral exclui rotas, repositórios e domínios críticos; o manifesto específico permanece não certificado. Testes verdes não informam seu percentual de cobertura.

**Evidência:** [vitest.config.ts:62](../vitest.config.ts#L62); [vitest.critical-coverage.config.ts:1](../vitest.critical-coverage.config.ts#L1); [docs/engineering/critical-coverage-scope.json:1](../docs/engineering/critical-coverage-scope.json#L1).

**Critério de conclusão:** Executar e combinar os shards previstos, aplicar thresholds ao denominador declarado e publicar resultados atuais por área, sem usar exclusões para aparentar cobertura do produto inteiro.

<a id="acao-26"></a>

### 26. [Média] Incluir os arquivos Vue na análise semântica adequada ao framework

**Natureza:** Lacuna de análise estática.  
**Áreas relacionadas:** A02 — Build, tipos e dependências (89/100).

**Achado e impacto:** O runner semântico seleciona extensões TS/JS e deixa os SFCs fora desse controle, embora o build realize verificação de tipos Vue.

**Evidência:** [scripts/run-semantic-lint.mjs:19](../scripts/run-semantic-lint.mjs#L19); [.eslintrc.semantic.cjs:14](../.eslintrc.semantic.cjs#L14); [apps/spa/package.json:1](../apps/spa/package.json#L1).

**Critério de conclusão:** Parser e regras de Vue executados sobre os SFCs com baseline revisado; a análise deve detectar uma violação controlada sem substituir o typecheck existente.

<a id="acao-27"></a>

### 27. [Baixa] Reduzir os 161 avisos de lint e explicitar exceções de tipagem

**Natureza:** Dívida de qualidade observada.  
**Áreas relacionadas:** A02 — Build, tipos e dependências (89/100).

**Achado e impacto:** Lint passou com 161 avisos em 14 pacotes; o estado verde permite que a dívida continue crescendo.

**Evidência:** [.eslintrc.semantic.cjs:14](../.eslintrc.semantic.cjs#L14); [packages/modules/event-bus/src/index.ts:1](../packages/modules/event-bus/src/index.ts#L1); [apps/spa/src/services/api.ts:14](../apps/spa/src/services/api.ts#L14).

**Critério de conclusão:** Inventário por regra/owner, correção priorizada nas fronteiras de dados e orçamento que impeça crescimento, mantendo exceções justificadas em vez de silenciar regras globalmente.

<a id="acao-28"></a>

### 28. [Média] Reduzir a concentração de composição e dispatch em server.ts

**Natureza:** Dívida arquitetural medida.  
**Áreas relacionadas:** A01 — Arquitetura e modularidade (78/100); A03 — API, contratos e fronteiras de domínio (80/100).

**Achado e impacto:** O servidor concentra 3.473 linhas apesar dos handlers extraídos, aumentando o alcance de mudanças e o custo da revisão.

**Evidência:** [apps/api/src/server.ts:1](../apps/api/src/server.ts#L1); [apps/api/src/bootstrap.ts:1](../apps/api/src/bootstrap.ts#L1); [scripts/check-complexity-hotspots.mjs:1](../scripts/check-complexity-hotspots.mjs#L1).

**Critério de conclusão:** Extrair composição por fronteira de responsabilidade com dependências explícitas; preservar contratos HTTP, autorização e transações com regressão focal, sem fragmentar apenas para reduzir linhas.

<a id="acao-29"></a>

### 29. [Média] Decompor páginas clínicas extensas por responsabilidade e estado

**Natureza:** Dívida arquitetural medida.  
**Áreas relacionadas:** A01 — Arquitetura e modularidade (78/100); A08 — Prontuários e histórico clínico (84/100); A20 — Interface, navegação e acessibilidade (79/100).

**Achado e impacto:** Há páginas de 4.007 e 3.002 linhas e layout de 2.803 linhas; formulário, navegação e estado clínico exigem revisão conjunta extensa.

**Evidência:** [apps/spa/src/pages/patients/PatientDetailPage.vue:1](../apps/spa/src/pages/patients/PatientDetailPage.vue#L1); [apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue:1](../apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue#L1); [apps/spa/src/layouts/AppLayout.vue:1](../apps/spa/src/layouts/AppLayout.vue#L1).

**Critério de conclusão:** Componentes/composables com ownership claro e contratos tipados; preservar drafts, permissões, carregamento/erro, foco e jornadas aprovadas no navegador.

<a id="acao-30"></a>

### 30. [Baixa] Organizar o catálogo de rotas por domínio sem perder a validação global

**Natureza:** Melhoria de manutenção.  
**Áreas relacionadas:** A01 — Arquitetura e modularidade (78/100).

**Achado e impacto:** O arquivo de rotas tem 2.920 linhas; navegação, aliases e permissões ficam mais difíceis de revisar em conjunto.

**Evidência:** [apps/spa/src/router/routes.ts:1](../apps/spa/src/router/routes.ts#L1); [e2e/spa/master-usability-audit.spec.ts:76](../e2e/spa/master-usability-audit.spec.ts#L76).

**Critério de conclusão:** Catálogo composto por domínio, metadados tipados e prova de que nenhuma rota/alias/permissão desaparece; manter a varredura das 150 entradas de navegação.

<a id="acao-31"></a>

### 31. [Média] Substituir limpeza E2E por porta/nome genérico por ownership de processos

**Natureza:** Risco estático do tooling.  
**Áreas relacionadas:** A21 — Testes, cobertura e confiabilidade das suítes (73/100).

**Achado e impacto:** Comandos fuser/pkill podem encerrar um processo que não foi iniciado pela execução corrente e dificultam testes simultâneos.

**Evidência:** [package.json:78](../package.json#L78); [playwright.config.ts:47](../playwright.config.ts#L47); [infra/scripts/run-e2e-spa.sh:64](../infra/scripts/run-e2e-spa.sh#L64).

**Critério de conclusão:** Cada execução registra PIDs, portas e projeto próprios; cleanup remove somente recursos comprovadamente pertencentes à execução, inclusive após falha.

<a id="acao-32"></a>

### 32. [Alta] Testar upgrade a partir da última release realmente suportada

**Natureza:** Lacuna de atualização operacional.  
**Áreas relacionadas:** A04 — Banco, migrações e integridade estrutural (84/100); A09 — Internação, cirurgia e alta (79/100); A12 — Produtos, estoque e suprimentos (79/100); A23 — Implantação, backup e recuperação (54/100).

**Achado e impacto:** Partir da penúltima migração atual não demonstra compatibilidade com a aplicação e o banco da instalação anterior real.

**Evidência:** [infra/scripts/run-install-upgrade-drill.mjs:31](../infra/scripts/run-install-upgrade-drill.mjs#L31); [docs/131-checklist-cutover-servidor.md:1](../docs/131-checklist-cutover-servidor.md#L1).

**Critério de conclusão:** Restaurar snapshot sintético representativo da release suportada e executar upgrade/estratégia de retorno; conferir roles, dados clínicos, objetos, dedupe e versão da aplicação.

<a id="acao-33"></a>

### 33. [Média] Certificar carga e failover no perfil de implantação adotado

**Natureza:** Lacuna de capacidade operacional.  
**Áreas relacionadas:** A13 — Faturamento, caixa e financeiro interno (79/100); A26 — Desempenho, resiliência e capacidade no alvo (45/100).

**Achado e impacto:** Build e testes locais não medem latência/capacidade sustentada ou comportamento de todas as réplicas no servidor escolhido.

**Evidência:** [docs/engineering/SLO_AND_LOAD_PROFILE.md:35](../docs/engineering/SLO_AND_LOAD_PROFILE.md#L35); [infra/helm/cvg-his-v2/values.prod.yaml:6](../infra/helm/cvg-his-v2/values.prod.yaml#L6); [apps/worker/src/health.ts:65](../apps/worker/src/health.ts#L65).

**Critério de conclusão:** Aprovar perfil e recursos, medir p95/p99/erros e crescimento; ensaiar troca de réplica/worker sem efeito duplicado e executar endurance no tenant descartável autorizado.

<a id="acao-34"></a>

### 34. [Média] Definir renovação e recuperação da credencial Calendar

**Natureza:** Lacuna de ciclo de credenciais.  
**Áreas relacionadas:** A16 — WhatsApp, email, SMS e Calendar (41/100).

**Achado e impacto:** O gateway recebe um access token estático; o mecanismo externo de renovação e tratamento de expiração não foi demonstrado.

**Evidência:** [apps/api/src/google-calendar-gateway.ts:50](../apps/api/src/google-calendar-gateway.ts#L50); [apps/api/src/server.ts:1037](../apps/api/src/server.ts#L1037).

**Critério de conclusão:** Fluxo de renovação ou contrato operacional explícito, segregado por conta quando aplicável; expiração/rotação não perde o vínculo nem duplica eventos.

<a id="acao-35"></a>

### 35. [Alta] Validar storage privado e scanner reais no ambiente alvo

**Natureza:** Lacuna de homologação de dependência crítica.  
**Áreas relacionadas:** A06 — Autorização, tenant e controles de segurança (86/100); A17 — Anexos, armazenamento e inspeção (59/100).

**Achado e impacto:** Os controles existem, mas esta auditoria não comprova IAM, isolamento de bucket, disponibilidade ou inspeção do serviço efetivamente instalado.

**Evidência:** [apps/api/src/server.ts:606](../apps/api/src/server.ts#L606); [packages/modules/attachments/src/file-storage.test.ts:13](../packages/modules/attachments/src/file-storage.test.ts#L13); [packages/modules/attachments/src/index.ts:353](../packages/modules/attachments/src/index.ts#L353).

**Critério de conclusão:** Upload/download autorizado, recusa entre tenants, quarentena, arquivo de teste de scanner e indisponibilidade do serviço demonstrados com dados sintéticos; guardar evidência do provider real.

<a id="acao-36"></a>

### 36. [Média] Homologar a entrada de resultados com o equipamento ou bridge laboratorial utilizado

**Natureza:** Lacuna de integração operacional.  
**Áreas relacionadas:** A11 — Diagnóstico, laboratório e imagem (77/100).

**Achado e impacto:** Endpoint, assinatura e persistência não demonstram por si só compatibilidade com o equipamento do hospital.

**Evidência:** [apps/api/src/server.ts:1047](../apps/api/src/server.ts#L1047); [tests/integration/database/laboratory-provider-ingress.test.ts:1](../tests/integration/database/laboratory-provider-ingress.test.ts#L1); [tests/integration/process/public-laboratory-structured-results.test.ts:1](../tests/integration/process/public-laboratory-structured-results.test.ts#L1).

**Critério de conclusão:** Contrato e amostras reais desidentificadas, campos/unidades/identidade de paciente, assinatura, duplicata e resultado malformado validados contra o bridge autorizado.

<a id="acao-37"></a>

### 37. [Alta] Homologar autorização, captura e conciliação de cartões no adquirente

**Natureza:** Lacuna de homologação financeira.  
**Áreas relacionadas:** A13 — Faturamento, caixa e financeiro interno (79/100); A14 — Pagamentos externos: Pix e cartões (45/100).

**Achado e impacto:** Há adapter, persistência e testes controlados; nenhuma transação no sandbox do adquirente foi executada nesta auditoria.

**Evidência:** [apps/api/src/payment-gateway.ts:517](../apps/api/src/payment-gateway.ts#L517); [apps/api/src/payment-gateway.ts:715](../apps/api/src/payment-gateway.ts#L715); [tests/integration/card-creation-durable.test.ts:1](../tests/integration/card-creation-durable.test.ts#L1).

**Critério de conclusão:** Validar valores/unidades, vínculo, autorização/captura, resposta ambígua, recusa e reconciliação, com uma única operação financeira observável por identidade.

<a id="acao-38"></a>

### 38. [Média] Homologar o ciclo de NFS-e no município/provedor efetivo

**Natureza:** Lacuna de homologação fiscal.  
**Áreas relacionadas:** A15 — Fiscal e NFS-e (41/100).

**Achado e impacto:** O transporte XML genérico e uma lista de providers não demonstram emissão, consulta e cancelamento aceitos pela integração efetiva.

**Evidência:** [packages/modules/fiscal/src/nfse-emitter.ts:397](../packages/modules/fiscal/src/nfse-emitter.ts#L397); [tests/integration/database/fiscal-nfse-provider-postgres.test.ts:1](../tests/integration/database/fiscal-nfse-provider-postgres.test.ts#L1).

**Critério de conclusão:** Validar schema, autenticação, autorização e ciclo documental no ambiente oficial de homologação aplicável; registrar rejeições e reconciliação sem simular autorização.

<a id="acao-39"></a>

### 39. [Média] Validar entrega e callbacks dos canais de comunicação configurados

**Natureza:** Lacuna de homologação de comunicação.  
**Áreas relacionadas:** A16 — WhatsApp, email, SMS e Calendar (41/100).

**Achado e impacto:** Aceitação de HTTP em mocks não prova entrega, templates/remetentes, bridge inbound nem retorno de status dos fornecedores.

**Evidência:** [apps/api/src/routes/whatsapp-routes.ts:165](../apps/api/src/routes/whatsapp-routes.ts#L165); [apps/api/src/email-gateway.ts:61](../apps/api/src/email-gateway.ts#L61); [apps/worker/src/report-delivery-provider.ts:77](../apps/worker/src/report-delivery-provider.ts#L77); [packages/modules/notifications-whatsapp/src/adapters.ts:175](../packages/modules/notifications-whatsapp/src/adapters.ts#L175).

**Critério de conclusão:** Sandbox autorizado por canal, remetentes/destinatários sintéticos, estados de aceitação/entrega/rejeição e callbacks autenticados; demonstrar retry durável e correlação com a operação local.

<a id="acao-40"></a>

### 40. [Média] Demonstrar tracing distribuído e retenção consultável

**Natureza:** Lacuna de observabilidade no alvo.  
**Áreas relacionadas:** A22 — Observabilidade, tracing e alertas (56/100).

**Achado e impacto:** Os testes de tracing locais não comprovam recepção, armazenamento e consulta das cadeias API–worker–provedor no alvo.

**Evidência:** [apps/api/src/tracing.ts:1](../apps/api/src/tracing.ts#L1); [infra/observability/README.md:133](../infra/observability/README.md#L133); [apps/worker/src/report-delivery-provider.ts:77](../apps/worker/src/report-delivery-provider.ts#L77).

**Critério de conclusão:** Uma jornada sintética recuperável por correlação, com spans pai/filho, falha/retry e política de retenção/redação verificada no coletor e backend escolhidos.

<a id="acao-41"></a>

### 41. [Média] Ensaiar entrega, reconhecimento e resolução de alertas

**Natureza:** Lacuna de resposta operacional.  
**Áreas relacionadas:** A22 — Observabilidade, tracing e alertas (56/100).

**Achado e impacto:** Regras presentes e validadas estruturalmente não demonstram que a equipe recebe e resolve um incidente no ambiente instalado.

**Evidência:** [infra/observability/prometheus-alerts.yml:1](../infra/observability/prometheus-alerts.yml#L1); [docs/operations/DISASTER_RECOVERY.md:5](../docs/operations/DISASTER_RECOVERY.md#L5).

**Critério de conclusão:** Ensaio autorizado em canal de teste com perda de progresso, banco indisponível e erro HTTP; registrar firing, notificação, reconhecimento, runbook e resolução sem enviar mensagens durante esta auditoria.

<a id="acao-42"></a>

### 42. [Média] Reexecutar as comparações visuais com o ambiente estabilizado

**Natureza:** Lacuna de evidência visual atual.  
**Áreas relacionadas:** A20 — Interface, navegação e acessibilidade (79/100); A21 — Testes, cobertura e confiabilidade das suítes (73/100).

**Achado e impacto:** A tentativa visual desta auditoria foi afetada por recusa de conexão; ela não permite concluir aprovação nem regressão de snapshots.

**Evidência:** [e2e/spa/visual/visual-regression.spec.ts:87](../e2e/spa/visual/visual-regression.spec.ts#L87); [playwright-spa.config.ts:106](../playwright-spa.config.ts#L106).

**Critério de conclusão:** Mesma versão de navegador/fontes/viewport, baseline revisada e resultados vinculados aos bytes do candidato; investigar diferenças antes de atualizar imagens.

<a id="acao-43"></a>

### 43. [Média] Executar as jornadas críticas em Firefox e WebKit

**Natureza:** Lacuna de compatibilidade.  
**Áreas relacionadas:** A20 — Interface, navegação e acessibilidade (79/100); A21 — Testes, cobertura e confiabilidade das suítes (73/100).

**Achado e impacto:** A configuração oferece esses projetos, mas a execução desta auditoria utilizou Chromium.

**Evidência:** [playwright-spa.config.ts:39](../playwright-spa.config.ts#L39); [playwright-spa.config.ts:43](../playwright-spa.config.ts#L43).

**Critério de conclusão:** Login/refresh, formulários, uploads, impressão/exportação e navegação compacta aprovados nos navegadores suportados, com falhas específicas registradas.

<a id="acao-44"></a>

### 44. [Média] Manter o timeout da API até terminar a leitura do corpo da resposta

**Natureza:** Risco estático de resiliência da interface.  
**Áreas relacionadas:** A03 — API, contratos e fronteiras de domínio (80/100); A20 — Interface, navegação e acessibilidade (79/100).

**Achado e impacto:** O temporizador é limpo quando fetch devolve os headers; response.json é consumido depois, fora desse orçamento, e pode manter a interface pendente.

**Evidência:** [apps/spa/src/services/api.ts:213](../apps/spa/src/services/api.ts#L213); [apps/spa/src/services/api.ts:259](../apps/spa/src/services/api.ts#L259); [apps/spa/src/services/api.ts:323](../apps/spa/src/services/api.ts#L323).

**Critério de conclusão:** Deadline cobre conexão, headers e body; resposta com headers rápidos e corpo suspenso termina com estado incerto explícito e recursos cancelados.

<a id="acao-45"></a>

### 45. [Média] Aplicar timeout e recuperação ao refresh compartilhado de autenticação

**Natureza:** Risco estático de sessão.  
**Áreas relacionadas:** A05 — Autenticação, MFA e sessão (67/100); A20 — Interface, navegação e acessibilidade (79/100).

**Achado e impacto:** refreshPromise é compartilhada e a chamada de renovação não tem deadline; um refresh suspenso pode bloquear as requisições que aguardam renovação.

**Evidência:** [apps/spa/src/services/api.ts:29](../apps/spa/src/services/api.ts#L29); [apps/spa/src/services/api.ts:34](../apps/spa/src/services/api.ts#L34); [apps/spa/src/services/api.ts:284](../apps/spa/src/services/api.ts#L284).

**Critério de conclusão:** Renovação e consumo de body terminam no orçamento, liberam o single-flight e permitem recuperação controlada sem loops ou múltiplos logins concorrentes.

<a id="acao-46"></a>

### 46. [Baixa] Corrigir os nomes de variáveis OTel no guia de observabilidade

**Natureza:** Divergência documental estática.  
**Áreas relacionadas:** A22 — Observabilidade, tracing e alertas (56/100); A24 — Release, documentação e coerência de evidências (56/100).

**Achado e impacto:** O guia usa OTLP_* onde o loader e Compose usam OTEL_EXPORTER_OTLP_*.

**Evidência:** [infra/observability/README.md:133](../infra/observability/README.md#L133); [packages/shared/config/src/index.ts:183](../packages/shared/config/src/index.ts#L183); [docker-compose.v2.yml:199](../docker-compose.v2.yml#L199).

**Critério de conclusão:** Tabela e exemplos usam nomes aceitos pelo parser; exemplo de configuração é validado localmente e explica onde os traces são retidos.

<a id="acao-47"></a>

### 47. [Baixa] Centralizar URLs e portas padrão das fixtures E2E

**Natureza:** Dívida de configuração de testes.  
**Áreas relacionadas:** A21 — Testes, cobertura e confiabilidade das suítes (73/100).

**Achado e impacto:** Defaults 3101/3102 e 3111/3112 coexistem. Overrides corretos funcionam, mas executar fixtures fora do wrapper aumenta a chance de apontar ao servidor errado.

**Evidência:** [playwright-spa.config.ts:4](../playwright-spa.config.ts#L4); [e2e/spa/fixtures/spa-fixture.ts:18](../e2e/spa/fixtures/spa-fixture.ts#L18); [e2e/spa/visual/visual-regression.spec.ts:33](../e2e/spa/visual/visual-regression.spec.ts#L33).

**Critério de conclusão:** Uma fonte de configuração e verificação explícita de identidade/disponibilidade do servidor; todas as suítes respeitam as mesmas URLs e falham com diagnóstico claro.

<a id="acao-48"></a>

### 48. [Média] Tornar autossuficiente e diagnosticável o teste da cadeia API–worker

**Natureza:** Falha reproduzida na fixture de integração.  
**Áreas relacionadas:** A19 — Eventos, outbox, workers e concorrência (75/100); A21 — Testes, cobertura e confiabilidade das suítes (73/100).

**Achado e impacto:** O teste inicia worker em staging sem declarar METRICS_AUTH_TOKEN, exigido pelo guard. Falhou duas vezes em ambiente limpo; a asserção do finally ainda pode esconder a causa original.

**Evidência:** [tests/integration/process/public-api-worker-event-chain.test.ts:182](../tests/integration/process/public-api-worker-event-chain.test.ts#L182); [tests/integration/process/public-api-worker-event-chain.test.ts:502](../tests/integration/process/public-api-worker-event-chain.test.ts#L502); [apps/worker/src/metrics-auth.ts:31](../apps/worker/src/metrics-auth.ts#L31).

**Critério de conclusão:** Fixture fornece explicitamente todas as configurações sintéticas obrigatórias, preserva o erro primário e anexa saída redigida do filho; rodar a cadeia isolada e na suíte completa sem depender de .env local.

<a id="acao-49"></a>

### 49. [Média] Distinguir heurísticas e parsing textual de capacidades OCR/ML validadas

**Natureza:** Lacuna de validação analítica.  
**Áreas relacionadas:** A11 — Diagnóstico, laboratório e imagem (77/100); A25 — Automação analítica, heurísticas e OCR/ML (39/100).

**Achado e impacto:** A prévia fiscal recebe rawText e usa expressões regulares; previsões/confiança incluem fórmulas fixas. Esses números não demonstram probabilidade calibrada nem extração de imagem.

**Evidência:** [packages/modules/ml/src/ocr-fiscal.service.ts:3](../packages/modules/ml/src/ocr-fiscal.service.ts#L3); [packages/modules/ml/src/ocr-fiscal.service.ts:143](../packages/modules/ml/src/ocr-fiscal.service.ts#L143); [packages/modules/ml/src/demand-forecasting.service.ts:83](../packages/modules/ml/src/demand-forecasting.service.ts#L83); [packages/modules/ml/src/smart-scheduling.service.ts:185](../packages/modules/ml/src/smart-scheduling.service.ts#L185).

**Critério de conclusão:** Descrever o escopo real na UI/documentação; medir erro e calibração em amostras representativas separadas da implementação. Resultados laboratoriais assistidos exigem validação pelo responsável clínico antes de uso decisório.

<a id="acao-50"></a>

### 50. [Baixa] Consolidar shards e contagens sem duplicar testes entre root e workspaces

**Natureza:** Melhoria de eficiência e leitura de evidências.  
**Áreas relacionadas:** A21 — Testes, cobertura e confiabilidade das suítes (73/100).

**Achado e impacto:** O runner root inclui módulos que também executam nos workspaces; somar suas contagens como testes únicos distorce o tamanho da prova e prolonga o ciclo.

**Evidência:** [vitest.config.ts:8](../vitest.config.ts#L8); [scripts/run-root-test-suite.mjs:1](../scripts/run-root-test-suite.mjs#L1); [package.json:1](../package.json#L1).

**Critério de conclusão:** Inventário de testes por arquivo/caso, relatório agregado sem dupla contagem e shards com ownership claro; reduzir repetição mantendo os mesmos contratos e checks de integração.

## Verificação do backlog

Os IDs são consecutivos de 1 a 50, sem duplicação. Todas as referências de arquivo e linha foram verificadas contra o snapshot local. As etiquetas totalizam 20 Alta, 25 Média e 5 Baixa. A validação dos links e dos critérios numéricos consta em [report-validation.json](audits/2026-09-25/report-validation.json). Localizar uma fonte não substitui testar a correção proposta; os critérios acima orientam a futura evidência de conclusão.
