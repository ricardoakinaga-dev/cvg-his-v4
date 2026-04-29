# Plano executivo de correcao de GAPs Vetus vs CVG-HIS

**Data:** 2026-04-27  
**Origem:** execucao assistida de migracao operacional Vetus -> `cvg-his-v2` pela interface do CVG-HIS  
**Escopo:** corrigir os GAPs reais encontrados ao tentar reproduzir no CVG-HIS a experiencia de uso de um ERP medico veterinario inspirado no Vetus  
**Guardrail operacional:** manter DNS, SSL, portas, compose e dependencias existentes. Nao criar novas portas, nao trocar proxy, nao mudar Caddy/nginx sem aprovacao explicita.

---

## 1. Resumo executivo

O `cvg-his-v2` ja possui telas e rotas que lembram a estrutura do Vetus, mas a execucao pratica mostrou que a experiencia ainda nao e confiavel para operacao clinica real. O principal problema nao e apenas visual: existem falhas de persistencia, rotas ausentes, respostas 500 em fluxos centrais e falso positivo de salvamento.

Prioridade absoluta:

1. Corrigir persistencia duravel para cadastros, atendimentos, prontuarios e entradas clinicas.
2. Eliminar falso sucesso na UI quando o backend ou o banco falham.
3. Ativar contratos de API ausentes para receituario, comanda/billing e anexos diagnosticos.
4. Completar o modelo de dados do animal/tutor com os campos reais observados no Vetus.
5. Reorganizar UX para cockpit medico veterinario: resumo por card, colapso por padrao, `Ver mais`, e acoes contextualizadas.

Enquanto esses pontos nao forem resolvidos, o sistema pode parecer utilizavel na tela, mas nao entrega seguranca operacional de ERP veterinario.

---

## 2. Evidencias da execucao

Durante a tarefa, foram executados pela interface do CVG-HIS:

- cadastro de tutor;
- cadastro de animal;
- abertura de atendimento;
- tentativa de registrar historico clinico pelo detalhe do paciente;
- tentativa de registrar ficha clinica pelo prontuario;
- navegacao por prescricoes, diagnosticos, billing/comanda e cards do prontuario.

Principais evidencias tecnicas:

| Area | Evidencia | Impacto |
|---|---|---|
| Persistencia | backend gerou IDs prefixados como `owner_*`, `patient_*`, `enc_*`, mas tabelas Postgres esperam UUID | dado aparenta existir em memoria/tela, mas falha ao persistir no banco |
| Logs API | `invalid input syntax for type uuid` em owner, patient e encounter | bloqueador de producao |
| Prontuario | UI exibiu sucesso de salvamento, mas `GET /medical-records/entries?encounterId=...` retornou 0 itens | falso positivo clinico |
| Receituario | `/api/prescriptions` retornou `404 Route not found` no backend publico | modulo visualmente existe, mas contrato nao esta ligado |
| Comanda/billing | chamadas de billing por atendimento retornaram 500 | nao ha fluxo financeiro confiavel acoplado ao atendimento |
| Cadastro animal | ausencia de campos Vetus: castrado, chip, pedigree, cor, doenca cronica, alergia, temperamento, observacoes estruturadas | perda de informacao clinica/cadastral |
| Catalogo | raca Yorkshire Terrier nao estava selecionavel no cadastro | baixa aderencia operacional |
| UX | paginas longas, excesso de informacao aberta e cards sem resumo/`Ver mais` consistente | experiencia inferior ao cockpit Vetus |

---

## 3. Objetivos de produto

### Objetivo 1: confiabilidade transacional

Nenhum cadastro, atendimento, prontuario, receita, exame, anexo ou comanda deve retornar sucesso se nao foi persistido ou se falhou em etapa critica.

### Objetivo 2: paridade operacional Vetus

O detalhe do animal deve funcionar como cockpit principal:

- ficha resumida do animal e tutor;
- cards colapsados por padrao;
- resumo visivel por card;
- `Ver mais` para exploracao;
- acoes rapidas contextualizadas;
- integracao com atendimento, comanda, exames, receituario, agenda, internacao, vacinas e historico clinico.

### Objetivo 3: fluxo medico veterinario completo

O clinico deve conseguir, em uma jornada unica:

1. localizar tutor/animal;
2. abrir atendimento;
3. registrar anamnese, exame fisico, avaliacao, plano, conduta e historico;
4. emitir receita;
5. solicitar/anexar exame;
6. abrir/complementar comanda;
7. consultar historico longitudinal do animal;
8. voltar para tutor, agenda ou financeiro sem perder contexto.

---

## 4. Roadmap recomendado

### Fase 0 - congelamento tecnico e linha de base

**Prazo sugerido:** 0,5 a 1 dia  
**Objetivo:** parar de empilhar features sobre persistencia quebrada.

Entregas:

- confirmar compose atual e dominio HTTPS existente sem alterar portas;
- registrar estado dos containers;
- criar testes de reproducao para owner, patient, encounter e medical record;
- documentar endpoints que retornam 500/404;
- impedir conclusao de qualquer fluxo critico sem verificacao API + banco.

Criterio de aceite:

- uma suite minima reproduz os bugs atuais antes da correcao;
- o time sabe exatamente quais rotas estao bloqueadas.

### Fase 1 - saneamento de persistencia e contratos API

**Prazo sugerido:** 2 a 4 dias  
**Objetivo:** fazer o sistema salvar, ler e listar de forma duravel.

Entregas:

- alinhar IDs da aplicacao com colunas UUID do banco ou ajustar schema de forma consistente;
- remover persistencia fire-and-forget silenciosa em fluxos criticos;
- fazer falhas de persistencia retornarem erro real ao cliente;
- corrigir listagem/busca de tutores e pacientes;
- garantir durabilidade de atendimento e prontuario;
- registrar rotas de receituario no servidor principal;
- corrigir billing/comanda por atendimento;
- adicionar testes de integracao API + repositorio database.

Criterio de aceite:

- criar tutor -> reiniciar API -> tutor continua acessivel;
- criar animal -> reiniciar API -> animal continua acessivel;
- abrir atendimento -> prontuario existe e e recuperavel;
- salvar entrada clinica -> entrada aparece em `GET /medical-records/entries`;
- chamadas de comanda nao retornam 500 para atendimento valido;
- `/api/prescriptions` responde 200/201 conforme operacao.

### Fase 2 - modelo Vetus para tutor e animal

**Prazo sugerido:** 3 a 5 dias  
**Objetivo:** parar de perder informacao cadastral e clinica no cadastro.

Entregas:

- ampliar modelo de animal com:
  - sexo biologico;
  - status reprodutivo/castrado;
  - especie;
  - raca;
  - porte;
  - cor;
  - data de nascimento;
  - peso atual;
  - numero do chip;
  - numero pedigree;
  - doenca cronica;
  - alergia;
  - temperamento;
  - situacao;
  - observacoes gerais;
  - ID legado Vetus opcional;
  - data de cadastro original opcional.
- ampliar modelo de tutor conforme Vetus:
  - receber SMS;
  - grupo;
  - documentacao completa;
  - endereco completo;
  - referencia/codigo municipio;
  - credito/pontos/limite;
  - status.
- completar catalogos de especie, raca, cores e grupos com seeds por conta;
- garantir busca por nome, documento, email, telefone e ID legado.

Criterio de aceite:

- formulario de animal permite preencher os campos observados no Vetus sem usar campo generico;
- ficha do animal exibe os campos com `Nao informado` quando ausentes;
- raca Yorkshire Terrier e demais racas comuns ficam disponiveis;
- busca de tutor/paciente nao retorna 500.

### Fase 3 - prontuario medico veterinario funcional

**Prazo sugerido:** 4 a 7 dias  
**Objetivo:** tornar o prontuario o centro real da operacao clinica.

Entregas:

- corrigir criacao/listagem de entradas clinicas;
- separar entradas por tipo: anamnese, exame fisico, avaliacao, plano, prescricao, conduta, evolucao;
- criar historico longitudinal por animal, nao apenas por atendimento;
- manter timeline clinica rastreavel;
- permitir resumo por atendimento e `Ver mais`;
- resolver salvamento da ficha estruturada;
- impedir mensagem de sucesso quando nenhuma entrada foi criada;
- adicionar testes e2e para salvamento real de prontuario.

Criterio de aceite:

- salvar ficha clinica cria entradas persistidas;
- detalhe do animal mostra resumo das entradas;
- tela de prontuario mostra contadores corretos;
- reiniciar API nao apaga entradas.

### Fase 4 - receituario, exames, imagens e anexos

**Prazo sugerido:** 4 a 7 dias  
**Objetivo:** completar os modulos clinicos que o Vetus expoe no prontuario.

Entregas:

- registrar e expor rotas `/prescriptions`;
- unificar receituario com entradas clinicas ou modulo dedicado, sem duplicidade invisivel;
- permitir receita vinculada a animal, tutor, atendimento e prontuario;
- criar fluxo de exame:
  - pedido;
  - arquivo/anexo;
  - resultado/laudo;
  - status;
  - timeline;
  - visualizacao no detalhe do animal.
- separar imagens de exames PDF/laboratorio;
- validar checksum/anexo sem exigir dado tecnico para usuario final quando nao necessario.

Criterio de aceite:

- receita criada aparece no card Receituario do animal;
- exame criado/anexado aparece no card Exames;
- imagem anexada aparece no card Imagens;
- API e UI concordam nos contadores.

### Fase 5 - agenda, comanda e financeiro acoplados ao atendimento

**Prazo sugerido:** 5 a 8 dias  
**Objetivo:** fechar o ciclo ERP: clinica + agenda + financeiro.

Entregas:

- agenda permitir eventos passados e historicos sem forcar fluxo futuro;
- card Agenda do animal exibir historico e proximos eventos;
- comanda abrir a partir do animal/atendimento;
- billing por atendimento sem 500;
- itens de comanda vinculados a servicos, exames, produtos e pacotes;
- status de comanda visivel no prontuario;
- auditoria de lancamentos.

Criterio de aceite:

- atendimento pode ter comanda aberta;
- comanda aparece no prontuario e no detalhe do animal;
- itens persistem e podem ser consultados apos reload/restart;
- card de ultimos atendimentos consegue apontar para comanda.

### Fase 6 - UX Vetus-like premium

**Prazo sugerido:** 5 a 10 dias  
**Objetivo:** reduzir excesso de informacao e entregar cockpit operacional claro.

Entregas:

- cards colapsados por padrao;
- cada card com resumo curto visivel;
- botao `Ver mais` padronizado;
- acoes primarias limitadas por contexto;
- layout de detalhe animal com ficha lateral e modulos a direita;
- detalhe do tutor como hub operacional;
- estados vazios objetivos;
- labels alinhadas ao Vetus e ao vocabulario veterinario;
- navegacao sem perder contexto entre tutor, animal, atendimento, comanda, exame e receita.

Criterio de aceite:

- clinico consegue entender o estado do animal sem rolar pagina inteira;
- nenhuma secao longa aparece expandida por padrao sem necessidade;
- `Ver mais` leva para detalhe/listagem completa;
- tela mobile nao quebra os cards.

### Fase 7 - validacao operacional e hardening

**Prazo sugerido:** continuo, primeira rodada 3 a 5 dias  
**Objetivo:** garantir que o sistema aguenta uso real.

Entregas:

- testes e2e dos fluxos Vetus-like;
- testes de regressao para 500/404 detectados;
- smoke test em dominio HTTPS existente;
- validacao apos restart de containers;
- auditoria de logs para ausencia de erro silencioso;
- checklist de prontuario medico veterinario.

Criterio de aceite:

- fluxo completo passa em ambiente publicado;
- nenhum endpoint critico retorna 500;
- nenhum salvamento retorna sucesso sem persistencia;
- relatorio de compatibilidade sobe nota minima de 80/100 nos modulos clinicos centrais.

---

## 5. Backlog priorizado

### P0 - Bloqueadores de producao

| ID | Item | Tipo | Aceite |
|---|---|---|---|
| P0-01 | Corrigir incompatibilidade entre IDs prefixados e colunas UUID | Backend/DB | owner, patient, encounter e medical record persistem sem erro UUID |
| P0-02 | Parar de engolir erro de persistencia em fluxos criticos | Backend | se banco falhar, API retorna erro e UI nao mostra sucesso |
| P0-03 | Teste de durabilidade apos restart | QA/API | registros criados continuam existindo apos restart da API |
| P0-04 | Corrigir `GET /owners?q=...` e `GET /patients?q=...` retornando 500 | API | busca retorna 200 e lista paginada |
| P0-05 | Corrigir salvamento de entradas clinicas | API/SPA | entrada criada aparece no GET e na tela apos reload |
| P0-06 | Conectar rotas `/prescriptions` ao servidor principal | API | GET/POST/PATCH/DELETE respondem conforme permissao |
| P0-07 | Corrigir 500 de billing/comanda por atendimento | API | `/billing/{encounterId}` e `/billing/{encounterId}/items` nao quebram para atendimento valido |

### P1 - Paridade clinica Vetus

| ID | Item | Tipo | Aceite |
|---|---|---|---|
| P1-01 | Expandir schema de animal com campos Vetus | DB/API/SPA | formulario e detalhe exibem chip, pedigree, cor, castrado, alergia, doenca cronica, temperamento |
| P1-02 | Expandir cadastro de tutor com campos operacionais Vetus | DB/API/SPA | credito, pontos, grupo, SMS e endereco completo persistem |
| P1-03 | Seed/catalogo de racas e especies | DB/API | Yorkshire Terrier selecionavel |
| P1-04 | Historico longitudinal por animal | Backend/SPA | detalhe do animal consolida entradas de todos os atendimentos |
| P1-05 | Cards Vetus-like com resumo e `Ver mais` | SPA | todos os cards centrais seguem padrao comum |
| P1-06 | Receituario vinculado ao animal e atendimento | API/SPA | receita aparece no card do animal e no prontuario |
| P1-07 | Exames e imagens vinculados ao prontuario | API/SPA | anexos aparecem nos cards Exames/Imagens |

### P2 - ERP operacional

| ID | Item | Tipo | Aceite |
|---|---|---|---|
| P2-01 | Agenda historica e futura por animal | API/SPA | card Agenda mostra passado e futuro com filtros |
| P2-02 | Comanda integrada ao atendimento | API/SPA | abrir comanda pelo animal/atendimento e listar itens |
| P2-03 | Vacinas e vermifugos como modulo proprio | API/SPA | eventos preventivos nao dependem de texto solto |
| P2-04 | Internacao vinculada ao animal e prontuario | API/SPA | card Internacao mostra status, leito, entrada e alta |
| P2-05 | Importacao assistida Vetus-like | Produto/SPA | operador consegue registrar dados legados sem usar banco direto |

### P3 - Qualidade e refinamento

| ID | Item | Tipo | Aceite |
|---|---|---|---|
| P3-01 | Auditoria de mensagens de sucesso | SPA/API | nenhuma tela mostra sucesso sem confirmacao real |
| P3-02 | Padronizar estados vazios | UX | cards vazios indicam o que falta e acao correta |
| P3-03 | Reduzir densidade visual da pagina do paciente | UX | primeira dobra mostra identidade, riscos e resumo dos cards |
| P3-04 | Acessibilidade e teclado nos acordeoes | UX/QA | cards navegaveis por teclado e com aria correto |
| P3-05 | Relatorio semanal de notas de compatibilidade | Produto/QA | score Vetus vs CVG atualizado por modulo |

---

## 6. Sequencia tecnica recomendada

1. Criar testes que reproduzem os erros atuais.
2. Corrigir geracao/persistencia de IDs.
3. Tornar persistencia sincrona ou transacional nos fluxos criticos.
4. Corrigir rotas ausentes e 500 de API.
5. Validar durabilidade com restart.
6. Expandir modelo de animal/tutor.
7. Ajustar telas e formularios.
8. Implementar receituario/exames/comanda de ponta a ponta.
9. Revalidar fluxo completo por navegador no dominio existente.
10. Atualizar relatorio de compatibilidade.

Nao iniciar redesign amplo antes de fechar P0. Sem persistencia confiavel, qualquer melhoria visual vai mascarar falha operacional.

---

## 7. Matriz de risco

| Risco | Severidade | Probabilidade | Mitigacao |
|---|---:|---:|---|
| Dados aparentam salvos mas somem apos restart | Alta | Alta | P0-01, P0-02, P0-03 |
| Clinico registra historico e nao fica no prontuario | Alta | Alta | P0-05 |
| Receita/exame/comanda existem visualmente mas nao operacionalmente | Alta | Media | P0-06, P0-07, P1-06, P1-07 |
| Perda de dados clinicos do Vetus por falta de campos | Alta | Alta | P1-01, P1-02 |
| UX continua confusa mesmo com backend corrigido | Media | Alta | Fase 6 |
| Refatoracao quebra dominio/SSL/portas existentes | Alta | Baixa | manter compose/proxy atual e validar dominio HTTPS existente |

---

## 8. Indicadores de sucesso

| Indicador | Meta minima |
|---|---:|
| Fluxo tutor -> animal -> atendimento -> prontuario persistente | 100% |
| Endpoints criticos retornando 500 | 0 |
| Salvamentos com falso positivo | 0 |
| Campos Vetus do animal cobertos | 90% |
| Cards Vetus-like com resumo/colapso/Ver mais | 100% dos cards centrais |
| Nota de compatibilidade clinica | >= 80/100 |
| Durabilidade apos restart | 100% nos fluxos P0/P1 |

---

## 9. Checklist de validacao por release

Antes de publicar qualquer correcao desse roadmap:

- [ ] Nao criou nova porta.
- [ ] Nao alterou DNS.
- [ ] Nao alterou SSL/Caddy/nginx sem autorizacao.
- [ ] Nao adicionou dependencia sem justificativa e aprovacao.
- [ ] Rodou testes focados de API.
- [ ] Rodou teste ou reproducao por navegador no fluxo alterado.
- [ ] Validou logs sem erro 500 novo.
- [ ] Validou persistencia apos reload.
- [ ] Para fluxo critico, validou persistencia apos restart da API.
- [ ] Atualizou documentacao de Vetus parity quando aplicavel.

---

## 10. Proxima acao recomendada

Checkpoint em 2026-04-29:

- P0, P1, P2 e P3 foram implementados em escopos focados, validados e publicados no compose v2 existente.
- `Tabela NFS-e`, `Matriz Estado ICMS` e `Tabela IBS/CBS` foram alinhadas na ordem macro fiscal Vetus.
- A trilha documentada de `Estoque > Configuracoes Fiscais` esta fechada ate o ultimo item listado no navbar.
- O navbar `Financeiro` foi revalidado em 2026-04-29 por artefatos Vetus read-only.
- `Financeiro > Gaveta > Gaveta` foi alinhado em 2026-04-29, validado e publicado no compose v2 existente.
- `Financeiro > Controles > Contas a Receber` foi alinhado em 2026-04-29, validado e publicado no compose v2 existente.
- `Financeiro > Controles > Contas a Pagar` foi alinhado em 2026-04-29, validado e publicado no compose v2 existente.
- `Financeiro > Controles > Pagamento Antecipado` foi alinhado em 2026-04-29, validado e publicado no compose v2 existente.
- `Financeiro > Controles > Contas Adm. Cartao` foi alinhado em 2026-04-29, validado e publicado no compose v2 existente.
- `Financeiro > Controles > Cheques` foi alinhado em 2026-04-29, validado e publicado no compose v2 existente.
- `Financeiro > Controles > Fluxo de Caixa` foi alinhado em 2026-04-29, validado e publicado no compose v2 existente.

Proxima acao recomendada: implementar a paridade de `Financeiro > Controles > Curva ABC Clientes`.

Justificativa:

- a ordem de `Estoque > Configuracoes Fiscais` documentada termina em `Tabela IBS/CBS`;
- `Tabela IBS/CBS` agora possui rota, aliases, tela Vetus-like, API, OpenAPI, persistencia duravel, testes e publicacao;
- a ordem revalidada de `Financeiro` comeca por `Gaveta > Gaveta`;
- a `Gaveta` observada no Vetus ja foi convertida em superficie operacional de caixa no `cvg-his-v2`;
- `Contas a Receber` ja foi convertida em superficie operacional de titulos no `cvg-his-v2`;
- `Contas a Pagar` ja foi convertida em superficie operacional de obrigacoes no `cvg-his-v2`;
- `Pagamento Antecipado` ja foi convertido em superficie operacional de creditos antecipados no `cvg-his-v2`;
- `Contas Adm. Cartao` ja foi convertido em superficie operacional de recebimentos por cartao, parcelas, taxas e conciliacao no `cvg-his-v2`;
- `Cheques` ja foi convertido em superficie operacional de cheques recebidos/emitidos, vencimento, baixa e devolucao no `cvg-his-v2`;
- `Fluxo de Caixa` ja foi convertido em superficie operacional de projecao temporal de receitas, despesas, produzido, descontos e saldo no `cvg-his-v2`;
- a proxima divergencia pela ordem macro revalidada esta em `Controles > Curva ABC Clientes`;
- resolver `Curva ABC Clientes` agora preserva a ordem Vetus depois de `Fluxo de Caixa` e antes de `Curva ABC Produtos`.

Escopo minimo de `Financeiro > Controles > Curva ABC Clientes`:

1. Revalidar artefatos Vetus read-only especificos de `Curva ABC Clientes` antes de escrever codigo.
2. Comparar a tela/fluxo Vetus com a superficie financeira atual do `cvg-his-v2`.
3. Alinhar rota, titulo, breadcrumbs, filtros, ranking, totais, percentuais e acoes principais sem executar fechamento, baixa ou escrita real no Vetus.
4. Reaproveitar contratos financeiros existentes quando possivel; se houver escrita nova, exigir auditoria e testes.
5. Validar com testes focados de SPA/API, typecheck/build, OpenAPI quando aplicavel e smoke publicado.

Observacao de sequenciamento:

- `Tabela NFS-e` foi alinhada em 2026-04-29.
- `Matriz Estado ICMS` foi alinhada em 2026-04-29.
- `Tabela IBS/CBS` foi alinhada em 2026-04-29.
- A ordem do navbar `Financeiro` foi revalidada em 2026-04-29.
- `Financeiro > Gaveta > Gaveta` foi alinhado em 2026-04-29.
- `Financeiro > Controles > Contas a Receber` foi alinhado em 2026-04-29.
- `Financeiro > Controles > Contas a Pagar` foi alinhado em 2026-04-29.
- `Financeiro > Controles > Pagamento Antecipado` foi alinhado em 2026-04-29.
- `Financeiro > Controles > Contas Adm. Cartao` foi alinhado em 2026-04-29.
- `Financeiro > Controles > Cheques` foi alinhado em 2026-04-29.
- `Financeiro > Controles > Fluxo de Caixa` foi alinhado em 2026-04-29.
- A proxima frente macro e `Financeiro > Controles > Curva ABC Clientes`.

---

## 11. Log de execucao

### 2026-04-29 - Financeiro > Controles > Fluxo de Caixa

Status: implementado, validado e publicado.

Escopo entregue:

- `/finance/cash-flow` foi convertido de tela financeira generica para superficie Vetus-like de `Fluxo de Caixa`;
- aliases adicionados: `/financeiro/controles/fluxo-de-caixa` e `/fluxo-de-caixa`;
- filtros alinhados ao dominio: `Fluxo de`, `Ate` e `Agrupar por`;
- acoes de tela `Gerar Fluxo`, `Exportar Grafico`, `Contas a Receber`, `Contas a Pagar` e `Atualizar` foram posicionadas sem acionar escrita nova;
- indicadores alinhados com `Total de Receitas`, `Total de Despesas`, `Saldo Final`, `Total Produzido` e `Total Desconto`;
- tabela alinhada com `Data`, `Natureza`, `Descricao`, `Origem`, `Valor`, `Status`, `Saldo` e `Abrir`;
- a tela consome APIs existentes `/financial/receivables`, `/counter-sales` e `/expenses-catalog`.

Validacao:

- teste focado de `CashFlowPage`;
- testes de rotas SPA e navegacao;
- typecheck do SPA;
- build do SPA;
- rebuild Docker completo de API e SPA pelo compose v2 canonico.

Publicacao:

- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa`;
- containers API/SPA healthy;
- smokes locais: `/finance/cash-flow` 200, `/financeiro/controles/fluxo-de-caixa` 200 e `/health` 200;
- rota protegida `/financial/receivables` retornou 401 sem token com `x-account-id`;
- smokes publicos: SPA `/finance/cash-flow` 200 e API `/health` 200.

Proxima frente recomendada: `Financeiro > Controles > Curva ABC Clientes`.

### 2026-04-29 - Financeiro > Controles > Cheques

Status: implementado, validado e publicado.

Escopo entregue:

- `/finance/cheques` foi convertido de tela financeira generica para superficie Vetus-like de `Cheques`;
- aliases adicionados: `/financeiro/controles/cheques` e `/cheques`;
- filtros alinhados ao dominio: `Cliente/Referencia`, `Vencimento de`, `Ate`, `Status` e `Tipo`;
- acoes de tela `Cadastrar Cheque`, `Baixar Cheques Em Lote` e `Comandas` foram posicionadas na superficie sem acionar escrita nova;
- tabela alinhada com `Referencia`, `Tipo`, `Emissao`, `Vencimento`, `Valor`, `Origem`, `Status` e `Abrir`;
- a tela consome a API existente `/counter-sales`, usando detalhes de comandas para compor pagamentos com metodo `check`.

Validacao:

- teste focado de `ChequesPage`;
- testes de rotas SPA e navegacao;
- typecheck do SPA;
- build do SPA;
- rebuild Docker completo de API e SPA pelo compose v2 canonico.

Publicacao:

- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa`;
- containers API/SPA healthy;
- smokes locais: `/finance/cheques` 200, `/financeiro/controles/cheques` 200 e `/health` 200;
- rota protegida `/counter-sales` retornou 401 sem token com `x-account-id`;
- smokes publicos: SPA `/finance/cheques` 200 e API `/health` 200.

Proxima frente recomendada: `Financeiro > Controles > Fluxo de Caixa`.

### 2026-04-29 - Financeiro > Controles > Contas Adm. Cartao

Status: implementado, validado e publicado.

Escopo entregue:

- `/finance/card-accounts` foi convertido de placeholder para superficie Vetus-like de `Contas Adm. Cartao`;
- aliases adicionados: `/financeiro/controles/contas-adm-cartao`, `/financeiro/controles/contas-adm-cartão`, `/contas-adm-cartao` e `/contas-adm-cartão`;
- filtros alinhados ao dominio: `Cliente/Provedor`, `Data inicial`, `Data final`, `Provedor`, `Status` e `Conciliacao`;
- acoes de tela `Gerar Conta Avulsa`, `Conciliar Em Lote` e `Transacoes de Cartao` foram posicionadas na superficie sem acionar escrita nova;
- tabela alinhada com `Cliente`, `Data`, `Parcelas`, `Tipo`, `Valor`, `Liquido`, `Taxa`, `Status`, `Conciliacao` e `Abrir`;
- a tela consome a API existente `/financial/reconciliation/cards`, usando `search`, `status`, `provider` e paginacao; taxas e liquido usam campos especificos quando presentes e ficam conservadores quando a API ainda nao captura taxa da operadora.

Validacao:

- teste focado de `CardAccountsPage`;
- testes de rotas SPA e navegacao;
- typecheck do SPA;
- build do SPA;
- rebuild Docker completo de API e SPA pelo compose v2 canonico.

Publicacao:

- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa`;
- containers API/SPA healthy;
- smokes locais: `/finance/card-accounts` 200, `/financeiro/controles/contas-adm-cartao` 200 e `/health` 200;
- rota protegida `/financial/reconciliation/cards` retornou 401 sem token com `x-account-id`;
- smokes publicos: SPA `/finance/card-accounts` 200 e API `/health` 200.

Proxima frente recomendada: `Financeiro > Controles > Cheques`.

### 2026-04-29 - Financeiro > Controles > Pagamento Antecipado

Status: implementado, validado e publicado.

Escopo entregue:

- `/finance/advance-payments` foi convertido de placeholder para superficie Vetus-like de `Pagamento Antecipado`;
- aliases adicionados: `/financeiro/controles/pagamento-antecipado` e `/pagamento-antecipado`;
- filtros alinhados ao dominio: `Cliente`, `Emissao de`, `Ate` e `Status`;
- status exibido como `Disponivel`, mantendo `Compensado` e `Cancelado` como opcoes de filtro visual para paridade operacional futura;
- tabela alinhada com `Cliente`, `Emissao`, `Total`, `Compensado`, `Saldo`, `Origem`, `Status` e `Abrir`;
- acoes de tela `Gerar Pagamento Antecipado` e `Compensar Em Lote` foram posicionadas na superficie sem acionar escrita nova;
- a tela consome a API existente `/owners`, usando `financialProfile.creditBalance` positivo como credito disponivel para compensacao futura.

Validacao:

- teste focado de `AdvancePaymentsPage`;
- testes de rotas SPA e navegacao;
- typecheck do SPA;
- build do SPA;
- rebuild Docker completo de API e SPA pelo compose v2 canonico.

Publicacao:

- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa`;
- containers API/SPA healthy;
- smokes locais: `/finance/advance-payments` 200, `/financeiro/controles/pagamento-antecipado` 200 e `/health` 200;
- rota protegida `/owners?page=1&pageSize=1` retornou 401 sem token com `x-account-id`;
- smokes publicos: SPA `/finance/advance-payments` 200 e API `/health` 200.

Proxima frente recomendada: `Financeiro > Controles > Contas Adm. Cartao`.

### 2026-04-29 - Financeiro > Controles > Contas a Pagar

Status: implementado, validado e publicado.

Escopo entregue:

- `/finance/accounts-payable` foi convertido de operacao financeira generica para superficie Vetus-like de `Contas a Pagar`;
- aliases adicionados: `/financeiro/controles/contas-a-pagar` e `/contas-a-pagar`;
- filtros alinhados ao Vetus: `Fornecedor`, `Vencimento de`, `Ate` e `Status`;
- status exibidos como `A Pagar`, mantendo `Cancelada` e `Paga` como opcoes de filtro visual para paridade do menu legacy;
- tabela alinhada com `Fornecedor`, `Emissao`, `Vencimento`, `Total`, `Pago`, `A Pagar`, `Origem`, `Status` e `Abrir`;
- acoes de tela `Gerar Conta Avulsa` e `Baixar Contas Em Lote` foram posicionadas na superficie sem acionar escrita nova;
- a tela consome a API existente `/expenses-catalog`, abrindo `/expenses` filtrado por fornecedor.

Validacao:

- teste focado de `AccountsPayablePage`;
- testes de rotas SPA e navegacao;
- typecheck do SPA;
- build do SPA;
- rebuild Docker completo de API e SPA pelo compose v2 canonico.

Publicacao:

- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa`;
- containers API/SPA healthy;
- smokes locais: `/finance/accounts-payable` 200, `/financeiro/controles/contas-a-pagar` 200 e `/health` 200;
- rota protegida `/expenses-catalog?page=1&pageSize=1` retornou 401 sem token com `x-account-id`;
- smokes publicos: SPA `/finance/accounts-payable` 200 e API `/health` 200.

Proxima frente recomendada: `Financeiro > Controles > Pagamento Antecipado`.

### 2026-04-29 - Financeiro > Controles > Contas a Receber

Status: implementado, validado e publicado.

Escopo entregue:

- `/billing` foi convertido de hub amplo de faturamento para superficie Vetus-like de `Contas a Receber`;
- aliases adicionados: `/finance/accounts-receivable`, `/financeiro/controles/contas-a-receber` e `/contas-a-receber`;
- filtros alinhados ao Vetus: `Cliente`, `Vencimento entre`, `ate` e `Status`;
- status exibidos como `A Receber` e `Recebida`, mantendo `Cancelada` como opcao de filtro visual para paridade do menu legacy;
- tabela alinhada com `Origem`, `Cliente`, `Emissao`, `Vencimento`, `Total`, `Recebido`, `A Receber`, `Status` e `Abrir`;
- acoes de tela `Gerar Conta Avulsa` e `Baixar contas em lote` foram posicionadas na superficie sem acionar escrita nova;
- a tela consome a API existente `GET /financial/receivables`, mantendo `/billing/:id` como detalhe operacional do atendimento.

Validacao:

- teste focado de `BillingListPage`;
- testes de rotas SPA e navegacao;
- typecheck do SPA;
- build do SPA;
- rebuild Docker completo de API e SPA pelo compose v2 canonico.

Publicacao:

- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa`;
- containers API/SPA healthy;
- smokes locais: `/billing` 200, `/finance/accounts-receivable` 200, `/financeiro/controles/contas-a-receber` 200 e `/health` 200;
- rota protegida `/financial/receivables?status=open` retornou 401 sem token com `x-account-id`;
- smokes publicos: SPA `/billing` 200 e API `/health` 200.

Proxima frente recomendada: `Financeiro > Controles > Contas a Pagar`.

### 2026-04-29 - Financeiro > Gaveta > Gaveta

Status: implementado, validado e publicado.

Escopo entregue:

- `/cash` foi convertido de painel de orcamentos/PIX para superficie Vetus-like de `Gaveta`;
- aliases adicionados: `/cash-register`, `/financeiro/gaveta` e `/finance/gaveta`;
- a tela passou a exibir `Ultimo Fechamento`, `Total de Entradas`, `Total de Saidas`, `Total em Gaveta`, `Entrada de Gaveta`, `Saida de Gaveta`, `Fechar Gaveta`, `Gaveta por Forma de Pagamento` e `Extrato de Movimentacoes da Gaveta`;
- API exposta em `/cash-register/dashboard`, `/cash-register/open`, `/cash-register/movements` e `/cash-register/close`, com aliases PT-BR de gaveta;
- escritas usam permissao financeira, trilha de auditoria e persistencia existente em `cash_registers` e `cash_movements`;
- fechamento corrigido para preservar `expected_closing_amount` como saldo esperado e manter `closing_amount` como valor contado.

Validacao:

- testes focados da pagina de Gaveta e das rotas SPA;
- build/teste do modulo cash;
- build/teste focado da rota API de gaveta;
- build de shared contracts e build da API;
- `pnpm validate:openapi`;
- typecheck/build do SPA;
- rebuild Docker completo de API e SPA.

Publicacao:

- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose v2 canonico;
- containers API/SPA healthy;
- smokes locais: `/cash` 200, `/financeiro/gaveta` 200, `/health` 200;
- rota protegida `/cash-register/dashboard` retornou 401 sem token com `x-account-id`;
- smokes publicos: SPA `/cash` 200 e API `/health` 200.

Proxima frente recomendada: `Financeiro > Controles > Contas a Receber`.

### 2026-04-29 - Revalidacao do navbar Financeiro

Status: revalidado por artefatos Vetus read-only.

Evidencias usadas:

- `docs/vetus/guides/03-shell-mapa-de-navegacao.md`;
- `docs/vetus/guides/2026-04-23-relatorio-entidade-financeiro.md`;
- `docs/vetus/guides/21-anexo-financeiro.md`;
- `docs/vetus/inspection/2026-04-23T23-34-19-051Z-financeiro/financeiro-legacy-gaveta.html`;
- navegacao atual do `cvg-his-v2` em `apps/spa/src/navigation.ts`.

Ordem Vetus confirmada:

1. `Gaveta`
   - `Gaveta`
2. `Controles`
   - `Contas a Receber`
   - `Contas a Pagar`
   - `Pagamento Antecipado`
   - `Contas Adm. Cartao`
   - `Cheques`
   - `Fluxo de Caixa`
   - `Curva ABC Clientes`
   - `Curva ABC Produtos`
   - `DashBoard do Multifilial`
   - `Dashboard Financeiro`
   - `Linha do Tempo`
3. `Maquininha de Cartao`
   - `Configuracao do Split`
   - `Maquininhas`
   - `Simulador de Split`
   - `Transacoes de Cartao`
   - `Exportador de Split`
   - `Habilitar Pagamento`
   - `Pagamento Dashboard`
4. `Cadastros`
   - `Formas de Pagamento`
   - `Centros de Custo`
   - `Custos e Despesas`
   - `Cartoes Debito/Credito`
   - `Bancos`

Comparacao inicial:

- A navegacao do `cvg-his-v2` ja acompanha a estrutura principal de `Gaveta`, `Controles`, `Maquininha de Cartao` e `Cadastros`.
- `PIX` aparece como extensao propria CVG em `Pagamentos CVG`, fora da ordem Vetus.
- A primeira divergencia operacional pela ordem Vetus esta em `Financeiro > Gaveta > Gaveta`: a rota `/cash` existe, mas ainda e um painel de orcamentos/PIX, nao a gaveta Vetus-like.
- A gaveta Vetus observada possui `Ultimo Fechamento`, `Total de Entradas`, `Total de Saidas`, `Total em Gaveta`, `Entrada de Gaveta`, `Saida de Gaveta`, `Fechar Gaveta`, `Gaveta por Forma de Pagamento` e `Extrato de Movimentacoes da Gaveta`.

Guardrail:

- Nao houve baixa, fechamento, conciliacao, emissao, cancelamento, exportacao ou qualquer escrita no Vetus.

Proxima frente recomendada: `Financeiro > Gaveta > Gaveta`.

### 2026-04-29 - Estoque > Configuracoes Fiscais > Tabela IBS/CBS

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- `/fiscal/ibs-cbs` foi criado como superficie Vetus-like de `Tabela IBS/CBS`;
- adicionados aliases SPA `/pacote-ibs-cbs`, `/ibs-cbs`, `/estoque/configuracoes-fiscais/ibs-cbs`, `/estoque/configuracoes-fiscais/tabela-ibs-cbs` e `/estoque/cadastros/tabelas-ibs-cbs`;
- cabecalho, breadcrumb macro, apoio `Quer cadastrar IBS/CBS de forma pratica? Saiba Mais`, busca unica `Buscar por ID ou descricao`, acao `Incluir Nova Tabela` e estado vazio `Nenhum registro encontrado` foram alinhados ao screenshot Vetus;
- formulario modal cobre `ID`, `Descricao`, `IBS` e `CBS`;
- API fiscal ganhou `GET /fiscal/ibs-cbs`, `POST /fiscal/ibs-cbs` e `PATCH /fiscal/ibs-cbs/:id`, com auditoria nas escritas;
- persistencia duravel adicionada em `ibs_cbs_tables` pela migration `0043_fiscal_ibs_cbs_tables.sql`;
- OpenAPI e contratos compartilhados passaram a expor os payloads e resposta de lista de IBS/CBS.

Validacao:

- teste focado da tela `FiscalIBSCBSPage` cobre textos, busca, CTA e criacao;
- teste de rotas SPA cobre titulo `Tabela IBS/CBS` e aliases;
- teste do modulo fiscal cobre criacao, listagem e atualizacao simples;
- teste focado de rotas fiscais da API cobre listagem, criacao e atualizacao;
- `pnpm validate:openapi` passou;
- typecheck/build da SPA, build/teste do modulo fiscal, build da API e build do pacote DB passaram;
- migration aplicada no Postgres do compose canonico;
- publicacao feita com rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa`;
- smokes locais: `/fiscal/ibs-cbs`, `/estoque/configuracoes-fiscais/tabela-ibs-cbs` e `/pacote-ibs-cbs` retornaram 200;
- rota protegida `/fiscal/ibs-cbs?search=basica` retornou 401 sem token quando `x-account-id` foi informado;
- HTTPS publico de SPA/API retornou 200.

Observacao de paridade:

- O screenshot Vetus mostra breadcrumb visual `Estoque > Cadastros > Tabelas IBS e CBS`, enquanto a ordem macro documentada coloca o item em `Estoque > Configuracoes Fiscais`.
- A implementacao manteve a rota fiscal macro para preservar a sequencia definida e adicionou alias Vetus `/pacote-ibs-cbs` e alias de cadastros.

Proxima frente recomendada: revalidar a ordem do navbar `Financeiro` no Vetus, pois `Estoque > Configuracoes Fiscais` esta fechado ate `Tabela IBS/CBS`.

### 2026-04-29 - Estoque > Configuracoes Fiscais > Matriz Estado ICMS

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- `/fiscal/icms-matrix` passou de consulta tecnica/read-only para superficie Vetus-like de `Matriz Estado ICMS`;
- adicionados aliases SPA `/matriz-icms`, `/estoque/configuracoes-fiscais/matriz-icms` e `/estoque/configuracoes-fiscais/matriz-estado-icms`;
- cabecalho, breadcrumb, busca unica `Buscar por ID ou UF Destino`, acao `Incluir Nova Matriz` e estado vazio `Nenhum registro cadastrado` foram alinhados ao screenshot Vetus;
- o formulario de cadastro foi movido para modal com UF origem, UF destino, operacao e aliquota;
- `GET /fiscal/icms-matrix` passou a aceitar `search`, e `POST /fiscal/icms-matrix` cria matriz com auditoria e persistencia em `icms_rules`;
- `Tabela ICMS` permaneceu separada em `/fiscal/icms`, sem misturar cadastro simples de aliquota com matriz por UF/estado.

Validacao:

- teste focado de `FiscalICMSMatrixPage` cobre cabecalho/breadcrumb/estado vazio Vetus-like, busca e abertura do modal;
- teste de rotas SPA cobre aliases e breadcrumb de `Matriz Estado ICMS`;
- teste do modulo fiscal cobre filtro `search`, criacao e bloqueio de duplicidade;
- teste focado da rota fiscal da API cobre repasse de `search` e criacao protegida por permissao;
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/fiscal/__tests__/FiscalICMSMatrixPage.test.ts src/router/routes.test.ts`;
- `pnpm --filter @cvg-his-v2/shared-contracts run build && pnpm --filter @cvg-his-v2/module-fiscal run build && pnpm --filter @cvg-his-v2/module-fiscal exec node --test dist/fiscal.test.js`;
- `pnpm --filter @cvg-his-v2/shared-contracts run build && pnpm --filter @cvg-his-v2/module-fiscal run build && pnpm --filter @cvg-his-v2/api run build && pnpm --filter @cvg-his-v2/api exec node --test dist/routes/fiscal-routes.test.js`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/spa run build`;
- `pnpm validate:openapi`.
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, SPA local `http://127.0.0.1:3002/fiscal/icms-matrix` 200, alias `http://127.0.0.1:3002/estoque/configuracoes-fiscais/matriz-estado-icms` 200 e API local `http://127.0.0.1:3003/health` 200;
- rota protegida `/fiscal/icms-matrix?search=RJ` retorna 401 sem token quando `x-account-id` e informado;
- HTTPS publico validado com SPA `/fiscal/icms-matrix` e API health retornando 200.

Proxima frente recomendada: `Estoque > Configuracoes Fiscais > Tabela IBS/CBS`.

### 2026-04-29 - Estoque > Configuracoes Fiscais > Tabela NFS-e

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- `/fiscal/nfse` passou de backoffice tecnico sempre aberto para superficie Vetus-like de `Tabela NFS-e`;
- adicionados aliases SPA `/nfse`, `/estoque/configuracoes-fiscais/nfse` e `/estoque/configuracoes-fiscais/tabela-nfse`;
- cabecalho, breadcrumb, busca unica `Buscar por codigo ou descricao`, acao `Incluir Nova Tabela` e estado vazio `Nenhum registro cadastrado` foram alinhados ao padrao fiscal Vetus;
- o formulario de cadastro/edicao foi movido para modal com campos de municipio, UF, codigo IBGE, descricao/prestador, versao, ambiente, codigo de servico, foco operacional e situacao ativa;
- `GET /fiscal/nfse` passou a aceitar `search`, com busca por id, municipio, UF, codigo municipal, prestador/layout, versao, codigo de servico e foco operacional;
- OpenAPI, service SPA, repositorio database e service fiscal em memoria foram atualizados sem alterar contratos de emissao/documentos NFS-e.

Validacao:

- teste focado de `FiscalNFSELayoutPage` cobre cabecalho/breadcrumb/estado vazio Vetus-like e abertura do modal;
- teste de rotas SPA cobre aliases e breadcrumb de `Tabela NFS-e`;
- teste do modulo fiscal cobre filtro `search`;
- teste focado da rota fiscal da API cobre repasse de `search`, `state` e `active`;
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/fiscal/__tests__/FiscalNFSELayoutPage.test.ts src/router/routes.test.ts`;
- `pnpm --filter @cvg-his-v2/module-fiscal run build && pnpm --filter @cvg-his-v2/module-fiscal exec node --test dist/fiscal.test.js`;
- `pnpm --filter @cvg-his-v2/api run build && pnpm --filter @cvg-his-v2/api exec node --test dist/routes/fiscal-routes.test.js`;
- `pnpm --filter @cvg-his-v2/shared-contracts run build`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/spa run build`;
- `pnpm validate:openapi`.
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, SPA local `http://127.0.0.1:3002/fiscal/nfse` 200, alias `http://127.0.0.1:3002/estoque/configuracoes-fiscais/tabela-nfse` 200 e API local `http://127.0.0.1:3003/health` 200;
- rota protegida `/fiscal/nfse?search=ISS` retorna 401 sem token quando `x-account-id` e informado;
- HTTPS publico validado com SPA `/fiscal/nfse` e API health retornando 200.

Proxima frente recomendada: `Estoque > Configuracoes Fiscais > Matriz Estado ICMS`.

### 2026-04-29 - P3-05 Relatorio semanal de notas de compatibilidade

Status: implementado e validado como frente documental.

Implementacao:

- criado `docs/2026-04-29-relatorio-semanal-compatibilidade-vetus-cvg-his.md`;
- relatorio consolidou score por dimensao e por navbar Vetus;
- pendencias foram separadas por operacional, fiscal, financeiro, clinico e UX/QA;
- proxima acao recomendada foi alinhada com a retomada macro fiscal em `Estoque > Configuracoes Fiscais > Tabela NFS-e`;
- nenhum dado pessoal real do Vetus foi transcrito.

Validacao:

- revisao dos documentos vivos de workflow, plano de GAPs e auditoria Vetus Enterprise;
- contagem atual de rotas SPA com `placeholderRoute(...)`, separando helper de chamadas diretas;
- verificacao de rotas e contratos existentes de NFS-e antes de recomendar a proxima frente;
- `git diff --check` nos documentos alterados.

Proxima frente recomendada: `Estoque > Configuracoes Fiscais > Tabela NFS-e`.

### 2026-04-29 - P3-04 Acessibilidade e teclado nos acordeoes

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- acordeoes e disclosures do cockpit do animal receberam IDs estaveis para gatilho e painel;
- gatilhos passaram a expor `aria-expanded` e `aria-controls`;
- paineis expandidos passaram a usar `role="region"` com `aria-labelledby` apontando para o gatilho correspondente;
- navegacao por teclado entre gatilhos passou a aceitar setas, Home e End, preservando o comportamento nativo de botao para ativacao;
- foco visivel foi padronizado tambem nos disclosures da ficha do animal.

Validacao:

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/patients/__tests__/PatientDetailPage.test.ts`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/spa run build`;
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, API local `http://127.0.0.1:3003/health` 200 e SPAs locais `/patients/pat-1`, `/appointments/new?patientId=pat-1&ownerId=owner-1`, `/inpatient?patientId=pat-1` retornando 200;
- HTTPS publico validado com SPA `/patients/pat-1` e API health retornando 200.

Proxima frente recomendada: `P3-05 - Relatorio semanal de notas de compatibilidade`. Quando retomar macro fiscal Vetus: `Estoque > Configuracoes Fiscais > Tabela NFS-e`.

### 2026-04-29 - P3-03 Reduzir densidade visual da pagina do paciente

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- ficha do animal foi compactada para identidade, chips de resumo, riscos clinicos e tutor/acoes essenciais;
- observacoes gerais e detalhes cadastrais sairam da primeira dobra e ficaram dentro de `Ver mais Informacoes do Animal`;
- lista de modulos do animal passou a usar grade responsiva de cards fechados, com card aberto ocupando a largura completa;
- cabecalhos/resumos dos cards tiveram altura e espacamento reduzidos sem remover CTAs clinicos.

Validacao:

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/patients/__tests__/PatientDetailPage.test.ts`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/spa run build`;
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, API local `http://127.0.0.1:3003/health` 200 e SPAs locais `/patients/pat-1`, `/appointments/new?patientId=pat-1&ownerId=owner-1`, `/inpatient?patientId=pat-1` retornando 200;
- HTTPS publico validado com SPA `/patients/pat-1` e API health retornando 200.

Proxima frente recomendada: `P3-04 - Acessibilidade e teclado nos acordeoes`. Quando retomar macro fiscal Vetus: `Estoque > Configuracoes Fiscais > Tabela NFS-e`.

### 2026-04-28 - P3-02 Padronizar estados vazios

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- cockpit do animal passou a mostrar estados vazios acionaveis para agenda, comanda, vacinas/vermifugos, exames, internacao, receituario e imagens;
- mensagens vazias agora indicam o dado ausente e o proximo passo operacional;
- acoes vazias preservam contexto do animal/tutor com `patientId` e `ownerId` quando a rota suporta pre-preenchimento;
- comanda, exames, receituario e imagens direcionam para abertura de atendimento quando nao ha episodio assistencial focal.

Validacao:

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/patients/__tests__/PatientDetailPage.test.ts`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/spa run build`;
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, API local `http://127.0.0.1:3003/health` 200 e SPAs locais `/patients/pat-1`, `/appointments/new?patientId=pat-1&ownerId=owner-1`, `/inpatient?patientId=pat-1` e `/vaccines-dewormers?patientId=pat-1&ownerId=owner-1` retornando 200;
- HTTPS publico validado com SPA `/patients/pat-1`, SPA `/appointments/new?patientId=pat-1&ownerId=owner-1` e API health retornando 200.

Proxima frente recomendada: `P3-03 - Reduzir densidade visual da pagina do paciente`. Quando retomar macro fiscal Vetus: `Estoque > Configuracoes Fiscais > Tabela NFS-e`.

### 2026-04-28 - P3-01 Auditoria de mensagens de sucesso

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- importacoes de servicos, produtos e Vetus-like so exibem alerta verde quando todas as linhas importaveis foram confirmadas;
- falha total ou parcial em lote passa a usar alerta de erro com contagem consolidada e mensagem por linha;
- Central Diagnostica trocou sucesso parcial por alerta de aviso quando o pedido laboratorial e criado, mas a anotacao clinica vinculada nao e persistida;
- testes de regressao cobrem falso sucesso em importacoes e diagnostico.

Validacao:

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/services/__tests__/ServicesImportPage.test.ts src/pages/products/__tests__/ProductsImportPage.test.ts src/pages/imports/__tests__/VetusAssistedImportPage.test.ts src/pages/clinical/__tests__/DiagnosticsPage.test.ts`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/spa run build`;
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, API local `http://127.0.0.1:3003/health` 200 e SPAs locais `/products/import`, `/services/import`, `/vetus-imports` e `/diagnostics` retornando 200;
- HTTPS publico validado com SPA `/diagnostics`, SPA `/vetus-imports` e API health retornando 200.

Proxima frente recomendada: `P3-02 - Padronizar estados vazios`. Quando retomar macro fiscal Vetus: `Estoque > Configuracoes Fiscais > Tabela NFS-e`.

### 2026-04-28 - P2-05 Importacao assistida Vetus-like

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- criada rota `/vetus-imports` para registrar linha Vetus revisada, exigindo permissoes de pacientes e clientes;
- a API cria ou vincula tutor/animal por ID legado Vetus, documento/nome do tutor e nome do animal, evitando duplicidade em reprocessamento;
- origem, referencia, revisor, usuario importador, data e resumo ficam no retorno da importacao, no audit log e nas notas administrativas/clinicas do cadastro;
- a importacao valida contato minimo do tutor para respeitar regra existente de cadastro;
- criada tela `/vetus-imports` com entrada por arquivo ou dados colados, modelo CSV, validacao previa, importacao linha a linha e log recente;
- menu Vetus-like ganhou `Atendimento > Cadastros > Importacao Assistida Vetus`;
- OpenAPI passou a documentar `GET/POST /vetus-imports`.

Validacao:

- `pnpm --filter @cvg-his-v2/api run build`;
- `pnpm --filter @cvg-his-v2/api exec node --test dist/routes/vetus-import-routes.test.js`;
- `pnpm --filter @cvg-his-v2/api run test`;
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/imports/__tests__/VetusAssistedImportPage.test.ts src/router/routes.test.ts src/navigation.test.ts`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm validate:openapi`;
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, SPA local `http://127.0.0.1:3002/vetus-imports` 200, API local `http://127.0.0.1:3003/health` 200 e rota protegida `/vetus-imports` retornando 401 sem token quando `x-account-id` e informado;
- HTTPS publico validado com SPA `/vetus-imports` e API health retornando 200.

Proxima frente recomendada: `P3-01 - Auditoria de mensagens de sucesso`. Quando retomar macro fiscal Vetus: `Estoque > Configuracoes Fiscais > Tabela NFS-e`.

### 2026-04-28 - P2-04 Internacao vinculada ao animal e prontuario

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- `GET /inpatient` passou a aceitar `patientId` e `includeDischarged`, preservando o filtro antigo por `encounterId`;
- `InpatientService.list` passou a filtrar internacoes por atendimento, animal e status, mantendo compatibilidade com chamadas antigas por string de atendimento;
- a tela `/inpatient` respeita `patientId` recebido por URL para abrir a lista no contexto do animal;
- o detalhe da internacao ganhou link direto para o prontuario do atendimento (`/medical-records/{encounterId}`);
- o card `Internacao` do detalhe do animal passou a consumir internacoes por `patientId`, mostrar internacao ativa/focal, alta quando houver, historico de internacoes e link para prontuario;
- evolucoes, altas e transferencias registradas pela API de internacao agora disparam eventos estruturados na timeline do prontuario via `appendAdvancedCareEvent`;
- OpenAPI documenta filtros por animal e resposta estruturada de internacao.

Validacao:

- teste do modulo `InpatientService` cobre filtro por animal entre multiplos atendimentos e inclusao/exclusao de altas;
- teste focado da rota de internacao cobre callbacks de evolucao e alta para timeline clinica;
- testes focados da SPA cobrem lista contextual por animal, detalhe com link para prontuario e card de internacao no detalhe do animal;
- `pnpm --filter @cvg-his-v2/module-inpatient run build`;
- `pnpm --filter @cvg-his-v2/module-inpatient test`;
- `pnpm --filter @cvg-his-v2/api run build`;
- `pnpm --filter @cvg-his-v2/api exec node --test dist/routes/inpatient-routes.test.js`;
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inpatient/__tests__/InpatientListPage.test.ts src/pages/inpatient/__tests__/InpatientDetailPage.test.ts src/pages/patients/__tests__/PatientDetailPage.test.ts`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm validate:openapi`.
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, SPA local `http://127.0.0.1:3002/inpatient?patientId=patient_luna` 200, API local `http://127.0.0.1:3003/health` 200 e rota protegida `/inpatient?patientId=patient_luna&includeDischarged=true` retornando 401 sem token quando `x-account-id` e informado;
- HTTPS publico validado com SPA `/inpatient` e API health retornando 200.

Proxima frente recomendada: `P2-05 - Importacao assistida Vetus-like`. Quando retomar macro fiscal Vetus: `Estoque > Configuracoes Fiscais > Tabela NFS-e`.

### 2026-04-28 - P2-03 Vacinas e vermifugos como modulo proprio

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- eventos preventivos passaram a aceitar e devolver `patientId` e `ownerId`, mantendo `clientName` e `animalName` como snapshot legivel para compatibilidade com registros legados;
- `GET /vaccines-dewormers` passou a filtrar por animal/tutor estruturados, alem dos filtros existentes por data, cliente, animal, tipo e executados;
- migration `0042_preventive_events_patient_owner.sql` adicionou colunas e indices por `account_id + patient_id` e `account_id + owner_id`;
- OpenAPI passou a documentar o modulo preventivo, incluindo listagem, criacao e baixa de aplicacao;
- a tela `Vacinas e Vermifugos` passou a respeitar `patientId` e `ownerId` recebidos pela URL;
- o card `Vacinas e Vermifugos` do detalhe do animal deixou de depender de regex em agenda/prontuario e passou a consumir o modulo preventivo, separando `Proximas doses` e `Historico preventivo`.

Validacao:

- teste focado de API cobre criacao/listagem com `patientId` e `ownerId` e exclusao de outro animal;
- teste focado de `VaccinesDewormersPage` cobre filtros de contexto vindos da URL;
- teste focado de `PatientDetailPage` cobre card preventivo por modulo proprio, proximas doses, historico e link para `/vaccines-dewormers?patientId=...&ownerId=...`;
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/preventive/__tests__/VaccinesDewormersPage.test.ts src/pages/patients/__tests__/PatientDetailPage.test.ts`;
- `pnpm --filter @cvg-his-v2/api run test`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/api run typecheck`;
- `pnpm validate:openapi`;
- `pnpm --filter @cvg-his/db run build`;
- migration aplicada no Postgres do compose canonico e colunas `patient_id`/`owner_id` confirmadas;
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, SPA local `http://127.0.0.1:3002/vaccines-dewormers?patientId=patient_luna&ownerId=owner_maria` 200, API local `http://127.0.0.1:3003/health` 200 e rota protegida `/vaccines-dewormers?patientId=patient_luna&includeExecuted=true` retornando 401 sem token quando `x-account-id` e informado;
- HTTPS publico validado com SPA `/vaccines-dewormers` e API health retornando 200.

Proxima frente recomendada: `P2-04 - Internacao vinculada ao animal e prontuario`. Quando retomar macro fiscal Vetus: `Estoque > Configuracoes Fiscais > Tabela NFS-e`.

### 2026-04-28 - P2-02 Comanda integrada ao atendimento

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- `BillingService.list` passou a aceitar filtros por `encounterId`, `patientId` e `ownerId`, mantendo compatibilidade com o filtro legado por string de atendimento;
- `GET /billing` passou a expor esses filtros no handler e no OpenAPI;
- `billingService.list` na SPA passou a montar query estruturada para atendimento, animal e tutor;
- o detalhe do animal ganhou card `Comanda`, com status/valor da comanda focal, lista de comandas do animal, itens do atendimento atual e link direto para `/billing/:encounterId`;
- o carregamento do detalhe do animal passou a buscar comandas por tutor e atendimento por animal, reduzindo leitura global e preservando contexto assistencial;
- os scripts de teste/typecheck da API passaram a recompilar `@cvg-his-v2/module-billing`, e o teste do modulo billing passou a compilar antes de rodar `dist`.

Validacao:

- teste do modulo billing cobre filtros por animal, tutor e atendimento;
- teste de rota cobre repasse de `encounterId`, `patientId` e `ownerId` em `GET /billing`;
- teste focado do `PatientDetailPage` cobre card `Comanda`, itens e link para gerenciamento;
- `pnpm --filter @cvg-his-v2/module-billing run test`;
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/patients/__tests__/PatientDetailPage.test.ts`;
- `pnpm --filter @cvg-his-v2/api run test`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/api run typecheck`;
- `pnpm validate:openapi`;
- rebuild/recreate de `cvg-his-v2-api` e `cvg-his-v2-spa` no compose canonico;
- compose validado com API e SPA healthy, SPA local `http://127.0.0.1:3002/patients/patient_luna` 200, API local `http://127.0.0.1:3003/health` 200 e rota protegida `/billing?patientId=patient_luna` retornando 401 sem token quando `x-account-id` e informado;
- HTTPS publico validado com SPA e API health retornando 200.

Proxima frente recomendada: `P2-03 - Vacinas e vermifugos como modulo proprio`.

### 2026-04-28 - P2-01 Agenda historica e futura por animal

Status: implementado, validado e publicado no compose v2 existente.

Implementacao:

- o card `Agenda` do detalhe do animal deixou de exibir apenas proximos eventos e passou a separar `Proximos`, `Historico` e `Cancelados / nao compareceu`;
- cada item mostra motivo, status operacional, data/hora e link `Ver na agenda` para o detalhe do agendamento;
- o carregamento da SPA passou a consultar `/appointments?patientId=...`, preservando o filtro por animal desde a API;
- `SchedulingService.listAppointments` passou a aceitar `patientId`, mantendo os filtros existentes de periodo, status, profissional, servico, especialidade, unidade e busca;
- o script de teste/typecheck da API passou a recompilar `@cvg-his-v2/module-scheduling`, evitando tipos obsoletos quando o contrato de agendamento muda.

Validacao:

- teste focado do `PatientDetailPage` cobre um agendamento futuro, um historico e um cancelado do mesmo animal;
- teste focado de rota cobre `GET /appointments?patientId=patient_luna` retornando eventos passados e futuros e excluindo outro animal;
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/patients/__tests__/PatientDetailPage.test.ts`;
- `pnpm --filter @cvg-his-v2/module-scheduling run test`;
- `pnpm --filter @cvg-his-v2/api run test`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/api run typecheck`;
- `pnpm validate:openapi`;
- rebuild/recreate executado somente em `cvg-his-v2-api` e `cvg-his-v2-spa` no `docker-compose.v2.yml`;
- compose validado com API e SPA healthy, SPA local `http://127.0.0.1:3002/patients/patient_luna` 200, API local `http://127.0.0.1:3003/health` 200 e rota protegida `/appointments?patientId=patient_luna` retornando 401 sem token quando `x-account-id` e informado;
- HTTPS publico validado com SPA e API health retornando 200.

Proxima frente recomendada: `P2-02 - Comanda integrada ao atendimento`.

### 2026-04-28 - Atualizacao de proximo passo apos P1

Status: documentacao atualizada.

Decisao:

- P0 e P1 deixam de ser a recomendacao de inicio porque ja foram executados e publicados em escopo focado;
- proxima frente deste plano de GAPs passa a ser `P2-01 - Agenda historica e futura por animal`;
- `P2-01` deve ser executado antes de `P2-02` porque comanda/financeiro dependem de contexto assistencial claro no cockpit do animal;
- a ordem macro do workflow Vetus permanece separada: ao retomar espelhamento geral do navbar, o proximo item segue sendo `Estoque > Cadastros > Ponto de Venda`.

Guardrails reafirmados:

- sem nova porta;
- sem alteracao de DNS, SSL, Caddy ou nginx;
- sem dependencia nova sem aprovacao;
- Vetus somente observacional;
- publicacao apenas nos servicos existentes do `docker-compose.v2.yml`.

### 2026-04-28 - P1 paridade clinica Vetus do animal

Status: implementado, validado e publicado no compose v2 existente.

Escopo entregue:

- `P1-01`: campos Vetus do animal permanecem cobertos no contrato, formulario e detalhe, incluindo ID legado, cadastro original, microchip, pedigree, cor, castracao, porte, peso, doenca cronica, alergia, temperamento e observacoes;
- `P1-04`: detalhe do animal consolida historico longitudinal por paciente a partir das entradas clinicas de todos os prontuarios do animal, nao apenas do atendimento focal;
- `P1-05`: cards centrais do cockpit Vetus-like exibem resumo mesmo colapsados e mantem acao de aprofundamento `Ver mais`/atalho para o modulo correspondente;
- `P1-06`: receituario foi ligado ao repositorio de prescricoes no runtime/API e passa a hidratar prescricoes persistidas em `clinical_entries` na inicializacao;
- `P1-07`: exames e imagens do animal passaram a consolidar pedidos diagnosticos, anexos do prontuario e anexos vinculados a `diagnostic_order`.

Validacao:

- `pnpm --filter @cvg-his-v2/module-prescriptions run test`;
- `pnpm --filter @cvg-his-v2/api run typecheck`;
- `pnpm exec vitest run src/pages/patients/__tests__/PatientDetailPage.test.ts` em `apps/spa`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- `pnpm --filter @cvg-his-v2/api run test`.

Publicacao e correcao operacional:

- servidor Vite temporario fora do compose foi encerrado;
- rebuild/recreate executado somente nos servicos existentes `cvg-his-v2-api` e `cvg-his-v2-spa` com `docker-compose.v2.yml` e `.env.v2`;
- nenhum DNS, SSL, Caddy/nginx, dependencia ou mapeamento de porta foi alterado;
- estado final validado nas portas canonicas: SPA `http://127.0.0.1:3002` e API `http://127.0.0.1:3003`;
- HTTPS publico `https://his.centroveterinarioguarapiranga.com/` retornou 200;
- logs recentes da API e da SPA nao apresentaram erro/exception/500 apos a publicacao.

Risco residual conhecido:

- P1 fecha paridade clinica basica de animal/prontuario/receituario/exames, mas nao substitui a etapa posterior de validar no navegador todos os microfluxos de agenda, comanda, baixa financeira e envio de comunicacao. Esses itens seguem fora desta P1 e devem continuar bloqueados pelos guardrails de observacao Vetus.

### 2026-04-28 - Inicio da execucao P1 completa

Status: encerrado pelo log de conclusao `P1 paridade clinica Vetus do animal`.

Escopo restante da P1 nesta rodada:

- `P1-01`: consolidar campos Vetus do animal em contrato, persistencia, formulario e detalhe;
- `P1-04`: historico longitudinal por animal consolidando entradas clinicas de todos os atendimentos;
- `P1-05`: padronizar cards centrais do cockpit com resumo e `Ver mais`;
- `P1-06`: garantir receituario vinculado a animal, atendimento e prontuario;
- `P1-07`: garantir exames/imagens vinculados ao prontuario e exibidos nos cards do animal.

Guardrails mantidos:

- estado final sem porta paralela e sem mudanca de mapeamento no compose canonico;
- sem alteracao de DNS, SSL, Caddy ou nginx;
- sem gravar credenciais;
- Vetus permanece apenas como referencia observacional ja documentada.

### 2026-04-28 - P0 saneamento de persistencia e contratos criticos

Status: implementado e validado em escopo focado.

Escopo entregue:

- geracao de IDs UUID confirmada para novos tutores, pacientes e atendimentos;
- filas de persistencia de tutores, pacientes, atendimentos, prontuario e prescricoes passaram a propagar erro real em `waitForPersistence()`;
- rollback em memoria adicionado para evitar falso sucesso/cache quando uma escrita critica falha;
- entrada clinica passa a manter contrato de erro real quando o repositorio falha;
- `/prescriptions` confirmado como rota registrada na API principal;
- bootstrap da API agora evita plugar repositorios DB incompativeis com o schema migrado atual para `owner_patient_links` e `billing_records`/`billing_items`, impedindo 500 por tabela ausente em billing/comanda por atendimento;
- smoke DB real criou tutor, paciente, atendimento e entrada clinica, reidratou tudo em novas instancias e validou billing por atendimento sem 500.

Validacao:

- `pnpm --filter @cvg-his-v2/module-owners run test`;
- `pnpm --filter @cvg-his-v2/module-patients run test`;
- `pnpm --filter @cvg-his-v2/module-encounters run build`;
- `pnpm --filter @cvg-his-v2/module-encounters run test`;
- `pnpm --filter @cvg-his-v2/module-medical-records run build`;
- `pnpm --filter @cvg-his-v2/module-medical-records run test`;
- `pnpm --filter @cvg-his-v2/module-prescriptions run test`;
- `pnpm --filter @cvg-his-v2/api run typecheck`;
- `pnpm --filter @cvg-his-v2/api run test`;
- `pnpm run test:db:start`;
- smoke DB local em `cvg_his_test` com Postgres real passou para tutor, paciente, atendimento, entrada clinica e billing sem 500.

Risco residual conhecido:

- `pnpm --filter @cvg-his-v2/api run test:db` ainda nao e criterio limpo de P0 porque `apps/api/src/db-persistence.test.ts` contem fixtures antigas com IDs textuais (`acc_test`, `notif_*`) e seed de auth incompatibilizados com o schema UUID atual. As migrations sobem, mas essa suite precisa de saneamento proprio antes de voltar a ser aceite global.

### 2026-04-28 - P1-02 cadastro de tutor/cliente

Status: implementado e publicado no compose v2 existente.

Escopo entregue:

- contrato `OwnerSummary`, `CreateOwnerRequest` e `UpdateOwnerRequest` ampliado com `legacyVetusId` e `originalCreatedAt`;
- persistencia de contato completo, perfil, endereco, credito, pontos, limite, ID Vetus e data original em `address_json`, sem migration nova;
- busca de tutor ampliada para ID legado, endereco, perfil, grupo, pontos e telefones alternativos;
- formulario de cliente com ID Vetus e data de cadastro Vetus;
- detalhe/lista de cliente exibindo ID legado, cadastro Vetus, referencia e codigo do municipio;
- preservacao do tipo de contato `whatsapp` apos rehydrate do banco.

Validacao:

- sem porta nova;
- sem alteracao de DNS;
- sem alteracao de SSL/Caddy/nginx;
- sem dependencia nova;
- testes focados de modulo, API e SPA passando;
- typecheck da SPA passando;
- suite completa da API passando;
- deploy nos servicos existentes `cvg-his-v2-api` e `cvg-his-v2-spa`;
- health local e HTTPS publico retornando 200.

### 2026-04-28 - P1-03 seed/catalogo de racas e especies

Status: implementado e publicado no compose v2 existente.

Escopo entregue:

- seed idempotente por conta para especies no store em memoria e no store database;
- seed idempotente por conta para racas no store em memoria e no store database;
- especie `Canina` com `systemCode` `canine` disponivel como ativa;
- raca `Yorkshire Terrier` disponivel como ativa para especie canina;
- catalogo inicial ampliado com racas caninas/felinas comuns e opcoes SRD;
- formulario de paciente validado para exibir `Yorkshire Terrier` como opcao selecionavel quando especie canina esta selecionada;
- sem migration nova e sem sobrescrever catalogos ja existentes com o mesmo codigo.

Validacao:

- sem porta nova;
- sem alteracao de DNS;
- sem alteracao de SSL/Caddy/nginx;
- sem dependencia nova;
- teste focado de catalogos da API passando;
- teste focado do formulario de paciente passando;
- build da API passando;
- typecheck da SPA passando;
- suite completa da API passando;
- deploy nos servicos existentes `cvg-his-v2-api` e `cvg-his-v2-spa`;
- containers API e SPA healthy;
- health local e HTTPS publico retornando 200;
- rota publica `/patients/new` retornando 200;
- smoke autenticado em database confirmou `Yorkshire Terrier` e `Canina` nos endpoints de catalogo.

### 2026-04-28 - Smoke assistido por UI com prontuario Vetus autorizado

Status: executado por navegacao, sem API/DB/script de migracao.

Escopo executado:

- Vetus usado somente como fonte observacional, seguindo os guardrails do workflow de paridade;
- nenhum botao de salvar, excluir, baixar, exportar, enviar, confirmar ou dar baixa foi acionado no Vetus;
- cliente/tutor criado no `cvg-his-v2` pela tela de cadastro de cliente;
- animal criado no `cvg-his-v2` pela tela de cadastro de animal, vinculado ao tutor criado;
- atendimento aberto no `cvg-his-v2` pela tela de atendimentos;
- anamnese criada no prontuario pelo modal `Incluir Nova Anamnese`;
- detalhe do animal no `cvg-his-v2` confirmou atendimento vinculado, peso cadastral e 1 registro de anamnese no card do paciente.

Observacoes:

- dados pessoais reais observados durante a migracao nao foram transcritos nesta documentacao;
- a UI de cadastro de animal ainda usa catalogo fechado para raca; quando o texto literal do Vetus nao existe no catalogo, a categoria SRD disponivel foi selecionada e a descricao observada foi preservada no cadastro do animal.

### 2026-04-28 - P1-04 paridade Vetus do modulo Racas

Status: implementado, publicado e validado por navegacao.

Observacao Vetus:

- modulo observado em `Sistema/Cadastros/Racas.htm`, somente leitura;
- lista com filtros `Codigo` e `Descricao`, botoes `Incluir` e `Pesquisar`, tabela `Codigo`, `Descricao`, `Abrir`;
- formulario de inclusao observado sem salvar no Vetus, com campos `Id`, `Descricao` e `Especie`;
- opcoes de especie observadas: `Nao Definido`, `AVICOLA`, `BOVINO`, `CANINA`, `CUNICULA`, `EQUINA`, `FELINA`, `OUTRAS`, `PRIMATA`, `ROEDOR`.

Escopo entregue no `cvg-his-v2`:

- enum de especies de raca expandido para refletir as opcoes Vetus observadas;
- modulo de especies alinhado ao mesmo conjunto operacional;
- labels de especie ajustados nas listas, detalhes, filtros e formularios;
- rota `/breeds` validada com filtro, listagem, inclusao, detalhe e edicao;
- raca literal necessaria para o prontuario autorizado cadastrada pela UI do `cvg-his-v2`, sem escrita direta por API/DB;
- formulario `/patients/new` validado por navegacao mostrando a nova raca no dropdown quando a especie `Canina` esta selecionada.

Validacao:

- `pnpm --filter @cvg-his-v2/api run typecheck`;
- `pnpm --filter @cvg-his-v2/spa run typecheck`;
- suite completa da API: 167 testes passando;
- testes focados da SPA para racas, especies, paciente e internacao: 54 testes passando;
- build/recreate dos servicos existentes `cvg-his-v2-api` e `cvg-his-v2-spa`;
- health local da API e SPA retornando 200;
- navegacao real em `/breeds`, `/breeds/new`, `/breeds/:id`, `/breeds/:id/edit` e `/patients/new`.

Risco residual aberto:

- apos recreate da API, o paciente cadastrado no smoke assistido anterior nao estava mais disponivel na listagem de pacientes. Esse comportamento precisa ser investigado como item separado de persistencia operacional antes de usar novos smokes manuais como evidencia definitiva de durabilidade.
