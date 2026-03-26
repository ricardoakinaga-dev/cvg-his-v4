# packages/modules

Aqui ficam os modulos de negocio do V2, cada um com ownership claro, contratos publicos e dependencias restritas.

## Modulos previstos

- `auth`: autenticacao e ciclo de sessao
- `access-control`: roles, capabilities e policies
- `users`: identidade autenticavel
- `staff`: atribuicoes operacionais da equipe
- `owners`: cadastro de tutores
- `patients`: cadastro de pacientes e vinculos
- `encounters`: ciclo de atendimento
- `medical-records`: prontuario e timeline clinica
- `attachments`: anexos e metadados
- `scheduling`: agenda basica
- `triage`: classificacao inicial
- `audit`: trilha de auditoria
- `notifications`: mensageria de negocio
- `billing`: consumo assistencial administrativo
- `inventory`: estoque e movimentos
- `inpatient`: internacao
- `surgery`: operacao cirurgica
- `diagnostics`: pedidos e resultados diagnosticos

## Regra geral

Um modulo nao acessa internals de outro modulo. Integracao acontece por surface publica e contratos versionados.
