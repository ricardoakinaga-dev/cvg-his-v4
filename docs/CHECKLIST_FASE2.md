# Checklist de Validação Manual - Fase 2

Este roteiro deve ser seguido para validar as entregas da Fase 2 antes do deploy.

## 1. Carregamento e Layout
- [ ] **Desktop**: Acessar um encounter existente. Verificar se Header aparece primeiro, seguido das Tabs e Sidebar.
- [ ] **Mobile**: Reduzir a largura da janela (<1024px). Verificar se a Sidebar move para o topo e se torna um botão "Detalhes" colapsável.
- [ ] **Erro**: Tentar acessar um ID inexistente. Verificar mensagem de erro amigável e botão "Tentar novamente".

## 2. Editor SOAP
- [ ] **Edição**: Digitar textos nos campos S, O, A, P.
- [ ] **Autosave**: Parar de digitar por 2 segundos. Verificar se o status muda para "Salvo".
     - Recarregar a página. Verificar se o texto persiste.
- [ ] **Templates**: Selecionar um template. Confirmar substituição (ou cancelamento).
- [ ] **Versão**: Clicar "Criar Versão". Preencher motivo. Confirmar. Verificar se nova versão aparece na Timeline.
- [ ] **Assinatura**: Clicar "Assinar". Confirmar. Verificar se os campos bloqueiam (read-only) e status muda para "Assinado".
- [ ] **Atalhos**: Testar `Ctrl+S` e `Ctrl+Enter`.

## 3. Documentos
- [ ] **Upload**: Selecionar um arquivo (PDF/Img). Clicar "Upload".
- [ ] **Listagem**: Verificar se o arquivo aparece na lista imediatamente.
- [ ] **Link**: Clicar "Copy ID". Verificar clipboard.

## 4. Timeline
- [ ] **Visualização**: Verificar se os eventos (Note Created, Document Attached, etc.) aparecem ordenados (mais recente no topo).
- [ ] **Navegação**: Clicar em um evento "Evolução". Verificar se a aba SOAP abre na nota correta.

## 5. Sidebar
- [ ] **Dados**: Verificar se nome, espécie e raça batem com o paciente.
- [ ] **Alertas**: Se o paciente tiver alertas (ex: Agressivo), verificar destaque visual (vermelho/laranja).
