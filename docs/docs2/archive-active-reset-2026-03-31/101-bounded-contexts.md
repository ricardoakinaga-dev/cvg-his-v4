# Bounded Contexts

## Identity And Access

- modulos: `auth`, `access-control`, `users`, `staff`
- responsabilidade: autenticacao, sessao, papeis, atribuicoes e policies
- invariantes: identidade autenticada, sessao revogavel, policy contextual

## Master Registry

- modulos: `owners`, `patients`
- responsabilidade: cadastro de tutores, pacientes e relacionamentos
- invariantes: paciente pertence ao contexto institucional e possui historico identificavel

## Encounter Management

- modulos: `scheduling`, `triage`, `encounters`
- responsabilidade: jornada operacional da chegada ao encerramento do episodio
- invariantes: todo encounter referencia paciente valido, estado coerente e actor autorizado

## Clinical Record

- modulos: `medical-records`, `attachments`
- responsabilidade: entries clinicas, historico, revisoes e anexos
- invariantes: autoria obrigatoria, versionamento de conteudo sensivel e rastreabilidade

## Advanced Care

- modulos: `inpatient`, `surgery`, `diagnostics`
- responsabilidade: internacao, bloco cirurgico e diagnostico especializados
- invariantes: preservacao de referencia ao encounter e ao prontuario

## Administrative Consumption

- modulos: `billing`, `inventory`, `notifications`
- responsabilidade: faturamento, consumo, catalogo, movimentacao e mensageria operacional
- invariantes: sem governar regras nucleares do cuidado clinico

## Cross-Cutting Governance

- modulo principal: `audit`
- shared habilitadores: `contracts`, `database`, `errors`, `logging`, `validation`, `config`
- responsabilidade: auditoria, correlacao, padroes tecnicos e suporte transversal

## Dependencias permitidas

- modulos dependem apenas de `packages/shared/*`
- comunicacao entre modulos por contracts publicos
- `apps/*` orquestram modulos, nao os fundem

## Dependencias proibidas

- acesso a internals de outro modulo
- acoplamento direto entre `billing` e prontuario
- regras de permissao codificadas apenas em frontend
