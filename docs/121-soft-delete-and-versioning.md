# Soft Delete And Versioning

## Soft delete

Permitido quando:

- exclusao fisica quebraria rastreabilidade
- o item precisa sair da operacao sem sumir do historico
- existe justificativa e autoria da desativacao

Campos recomendados:

- `deleted_at`
- `deleted_by`
- `delete_reason`

## Versionamento

Obrigatorio para:

- evolucoes clinicas
- prescricoes
- condutas
- documentos textuais sensiveis

## Padrao recomendado

- registro base estavel
- revisoes versionadas
- apontador de versao vigente
- autoria e timestamp por revisao
