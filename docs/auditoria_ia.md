# Auditoria de Prontidão para IA e RAG: cvg_his

**Data:** 18/02/2026
**Auditor:** Antigravity (Google Deepmind)
**Escopo:** Arquitetura, Estrutura de Dados, Prontidão de Integração (LLM/RAG)

---

## 1. Resumo Executivo

`cvg_his` é **"Pronto em Dados" mas "Vazio em Código"** com relação à IA.
A arquitetura de dados (Protocolos Imutáveis, Notas Clínicas Estruturadas, Resumos de Paciente) é efetivamente uma **"Mina de Ouro" para RAG**, estruturada adequadamente para alimentar contexto de alta qualidade para um LLM. No entanto, há **zero implementação** de drivers reais de IA (clientes OpenAI/Anthropic, conexões Vector DB, ou agentes lógicos).

**Pontuação de Maturidade de IA:** **30/100** (Apenas Fundacional de Dados).
**Potencial:** **Muito Alto**. A parte difícil (dados estruturados, limpos, imutáveis) já está feita.

---

## 2. Lacunas de Infraestrutura

### 2.1. Banco de Dados Vetorial
*   **Status**: **Latente**.
*   **Achado**: `packages/db/src/schema/protocol_references.ts` define um `ref_type` de `'qdrant_chunk'`, sugerindo a *intenção* de usar Qdrant.
*   **Lacuna**: Não há cliente Qdrant, lógica de embedding, e nem "Pipeline de Ingestão" para popular esses chunks a partir do texto do protocolo.

### 2.2. Integração LLM
*   **Status**: **Ausente**.
*   **Achado**: Nenhuma dependência `openai`, `anthropic`, ou `langchain` no `package.json`.
*   **Impacto**: O sistema não pode atualmente realizar nenhuma tarefa gerativa (Resumos, Chatbots, Suporte à Decisão).

---

## 3. Aptidão dos Dados para IA (Pontos Fortes)

### 3.1. O Motor de Protocolo como Fonte de Grounding
*   **Ponto Forte**: Protocolos são **versionados** e **imutáveis**.
*   **Por que isso importa**: Este é o *Santo Graal* para RAG Médico. Você pode basear a resposta da IA no "Protocolo v3.2 (Aprovado pelo Dr. House)" e ter 100% de certeza que a IA não está alucinando uma regra que não existia naquela versão.
*   **Potencial RAG**: Excelente. Você pode construir um "Copiloto Clínico" que cita nós específicos de protocolo com alta confiança.

### 3.2. Janela de Contexto do Paciente
*   **Ponto Forte**: `getPatientSummary` agrega todos os domínios chave (Demográficos, Alertas, Log de Auditoria recente) em um único objeto.
*   **Otimização Necessária**: A saída atual é JSON cru. Para uma Janela de Contexto de LLM, isso precisa de um transformador "Compactador de Tokens" (ex: converter objetos profundos em bullets concisos de linguagem natural) para economizar custos e espaço de input.

---

## 4. Roadmap Estratégico de Integração

### Fase 1: O Copiloto "Passivo" (RAG)
1.  **Infraestrutura**: Adicionar `qdrant-client` e `openai` (ou `langchain`).
2.  **Pipeline**: Criar um job worker `protocol_embed.worker.ts` que:
    *   Escuta eventos `ProtocolPublished`.
    *   Divide o `content_json` em chunks.
    *   Gera embeddings dos chunks (usando `text-embedding-3-small`).
    *   Faz upsert no Qdrant com payload `{ protocol_id, version_id, node_id }`.
3.  **Feature**: Barra de busca "Pergunte ao Protocolo" na UI.

### Fase 2: O Assistente "Ativo" (Agentes)
1.  **Agente de Resumo de Alta**:
    *   Gatilho: `EncounterClosed`.
    *   Ação: LLM lê `Encounters`, `ClinicalNotes`, `MedicationOrders`.
    *   Saída: Gera um rascunho de "Resumo de Alta" em PDF para o veterinário revisar.
2.  **Ajudante de Handovers**:
    *   Ação: Resumir as últimas 12h de `AuditLogs` em um "Resumo de Turno" de 3 pontos para a nota de Handover.

---

## 5. Avaliação de Risco

*   **Risco de Alucinação**: **Baixo** (se RAG for usado). A estrutura rígida de Protocolo permite "Grounding Estrito".
*   **Vazamento de Dados**: **Risco Crítico**. Passar Dados de Paciente para API da OpenAI requer um BAA (Business Associate Agreement) para compliance HIPAA.
    *   *Mitigação*: Usar Azure OpenAI (instâncias Privadas) ou anonimizar estritamente PII (Nome do Paciente -> "Paciente X") antes de enviar para APIs públicas.

---

## 6. Posicionamento Competitivo

Comparado a PIMS Veterinários existentes (Sistemas de Gestão de Prática):
*   **Maioria dos PIMS**: Bancos de dados SQL monolíticos com notas em texto livre bagunçadas. Difícil de adicionar IA.
*   **cvg_his**: Estruturado, Event-Driven, Modular.
*   **Veredito**: `cvg_his` está posicionado para ultrapassar competidores adicionando features de IA *mais rápido* e *com mais segurança* devido à sua arquitetura de dados superior.
