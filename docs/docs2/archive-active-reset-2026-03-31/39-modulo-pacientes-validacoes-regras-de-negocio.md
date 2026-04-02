# Modulo Pacientes — Validacoes e Regras de Negocio

## 1. Obrigatoriedade

- nome obrigatorio;
- especie obrigatoria;
- sexo obrigatorio;
- tutorId obrigatorio e valido;
- status obrigatorio.

## 2. Dados clinicos

- peso aceita apenas valores positivos;
- birthDate formato ISO se informado;
- estimatedAge string livre se informado;
- birthDate e estimatedAge sao opcionais e mutuamente exclusivos na pratica;
- neutered boolean ou null;
- coat string opcional;
- microchip string opcional.

## 3. Alertas

- persistidos como array JSON;
- cada alerta tem type, label e severity;
- type: allergy, aggression, anesthesia_risk, chronic_condition, other;
- severity: low, medium, high.

## 4. Status

- active: paciente ativo em operacao;
- inactive: paciente inativado (nao deletar);
- deceased: paciente falecido.

## 5. Inativacao

- nao permitir exclusao destrutiva;
- inativar via status;
- paciente inativado permanece consultavel.

## 6. Integracao com tutor

- tutorId deve referenciar tutor existente e ativo;
- tutor inativo gera warning mas pode ser permitido com confirmacao;
- vinculo deve ser preservado em updates.
