# Legacy To V2 Map

## Objetivo

Formalizar a equivalencia entre capacidades do legado e bounded contexts do V2, deixando explicito:

- o que migra
- para onde migra
- em que condicoes migra
- o que nao migra

## Regras de leitura

- o V2 e o alvo arquitetural
- o legado e fonte de referencia funcional e de dados
- equivalencia funcional nao implica equivalencia estrutural
- nenhum artefato legado entra no V2 por copia cega

## Matriz de equivalencia funcional

| Dominio legado | Referencias legadas | Modulo alvo no V2 | Tipo de migracao | Observacoes |
| --- | --- | --- | --- | --- |
| Identidade e acesso | `auth`, `rbac`, `packages/rbac` | `auth`, `access-control`, `users`, `staff` | funcional + dados seletivos | migrar apenas usuarios, roles e vinculos ativos; descartar acoplamentos de tela |
| Cadastro mestre | `owners`, `patients` | `owners`, `patients` | funcional + dados seletivos | contatos e vinculos tutor-paciente exigem saneamento de duplicidade |
| Atendimento | `appointments`, `agendaConfig`, `encounters` | `scheduling`, `triage`, `encounters` | funcional + dados seletivos | migrar apenas episodios ainda relevantes para continuidade operacional |
| Prontuario | `clinicalNotes`, `documents`, parte de `patientContext` | `medical-records`, `attachments` | funcional + dados saneados | `patientContext` nao migra como agregado; apenas fatos clinicos identificaveis |
| Operacao assistencial avancada | `inpatient`, `beds`, `wards`, `handovers`, `exams` | `inpatient`, `surgery`, `diagnostics` | funcional + dados seletivos | migrar estados assistenciais ativos e historico recente de suporte clinico |
| Administrativo | `encounterBilling`, `encounterFinancial`, `products`, `services` | `billing` | funcional + dados restritos | sem copiar contas, caixa ou fiscal legado para o V2 nesta onda |
| Consumo assistencial | `stock`, parte de `products` | `inventory` | funcional + dados restritos | migrar apenas catalogo e saldo util ao cuidado corrente |
| Notificacoes | `notifications`, `apps/his-worker` | `notifications`, `apps/worker` | funcional | migrar templates/eventos apenas se aderirem ao modelo interno simples |
| Auditoria | `packages/audit`, trilhas locais | `audit` | dados seletivos | preservar autoria, evento e correlacao quando houver confiabilidade |

## O que migra

- identidades ativas e com ownership claro
- cadastro mestre de owners, patients e vinculos sem ambiguidade critica
- encounters relevantes para continuidade assistencial, faturamento ou auditoria
- prontuario e anexos com autoria, tempo e referencia de episodio rastreaveis
- internacoes, exames e atos avancados ainda materialmente relevantes
- billing operacional minimo em aberto
- saldos e itens de inventory necessarios para operacao corrente

## O que nao migra por padrao

- dados obsoletos sem uso operacional ou regulatorio
- registros clinicos sem autoria, tempo ou vinculo confiavel
- agregadores legados como `patientContext`
- modulos administrativos amplos como `cash`, `payments`, fiscal e integracoes oportunistas
- naming, estrutura de rotas e agrupamentos tecnicos do legado

## Criterios de reaproveitamento consciente

- regra de negocio comprovada no legado e redesenhada no modulo alvo
- dados com identificacao, tenant e integridade suficientes
- aderencia a contracts e permissoes do V2
- capacidade de reconciliacao antes do cutover
