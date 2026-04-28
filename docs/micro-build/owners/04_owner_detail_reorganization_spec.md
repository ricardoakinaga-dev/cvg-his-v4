# Especificação de Reorganização Futura

Objetivo: reorganizar a tela sem mudar regra de negócio na primeira fase. A tela deve virar um hub operacional do tutor, com dados críticos no topo e módulos secundários recolhidos.

## Blocos propostos

| Bloco | Objetivo | Dados exibidos | Ações disponíveis | Prioridade | Visibilidade |
|---|---|---|---|---|---|
| Header do tutor | Identificar tutor e ações principais | Nome, status, responsável financeiro, contato primário, ID Vetus quando relevante | Editar, voltar, ação principal contextual | Alta | Sempre |
| Alertas críticos | Evitar ação insegura | Inativo, sem contato, financeiro em aberto, documento ausente | Editar cadastro, abrir financeiro, cadastrar contato | Alta | Sempre quando houver |
| Resumo rápido | Dar leitura de 10 segundos | Pets ativos, próximo agendamento, atendimento aberto, pendência financeira, contato principal | Abrir bloco relacionado | Alta | Sempre |
| Pets vinculados | Entrar no fluxo clínico | Lista de pets, espécie, raça, status, alerta básico | Abrir ficha, iniciar atendimento, agendar, abrir comanda contextual | Alta | Sempre |
| Histórico recente | Retomar operação | Últimos atendimentos e próximos agendamentos | Abrir atendimento/agendamento, ver todos filtrados | Média | Sempre, compacto |
| Financeiro | Consolidar dinheiro | Saldo, pendência, crédito, comandas, orçamentos ativos | Abrir financeiro filtrado, abrir orçamentos, criar orçamento com confirmação | Média | Aba ou accordion aberto se houver pendência |
| Comunicação | Contato e régua de relacionamento | WhatsApp, telefone, e-mail, preferência SMS, templates como rascunho | Abrir WhatsApp, copiar telefone/e-mail, ir ao hub | Média | Sempre compacto; detalhes em accordion |
| Documentos | Evidências do tutor | Anexos/documentos vinculados | Ver, anexar, remover com confirmação | Baixa/Média | Aba ou accordion |
| Observações internas | Contexto operacional | `administrativeNotes`, últimas notas internas | Editar observação, ver histórico | Média | Sempre compacto |
| Auditoria/logs | Rastreabilidade | Criação, edição, ações recentes | Ver logs, filtrar por entidade | Baixa | Aba técnica/accordion |

## Layout recomendado

### Topo

1. Header do tutor.
2. Alertas críticos.
3. Resumo rápido em uma linha de cards compactos.
4. Ações primárias consolidadas.

### Corpo principal

1. Pets vinculados.
2. Histórico recente.
3. Financeiro.
4. Comunicação.

### Corpo secundário

1. Cadastro completo em accordion.
2. Documentos.
3. Observações internas.
4. Auditoria/logs.

## Regras de prioridade visual

- `Inativo`, `sem contato` e `financeiro em aberto` devem aparecer antes de ações comerciais.
- Pets devem aparecer antes de CRM/pacotes.
- Contato deve estar disponível sem rolagem longa.
- Dados administrativos e importação Vetus devem ficar em bloco secundário.
- Recomendações comerciais não devem parecer alertas clínicos ou financeiros.

## Estados esperados por bloco

| Bloco | Loading | Vazio | Erro |
|---|---|---|---|
| Header | Skeleton curto | Não aplicável | Erro global se tutor não carregar |
| Alertas | Sem skeleton próprio | Oculto se sem alertas | Não aplicável |
| Resumo rápido | Skeleton de métricas | `Sem dados suficientes` | Indicar módulos indisponíveis |
| Pets | Skeleton de lista | `Nenhum animal cadastrado` + CTA | Erro parcial com retry |
| Histórico | Skeleton de timeline | `Nenhum atendimento/agendamento` + CTA | Erro parcial com retry |
| Financeiro | Skeleton compacto | `Sem pendências` | Erro parcial sem bloquear página |
| Comunicação | Skeleton curto | `Nenhum contato cadastrado` + CTA editar | Erro parcial se preferências falharem |
| Documentos | Skeleton de lista | `Nenhum documento anexado` | Erro parcial |
| Observações | Skeleton de texto | `Sem observações internas` | Erro parcial |
| Auditoria | Skeleton de timeline | `Sem eventos recentes` | Erro parcial |

## Ações por bloco

### Header do tutor

- Editar cadastro.
- Voltar para lista.
- Ação principal recomendada: precisa validação. Sugestão: manter apenas `Editar Cadastro` e mover criação operacional para `Ações`.

### Pets vinculados

- Abrir ficha do pet: `/patients/:id`.
- Novo pet: `/patients/new?ownerId=:ownerId`.
- Agendar para pet: `/appointments/new?ownerId=:ownerId&patientId=:patientId`.
- Iniciar atendimento: `/encounters/new?ownerId=:ownerId&patientId=:patientId`.
- Abrir comanda contextual: precisa validação de rota final.

### Histórico recente

- Abrir atendimento.
- Abrir agendamento.
- Ver todos filtrados por tutor.

### Financeiro

- Abrir financeiro filtrado por tutor.
- Abrir comandas/vendas filtradas por tutor.
- Abrir orçamentos filtrados por tutor.
- Criar orçamento somente com confirmação.

### Comunicação

- Abrir WhatsApp com rascunho revisável.
- Copiar telefone/e-mail.
- Abrir hub WhatsApp.
- Registrar preferência/consentimento: precisa validação.

### Documentos

- Ver documentos.
- Anexar documento.
- Remover/anular documento com confirmação: precisa validação.

### Auditoria/logs

- Ver eventos do módulo `owners`.
- Filtrar por `entityId = ownerId`.
