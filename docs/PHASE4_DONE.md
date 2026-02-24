# Fase 4: Prescrição no Atendimento (Encounter) - Concluída

## O que foi entregue
- **Tab Prescrição**: Nova aba `?tab=meds` na página de detalhes do atendimento (`/encounters/[id]`).
- **Painel de Prescrição Integrado**: Reutilização do componente `MedOrdersPanel` com filtro por `encounterId`, garantindo que as ordens sejam vinculadas corretamente ao contexto do atendimento.
- **Resumo e Exportação**:
  - Funcionalidade "Copiar resumo" que gera um texto formatado de todas as ordens ativas.
  - Modal "Resumo da Prescrição" otimizado para visualização e cópia.
  - **Registro como Documento**: Capacidade de registrar administrativamente o resumo gerado como um documento na timeline do atendimento, sem necessidade de upload de arquivo físico.
- **Navegação Rápida**:
  - Badge no Header: Indica o número de prescrições ativas e permite navegação direta.
  - Botões de Atalho: Navegação fluida entre SOAP e Prescrição.
  - Teclas de Atalho: `Alt+1` a `Alt+5` para alternar entre abas (Resumo, SOAP, Prescrição, Documentos, Timeline).
- **Controle de Acesso (RBAC)**:
  - Harmonização de permissões com `ROLE_PERMISSIONS`.
  - Exibição de "Card de Acesso Negado" para usuários sem permissão `medorder.read`.
  - Mensagens de erro com suporte a `Request ID`.

## Rotas Afetadas
- `/encounters/[id]?tab=meds`: Nova rota virtual para gerenciamento de prescrições no atendimento.
- `/encounters/[id]?tab=documents`: Destino automático após registrar o resumo da prescrição.

## Endpoints Utilizados (src/lib/api.ts)
- `listMedicationOrders`: Listagem de ordens ativas e contagem para o badge.
- `createMedicationOrder`: Criação de novas prescrições.
- `updateMedicationOrder`: Edição de prescrições existentes.
- `stopMedicationOrder`: Suspensão de ordens.
- `createDocument`: Criação do registro lógico do documento de resumo.
- `attachDocumentToEncounter`: Vínculo do documento gerado ao atendimento atual.
