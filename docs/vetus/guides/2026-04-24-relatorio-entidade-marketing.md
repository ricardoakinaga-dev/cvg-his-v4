# Relatório da Entidade Marketing

Data-base da inspeção: 24 de abril de 2026

Escopo:

- análise específica do domínio `marketing` no ERP Vetus;
- foco em relacionamento com cliente, envios transacionais/promocionais e configuração de comunicação;
- inspeção somente leitura, sem envio de SMS, sem criação de campanha e sem salvar alterações.

Evidências principais:

- [marketing-sms-simples.png](../inspection/2026-04-24T00-07-05-970Z-marketing/screenshots/marketing-sms-simples.png)
- [marketing-sms-simples.json](../inspection/2026-04-24T00-07-05-970Z-marketing/marketing-sms-simples.json)
- [marketing-sms-campanhas.png](../inspection/2026-04-24T00-07-05-970Z-marketing/screenshots/marketing-sms-campanhas.png)
- [marketing-sms-campanhas.json](../inspection/2026-04-24T00-07-05-970Z-marketing/marketing-sms-campanhas.json)
- [marketing-sms-configuracao.png](../inspection/2026-04-24T00-07-05-970Z-marketing/screenshots/marketing-sms-configuracao.png)
- [marketing-sms-configuracao.json](../inspection/2026-04-24T00-07-05-970Z-marketing/marketing-sms-configuracao.json)
- [marketing-layout-email-vacina.png](../inspection/2026-04-24T00-07-05-970Z-marketing/screenshots/marketing-layout-email-vacina.png)
- [marketing-layout-email-vacina.json](../inspection/2026-04-24T00-07-05-970Z-marketing/marketing-layout-email-vacina.json)
- [network.json](../inspection/2026-04-24T00-07-05-970Z-marketing/network.json)
- [01-PLANEJAMENTO-ERP-ENTERPRISE.md](../guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md)
- [03-MODELO-DADOS.md](../guides/03-MODELO-DADOS.md)
- [04-ESPECIFICACAO-APIS.md](../guides/04-ESPECIFICACAO-APIS.md)

Nota de segurança:

- a análise foi feita por UI, HTML, rede e documentação interna do projeto;
- não houve disparo de SMS;
- não houve criação de campanha;
- não houve alteração de configuração ou template.

## 1. Síntese executiva

`Marketing` não apareceu nesta rodada como módulo beta nativo. A superfície operacional observada é totalmente legada e organizada em quatro frentes:

- `Envio de SMS Simples`
- `Campanhas de SMS Marketing`
- `Configurações de SMS`
- `Layout de Email de Vacina`

Leitura objetiva:

- o domínio de marketing do ERP é centrado em comunicação outbound com `cliente`;
- hoje ele é dominado por `SMS` e por template de `email` ligado a vacina;
- a camada não é só promocional: ela mistura comunicação transacional, lembretes automáticos e campanhas.

O que ficou mais importante nesta passada:

- existe operação manual de SMS por cliente;
- existe estrutura própria de campanhas de SMS;
- existem automações de aniversário e agendamento;
- existe template editável de email para vacina;
- o saldo de créditos SMS é tratado como dependência operacional explícita.

## 2. Arquitetura do módulo

As quatro rotas confirmadas foram:

- `https://erp.vetus.com.br/Sistema/Marketing/SMSSimples.htm`
- `https://erp.vetus.com.br/Sistema/Marketing/SMSCampanhaP.htm`
- `https://erp.vetus.com.br/Sistema/Marketing/SMSConfiguracao.htm`
- `https://erp.vetus.com.br/Sistema/Vacina/VacinaLayoutEmail.htm`

O fluxo de acesso observado continua híbrido:

- autenticação no `erp-beta.vetus.com.br`;
- seleção de empresa no beta;
- SSO para o legado;
- operação efetiva dentro do domínio `erp.vetus.com.br/Sistema/...`.

Tecnologia observada:

- formulários `POST` para a própria rota;
- `javax.faces.resource`;
- `PrimeFaces.ab(...)`;
- editor rico PrimeFaces no template de email.

Leitura:

- o módulo `marketing` continua legado-operacional;
- o beta hoje atua como shell, autenticação e menu;
- não apareceu endpoint beta dedicado para marketing nesta superfície.

## 3. Superfície funcional observada

O menu legado confirmou esta organização:

- seção `Envios`
- `Envio de SMS Simples`
- `Campanhas de SMS Marketing`
- seção `Configurações`
- `Layout de Email de Vacina`
- `Configurações de SMS`

Leitura:

- `marketing` não é tratado como uma entidade única de registro;
- ele é uma suíte funcional de comunicação;
- o domínio se divide entre envio unitário, envio massivo, parâmetros de automação e template.

## 4. SMS Simples

### 4.1 Estrutura da tela

A tela `Envio de SMS simples` expôs:

- indicador de saldo: `Seu saldo é de 0 SMS disponíveis para envio`
- campo `Cliente`
- campo `Celular`
- campo `Corpo do SMS (Máximo de 150 caracteres)`
- contador `150 caracteres restantes`
- ação `Enviar SMS`
- aba `Histórico de SMS`

Campos confirmados no formulário:

- `formPrincipal:cliente_input`
- `formPrincipal:cliente_hinput`
- `formPrincipal:celular`
- `formPrincipal:corpoSms`

Comportamento estrutural confirmado no HTML:

- envio AJAX via `PrimeFaces.ab` a partir do botão `Enviar SMS`;
- autocomplete de cliente;
- histórico já previsto na própria tela, ainda que sem linhas visíveis na captura atual.

### 4.2 Leitura funcional

`SMS Simples` é a operação manual e unitária do domínio.

Ele é desenhado para:

- escolher um cliente;
- confirmar ou digitar o celular;
- redigir mensagem curta;
- disparar uma comunicação individual.

Leitura:

- a unidade operacional é o `cliente`, não o animal;
- o canal é explicitamente curto e controlado por limite de caracteres;
- o saldo de crédito faz parte da mecânica do módulo, não é detalhe invisível de backend.

## 5. Campanhas de SMS Marketing

### 5.1 Estrutura da tela

A tela `Campanhas de SMS Marketing` expôs:

- indicador de saldo: `Seu saldo é de 0 SMS disponíveis para envio`
- ação `Gerar Nova Campanha`
- filtro `Descrição`
- filtro de período com `Data de` e `Até`
- ação `Pesquisar`
- grade com colunas `Descrição`, `Título`, `Data`, `Celulares`, `Abrir`

Campos confirmados:

- `formPrincipal:descricaoPesquisa`
- `formPrincipal:dataDePesquisa_input`
- `formPrincipal:dataAtePesquisa_input`
- `formPrincipal:tbCampanha_selection`

Estado capturado:

- período default preenchido de `01/04/2026` até `30/04/2026`;
- grade vazia com mensagem `Nenhuma campanha encontrada`.

### 5.2 Leitura funcional

Essa tela estabelece claramente uma entidade própria de campanha.

Os sinais mais importantes:

- existe ação específica de criação;
- existe filtro temporal;
- existe grade histórica;
- cada campanha prevê título, descrição, data e quantidade de celulares impactados.

Leitura:

- `campanha` é um objeto persistente do domínio;
- o módulo já foi desenhado para operação recorrente e auditável;
- a coluna `Celulares` indica preocupação com volume/alcance e não só com conteúdo.

Limite desta passada:

- como a grade estava vazia, não foi possível abrir uma campanha concreta;
- portanto segmentação, mensagem e fluxo de envio foram inferidos principalmente da estrutura da tela e da documentação interna.

## 6. Configurações de SMS

### 6.1 Estrutura da tela

A tela `Configurações de SMS` mostrou três automações explícitas:

- `Enviar SMS automático dos agendamentos para os clientes`
- `Enviar SMS automático para os Animais aniversariantes do dia`
- `Enviar SMS automático para os Clientes aniversariantes do dia`

Campos confirmados:

- `formPrincipal:smsAgenda_input`
- `formPrincipal:smsAniversarioAnimal_input`
- `formPrincipal:smsAniversarioHumano_input`

Estado capturado no HTML:

- os três checkboxes estavam marcados com `checked="checked"`.

Ação confirmada:

- `Salvar`

### 6.2 Leitura funcional

Aqui aparece a camada automatizada do marketing.

Leitura:

- `marketing` cruza comunicação transacional e relacionamento;
- o módulo consome eventos de `agenda`;
- o módulo consome aniversários de `animal` e de `cliente`;
- o domínio já está parcialmente orientado a gatilhos automáticos, não só a envio manual.

Isso fecha um elo importante com relatórios anteriores:

- `agenda` gera ocasião comunicável;
- `cliente` e `animal` fornecem contexto relacional;
- `marketing` transforma esses eventos em mensagens automáticas.

## 7. Layout de Email de Vacina

### 7.1 Estrutura da tela

A tela `Layout de e-mail de vacina` expôs:

- campo `Título do Email`
- campo `Corpo do Email`
- ação `Salvar`

Campo confirmado:

- `formPrincipal:tituloEmail` com valor observado `Lembrete Vacinas Anuais`

Tecnologia confirmada:

- editor rico PrimeFaces, carregando `editor.css` e `editor.js`

Chaves dinâmicas expostas na própria tela:

- `@ESPECIE@`
- `@RACA@`
- `@COR@`
- `@SEXO@`
- `@IDADE@`
- `@NOME@`
- `@CLIENTE@`
- `@ENDERECO@`
- `@CIDADE@`
- `@DATADAVACINA@`
- `@VACINA@`
- `@NOMEDACLINICA@`
- `@ENDERECODACLINICA@`
- `@TELEFONE1DACLINICA@`
- `@TELEFONE2DACLINICA@`
- `@LOGOTIPO@`

### 7.2 Leitura funcional

Essa tela confirma que o domínio de marketing inclui template dinâmico de comunicação clínica.

Leitura:

- não se trata só de mensagem promocional;
- existe personalização por dados do paciente, do tutor e da clínica;
- o caso de uso é lembrete preventivo/assistencial ligado a vacinação.

Isso aproxima `marketing` de:

- `cliente`
- `animal`
- `vacinas`
- agenda de prevenção e retenção.

## 8. Relação com cliente e animal

`Marketing` se ancora nas duas entidades, mas com papéis diferentes.

`Cliente` aparece como pivô principal:

- campo de escolha em `SMS Simples`;
- `clientId` na API planejada de SMS;
- `accept_sms` no detalhe previsto do cliente;
- campanhas e envios são modelados em torno do destinatário econômico/comercial.

`Animal` aparece como contexto de comunicação:

- aniversariante do dia em automação SMS;
- placeholders do template de vacina;
- data da vacina e atributos clínicos no email.

Leitura:

- o dono do relacionamento é o `cliente`;
- o gatilho e o conteúdo podem nascer do `animal`.

## 9. Relação com agenda, vacinas, vendas e fidelização

### 9.1 Agenda

Relação confirmada diretamente:

- a configuração de SMS automático para agendamentos está explícita na UI.

Leitura:

- `agenda` é fonte operacional de lembrete;
- marketing funciona aqui como camada de confirmação e presença.

### 9.2 Vacinas

Relação confirmada diretamente:

- existe template específico de email para vacina;
- placeholders incluem `@DATADAVACINA@` e `@VACINA@`.

Leitura:

- o marketing também serve à jornada preventiva e clínica;
- não é apenas comercial.

### 9.3 Vendas e fidelização

Nesta passada, não houve vínculo visual direto com:

- `vendas`
- `comandas`
- `pontos`

Mesmo assim, a relação arquitetural é plausível:

- campanhas e SMS podem influenciar conversão e retorno;
- fidelização e marketing compartilham a mesma base de relacionamento com cliente.

Importante:

- esse elo não foi confirmado por UI nesta coleta;
- ele deve ser lido como conexão de domínio, não como integração comprovada da tela atual.

## 10. Modelagem prevista do domínio

Os documentos internos reforçam a leitura observada em tela.

No planejamento:

- `cliente` possui `Aceite de SMS marketing`;
- o módulo prevê `Histórico de envios`;
- `Campanhas de SMS Marketing` incluem criação, segmentação, agendamento e relatórios de entrega;
- o bloco de entregas das sprints cita `SMS, campanhas, email de vacina`.

Na modelagem de dados:

- `client_details.accept_sms`
- `sms_messages`
- `sms_campaigns`
- `sms_campaign_recipients`
- `sms_configs`

Leitura:

- o domínio foi pensado como camada de comunicação persistente;
- há separação entre mensagem unitária, campanha, destinatários de campanha e configuração de provedor/créditos.

## 11. APIs previstas

Na especificação interna, a seção `13. MARKETING` prevê:

- `POST /sms/send`
- `GET /sms-campaigns`
- `POST /sms-campaigns`
- `POST /sms-campaigns/{id}/send`
- `GET /email-templates`
- `PUT /email-templates/{id}`

Leitura:

- a API planejada separa claramente envio unitário, gestão de campanha e gestão de template;
- isso combina com a decomposição funcional observada na UI legado.

Importante:

- essas rotas vieram da documentação interna do projeto;
- elas não foram observadas em chamadas modernas vivas nesta rodada;
- portanto representam especificação-alvo, não backend moderno confirmado em produção nesta superfície.

## 12. Papel operacional do módulo

`Marketing` fecha o eixo de relacionamento pós-cadastro do ERP.

Síntese do papel operacional:

- usa dados de `cliente` como base de contato;
- usa dados de `animal` para personalização e gatilho;
- consome `agenda` como evento de lembrete;
- consome `vacinas` como contexto clínico-preventivo;
- apoia retenção, retorno e relacionamento comercial.

Leitura:

- o módulo mistura CRM operacional com comunicação transacional;
- ele não é um marketing genérico de massa;
- ele é um marketing verticalizado para clínica/pet, fortemente dependente do dado assistencial.

## 13. Limitações da inspeção

Esta passada teve limites claros:

- o saldo de SMS estava em `0`, então não havia contexto seguro para testar envio;
- a grade de campanhas estava vazia, impedindo abertura de campanha real;
- não houve submissão de `Salvar` ou `Enviar`, por restrição deliberada de não gravar no ERP;
- a inspeção confirmou a superfície legado, mas não evidenciou um backend beta moderno já operando o módulo.

## 14. Conclusão

`Marketing` é um domínio real e coerente dentro do ERP Vetus, mas sua superfície atual continua majoritariamente legada.

O que ficou firme nesta rodada:

- o módulo existe como suíte composta por SMS unitário, campanhas, automações e template de email;
- `cliente` é o pivô principal do relacionamento;
- `animal` entra como contexto clínico e de personalização;
- `agenda` e `vacinas` já se conectam diretamente ao módulo;
- o saldo de SMS e as preferências/configurações fazem parte explícita da operação.

Conclusão objetiva:

- `marketing` fecha o eixo de comunicação e retenção do ERP;
- ele fica depois de cadastro e antes do retorno operacional do cliente;
- ele não substitui `fidelização`, `pacotes` ou `vendas`, mas funciona como camada de ativação e recorrência sobre essas jornadas.
