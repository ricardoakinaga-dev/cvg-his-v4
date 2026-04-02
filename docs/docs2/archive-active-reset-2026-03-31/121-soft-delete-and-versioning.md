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

Estado atual no V2:

- `clinical_entries` usa `deleted_at`, `deleted_by_user_id` e `delete_reason`
- entry arquivada sai da listagem ativa, mas permanece reidratavel no historico
- timeline registra `entry_archived`

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

Estado atual no V2:

- `updateEntry` incrementa versao e grava revisao anterior em `entry_revisions`
- `archiveEntry` tambem registra a ultima revisao clinica antes do arquivamento
- atualizacao agora aceita `expectedVersion` para bloquear stale update de forma otimista
