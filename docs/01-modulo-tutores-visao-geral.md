# Módulo Tutores — Visão Geral

## 1. Objetivo do módulo

O módulo de Tutores é o cadastro mestre das pessoas físicas ou jurídicas responsáveis pelos pacientes atendidos pelo CVG-HIS-V2. Ele não deve ser tratado como um CRUD genérico de clientes. Em operação hospitalar veterinária, o Tutor concentra:

- identificação civil e administrativa do responsável;
- meios de contato ativos para comunicação clínica, financeira e operacional;
- vínculo formal com um ou mais pacientes;
- contexto mínimo para autorização, cobrança, retorno e continuidade do cuidado;
- histórico auditável de criação, edição e uso transversal no sistema.

O objetivo da evolução deste módulo é transformar o cadastro hoje simplificado de `owners` em um módulo fullstack robusto, escalável e coerente com o restante do sistema.

## 2. Papel do tutor no contexto hospitalar veterinário

No hospital veterinário, o tutor é a entidade humana responsável pelo paciente animal. Em termos operacionais, ele pode ser:

- responsável principal pelo atendimento;
- responsável financeiro;
- contato preferencial para retorno clínico;
- responsável secundário autorizado;
- representante legal de pessoa jurídica, abrigo, ONG ou mantenedor institucional.

O tutor participa diretamente de fluxos de:

- recepção e abertura de cadastro;
- vinculação inicial do paciente;
- check-in e atendimento;
- autorização de procedimentos;
- emissão de cobranças;
- comunicação de alta, retorno e intercorrências;
- auditoria de relacionamento tutor-paciente.

## 3. Diferença entre Tutor e Paciente

Tutor e Paciente são entidades de negócio distintas e não podem compartilhar contrato de dados.

### Tutor

- representa a pessoa ou organização responsável;
- possui dados de identificação civil, contatos, endereço e status administrativo;
- pode responder por um ou mais pacientes;
- pode existir sem paciente vinculado por um curto período operacional;
- é reutilizado em múltiplos fluxos do sistema.

### Paciente

- representa o animal atendido;
- possui dados clínicos e cadastrais próprios;
- depende de pelo menos um tutor válido para uso operacional regular;
- participa de filas, consultas, prontuário, faturamento e internação.

## 4. Importância do vínculo Tutor-Paciente

O vínculo tutor-paciente não é um detalhe de cadastro. Ele é a base para:

- atribuir responsabilidade operacional;
- identificar contato preferencial;
- suportar múltiplos responsáveis em cenários futuros;
- manter coerência entre recepção, atendimento e financeiro;
- evitar pacientes órfãos de responsável;
- permitir criação rápida de paciente a partir de tutor previamente salvo.

No estado atual do sistema, já existe `ownerId` em `patients` e já existe a tabela/rota de `owner-patient-links`. A evolução do módulo deve aproveitar essa fundação, sem quebrar retrocompatibilidade de curto prazo.

## 5. Principais fluxos operacionais

### 5.1 Cadastro de tutor antes do paciente

Fluxo prioritário para recepção:

1. recepcionista busca tutor por nome, documento, telefone ou e-mail;
2. se não existir, cadastra tutor com dados mínimos e contato principal;
3. salva o tutor;
4. aciona ação rápida para cadastrar paciente já vinculado ao tutor;
5. segue para demais fluxos clínicos ou administrativos.

### 5.2 Reuso de tutor já existente

1. usuário localiza tutor existente;
2. valida identidade e contatos;
3. reutiliza tutor para novo paciente ou novo atendimento;
4. evita duplicidade cadastral.

### 5.3 Manutenção cadastral

1. usuário acessa detalhe do tutor;
2. atualiza endereço, contatos, preferências de contato ou status;
3. sistema registra auditoria mínima;
4. alterações passam a refletir no consumo por outros módulos.

### 5.4 Consulta operacional do tutor

Equipe clínica, recepção e administrativo precisam consultar:

- nome e documento;
- meios de contato;
- pacientes vinculados;
- status do tutor;
- notas administrativas relevantes;
- origem do cadastro e data da última alteração.

## 6. Limitações do modelo simplificado atual

O estado atual identificado no código é insuficiente para operação real:

- frontend atual de `owners` possui apenas nome, documento, um contato e observações;
- listagem atual busca somente por nome ou documento;
- backend atual expõe `GET /owners`, `POST /owners`, `GET /owners/:id`, `PATCH /owners/:id`;
- schema atual de `owners` no banco é limitado a `name`, `documentType`, `documentNumber`, `email`, `phone`, `address`, `status`, `createdAt`, `updatedAt`;
- a tela atual não organiza endereço, múltiplos contatos, preferências de contato, status administrativo detalhado, origem de cadastro e vínculo operacional com pacientes;
- não existe UX robusta para criação rápida de paciente a partir do tutor salvo;
- não existe contrato documental formal separando DTO de entrada, persistência e resposta para frontend;
- as regras atuais de duplicidade e consistência ainda são fracas para produção.

## 7. Objetivos da evolução do módulo

Esta fase documental deve orientar uma implementação que entregue:

- cadastro de tutor compatível com ambiente hospitalar veterinário;
- contrato de dados estável para frontend, backend e banco;
- múltiplos contatos por tutor;
- endereço estruturado;
- status de cadastro e origem do cadastro;
- auditoria e rastreabilidade mínimas;
- busca operacional eficiente;
- integração explícita com pacientes;
- regras de duplicidade e atualização controlada;
- base evolutiva para múltiplos responsáveis por paciente.

## 8. Dependências com outros módulos

O módulo Tutores depende ou impacta:

- `Pacientes`: vínculo principal tutor-paciente, criação rápida de paciente, exibição de pacientes vinculados;
- `Recepção/Fila`: seleção de tutor durante check-in e abertura de atendimento;
- `Atendimentos`: uso de `ownerId`/tutor no contexto de encounter;
- `Financeiro`: responsável financeiro, contato de cobrança, consistência cadastral;
- `Busca mestre`: recuperação unificada de tutores;
- `Auditoria`: registro de eventos de leitura crítica, criação, alteração e vínculo;
- `Autorização`: permissões `owners.read` e `owners.manage`, com futura revisão de nomenclatura para `tutors.*`.

## 9. Visão de uso por perfil

### 9.1 Recepção

Necessita:

- busca rápida por múltiplas chaves;
- cadastro mínimo eficiente;
- criação rápida de paciente após salvar tutor;
- leitura clara de contatos principais;
- confirmação visual de vínculo com pacientes existentes.

### 9.2 Administrativo

Necessita:

- dados de identificação completos;
- endereço e meios de contato confiáveis;
- status do cadastro;
- notas administrativas;
- capacidade de inativar sem apagar histórico;
- auditoria mínima de alterações.

### 9.3 Equipe clínica

Necessita:

- identificar rapidamente quem é o responsável pelo paciente;
- saber qual contato usar;
- verificar se existe mais de um responsável;
- acessar pacientes vinculados ao tutor;
- confiar que o cadastro não está duplicado ou inconsistente.

## 10. Diretriz de implementação

Durante a implementação posterior:

- o termo de negócio preferencial será `Tutor`;
- o nome técnico atual `owner` pode ser mantido temporariamente para compatibilidade;
- a documentação deve prevalecer como contrato de evolução;
- qualquer diferença entre frontend, backend e banco deverá ser tratada como desvio de implementação;
- o módulo só será considerado maduro quando suportar operação real, não apenas cadastro básico.
