# Business Rules

## Regras nucleares

1. O paciente e o sujeito do cuidado; o tutor e o responsavel relacional e administrativo.
2. Todo encounter exige paciente valido, actor autorizado e contexto institucional definido.
3. Conteudo clinico materialmente relevante exige autoria, timestamp e trilha de auditoria.
4. Revisao de conteudo clinico gera nova versao; nao sobrescreve historico silenciosamente.
5. Billing, inventory e notifications consomem referencias assistenciais, mas nao controlam o estado clinico.
6. Nenhuma permissao material pode depender apenas da renderizacao de tela.
7. Exclusao fisica de dados clinicos sensiveis nao faz parte do fluxo operacional comum.

## Regras do cadastro mestre

- um `owner` pode estar vinculado a varios pacientes
- um `patient` pode ter mais de um tutor com papeis distintos
- duplicidade cadastral deve ser tratada como fluxo de conciliacao, nao como edicao destrutiva

## Regras do atendimento

- um `encounter` representa episodio operacional, com ciclo de vida controlado
- triagem complementa o encounter; nao o substitui
- estados de encounter devem ser explicitamente transicionados e auditados

## Regras do prontuario

- entries clinicas pertencem ao prontuario longitudinal do paciente
- entries podem referenciar encounter, mas nao ficam limitadas a ele
- prescricao, conduta e evolucao sao tipos distintos de `clinical entry`

## Regras administrativas

- faturamento deriva de consumo assistencial e referencia de servico, nao de regra clinica arbitraria
- estoque registra consumo, reserva e movimentacao por contrato, sem alterar a narrativa clinica
