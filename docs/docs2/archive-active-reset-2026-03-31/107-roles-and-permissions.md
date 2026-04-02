# Roles And Permissions

## Perfis base previstos

- `admin`: governanca sistêmica e configuracoes globais
- `reception`: admissao, cadastro mestre e abertura operacional de atendimento
- `veterinarian`: atendimento clinico, evolucao, conduta e prescricao
- `nurse`: apoio assistencial, triagem, administracoes e registros permitidos
- `diagnostics`: operacao diagnostica e resultados
- `surgery`: preparo, execucao e registros do fluxo cirurgico
- `finance`: faturamento, conciliacao e leitura do necessario para cobranca
- `inventory`: catalogo, estoque e consumo
- `auditor`: consulta e analise de trilhas auditaveis

## Permissoes por dominio

### Cadastro mestre

- `reception` e `admin` podem criar e atualizar cadastro mestre
- conciliacao e merge exigem permissao elevada e trilha de auditoria

### Atendimento e prontuario

- `veterinarian` pode registrar evolucao, conduta e prescricao
- `nurse` pode registrar triagem e entries permitidas por policy
- fechamento clinico exige capability contextual

### Administrativo

- `finance` pode consultar itens faturaveis e operar cobranca
- `inventory` pode registrar movimentacao e consumo
- nenhum desses perfis pode editar conteudo clinico material

## Regras de permissao

- role nao e suficiente sem contexto
- atribuicao operacional pode restringir ou ampliar capability
- policies sao avaliadas no backend
- frontend consome capacidades derivadas apenas para UX e orientacao
