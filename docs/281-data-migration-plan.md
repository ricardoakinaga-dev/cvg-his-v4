# Data Migration Plan

## Premissa

Migracao de dados e feita por ondas, depois da validacao funcional do modulo destino e sempre com reconciliacao.

## Ondas de migracao recomendadas

### Onda 1 - Identidade e governanca

- usuarios ativos
- colaboradores ativos
- roles e vinculos aplicaveis
- eventos de auditoria estruturados e recentes

### Onda 2 - Cadastro mestre

- owners
- patients
- owner-patient links
- contatos principais e marcadores administrativos relevantes

### Onda 3 - Operacao assistencial corrente

- appointments necessarios para agenda vigente
- queue/encounters abertos ou recentes
- triagem corrente

### Onda 4 - Continuidade clinica

- medical records por encounter
- clinical entries com autoria e timestamp validos
- attachments com referencia fisica verificavel
- internacoes, cirurgias e diagnosticos ainda materiais

### Onda 5 - Administrativo vinculado

- billing operacional nao liquidado
- inventory catalogado para assistencia corrente
- notificacoes/templates somente se aderentes ao alvo

## Mapeamento de entidades

| Origem legada | Destino V2 | Regra |
| --- | --- | --- |
| usuarios/roles legados | `users`, `staff`, `access-control` | migrar somente atores ativos e roles reconhecidas pelo V2 |
| tutores | `owners` | deduplicar por documento + contato + nome normalizado |
| pacientes | `patients` | reconciliar especie, sexo, status e owner principal |
| episodios | `encounters` | manter apenas episodios com relevancia operacional, clinica ou financeira |
| notas clinicas/documentos | `medical-records`, `attachments` | rejeitar entradas sem autoria minima ou episodio confiavel |
| internacoes/exames | `inpatient`, `diagnostics`, `surgery` | migrar apenas registros com vinculo de paciente e encounter reconstituivel |
| billing do encounter | `billing` | carregar resumo e itens cobrados, nao contas completas do legado |
| estoque/consumo | `inventory` | migrar catalogo util e saldos saneados, sem ERP legado |

## Criterios de saneamento obrigatorio

- tenant/account obrigatorio
- identificador de origem preservado em staging ou relatorio
- normalizacao de texto e trimming
- deduplicacao por chaves funcionais
- datas invalidas ou faltantes impedem migracao direta
- relacionamentos quebrados entram em fila de resolucao manual
- campos sensiveis sem base de confianca ficam fora da onda automatica

## Estrategia tecnica recomendada

1. extrair do legado para staging controlado
2. gerar relatorio de qualidade por entidade
3. aplicar saneamento deterministico
4. reconciliar amostra com area usuaria
5. importar para o modulo V2 alvo
6. registrar checksum, contagem e divergencias

## Criterios de bloqueio

- taxa de duplicidade acima do limite definido por entidade
- registros sem account/tenant
- orphan records acima do limite aceitavel
- impossibilidade de reconciliar encounter com patient/owner
- divergencia material entre contagem extraida e contagem importada
