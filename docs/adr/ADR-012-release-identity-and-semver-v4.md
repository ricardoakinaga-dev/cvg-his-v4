# ADR-012 — Identidade de release e política SemVer do CVG-HIS V4

- **Status:** aceito
- **Data:** 2026-09-02
- **Decisores:** Produto, Plataforma e Arquitetura CVG-HIS
- **Relacionados:** [contrato de identidade de release](../engineering/RELEASE_IDENTITY.md)

## Contexto

O produto e o repositório são CVG-HIS V4, mas pacotes privados, imagens, o chart
Helm e arquivos operacionais ainda carregam `v2`. O workspace também usa `0.1.0`,
enquanto o contrato HTTP OpenAPI está em `1.0.0`. Alterar todos esses nomes de
uma vez quebraria consumidores e não acrescentaria segurança ao release.

## Decisão

1. A identidade externa canônica do produto e do repositório é **CVG-HIS V4** e
   `cvg-his-v4`.
2. `@cvg-his-v2/*`, `cvg-his-v2-*`, `infra/helm/cvg-his-v2` e
   `docker-compose.v2.yml` são identificadores de compatibilidade congelados.
   Novos consumidores não devem inferir a geração do produto a partir deles.
3. O produto usa SemVer com tags Git `vMAJOR.MINOR.PATCH`. O primeiro candidato
   da linha V4 será `v4.0.0-rc.1`; promoção estável cria `v4.0.0` a partir do
   mesmo commit aprovado. Mudança incompatível do produto incrementa `MAJOR`,
   funcionalidade compatível incrementa `MINOR` e correção incrementa `PATCH`.
4. Imagens de API, worker e SPA são identificadas primariamente pelo SHA Git e
   promovidas pelo digest imutável. Uma tag SemVer é apenas um alias para o
   mesmo digest e nunca é usada como prova única de identidade.
5. A versão do contrato HTTP é independente da geração do produto. O OpenAPI
   permanece `1.0.0` enquanto não houver quebra de contrato; sua evolução segue
   SemVer próprio. Rotas não recebem `/v4` apenas por causa do nome do produto.
6. Pacotes privados continuam em `0.1.0` até existir publicação independente.
   Ao publicar um pacote, sua versão passa a refletir o contrato daquele pacote,
   sem sincronização artificial com a versão do produto.
7. O chart permanece `cvg-his-v2`/`0.1.0` durante a janela de compatibilidade.
   No primeiro empacotamento de release, `version` deve receber a versão SemVer
   do chart e `appVersion` a versão do produto; os valores de imagem continuam
   presos a digest/SHA.

## Migração dos identificadores legados

| Fase | Ação | Critério de saída |
|---|---|---|
| 0 — congelar | registrar os nomes atuais e impedir novas superfícies `v2` | validadores de namespace, deploy e este ADR verdes |
| 1 — publicar | publicar artefatos V4 por SHA/digest mantendo aliases legados | instalação e upgrade comprovados com os dois nomes apontando ao mesmo digest |
| 2 — depreciar | inventariar consumidores e anunciar prazo por superfície | nenhum consumidor desconhecido; rollback documentado |
| 3 — remover | retirar alias somente em mudança major aprovada | telemetria sem uso, aceite dos consumidores e reauditoria independente |

Não existe autorização para uma renomeação global ou remoção de alias fora
dessas fases.

## Consequências

- Release, API, pacotes e chart deixam de compartilhar um número sem significado.
- O histórico operacional continua utilizável durante a migração.
- Há custo temporário de aliases, inventário de consumidores e documentação.
- Qualquer release deve registrar tag, SHA, digest, SBOM e pipeline que o produziu.
