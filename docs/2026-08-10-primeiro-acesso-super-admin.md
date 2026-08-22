# Primeiro acesso — provisionamento do super administrador

**Data:** 2026-08-10

**Atualizado em:** 2026-08-22

**Escopo:** `apps/api` (rotas `/auth/setup*`), `apps/spa` (assistente `/setup`) e configuração de deploy

---

## 1. Por que existe

Antes, a criação do primeiro administrador dependia de credenciais e do script de seed. O assistente de primeiro acesso substitui esse caminho por um provisionamento explícito: uma instalação migrada nasce sem conta utilizável, e o operador cria a primeira clínica e o super administrador pelo navegador.

Como essa é a única mutação capaz de criar uma conta sem identidade prévia, ela fica desabilitada até que o operador forneça `SETUP_BOOTSTRAP_TOKEN`. Apenas conhecer a URL do assistente não habilita o provisionamento.

---

## 2. Configurar o token de instalação

`SETUP_BOOTSTRAP_TOKEN` é obrigatório para habilitar `POST /auth/setup`. A ausência do token não impede as consultas de saúde ou de status, mas faz a mutação falhar fechada com `503 SETUP_DISABLED`; nesse estado, `GET /auth/setup/status` informa `setupAvailable: false` e o SPA não exibe o formulário de provisionamento.

A API não gera um token substituto, não persiste o token e nunca registra seu valor nos logs. O segredo deve ser gerado e distribuído pelo operador.

Regras validadas na inicialização:

- no mínimo 43 caracteres, comprimento correspondente a 32 bytes em Base64URL sem padding;
- nenhum caractere de whitespace;
- pelo menos 8 caracteres distintos;
- origem em um gerador criptográfico de alta entropia.

Um comando adequado para gerar um valor sem gravá-lo no repositório é:

```bash
openssl rand -hex 32
```

O resultado tem 64 caracteres. Trate-o como segredo: não o inclua em commits, logs, URLs ou tickets.

### 2.1 Docker Compose

O `docker-compose.v2.yml` encaminha `SETUP_BOOTSTRAP_TOKEN` do ambiente do operador para a API. Em desenvolvimento, gere o segredo no momento do deploy:

```bash
export SETUP_BOOTSTRAP_TOKEN="$(openssl rand -hex 32)"
docker compose -f docker-compose.v2.yml up -d
```

Também é possível fornecê-lo por um arquivo de ambiente local não versionado ou pelo mecanismo de secrets da plataforma. Não substitua o placeholder vazio de `.env.v2.example` por um valor fixo no repositório.

### 2.2 Helm

O chart aceita duas origens:

- `api.setup.value`: valor fornecido pelo operador; o chart cria o Secret correspondente. É apropriado apenas para desenvolvimento controlado;
- `api.setup.existingSecret`: nome de um Secret externo. `api.setup.secretKey` seleciona a chave, cujo padrão é `SETUP_BOOTSTRAP_TOKEN`.

Em desenvolvimento, o valor pode ser gerado durante o deploy:

```bash
helm upgrade --install cvg-his-v2-dev infra/helm/cvg-his-v2 \
  -f infra/helm/cvg-his-v2/values.yaml \
  -f infra/helm/cvg-his-v2/values.dev.yaml \
  --set-string api.setup.value="$(openssl rand -hex 32)"
```

Em staging e produção, provisione o segredo pelo gerenciador externo adotado pelo ambiente e referencie apenas o nome e a chave no values, sem registrar o conteúdo:

```yaml
api:
  setup:
    existingSecret: cvg-his-v2-prod-api-secrets
    secretKey: SETUP_BOOTSTRAP_TOKEN
```

Não há token de setup fixo no chart ou nos arquivos de values do repositório. Sem `api.setup.value` ou `api.setup.existingSecret`, o Deployment não injeta a variável e o provisionamento permanece desabilitado.

---

## 3. Executar o primeiro acesso

### 3.1 Aplicar as migrações

```bash
pnpm --filter @cvg-his/db run db:migrate
```

Não é necessário executar o seed. O assistente cria a instalação inicial e o catálogo de acesso usado em runtime.

### 3.2 Abrir o sistema

O SPA consulta `GET /auth/setup/status`. Quando a instalação exige setup e o token está configurado, o usuário é direcionado ao formulário em `/setup`. Se o banco ainda exige setup, mas o segredo não está disponível, a tela informa que o operador precisa corrigir a configuração.

O formulário aplica as seguintes regras, confirmadas pela API:

| Campo | Regra |
|---|---|
| Token de instalação | Igual a `SETUP_BOOTSTRAP_TOKEN` e com pelo menos 43 caracteres |
| Nome da clínica | Obrigatório, até 255 caracteres |
| Usuário | 3 a 128 caracteres: letras, números, `.`, `-`, `_` |
| Nome completo | Opcional, até 255 caracteres |
| E-mail | Formato válido, até 320 caracteres |
| Senha | 12 a 128 caracteres e ao menos 3 entre minúsculas, maiúsculas, números e símbolos |

Em caso de sucesso, `POST /auth/setup` responde `201` somente com:

```json
{
  "setupCompleted": true,
  "requiresLogin": true
}
```

O setup não autentica o administrador, não devolve tokens de sessão e não inicia sessão por cookie. Depois da confirmação, o SPA apaga do formulário o token e a senha e apresenta um link para `/login`. O administrador deve fazer o login normal com a conta recém-criada.

---

## 4. O que é criado

A função de banco responsável pelo provisionamento executa a operação de forma atômica e cria:

1. o tenant inicial;
2. a conta da clínica, com slug derivado do nome;
3. a unidade central, com código `hq`;
4. os papéis e permissões obtidos do catálogo canônico de controle de acesso;
5. o usuário administrador, com senha armazenada como hash;
6. o vínculo desse usuário ao papel administrativo;
7. o estado durável e a auditoria do provisionamento inicial.

Qualquer falha desfaz a operação. O estado global impede que a exclusão posterior do último usuário reabra o setup.

---

## 5. Controles de segurança

| Controle | Implementação atual |
|---|---|
| **Falha fechada** | Sem `SETUP_BOOTSTRAP_TOKEN`, o status continua consultável, mas `POST /auth/setup` responde `503 SETUP_DISABLED` |
| **Executa uma única vez** | Após o provisionamento, novas tentativas respondem `409 SETUP_ALREADY_COMPLETED` |
| **Concorrência** | A função de banco detém a transação e a reivindicação global do setup; requisições perdedoras recebem conflito |
| **Token de instalação** | Segredo de alta entropia, validado na inicialização e comparado em tempo constante |
| **Força bruta** | As rotas de setup usam o rate limiter de autenticação por IP |
| **Entradas** | Corpo limitado e validação server-side para todos os campos e para a política de senha |
| **Rastreabilidade** | O provisionamento possui auditoria durável; tentativas com token inválido registram contexto e IP, nunca o segredo |
| **Sessão separada** | A resposta do setup contém apenas os indicadores de conclusão; a sessão nasce exclusivamente no login normal |

### Modo em memória

Sem persistência de banco configurada, não existe instalação a provisionar. `GET /auth/setup/status` responde `setupRequired: false` e `setupAvailable: false`; `POST /auth/setup` responde `409 SETUP_UNAVAILABLE`, e o SPA segue para o login normal.

---

## 6. Verificação do comportamento atual

Esta revisão documental foi confrontada com a resolução do token, as rotas de setup, o provisionamento, a tela do SPA e os manifests de Docker Compose e Helm. O estado atual confirma que:

- token ausente mantém o status disponível e desabilita a mutação;
- a aplicação não gera nem registra um token de setup;
- tokens configurados precisam cumprir comprimento, ausência de whitespace e diversidade mínimos;
- a conclusão retorna `setupCompleted: true` e `requiresLogin: true` sem autenticação automática;
- Docker Compose encaminha a variável do ambiente;
- Helm usa `api.setup.value` ou `api.setup.existingSecret`/`api.setup.secretKey`, sem segredo fixo no repositório.

Contagens totais de testes, migrações, papéis ou permissões não ficam congeladas neste documento porque variam com o código. A validação quantitativa deve usar o pipeline e as suítes da revisão que estiver sendo implantada.

---

## 7. Arquivos de referência

| Arquivo | Papel |
|---|---|
| `apps/api/src/setup-token.ts` | Resolução, regras e comparação do token de bootstrap |
| `apps/api/src/routes/setup-routes.ts` | `GET /auth/setup/status`, `POST /auth/setup` e validação de entrada |
| `apps/api/src/setup-provisioning.ts` | Chamada atômica do provisionamento, catálogo e slug |
| `apps/api/src/index.ts` | Resolve somente o token fornecido pelo operador e o entrega ao servidor |
| `apps/spa/src/pages/setup/SetupPage.vue` | Estados do assistente e transição explícita para o login |
| `apps/spa/src/services/setup.ts` | Contratos de status e conclusão do setup |
| `.env.v2.example` | Placeholder e orientação de geração do token |
| `docker-compose.v2.yml` | Encaminhamento de `SETUP_BOOTSTRAP_TOKEN` para a API |
| `infra/helm/cvg-his-v2/values.yaml` | Opções `api.setup` do chart |
| `infra/helm/cvg-his-v2/templates/api-deployment.yaml` | Injeção opcional do Secret no Deployment da API |
| `infra/helm/cvg-his-v2/README.md` | Convenções de deploy e secrets por ambiente |

---

## 8. Depois do provisionamento

O token perde a finalidade depois que o setup é concluído, pois o estado durável bloqueia novas execuções. Remova-o do ambiente ou do Secret externo e recrie ou faça rollout da API para que o valor também deixe os processos em execução. Não reutilize esse segredo para autenticação, webhooks ou outras integrações.
