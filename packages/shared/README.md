# packages/shared

Pacotes compartilhados do V2. Eles existem para reduzir duplicacao tecnica, nao para concentrar regra de negocio sem ownership.

## Shared previstos

- `types`: tipos basicos e ids canonicos
- `contracts`: envelopes, eventos e interfaces publicas
- `config`: carregamento e validacao de configuracao
- `database`: abstractions e base de persistencia
- `validation`: schemas e helpers de validacao
- `logging`: logger estruturado e correlacao
- `errors`: hierarquia de erros e serializacao
- `utils`: utilitarios pequenos e neutros
- `ui`: primitives e design tokens reutilizaveis
- `auth-sdk`: cliente de autenticacao para apps

## Regra geral

Se um artefato conhece regra de negocio de um modulo especifico, ele nao deve morar em `shared`.
