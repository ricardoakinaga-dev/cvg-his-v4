# Fase 5: MAR Optimization (Otimização do MAR)

Esta fase focou na melhoria da experiência de uso do **Medication Administration Record (MAR)** para o contexto de internação, visando produtividade, segurança e agilidade para a equipe de enfermagem.

## O Que Foi Entregue

1.  **Novo Fluxo de Navegação (/inpatient/mar)**
    -   Seleção hierárquica: **Ala -> Paciente -> MAR**.
    -   **Ward Selector:** Permite trocar de ala rapidamente.
    -   **Stay Selector:** Lista lateral com todos os pacientes da ala.
    -   **Deep Linking:** Suporte a query strings `?wardId=...&stayId=...` para abrir o MAR diretamente focado.

2.  **Ward Overview (Visão Geral da Ala)**
    -   A lista de pacientes na lateral exibe **badges** indicando doses:
        -   🔴 Vencidas (Overdue)
        -   🔵 Próximas (Upcoming)
    -   Permite ao enfermeiro identificar rapidamente quem precisa de atenção sem abrir cada prontuário.

3.  **MedDueList Otimizado**
    -   **Filtros Locais:** Busca por nome, filtro por via e frequência, e toggle "Apenas Vencidas".
    -   **Agrupamento:** Doses agrupadas por paciente (preparado para visão de ala completa).
    -   **Ação Rápida:** Botão "Administrar Agora" com confirmação *inline* (sem modal) para checagens simples.
    -   **Tratamento de Conflito:** Feedback claro para erro 409 (dose já checada) com auto-refresh.

4.  **Auto-Refresh & Polling**
    -   Toggle para ativar/desativar atualização automática.
    -   Intervalos configuráveis (30s, 60s, 120s).
    -   **Smart Pause:** O refresh pausa automaticamente se o usuário estiver interagindo (modal aberto ou confirmando ação) para não perder contexto.

5.  **Reforço de Segurança (Hardening)**
    -   Validação de permissão `medadmin.read` no nível da página (`MarConsole`).
    -   Exibição de "Acesso Negado" amigável impedindo carregamento de dados sensíveis.

## Rotas Afetadas

-   `/inpatient/mar`: Painel Principal de Administração.
-   `/inpatient/bedmap`: Mapa de Leitos (adicionado botão de atalho para MAR).
-   `/inpatient/stays/[id]`: Detalhes da Internação (adicionado botão de atalho para MAR).

## Endpoints Integrados

A integração foi realizada utilizando os seguintes métodos do cliente API (`src/lib/api.ts`):

-   `getWards`: Listagem de alas para o seletor.
-   `listInpatientStays`: Listagem de pacientes ativos na ala (para a sidebar).
-   `getMedicationDueDoses`: Busca de doses agendadas (Vencidas e Futuras) com janela de tempo.
-   `listMedicationAdministrations`: Histórico recente de administrações.
-   `createMedicationAdministration`: Registro de checagem (Administrar, Recusar, Atrasar).

## Comportamento Novo

-   **Seleção de Ala:** Ao entrar sem parâmetros, o sistema pede a seleção de ala.
-   **Fallback de Navegação:** Ao trocar de ala, a seleção de paciente é limpa automaticamente para evitar inconsistência.
-   **Feedback Visual:** Badges de contagem na lista de pacientes são atualizados periodicamente (overlap com auto-refresh).
