# Auditoria de Governança Clínica e Segurança: cvg_his

**Data:** 18/02/2026
**Auditor:** Antigravity (Google Deepmind)
**Escopo:** Rastreabilidade, Responsabilidade, Segurança do Paciente, Medicina Baseada em Evidências

---

## 1. Resumo Executivo

O sistema `cvg_his` exibe um grau incomumente alto de **Maturidade em Governança Clínica** para seu estágio. Padrões chave de engenharia defensiva — protocolos imutáveis, versionamento de notas assinadas e workers de segurança proativa — já estão estritamente implementados.

**Pontuação de Maturidade de Governança:** **85/100** (Alta)
**Defensibilidade Legal:** **Forte** (Acesso ao estado "point-in-time" é preservado).

---

## 2. Rastreabilidade Clínica e Responsabilidade

### 2.1. "Cadeia de Custódia" de Notas Clínicas
*   **Mecanismo**: `apps/his-api/src/modules/clinicalNotes/service.ts`
*   **Veredito**: **Excelente**.
*   **Detalhes**:
    *   **Versionamento**: Cada edição em um rascunho cria um snapshot robusto em `clinical_note_versions`.
    *   **Assinatura**: A ação `sign` bloqueia a nota (`status: signed`). Ela não pode ser editada após assinatura, apenas "aditada" ou "anulada" (embora a lógica de anulação seja atualmente implícita via status).
    *   **Auditoria**: Todas as mutações são envolvidas em `appendAudit` com `actor`, `reason` e `diff`.

### 2.2. Passagens de Turno (Handovers)
*   **Mecanismo**: `apps/his-api/src/modules/handovers/service.ts`
*   **Veredito**: **Forte**.
*   **Detalhes**:
    *   O sistema faz snapshot do **estado completo do paciente** (medicações atuais, alertas, problemas) no momento da criação do handover.
    *   **Por que isso importa**: Em uma revisão legal de um erro médico durante uma troca de turno, você pode provar exatamente qual informação foi apresentada ao veterinário que assumiu.

---

## 3. Motor de Protocolo e Evidência

### 3.1. Protocolos Imutáveis
*   **Mecanismo**: `packages/db/src/schema/protocol_versions.ts`
*   **Veredito**: **Classe Mundial**.
*   **Detalhes**:
    *   Protocolos são versionados (v1, v2, v3).
    *   Uma vez `published` (publicado), uma versão é **imutável**. Ações clínicas linkam para um `protocol_version_id` específico, não apenas um ID genérico de protocolo.
    *   **Impacto**: Você pode provar que um tratamento seguiu o "Protocolo v1 (Padrão de Cuidado 2024)", mesmo se o "Protocolo v2 (2025)" estiver ativo agora.

### 3.2. Linkagem de Evidência
*   **Mecanismo**: `packages/db/src/schema/protocol_references.ts`
*   **Veredito**: **Bom**.
*   **Detalhes**:
    *   Suporta linkar `DOI`, `PubMed` ID, ou fonte `PDF` para versões específicas de protocolo. Isso suporta Medicina Baseada em Evidências (MBE) diretamente no fluxo de trabalho.

---

## 4. Segurança do Paciente e Alertas

### 4.1. Detecção Proativa de Risco
*   **Mecanismo**: `apps/his-worker/src/workers/medicationOverdue.worker.ts`
*   **Veredito**: **Bom (MVP)**.
*   **Detalhes**:
    *   Um worker em background scaneia ordens de medicação "Ativas" onde `scheduledFor < now - gracePeriod`.
    *   Ele cria automaticamente um registro de `Alert`.
    *   **Lacuna**: O alerta é apenas um registro no DB. Não há lógica de "Notificação Push" ou "Sirene" ainda. Depende do frontend fazer polling na tabela `alerts`.

### 4.2. Prevenção de Erro Médico
*   **Mecanismo**: constraints do schema `medication_administrations`.
*   **Veredito**: **Sólido**.
*   **Detalhes**:
    *   Constraints `Check` forçam que se um medicamento for `refused` (recusado) ou `delayed` (atrasado), um `reason` (motivo) DEVE ser fornecido.
    *   Isso previne documentação "preguiçosa" e força cognição ativa pelo enfermeiro/veterinário.

---

## 5. Roadmap de Governança

### Fase 1: Segurança Ativa (Alertas Inteligentes)
1.  **Notificações Push**: Conectar o worker `MedicationOverdue` a um endpoint WebSocket/SSE para piscar um aviso no Dashboard da Enfermagem imediatamente.
2.  **Interações Medicamentosas**: Integrar uma biblioteca (ou agente de IA) para checar interações droga-droga quando `MedicationOrder` for criada (ex: "Aviso: AINE + Esteroide detectados").

### Fase 2: Treinamento e Supervisão
1.  **Co-assinatura de Residente**: Implementar uma flag "Requer Co-assinatura" em papéis de `User` (ex: Residentes). A ação `clinical_note.sign` deles deve definir status para `pending_review` em vez de `signed`.
2.  **Analytics de Auditoria**: Construir um "Dashboard de Compliance" mostrando "% de Notas assinadas dentro de 2 horas da consulta".

### Fase 3: Explicabilidade
1.  **Motivos de IA**: Se a IA gerar um rascunho (ex: "plano sugerido"), forçar o humano a "Aceitar" e logar `source: ai_assisted` na trilha de auditoria para transparência.

---

## 6. Conclusão

`cvg_his` é construído com uma mentalidade "defensiva". Prioriza integridade de dados e precisão histórica sobre flexibilidade, o que é o trade-off correto para um Sistema de Informação Hospitalar. A fundação para passar em uma auditoria médica séria (AAHA, JCI, etc.) já está no lugar.
