# Authorization Strategy

## Modelo

A autorizacao do V2 combinara:

- role base
- atribuicao operacional
- contexto institucional
- contexto clinico ou administrativo
- policy especifica do caso de uso

## Fonte de verdade

- enforcement no backend
- frontend apenas consome capabilities derivadas
- worker respeita as mesmas politicas quando executar efeitos materiais

## Regras de desenho

- nenhuma rota mutavel sem avaliacao de policy
- nenhuma permissao hardcoded em tela como unica defesa
- policies devem ser reutilizaveis e versionaveis

## Exemplos de policy

- recepcao pode abrir encounter, mas nao finalizar prontuario
- equipe clinica autorizada pode assinar evolucao
- faturamento pode ler itens faturaveis, sem editar conduta
