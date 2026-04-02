# Modulo Pacientes — Backend

## 1. Rotas obrigatorias

- POST /patients — criar paciente
- GET /patients — listar com busca e filtros
- GET /patients/:id — detalhe expandido
- PATCH /patients/:id — atualizar parcial

## 2. Validacoes server-side

- tutorId obrigatorio e deve referenciar tutor valido;
- name obrigatorio e nao vazio;
- species obrigatorio e valido;
- sex obrigatorio e valido;
- status obrigatorio e valido;
- weight positivo se informado;
- birthDate formato ISO se informado;
- coerencia entre birthDate e estimatedAge.

## 3. Fonte de verdade

- backend usa persistencia/banco como fonte principal;
- nao depende de memoria como base operacional;
- list e detail consultam repositorio.

## 4. Autoria

- create preenche createdByUserId e updatedByUserId;
- update preserva createdByUserId e atualiza updatedByUserId.

## 5. Busca

- busca livre por q (nome, raca, microchip);
- filtro por species, status, tutorId.

## 6. Erros estruturados

- 400 payload invalido;
- 404 paciente nao encontrado;
- 404 tutor nao encontrado (tutorId invalido);
- 422 regra de negocio violada.

## 7. Auditoria

- criacao gera evento;
- atualizacao gera evento;
- leitura de detalhe critico pode gerar rastreio minimo.
