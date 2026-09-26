# Política de retenção de artefatos

Esta política governa o armazenamento local de cobertura, resultados de testes,
evidências de auditoria e pacotes de release. Ela é a fonte de classificação
consumida por `scripts/artifact-retention-dry-run.mjs`.

## Classes

| Classe            |        TTL |                     Quota | Regra de exclusão                                            |
| ----------------- | ---------: | ------------------------: | ------------------------------------------------------------ |
| `legal-hold`      | indefinido |      sem quota automática | nunca candidata a limpeza                                    |
| `active-evidence` | indefinido | 64 GiB, alerta consultivo | preservada até decisão explícita do owner                    |
| `generated-run`   |    14 dias |                     8 GiB | somente arquivos expirados ou necessários para aliviar quota |
| `coverage-run`    |    30 dias |                    12 GiB | somente arquivos expirados ou necessários para aliviar quota |
| `unknown`         | indefinido |      sem quota automática | falha fechada; classificar antes de qualquer ação            |

TTL e quota produzem apenas candidatos. O comando é deliberadamente
`--dry-run`-only: ele não implementa `rm`, `unlink`, `rmdir` ou equivalente.
Um arquivo com checksum, manifest, metadata ou evidência, um caminho marcado
`.active-evidence`/`.legal-hold` e qualquer caminho de classe protegida nunca é
retornado como candidato.

## ACL

O padrão local é owner-only (`0700` para diretórios e `0600` para arquivos),
com compartilhamento externo negado por padrão. Upload de workflow só é aceito
quando o job declara explicitamente o artefato e a retenção. A política não
altera permissões ou publica arquivos durante o dry-run; ela registra a ACL
esperada para a decisão operacional posterior.

## Procedimento seguro

```bash
pnpm artifacts:retention:dry-run
```

O relatório deve ser revisado pelo owner antes de qualquer remoção fora deste
comando. Evidência ativa, legal, desconhecida ou ainda necessária para rollback
permanece preservada. A execução local não prova retenção do provedor externo
nem substitui autorização de limpeza no destino.
