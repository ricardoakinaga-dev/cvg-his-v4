# Phase 9 Progress

Data atualizacao: 2026-03-25

## Escopo Implementado

### Subfases Concluidas

| Subfase | Descricao                          | Status   |
| ------- | ---------------------------------- | -------- |
| 9.1     | Mapeamento funcional legado -> V2  | Completo |
| 9.2     | Mapeamento de dados por ondas      | Completo |
| 9.3     | Saneamento e criterios             | Completo |
| 9.4     | Estrategia de rollout              | Completo |
| 9.5     | Estrategia de rollback             | Completo |
| 9.6     | Criterios de desativacao do legado | Completo |
| 9.7     | Validacao e checkpoints            | Completo |

## Artefatos Criados

### Documentacao

- `docs/280-legacy-to-v2-map.md` - Matriz de equivalencia funcional
- `docs/281-data-migration-plan.md` - Plano de migracao de dados por ondas
- `docs/282-functional-migration-plan.md` - Rollout, rollback e desativacao

### Manifesto

- `docs/phase-9-migration-manifest.json` - Manifesto estruturado

### Utilitarios

- `tools/migration-consistency-report.mjs` - Relatorio de consistencia

## Matriz de Equivalencia Funcional

| Dominio Legado       | Modulo V2                          | Tipo de Migracao            |
| -------------------- | ---------------------------------- | --------------------------- |
| Identidade e acesso  | auth, access-control, users, staff | funcional + dados seletivos |
| Cadastro mestre      | owners, patients                   | funcional + dados seletivos |
| Atendimento          | scheduling, triage, encounters     | funcional + dados seletivos |
| Prontuario           | medical-records, attachments       | funcional + dados saneados  |
| Operacao avancada    | inpatient, surgery, diagnostics    | funcional + dados seletivos |
| Administrativo       | billing                            | funcional + dados restritos |
| Consumo assistencial | inventory                          | funcional + dados restritos |
| Notificacoes         | notifications                      | funcional                   |
| Auditoria            | audit                              | dados seletivos             |

## Ondas de Migracao

### Onda 1 - Identidade e Governanca

- usuarios ativos
- colaboradores ativos
- roles e vinculos

### Onda 2 - Cadastro Mestre

- owners
- patients
- owner-patient links

### Onda 3 - Operacao Assistencial Corrente

- appointments
- queue/encounters
- triagem

### Onda 4 - Continuidade Clinica

- medical records
- clinical entries
- attachments
- internacoes, cirurgias, diagnosticos

### Onda 5 - Administrativo Vinculado

- billing operacional
- inventory catalogado
- notificacoes/templates

## Estrategia de Rollout

| Etapa              | Descricao                     |
| ------------------ | ----------------------------- |
| 1. Readiness       | Modulo validado, treino feito |
| 2. Shadow mode     | Legado oficial, V2 em teste   |
| 3. Piloto          | Uma unidade opera no V2       |
| 4. Cutover parcial | Novos casos no V2             |
| 5. Expansao        | Ampliar por ondas             |

## Criterios de Desativacao do Legado

- modulo V2 estavel e reconciled
- sem backlog critico aberto
- usuarios-chave validaram
- rollback testado
- auditoria cobrindo dominio

## Validacao Executavel

| Validacao          | Resultado | Data       |
| ------------------ | --------- | ---------- |
| consistency-report | PASS      | 2026-03-25 |

### Relatorio de Consistência

```
Version: 1
Waves: 5
W1: Identidade (4 legacy -> 5 V2, entities: 4)
W2: Cadastro (2 -> 2, entities: 3)
W3: Atendimento (4 -> 5, entities: 5)
W4: Avancado (4 -> 3, entities: 3)
W5: Administrativo (4 -> 3, entities: 4)
```

## O Que NAO Migra

- dados obsoletos sem uso operacional
- registros sem autoria ou timestamp
- agregadores legados (patientContext)
- modulos administrativos amplos (cash, payments, fiscal)
- naming e estrutura do legado

## Proximo Passo

A Fase 9 documenta a estrategia. A execucao depende de:

- ambiente de staging preparado
- extratores legados implementados
- homologacao operacional
