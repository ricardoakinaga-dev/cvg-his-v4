# Relatório: LGPD, Retenção, Mascaramento e Trilha de Consentimento

Data: 2026-04-24
Escopo: leitura dedicada da camada de `LGPD + retenção + mascaramento + trilha de consentimento`, fechando a base de compliance apoiada sobre `IAM`, `MFA`, `Sessões` e `Auditoria`.

## 1. Síntese executiva

O acervo consolidado mostra que a camada de `LGPD` não é periférica.

Ela é um dos pilares de compliance do produto.

Leitura consolidada:

- `consentimento` é tratado como registro granular por finalidade;
- `retenção` é tratada como política configurável por tipo de dado;
- `mascaramento` é requisito explícito para logs e superfícies técnicas;
- `DSR` fecha a operacionalização dos direitos do titular;
- `auditoria` funciona como trilha de prova para consentimento, revogação, exportação e anonimização.

Conclusão objetiva:

- a camada de LGPD já está bem definida conceitualmente e com baseline operacional documentada;
- o desenho enterprise é forte;
- mas o próprio acervo ainda registra riscos reais, como tráfego de dados sensíveis sem mascaramento em APIs, o que precisa ser lido com honestidade.

## 2. Papel da camada no produto

O material enterprise consolida `LGPD` como parte de:

- `security by design`;
- trilhas de `auditoria e compliance`;
- governança de dados;
- operação auditável e multi-tenant.

Essa camada sustenta:

- base legal e finalidade;
- gestão de consentimento;
- atendimento a direitos do titular;
- retenção e descarte;
- minimização e mascaramento;
- rastreabilidade de uso de dado pessoal.

## 3. Consentimento

### 3.1 Papel funcional

`Consentimento` é o registro explícito de permissão de uso por finalidade.

No acervo, ele não é tratado como flag genérica.

Ele é:

- granular;
- contextual;
- auditável;
- sujeito a revogação.

### 3.2 Tabelas e isolamento

O guia operacional documenta:

- `consent_records`
- RLS ativo por `tenant`

Leitura:

- o consentimento é persistido em estrutura própria;
- o isolamento por conta/tenant é parte nativa do desenho.

### 3.3 Finalidades de consentimento

As finalidades documentadas são:

- `marketing`
- `analytics`
- `clinical`
- `financial`
- `operational`
- `notifications`

Esse ponto é importante porque mostra um consentimento:

- orientado a propósito;
- não reduzido a “aceitou tudo / não aceitou”.

### 3.4 Tipos de sujeito

O acervo documenta consentimento para:

- `owner`
- `patient`
- `user`

Leitura:

- a camada LGPD não serve só ao cliente/tutor;
- ela cobre também paciente e usuário interno quando aplicável.

### 3.5 Fluxos de consentimento

O guia operacional registra endpoints claros:

- `POST /lgpd/consent`
- `POST /lgpd/consent/revoke`
- `GET /lgpd/consent`
- `GET /lgpd/consent/status`

Também define:

- idempotência para concessão;
- idempotência para revogação;
- status por finalidade.

### 3.6 Contrato documentado

O registro de consentimento documentado inclui campos como:

- `subjectId`
- `subjectType`
- `purpose`
- `status`
- `origin`
- `grantedBy`
- `grantedAt`
- `revokedBy`
- `revokedAt`
- `expiresAt`
- `metadata`

Leitura:

- o consentimento não é só binário;
- ele tem origem, autor, tempo, expiração e contexto.

## 4. Trilha de consentimento

### 4.1 Papel da trilha

A trilha de consentimento é a parte probatória da LGPD.

Ela precisa demonstrar:

- quando o consentimento foi concedido;
- por quem;
- para qual finalidade;
- em qual origem;
- quando foi revogado;
- quem operou a revogação.

### 4.2 Eventos auditáveis

O acervo documenta eventos de auditoria já previstos/implementados:

- `lgpd.consent_granted`
- `lgpd.consent_revoked`

Ambos aparecem como eventos de risco alto.

### 4.3 Valor operacional

Sem essa trilha, o sistema até pode armazenar consentimento, mas não consegue:

- comprovar sua legitimidade;
- sustentar auditoria externa;
- reconstruir histórico em disputa ou incidente.

## 5. DSR e direitos do titular

### 5.1 Papel funcional

O acervo documenta um bloco explícito de `Data Subject Requests`.

Tipos documentados:

- `data_export`
- `data_deletion`
- `data_anonymization`
- `data_rectification`
- `data_access`
- `data_portability`
- `consent_revocation`

### 5.2 Tabela e isolamento

O guia operacional registra:

- `data_subject_requests`
- RLS ativo por tenant

### 5.3 Fluxos operacionais

Endpoints documentados:

- `POST /lgpd/requests`
- `GET /lgpd/requests`
- `POST /lgpd/requests/complete`
- `POST /lgpd/requests/reject`
- `POST /lgpd/export`

Leitura:

- os direitos do titular são tratados como processo operacional;
- há ciclo de vida explícito da solicitação;
- a camada de compliance não é só política, é operação.

### 5.4 Trilha auditável de DSR

Eventos documentados:

- `lgpd.dsr_created`
- `lgpd.dsr_completed`
- `lgpd.dsr_rejected`

Todos com criticidade alta.

Isso mostra um desenho correto:

- pedido do titular vira objeto de workflow;
- workflow gera rastro auditável;
- resultado final pode ser inspecionado.

## 6. Retenção

### 6.1 Papel funcional

`Retenção` define por quanto tempo cada tipo de dado deve permanecer antes de descarte, anonimização ou preservação legal.

No acervo, ela aparece como requisito explícito de compliance.

### 6.2 Regras documentadas

O backlog enterprise define:

- retenção configurável por tipo de dado;
- descarte automático com auditoria.

Além disso, a documentação geral do produto fala em:

- backup automático com retenção de `30 dias`.

### 6.3 Leitura arquitetural

`Retenção` não é apenas política de backup.

Ela precisa articular:

- dado operacional;
- dado pessoal;
- dado fiscal;
- histórico auditável;
- obrigação legal de preservação.

### 6.4 Preservação legal

O próprio backlog deixa explícito que:

- anonimização irreversível deve conviver com preservação de dados fiscais conforme lei.

Esse é um ponto central da camada de compliance:

- nem todo pedido de exclusão significa apagar tudo;
- parte do dado precisa ser preservada por exigência legal;
- o restante precisa ser minimizado, anonimizado ou desvinculado.

## 7. Mascaramento

### 7.1 Papel funcional

`Mascaramento` reduz exposição desnecessária de PII em logs, monitoramento e superfícies técnicas.

### 7.2 Alvo documentado

O backlog e a arquitetura enterprise registram metas explícitas:

- mascarar `CPF`, `telefone` e `endereço` em logs;
- nunca expor dados clínicos em logs;
- mascarar `CPF/CNPJ` em logs;
- aplicar minimização e anonimização em usos secundários.

### 7.3 Regra de integração

A arquitetura enterprise também explicita:

- mascaramento de dados sensíveis em logs de integração.

Isso é importante porque boa parte do vazamento real de PII acontece:

- em observabilidade;
- em integração;
- em suporte;
- em troubleshooting.

### 7.4 Risco real documentado

O próprio acervo Vetus registra um risco concreto:

- `Dados sensíveis (CPF, RG) trafegam sem mascaramento nas APIs`

Esse ponto precisa aparecer com clareza.

Leitura:

- o alvo enterprise está correto;
- mas o estado observado/documentado ainda mostra lacuna real de proteção na exposição de dados.

## 8. Exportação e portabilidade

### 8.1 Papel funcional

`Export` é a materialização do direito de acesso e portabilidade.

### 8.2 Regras documentadas

O guia operacional define:

- exportação de dados pessoais;
- uso apenas de providers preconfigurados;
- allowlist de providers;
- proteção contra injeção de provider pela requisição.

### 8.3 O que o export deve incluir

A baseline do módulo descreve que o export deve incluir:

- registros de consentimento do sujeito;
- histórico de DSR;
- dados reais do titular via providers compatíveis com seu tipo.

### 8.4 O que nunca deve incluir

A mesma baseline documenta exclusões importantes:

- dados de outros titulares;
- dados de outras contas;
- logs internos do sistema;
- dados financeiros detalhados sem consentimento específico.

Leitura:

- o export não é dump irrestrito;
- ele é recorte controlado e juridicamente orientado.

## 9. Anonimização e direito ao esquecimento

### 9.1 Papel funcional

O acervo trata `anonimização` como resposta operacional a pedidos de exclusão, sem romper obrigações legais.

### 9.2 Regras documentadas

O backlog define:

- anonimização irreversível com `audit trail`;
- preservação de dados fiscais conforme lei.

### 9.3 Leitura arquitetural

Isso mostra um desenho maduro:

- exclusão não é deleção cega;
- compliance exige equilíbrio entre privacidade e obrigação regulatória;
- toda anonimização relevante precisa deixar trilha.

## 10. Permissões e compliance operacional

O módulo LGPD documenta permissões dedicadas:

- `lgpd.consent.manage`
- `lgpd.consent.read`
- `lgpd.requests.manage`
- `lgpd.requests.read`

Leitura:

- LGPD não é recurso aberto;
- sua operação depende de autorização explícita;
- isso conecta compliance à camada de `Usuários + Grupos de Acesso`.

## 11. Relação com segurança operacional

Essa camada se apoia diretamente no que já foi consolidado em:

- `MFA`
- `Sessões`
- `Auditoria`
- `tenant isolation`
- `RLS`

Sem essa base:

- consentimento não é confiável;
- DSR não é governável;
- retenção não é demonstrável;
- mascaramento não é verificável.

## 12. Relação com governança e Console Enterprise

Os documentos de reorganização sugerem dupla exposição controlada para:

- `audit`
- `lgpd`

em:

- `Relatórios > Plataforma`
- `Console Enterprise`

Leitura:

- o ERP principal não deve ficar poluído por superfícies técnicas demais;
- mas compliance precisa ser inspecionável;
- o `Console Enterprise` é o lugar natural para supervisão avançada, enquanto a operação pode aparecer em hubs específicos.

## 13. Indicadores e compromisso operacional

O acervo enterprise define metas de governança relevantes, como:

- `Solicitações LGPD atendidas: 100% no prazo`
- `Eventos auditados com integridade: 100%`

Esses indicadores reforçam que LGPD é tratado como disciplina operacional mensurável, não apenas obrigação documental.

## 14. Principais riscos se a camada for fraca

Riscos concretos à luz do acervo:

- consentimento sem granularidade por finalidade;
- revogação sem propagação entre sistemas;
- exportação excessiva ou mal delimitada;
- anonimização sem trilha auditável;
- retenção não configurável;
- descarte sem prova;
- logs e integrações expondo PII;
- tráfego de `CPF` e `RG` sem mascaramento;
- compliance forte no papel, mas fraco na execução técnica.

## 15. Conclusão final

`LGPD + retenção + mascaramento + trilha de consentimento` fecha a camada de compliance do ecossistema Vetus-like.

No desenho consolidado do acervo, isso significa:

- consentimento granular por finalidade;
- DSR como processo operacional rastreável;
- retenção e descarte com regra e prova;
- mascaramento como defesa transversal em logs e integrações;
- anonimização como resposta juridicamente orientada;
- auditoria como base de confiança de toda a camada.

Conclusão objetiva:

- a arquitetura documental dessa camada é madura;
- a operação mínima já está bem definida;
- mas o próprio acervo preserva sinais de lacuna real de proteção de dados em exposição de API, o que precisa ser tratado como risco concreto e não como detalhe secundário.
