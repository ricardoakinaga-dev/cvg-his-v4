# Modulo Pacientes — Criterios de Aceite

## 1. Cadastro

- paciente pode ser criado com campos obrigatorios;
- backend recusa payload invalido;
- tutor e validado e vinculado;
- retorno contem id utilizavel.

## 2. Edicao

- paciente pode ser editado;
- atualizacao parcial nao quebra consistencia;
- alteracao gera auditoria.

## 3. Listagem

- listagem carrega com dados;
- busca funciona;
- filtros funcionam;
- tutor e exibido corretamente.

## 4. Detalhe

- dados completos exibidos;
- tutor vinculado visivel;
- alertas com destaque.

## 5. Integracao

- fluxo tutor -> paciente funciona;
- tutor pre-selecionado quando vem do modulo Tutores.

## 6. Alertas

- alertas criam, persistem e reaparecem;
- destaque visual presente.

## 7. Validacoes

- campos obrigatorios validados no frontend e backend;
- erros claros por campo.
