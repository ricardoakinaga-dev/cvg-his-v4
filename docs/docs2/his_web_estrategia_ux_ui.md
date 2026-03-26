# Estratégia de UI/UX e Consistência Visual

Este documento analisa o estado atual da interface do `apps/his-web` e define regras para garantir consistência e usabilidade hospitalar.

## 1. UI Compatibility Rules

### Design System Inexistente (Inline Styles)
Atualmente, a aplicação **NÃO utiliza** Tailwind, CSS Modules ou Styled Components. Todo o estilo é aplicado via prop `style={{ ... }}`.

> [!WARNING]
> **Decisão Crítica**: Para manter o padrão atual sem refatoração massiva, novos componentes devem continuar usando **Inline Styles** ou migrar tudo para Tailwind de uma vez.
> *Recomendação*: **Manter Inline Styles** por enquanto para não quebrar a consistência com o legado, mas criando constantes de design (tokens) em arquivo separado.

### Tokens Visuais (Hardcoded detectados)
Identificamos os seguintes valores repetidos (devem ser extraídos para `src/lib/theme.ts`):
- **Cores**:
  - Background Page: `#f8fafc` (Slate 50)
  - Surface: `#ffffff`
  - Border: `#e2e8f0` (Slate 200)
  - Text Primary: `#0f172a` (Slate 900)
  - Text Secondary: `#475569` (Slate 600)
  - Primary Action: `#0f172a` (Preto/Azul escuro)
  - Danger: `#b91c1c` (Red 700) / Background `#fee2e2` (Red 100)
  - Success: `#047857` (Emerald 700) / Background `#dcfce7` (Emerald 100)
- **Espaçamento**: `8px`, `12px`, `16px`, `24px`.
- **Border Radius**: `8px` (botoes), `12px` (cards).

---

## 2. Component Inventory (`src/components/`)

| Componente | Função | Estado / Obs |
|---|---|---|
| `Topbar` | Navegação Global | Usa `usePathname` para esconder no login. Hardcoded links. |
| `BedMap` | Mapa Visual de Leitos | Lógica complexa de layout. Principal tela da enfermagem. |
| `BedCard` | Card individual do leito | Mostra status, paciente e ações (Admitir, Alta, Transferir). |
| `PatientForm` | Cadastro de Paciente | Formulário longo. Validado com Zod. |
| `OwnerForm` | Cadastro de Tutor | Modais ou páginas dedicadas? (Página). |
| `Handover*` | Gestão de Plantão | Editor rico (`HandoverEditor`), itens (`HandoverItemEditor`). |
| `Med*` | Prescrição Eletrônica | `MedOrderForm`, `MedDueList` (MAR), `MedOrdersPanel`. |
| `SearchBar` | Busca Global | Componente isolado na Topbar. |
| `*Modal` | Diálogos de Ação | `AdmitModal`, `DischargeModal`, `TransferModal`. Padrão de portal? |

---

## 3. Mapa de Rotas (`src/app/`)

- `/login`: Tela de entrada (token manual).
- `/`: Dashboard / Home (provavelmente redireciona ou lista actions).
- `/patients`: Listagem de pacientes.
  - `/patients/[id]`: Detalhes do paciente (Prontuário).
  - `/patients/new`: Cadastro.
- `/owners`: Gestão de Tutores.
- `/encounters`: Histórico de atendimentos?
- `/inpatient`: Módulo de Internação.
  - `/inpatient/bedmap`: Mapa de Leitos (Core).
  - `/inpatient/handovers`: Passagem de plantão.
  - `/inpatient/mar`: Electronic Medication Administration Record (Checagem).

**Faltam (Lacunas Identificadas)**:
- Tela de **Configurações/Perfil**.
- Tela de **Protocolos** (Visualização e Edição).
- Tela de **Auditoria** (Logs do sistema).
- **Notificações**: Central de alertas não identificada como rota.

---

## 4. UX Must-haves (Requisitos Hospitalares)

### 1. "Recepção em 60 Segundos"
- O cadastro de Tutor + Paciente deve ser otimizado.
- **Hoje**: Forms separados?
- **Meta**: Fluxo unificado ou "Cadastro Rápido" (Modal) para emergências.

### 2. Densidade de Informação
- Telas como **BedMap** e **MAR** devem exibir muita informação sem rolagem excessiva.
- **Regra**: Evitar padding exagerado (ex: > 24px) em listas longas.
- **Fontes**: Manter tamanhos legíveis (14px base), mas usar compactação em tabelas.

### 3. Atalhos e Navegação
- Profissionais usam teclado.
- Focam em campos de busca (`/`) e confirmação (`Ctrl+Enter`).
- **Ação**: Mapear `hotkeys` para ações principais (Salvar notas, buscar paciente).

### 4. Responsividade
- O uso primário é **Desktop/Tablet** (Postos de Enfermagem).
- Mobile é secundário (Veterinário no consultório?), mas o `BedMap` deve ser "scrollável" horizontalmente se necessário.

---

## 5. Plano de Ação UI

1.  **Criar `src/lib/theme.ts`**: Centralizar as cores hardcoded encontradas nos componentes.
2.  **Refatorar Componentes Chave**: Atualizar `Button`, `Input` e `Card` para usar o tema.
3.  **Padronizar Layouts**: Garantir que todas as telas usem o `Container` centralizado (visto no `layout.tsx`).
