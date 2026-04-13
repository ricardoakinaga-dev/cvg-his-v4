# 0159 - Plano de Desativacao e Apagamento do apps/web

**Data:** 2026-04-11

## Objetivo

Definir de forma inequivoca o momento em que o `apps/web` pode ser desligado, desativado e finalmente removido do produto, sem gerar confusao operacional.

## Regra central

O `apps/web` **nao deve ser apagado por data**.

Ele so pode ser apagado quando todos os criterios abaixo estiverem cumpridos:

1. todos os dominios prioritarios tiverem equivalencia funcional no `apps/spa`
2. todas as rotas da matriz `web -> spa` estiverem migradas, aliasadas ou formalmente aposentadas
3. nenhum fluxo critico ainda depender de `apps/web`
4. a janela de convivio tiver sido encerrada por operacao e produto
5. a migracao tiver sido validada em ambiente real com usuarios-chave
6. o rollback do corte tiver sido testado e considerado desnecessario

## Fases de desativacao

### Fase 1 - Convivio com fallback

Estado:

- o `apps/spa` e a entrada principal
- o `apps/web` continua recebendo rotas residuais
- redirecionamentos ainda podem existir

Nao pode apagar ainda.

### Fase 2 - Congelamento do legado

Estado:

- nao entram novas features no `apps/web`
- apenas correcoes criticas e suporte residual
- o `apps/spa` cobre os dominios centrais

Nao pode apagar ainda.

### Fase 3 - Corte final por dominio

Estado:

- todas as rotas foram migradas ou aliasadas
- o fluxo do usuario nao depende mais do `apps/web`
- o SPA passou por validacao operacional completa

Apenas aqui o apagamento pode ser considerado.

### Fase 4 - Apagamento

Somente apos a aprovacao formal:

- remover redirecionamentos
- arquivar documentacao do legado
- remover referencias no deploy e no onboarding
- desativar a trilha antiga de acesso
- apagar o frontend legado do caminho ativo do produto

## Critérios obrigatórios antes do apagamento

- matriz de rotas 100% encerrada
- checklist de aceite por dominio concluido
- observabilidade do SPA estavel
- sem incidentes de regressao em janela acordada
- sem acessos diretos de usuarios ou automacoes ao `apps/web`
- plano de rollback formalmente aposentado

## O que pode permanecer depois do apagamento

- documentacao historica
- auditorias e relatorios de migracao
- referencias de rastreabilidade

## O que nao pode permanecer

- rota ativa
- link no menu principal
- dependencia operacional oculta
- uso silencioso por scripts ou usuarios

## Decisao executiva

Quando esses criterios forem satisfeitos, o `apps/web` deixa de existir como trilha operante e passa a ser apenas historia/documentacao.

## Referencias

- [0155 - Plano de Migracao por Dominio](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0155-PLANO-MIGRACAO-WEB-PARA-SPA-POR-DOMINIO.md)
- [0158 - Matriz de Rotas Web -> SPA](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0158-MATRIZ-ROTAS-WEB-TO-SPA.md)
- [0160 - Roteiro de Desligamento Operacional do apps/web](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0160-ROTEIRO-DESLIGAMENTO-OPERACIONAL-WEB.md)
