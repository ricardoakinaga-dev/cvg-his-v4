# Checklist de validacao do fluxo principal

Use este checklist apos cada fase e novamente antes de considerar o fluxo pronto.

## Pre-condicoes

- Usuario autenticado com permissoes:
  - `owners.read`, `owners.manage`
  - `patients.read`, `patients.manage`
  - `scheduling.read`, `scheduling.manage`
  - `encounters.read`, `encounters.manage`
  - `medical-records.read`, `medical-records.manage`
  - `billing.read`, `billing.manage`
  - `counter_sale.read`, `counter_sale.write` se Comandas for usada
- Existe ou sera criado um tutor de teste.
- Existe ou sera criado um pet de teste.
- Ambiente deve permitir chamadas API sem alterar dados reais de producao.

## 1. Cliente / Tutor

- [ ] Abrir `/owners`.
- [ ] Buscar tutor por nome/documento/contato.
- [ ] Abrir `/owners/:id`.
- [ ] Ver nome do tutor como titulo principal.
- [ ] Ver contato principal sem UUID como fallback.
- [ ] Ver pets vinculados.
- [ ] Clicar "Cadastrar Novo Animal".
- [ ] Confirmar URL `/patients/new?ownerId=:ownerId`.
- [ ] Confirmar tutor preselecionado no formulario do pet.
- [ ] Clicar "Editar Cadastro".
- [ ] Salvar ou cancelar sem perder retorno ao tutor.
- [ ] Confirmar que nenhum botao de comanda abre sem `ownerId` quando saiu do tutor.

## 2. Pet / Paciente

- [ ] Abrir pet a partir do tutor.
- [ ] Confirmar URL `/patients/:patientId`.
- [ ] Ver tutor vinculado por nome.
- [ ] Ver contato do tutor.
- [ ] Ver dados clinicos basicos: especie, raca, sexo, idade/peso, alergia/doenca cronica/temperamento.
- [ ] Ver historico do pet ou estado vazio claro.
- [ ] Clicar "Agendar".
- [ ] Confirmar URL `/appointments/new?patientId=:patientId&ownerId=:ownerId`.
- [ ] Clicar "Abrir atendimento".
- [ ] Confirmar URL `/encounters/new?patientId=:patientId&ownerId=:ownerId`.
- [ ] Confirmar que comanda/cobranca a partir do pet nao perde `ownerId` e `patientId`.
- [ ] Confirmar que UUID nao aparece como nome principal do pet ou tutor.

## 3. Agenda

- [ ] Abrir `/appointments/new` com `ownerId` e `patientId`.
- [ ] Confirmar tutor preenchido.
- [ ] Confirmar paciente preenchido e pertencente ao tutor.
- [ ] Definir data/hora, tipo, motivo e duracao.
- [ ] Verificar disponibilidade, se aplicavel.
- [ ] Salvar agendamento.
- [ ] Confirmar redirecionamento para `/appointments/:appointmentId`.
- [ ] Confirmar status inicial do agendamento.
- [ ] Abrir `/appointments`.
- [ ] Encontrar agendamento na grade.
- [ ] Abrir detalhe a partir da grade/drawer.
- [ ] Cancelar apenas apos confirmacao contextual.
- [ ] Iniciar atendimento apenas apos confirmar tutor, pet e agendamento.

## 4. Atendimento

- [ ] Abrir atendimento a partir do agendamento.
- [ ] Confirmar `/encounters/:encounterId`.
- [ ] Confirmar tutor e pet corretos.
- [ ] Confirmar origem agenda quando aplicavel.
- [ ] Confirmar `appointmentId` preservado ou auditavel.
- [ ] Abrir prontuario por `/medical-records/:encounterId`.
- [ ] Transicionar status apenas apos intencao clara.
- [ ] Fechar atendimento apenas com motivo obrigatorio.
- [ ] Manter atendimento aberto quando prontuario/cobranca ainda estiverem pendentes.

## 5. Prontuario Clinico

- [ ] Abrir `/medical-records/:encounterId`.
- [ ] Ver tutor, pet, contato e status do atendimento.
- [ ] Registrar anamnese.
- [ ] Registrar exame fisico.
- [ ] Registrar avaliacao/suspeita diagnostica.
- [ ] Registrar plano terapeutico.
- [ ] Registrar prescricao.
- [ ] Registrar conduta/proximos passos.
- [ ] Confirmar entradas salvas com `encounterId`, `patientId` e `medicalRecordId`.
- [ ] Editar entrada apenas registrando motivo quando aplicavel.
- [ ] Arquivar entrada apenas com motivo e confirmacao.
- [ ] Voltar para `/encounters/:encounterId`.

## 6. Cobranca / Comanda

### Se o caminho canonico for Billing

- [ ] Abrir cobranca a partir do atendimento.
- [ ] Confirmar URL `/billing/:encounterId`.
- [ ] Ver tutor e pet por nome.
- [ ] Ver status do billing.
- [ ] Adicionar item.
- [ ] Ver subtotal/total atualizado.
- [ ] Atualizar status com confirmacao.
- [ ] Voltar para atendimento mantendo `encounterId`.
- [ ] Voltar para tutor/pet por links contextuais.

### Se o caminho canonico for CounterSales

- [ ] Abrir comanda a partir do atendimento.
- [ ] Confirmar que a comanda preserva `ownerId`, `patientId`, `encounterId`.
- [ ] Ver tutor, pet e atendimento como contexto principal.
- [ ] Adicionar item.
- [ ] Ver total, pago e saldo.
- [ ] Registrar pagamento com confirmacao contextual.
- [ ] Fechar comanda com confirmacao.
- [ ] Cancelar/reabrir apenas com confirmacao e motivo quando aplicavel.
- [ ] Voltar para atendimento mantendo `encounterId`.
- [ ] Voltar para tutor/pet mantendo contexto.

## 7. Criterios negativos obrigatorios

- [ ] Nao precisar digitar manualmente `ownerId`, `patientId` ou `encounterId`.
- [ ] UUID nao aparece como nome principal de tutor, pet, atendimento, prontuario ou cobranca.
- [ ] Cobranca/comanda nao e criada acidentalmente ao apenas navegar.
- [ ] Orcamento nao e criado acidentalmente ao abrir tutor/pet/atendimento.
- [ ] Pagamento nao e registrado sem confirmacao.
- [ ] Comanda nao e fechada/cancelada/reaberta sem confirmacao.
- [ ] Atendimento nao e iniciado para pet errado.
- [ ] Agenda nao cria atendimento desvinculado do agendamento quando veio da agenda.
- [ ] Usuario consegue retornar para tutor ou pet apos cobranca.

## 8. Responsividade e acessibilidade

- [ ] Fluxo validado em desktop.
- [ ] Fluxo validado em largura mobile.
- [ ] Botoes principais continuam visiveis e nao sobrepostos.
- [ ] Modais de confirmacao cabem no mobile.
- [ ] Campos obrigatorios possuem label e erro.
- [ ] Estados loading, empty e error sao distinguiveis.
- [ ] Acoes perigosas sao acessiveis por teclado e nao dependem apenas de cor.

## Resultado final esperado

O fluxo so deve ser marcado como pronto quando um usuario conseguir:

1. Abrir um tutor.
2. Ver ou cadastrar um pet.
3. Criar agendamento para esse pet.
4. Abrir atendimento vinculado.
5. Registrar prontuario clinico basico.
6. Criar cobranca/comanda vinculada.
7. Voltar para tutor/pet sem perder contexto.

Sem redigitar IDs, sem UUID como nome principal, sem cobranca/orcamento acidental e sem perda de `ownerId`, `patientId` ou `encounterId`.
