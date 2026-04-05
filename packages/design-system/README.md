# CVG-HIS-V2 Design System

> Foundation for enterprise-grade UI consistency across the CVG-HIS-V2 platform.

## Architecture

```
packages/design-system/
├── src/
│   ├── tokens/
│   │   ├── index.ts          ← TypeScript token definitions (colors, spacing, etc.)
│   │   └── variables.css     ← CSS Custom Properties (single source of truth)
│   ├── themes/
│   │   └── index.ts          ← Light/dark theme objects + CSS generator
│   └── components/
│       ├── index.ts          ← Re-exports all components
│       ├── button.ts         ← Button HTML generator
│       ├── input.ts          ← Input/Textarea/Select HTML generators
│       ├── display.ts        ← Card/Badge/Alert/Spinner HTML generators
│       ├── data-table.ts     ← DataTable HTML generator
│       ├── modal.ts          ← Modal/Dialog HTML generators
│       ├── toast.ts          ← Toast/ToastStack HTML generators
│       ├── tabs.ts           ← Tabs HTML generator
│       ├── empty-state.ts    ← EmptyState HTML generator
│       ├── search-bar.ts     ← SearchBar HTML generator
│       ├── pagination.ts     ← Pagination HTML generator
│       ├── command-palette.ts ← CommandPalette HTML generator
│       └── styles.css        ← Component CSS styles (all components)
└── package.json
```

## Design Tokens

### Colors

| Category | Scale  | Example                        |
| -------- | ------ | ------------------------------ |
| Primary  | 50–900 | `--color-primary-600: #2563eb` |
| Accent   | 50–900 | `--color-accent-600: #0d9488`  |
| Semantic | 50–700 | `--color-success-500: #10b981` |
| Neutral  | 0–950  | `--color-neutral-500: #64748b` |

### Spacing (4px Grid)

| Token       | Value | Use Case         |
| ----------- | ----- | ---------------- |
| `--space-1` | 4px   | Tight gaps       |
| `--space-2` | 8px   | Small padding    |
| `--space-4` | 16px  | Standard padding |
| `--space-6` | 24px  | Card padding     |
| `--space-8` | 32px  | Section gaps     |

### Typography

| Token   | Value                  |
| ------- | ---------------------- |
| Font    | Inter (Google Fonts)   |
| Base    | 15px (0.9375rem)       |
| Scale   | xs (12px) → 4xl (36px) |
| Weights | 400, 500, 600, 700     |

## Components

### Base Components (Fase 1)

| Component    | Variants                                | States                          |
| ------------ | --------------------------------------- | ------------------------------- |
| **Button**   | primary, secondary, danger, ghost       | hover, focus, disabled, loading |
| **Input**    | text, email, password, etc.             | hover, focus, error, disabled   |
| **Textarea** | —                                       | hover, focus, error, disabled   |
| **Select**   | —                                       | hover, focus, error, disabled   |
| **Card**     | default, elevated, glass                | —                               |
| **Badge**    | default, success, warning, danger, info | dot variant                     |
| **Alert**    | info, success, warning, danger          | dismissible                     |
| **Spinner**  | sm, md, lg                              | —                               |

### Advanced Components (Etapa 2.2)

| Component          | Features                                                                 | ARIA                                                      |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| **DataTable**      | headers, rows, sort indicators, striped, compact, hoverable, empty state | caption (sr-only), aria-sort                              |
| **Modal**          | header/body/footer, sizes (sm/md/lg/xl), open state                      | role="dialog", aria-modal, aria-labelledby                |
| **Dialog**         | confirmation pattern, variants (default/danger/warning)                  | role="dialog", aria-modal                                 |
| **Toast**          | 4 variants, title, dismissible, stack with positions                     | role="status", aria-live="polite"                         |
| **Tabs**           | nav + panels, active state, disabled tabs                                | role="tablist/tab/tabpanel", aria-selected, aria-controls |
| **EmptyState**     | icon, title, description, action                                         | role="status"                                             |
| **SearchBar**      | search input, icon, action button                                        | role="search", sr-only label                              |
| **Pagination**     | page info, prev/next, page buttons, ellipsis                             | aria-label, aria-current="page"                           |
| **CommandPalette** | search, grouped items, icons, shortcuts, keyboard hints                  | role="dialog", aria-modal, role="listbox/option"          |

## Accessibility

- All interactive elements have `aria-label`
- Error states use `aria-invalid` + `aria-describedby` + `role="alert"`
- Focus visible uses `box-shadow` (not outline) for consistency
- Touch targets minimum 44px (`--touch-min`)
- Screen reader text via `.sr-only` class
- Semantic HTML elements (`<button>`, `<label>`, `<select>`, `<nav>`, `<table>`)
- DataTable uses `aria-sort` for column sort state
- Tabs use proper `role="tablist/tab/tabpanel"` pattern
- Toast uses `aria-live="polite"` for screen reader announcements
- Pagination uses `aria-current="page"` for active page
- CommandPalette uses `role="listbox"` with `role="option"` items

## Dark Mode

Themes are defined as TypeScript objects (`lightTheme`, `darkTheme`) and can be converted to CSS via `generateThemeCSS()`. The CSS variables approach allows runtime theme switching by updating `:root` or applying a `[data-theme="dark"]` selector.

## Usage in SSR (Current Web App)

```typescript
import { renderButton, renderCard, renderInput, renderDataTable } from '@cvg-his-v2/design-system';

function renderMyPage(): string {
  return `
    ${renderCard({
      title: 'Form',
      children: `
      ${renderInput({ id: 'name', label: 'Name', required: true })}
      ${renderButton({ label: 'Submit', type: 'submit' })}
    `
    })}
  `;
}
```

### DataTable Example

```typescript
renderDataTable({
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'amount', label: 'Amount', align: 'right' }
  ],
  rows: [
    { name: 'John', status: 'Active', amount: 100 },
    { name: 'Jane', status: 'Inactive', amount: 200 }
  ],
  striped: true,
  hoverable: true,
  sortColumn: 'name',
  sortDirection: 'asc'
});
```

### Modal Example

```typescript
renderModal({
  id: 'edit-patient',
  title: 'Edit Patient',
  children: '<form>...</form>',
  footer: `
    ${renderButton({ label: 'Cancel', variant: 'secondary' })}
    ${renderButton({ label: 'Save', variant: 'primary', type: 'submit' })}
  `,
  size: 'lg',
  open: true
});
```

### Tabs Example

```typescript
renderTabs({
  tabs: [
    { id: 'info', label: 'Information' },
    { id: 'history', label: 'History' },
    { id: 'documents', label: 'Documents' }
  ],
  panels: {
    info: '<p>Patient details...</p>',
    history: '<p>Visit history...</p>',
    documents: '<p>Attached documents...</p>'
  },
  activeTab: 'info'
});
```

## Future: Vue 3 SPA

When migrating to Vue 3, the token values and component APIs map directly:

| Design System           | Vue 3 Equivalent                   |
| ----------------------- | ---------------------------------- |
| `renderButton(props)`   | `<DsButton v-bind="props" />`      |
| CSS variables           | Same CSS variables in `:root`      |
| TypeScript interfaces   | Same interfaces as component props |
| `variant`, `size` enums | Same prop types                    |

## What's Next (Onda 2)

- Etapa 2.3: Vue 3 + Vite + Pinia SPA setup
- Storybook configuration
- axe-core accessibility testing
- Tenant-specific theming
- Advanced interactions (focus trap in modals, keyboard navigation in tabs/command palette)
