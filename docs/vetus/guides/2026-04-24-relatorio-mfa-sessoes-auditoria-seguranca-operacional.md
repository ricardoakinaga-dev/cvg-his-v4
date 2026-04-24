# Relatório: MFA, Sessões e Auditoria na Camada de Segurança Operacional

Data: 2026-04-24
Escopo: leitura dedicada da camada `MFA + Sessões + Auditoria` como base de segurança operacional que sustenta `Usuários`, `Grupos de Acesso`, governança e autorização no ecossistema Vetus.

## 1. Síntese executiva

`MFA`, `Sessões` e `Auditoria` formam a camada operacional de confiança do domínio de acesso.

Leitura consolidada:

- `MFA` protege a autenticação de perfis sensíveis e ações críticas;
- `Sessões` materializam a identidade autenticada em runtime controlável;
- `Auditoria` prova o que aconteceu, por quem, em qual contexto e com qual origem;
- os três elementos juntos fecham a diferença entre “usuário autenticado” e “ambiente governável”.

Conclusão objetiva:

- sem `MFA`, o domínio de acesso fica vulnerável;
- sem `Sessões`, o domínio de acesso fica cego em runtime;
- sem `Auditoria`, o domínio de acesso perde capacidade de prova, investigação e compliance.

## 2. Papel da camada no produto

No acervo enterprise consolidado, o bounded context `Identity and Access` já inclui explicitamente:

- `login`
- `sessão`
- `MFA`
- `auditoria de auth`

Isso indica que a segurança operacional não é um apêndice fora do domínio de acesso.

Ela é parte do próprio núcleo de `IAM`.

## 3. MFA

### 3.1 Papel funcional

`MFA` existe para elevar a confiança de autenticação quando a senha sozinha não é suficiente.

No desenho consolidado do acervo, ele protege principalmente:

- perfis críticos;
- operações sensíveis;
- governança administrativa mais forte.

### 3.2 Capacidades documentadas

O backlog enterprise explicita quatro frentes relevantes:

- `TOTP MFA` com QR code;
- `WebAuthn MFA` para biometria/chave de segurança;
- `step-up authentication` para ações sensíveis;
- `rate limiting` por usuário.

### 3.3 TOTP

O material prevê:

- setup por QR code;
- exigência de TOTP para perfis `admin`, `financeiro` e `gestor`;
- geração de `recovery codes`.

Leitura:

- o MFA não é tratado como recurso decorativo;
- ele é aplicado por criticidade de perfil;
- o desenho já considera contingência operacional via códigos de recuperação.

### 3.4 WebAuthn

Também há previsão explícita de:

- cadastro de chave de segurança;
- login com biometria em dispositivos compatíveis.

Leitura:

- o desenho vai além de senha + código;
- considera autenticação forte moderna para contexto enterprise.

### 3.5 Step-up authentication

O acervo ainda explicita reautenticação para ações sensíveis, como:

- `estorno`
- `ajuste de estoque`
- `alteração de preço`

com validade curta de reautenticação.

Leitura:

- a segurança não termina no login;
- ela reaparece quando o risco operacional sobe.

### 3.6 Posicionamento no produto

Os documentos de reorganização colocam `MFA` em posição híbrida:

- `RH > Usuários`
- `Console Enterprise`

Isso faz sentido porque:

- o impacto do MFA é operacional sobre o usuário;
- mas sua governança é sensível e administrativa.

## 4. Sessões

### 4.1 Papel funcional

`Sessão` é a materialização runtime de um login válido.

Ela não representa apenas “estar logado”.

Ela representa:

- persistência do vínculo autenticado;
- contexto de uso;
- expiração;
- possibilidade de revogação e rastreamento.

### 4.2 Modelagem documentada

O modelo exploratório descreve `user_sessions` com:

- `user_id`
- `token_hash`
- `refresh_token_hash`
- `ip_address`
- `user_agent`
- `expires_at`
- `created_at`

### 4.3 Implicações de segurança

Esse desenho permite:

- identificar sessões ativas;
- associar uso a origem técnica;
- controlar expiração;
- tratar sessão como objeto governável, e não apenas como token solto.

### 4.4 Leitura arquitetural

Sessão é a ponte entre:

- autenticação bem-sucedida;
- autorização em runtime;
- auditoria contextual.

Sem sessão governável, o sistema perde:

- revogação confiável;
- investigação de uso;
- leitura de persistência e origem.

### 4.5 Observação de implementação documentada

Há documentação de problema e alinhamento envolvendo persistência de sessão em banco e uso de repositório de sessão.

Isso reforça que:

- sessão não é detalhe técnico irrelevante;
- ela faz parte do contrato real do domínio.

## 5. Auditoria

### 5.1 Papel funcional

`Auditoria` é a memória confiável da ação operacional.

Ela responde perguntas como:

- quem fez?
- quando fez?
- em qual entidade?
- o que mudou?
- de onde a ação veio?

### 5.2 Modelagem documentada

O modelo exploratório descreve `audit_logs` com:

- `tenant_id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `old_values`
- `new_values`
- `ip_address`
- `user_agent`
- `created_at`

### 5.3 Leitura do desenho

Esse modelo mostra uma auditoria:

- contextual por tenant;
- associada a usuário;
- orientada a entidade;
- capaz de guardar antes/depois;
- enriquecida com origem técnica.

### 5.4 Persistência e compatibilidade

O material de alinhamento de auditoria registra um ponto importante:

- eventos voltam a persistir no banco canônico sem perder rastreabilidade do runtime legado;
- `metadata.module` registra o módulo de origem;
- leitura recompõe `actorId`, `accountId` e `module` a partir do row e da metadata.

Leitura:

- a auditoria foi tratada como trilha integradora entre legado e target;
- o sistema precisa preservar rastreabilidade mesmo quando o runtime de origem é heterogêneo.

### 5.5 Auditoria consultável

O backlog enterprise também pede explicitamente:

- `Auditoria consultável`
- busca e filtros de eventos auditáveis

Isso é relevante porque auditoria útil não é apenas log armazenado.

Ela precisa ser:

- consultável;
- filtrável;
- legível por operação e governança.

## 6. Relação entre MFA, Sessões e Auditoria

Os três blocos formam uma cadeia:

- `MFA` aumenta confiança de autenticação;
- `Sessão` sustenta a identidade autenticada em runtime;
- `Auditoria` registra o uso dessa identidade no sistema.

Sem essa cadeia completa:

- MFA vira obstáculo sem governança posterior;
- sessão vira objeto opaco;
- auditoria perde confiabilidade contextual.

## 7. Relação com perfis e criticidade

O acervo enterprise deixa claro que segurança varia por perfil e sensibilidade.

Leitura coerente:

- usuários comuns podem operar com controles básicos;
- perfis críticos exigem `MFA`;
- ações mais sensíveis exigem `step-up`;
- tudo isso deve ser amarrado à trilha auditável.

Esse desenho é superior a um sistema binário de acesso porque combina:

- identidade;
- papel;
- criticidade de ação;
- prova posterior.

## 8. Relação com tenancy e contexto organizacional

`MFA`, `Sessões` e `Auditoria` não operam em vazio.

Eles estão inseridos num modelo com:

- `tenant`
- `company`
- `branch`
- `sector`

e na regra de ouro de que toda entidade crítica carrega contexto mínimo de isolamento.

Leitura:

- auditoria sem tenant é incompleta;
- sessão sem contexto organizacional é fraca;
- autenticação forte sem escopo organizacional ainda deixa risco de confusão de ownership.

## 9. Relação com Console Enterprise

### 9.1 MFA

`MFA` aparece preservado entre:

- `RH > Usuários`
- `Console Enterprise`

### 9.2 Auditoria

`audit` aparece narrativamente fundido entre:

- `Relatórios > Plataforma`
- `Console Enterprise`

### 9.3 Interpretação

Essa dupla exposição faz sentido:

- RH lida com governança humana do acesso;
- relatórios e console lidam com inspeção, compliance e controle avançado.

O `Console Enterprise` funciona como camada de supervisão e administração técnica, não como substituto da operação cotidiana.

## 10. Relação com compliance e resposta a incidente

Essa camada sustenta diretamente:

- revisão de acesso;
- prova de ação;
- investigação operacional;
- rastreio de origem;
- resposta a incidente;
- preparo para auditoria externa.

Sem ela, o ERP até pode funcionar, mas não é governável em padrão enterprise.

## 11. Riscos principais se a camada for fraca

Riscos mais relevantes à luz do acervo:

- autenticação forte ausente para perfis críticos;
- sessão não persistida ou não rastreável;
- auditoria sem contexto de tenant e origem;
- logs não consultáveis pela operação;
- perda de vínculo entre runtime legado e trilha auditável canônica;
- ausência de reautenticação para ações sensíveis;
- MFA isolado do modelo de perfil e risco.

## 12. Conclusão final

`MFA + Sessões + Auditoria` fecha a camada de segurança operacional do domínio de acesso.

No desenho consolidado do acervo, isso significa:

- `MFA` protege entrada e ações críticas;
- `Sessões` governam a presença autenticada em runtime;
- `Auditoria` transforma uso em prova verificável;
- `Console Enterprise` amplia governança e inspeção sem substituir a operação de acesso cotidiana.

Conclusão objetiva:

- essa camada é fundacional para qualquer módulo sensível do ERP;
- sua maturidade define a credibilidade do restante do sistema;
- o domínio de acesso só fica realmente enterprise quando esses três componentes funcionam juntos.
