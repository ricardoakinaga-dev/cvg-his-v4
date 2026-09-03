# Certificação de usabilidade hospitalar

Este roteiro completa os gates manuais que não podem ser simulados por aprovação automática. A evidência deve identificar pessoas reais e apontar para o mesmo SHA integral usado nas três execuções do workflow `Usability Certification`.

Template: [`templates/usability-certification-manual-evidence.template.json`](./templates/usability-certification-manual-evidence.template.json)

## 1. Pré-condições

- o candidato é um SHA completo de 40 caracteres, publicado em `main` e sem mudanças locais;
- as três execuções técnicas estão verdes, com 404/404, zero retry oculto, zero flaky e zero skip;
- cada execução preserva JSON, HTML, traces, screenshots, descoberta e auditoria 286/286;
- a regressão visual está 28/28 e a matriz crítica passou em Chromium, Firefox e WebKit;
- o ambiente usa apenas dados sintéticos e o pacote não contém credenciais ou dados pessoais de tutores;
- cada referência de evidência é estável e acessível aos revisores.

## 2. Preparar o pacote manual

Copie o template para um local de trabalho protegido, preencha todos os campos e não versione identificadores pessoais sem autorização. O JSON completo será armazenado como artefato do workflow por 90 dias e seu SHA-256 será incluído no índice final.

O validador rejeita placeholders, SHA divergente, papéis ou cenários ausentes, duplicidades, timestamps inválidos e referências vazias:

```bash
node scripts/validate-usability-manual-evidence.mjs \
  /caminho/seguro/evidencia-manual.json \
  '<sha-candidato-completo>' \
  go
```

## 3. Revisão visual de Produto e UX

Produto e UX devem abrir a comparação antes/depois, classificar cada arquivo como `defect-corrected` ou `intentional-change` e registrar uma decisão nominal. O contrato exige os 15 baselines alterados:

Gere o pacote lado a lado vinculado aos blobs Git antes da sessão de revisão:

```bash
pnpm review:usability:visual 844596fc55d9e189a2e7be19ecac7b170a6acced
```

Abra `artifacts/playwright/844596fc55d9e189a2e7be19ecac7b170a6acced/visual-review/index.html`. O `manifest.json` registra SHA-256 e dimensões de cada imagem antes/depois.

Para compartilhar o pacote sem depender da máquina local, execute **Actions → Prepare Usability Review**, informe o SHA completo e baixe o artefato `usability-visual-review-<sha>`. Esse workflow não recebe nomes, decisões ou outros dados pessoais.

1. `appointments-kanban-page-dark.png`;
2. `appointments-kanban-page-mobile-dark.png`;
3. `appointments-kanban-page-mobile.png`;
4. `appointments-kanban-page.png`;
5. `billing-detail-page.png`;
6. `billing-list-page.png`;
7. `dashboard-page-dark.png`;
8. `encounter-detail-page-dark.png`;
9. `encounter-detail-page.png`;
10. `medical-record-detail-page-dark.png`;
11. `owner-detail-page.png`;
12. `patient-detail-page-dark.png`;
13. `patient-detail-page.png`;
14. `queue-page-dark.png`;
15. `reception-gateway-page-dark.png`.

Uma decisão `go` exige `visualReview.result=approved` e `decision=approved` nos 15 registros. Atualizar novamente snapshots para resolver uma falha não substitui a revisão.

## 4. UAT das cinco funções

Cada função deve operar o sistema em homologação com PostgreSQL, registrar nome, identificador corporativo, data/hora, SHA, ambiente, resultado e referência de evidência. O aprovador deve exercer de fato a função ou possuir delegação formal registrada.

### Recepção (`reception`)

- cadastrar tutor e animal;
- agendar consulta e exame;
- operar fila/esteira;
- lançar consulta e exame;
- abrir e fechar comanda.

### Clínica médica (`clinical-veterinarian`)

- abrir prontuário e conferir tutor;
- registrar anamnese e atendimento;
- prescrever medicamento;
- imprimir prontuário e exame;
- consultar exames, consultas e anamneses anteriores;
- criar orçamento para o tutor.

### Patologia veterinária (`veterinary-pathologist`)

- lançar resultado de exame;
- cadastrar equipamento e enzima;
- configurar valores de referência;
- emitir laudo laboratorial com assinatura correta.

### Ultrassonografia (`veterinary-ultrasonographer`)

- acessar o caso correto e emitir laudo ultrassonográfico.

### Administração hospitalar (`hospital-administrator`)

- cadastrar usuário veterinário;
- cadastrar perfil de usuário;
- cadastrar setor hospitalar;
- atribuir permissões customizadas e confirmar as negações esperadas.

Uma decisão `go` exige `result=accepted` para as cinco funções e para cada cenário individual. `accepted-with-reservation` é registrável, mas não promove GH4.

## 5. Revisão assistiva

Execute com NVDA + Firefox ou VoiceOver + Safari. Verifique landmarks e skip link, nomes e descrições de campos, estados de loading/erro/sucesso, leitura de tabelas, foco de modais e anúncio de downloads. Registre tecnologia, browser, aprovador e evidência. Qualquer bloqueio ou ressalva impede `go`.

## 6. Riscos e decisão

Cada risco residual informa ID, severidade, descrição, responsável, prazo e quem o aceitou. Uma decisão `go` rejeita qualquer risco P0 ou P1 aberto.

O bloco `goNoGo` exige decisão, timestamp, referência da ata e aprovadores nominais de Produto, QA e Engenharia. O workflow também recusa `go` se uma das três rodadas integrais ou algum engine da matriz terminar sem sucesso.

## 7. Disparar o workflow

Na interface do GitHub, selecione **Actions → Usability Certification → Run workflow** e informe:

- `candidate_sha`: SHA completo validado;
- `manual_evidence_json`: conteúdo integral do JSON aprovado;
- `go_no_go_decision`: a mesma decisão presente no JSON.

Os jobs técnicos fazem checkout do SHA informado e confirmam que ele pertence a `origin/main`. O job de governança usa a versão atual do contrato, valida o pacote contra o candidato, e todos os artefatos são nomeados pelo SHA. O workflow executa três baterias completas e Chromium/Firefox/WebKit. Se estiver usando GitHub CLI em um ambiente autorizado, o equivalente é:

```bash
gh workflow run usability-certification.yml \
  --ref main \
  -f candidate_sha='<sha-candidato-completo>' \
  -f manual_evidence_json="$(jq -c . /caminho/seguro/evidencia-manual.json)" \
  -f go_no_go_decision='go'
```

## 8. Saída esperada

O índice final contém o SHA certificado, URLs da execução, resultados técnicos, hash do pacote manual, aprovadores, riscos e decisão. Guarde a URL da execução e os IDs dos artefatos no dossiê. GH4 só muda para `PASS` quando todos os jobs, o contrato manual e a decisão `go` estiverem verdes no mesmo candidato.
