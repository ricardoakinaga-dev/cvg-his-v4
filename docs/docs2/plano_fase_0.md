# Plano de Execução - Fase 0: Fundação (Front-End)

Este plano define as etapas para estabelecer uma base sólida no `apps/his-web`, garantindo consistência e preparo para escala, **SEM quebrar** as funcionalidades atuais ou introduzir novas tecnologias complexas (Tailwind/Shadcn) neste momento.

## 1. Relatório de Auditoria (Estado Atual)

### Arquivos Críticos Identificados
- **Auth**: `src/lib/auth.ts` (Cookie `his_token`, localStorage `his_auth_session`).
- **API**: `src/lib/api.ts` (Cliente fetch centralizado, tipos manuais).
- **Middleware**: `src/middleware.ts` (Proteção de rotas).
- **Entry**: `src/app/layout.tsx` (Container max-width 1200px, Topbar hardcoded).
- **Login**: `src/app/login/page.tsx` (Formulário manual, sem integração real de Identity Provider).

### Padrões de Estilo (Inline Styles)
Detectamos **duplicação massiva** de valores visuais hardcoded:
- **Cor Primária**: `#0f172a` (Slate 900) - Usado em Botões, Topbar, Títulos.
- **Cor de Fundo**: `#f8fafc` (Slate 50) e Gradient no Layout.
- **Bordas**: `#e2e8f0` ou `#cbd5e1`.
- **Espaçamento**: `padding: 24px`, `gap: 8px`.

### Variáveis de Ambiente
O sistema depende de:
- `NEXT_PUBLIC_HIS_API_BASE_URL` (com fallback para `http://localhost:3000`).
- `PORT` (usado no start script).

---

## 2. Plano de Execução

### Etapa 1: Design Tokens (Centralização)
**Objetivo**: Eliminar "Magic Strings/Numbers" nos estilos inline.
1.  Criar `src/lib/theme.ts`.
2.  Definir constantes para Cores, Espaçamentos e Bordas.
    ```typescript
    export const theme = {
      colors: {
        primary: '#0f172a',
        background: '#f8fafc',
        surface: '#ffffff',
        border: '#e2e8f0',
        danger: '#b91c1c',
        success: '#047857'
      },
      spacing: {
        s: 8,
        m: 16,
        l: 24
      },
      borderRadius: {
        m: 8,
        l: 12
      }
    };
    ```
3.  **Não sair refatorando tudo agora**. Apenas crie o arquivo.

### Etapa 2: Type-Safe API Client
**Objetivo**: Usar o contrato gerado (`openapi-lite.ts`) para garantir tipagem forte.
1.  Instalar/Verificar `@cvg-his/domain` nas dependências do `package.json` (Recomendado).
2.  Criar `src/lib/client.ts` (Novo cliente).
3.  Este cliente deve usar `apiFetch` internamente, mas expor métodos tipados conforme o `ApiContract`.
    ```typescript
    // Exemplo
    export const apiClient = {
      patients: {
        create: (data: PatientCreateDto) => apiFetch('/patients', { method: 'POST', body: data })
      }
    };
    ```

### Etapa 3: Refatoração de Componentes (Progressiva)
**Objetivo**: Começar a usar o `theme.ts` e novos padrões.
1.  **Button**: Criar componente `src/components/ui/Button.tsx`.
    - Substituir todos os `<button style={{...}}>` dispersos.
2.  **Input**: Criar componente `src/components/ui/Input.tsx`.
    - Padronizar bordas e padding.
3.  **Layout**: Atualizar `src/app/layout.tsx` para usar variáveis do tema.

### Etapa 4: Padronização de Auth & User Context
**Objetivo**: Garantir que o usuário sempre tenha unidade/papel definidos.
1.  Criar um `AuthProvider` (React Context) em `src/providers/AuthProvider.tsx`.
2.  Mover a lógica de leitura de sessão (`getAuthSession`) para este contexto.
3.  Expor `useAuth()` para que componentes não precisem importar `lib/auth.ts` diretamente.

---

## 3. Riscos e Mitigação

| Risco | Mitigação |
|---|---|
| **Quebra de Layout** | Testar visualmente cada componente refatorado (Button, Input). |
| **Auth Falhar** | Manter `auth.ts` como fallback até o `AuthProvider` estar 100% estável. |
| **Conflito de Merge** | Fazer refatorações em arquivos isolados (um componente por vez). |

## 4. Critérios de Aceitação (Definition of Done)

- [ ] `src/lib/theme.ts` existe e contém as cores padrão.
- [ ] `src/components/ui/Button.tsx` é usado na tela de Login e na Topbar.
- [ ] Login continua funcionando (cria cookie `his_token`).
- [ ] Nenhuma funcionalidade existente (BedMap, MAR) foi removida ou quebrada.
- [ ] O código passa no `npm run lint` e `npm run build`.

---

## Próximo Passo Imediato
Executar a **Etapa 1 (Design Tokens)** e **Etapa 3 (Componente Button)** para validar a estratégia de "Inline Styles Centralizados".
