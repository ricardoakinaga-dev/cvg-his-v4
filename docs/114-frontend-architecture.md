# Frontend Architecture

## Papel do `apps/web`

- navegacao e composicao de experiencia
- formulacao de comandos para API
- leitura de queries consolidadas
- consumo de `auth-sdk`, `contracts`, `types` e `ui`

## Responsabilidades

- traduzir capabilities em affordances de UX
- orientar o usuario sobre estados e riscos
- apresentar timeline clinica, cadastros e fluxos operacionais

## Nao responsabilidades

- decidir permissao soberana
- implementar regra clinica material de forma exclusiva
- substituir validacao de dominio

## Diretrizes

- fluxo guiado por contracts publicos
- evitar estado cliente que replique regra de negocio
- componentes de UI compartilhados ficam em `packages/shared/ui`, sem absorver dominio clinico
