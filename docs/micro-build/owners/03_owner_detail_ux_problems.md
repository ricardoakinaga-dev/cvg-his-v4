# Problemas de UX/UI e Funcionais

## Problemas críticos

| ID | Problema | Evidência | Impacto | Recomendação | Backlog |
|---|---|---|---|---|---|
| UX-001 | Ações principais sem contexto completo | `Abrir Nova Comanda` e `Abrir Comanda` apontam para `/counter-sales` | Atendente pode abrir comanda sem tutor/pet pré-selecionado | Contextualizar ou deixar explícito que abre seleção | OWNER-P0-001 |
| UX-002 | Ações que criam orçamento não pedem confirmação | `Gerar orçamento-base` e `Criar orçamento` chamam `POST /quotes` | Criação acidental de registros comerciais | Exigir confirmação e mostrar payload/resumo | OWNER-P0-003 |
| UX-003 | Comunicação externa sem revisão explícita | WhatsApp abre `wa.me` e mensagens são templates locais | Risco de envio incorreto ou sem consentimento | Transformar em rascunho revisável e validar canal | OWNER-P0-004 |
| UX-004 | Alertas misturam criticidade | Documento, pets, financeiro e oportunidade comercial aparecem juntos | Usuário não distingue risco operacional de oportunidade | Separar alertas críticos de recomendações | OWNER-P0-002 |

## Excesso de informação

| ID | Problema | Evidência | Impacto | Recomendação | Backlog |
|---|---|---|---|---|---|
| UX-005 | Muitos cards abertos antes do conteúdo operacional | Seis cards cadastrais antes dos pets/histórico | Rolagem longa e baixa eficiência | Consolidar cadastro em bloco resumido com detalhes recolhidos | OWNER-P1-004 |
| UX-006 | Financeiro aparece em múltiplos blocos | `Resgate de pontos e limite`, `Situação Financeira`, `CRM financeiro`, `Comandas e Vendas` | Duplicidade e divergência visual | Criar bloco financeiro único | OWNER-P1-010 |
| UX-007 | Pontos aparecem duplicados | Card cadastral, hub Vetus-like e CRM | Origem e cálculo confusos | Separar fidelidade real de métrica derivada | OWNER-P2-003 |
| UX-008 | Orçamentos e pacotes se misturam | Pacotes sugeridos criam quote; Pacotes no hub usa activeQuotes | Usuário não entende diferença entre pacote, sugestão e orçamento | Renomear e separar conceitos | OWNER-P1-011 |

## Ordem e hierarquia

| ID | Problema | Evidência | Impacto | Recomendação | Backlog |
|---|---|---|---|---|---|
| UX-009 | Contato principal fica no KPI e contatos completos ficam tarde | `primaryContact` no topo; card `Contatos` após financeiro | Ação de contato não é priorizada corretamente | Trazer comunicação para resumo rápido | OWNER-P1-008 |
| UX-010 | Pets aparecem depois de CRM e financeiro | `Animais Cadastrados` está no meio/fim | Fluxo clínico fica enterrado | Pets vinculados devem ser bloco prioritário | OWNER-P1-005 |
| UX-011 | Histórico recente aparece sem ação | Agenda e atendimentos listam texto e data | Usuário não consegue aprofundar | Adicionar links contextuais por item | OWNER-P1-006, OWNER-P1-007 |
| UX-012 | Dados técnicos aparecem para usuário final | `Resumo exposto`, `Fallback local`, ID interno | Poluição e confusão | Mover origem técnica para auditoria/dev info ou remover da UI final | OWNER-P1-012 |

## Estados vazios, loading e erro

| ID | Problema | Evidência | Impacto | Recomendação | Backlog |
|---|---|---|---|---|---|
| UX-013 | Loading global não representa layout real | Skeleton simples no topo | Percepção de instabilidade | Criar loading por bloco em fase futura | OWNER-P2-005 |
| UX-014 | Falha parcial é incompleta | Só billing, quotes e owner-summary usam fallback | Falha de pets/agenda/atendimentos derruba tela inteira | Isolar carregamento por bloco | OWNER-P2-005 |
| UX-015 | Estados vazios têm pouco direcionamento | Textos simples sem CTA em contatos, pets, agenda, atendimentos | Usuário não sabe próximo passo | Adicionar empty states acionáveis | OWNER-P1-009 |

## Responsividade e composição visual

| ID | Problema | Evidência | Impacto | Recomendação | Backlog |
|---|---|---|---|---|---|
| UX-016 | Cards têm largura mínima variada e muitos textos longos | `minmax(260/280px)` e `overflow-wrap:anywhere` | Pode gerar páginas muito longas no mobile | Validar mobile e compactar blocos | OWNER-P3-001 |
| UX-017 | Itens internos viram coluna no mobile | CSS muda `contact-item`, `patient-list__item`, etc. | Ações podem ficar distantes do contexto | Revisar ordem e espaçamento mobile | OWNER-P3-001 |
| UX-018 | UI usa muitos emojis como ícones operacionais | KPIs e botões têm emojis | Aparência inconsistente | Padronizar ícones conforme design system | OWNER-P3-002 |

## Problemas funcionais e de origem de dados

| ID | Problema | Evidência | Impacto | Recomendação | Backlog |
|---|---|---|---|---|---|
| FN-001 | Busca global de agenda, atendimentos e financeiro | `appointmentService.list()`, `encounterService.list()`, `billingService.list()` | Custo alto e risco de inconsistência em bases grandes | Criar ou usar endpoints filtrados por owner | OWNER-P2-001, OWNER-P2-002 |
| FN-002 | Fidelidade calculada localmente | `loyaltyPoints` usa fórmula local | Divergência com módulo comercial real | Integrar com serviço de fidelidade | OWNER-P2-003 |
| FN-003 | CRM calculado localmente | `crmStage` derivado por regras simples | Pode virar regra de negócio escondida | Validar origem e contrato de CRM | OWNER-P2-004 |
| FN-004 | Recomendações de pacote são mock/regra local | `packageRecommendations` hardcoded | Usuário pode acreditar em recomendação oficial | Remover destaque ou integrar fonte real | OWNER-P2-004 |
| FN-005 | Documentos/anexos ausentes | Nenhum serviço usado na page | Fluxo esperado incompleto | Mapear e implementar bloco futuro | OWNER-P2-006 |
| FN-006 | Auditoria/logs ausentes | Não há consulta a `/audit/events` | Baixa rastreabilidade no cadastro | Mapear bloco de auditoria | OWNER-P2-007 |
| FN-007 | Permissões não visíveis por ação | Page renderiza ações sem checagem local aparente | Usuário pode ver ação que backend negará | Validar integração RBAC no shell/page | OWNER-P2-008 |
