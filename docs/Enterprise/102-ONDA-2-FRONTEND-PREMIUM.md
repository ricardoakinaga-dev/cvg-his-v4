# ONDA 2 — FRONTEND PREMIUM (Meses 5-9)
## Score: 58 → 72 (+14 pontos)

## Objetivo
Substituir o server-side HTML por uma SPA Vue 3 premium com design system completo, dark mode, acessibilidade e experiência de uso que rivalize com os melhores SaaS.

## Etapas

### Etapa 2.1 — Design System Foundation (Mês 5)
**Entregas:**
- [ ] Design tokens (cores primária/secundária/feedback, spacing 4px grid, typography scale, shadows, borders, radii)
- [ ] CSS variables para light/dark themes
- [ ] 15 componentes base: Button, Input, Select, Checkbox, Radio, Switch, Badge, Avatar, Tooltip, Spinner, Divider, Alert, Tag, Progress, Skeleton
- [ ] Storybook configurado com documentação
- [ ] Acessibilidade: focus states, ARIA labels, keyboard nav em todos os componentes
- [ ] Pacote npm `@cvg-his-v2/design-system`

**Critérios de Aceite:**
- Todos os tokens documentados no Storybook
- Componentes passam em axe-core (0 violations)
- Dark mode funciona em todos os componentes

### Etapa 2.2 — Componentes Avançados (Mês 6)
**Entregas:**
- [ ] DataTable com sort, filter, pagination, selection
- [ ] Modal/Dialog com focus trap
- [ ] Toast/Notification stack
- [ ] DatePicker/TimePicker
- [ ] Tabs/Accordion
- [ ] Card/Layout components
- [ ] SearchBar com debounce
- [ ] FileUpload com drag-and-drop
- [ ] CommandPalette (Ctrl+K)
- [ ] EmptyState components
- [ ] Form components com validação visual
- [ ] Charts (line, bar, pie, donut)

**Critérios de Aceite:**
- DataTable com 10K rows < 200ms render
- Command palette busca em < 50ms
- Form validation com feedback inline

### Etapa 2.3 — Vue 3 SPA Migration (Mês 6-8)
**Entregas:**
- [ ] Vue 3 + Vite + Pinia setup
- [ ] Router com lazy loading
- [ ] Auth guard com MFA check
- [ ] Shell principal (sidebar, header, breadcrumbs)
- [ ] Migrar página de Login
- [ ] Migrar Dashboard com widgets
- [ ] Migrar Owners (list + detail + form)
- [ ] Migrar Patients (list + detail + form)
- [ ] Migrar Appointments (calendar view)
- [ ] Migrar Encounters (kanban + detail)
- [ ] Migrar Medical Records (timeline)
- [ ] Migrar Inpatient (bed board)
- [ ] Migrar Products/Inventory
- [ ] Migrar Billing/Cash Register

**Critérios de Aceite:**
- SPA carrega em < 2s (LCP)
- Navegação sem full page reload
- Estado preservado entre navegações

### Etapa 2.4 — UX Premium Features (Mês 8-9)
**Entregas:**
- [ ] Dark mode toggle com preferência do sistema
- [ ] Keyboard shortcuts globais (documentados)
- [ ] Skeleton loading em todas as listas
- [ ] Empty states informativos e acionáveis
- [ ] Micro-interações (transições suaves)
- [ ] Responsive design (mobile-friendly)
- [ ] Real-time updates via WebSocket (fila, notificações)
- [ ] Optimistic updates em ações rápidas
- [ ] In-app notifications (toast + sino)

**Critérios de Aceite:**
- LCP < 1.5s em todas as páginas
- FID < 100ms
- CLS < 0.1
- Dark mode em 100% das telas
- Keyboard navigation funcional

### Etapa 2.5 — PWA e Offline (Mês 9)
**Entregas:**
- [ ] Service Worker para cache
- [ ] Offline mode para operações críticas (triagem, cadastro básico)
- [ ] Sync automático quando conexão retorna
- [ ] Push notifications no celular
- [ ] Install prompt

**Critérios de Aceite:**
- App funciona sem internet por 30min em operações básicas
- Sync não perde dados

## Score Esperado ao Final da Onda 2

| Categoria | Antes | Depois |
|-----------|-------|--------|
| Frontend/Web | 40 | 85 (+45) |
| Design System/UX | 5 | 80 (+75) |
| Performance | 50 | 70 (+20) |
| Testes | 55 | 65 (+10) |
| **Score Global** | **58** | **72** |
