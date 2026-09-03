# Roadmap de melhorias de usabilidade Playwright — CVG-HIS V4

> Atualização de execução: a implementação e as pendências de certificação estão consolidadas no [relatório de implementação](./2026-09-02-implementacao-usabilidade-playwright-cvg-his-v4.md).

Data-base: 2 de setembro de 2026  
Horizonte indicativo: 12 semanas, em seis sprints de duas semanas  
Fonte: [Relatório master](./2026-09-02-relatorio-master-usabilidade-playwright-cvg-his-v4.md)  
Direção: [Plano executivo](./2026-09-02-plano-executivo-melhorias-usabilidade-playwright-cvg-his-v4.md)  
Itens executáveis: [Backlog priorizado](./2026-09-02-backlog-priorizado-usabilidade-playwright-cvg-his-v4.md)

## 1. Premissas de planejamento

- equipe recomendada: 2 backend, 2 frontend, 1 QA/automação, 0,5 DevOps/SRE e participação de Produto/Operação;
- sprints de duas semanas com demonstração Playwright ao final;
- 15–20% da capacidade reservada para defeitos adicionais revelados pelo PostgreSQL;
- nenhuma nova feature concorre com P0/P1 antes de G2;
- o prazo é recalculado se a capacidade ou a disponibilidade do ambiente for menor;
- cada onda termina por evidência, não apenas pelo calendário.

## 2. Visão das ondas

| Onda                               | Semanas | Objetivo                                 | Resultado principal                                                | Gate       |
| ---------------------------------- | ------: | ---------------------------------------- | ------------------------------------------------------------------ | ---------- |
| R0 — Ambiente e baseline confiável |     1–2 | remover a incerteza do modo em memória   | PostgreSQL saudável, 369 casos coletáveis e falhas reclassificadas | G0         |
| R1 — Jornada clínica e faturamento |     3–4 | recuperar os fluxos mais impeditivos     | adapter atômico, prontuário, exames, saldo e visual clínico verdes | G1 parcial |
| R2 — APIs, relatórios e exports    |     5–6 | eliminar os erros e timeouts de dados    | 33 rotas sem erro inesperado; downloads determinísticos            | G1/G2      |
| R3 — Shell, acessibilidade e RBAC  |     7–8 | corrigir causas transversais             | um `main`, labels/alvos conformes e perfis sem sobrebusca ruidosa  | G3 parcial |
| R4 — Mobile e regressão integral   |    9–10 | fechar responsividade e todos os skips   | zero overflow, 28/28 snapshots e matriz persistente verde          | G3         |
| R5 — Certificação                  |   11–12 | provar estabilidade do release candidate | três rodadas 369/369, UAT e decisão go/no-go                       | G4         |

## 3. R0 — Ambiente e baseline confiável

### Objetivo

Eliminar a principal limitação do laudo: API em modo `in-memory`, `productionReady=false` e PostgreSQL recusando conexão em `127.0.0.1:5433`.

### Entregas

- `ENV-001`: ambiente PostgreSQL reproduzível;
- `ENV-002`: migrations e seed determinísticos;
- `ENV-003`: browser Playwright e dependências na CI;
- `ENV-004`: artefatos HTML/JSON/screenshots vinculados ao SHA;
- `QAG-001`: reexecução da baseline completa com banco;
- `QAG-002`: gate que diferencia coleta concluída de conformidade aprovada;
- classificação das 33 rotas por causa real.

### Critérios de saída

- API inicia com banco saudável e não anuncia fallback em memória;
- os seis testes antes pulados são executados;
- os 369 casos são descobertos e executáveis em checkout limpo;
- o pipeline falha quando o JSON possui registro interno `failed`;
- triagem registra owner e causa para cada falha restante.

### Decisão ao final

Reestimar R1–R5 usando a baseline com PostgreSQL. Se surgirem novos defeitos de perda, corrupção, isolamento ou segurança, eles entram como P0 antes da continuidade.

## 4. R1 — Jornada clínica e faturamento

### Objetivo

Corrigir as causas que quebraram prontuário, internação, exames, Busca Mestre, walkthrough e a única regressão visual, além do saldo incorreto após quitação.

### Entregas

- `CLN-001`: disponibilizar o adapter atômico de prontuário em runtime de teste/produção;
- `CLN-002`: provar atomicidade, idempotência e rollback do fluxo clínico;
- `CLN-003`: recuperar o detalhe do prontuário e seu snapshot escuro;
- `BIL-001`: atualizar saldo e estados derivados imediatamente após recebimento;
- regressões Playwright para refresh, restart e reabertura da tela.

### Critérios de saída

- zero `500` de criação de prontuário/ordem;
- fluxo crítico e walkthrough chegam ao fim;
- Busca Mestre apresenta o paciente com exame pendente;
- recebimento confirmado exibe saldo `R$ 0,00` sem recarregamento manual;
- screenshot de prontuário mostra o conteúdo clínico, não uma tela de erro;
- nenhum baseline visual foi atualizado para mascarar falha.

## 5. R2 — APIs, relatórios e exports

### Objetivo

Eliminar as 66 renderizações com erro HTTP e os dois downloads que expiraram em 90 segundos.

### Pacotes de correção

| Pacote    | Escopo                                  |   Rotas afetadas |
| --------- | --------------------------------------- | ---------------: |
| `API-001` | catálogos/financeiro com `503`          |               11 |
| `API-002` | `/api/reports/administrative-hubs`      |               11 |
| `API-003` | `/api/reports/executions`               |               11 |
| `EXP-001` | export de agenda                        |          1 fluxo |
| `EXP-002` | export de estoque                       |          1 fluxo |
| `EXP-003` | contrato compartilhado de download/erro | todos os exports |

### Regras de solução

- fonte obrigatória disponível: responder com dados persistidos e auditáveis;
- ausência de dados válida: responder sucesso com estado vazio, conforme contrato;
- dependência indisponível: exibir mensagem acionável e retry, sem spinner infinito;
- erro de validação: corrigir request/contrato, não transformar em `200` enganoso;
- export: produzir arquivo com nome, MIME, colunas e auditoria definidos.

### Critérios de saída

- nenhuma das 33 rotas gera `4xx/5xx` inesperado em desktop ou mobile;
- relatório de exclusão retorna `reportId` e dados coerentes;
- agenda e estoque disparam download dentro do timeout de aceite;
- falhas induzidas recebem feedback em até 1 segundo e encerram em tempo limitado;
- arquivo exportado é aberto e validado pelo teste, não apenas baixado.

## 6. R3 — Shell, acessibilidade e RBAC

### Objetivo

Eliminar as não conformidades transversais que fazem 286/286 registros internos falharem e remover chamadas proibidas desnecessárias para papéis restritos.

### Entregas

- `A11Y-001`: manter um único landmark `main`;
- `A11Y-002` e `A11Y-003`: corrigir contrato do componente e os sete campos observados;
- `A11Y-004`: ampliar breadcrumbs, dismiss de alertas e links compactos;
- `A11Y-005`: executar Axe e navegação por teclado nas jornadas críticas;
- `RBAC-001`: carregar somente recursos permitidos ao papel;
- `RBAC-002`: ampliar a matriz Playwright de allow/deny sem conceder privilégios extras;
- `API-004`: padronizar estados vazio, erro e retry.

### Critérios de saída

- 0/286 telas com `main` duplicado;
- zero campo visível sem nome programático;
- zero alvo visível menor que `24x24px` na regra automatizada;
- administrador, veterinário, enfermagem e recepção mantêm 12/12 cenários verdes;
- não há `403` gerado por requisição que a própria UI poderia evitar;
- testes negativos continuam provando a proibição de acesso.

## 7. R4 — Mobile e regressão integral

### Objetivo

Corrigir os dez overflows e executar todas as provas antes impossíveis no modo em memória.

### Entregas

- `RWD-001`: seis rotas financeiras mobile com excesso de 264–460px;
- `RWD-002`: quatro excessos residuais de 5–24px;
- `RWD-003`: componente/tabela responsiva e regra global de regressão;
- `QAG-003`: seis testes persistentes antes pulados;
- auditoria das 143 rotas nos dois viewports;
- regressão dos 28 snapshots em claro/escuro.

### Critérios de saída

- `scrollWidth <= clientWidth + 2px` em todas as 286 renderizações;
- nenhuma ação primária, filtro ou dado crítico fica fora do viewport;
- tabelas oferecem padrão mobile aprovado: scroll local, cards ou colunas priorizadas;
- seis testes persistentes executam e passam;
- 28/28 snapshots aprovados por revisão legítima.

## 8. R5 — Certificação

### Objetivo

Provar que o release candidate é estável, utilizável e repetível.

### Entregas

- `QAG-004`: três rodadas integrais consecutivas no mesmo SHA;
- `QAG-005`: UAT com recepção, veterinário, enfermagem e administração;
- `OBS-001`: painel de erros, downloads e regressões;
- `DOC-001`: pacote de evidências e decisão;
- correção da flakiness residual sem retry oculto.

### Critérios de saída

- três execuções consecutivas aprovam todos os casos descobertos, no mínimo os 369 da baseline;
- zero skip, zero erro inesperado, zero não conformidade interna;
- 143 rotas aprovadas em desktop e mobile;
- UAT assinado pelos quatro perfis operacionais;
- riscos residuais documentados com owner e prazo;
- decisão go/no-go registrada para o SHA certificado.

## 9. Trilhas paralelas por sprint

| Sprint | Backend                         | Frontend/UX                           | QA/DevOps                             | Produto/Operação                   |
| ------ | ------------------------------- | ------------------------------------- | ------------------------------------- | ---------------------------------- |
| 1      | apoiar banco/seed e triagem     | reproduzir telas e preservar baseline | provisionar ambiente, CI e rebaseline | validar severidade e freeze        |
| 2      | adapter clínico e billing       | prontuário, estados e refresh         | regressões clínicas/visuais           | aceitar jornada clínica/financeira |
| 3      | catálogos, hubs e reports       | exports e estados de erro             | contratos HTTP/download               | reconciliar relatórios/amostras    |
| 4      | concluir APIs e RBAC            | shell, labels e alvos                 | Axe, teclado e role matrix            | UAT parcial por papel              |
| 5      | defeitos persistentes residuais | responsividade financeira             | matriz integral e visual              | aceitar mobile/tabelas             |
| 6      | suporte a correções finais      | polimento apenas com evidência        | 3 rodadas, pacote e parecer           | UAT final e go/no-go               |

## 10. Evolução-alvo dos indicadores

Os valores intermediários são objetivos de planejamento e devem ser reestimados após R0.

| Marco    | Runner                          | Skips |         Rotas HTTP | Auditoria interna    | Visual               | Overflow |
| -------- | ------------------------------- | ----: | -----------------: | -------------------- | -------------------- | -------: |
| Baseline | 354/369                         |     6 |                 33 | 0/286 conformes      | 27/28                |       10 |
| Saída R0 | baseline DB conhecida           |     0 | causa classificada | gate ativo           | baseline preservada  |       10 |
| Saída R1 | falhas clínicas/billing zeradas |     0 |         em redução | gate ativo           | 28/28 clínico válido |       10 |
| Saída R2 | falhas funcionais alvo zeradas  |     0 |                  0 | gate ativo           | 28/28                |       10 |
| Saída R3 | verde                           |     0 |                  0 | sem falhas A11y/RBAC | 28/28                |       10 |
| Saída R4 | 369/369                         |     0 |                  0 | 286/286              | 28/28                |        0 |
| Saída R5 | 3 × 369/369                     |     0 |                  0 | 3 × 286/286          | 3 × 28/28            |        0 |

## 11. Dependências e caminho crítico

```text
PostgreSQL + migrations/seed (R0)
  ├──> baseline real e classificação das 33 rotas
  ├──> adapter atômico e fluxos clínicos (R1)
  └──> relatórios/exports persistentes (R2)

Shell/design system (R3)
  └──> regressão das 143 rotas e correção mobile (R4)

R1 + R2 + R3 + R4 verdes
  └──> certificação e go/no-go (R5)
```

O caminho crítico passa por `ENV-001`, `ENV-002`, `QAG-001`, `CLN-001`, `API-002/API-003`, `QAG-003` e `QAG-004`.

## 12. Regras de replanejamento

O roadmap volta ao último gate verde quando ocorrer:

- perda/corrupção de dados ou quebra de atomicidade clínica;
- falha de isolamento ou ampliação indevida de permissão;
- nova falha P0 em jornada de prontuário ou faturamento;
- ambiente incapaz de executar os testes persistentes;
- regressão visual aceita apenas por mudança de baseline;
- flakiness superior a 1% em qualquer rodada de certificação.

Nesse caso, o novo bloqueador recebe owner em até um dia útil e a previsão é recalculada no comitê semanal.
