# PROMPT MASTER — CVG-HIS-V2 — IMPLEMENTAÇÃO ENTERPRISE COMPLETA — MÓDULO PACIENTES

## Objetivo

Implementar o módulo Pacientes do CVG-HIS-V2 de forma completa, consistente e em nível enterprise, usando a documentação em `/docs` como contrato único de verdade, garantindo integração total com o módulo Tutores e entregando o módulo em estado `PRONTO PARA AUDITORIA`.

Regra central:

A documentação em `/docs` é a fonte oficial de verdade.
O código deve obedecer aos documentos.
Se houver divergência entre código atual e contrato documental, ajustar o código para aderir ao contrato, com a menor ruptura possível da arquitetura existente.

Escopo desta execução:

- banco/schema
- backend/API
- frontend
- integração com Tutores
- alertas clínicos iniciais
- validações
- testes mínimos do módulo
- preparação para auditoria

Fora do escopo desta execução:

- auditoria final formal
- prontuário clínico completo
- exames
- internação
- agenda
- financeiro
- exclusão destrutiva de paciente

## CONTEXTO DO DOMÍNIO

O módulo Pacientes é o núcleo clínico do hospital veterinário.

Um paciente:

- sempre pertence a pelo menos um tutor/responsável
- precisa ter vínculo operacional forte com Tutores
- será consumido por recepção, equipe clínica, prontuário, exames, internação e agenda
- não deve ser tratado como um CRUD genérico

O módulo deve ser preparado para evolução futura, inclusive para múltiplos responsáveis, sem obrigar a implementação completa desse cenário agora.

## CONTRATO BASE DO MÓDULO PACIENTES

Campos obrigatórios mínimos:

- id
- name
- species
- tutorId
- status

Campos clínicos essenciais:

- breed
- sex
- neutered
- birthDate
- estimatedAge
- weight
- coat
- microchip

Campos médicos iniciais:

- alerts
- notes
- behavioralNotes

Campos administrativos:

- createdAt
- updatedAt
- createdByUserId
- updatedByUserId

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

1. Paciente não existe sem tutor salvo.
2. Tutor deve ser selecionado via sistema.
3. Não permitir digitação manual de ID de tutor como caminho principal.
4. Nome do paciente é obrigatório.
5. Espécie é obrigatória.
6. Status é obrigatório.
7. Deve ser possível cadastrar com data de nascimento OU idade estimada.
8. Não exigir ambos ao mesmo tempo.
9. Alertas clínicos precisam ser persistidos e exibidos com destaque.
10. Exclusão destrutiva não deve ser implementada; usar inativação/status.
11. Backend deve usar persistência/banco como fonte real de verdade.
12. Não criar dependência operacional de memória volátil como fonte principal.

## ENUMS E ESTRUTURAS RECOMENDADAS

Status permitidos do paciente:

- active
- inactive
- deceased

Sex permitidos:

- male
- female
- unknown

Campos de castração:

- neutered: boolean | null

Estrutura recomendada de alerts:

Implementar de forma simples, porém estruturada e persistível.
Aceitável nesta fase:

- lista de strings

ou

- lista de objetos simples com:
  - type
  - label
  - severity

Desde que frontend e backend fiquem sincronizados.

Exemplos de alertas:

- alergia medicamentosa
- agressivo
- risco anestésico
- diabético
- cardiopata

Estrutura recomendada para vínculo com tutor:

- manter compatibilidade com o modelo atual do projeto
- suportar tutor principal obrigatório
- preparar o código para múltiplos responsáveis no futuro
- não expandir além do necessário nesta fase

## ARQUIVOS REAIS CANDIDATOS A ALTERAÇÃO

Mapear e usar os arquivos reais existentes, priorizando:

- `apps/web/src/pages/patients.ts`
- `apps/api/src/server.ts`
- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`
- módulo real de `patients`, se existir
- integrações com `owners/tutores`
- testes existentes do `app/api`

Se houver migrations no projeto, criar migration incremental consistente com o padrão atual.

## FASE 0 — DOCUMENTAÇÃO DO MÓDULO EM /docs

Antes de implementar código:

1. Verificar se já existem documentos do módulo Pacientes em `/docs`.
2. Se não existirem, criar a documentação mínima necessária do módulo Pacientes em `/docs`, em formato `.md`, cobrindo:
   - visão geral
   - contrato de dados
   - backend
   - frontend
   - integração com Tutores
   - validações e regras de negócio
   - plano de implementação
   - critérios de aceite
   - plano de testes
   - gate de auditoria
3. Se já existirem, ler integralmente e seguir os documentos.
4. Não alterar outros arquivos fora de `/docs` nesta fase 0.

Importante:
A implementação do código só pode começar depois da leitura/consolidação documental.

## FASE 1 — INTERPRETAÇÃO DO PLANO

Ler toda a documentação do módulo Pacientes em `/docs` e extrair:

- contrato de dados
- regras de negócio
- campos obrigatórios
- campos opcionais
- fluxos principais
- dependências com Tutores
- critérios de aceite
- critérios de teste
- critérios de pronto para auditoria

Proibido iniciar implementação sem concluir esta fase.

## FASE 2 — MAPEAMENTO DO CÓDIGO REAL

Mapear o estado atual do projeto e comparar docs vs código real.

Identificar:

- o que já existe
- o que está parcial
- o que está incorreto
- o que precisa ser criado
- o que precisa ser refatorado minimamente
- onde há risco de desalinhamento entre frontend/backend/banco

Saída esperada:
um entendimento interno claro do gap entre contrato e código.

## FASE 3 — IMPLEMENTAÇÃO CONTROLADA

### FASE 3.1 — BANCO / SCHEMA

Objetivo:
Fazer o banco suportar 100% do contrato do módulo.

Ações obrigatórias:

- expandir schema de `patients`
- adicionar campos clínicos
- adicionar campos administrativos
- garantir vínculo consistente com tutor
- preparar persistência de alertas
- garantir compatibilidade com status e auditoria
- criar migration incremental, se houver mecanismo de migrations

Critério de conclusão:

- persistência suporta create, update, detail e list
- contrato do paciente está refletido no schema
- não há campo crítico só no frontend sem persistência real

### FASE 3.2 — BACKEND / API

Objetivo:
Implementar a API de Pacientes aderente ao contrato e usando banco como fonte real.

Rotas mínimas obrigatórias:

- `POST /patients`
- `GET /patients`
- `GET /patients/:id`
- `PATCH /patients/:id`

Ações obrigatórias:

- validar `tutorId` existente
- validar nome
- validar espécie
- validar status
- validar coerência entre `birthDate` e `estimatedAge`
- preencher `createdByUserId` e `updatedByUserId`
- implementar busca por nome, tutor e espécie
- retornar payloads coerentes para list/detail
- usar persistência como fonte operacional de verdade
- não depender de memória como base principal

Critério de conclusão:

- API funcional ponta a ponta
- contratos coerentes com frontend
- tutor inválido rejeitado corretamente
- dados persistem e voltam do banco

### FASE 3.3 — FRONTEND / LISTAGEM E FORMULÁRIO

Objetivo:
Implementar UI utilizável e coerente com backend.

Arquivo prioritário:

- `apps/web/src/pages/patients.ts`

Listagem deve exibir:

- nome do paciente
- tutor principal
- espécie
- status
- indicadores básicos de alerta, se aplicável
- busca e filtros

Formulário deve ser dividido em blocos:

Bloco 1 — Identificação

- nome
- espécie
- raça
- sexo
- status

Bloco 2 — Tutor

- seleção obrigatória de tutor salvo
- busca por tutor
- pré-preenchimento quando vier do fluxo do tutor

Bloco 3 — Dados clínicos

- castrado
- data de nascimento
- idade estimada
- peso
- pelagem
- microchip

Bloco 4 — Alertas clínicos

- alertas estruturados
- destaque visual claro

Bloco 5 — Observações

- notes
- behavioralNotes

Regras obrigatórias:

- não aceitar ID manual de tutor como caminho principal
- implementar estados de loading, error, success, empty quando aplicável
- implementar validação por campo
- manter sincronização de names/types/payload com backend

Critério de conclusão:

- formulário cria e edita corretamente
- listagem funciona
- frontend está sincronizado com backend
- UX não depende de fluxo manual frágil

### FASE 3.4 — INTEGRAÇÃO COM TUTORES

Objetivo:
Fechar o fluxo operacional Tutor → Paciente.

Fluxo obrigatório:

1. criar tutor
2. abrir detalhe do tutor
3. clicar `Adicionar paciente`
4. abrir formulário de paciente com tutor já selecionado
5. salvar paciente
6. manter vínculo consistente

Ações obrigatórias:

- reaproveitar o que já foi construído no módulo Tutores
- pré-preencher tutor quando vier do contexto
- impedir que o fluxo principal recaia em campo manual
- manter fallback técnico apenas se estritamente necessário e não como UX principal

Critério de conclusão:

- fluxo real da recepção funciona ponta a ponta

### FASE 3.5 — ALERTAS CLÍNICOS

Objetivo:
Garantir persistência e visualização de alertas iniciais.

Ações obrigatórias:

- persistir alertas no backend
- exibir alertas com destaque no frontend
- refletir alertas em detail/list se fizer sentido com a estrutura atual
- manter estrutura simples e evolutiva

Critério de conclusão:

- alertas criam, persistem e reaparecem corretamente

### FASE 3.6 — VALIDAÇÕES

Backend:

- `tutorId` válido
- nome obrigatório
- espécie obrigatória
- status obrigatório
- coerência mínima entre `birthDate` e `estimatedAge`

Frontend:

- validação por campo
- mensagens claras
- impedir envio evidentemente inválido

Critério de conclusão:

- erros críticos barrados no backend
- UX mínima de validação funcionando no frontend

### FASE 3.7 — TESTES MÍNIMOS

Criar testes focados do módulo cobrindo no mínimo:

- create paciente
- update paciente
- list paciente
- detail paciente
- vínculo com tutor
- rejeição de tutor inexistente
- autoria mínima, se aplicável ao fluxo do módulo
- fluxo de leitura persistida, se aplicável ao padrão do projeto

Critério de conclusão:

- testes focados do módulo executam com sucesso
- build e typecheck passam

## FASE 4 — VALIDAÇÃO CONTÍNUA

Após cada subfase:

- rodar build
- rodar typecheck
- validar funcionamento básico
- corrigir antes de avançar

Não avançar com erro aberto que afete a fase atual.

## FASE 5 — CORREÇÕES AUTOMÁTICAS DE CONSISTÊNCIA

Antes de finalizar:

- revisar frontend vs backend
- revisar contrato vs persistência
- revisar payloads
- revisar nomes divergentes
- revisar status
- revisar integração tutor → paciente
- corrigir automaticamente inconsistências básicas encontradas

Não deixar:

- campo novo sem persistência
- persistência sem exposição na API
- API sem consumo correto no frontend
- fluxo principal dependendo de atalho manual frágil

## FASE 6 — PREPARAÇÃO PARA AUDITORIA

Confirmar:

- create funciona
- update funciona
- list funciona
- detail funciona
- tutor sempre presente
- integração com Tutores funciona
- alertas funcionam
- backend usa banco como fonte real nos fluxos expostos
- frontend está sincronizado
- módulo está pronto para auditoria

Se houver bloqueio crítico:

- corrigir antes de encerrar

## REGRAS GLOBAIS DE IMPLEMENTAÇÃO

1. Não improvisar arquitetura.
2. Não criar abstração excessiva.
3. Não criar módulos paralelos desnecessários.
4. Não quebrar o módulo Tutores.
5. Não usar memória como fonte principal.
6. Não aceitar fluxo manual frágil como caminho principal.
7. Não duplicar lógica sem necessidade.
8. Não expandir escopo para prontuário/exames/internação.
9. Fazer apenas a refatoração mínima necessária.
10. Se houver conflito entre docs e código, seguir os docs com a menor ruptura possível.

## ENTREGA FINAL OBRIGATÓRIA

Ao final, entregar:

1. lista de arquivos alterados
2. lista de arquivos criados
3. resumo por fase do que foi implementado
4. pendências remanescentes, se existirem
5. riscos conhecidos, se existirem
6. confirmação final exata:

`Módulo Pacientes pronto para auditoria`

Importante:
Não declarar pronto para produção.
Declarar apenas pronto para auditoria.

## CRITÉRIO DE SUCESSO

O módulo será considerado bem implementado se:

- o paciente for criado corretamente
- o vínculo com tutor for obrigatório e funcional
- o fluxo clínico inicial for coerente
- frontend, backend e banco estiverem sincronizados
- o módulo estiver apto para auditoria enterprise

## FIM DO PROMPT
