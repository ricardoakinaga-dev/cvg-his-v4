# PROD-019 — Contrato de identidade corporativa

Status: PROPOSED_PENDING_AUTHORITY. Este documento é um contrato revisável e não uma autorização de implementação ou de release.

## Limite deste slice

O slice R1 registra escolhas, invariantes, requisitos, prazos e falhas para o SSO/OIDC corporativo. Não seleciona provider, não usa credenciais reais, não altera o fluxo funcional de login e não associa contas por email.

As fontes atuais mostram configuração OIDC no servidor, PKCE, state, troca de código, UserInfo e timeout por chamada. Elas não comprovam, neste candidato, verificação completa de ID token/JWKS, sessão ERP, vínculo issuer + sub, tenant/RBAC, jornada SPA ou provider sandbox. Essas lacunas viram requisitos R1-R6, não são tratadas como aceitação.

O JSON normativo do slice está em docs/engineering/identity-contract-prod-019.json e é validado por scripts/validate-prod-019-identity-contract.mjs.

## Invariantes

- A identidade externa é sempre a tupla issuer + sub.
- Email e email_verified não vinculam, reconciliam nem reassociam identidade.
- Issuer, discovery, JWKS, redirect_uri e return_to precisam ser permitidos explicitamente.
- State, PKCE S256 e nonce são obrigatórios, correlacionados e de uso único.
- Assinatura e claims do ID token precisam ser verificadas antes do mapeamento.
- Identidade desconhecida, inativa, ambígua ou sem tenant autorizado falha fechada.
- Tokens OIDC não ficam em URL, storage do browser, cookie legível por JavaScript ou logs.
- MFA, sessão ERP, refresh, revogação e logout dependem de decisão de Produto/Segurança.

## Decisões pendentes C1-C6

Todas as opções abaixo têm recomendação não vinculante. O status permanece PENDING_AUTHORITY, com owner, validade e evidência exigida no JSON.

| ID | Decisão | Recomendação não vinculante |
| --- | --- | --- |
| C1 | Issuer, discovery e confiança | Allowlist explícita por ambiente, com discovery/JWKS auditável. |
| C2 | Chave externa e tenant | Mapeamento interno único por issuer + sub; tenant vem do ERP. |
| C3 | Provisionamento | Pré-provisionamento; JIT só com allowlist e aprovação explícita. |
| C4 | MFA e assurance | Step-up ERP para perfis sensíveis; claims do IdP só por política aprovada. |
| C5 | Sessão e tokens | Sessão backend com cookie protegido; tokens externos não chegam à SPA. |
| C6 | Redirect, logout e recuperação | Callbacks/retornos exatos por ambiente e logout coordenado. |

Nenhuma recomendação acima substitui autoridade, nem resolve automaticamente a decisão D1 relatada nos documentos históricos.

## Requisitos obrigatórios R1-R6

| ID | Resultado requerido |
| --- | --- |
| R1 | Issuer aprovado, discovery/TLS/JWKS, rotação e indisponibilidade tratados fail-closed. |
| R2 | State de uso único, PKCE S256, nonce, TTL e replay protegidos. |
| R3 | Código single-use e ID token com assinatura, algoritmo e claims verificadas; UserInfo não substitui ID token. |
| R4 | Mapeamento/provisionamento por issuer + sub, sem email, com estado e tenant autorizados. |
| R5 | Sessão ERP somente após o vínculo; tenant/RBAC do ERP e MFA conforme política. |
| R6 | Refresh com rotação se usado, reuse detection, revogação, logout, timeout, cancelamento e recuperação. |

Cada requisito tem casos de aceitação e evidência externa esperada no contrato JSON. Até essa evidência existir, o status é REQUIRED_PENDING_AUTHORITY.

## Critérios temporais

O state observado no servidor tem TTL de 600000 ms. O cliente OIDC observa timeout padrão de 5000 ms e máximo configurável de 30000 ms por chamada. Esses valores são fatos locais, não aceitação do fluxo: ainda falta um deadline ponta a ponta. Código OAuth deve ser single-use; nonce é por transação; TTL de sessão e política final de refresh aguardam autoridade.

## Threat model e falhas

O contrato cobre CSRF/state, interceptação de código, issuer mix-up, substituição de ID token/JWKS, colisão de email/tomada de conta, confusão de tenant, open redirect, replay, exfiltração de token, timeout/outage, refresh reuse, logout parcial e sessão órfã.

Em qualquer falha de identidade, claims, vínculo, tenant, MFA, redirect ou revogação, o resultado esperado é negar ou invalidar de forma fail-closed, sem sessão parcial, efeito tardio, segredo ou claim cru em log. A matriz FAIL-001 a FAIL-012 do JSON transforma cada cenário em teste verificável.

## Gate de aceite

Product e Security ainda precisam escolher C1-C6, aprovar R1-R6 e assinar o threat model. Antes de PROD-020 ou PROD-021 são obrigatórios provider/sandbox autorizado, discovery/JWKS, testes backend/API/DB/SPA, tenant/RBAC, medições temporais, logout/recuperação e crítica independente fresh no mesmo candidato.

O slice local fornece contrato, documento, validação good/bad e lint. Não há provider real, credenciais, UAT, integração funcional ou evidência de browser/DB neste pacote. Portanto, PROD-019 permanece REVIEW_REQUIRED/BLOCKED por autoridade e integração pendentes; o release e o Triplo AAA permanecem bloqueados.
