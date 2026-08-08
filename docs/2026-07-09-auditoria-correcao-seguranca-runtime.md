# Auditoria e correcao de seguranca e runtime - 2026-07-09

## Escopo

Esta rodada confrontou a documentacao viva de `docs/`, `docs/Enterprise/` e
`docs/vetus/` com o runtime canonico em `apps/api`, `apps/spa`, `apps/worker`,
`packages/modules` e `packages/db`.

Os scores historicos e os scripts de paridade por existencia de arquivo nao foram
tratados como prova funcional. As evidencias aceitas foram compilacao, testes,
migrations, contratos e verificacoes executaveis.

## Correcoes aplicadas

- isolamento por conta em usuarios, tutores, pacientes, agenda, encontros,
  triagem, internacao, prontuario, anexos e cirurgias;
- UUID valido, username persistido e atribuicao transacional de papel na criacao
  de usuario;
- sessoes persistentes com migration canonica e escritas aguardadas antes da
  atualizacao do cache local;
- MFA ativo sem bypass e fluxo de enrollment obrigatorio apos senha valida;
- state machines de billing e cirurgia, com rollback de memoria em falha de
  persistencia;
- anexos sem estado fantasma quando storage ou repositorio falham;
- confirmacao PIX vinculada ao intent conhecido, conta, cobranca, moeda e valor;
- webhook WhatsApp protegido por segredo obrigatorio;
- webhooks de saida assinados, sem redirects automaticos e com bloqueio de
  enderecos privados resolvidos;
- handlers de webhook aguardados pelo ciclo HTTP;
- limite de 1 MiB nos parsers JSON, timeouts HTTP e endpoints Chaos autenticados;
- rate limit de API key ativado e `X-Forwarded-For` aceito apenas de loopback;
- bootstrap da API e worker cobrindo todas as contas conhecidas no startup;
- refresh periodico das contas do worker, preservando o ultimo conjunto conhecido
  em falhas transitorias;
- outbox com `account_id`, FK, indice, RLS, claim concorrente e protecao contra
  conclusao silenciosa quando nenhum consumidor esta registrado;
- notificacoes do worker filtradas pela conta corrente e repositorio Drizzle
  executado na mesma transacao que configura o tenant PostgreSQL;
- webhooks de saida conectando no endereco DNS publico previamente validado, com
  bloqueio de redes nao publicas e limite para o corpo da resposta;
- transacao unica nos eventos preventivos, preservando atomicidade e o escopo do
  `SET LOCAL`;
- bootstrap impedido de ativar repositorios de internacao/progresso/cirurgia
  quando as tabelas ou colunas esperadas nao existem, mantendo fallback em
  memoria em vez de falhar no primeiro uso;
- correcoes de timezone local na tela de vacinas e vermifugos;
- scripts raiz abrangendo tambem os pacotes `@cvg-his/*` e espera ativa pelo
  PostgreSQL de teste.

## Evidencias executadas

- suite raiz: PASS nos 68 pacotes do workspace;
- API: 227/227 testes;
- cobertura: 1.318/1.318 testes, 89,08% statements e 80,26% branches;
- integracao critica: 173/173 testes, 59 migrations aplicadas;
- `pnpm build`: PASS em 68 pacotes;
- `pnpm lint`: PASS em 68 pacotes;
- `pnpm typecheck`: PASS em 68 pacotes;
- OpenAPI: PASS, 295 paths, 39 tags e 334 schemas;
- `pnpm deploy:check`: PASS;
- Docker Compose: configuracao valida;
- secretlint: PASS.

## Riscos residuais

1. **RLS de producao continua bloqueador.** Compose e Helm ainda conectam API e
   worker como `postgres`, que ignora RLS. A troca direta por uma role restrita
   foi rejeitada nesta rodada porque repositorios Drizzle ainda nao executam
   todas as queries com `SET LOCAL app.current_account_id`. O fechamento exige
   migrar todos os repositorios e executar bootstrap/login/E2E com a role real.
2. **MFA multi-instancia.** O challenge opaco de login/enrollment ainda vive no
   processo. Ele precisa ser persistido em armazenamento compartilhado para
   balanceamento horizontal sem afinidade de sessao.
3. **Consumidores do outbox no worker.** Eventos sem consumidores agora permanecem
   pendentes, em vez de serem marcados como concluidos. Os consumidores de
   pagamentos, billing e webhooks ainda precisam ser construidos com dependencias
   persistentes no processo worker antes de reativar seu processamento.
4. **WhatsApp de provedor.** O segredo estatico bloqueia chamadas anonimas, mas a
   integracao final deve validar assinatura sobre corpo bruto, timestamp/replay e
   vinculo do remetente com a consulta.
5. **Tabelas dependentes sem isolamento completo.** `mfa_credentials`,
   `encounter_timeline` e `webhook_deliveries` ainda dependem do pai e nao possuem
   `account_id`/policy propria. `owner_patient_links`, `inpatient_progress` e
   `surgery_cases` tambem precisam de migrations canonicas antes do uso DB; o
   bootstrap agora mantem fallback em memoria enquanto o contrato for incompativel.
6. **Coverage incompleta da superficie HTTP.** O gate global supera 80%, mas ainda
   exclui partes de rotas, bootstrap e repositorios. A suite API separada cobre
   227 casos, sem substituir E2E real com banco e restart.

Nenhum score historico deve ser elevado enquanto os itens acima nao tiverem prova
executavel no mesmo ambiente e com as mesmas credenciais usadas em producao.
