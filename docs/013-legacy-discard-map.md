# Legacy Discard Map

## Objetivo

Registrar o que nao deve contaminar a nova base do CVG-HIS V2.

## Padroes que nao devem ser repetidos

### Promover a estrutura atual de apps e packages a baseline do V2

- motivo: a arvore atual reflete evolucao historica, nao fronteiras arquiteturais finais

### Misturar dominio clinico com dominio administrativo por proximidade operacional

- motivo: isso compromete ownership, auditoria e evolucao modular

### Tratar schema legado como modelo conceitual definitivo

- motivo: schema antigo ajuda a descobrir regras, mas nao substitui redesenho de dominio

### Espalhar autorizacao por tela, rota ou detalhe local

- motivo: o V2 precisa de policy layer centralizada e rastreavel

### Aceitar naming legado sem limpeza conceitual

- motivo: parte da nomenclatura atual reflete historia do codigo, nao linguagem ubiqua alvo

### Criar shared packages grandes e sem criterio

- motivo: isso recria o monolito acoplado em outro lugar

## Artefatos que nao devem migrar diretamente

- organizacao atual de `apps/his-api`, `apps/his-web`, `apps/his-worker`
- agregacoes opacas como `patientContext` como modelo estrutural do prontuario
- qualquer cruzamento direto entre `encounterBilling`, `encounterFinancial`, `payments`, `cash`, `products`, `services` e `stock` sem novo mapa de contexto
- documentacao antiga que assuma continuidade incremental como diretriz do V2

## Sinais de alerta para rejeicao

Uma heranca do legado deve ser rejeitada quando:

- mistura mais de um bounded context
- nao deixa claro quem e dono do dado ou da regra
- depende de entendimento historico dificil de recuperar
- empurra regra clinica para UI
- mascara uma divida antiga como se fosse aceleracao

## Restricoes arquiteturais decorrentes

1. O V2 nao pode nascer como renomeacao cosmetica do legado.
2. O V2 nao pode centralizar prontuario, faturamento e estoque no mesmo modulo.
3. O V2 nao pode depender de permissao hardcoded em tela.
4. O V2 nao pode copiar schema ou services antigos sem revalidacao de ownership e invariantes.

## Conclusao

O descarte nao significa jogar fora o conhecimento do legado. Significa impedir que a forma atual do legado determine a forma futura do V2.
