# 0156 - Plano de Execucao por Sprint para o SPA Oficial

**Data:** 2026-04-11

## Objetivo

Traduzir o plano de migracao por dominio em uma ordem executavel por sprint, com foco em consolidar o `apps/spa` como frontend oficial e manter `apps/web` em convivencia ate o corte seguro.

## Diretriz geral

- o `apps/spa` entra como trilha principal de evolucao
- cada sprint entrega algo navegavel e validavel
- cada sprint deixa o produto melhor organizado do ponto de vista de menu, shell e dominio
- o `apps/web` continua atendendo os fluxos ainda nao migrados
- o `apps/web` nao deve ser apagado enquanto qualquer dominio critico ainda depender dele

## Estrutura das sprints

### Sprint 0 - Fundacao do shell oficial

Objetivo:

- fechar o alicerce de navegacao e contexto
- preparar o `apps/spa` para assumir o papel de portal principal

Entregas:

- sidebar por dominio e subdominio
- topbar com breadcrumbs, contexto e estado do usuario
- busca global de rotas
- favoritos e recentes
- indicador de modulo novo, legado ou indisponivel
- padrao visual de pagina
- redirecionamento/fallback para `apps/web`

Aceite:

- o usuario reconhece o SPA como ponto de entrada
- a navegao nao depende mais de lista plana de links

### Sprint 1 - Dashboard e master data

Objetivo:

- migrar as telas de maior acesso e criar o hub de decisao do produto

Entregas:

- dashboard premium
- tutores
- pacientes
- detalhe e formulario de tutores
- detalhe e formulario de pacientes
- atalhos contextualizados por perfil

Aceite:

- as jornadas mais frequentes deixam de depender do `apps/web`

### Sprint 2 - Agenda, atendimento e prontuario

Objetivo:

- migrar o coracao operacional assistencial

Entregas:

- agenda
- atendimentos
- prontuario
- componentes de timeline, resumo e acoes rapidas
- padrao de detalhe com historico e proximos passos

Aceite:

- recepcao e consulta conseguem operar no `apps/spa` sem voltar ao legado

### Sprint 3 - Triagem, internação e diagnósticos

Objetivo:

- cobrir o ciclo clinico avancado

Entregas:

- triagem
- internação
- mapa de leitos
- diagnósticos
- cirurgia
- prescricoes
- execucoes de prescricao
- altas

Aceite:

- o fluxo hospitalar principal roda no SPA com paridade funcional

### Sprint 4 - Financeiro e backoffice comercial

Objetivo:

- migrar a camada financeira e comercial com hierarquia premium

Entregas:

- faturamento
- caixa
- PIX
- vendas de balcão
- orçamentos
- produtos
- serviços
- inventory
- notificações operacionais

Aceite:

- o fechamento financeiro e o consumo comercial deixam de depender do `apps/web`

### Sprint 5 - Governança, plataforma e fechamento do legado

Objetivo:

- migrar governança e consolidar o corte por dominio

Entregas:

- usuarios
- staff
- access-control
- audit
- master-search
- sectors
- reports
- api-keys
- webhooks
- mapa de desligamento do `apps/web`
- decisao executiva de apagamento final, se os criterios forem satisfeitos

Aceite:

- o `apps/web` permanece apenas para rotas residuais ou convivio temporario
- o apagamento total ainda depende do plano formal de desativacao

## Ritmo recomendado

### Em cada sprint

1. definir dominio alvo
2. fechar contrato visual e funcional
3. implementar shell/pagina
4. validar acessibilidade e mobile
5. validar fluxo principal com teste
6. apontar rotas ainda residuais no `apps/web`

## Dependencias criticas

- auth e sessao precisam estar prontos antes do corte de telas protegidas
- dashboard e master data precisam migrar antes de reduzir o uso do `apps/web`
- o shell do SPA precisa estar pronto antes de mover rotas criticas
- governanca so entra no final se a operacao assistencial ja estiver estabilizada

## Referencias

- [0153 - Blueprint SPA Frontend Oficial](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0153-BLUEPRINT-SPA-FRONTEND-OFICIAL.md)
- [0155 - Plano de Migracao por Dominio](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0155-PLANO-MIGRACAO-WEB-PARA-SPA-POR-DOMINIO.md)
