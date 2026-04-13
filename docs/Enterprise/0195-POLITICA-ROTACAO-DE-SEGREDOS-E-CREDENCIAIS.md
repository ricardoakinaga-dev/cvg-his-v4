# 0195 - Politica de Rotacao de Segredos e Credenciais

**Status:** vivo  
**Data de validacao:** 2026-04-12  
**Escopo:** politica operacional minima para rotacao de segredos enquanto o runtime ainda usa `.env` e variaveis de ambiente  
**Dependencias:** `130`, `301`, `315`, `0193`, `0194`

---

## 1. Objetivo

Padronizar quando e como rotacionar segredos do CVG-HIS V2 para reduzir risco operacional ate a migracao para secrets manager dedicado.

Esta politica cobre:

- segredos de autenticacao e criptografia
- credenciais de banco, cache e integracoes
- evidencia minima de execucao da rotacao

Esta politica nao substitui a futura decisao de Vault ou secrets manager. Ela fecha o baseline atual do programa.

---

## 2. Regras obrigatorias

- nenhum segredo de producao deve ser commitado no repositório
- `.env` de producao deve existir apenas no host ou pipeline autorizado
- placeholders como `troque-esta-senha`, `changeme`, `dev-secret` e equivalentes invalidam o ambiente
- toda rotacao deve gerar evidencia operacional: data, owner, ambiente, motivo, validacao e rollback
- toda rotacao emergencial deve ocorrer antes de nova publicacao do ambiente afetado

---

## 3. Inventario minimo de segredos

| Segredo / credencial | Uso atual | Owner primario | Frequencia-alvo | Gatilhos de rotacao imediata |
| --- | --- | --- | --- | --- |
| `AUTH_SECRET` | assinatura de access/refresh tokens da API | Backend + Platform | a cada `90` dias | suspeita de vazamento, acesso indevido ao host, clonagem de ambiente, incidente de auth |
| `MFA_SECRET_ENCRYPTION_KEY` | criptografia de segredos TOTP em repouso | Backend + Security | a cada `180` dias | suspeita de vazamento, incidente de MFA, troca de custodiante |
| `DATABASE_URL` / `POSTGRES_PASSWORD` | acesso ao PostgreSQL | Platform / DBA | a cada `90` dias | dump exposto, host comprometido, troca de operador, incidente de banco |
| `REDIS_URL` / senha Redis | acesso ao Redis | Platform / SRE | a cada `90` dias | ambiente exposto, incidente de cache, troca de operador |
| `OIDC_CLIENT_SECRET` | federacao OIDC da API | Security + Platform | a cada `90` dias ou conforme IdP | revogacao do IdP, mudanca de callback, suspeita de abuso |
| `WHATSAPP_API_KEY`, `TWILIO_AUTH_TOKEN`, `360DIALOG_API_KEY` | integracoes de notificacao | Produto + Platform | a cada `90` dias | incidente de mensageria, revogacao pelo vendor, troca de conta |
| `PAGARME_API_KEY`, `PAGARME_PIX_KEY` | integracao PIX | Financeiro + Platform | a cada `90` dias | incidente financeiro, troca de conta, suspeita de abuso |
| `ADMIN_PASSWORD` de bootstrap/seed | acesso inicial controlado | Platform | uso unico por bootstrap | apos seed inicial, homologacao ou troca de responsavel |

Observacoes:

- access token e refresh token nao entram nesta politica como segredo persistente; sao artefatos de sessao
- quando um segredo nao estiver habilitado no ambiente, ele nao exige calendario ativo, mas continua coberto pelos gatilhos de rotacao ao ser ativado

---

## 4. Calendario minimo

- producao: janela fixa trimestral para `AUTH_SECRET`, banco, Redis e integracoes
- staging: rotacao no minimo a cada `180` dias e sempre apos incidentes ou restauracoes
- desenvolvimento local: sem calendario formal, mas proibido reutilizar segredos de staging/producao

Calendario recomendado:

- semana 1 de janeiro
- semana 1 de abril
- semana 1 de julho
- semana 1 de outubro

`MFA_SECRET_ENCRYPTION_KEY` deve ficar em janela semestral dedicada por exigir procedimento controlado.

---

## 5. Procedimento padrao de rotacao

1. Abrir registro operacional com ambiente, owner, motivo e janela.
2. Gerar novo segredo forte fora do repositório.
3. Atualizar o segredo no host ou pipeline autorizado.
4. Fazer deploy controlado dos serviços impactados.
5. Validar `health`, `ready`, login, fluxo critico e integrações afetadas.
6. Invalidar material antigo quando aplicável.
7. Registrar evidência final e fechar a execução.

Evidencia minima:

- data e hora UTC
- ambiente
- segredo rotacionado
- executor e aprovador
- comandos de validacao executados
- resultado de health checks
- observacao de rollback ou confirmacao de descarte do segredo antigo

---

## 6. Runbook por tipo de segredo

### 6.1 `AUTH_SECRET`

Impacto:

- invalida sessoes existentes apos o deploy
- exige comunicacao com operacao se houver usuarios ativos

Execucao:

1. Gerar novo segredo com pelo menos `32` caracteres aleatorios.
2. Atualizar `AUTH_SECRET` no ambiente alvo.
3. Reiniciar API e worker dependente de auth.
4. Validar `GET /health`, `GET /ready`, login e refresh.
5. Confirmar que tokens antigos nao permanecem validos.

### 6.2 `MFA_SECRET_ENCRYPTION_KEY`

Impacto:

- segredo sensivel porque protege TOTP em repouso
- exige janela controlada e plano de reprocessamento se houver rotacao real em producao

Execucao minima atual:

1. Planejar manutencao.
2. Inventariar credenciais MFA existentes.
3. Aplicar nova chave no ambiente.
4. Executar estrategia de re-enrollment ou rotina de recriptografia quando implementada.
5. Validar setup MFA, confirmacao MFA e recovery codes.

Regra:

- nao rotacionar esta chave de forma opportunista sem plano de dados

### 6.3 Banco e Redis

1. Criar nova credencial no provedor.
2. Atualizar `DATABASE_URL` e `REDIS_URL` no ambiente.
3. Reiniciar API e worker.
4. Validar `ready`, jobs do worker e consultas criticas.
5. Revogar a credencial antiga.

### 6.4 Integracoes externas

1. Gerar ou solicitar nova credencial ao vendor.
2. Atualizar ambiente.
3. Executar smoke test da integração.
4. Revogar credencial anterior.

---

## 7. Gatilhos de rotacao emergencial

Executar rotacao imediata quando houver qualquer um destes eventos:

- segredo exposto em log, ticket, chat, print ou commit
- acesso indevido ao host, CI ou ferramenta de deploy
- desligamento ou troca de operador com acesso direto aos segredos
- restauracao de backup em ambiente alternativo
- incidente reportado por vendor ou provedor de identidade

---

## 8. Comandos minimos de validacao

```bash
pnpm security:secrets
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3003/ready
curl -I http://127.0.0.1:3002/
```

Se a rotacao afetar autenticacao ou integrações, validar tambem:

- login
- refresh token
- MFA
- worker loop
- webhook / WhatsApp / PIX, quando habilitados

---

## 9. Estado atual e proximo passo

Estado atual em `2026-04-12`:

- secret scanning obrigatorio no CI e reproduzivel localmente com `pnpm security:secrets`
- politica de rotacao minima formalizada
- deploy guide consolidado com config fail-fast e security baseline

Proximo passo fora deste documento:

- `IMP-406` decidir secrets manager dedicado
- `IMP-407` migrar `.env` operacional para manager dedicado
