# Plano de produto premium do CVG-HIS V4

**Status:** vigente
**Data:** 2026-07-11
**Baseline:** 58/100; aderencia funcional Vetus estimada em 56/100
**Meta:** ERP veterinario premium homologavel, com 90+ e jornadas criticas comprovadas
**Backlog:** `2026-07-11-backlog-premium-executavel.md`
**Roadmap:** `2026-07-11-roadmap-premium-58-a-90.md`

## 1. Visao

O CVG-HIS deve ser um ambiente de trabalho clinico e administrativo continuo. Um atendimento comum precisa ser concluido sem sair do cockpit do paciente, sem digitar o mesmo dado duas vezes e sem reconciliacao manual posterior.

Jornada primaria:

```text
Agenda/entrada avulsa
  -> chegada e triagem
  -> atendimento e prontuario
  -> exames, anexos, procedimentos e receita
  -> alta ou internacao
  -> comanda e estoque
  -> recebimento, caixa e fiscal
  -> comunicacao e retorno
  -> relatorios e auditoria
```

O objetivo nao e copiar visualmente o Vetus. A estrategia combina:

- Vetus e SimplesVet para a operacao brasileira, comanda, estoque, fiscal e receituario;
- Digitail para cockpit clinico, timeline, flowboard e automacao de documentacao;
- ezyVet para templates, configuracao, agenda e escala operacional;
- Covetrus Pulse para treatment board, tarefas e captura automatica de cobranca;
- Provet Cloud para automacoes orientadas ao motivo da consulta;
- IDEXX Neo para reduzir passos, densidade e carga cognitiva.

## 2. Evidencia de mercado

As fontes abaixo sao paginas oficiais consultadas em 2026-07-11. Elas comprovam capacidades anunciadas, nao qualidade de implementacao ou adequacao juridica ao Brasil.

| Referencia | Padrao a adotar |
|---|---|
| [Vetus](https://vetus.com.br/new/) | agenda ao pagamento, prontuario, comanda, estoque, laboratorio, internacao, fiscal e multiunidade |
| [SimplesVet](https://simples.vet/clinica-veterinaria/) | prontuario simples, anexos, agenda por profissional, preventivo, PDV, estoque e rotina brasileira |
| [Digitail](https://digitail.com/) | SOAP, timeline, flowboard, internacao, laboratorio, receita, portal e comunicacao em uma plataforma |
| [ezyVet](https://www.ezyvet.com/features) | templates clinicos, agenda configuravel, portal, lote/validade, relatorios e automacao de cobranca |
| [Covetrus Pulse](https://covetrus.com/covetrus-platform/workflow-and-productivity-tools/covetrus-pulse/) | treatment board, tarefas, formulario, diagnostico, pagamento e amplo ecossistema de integracoes |
| [Provet Cloud](https://www.provet.cloud/product/first-opinion-clinics) | jornada consulta-pagamento e automacoes por motivo da consulta |
| [IDEXX Neo](https://software.idexx.com/products/neo/features) | busca global, agenda que inicia consulta, diagnosticos integrados, checkout e dashboard concisos |

## 3. Principios obrigatorios

1. O paciente e o contexto persistente e o atendimento e o agregado operacional.
2. PostgreSQL e a unica fonte de verdade clinica, financeira e de agenda.
3. Uma acao clinica produz cobranca, estoque, auditoria e eventos de forma atomica.
4. Nenhuma API responde sucesso antes do commit.
5. Redis e cache/lock/rate limit; nunca armazena estado definitivo.
6. Documentos emitidos sao imutaveis e versionados.
7. Um CTA primario por estado; historico e configuracao ficam sob demanda.
8. Falha deve ser visivel e recuperavel; nunca convertida silenciosamente em lista vazia.
9. Toda capacidade premium tem unitario, integracao PostgreSQL e E2E sem `skip`.
10. Nenhum dominio e homologado com vulnerabilidade critica/alta aberta.

## 4. Experiencia clinica alvo

### 4.1 Cockpit do atendimento

Primeiro viewport, sem cards aninhados:

- cabecalho compacto: animal, tutor, idade, peso, especie, sexo, alertas, alergias e status;
- rail de contexto: sinais vitais, diagnosticos ativos, medicacoes, preventivo e ultimo atendimento;
- area central: editor SOAP/anamnese por template, exame fisico, avaliacao e plano;
- painel contextual: pendencias, exames, receitas, anexos, tarefas e comanda;
- timeline longitudinal recolhida por padrao;
- autosave apenas de rascunho versionado; `Finalizar atendimento` publica a revisao atomica;
- comandos por estado: `Iniciar`, `Salvar rascunho`, `Solicitar exame`, `Emitir receita`, `Internar`, `Dar alta`, `Enviar ao caixa`.

### 4.2 Prontuario

- registro SOAP, anamnese estruturada, exame fisico, diagnostico e plano;
- templates por especie, especialidade, motivo e unidade;
- rascunho, revisao, assinatura, retificacao e reabertura auditada;
- episodio encerrado somente leitura;
- autoria, CRMV, data/hora, versao e justificativa;
- historico filtravel por atendimento, documento, diagnostico, exame e medicamento;
- resumo clinico imprimivel/compartilhavel com dados sensiveis controlados;
- concorrencia otimista com `version` e resolucao de conflito.

O salvamento final deve ocorrer por um comando unico e idempotente, por exemplo `POST /encounters/{id}/clinical-sheet`, contendo ficha, prescricoes, exames, procedimentos e orientacoes.

### 4.3 Upload de exames e documentos

Tipos iniciais: PDF, JPEG e PNG. Video curto entra em fase posterior; DICOM e uma integracao separada.

Fluxo:

```text
pending_upload -> uploaded -> scanning -> available
                                      -> quarantined/rejected
```

Controles obrigatorios:

- S3/MinIO privado, streaming ou URL pre-assinada;
- bucket/prefixo privado de quarentena; promocao para `available` somente apos scanner;
- limites por categoria e tenant;
- extensao, MIME e magic bytes;
- SHA-256, chave gerada pelo servidor e criptografia;
- antivirus, quarentena e reconciliacao de objetos orfaos;
- URL de download curta e autenticada;
- auditoria de upload, leitura, download e exclusao;
- autor, categoria, pedido, atendimento, data, versao e retencao;
- thumbnail/OCR no worker, fora da requisicao principal.
- URL de PUT vinculada a chave, tenant, tamanho, MIME, checksum e expiracao;
- scanner indisponivel falha fechado; uploads incompletos expiram;
- bloqueio de polyglot/conteudo ativo e decompression bomb;
- download impossivel antes de `available`, com `nosniff` e `Content-Disposition` seguro.

### 4.4 Exames e laboratorio

Estados canonicos:

```text
requested -> scheduled -> collected -> processing -> resulted
          -> released -> amended/cancelled
```

- pedido com paineis, amostra, prioridade, jejum, responsavel e custo;
- etiquetas e cadeia de custodia;
- resultado estruturado, referencia, flags e anexos;
- liberacao com profissional, CRMV, data e hash;
- retificacao cria nova versao;
- resultado entra na timeline, notifica equipe/tutor e atualiza comanda;
- integracoes externas usam outbox/inbox, correlacao e retry idempotente.

### 4.5 Receitas e documentos medicos

- medicamento, apresentacao, concentracao, dose, unidade, via, frequencia, duracao, quantidade e orientacao;
- calculo por peso com confirmacao do veterinario, sem decisao clinica automatica;
- alertas de alergia, duplicidade e interacao como suporte, nunca substituicao profissional;
- templates e favoritos por profissional/unidade;
- receita, atestado, declaracao, encaminhamento, alta e termo de consentimento;
- PDF server-side com snapshot imutavel de clinica, tutor, animal, profissional e itens;
- numero, versao, hash, QR de verificacao, assinatura e auditoria;
- cancelamento/substituicao sem sobrescrever documento anterior;
- impressao, download e envio produzem o mesmo conteudo.

Medicamentos veterinarios sujeitos a controle especial exigem fluxo compativel com o [SIPEAGRO/MAPA](https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/produtos-veterinarios/cadastro-de-medicos-veterinarios), e medicamentos humanos controlados seguem regime distinto. A homologacao requer responsavel tecnico e assessoria juridica; o ERP nao deve simular autorizacao regulatoria.

## 5. Agenda premium

### 5.1 Visoes e ergonomia

- dia, semana, profissionais, salas/recursos, lista e mobile;
- zoom de horario, drag-and-drop com confirmacao, atalhos e filtros persistentes;
- cores por status/departamento, nao por decoracao;
- detalhe rapido e abertura do atendimento sem nova busca;
- busca global de tutor/animal/telefone e cadastro rapido sem duplicidade;
- timezone explicito por unidade.

### 5.2 Capacidade e regras

- disponibilidade recorrente por profissional;
- ferias, folgas, feriados, bloqueios e excecoes;
- sala, equipamento, leito, duracao e preparacao por tipo de atendimento;
- conflito transacional, encaixe autorizado e overbooking configuravel;
- recorrencia, lista de espera e preenchimento automatico de cancelamento;
- multiunidade e transferencia entre agendas;
- teleatendimento e domicilio como tipos configuraveis.

### 5.3 Ciclo operacional

```text
requested -> scheduled -> confirmed -> arrived -> triaged
          -> in_progress -> completed
          -> cancelled/no_show/rescheduled
```

- pre-cadastro e formulario de intake;
- lembretes multicanal e confirmacao;
- deposito opcional e politica de cancelamento;
- check-in, fila, prioridade, atraso e tempo de espera;
- inicio da consulta pela agenda;
- retorno, callback e preventivo gerados no fechamento;
- metricas: ocupacao, no-show, encaixe, espera, duracao, conversao e receita por slot.

## 6. Internacao e cirurgia

- whiteboard/treatment board por setor e turno;
- leito, risco, isolamento, responsavel, previsao de alta e pendencias;
- plano terapeutico 24h, aprazamento e tarefas vencidas;
- administracao com horario, executor, lote, dose, via e ocorrencia;
- sinais vitais, balanco, alimentacao, dor, DANI e evolucoes;
- handoff obrigatorio entre turnos;
- consumo e diaria capturados na comanda;
- anestesia, checklist, equipe, materiais, eventos, recuperacao e alta cirurgica;
- historico imutavel e painel de SLA.

## 7. ERP comercial e financeiro

### 7.1 Ledger unico

Orcamento aprovado gera comanda; execucao gera `charge`; fechamento gera recebivel; pagamento liquida o mesmo titulo. `billing`, comanda, caixa e relatorios consultam a mesma fonte.

Entidades alvo:

- `charge_entries`, `receivables`, `payment_intents`, `payments`;
- `payment_allocations`, `ledger_entries`, `cash_movements`;
- `financial_reversals` e `fiscal_documents`.

`ledger_entries` e append-only. Estorno cria lancamento inverso. Valores usam centavos ou `NUMERIC`, nunca ponto flutuante.

Antes da migracao, uma ADR deve definir o contrato contabil: debito/credito ou regra balanceada equivalente, conta, unidade, moeda, competencia, origem, unicidade `(account_id, source_type, source_id, event_type)`, reversao ligada ao original e projecoes reconstruiveis a partir do journal.

### 7.2 Operacao

- orcamento baixo/alto, aprovacao e assinatura;
- comanda por atendimento e venda avulsa;
- pagamento parcial, misto, parcelado, credito, desconto autorizado e troco;
- PIX/cartao idempotentes, webhook assinado, timeout reconciliavel e chargeback;
- abertura, suprimento, sangria, deposito e fechamento de caixa;
- conciliacao por adquirente/conta/unidade;
- contas a pagar/receber, centro de custo e DRE;
- comissoes sobre valor efetivamente recebido;
- NFS-e/NF-e/NFC-e conforme escopo e provider homologado.

### 7.3 Estoque e compras

- multiestoque, lote, validade, custo medio, FEFO e inventario;
- reserva, consumo, devolucao, perda e transferencia;
- minimo/maximo e sugestao de compra;
- pedido, aprovacao, fornecedor, XML, entrada e divergencia;
- toda baixa referencia atendimento, venda, procedimento e usuario;
- fechamento de venda/comanda, estoque, caixa e ledger na mesma Unit of Work.

## 8. Relatorios premium

Todo indicador abre a lista que o compoe e informa fonte, periodo, timezone e ultima atualizacao.

### Clinicos

- atendimentos, diagnosticos, procedimentos, exames pendentes e retornos;
- prontuarios incompletos, documentos retificados e altas;
- preventivo vencido/a vencer e adesao;
- internacao: ocupacao, permanencia, tarefas atrasadas, desfechos e consumo.

### Operacionais

- agenda, no-show, espera, duracao, capacidade e produtividade;
- funil chegada -> triagem -> consulta -> caixa;
- SLA de laboratorio, handoff e callbacks;
- uso de salas, equipamentos e leitos.

### Financeiros

- faturamento, recebimento, inadimplencia, ticket, margem e descontos;
- perda de cobranca: executado sem `charge`;
- caixa, conciliacao, estornos, chargebacks e taxas;
- DRE, centro de custo, comissao e multiunidade.

### Estoque

- saldo, giro, cobertura, ruptura, validade, perda, custo e divergencia;
- consumo clinico por procedimento/profissional;
- compra sugerida e desempenho de fornecedor.

Exportacoes CSV/XLSX/PDF devem respeitar RBAC, tenant, filtro e auditoria. Relatorios agendados usam worker, retry e entrega idempotente.

## 9. Arquitetura alvo

Manter o monolito modular. O problema atual e consistencia, nao necessidade de microsservicos.

| Componente | Responsabilidade |
|---|---|
| PostgreSQL | estado canonico, tenant/RLS, idempotencia, auditoria e outbox |
| Redis | rate limit, locks curtos e cache descartavel |
| S3/MinIO | arquivos clinicos privados |
| Worker | antivirus, PDF, notificacao, webhook, OCR e integracoes |
| API | comandos sincronos, validacao, RBAC/RLS e consultas consistentes |
| SPA | estado transitivo da tela; nunca fonte clinica/financeira |

Padrao de escrita:

```text
HTTP -> auth/tenant/RBAC -> schema -> Idempotency-Key
     -> Tenant Unit of Work
          -> dominio + audit + outbox + idempotency
     -> COMMIT -> invalidacao de cache -> resposta
Worker -> outbox -> inbox dedup -> efeito externo -> retry/DLQ
```

Requisitos de plataforma:

- repositores da mesma operacao compartilham o mesmo `PoolClient`;
- `SET LOCAL` tenant ocorre dentro da mesma transacao;
- optimistic concurrency por `version`;
- `FOR UPDATE` em slot, saldo e fechamento;
- `idempotency_requests` e `inbox_events` com chaves unicas;
- producao falha ao iniciar se repositorio obrigatorio estiver em memoria;
- DELETE aguarda commit e invalida cache antes do `204`;
- indisponibilidade do Redis degrada leitura para PostgreSQL, sem perder escrita.

## 10. Seguranca premium

- refresh token rotativo em cookie `HttpOnly; Secure; SameSite=Lax`;
- access token curto somente em memoria;
- CSRF para operacoes autenticadas por cookie;
- CSP em report-only e depois enforce, sem `unsafe-eval`;
- HSTS, `nosniff`, frame protection e referrer policy;
- Redis obrigatorio para rate limit de producao;
- proxies confiaveis configurados explicitamente;
- limites separados para login, refresh, MFA e recuperacao;
- captura busca intent por `(account_id, intent_id)` antes do provider;
- captura usa saga sem manter transacao SQL durante chamada externa: intent local e `capture_pending` commitados, provider chamado e resultado reconciliado idempotentemente;
- logs sem tokens, cartao ou conteudo clinico sensivel;
- LGPD: consentimento, finalidade, retencao, exportacao, anonimizacao e legal hold.

Cookies de refresh ficam restritos a `/auth/refresh`, com deteccao de reuse por familia, revogacao em logout/troca de senha, validacao de `Origin`/`Referer`, token CSRF, CORS allowlist e prevencao de session fixation. Rate limit normaliza IPv4/IPv6 e cadeias `Forwarded` somente de proxies explicitamente confiaveis.

Cache de leitura pode degradar para PostgreSQL quando Redis falhar. Autenticacao, rate limit e locks criticos falham de forma controlada; indisponibilidade nao libera operacao irrestrita.

## 11. Definition of Done premium

Uma funcionalidade so e homologada quando:

1. persiste em PostgreSQL e sobrevive a restart;
2. nao possui fallback em memoria em producao;
3. aplica tenant, RBAC e RLS;
4. e transacional, concorrente e idempotente;
5. registra auditoria e outbox;
6. possui erro recuperavel e observabilidade;
7. possui unitario, integracao PostgreSQL e E2E sem `skip`;
8. testa rollback, duplicidade e isolamento entre tenants;
9. mantem OpenAPI e tipos compartilhados alinhados;
10. nao introduz vulnerabilidade critica ou alta;
11. e homologada por recepcao, veterinario e caixa;
12. para documento clinico/fiscal, possui validacao tecnica e regulatoria.

O comando da ficha clinica so referencia anexos previamente `available`. Object storage e antivirus formam uma saga anterior e nao participam atomicamente da transacao PostgreSQL.

## 12. Metas de resultado

| Marco | Meta objetiva |
|---|---|
| 65/100 | nove bloqueios de integridade/seguranca fechados ou isolados por feature flag |
| 80/100 | atendimento, prontuario, exame, receita, upload e agenda homologados em piloto |
| 85/100 | internacao/laboratorio/estoque/comanda integrados e reconciliados |
| 90+/100 | pagamentos, fiscal, relatorios, comunicacao, multiunidade e SLOs homologados |

Meta 100 nao e promessa de calendario. A referencia de sucesso e 90+ com riscos residuais conhecidos, operacao assistida e gates verdes; 100 fica reservado a paridade integral comprovada.
