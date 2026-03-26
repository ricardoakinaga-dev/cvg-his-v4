# Attachment Model

## Objetivo

Modelar anexos como artefatos rastreaveis, nao como simples arquivos soltos.

## Metadados minimos

- `attachment_id`
- `account_id`
- `linked_entity_type`
- `linked_entity_id`
- `storage_key`
- `mime_type`
- `checksum`
- `uploaded_by`
- `created_at`
- `source`

## Regras

- anexo pode estar ligado a encounter, prontuario, diagnostico ou cirurgia por contrato
- integridade deve ser verificavel por checksum
- acesso a conteudo deve respeitar policy contextual
- remoção logica deve preservar trilha historica quando o artefato for clinicamente relevante
