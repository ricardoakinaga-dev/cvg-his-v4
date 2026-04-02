# Functional Migration Plan

## Objetivo

Definir como o legado perde responsabilidade funcional e o V2 ganha ownership operacional por ondas controladas.

## Estrategia de rollout

### Etapa 1 - Readiness

- modulo V2 concluido, validado e documentado
- permissao, auditoria e observabilidade ativas
- operacao treinada no fluxo alvo
- criterios de entrada/saida da onda aprovados

### Etapa 2 - Shadow mode

- legado continua como sistema oficial
- V2 recebe dados de teste controlados ou espelho parcial
- divergencias sao registradas sem impacto no usuario final

### Etapa 3 - Piloto controlado

- uma unidade, equipe ou recorte de casos opera no V2
- backlog de correcoes e reconciliacao acompanha a onda
- legado fica como referencia de consulta e contingencia

### Etapa 4 - Cutover parcial

- novos casos entram no V2 para o dominio selecionado
- legado fica bloqueado para novas escritas nesse dominio
- consultas historicas podem permanecer no legado temporariamente

### Etapa 5 - Expansao

- ampliar tenant/unidade/perfil de forma incremental
- monitorar indicadores de erro, tempo, divergencia e retrabalho

## Rollback

Rollback e por onda, nunca por reconstruir o V2 como legado.

### Disparadores de rollback

- falha de reconciliacao acima do limite pactuado
- violacao de permissao ou exposicao indevida de dado sensivel
- perda de rastreabilidade clinica ou administrativa
- impacto operacional relevante sem contencao aceitavel

### Estrategia de rollback

1. congelar novas escritas no V2 para o dominio afetado
2. manter leitura para diagnostico, quando seguro
3. redirecionar operacao ao legado no recorte da onda
4. preservar log de tentativas, ids de origem/destino e divergencias
5. corrigir dados/codigo antes de nova tentativa

## Criterios de desativacao do legado

Um dominio legado so pode ser desativado quando:

- o modulo correspondente do V2 estiver funcionalmente estavel
- a migracao de dados da onda estiver reconciliada
- nao houver backlog critico aberto
- usuarios-chave tiverem validado o fluxo em operacao real
- rollback tiver sido testado e superado
- auditoria e observabilidade cobrirem o dominio no V2

## Saneamento funcional

- remover atalhos legado-especificos do processo alvo
- abolir autorizacao frontend-first
- impedir dependencias diretas do V2 sobre rotas internas do legado
- manter coexistencia apenas via plano de transicao explicitado
