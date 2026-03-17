# UI Consistency Checklist

This document defines the UI/UX standards for the HIS Web application. All pages and components should follow these guidelines to ensure a consistent user experience.

> **Reference**: Based on [`his_web_estrategia_ux_ui.md`](./his_web_estrategia_ux_ui.md)

---

## 1. Design Tokens

All visual values should reference tokens from [`src/lib/theme.ts`](../apps/his-web/src/lib/theme.ts).

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `pageBg` | `#f8fafc` | Page background |
| `surface` | `#ffffff` | Cards, modals, inputs |
| `border` | `#e2e8f0` | Borders, dividers |
| `textPrimary` | `#0f172a` | Headings, primary text |
| `textSecondary` | `#475569` | Descriptions, labels |
| `primary` | `#0f172a` | Primary buttons, links |
| `danger` | `#b91c1c` | Error states, destructive actions |
| `success` | `#047857` | Success states |
| `warning` | `#b45309` | Warning states |
| `info` | `#1d4ed8` | Info states |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | `8px` | Tight spacing, inline gaps |
| `sm` | `12px` | Small padding |
| `md` | `16px` | Default padding |
| `lg` | `24px` | Section padding |
| `xl` | `32px` | Large sections |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | `8px` | Buttons, inputs |
| `md` | `12px` | Cards, modals |
| `full` | `9999px` | Badges, avatars |

---

## 2. Page States Checklist

Every list page and data-driven component MUST implement these states:

### ✅ Loading State

- [x] Shows [`LoadingState`](../apps/his-web/src/components/ui/LoadingState.tsx) component
- [x] Displays clear loading message (e.g., "Carregando pacientes...")
- [x] Uses `role="status"` and `aria-live="polite"` for accessibility
- [x] Prevents user interaction during loading

```tsx
{loading && <LoadingState message="Carregando..." />}
```

### ✅ Empty State

- [x] Shows [`EmptyState`](../apps/his-web/src/components/ui/EmptyState.tsx) component
- [x] Clear title explaining the empty state
- [x] Description with context (search term or general guidance)
- [x] Primary action button to create new item

```tsx
{!loading && data.length === 0 && (
    <EmptyState
        title="Nenhum paciente encontrado"
        description={query ? `Sem resultados para "${query}"` : "Cadastre o primeiro paciente."}
        action={<Button variant="primary">Criar Paciente</Button>}
    />
)}
```

### ✅ Error State

- [x] Shows [`ErrorBanner`](../apps/his-web/src/components/ui/ErrorBanner.tsx) component
- [x] Clear error message
- [x] Request ID for debugging (if available)
- [x] Retry button to attempt reload

```tsx
{error && (
    <ErrorBanner
        title="Erro ao carregar dados"
        message={error.message}
        requestId={error.requestId}
        onRetry={() => fetchData()}
    />
)}
```

---

## 3. Search Implementation Checklist

### ✅ Debounce

- [x] Search input uses debounce (300ms default)
- [x] Prevents API calls on every keystroke
- [x] Shows loading indicator during search

### ✅ Query Protection

- [x] Minimum query length enforced (2 characters default)
- [x] Shows hint when query is too short
- [x] Prevents API calls for short queries

```tsx
const minQueryLength = 2;
const isQueryTooShort = query.length > 0 && query.length < minQueryLength;

// Debounce effect
useEffect(() => {
    if (isQueryTooShort) return;
    
    const handler = setTimeout(() => {
        setDebouncedQuery(query);
    }, 300);
    
    return () => clearTimeout(handler);
}, [query, isQueryTooShort]);
```

### ✅ Search Input Component

- [x] Uses [`SearchInput`](../apps/his-web/src/components/ui/SearchInput.tsx) component
- [x] Clear button (X) to reset search
- [x] Escape key clears and blurs input
- [x] Shows minimum length hint

---

## 4. Action Buttons Checklist

### ✅ Primary Actions

- [x] Uses `variant="primary"` for main actions
- [x] Clear, action-oriented label (e.g., "Novo Paciente", "Salvar")
- [x] Positioned in page header or at end of form

### ✅ Secondary Actions

- [x] Uses `variant="secondary"` for cancel/alternative actions
- [x] Positioned to the left of primary actions
- [x] Less prominent styling

### ✅ Danger Actions

- [x] Uses `variant="danger"` for destructive actions
- [x] Requires confirmation for critical actions
- [x] Clear warning about consequences

### ✅ Loading State on Buttons

- [x] Shows `isLoading` prop during async operations
- [x] Disables button during loading
- [x] Shows spinner icon

```tsx
<Button variant="primary" isLoading={isSubmitting}>
    Salvar
</Button>
```

---

## 5. Accessibility Checklist

### ✅ Focus Management

- [x] All interactive elements are focusable
- [x] Visible focus ring on all focusable elements
- [x] Focus ring uses theme colors
- [x] Tab order follows logical flow

### ✅ Keyboard Navigation

- [x] Enter/Space activates buttons
- [x] Escape closes modals and clears search
- [x] Tab navigates between elements
- [x] Arrow keys for list navigation (when applicable)

### ✅ Screen Reader Support

- [x] All images have `alt` text
- [x] Icons have `aria-label` or `aria-hidden`
- [x] Form inputs have associated labels
- [x] Error messages linked via `aria-describedby`
- [x] Status messages use `role="status"` or `role="alert"`

### ✅ ARIA Attributes

```tsx
// Buttons
<Button aria-label="Criar novo paciente (Ctrl+N)">

// Inputs
<Input aria-label="Buscar pacientes" aria-invalid={hasError} />

// Status
<div role="status" aria-live="polite">

// Errors
<div role="alert" aria-live="assertive">
```

---

## 6. Page Layout Checklist

### ✅ Standard Layout

All list pages should use [`ListPageLayout`](../apps/his-web/src/components/ui/PageHeader.tsx):

```tsx
<ListPageLayout>
    <PageHeader title="Page Title" description="Description" actions={<Button>...</Button>} />
    
    {/* Search/Filter Section */}
    <Card><SearchInput ... /></Card>
    
    {/* States: Error, Loading, Empty, Content */}
    
    {/* Pagination */}
</ListPageLayout>
```

### ✅ Page Header

- [x] Clear title (h1)
- [x] Optional description
- [x] Primary action button in header
- [x] Consistent spacing

### ✅ Pagination

- [x] Uses [`Pagination`](../apps/his-web/src/components/ui/PageHeader.tsx) component
- [x] Shows current page and total pages
- [x] Previous/Next buttons
- [x] Disabled states for first/last page

---

## 7. Component Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| `LoadingState` | `components/ui/LoadingState.tsx` | Full-page loading indicator |
| `EmptyState` | `components/ui/EmptyState.tsx` | Empty data placeholder |
| `ErrorBanner` | `components/ui/ErrorBanner.tsx` | Error message display |
| `SearchInput` | `components/ui/SearchInput.tsx` | Search field with clear button |
| `PageHeader` | `components/ui/PageHeader.tsx` | Page title and actions |
| `ListPageLayout` | `components/ui/PageHeader.tsx` | Standard page container |
| `Pagination` | `components/ui/PageHeader.tsx` | Page navigation |
| `Button` | `components/ui/Button.tsx` | Action buttons |
| `Card` | `components/ui/Card.tsx` | Content containers |
| `Badge` | `components/ui/Primitives.tsx` | Status indicators |

---

## 8. Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl/Cmd + N` | New item | List pages |
| `Ctrl/Cmd + K` | Focus search | Global |
| `Escape` | Clear search/close modal | Global |
| `Enter` | Submit form | Forms |

---

## 9. Do's and Don'ts

### ✅ Do

- Use theme tokens instead of hardcoded values
- Implement all three states (loading, empty, error)
- Use semantic HTML elements
- Provide clear, actionable error messages
- Test keyboard navigation
- Use consistent spacing and typography

### ❌ Don't

- Hardcode colors or spacing values
- Skip loading states
- Use generic error messages ("An error occurred")
- Rely solely on color to convey information
- Forget to handle edge cases
- Use inline styles for complex components

---

## 10. Testing Checklist

Before deploying, verify:

- [x] All pages show loading state during data fetch
- [x] Empty states display correctly with action buttons
- [x] Error states show retry functionality
- [x] Search debounce works correctly
- [x] Minimum query length is enforced
- [x] All buttons are keyboard accessible
- [x] Focus rings are visible
- [x] Screen reader announces state changes
- [x] Pagination works correctly
- [x] No hardcoded colors or spacing

---

## 11. Implementation Status

### List Pages

| Page | Loading | Empty | Error | Search | Pagination | Keyboard |
|------|---------|-------|-------|--------|------------|----------|
| `/patients` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/clients` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/encounters` | ✅ | ✅ | ✅ | N/A* | ✅ | ✅ |

*Note: Encounters page filters by `patientId` URL param; general search not applicable.

### UI Components

| Component | Status | Notes |
|-----------|--------|-------|
| `LoadingState` | ✅ Implemented | With skeleton variant |
| `EmptyState` | ✅ Implemented | With action support |
| `ErrorBanner` | ✅ Implemented | With retry and variants |
| `SearchInput` | ✅ Implemented | With debounce and min length |
| `PageHeader` | ✅ Implemented | With breadcrumbs |
| `ListPageLayout` | ✅ Implemented | Standard container |
| `Pagination` | ✅ Implemented | Accessible navigation |
| `Button` | ✅ Implemented | All variants with loading |
| `Card` | ✅ Implemented | With hover states |
| `Badge` | ✅ Implemented | All status variants |

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-02-20 | Initial UI consistency checklist created |
| 2026-02-20 | Implemented standardized encounters page with loading/empty/error states |
| 2026-02-20 | Added keyboard shortcuts (Ctrl+N) to all list pages |
| 2026-02-20 | Verified all components follow theme tokens |
