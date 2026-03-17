# Checklist de Validação - Fase 4 (Prescrição no Encounter)

Este checklist deve ser executado para garantir a integridade da entrega da funcionalidade de Prescrição no Atendimento.

- [ ] **Acesso à Aba Prescrição**
  - Abrir um atendimento (`/encounters/:id`).
  - Navegar para a aba "Prescrição" clicando no menu ou usando o atalho `Alt+3`.
  - Verificar se o painel carrega corretamente.

- [ ] **Gestão de Ordens (RBAC: medorder.write)**
  - Clicar em "Nova prescrição".
  - Preencher o formulário e salvar.
  - Verificar se a ordem aparece na lista de "Ativas".
  - Editar uma ordem existente e salvar.
  - Suspender uma ordem (botão "Suspender") informando o motivo.

- [ ] **Resumo e Documentação**
  - Clicar no botão "Copiar resumo".
  - Verificar se o modal abre com o texto gerado corretamente.
  - Clicar em "📋 Copiar para área de transferência" e verificar o feedback.
  - Clicar em "📂 Registrar como Documento".
  - Verificar se o sistema navega automaticamente para a aba "Documentos".
  - Confirmar se o documento "prescricao-encounter-..." aparece na lista.

- [ ] **Indicadores e Navegação**
  - Verificar no Header do atendimento se o badge "💊 N ordens" reflete a quantidade correta de ordens ativas.
  - Clicar no badge e confirmar se redireciona para a aba de Prescrição.
  - Testar navegação de volta para o SOAP usando o botão "⬅ Voltar (SOAP)".

- [ ] **Estabilidade Técnica**
  - Executar o build de produção (`pnpm build` ou `npm run build`) e garantir que não há erros.
