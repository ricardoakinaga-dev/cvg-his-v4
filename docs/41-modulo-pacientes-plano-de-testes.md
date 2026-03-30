# Modulo Pacientes — Plano de Testes

## 1. Testes do backend

- create com payload completo;
- create rejeita sem tutor;
- create rejeita sem nome;
- create rejeita sem especie;
- update parcial;
- list com busca;
- detail com tutor vinculado;
- tutor inexistente rejeitado.

## 2. Testes de integracao

- criar tutor -> criar paciente -> verificar vinculo;
- paciente sem tutor valido e rejeitado.

## 3. Cenarios manuais

1. cadastrar paciente a partir do tutor;
2. cadastrar paciente com busca de tutor;
3. editar dados clinicos;
4. adicionar alertas;
5. inativar paciente.
