# Modulo Internacao — Visao Geral

## Objetivo

Permanencia do paciente sob cuidado continuo dentro do hospital.

## Entidade

- **Hospitalization** (inpatient_stays): internacao do paciente

## Fluxos

1. atendimento aberto
2. decisao de internar
3. criacao de internacao (unico ativo por paciente)
4. permanencia sob cuidado
5. alta/desfecho

## Regras

- internacao nao existe sem atendimento valido
- apenas 1 internacao ativa por paciente
- exclusao destrutiva nao permitida
- historico preservado
