# Domain Map

## Macrodominios do V2

- Governanca e Identidade
- Cadastro Mestre
- Atendimento e Episodio Clinico
- Prontuario Clinico
- Operacao Assistencial Avancada
- Consumo Assistencial e Administrativo
- Plataforma, Observabilidade e Auditoria

## Eixos centrais do sistema

- identidade do ator
- identidade do paciente
- vinculo tutor-paciente
- episodio clinico
- prontuario longitudinal
- trilha de auditoria

## Fluxo macro entre dominios

1. `auth`, `users`, `staff` e `access-control` definem quem pode agir e em que contexto.
2. `owners` e `patients` formam o cadastro mestre institucional.
3. `scheduling` e `triage` organizam a chegada e a classificacao inicial.
4. `encounters` materializa o episodio clinico operacional.
5. `medical-records` consolida a narrativa clinica longitudinal.
6. `attachments`, `diagnostics`, `inpatient` e `surgery` especializam o cuidado.
7. `billing`, `inventory` e `notifications` consomem referencias assistenciais por contratos formais.
8. `audit` e observabilidade suportam rastreabilidade transversal.

## Limites conceituais

- `encounter` nao substitui o prontuario longitudinal.
- `medical-records` nao absorve faturamento, estoque ou agenda.
- `billing` e `inventory` consomem eventos e referencias assistenciais, mas nao governam estado clinico.
- `notifications` reage a eventos; nao define transicoes de negocio.
