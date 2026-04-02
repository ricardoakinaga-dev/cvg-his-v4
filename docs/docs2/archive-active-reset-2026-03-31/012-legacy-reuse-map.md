# Legacy Reuse Map

## Objetivo

Separar o que pode alimentar o V2 do que deve permanecer apenas como referencia historica ou operacional.

## Reaproveitar como regra de negocio descoberta

### Auth e RBAC

- valor: ajudam a definir atores, claims, papeis e permissoes existentes
- uso no V2: referencia para modelagem de `auth`, `users`, `staff` e `access-control`
- restricao: nao copiar a estrutura antiga sem redesenho de contracts e policy layer

### Owners e Patients

- valor: base de cadastro mestre ja validada operacionalmente
- uso no V2: referencia funcional para tutores, pacientes e vinculos
- restricao: revisar naming, ownership de dados e invariantes

### Encounters

- valor: eixo clinico mais consistente do legado
- uso no V2: referencia para ciclo do episodio clinico
- restricao: separar claramente o que e encounter, prontuario e consumo assistencial

### Clinical notes e documents

- valor: indicam necessidades reais de autoria, anexos e historico clinico
- uso no V2: referencia para `medical-records` e `attachments`
- restricao: reestruturar sob modelo unico de prontuario versionado

### Audit events

- valor: demonstram necessidade de trilha de auditoria transversal
- uso no V2: base conceitual para `audit`
- restricao: tornar o modelo explicitamente append-only e mais padronizado

## Reaproveitar como padrao tecnico

- tenant scoping
- request context
- padrao de service/repo/routes
- worker para jobs e tarefas assíncronas

Esses itens servem como referencia de padroes uteis, mas nao devem ser trazidos como copia estrutural.

## Manter apenas como referencia funcional

- `patientContext`
- `search`
- `reports`
- `integration`
- historico de `docs/docs2`

Justificativa: sao uteis para entender comportamento esperado e pontos de integracao, mas nao devem definir o desenho do V2.

## Refazer do zero no V2

- fronteiras entre prontuario, faturamento e estoque
- contratos publicos entre modulos
- arquitetura de shared packages
- policy layer de autorizacao
- fundacao de versionamento clinico
- ownership de dados por bounded context

## Regra final de reaproveitamento

No V2, o legado so entra por uma destas vias:

1. como regra descoberta a ser reinterpretada
2. como padrao tecnico a ser reimplementado
3. como referencia funcional para validacao de migracao

Qualquer outra forma de "herdar" o legado deve ser considerada rejeitada por padrao.
