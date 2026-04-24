# Relatório: Usuários e Grupos de Acesso, Governança, Perfis, Permissões e Segurança

Data: 2026-04-24
Escopo: leitura aprofundada do domínio `Usuários + Grupos de Acesso` no Vetus, com foco em `governança`, `perfis`, `permissões`, `MFA`, `auditoria`, relação com `Console Enterprise` e papel estrutural em segurança.

## 1. Síntese executiva

`Usuários` e `Grupos de Acesso` formam o núcleo de `IAM` do Vetus.

Leitura consolidada:

- `Usuários` representa identidade operacional autenticada;
- `Grupos de Acesso` representa o modelo coletivo de autorização;
- a permissão efetiva é baseada em `rotinas` e operações por rotina;
- `auditoria`, `sessão`, `MFA` e `segregação por tenant` não são acessórios, mas partes estruturais do desenho enterprise;
- `Console Enterprise` aparece como superfície complementar para governança avançada, e não como substituto do controle operacional de acesso do ERP.

Conclusão objetiva:

- o bloco `Usuários + Grupos de Acesso` deve ser entendido menos como “cadastro administrativo” e mais como `plataforma de autorização e governança`;
- o RH hospeda a descoberta humana e operacional dessas capacidades;
- o `Console Enterprise` hospeda a governança avançada, técnica e de compliance.

## 2. Papel do domínio no produto

No acervo consolidado, `Usuários e Acesso` aparece classificado com prioridade alta no mapeamento enterprise.

Domínio-alvo:

- `IAM`

Funções centrais:

- autenticação;
- autorização;
- sessão;
- governança de perfis;
- trilha de auditoria;
- segregação organizacional.

Leitura arquitetural:

- esse bloco controla quem entra;
- o que cada pessoa pode fazer;
- em qual contexto organizacional ela opera;
- e como cada ação fica rastreada.

## 3. Evidência funcional disponível

### 3.1 Evidência de superfície

No mapa estrutural do Vetus, as rotas legadas são:

- `.../Usuarios/Usuarios.htm`
- `.../Usuarios/GruposDeAcesso.htm`

Na superfície beta documentada:

- `rh-usuarios-01.png` mostra `página indisponível`;
- `rh-grupos-acesso-01.png` mostra `página indisponível`.

### 3.2 Evidência de integração real

Mesmo com a superfície beta indisponível, a inspeção do shell confirmou:

- `GET /users/{id}/access-groups`

Esse ponto é crítico porque prova que:

- grupos de acesso não são apenas conceito visual;
- o menu e a navegação permissionada dependem de dados reais do backend;
- a autorização influencia a experiência concreta do usuário autenticado.

### 3.3 Evidência de autenticação

O fluxo de login observado no shell usa três fatores de entrada no formulário:

- `ID Vetus`
- `Usuário`
- `Senha`

Além disso, a autenticação foi descrita no acervo com:

- `POST /auth/v1/login`
- `GET /auth/me`

Leitura:

- a identidade do usuário é contextual, não apenas individual;
- o login já nasce vinculado ao contexto da organização.

## 4. Modelo conceitual do domínio

O acervo estrutura esse domínio em pelo menos seis entidades-base:

- `User`
- `AccessGroup`
- `GroupPermission`
- `Routine`
- `UserSession`
- `AuditLog`

Essa composição é importante porque separa claramente:

- identidade;
- agrupamento de autorização;
- permissão granular;
- catálogo de capacidades do sistema;
- sessão autenticada;
- rastro de ação.

## 5. Modelagem de dados documentada

### 5.1 Users

O modelo exploratório documenta `users` com atributos centrais de identidade e segurança:

- `tenant_id`
- `vetus_id`
- `username`
- `email`
- `password_hash`
- `full_name`
- `phone`
- `cpf`
- `status`
- `last_login_at`
- `failed_login_attempts`
- `locked_until`

Leitura:

- o modelo já contempla bloqueio por falha;
- rastreia último login;
- impõe unicidade contextual por `tenant`;
- não trata o usuário como conta global indiferenciada.

### 5.2 Access Groups

`access_groups` foi documentado com:

- `tenant_id`
- `name`
- `description`
- `is_system`

Leitura:

- grupos são isolados por tenant;
- podem existir grupos sistêmicos ou protegidos;
- o modelo distingue grupos operacionais de grupos nativos do sistema.

### 5.3 Group Permissions

`group_permissions` amarra:

- `group_id`
- `routine_id`
- `can_consult`
- `can_insert`
- `can_update`
- `can_delete`

Esse ponto é decisivo.

O Vetus documentado usa um modelo de autorização por:

- `rotina`
- `ação`

Não é apenas um RBAC superficial por nome de perfil.

### 5.4 Routines

A entidade `routines` tem:

- `code`
- `description`
- `module`

Leitura:

- o catálogo de capacidades do sistema é explícito;
- permissões são aplicadas sobre rotinas identificáveis;
- isso facilita governança, auditoria e manutenção.

### 5.5 User Sessions

`user_sessions` documenta:

- `token_hash`
- `refresh_token_hash`
- `ip_address`
- `user_agent`
- `expires_at`

Leitura:

- o desenho já considera sessão persistida e rastreável;
- metadados de sessão ajudam resposta a incidente e revisão de segurança.

### 5.6 Audit Logs

`audit_logs` documenta:

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

Leitura:

- a auditoria é orientada a entidade e ação;
- o modelo comporta diffs de estado;
- o log nasce contextualizado por usuário e tenant.

## 6. Perfis e permissão efetiva

### 6.1 Papel dos grupos

No desenho observado, o usuário não deveria ser permissionado diretamente rotina por rotina como regra principal.

O padrão mais coerente é:

- usuário vinculado a um ou mais grupos;
- grupo vinculado a permissões por rotina;
- rotina vinculada a operações específicas.

### 6.2 Ação por rotina

O acervo deixa explícito o conjunto clássico de operações:

- `Consultar`
- `Inserir`
- `Alterar`
- `Excluir`

Esse modelo tem implicações fortes:

- permite segregação funcional precisa;
- impede reduzir tudo a “admin” e “não admin”;
- sustenta leitura de permissão efetiva por módulo e ação.

### 6.3 Escopo e contexto

A leitura enterprise consolidada afirma:

- usuários acessam apenas seu escopo.

Isso sugere combinação entre:

- grupo de acesso;
- contexto organizacional;
- tenant;
- eventualmente unidade/empresa/filial.

## 7. Governança e segregação

### 7.1 Segregação por tenant

O uso sistemático de `tenant_id` em `users`, `access_groups` e `audit_logs` indica uma premissa central:

- o IAM é multi-tenant por construção.

Isso evita:

- colisão de identidade entre organizações;
- vazamento acidental de grupo e permissão;
- auditoria sem contexto institucional.

### 7.2 Separação entre identidade humana e permissão

No ecossistema Vetus-like, é importante não confundir:

- `Usuário` como conta autenticável;
- `Profissional` como pessoa operacional do negócio.

Essa separação evita:

- acoplamento indevido entre escala clínica e login;
- perda de clareza entre papel humano e poder sistêmico;
- governança fraca em ambientes com múltiplas funções.

### 7.3 Grupos como política reaplicável

`Grupos de Acesso` funciona como política reutilizável.

Isso reduz custo operacional em:

- onboarding;
- troca de equipe;
- segregação por setor;
- revisão periódica de acesso.

## 8. Relação com segurança

### 8.1 Autenticação

O acervo enterprise explicita:

- login;
- sessão;
- MFA;
- auditoria de auth.

Isso posiciona `Usuários` como fronteira primária de segurança.

### 8.2 MFA

Os documentos de reorganização e go-live deixam `MFA` como componente preservado entre `RH > Usuários` e `Console Enterprise`.

Leitura correta:

- MFA tem impacto operacional no ciclo do usuário;
- mas também é governança sensível e, por isso, precisa de presença no domínio técnico-administrativo.

### 8.3 Auditoria

O bloco de auditoria aparece como requisito transversal e validado no checklist de go-live:

- usuários criados;
- grupos aplicados;
- MFA habilitado;
- auditoria validada.

Leitura:

- não basta autenticar;
- é obrigatório provar quem fez o quê, em qual contexto e quando.

### 8.4 Controle de sessão

A modelagem de sessão com `token_hash`, `refresh_token_hash`, `ip_address` e `user_agent` indica maturidade mínima para:

- revogação;
- rastreamento de uso;
- análise de incidente;
- revisão de comportamento suspeito.

## 9. Relação com Console Enterprise

### 9.1 Separação de superfícies

Os documentos de reorganização deixam um desenho narrativo claro:

- `users` e `staff` migram para `RH > Usuários`;
- `access-control` vive em `RH > Usuários` e também no `Console Enterprise`;
- `mfa` é preservado;
- `api-keys`, `webhooks`, `api-client` e `soc2` ficam no `Console Enterprise`.

### 9.2 Interpretação correta

O `Console Enterprise` não substitui `Usuários` e `Grupos de Acesso`.

Ele complementa com governança avançada, como:

- capacidades técnicas;
- compliance;
- integrações;
- segurança de plataforma;
- visão secundária de controle.

### 9.3 Dupla exposição controlada

A narrativa mais madura é:

- acesso operacional do dia a dia fica descobrível em `RH`;
- governança avançada e técnica fica concentrada no `Console Enterprise`;
- auditoria e LGPD podem ter dupla exposição controlada sem poluir o ERP principal.

## 10. Relação com RH e com segurança corporativa

Esse domínio fica exatamente na fronteira entre duas leituras:

- `RH`, quando o foco é pessoa, equipe, onboarding e papel operacional;
- `Segurança corporativa`, quando o foco é autenticação, permissão, MFA, sessão e compliance.

Por isso, a colocação correta é híbrida:

- descoberta e gestão cotidiana em `RH > Usuários`;
- governança avançada e superfície técnica no `Console Enterprise`.

## 11. Principais riscos se esse domínio for mal desenhado

Riscos centrais observáveis a partir do acervo:

- tratar grupo apenas como etiqueta visual, sem rotina real por ação;
- misturar `usuário` e `profissional` como se fossem a mesma entidade;
- centralizar tudo no console técnico e perder descobribilidade operacional;
- deixar tudo no RH e perder governança técnica avançada;
- publicar menu sem backend real de autorização;
- manter auditoria fraca ou não contextualizada por tenant.

## 12. Conclusão final

`Usuários + Grupos de Acesso` é um domínio de governança, não apenas um cadastro.

No Vetus documentado, a leitura correta é:

- `Usuário` controla identidade autenticada;
- `Grupo de Acesso` controla política reaplicável;
- `Permissão por rotina` controla poder efetivo;
- `Sessão`, `MFA` e `Auditoria` fecham a segurança operacional;
- `Console Enterprise` entra como camada complementar de governança avançada.

Conclusão objetiva:

- esse bloco deve ser tratado como `IAM operacional com extensão enterprise`;
- sua qualidade define a confiabilidade de todos os outros módulos;
- a separação entre `RH operacional` e `governança técnica` é a chave para entender sua construção.
