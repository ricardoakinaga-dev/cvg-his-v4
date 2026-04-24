# Relatório: Integrações Externas, Webhooks, API Keys e API Client

Data: 2026-04-24
Escopo: leitura dedicada da camada de `integrações externas + webhooks + API keys + API client`, fechando a superfície de extensão e exposição controlada do ecossistema enterprise Vetus-like.

## 1. Síntese executiva

O acervo consolidado mostra que a camada de integração externa não é apenas conectividade técnica.

Ela é uma superfície governada de exposição do produto.

Leitura consolidada:

- `integrações externas` conectam o ERP a parceiros, canais e serviços críticos;
- `webhooks` funcionam como trilha de entrega orientada a eventos;
- `API keys` controlam acesso programático e consumo autenticado por terceiros;
- `API client` representa a face administrável dessa exposição no produto;
- `OpenAPI`, `event bus`, `auditoria`, `rate limiting` e `Console Enterprise` fecham a governança dessa camada.

Conclusão objetiva:

- essa não é uma área “secundária” do sistema;
- ela define como o ERP conversa com o mundo externo;
- e precisa ser tratada como plataforma controlada, auditável e previsível.

## 2. Papel da camada no produto

No material enterprise, as integrações obrigatórias incluem:

- gateways de pagamento;
- adquirentes e split;
- bancos e conciliadores;
- emissores fiscais;
- laboratórios parceiros;
- equipamentos laboratoriais;
- SMS, email e WhatsApp;
- webhooks para parceiros;
- BI e data warehouse;
- identidade corporativa / SSO.

Leitura:

- a camada externa serve tanto a operação clínica e financeira quanto a expansão da plataforma;
- ela toca domínios centrais do ERP e não pode ser tratada como plugin improvisado.

## 3. Integrações externas

### 3.1 Tipos de integração documentados

O planejamento enterprise lista integrações externas como:

- `Live Pet` via `OAuth2`
- `Live Lab` via `OAuth2`
- gateways de pagamento
- `SMS Gateway`
- `SEFAZ`
- `Google Calendar`
- `WhatsApp Business`
- `Email providers`
- `SoluCX`

Além disso, a análise estrutural do Vetus registra no legado:

- `LivePet/Login.htm`
- `LiveLab/Login.htm`

### 3.2 Leitura funcional

Essas integrações se distribuem em quatro grandes grupos:

- `autenticação e SSO`
- `pagamentos e fiscal`
- `comunicação e relacionamento`
- `laboratório e ecossistema clínico`

### 3.3 Papel arquitetural

Integração externa, no acervo, não é só “chamar API”.

Ela exige:

- contrato versionado;
- autenticação;
- observabilidade;
- mascaramento de dados;
- retries e tratamento de falha;
- posição clara dentro da governança do produto.

## 4. Webhooks

### 4.1 Papel funcional

`Webhooks` são a principal superfície de entrega assíncrona do ERP para terceiros.

Eles permitem:

- notificar parceiros;
- desacoplar integração de fluxo síncrono;
- publicar eventos relevantes do produto;
- manter extensão externa sem polling excessivo.

### 4.2 Modelagem documentada

O modelo de dados documenta:

- tabela `webhooks`
- tabela `webhook_events`

Com campos centrais como:

- `tenant_id`
- `url`
- `events`
- `secret`
- `is_active`

e, na trilha de eventos:

- `event_type`
- `payload`
- `status`
- `attempts`
- `last_attempt_at`
- `response_status`
- `response_body`

### 4.3 Leitura da modelagem

Esse desenho mostra uma camada madura o suficiente para:

- registrar destino e assinatura;
- controlar ativação;
- armazenar histórico de entrega;
- medir tentativas e falhas;
- manter rastro de resposta do parceiro.

### 4.4 API documentada

O acervo registra endpoints explícitos:

- `GET /webhooks`
- `POST /webhooks`
- `PUT /webhooks/{id}`
- `DELETE /webhooks/{id}`

### 4.5 Regras de integração

As regras enterprise associadas à camada de integração incluem:

- `retries` com `DLQ`;
- idempotência obrigatória;
- versionamento de contratos;
- observabilidade por parceiro;
- mascaramento de dados sensíveis em logs.

### 4.6 Relação com event bus

O acervo do `event bus` mostra que o dispatch de webhooks é tratado por consumer dedicado:

- `WebhooksEventHandlers`

com processamento de eventos como:

- `patient.created`
- `appointment.scheduled`
- `appointment.status_changed`
- `encounter.created`
- `encounter.status_changed`
- `billing.record.created`
- `billing.status_changed`
- `notification.sent`

Leitura:

- webhooks não são disparo ad hoc espalhado pelo código;
- eles são parte de uma trilha assíncrona centralizada.

### 4.7 Entrega, retry e DLQ manual

O material do `event bus` ainda documenta:

- retry com backoff;
- máximo de tentativas;
- falha final com tratamento estilo `DLQ manual`.

Isso é importante porque transforma webhook em operação controlada, não apenas tentativa best-effort.

## 5. API Keys

### 5.1 Papel funcional

`API keys` são a camada de autenticação programática para parceiros e integrações externas.

Elas servem para:

- acesso por sistemas terceiros;
- chamadas sem sessão humana interativa;
- controle de consumo por credencial;
- governança de integração no nível de cliente/aplicação.

### 5.2 Evidência documental

O acervo de integração documenta explicitamente:

- rotas de `api-keys`;
- `catálogo premium`;
- superfície `X-API-Key` documentada e executando.

Além disso, o backlog do programa traz:

- `API keys, API client e webhooks` como integração administrável no SPA.

### 5.3 Leitura arquitetural

`API key` aqui não é um atalho para “desligar auth”.

Ela é uma forma distinta de autenticação, com exigência de:

- escopo;
- rate limiting;
- trilha auditável;
- contratos públicos consistentes.

### 5.4 Relação com OpenAPI

O acervo associa fortemente `API keys` à `API premium` e à documentação OpenAPI.

Leitura:

- a credencial só faz sentido se o contrato público for claro;
- a documentação não pode divergir do runtime;
- a confiança do integrador depende de spec real, não de promessa.

## 6. API Client

### 6.1 Papel funcional

`API client` é a superfície de administração do consumo externo da API.

Embora o acervo não traga detalhamento funcional tão profundo quanto `webhooks`, ele posiciona o módulo de forma clara como parte do `Console Enterprise`.

### 6.2 Leitura do domínio

No conjunto com `API keys`, o `API client` tende a representar:

- cadastro ou gestão de consumidores técnicos;
- configuração de credenciais ou contexto de uso;
- descoberta e teste de integração;
- administração da relação entre cliente externo e contratos da API.

### 6.3 Relação com Console Enterprise

Os documentos de reorganização são explícitos:

- `api-keys` fica no `Console Enterprise`;
- `webhooks` fica no `Console Enterprise`;
- `api-client` fica no `Console Enterprise`.

Leitura:

- essas superfícies não pertencem ao menu ERP principal;
- elas são administrativas, técnicas e de governança;
- fazem parte da camada secundária de plataforma.

## 7. OpenAPI e contratos públicos

### 7.1 Papel estrutural

O acervo liga repetidamente integrações a:

- `OpenAPI runtime`
- contratos públicos
- validação entre spec e comportamento real

### 7.2 Leitura correta

Para essa camada funcionar de modo enterprise:

- o contrato precisa ser versionado;
- o runtime precisa refletir a spec;
- o integrador precisa consumir documentação executável e confiável.

### 7.3 Valor operacional

Sem OpenAPI coerente:

- `API keys` perdem valor prático;
- `API client` vira casca administrativa;
- integração externa fica sujeita a erro de interpretação.

## 8. Relação com SSO e ecossistema híbrido

O acervo do Vetus mostra vários fluxos híbridos com `SSO` para o legado e cita explicitamente:

- `Identidade corporativa/SSO`
- pontes para módulos legacy;
- integrações Live via login externo.

Leitura:

- a camada de integração externa não é só parceira “de fora”;
- ela também sustenta convivência entre superfícies internas heterogêneas;
- `SSO` é parte do mesmo problema arquitetural de extensão controlada.

## 9. Relação com segurança e compliance

Essa camada depende diretamente de:

- `IAM`
- `MFA` quando houver interface administrativa sensível;
- `auditoria`
- `LGPD`
- `rate limiting`
- `mascaramento`

O acervo enterprise ainda reforça:

- logs sensíveis mascarados;
- observabilidade por parceiro;
- autenticação e escopo alinhados para uso por terceiros.

Leitura:

- integração sem governança de segurança não é extensão de produto;
- é superfície de risco.

## 10. Relação com SPA e Console Enterprise

O acervo mostra que já houve materialização de superfície SPA para:

- `api-keys`
- blocos administrativos ligados a auth / MFA

e planeja explicitamente páginas para:

- `api-client`
- `api-keys`
- `webhooks`

Dentro do `Console Enterprise`.

Leitura:

- a camada externa precisa ser operável por UI;
- mas essa UI deve viver fora da navegação ERP primária;
- a separação protege a ergonomia do usuário final e a governança técnica.

## 11. Principais riscos se a camada for fraca

Riscos mais relevantes à luz do acervo:

- webhook sem retry ou sem trilha de falha;
- entrega duplicada por acoplamento errado fora do event bus;
- contrato OpenAPI divergente do runtime;
- API key sem escopo ou sem governança auditável;
- exposição de parceiro sem mascaramento e observabilidade;
- integração externa sem idempotência;
- Console Enterprise ausente ou confuso;
- mistura indevida entre operação ERP cotidiana e governança técnica de plataforma.

## 12. Conclusão final

`Integrações externas + webhooks + API keys + API client` compõem a camada de extensão controlada do ecossistema enterprise.

No desenho consolidado do acervo, isso significa:

- integrações externas como capacidade estratégica multi-domínio;
- `webhooks` como entrega assíncrona governada por eventos;
- `API keys` como autenticação programática auditável;
- `API client` como administração do consumo externo;
- `OpenAPI` como contrato público confiável;
- `Console Enterprise` como superfície correta para governança dessa camada.

Conclusão objetiva:

- essa camada fecha a abertura do ERP para terceiros e sistemas adjacentes;
- sua maturidade depende tanto de runtime e contratos quanto de UI administrativa e governança;
- ela deve ser tratada como plataforma enterprise, não como utilitário lateral.
