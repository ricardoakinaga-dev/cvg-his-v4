# Checklist de Validação Futura

Use este checklist antes de concluir qualquer microtarefa da tela de detalhe do tutor.

## Escopo e segurança

- [ ] A tarefa alterou somente os arquivos previstos.
- [ ] Não houve alteração de banco de dados sem tarefa específica.
- [ ] Não houve alteração de API sem contrato e teste.
- [ ] Não foram criados componentes novos se a microtarefa era apenas reorganização.
- [ ] Nenhum dado sensível real foi adicionado a docs, testes ou fixtures.
- [ ] A alteração é reversível em commit pequeno.

## Rota e carregamento

- [ ] `/owners/:id` continua renderizando tutor válido.
- [ ] `/owners/owner_maria_silva` continua abrindo no ambiente de referência quando autenticado.
- [ ] Tutor inexistente mostra erro claro.
- [ ] Loading não quebra layout.
- [ ] Falha parcial de módulo relacionado não derruba a ficha principal, quando aplicável.

## Header e alertas

- [ ] Nome, status e responsável financeiro aparecem corretamente.
- [ ] Ação de editar aponta para `/owners/:id/edit`.
- [ ] Ação de voltar aponta para `/owners`.
- [ ] Alertas críticos aparecem acima de recomendações.
- [ ] Alertas comerciais não são apresentados como risco crítico.

## Pets

- [ ] Lista pets vinculados ao `ownerId`.
- [ ] Estado vazio orienta cadastro de novo pet.
- [ ] `Detalhes` abre `/patients/:id`.
- [ ] Ações de agendar/atender/comanda preservam `ownerId` e `patientId` quando usadas.

## Histórico e agenda

- [ ] Próximos agendamentos pertencem ao tutor.
- [ ] Atendimentos recentes pertencem ao tutor.
- [ ] Cada item tem data, status ou motivo suficiente.
- [ ] Há caminho para abrir item ou lista filtrada.
- [ ] Estado vazio é claro.

## Financeiro e comercial

- [ ] Valores financeiros têm origem clara.
- [ ] Comandas/vendas não duplicam dados em blocos concorrentes.
- [ ] Orçamentos ativos são distinguíveis de pacotes sugeridos.
- [ ] Nenhum orçamento é criado sem confirmação.
- [ ] Erro de criação aparece próximo da ação.

## Comunicação

- [ ] WhatsApp só aparece quando há contato WhatsApp válido.
- [ ] Telefone e e-mail são exibidos sem confundir com KPI.
- [ ] Mensagem contextual é revisável antes de envio externo.
- [ ] Canal indisponível mostra estado claro.
- [ ] Preferências de SMS/contato não são inventadas.

## Cadastro e observações

- [ ] Documento, RG, pessoa física/jurídica e datas aparecem em bloco lógico.
- [ ] Endereço completo não domina o topo.
- [ ] Observações internas aparecem com rótulo claro.
- [ ] Termos técnicos de integração não aparecem para usuário final sem contexto.

## Documentos e auditoria

- [ ] Se documentos forem adicionados, usam endpoint real e permissão adequada.
- [ ] Se auditoria for adicionada, respeita `audit.read`.
- [ ] Usuário sem permissão não vê logs sensíveis.

## Responsividade

- [ ] Sem overflow horizontal em 390px.
- [ ] Ações de cada card continuam próximas ao conteúdo em mobile.
- [ ] Textos longos quebram sem sobrepor botões.
- [ ] Primeiro viewport mostra identidade, alertas críticos e resumo útil.
- [ ] Cards secundários não empurram pets/histórico para muito abaixo.

## Testes mínimos por tipo de tarefa

- [ ] Reorganização visual: teste unitário atualizado quando houver mudança de texto/estrutura esperada.
- [ ] Ação com API: teste de sucesso, cancelamento e erro.
- [ ] Nova integração: teste de service frontend e rota backend.
- [ ] Permissão: teste com e sem permissão.
- [ ] Responsividade: validação manual ou Playwright quando disponível.
