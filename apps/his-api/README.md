# ARQUIVADO - `apps/his-api`

## Status: ARQUIVADO

Este aplicativo foi **arquivado** em 2026-03-25.

### Motivo

A trilhar canonica do V2 e `apps/api`. Este legado foi mantido apenas como referencia historica.

### Destino

Todas as funcionalidades em desenvolvimento devem usar:

- **API V2**: `apps/api`
- **Pacotes**: `packages/modules/*`
- **Contracts**: `packages/shared/*`

### O que fazer

1. Nao faça alteracoes neste directorio para desenvolvimento ativo
2. Funcionalidades devem ser migradas para `apps/api`
3. Se funcionalidade critica existe apenas aqui, migrar antes de usar

### Documentacao

Ver `docs/adr/ADR-003-arquitetura-canonica-v2.md`
