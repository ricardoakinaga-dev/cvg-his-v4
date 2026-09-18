# ADR-015 — verificação criptográfica de WebAuthn/FIDO2

## Status

Aceito em 2026-09-18. Este ADR substitui as decisões de WebAuthn registradas
como fundacionais no ADR-014.

## Contexto

O serviço anterior gerava opções compatíveis com WebAuthn, mas aceitava uma
resposta de registro sem validar attestation, challenge, origem ou RP ID e
armazenava uma chave pública sintética. A autenticação também não validava a
assinatura nem o contador. Além disso, as rotas aceitavam o RP ID de um header
controlado pelo cliente.

Essas lacunas permitiam que um payload estruturalmente válido fosse tratado
como segundo fator sem prova criptográfica de posse da credencial.

## Decisão

- Usar `@simplewebauthn/server` 14.0.2 para gerar opções e verificar respostas
  de registro e assertion FIDO2.
- O RP ID e as origens aceitas são valores de deployment (`WEBAUTHN_RP_ID` e
  `WEBAUTHN_ORIGINS`), nunca valores derivados do request. Em ambientes
  production-like, a flag fica fail-closed sem configuração autoritativa e
  estado durável.
- No registro, validar challenge, origem, RP ID, user presence e a política
  configurada de user verification. Persistir o credential ID real, a chave
  pública COSE e o contador inicial.
- Na assertion, validar challenge, origem, RP ID, user handle, assinatura e
  contador. Atualizar contadores positivos com compare-and-swap tenant-scoped;
  contadores zerados seguem permitidos apenas após a validação criptográfica e
  com challenge de uso único.
- O repositório PostgreSQL mantém o credential ID real como chave primária e
  atualiza o contador com predicado de conta, usuário, credencial e contador
  esperado.

Attestation de confiança de fabricante não é habilitada por este ADR: o
  registro usa `attestation: none`, adequado ao fluxo de passkeys da aplicação.
  Uma política de trust store/enterprise attestation exigirá decisão própria.

## Evidência

Os testes Node geram uma credencial P-256, attestation CBOR `fmt:none` e
assertions assinadas; cobrem registro, armazenamento da chave real, challenge
alterado, assinatura inválida, replay de contador, origem incorreta, RP ID
incorreto, isolamento por usuário/conta e concorrência no contador. A suíte
nativa das rotas também comprova que `x-rp-id: attacker.example` não altera o
RP ID configurado.

## Consequências operacionais

Para habilitar WebAuthn fora de desenvolvimento/teste, o deployment deve
configurar `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGINS`, banco PostgreSQL e os stores
duráveis de credenciais e challenges. O valor de origem deve ser o origin
completo (`https://host`, sem path); o RP ID é apenas o hostname.
