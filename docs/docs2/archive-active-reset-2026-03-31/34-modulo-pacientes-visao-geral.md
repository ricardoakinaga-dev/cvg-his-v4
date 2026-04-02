# Modulo Pacientes — Visao Geral

## 1. Objetivo do modulo

O modulo de Pacientes e o nucleo clinico do hospital veterinario CVG-HIS-V2. Cada paciente representa o animal atendido e concentra:

- identificacao basica (nome, especie, raca, sexo);
- dados clinicos essenciais (peso, castracao, pelagem, microchip);
- alertas clinicos iniciais (alergias, riscos, condicoes);
- vinculo obrigatorio com tutor/responsavel;
- historico auditavel de criacao, edicao e uso transversal.

## 2. Papel no contexto hospitalar

O paciente participa diretamente de fluxos de:

- recepcao e abertura de cadastro;
- vinculacao com tutor;
- check-in e atendimento;
- triagem;
- prontuario clinico;
- exames;
- internacao;
- agenda;
- faturamento.

## 3. Dependencias

- **Tutores**: vinculo obrigatorio. Paciente nao existe sem tutor salvo.
- **Recepcao/Fila**: selecao de paciente durante check-in.
- **Atendimentos**: uso de patientId no contexto de encounter.
- **Prontuario**: consumo de dados do paciente.

## 4. Fluxos principais

### 4.1 Cadastro a partir do tutor

1. usuario acessa detalhe do tutor;
2. clica em "Adicionar paciente";
3. formulario abre com tutor pre-selecionado;
4. preenche dados do paciente;
5. salva com vinculo automatico.

### 4.2 Cadastro direto com busca de tutor

1. usuario abre modulo Pacientes;
2. busca tutor salvo;
3. seleciona tutor;
4. preenche dados do paciente;
5. salva com vinculo.

### 4.3 Manutencao cadastral

1. usuario acessa paciente existente;
2. atualiza dados clinicos, alertas ou status;
3. sistema registra auditoria.

## 5. Limitacoes do modelo atual

- schema atual de patients e limitado a campos basicos (name, species, breed, sex, birthDate, weight, status);
- nao ha campos para alertas, notas, pelagem, microchip, castracao, idade estimada;
- frontend atual tem formulario basico;
- backend nao usa persistencia como fonte principal em todos os fluxos;
- integracao com tutores melhorou mas pode evoluir mais.

## 6. Objetivos da evolucao

- cadastro completo compativel com ambiente hospitalar veterinario;
- contrato de dados estavel para frontend, backend e banco;
- alertas clinicos persistentes e visiveis;
- integracao robusta com tutores;
- busca operacional eficiente;
- auditoria minima de autoria.
