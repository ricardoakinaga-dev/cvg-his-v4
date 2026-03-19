# Especificação de Comportamentos de Integração

Este documento define como o Frontend (`apps/his-web`) deve se comportar em relação a eventos, atualizações de dados e observabilidade, dada a ausência de recursos de tempo real (WebSockets/SSE) na API atual.

## 1. Estratégia de Realtime (Polling)

Como a API é puramente REST e Stateless, todas as atualizações de tela devem ser baseadas em **Polling** (consulta periódica).

Recomendamos o uso de **TanStack Query (React Query)** ou **SWR** para gerenciar este polling de forma eficiente (revalidação no foco da janela, deduplicação de requests).

### Tabela de Intervalos de Polling (Recomendada)

| Funcionalidade / Tela | Periodicidade | Justificativa | Estratégia de Cache |
|---|---|---|---|
| **Mapa de Leitos (BedMap)** | `30s` | Alta rotatividade, visualização crítica. | `staleTime: 10s` |
| **Administração de Meds (MAR)** | `60s` | Enfermagem precisa ver novos agendamentos. | `staleTime: 30s` |
| **Lista de Alertas** | `30s` | Alertas críticos (atraso de medicação). | `staleTime: 15s` |
| **Prontuário (Timeline)** | `On Focus` | Atualizar ao abrir a aba ou focar na janela. | `staleTime: 5m` |
| **Detalhes de Atendimento** | `On Demand` | Atualizar apenas após ações (ex: alta). | `staleTime: Infinity` |

---

## 2. Tratamento de Eventos e Jobs Assíncronos

O sistema utiliza filas (BullMQ) para tarefas pesadas, mas **não fornece endpoint de status de job** para o cliente.

### Cenário: Publicação de Handover (`POST /handovers/:id/publish`)
1.  **Request**: O front envia o comando.
2.  **Response**: Recebe `{ job: { jobId: "..." }, status: "draft" }`.
3.  **Problema**: Não existe rota `GET /jobs/:id`.
4.  **Solução (Front-end)**:
    *   Exibir "Publicando...".
    *   Iniciar **Polling Agressivo** (ex: a cada 2s) na rota `GET /handovers/:id`.
    *   **Parar** quando `status` mudar para `published`.
    *   **Timeout**: Se não mudar em 30s, exibir erro "Demora na publicação".

### Cenário: Assinatura de Nota (`POST /notes/:id/sign`)
1.  **Response**: A API retorna o objeto de evento no corpo: `{ note: {...}, event: { name: "ClinicalNoteSigned", ... } }`.
2.  **Ação no Front**:
    *   NÃO precisa fazer polling.
    *   Use o objeto `event` recebido para exibir um **Toast de Sucesso**: *"Nota assinada com sucesso em [timestamp]"*.
    *   Atualize o cache local da nota com os dados de `note` recebidos na resposta.

---

## 3. Integração de Eventos do `packages/events`

Os eventos definidos em `@cvg-his/events` (`ClinicalNoteSigned`, etc.) são atualmente usados apenas como **Logs de Auditoria** ou **Retorno de Ação**. O Front-end não os "escuta", apenas os "recebe" como confirmação de uma operação bem-sucedida.

Não há mecanismo de "Alert Raised" (Push) para o front. A lista de alertas deve ser consultada via `GET /alerts`.

---

## 4. Regras de Invalidação de Cache

Ao implementar mutações, o Front-end deve invalidar chaves de cache específicas para garantir consistência imediata sem esperar o próximo polling.

| Mutação (Ação) | Chaves a Invalidar (Query Keys) |
|---|---|
| `createPatient` | `['patients', 'list']` |
| `admitPatient` | `['inpatient', 'stays']`, `['beds', 'map']`, `['wards']` |
| `dischargePatient` | `['inpatient', 'stays']`, `['beds', 'map']` |
| `signNote` | `['notes', id]`, `['encounters', id, 'timeline']` |
| `administerMedication` | `['meds', 'schedule']`, `['alerts']` |

---

## 5. Observabilidade e Rastreamento

Identificamos que a API espera e utiliza `requestContext.requestId`. O Front-end deve garantir que cada "sessão de uso" ou "ação" seja rastreável.

### Requisito Obrigatório
O cliente API (`src/lib/api.ts`) deve ser atualizado para injetar o header `x-request-id`.

*   **Padrão**: UUID v4.
*   **Comportamento**: Gerar um novo UUID a cada chamada `fetch`.
*   **Debug**: Em caso de erro 500, exibir este UUID para o usuário ("Erro ID: xxxxx") para facilitar o suporte.

---

## 6. Resumo da Estratégia

1.  **Adotar Polling**: Implementar SWR/React Query imediatamente. Não esperar por WebSockets.
2.  **Feedback Otimista**: Para Jobs, usar polling curto no recurso alvo.
3.  **Traceability**: Implementar geração de `UUID` no `x-request-id`.
4.  **Consistência**: Invalidar caches cruzados (ex: Alta de paciente afeta Mapa de Leitos).
