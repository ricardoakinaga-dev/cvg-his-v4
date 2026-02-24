# Checklist de Validação Clínica - Fase 2

**Data:** 20/02/2026
**Feature:** Refatoração da Página de Atendimento (/encounters/[id])
**Versão:** 2.0.0

---

## 1. Validação de Funcionalidades Clínicas

### 1.1 Editor SOAP (SoapEditor)

| Critério | Status | Observações |
|----------|--------|-------------|
| Campos SOAP são exibidos corretamente | [ ] | Subjetivo, Objetivo, Avaliação, Plano |
| Autosave funciona com debounce de 1.5s | [ ] | Verificar indicador de status |
| Indicador de status visível durante edição | [ ] | "Editando...", "Salvando...", "Salvo às HH:MM" |
| Indicador de erro visível quando autosave falha | [ ] | Mensagem em vermelho |
| Templates são aplicados corretamente | [ ] | Conteúdo substituído após confirmação |
| Notas assinadas ficam em modo readonly | [ ] | Badge "ASSINADO" visível |
| Atalhos de teclado funcionam (Ctrl+S, Ctrl+Enter) | [ ] | Salvar e Assinar |
| Criação de nova versão solicita motivo | [ ] | Modal com campo obrigatório |
| Assinatura solicita confirmação | [ ] | Modal de confirmação |

### 1.2 Linha do Tempo Clínica (ClinicalTimeline)

| Critério | Status | Observações |
|----------|--------|-------------|
| Eventos são exibidos em ordem cronológica | [ ] | Mais recentes primeiro |
| Agrupamento por dia funciona | [ ] | Data formatada em português |
| Ícones diferenciam tipos de evento | [ ] | Nota, Documento, Assinatura, etc. |
| Seletor de notas funciona | [ ] | Notas listadas com versão |
| Nota selecionada é destacada | [ ] | Estilo visual diferente |
| Links para entidades funcionam | [ ] | Navegação para nota, documento |

### 1.3 Painel de Documentos (DocumentsPanel)

| Critério | Status | Observações |
|----------|--------|-------------|
| Upload de arquivo funciona | [ ] | File input funcional |
| Drag and drop funciona | [ ] | Borda destacada durante drag |
| Lista de documentos exibe informações | [ ] | Nome, tamanho, data |
| Ícones por tipo de arquivo | [ ] | PDF, Imagem, etc. |
| Botão de copiar ID funciona | [ ] | Clipboard + feedback |
| Modo readonly esconde upload | [ ] | Apenas lista visível |

---

## 2. Validação de Integridade de Dados

### 2.1 TanStack Query

| Critério | Status | Observações |
|----------|--------|-------------|
| Query keys padronizadas | [ ] | `['encounter', 'timeline', id]` |
| Cache invalidado após mutações | [ ] | create, update, sign, version |
| Loading states corretos | [ ] | Skeleton/spinner durante fetch |
| Error states corretos | [ ] | Mensagem de erro + retry |
| Stale time configurado | [ ] | 30s para timeline, 60s para patient |

### 2.2 Persistência

| Critério | Status | Observações |
|----------|--------|-------------|
| Dados não são perdidos ao trocar abas | [ ] | Cache do TanStack Query |
| Autosave não sobrescreve dados antigos | [ ] | Apenas nota atual |
| Versões são preservadas | [ ] | Histórico mantido |

---

## 3. Validação de UX Hospitalar

### 3.1 Hierarquia Visual

| Critério | Status | Observações |
|----------|--------|-------------|
| Header destaca informações críticas | [ ] | Status, datas, motivo |
| Alertas de paciente visíveis | [ ] | Alergias, agressividade |
| Cores seguem padrão clínico | [ ] | Verde=OK, Vermelho=Erro, Amarelo=Alerta |
| Tipografia legível | [ ] | Tamanhos adequados |

### 3.2 Acessibilidade

| Critério | Status | Observações |
|----------|--------|-------------|
| Navegação por teclado funciona | [ ] | Tab, Enter, atalhos |
| Contraste de cores adequado | [ ] | WCAG AA |
| Labels em campos de formulário | [ ] | Associados corretamente |

### 3.3 Responsividade

| Critério | Status | Observações |
|----------|--------|-------------|
| Layout adapta para mobile | [ ] | Grid de 1 coluna |
| Sidebar vira accordion em mobile | [ ] | Colapsável |
| Campos SOAP empilham em mobile | [ ] | Grid responsivo |

---

## 4. Validação de Segurança

### 4.1 Controle de Acesso

| Critério | Status | Observações |
|----------|--------|-------------|
| Notas assinadas não podem ser editadas | [ ] | Readonly enforced |
| Ações requerem permissões | [ ] | Verificar com backend |
| Dados de outros tenants não aparecem | [ ] | Tenant isolation |

### 4.2 Auditoria

| Critério | Status | Observações |
|----------|--------|-------------|
| Ações são logadas | [ ] | Create, update, sign |
| Timestamps corretos | [ ] | UTC normalizado |
| Usuário registrado | [ ] | createdBy, updatedBy |

---

## 5. Testes de Regressão

### 5.1 Cenários Críticos

| Cenário | Status | Observações |
|---------|--------|-------------|
| Criar nova nota SOAP | [ ] | Fluxo completo |
| Editar nota existente | [ ] | Autosave + manual save |
| Assinar nota | [ ] | Confirmação + readonly |
| Criar nova versão | [ ] | Motivo obrigatório |
| Anexar documento | [ ] | Upload + lista atualizada |
| Navegar entre abas | [ ] | Estado preservado |
| Recarregar página | [ ] | Dados recarregados |

### 5.2 Edge Cases

| Cenário | Status | Observações |
|---------|--------|-------------|
| Atendimento sem notas | [ ] | Estado vazio adequado |
| Atendimento sem documentos | [ ] | Estado vazio adequado |
| Nota com SOAP vazio | [ ] | Validação funciona |
| Arquivo grande upload | [ ] | Progress/timeout |
| Conexão instável | [ ] | Retry + error handling |

---

## 6. Performance

| Critério | Status | Observações |
|----------|--------|-------------|
| Tempo de carregamento inicial < 2s | [ ] | Medir em 3G simulado |
| Autosave não bloqueia UI | [ ] | Debounce + async |
| Timeline com muitos eventos | [ ] | Testar com 100+ eventos |
| Memória estável | [ ] | Sem memory leaks |

---

## 7. Aprovação Final

| Papel | Nome | Assinatura | Data |
|-------|------|------------|------|
| Desenvolvedor | | | |
| QA | | | |
| Product Owner | | | |
| Clínico (opcional) | | | |

---

## Notas e Observações

```
[Área para anotações durante os testes]
```

---

**Documento gerado automaticamente pelo plano PHASE2_PLAN.md**
