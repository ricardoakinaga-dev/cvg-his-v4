# Rotacao de segredos e break-glass

**Owner:** Security e Platform  
**Revisao:** trimestral e apos cada incidente  
**Escopo:** staging e producao  
**Backlog:** SEC-002

Este runbook transforma a politica historica de rotacao e a decisao de Vault em
um procedimento executavel. A automacao do repositorio prova os contratos
tecnicos e indexa referencias, mas nao substitui o exercicio no ambiente-alvo,
os logs de auditoria do Vault nem a aprovacao humana.

## 1. Regras de seguranca

- Nunca registrar valores de segredos em commits, logs, tickets, inputs de
  workflow, screenshots ou artefatos.
- Usar apenas nomes de classes, identificadores de versao e referencias a um
  cofre de evidencias com acesso restrito.
- Exigir separacao entre solicitante, executor e aprovador. O aprovador nao pode
  ser a unica pessoa que executou a mudanca.
- Executar primeiro em staging. Producao exige janela, comunicacao, rollback e
  environment protection para `security-operations` no GitHub.
- Interromper o procedimento se `/ready`, login, worker ou trilha de auditoria
  nao puderem ser comprovados.

## 2. Pre-condicoes

1. Fixar o SHA candidato completo e confirmar que ele pertence a `main`.
2. Abrir registro operacional com ambiente, escopo, owner, aprovadores, janela,
   impacto e criterio de rollback.
3. Confirmar Vault com AppRole, KV-v2 e audit device habilitado e saudavel.
4. Confirmar backup/restore e contatos de incidente antes de credenciais de
   banco, Redis, MFA ou provedores.
5. Rodar `pnpm security:evidence`; falha de secret scan ou advisory alto/critico
   encerra a janela.

## 3. Rotacao de `AUTH_SECRET`

1. Gerar o novo valor diretamente no Vault e atribuir um identificador de
   versao nao sensivel.
2. Manter o valor anterior em `AUTH_SECRET_PREVIOUS` apenas durante a janela de
   compatibilidade; publicar `AUTH_SECRET_VERSION` com a nova versao.
3. Reiniciar a API de forma controlada e comprovar `/health`, `/ready`, login,
   refresh e MFA. Tokens novos devem ser assinados somente pelo segredo atual;
   o verificador pode aceitar o anterior durante a drenagem.
4. Expirar/revogar sessoes conforme a decisao de seguranca, remover
   `AUTH_SECRET_PREVIOUS`, reiniciar novamente e comprovar que tokens antigos
   falham enquanto um novo login continua funcional.
5. Vincular os eventos de leitura/escrita do Vault, o rollout e os testes ao
   registro operacional. Nunca copiar o payload dos eventos para o artefato.

## 4. Banco, Redis, MFA e provedores

- **Banco/Redis:** criar credencial paralela de menor privilegio, atualizar
  Vault, validar API e worker, revogar a antiga e testar explicitamente que ela
  nao autentica mais.
- **MFA:** publicar `MFA_SECRET_ENCRYPTION_KEY_VERSION` e usar o keyring durante
  a recriptografia. Nao remover a chave anterior ate que a contagem de registros
  legados seja zero ou exista decisao formal de re-enrollment.
- **Provedores:** criar a nova chave no sandbox/conta-alvo, validar sucesso,
  rejeicao, timeout e idempotencia, depois revogar a chave anterior.
- **AppRole:** usar SecretID de vida curta, renovar o RoleID conforme politica e
  confirmar que credenciais antigas nao obtêm novo token do Vault.

## 5. Validacao minima da rotacao

```bash
pnpm security:evidence
pnpm exec tsx --test apps/api/src/startup-secrets.test.ts
pnpm --filter @cvg-his-v2/secrets test
pnpm exec vitest run tests/unit/api/startup-secrets-runtime.test.ts --config vitest.config.ts --no-file-parallelism
```

No ambiente-alvo, registrar tambem os resultados de `/health`, `/ready`, login,
refresh, MFA, worker e cada integracao afetada. O pacote deve conter timestamps,
SHA, ambiente, versoes anterior/atual, executor, aprovadores, rollback e
referencias restritas dos logs do Vault.

## 6. Break-glass

1. Declarar incidente e registrar motivo, sistema, duracao maxima e aprovador.
2. Usar uma identidade individual com MFA forte; contas compartilhadas e
   credenciais permanentes sao proibidas.
3. Conceder apenas o papel minimo, com expiracao automatica. Acesso a banco deve
   preservar RLS e jamais receber superuser ou `BYPASSRLS` por conveniencia.
4. Iniciar captura de auditoria antes do primeiro acesso e executar somente as
   acoes declaradas no incidente.
5. Revogar o acesso ao terminar, rotacionar toda credencial exposta ao operador
   e comprovar que a identidade emergencial nao autentica mais.
6. Realizar revisao por Security e Operations em ate um dia util, vinculando
   timeline, comandos, decisao e acoes corretivas sem incluir dados clinicos,
   pessoais ou valores de segredos.

O drill trimestral usa um incidente simulado e deve comprovar concessao,
visibilidade no audit log, expiracao/revogacao e tentativa negativa posterior.

## 7. Certificacao e evidencias

Disparar `Security Operations Certification` para o SHA exato depois que os
dois exercicios externos estiverem armazenados em local imutavel e restrito. O
workflow requer referencias separadas para rotacao, break-glass e audit log,
executores, aprovadores, riscos residuais e decisao go/no-go. Localmente, o mesmo
indice pode ser validado com:

```bash
pnpm security:operations:index
```

O artefato gerado e um indice, nao a evidencia sensivel. SEC-002 so pode ser
marcado concluido quando o workflow protegido passar e Security/Operations
aceitarem tanto o exercicio de rotacao quanto o de break-glass no ambiente-alvo.
