# 0206 - Plano Mestre de Construção ERP Enterprise Premium Vetus-Based

**Status:** canônico  
**Data:** 2026-04-12  
**Fonte da verdade obrigatória:** `docs/Enterprise`  
**Base comparativa:** leitura integral de `docs/vetus/**` + trilha viva `docs/Enterprise/**`

---

## 1. Objetivo

Definir a construção detalhada do `cvg-his-v2` como **ERP veterinário Enterprise Premium completo**, usando o Vetus como referência de:

- organização operacional;
- profundidade funcional por domínio;
- linguagem de ERP veterinário;
- densidade de fluxo em agenda, comandas, cadastro, financeiro, laboratório e backoffice.

Ao mesmo tempo, este plano preserva e amplia o que o CVG já tem de superior:

- SPA moderna e canônica em `apps/spa`;
- backend modular e testável;
- governança enterprise;
- MFA, auditoria, LGPD, webhooks, API keys, observabilidade e trilha operacional premium.

### Regra central

**Não vamos clonar o Vetus.**  
Vamos absorver a organização e a profundidade funcional do Vetus, mas construir tudo em cima da base moderna do CVG, sem reintroduzir:

- shell híbrido inconsistente;
- ponte quebrada SPA -> legado;
- rotas falsas;
- módulos “visíveis” sem backend real;
- regressão de UX, segurança ou observabilidade.

---

## 2. O que a inspeção completa de `docs/vetus` mostrou

### 2.1 Leitura estrutural do acervo

O acervo Vetus em `docs/vetus` contém:

- `15` documentos Markdown principais (`README` + `guides`)
- `105` screenshots do shell/beta
- `47` recortes de módulos legacy
- `152` arquivos visuais no total

### 2.2 Leitura correta do produto de referência

O Vetus documentado não é uma aplicação homogênea. Ele é híbrido:

- shell SPA moderno para navegação principal;
- módulos beta maduros em agenda, comandas, cadastros e parte de estoque/fiscal;
- muito domínio operacional ainda entregue em legacy;
- várias rotas expostas no menu, mas indisponíveis no shell.

### 2.3 O que vale como referência forte

As referências mais úteis do Vetus são:

- shell e taxonomia principal;
- agenda multiprofissional com filtros laterais;
- comandas como workbench clínico-financeiro;
- cadastro de clientes e animais como hubs densos;
- profundidade de estoque/fiscal;
- profundidade de financeiro administrativo no legado;
- estrutura clássica de laboratório, com exames, laudos e tabelas auxiliares;
- RH administrativo com comissões, folgas e grupos de acesso;
- relatórios por macroárea.

### 2.4 O que não deve ser copiado

Não deve ser tratado como benchmark funcional:

- telas indisponíveis do shell;
- erros `404` e `500` do legado;
- duplicação entre beta e legacy;
- uso de rota publicada sem backend real;
- aparência antiga de JSF / PrimeFaces;
- dependência de sistemas externos ou pontes frágeis.

---

## 3. Princípios de construção do CVG Enterprise Premium

### 3.1 Produto único e moderno

Tudo novo deve viver em:

- `apps/spa` para frontend
- `apps/api` / `apps/api/src/routes/**` para API
- `packages/modules/**` para domínio

`apps/web` não volta a participar da trilha principal.

### 3.2 Domínio só fecha quando for real

Um domínio só pode ser considerado realmente entregue quando tiver:

1. UI de produção utilizável
2. API real
3. persistência real
4. permissão e auditoria
5. testes
6. documentação atualizada em `docs/Enterprise`

### 3.3 Vetus como organização, CVG como arquitetura

O menu e a linguagem operacional devem ser Vetus-like:

- Início
- Atendimento
- Laboratório
- Estoque
- Financeiro
- Marketing
- RH
- Relatórios

Mas a entrega técnica deve continuar CVG:

- design system moderno;
- SPA única;
- command palette;
- favoritos e recentes;
- dark mode;
- observabilidade;
- segurança;
- runtime enterprise.

### 3.4 Sem domínio “fake”

Não vamos manter páginas que:

- dependem de fallback local excessivo;
- simulam backend inexistente;
- escondem modo `in-memory` como se fosse produção;
- publiquem rotas mais profundas do que a operação real suporta.

### 3.5 `docs/Enterprise` é a fonte da verdade

Toda evolução relevante precisa atualizar:

- status
- backlog
- sprint
- leitura executiva
- plano de próximos passos

na pasta `docs/Enterprise`.

---

## 4. Estrutura-alvo do produto

## 4.1 Shell principal

O shell Vetus-aligned já é a base correta e deve ser mantido:

- `Início`
- `Atendimento`
- `Laboratório`
- `Estoque`
- `Financeiro`
- `Marketing`
- `RH`
- `Relatórios`
- `Console Enterprise` como camada secundária

### 4.1.1 Topbar alvo

Deve concentrar:

- contexto organizacional (`tenant`, empresa, unidade, setor)
- busca global
- command palette
- notificações
- suporte/documentação
- atalho operacional de WhatsApp
- favoritos e recentes
- tema
- perfil do usuário

### 4.1.2 Console Enterprise

Permanece fora da navegação ERP principal para concentrar:

- API keys
- webhooks
- API client
- LGPD
- auditoria
- MFA
- evidências operacionais
- saúde de integrações
- SOC2 e governança avançada

---

## 5. Programa detalhado de construção

## 5.1 Pilar A - Atendimento Premium completo

Este é o bloco mais importante do produto.  
O objetivo é fazer o CVG superar o Vetus no fluxo ponta a ponta de recepção, agenda, atendimento, prontuário e internação.

### A1. Agenda Premium Enterprise

#### Referência Vetus aproveitada

- cockpit multiprofissional;
- filtro lateral com mini calendário;
- visões dia/semana/mês;
- CTA claro de criação;
- modal de criação centrado no cliente;
- leitura operacional forte.

#### Construção-alvo no CVG

Frontend:

- visão dia/semana/mês
- agenda por profissional
- agenda por recurso/sala/setor
- coluna “sem profissional”
- painel lateral com:
  - mini calendário
  - status
  - profissional
  - serviço
  - unidade
  - especialidade
- drag-and-drop para reagendamento
- criação rápida por modal ou drawer
- criação inline de tutor/paciente quando necessário
- check-in, no-show, encaixe, confirmação e cancelamento
- integração com fila operacional
- alertas de conflito de agenda

Backend e domínio:

- API real para listagem filtrada por período/profissional/status
- contrato de slot disponível
- regras de duração por tipo de atendimento
- bloqueios operacionais
- recorrência mínima quando fizer sentido
- eventos de agendamento para notificações e automações

Definição de pronto:

- fluxo agenda -> check-in -> fila -> atendimento sem ruptura
- nenhuma etapa crítica depende de mock local
- testes de fluxo e de contrato cobrindo os estados principais

### A2. Cadastro completo de tutores

#### Referência Vetus aproveitada

No Vetus, cliente é centro de relacionamento, faturamento, agenda e comunicação.

#### Construção-alvo no CVG

O hub de tutor deve incluir:

- identificação principal
- documentos
- múltiplos contatos
- preferências de contato
- consentimentos LGPD
- situação financeira resumida
- animais vinculados
- agenda do tutor
- comandas / faturamento
- orçamentos
- pacotes / fidelidade futuro
- mensagens e comunicação
- ações rápidas:
  - novo animal
  - abrir atendimento
  - abrir comanda
  - enviar mensagem
  - ver situação financeira

Backend e domínio:

- API real de list/detail/form
- busca avançada
- deduplicação progressiva
- histórico auditável
- relacionamento forte com billing, agenda e notifications

Definição de pronto:

- o tutor deixa de ser cadastro periférico e vira hub de conta do cliente
- todo dado exibido vem de backend real

### A3. Cadastro completo de animais

#### Referência Vetus aproveitada

O detalhe do animal no Vetus é um hub clínico longitudinal.

#### Construção-alvo no CVG

O hub do paciente deve incluir:

- identificação clínica
- tutor principal e responsáveis
- raça, espécie, sexo, idade
- alergias
- doenças crônicas
- temperamento
- observações operacionais
- histórico de peso
- vacinas e protocolos
- agenda futura
- últimos atendimentos
- exames
- internações
- prescrições
- imagens / anexos
- timeline clínica
- ações rápidas:
  - agendar
  - iniciar atendimento
  - abrir prontuário
  - solicitar exame
  - internar

Backend e domínio:

- API real agregando contexto clínico
- anexos e timeline reais
- integrações com encounters, diagnostics, prescriptions e inpatient

Definição de pronto:

- o detalhe do paciente precisa ser suficiente para reduzir troca de tela
- o paciente deve ser claramente o hub clínico longitudinal do sistema

### A4. Comandas / vendas assistidas / orçamentos

#### Referência Vetus aproveitada

Comandas é o melhor workbench clínico-financeiro do beta Vetus.

#### Construção-alvo no CVG

Unificar semântica entre:

- `billing`
- `quotes`
- `counter-sales`
- jornada de atendimento

Objetivos:

- comanda assistencial contextualizada ao atendimento
- venda assistida sem ruptura entre clínico e financeiro
- orçamento com conversão clara
- painel lateral de totalização
- vínculo explícito entre tutor, paciente, itens e fechamento

Definição de pronto:

- recepção, ambulatório e caixa conseguem fechar o ciclo comercial sem sair da narrativa de atendimento

---

## 5.2 Pilar B - Assistencial avançado e internação

O CVG já está forte aqui, mas precisa fechar a jornada como bloco único.

### B1. Fila e triagem

- fila operacional em tempo real
- priorização clínica
- status claros
- CTA de chamada, check-in, triagem e encaminhamento
- triagem como etapa nativa do fluxo, não tela isolada

### B2. Prontuário

- timeline longitudinal
- acesso rápido a exames, prescrições, cirurgias e internações
- resumo executivo do caso
- anexos, imagens e evolução

### B3. Internação

#### Referência Vetus aproveitada

No Vetus, internação existe funcionalmente no legado, mas o shell falha.

#### Objetivo no CVG

Entregar internação de forma moderna e completa:

- animais internados
- boxes/leitos
- mapa de ocupação
- ocorrências
- diária
- prescrição em internação
- passagem de plantão
- alta

Definição de pronto:

- nenhuma subrotina principal de internação pode ficar “meio pronta” ou escondida

---

## 5.3 Pilar C - Laboratório backend-first

Este é um dos maiores gaps frente ao Vetus.

### C1. Objetivo

Transformar `Laboratório` em domínio real de produção, não apenas grupo visível no shell.

### C2. Escopo funcional mínimo enterprise

- pedidos de exame
- resultados
- laudos
- hemogramas
- bioquímico
- urina
- equipamentos
- tipos de laudo
- valores de referência

### C3. Regras de construção

Frontend:

- hubs por subdomínio
- listas e detalhes utilizáveis
- CTAs reais
- sem fallback disfarçado

Backend:

- API laboratorial dedicada
- persistência real para catálogos
- contratos reais para pedidos/resultados
- timeline ligada a pacientes e prontuário

### C4. Definição de pronto

- `apps/spa/src/services/laboratory.ts` deixa de depender primariamente de derivação local
- catálogos laboratoriais deixam de viver na SPA
- domínio passa a ter backend dedicado e previsível

---

## 5.4 Pilar D - Estoque + Fiscal ERP real

Estoque já está melhor que outros domínios, mas ainda precisa profundidade operacional. Fiscal é um gap crítico.

### D1. Estoque

Entregas-alvo:

- produtos
- estoques
- fabricantes
- fornecedores
- grupos de produto
- lotes e validade
- movimentações
- consumo clínico
- compras
- reposição
- transferência entre estoques
- entrada de nota

### D2. Fiscal

Entregas-alvo:

- ICMS
- IPI
- PIS
- COFINS
- CFOP
- NFS-e
- matriz ICMS
- IBS/CBS

### D3. Regra de arquitetura

Fiscal não pode continuar frontend-local.

Definição de pronto:

- API fiscal dedicada
- service layer da SPA baseada em HTTP
- UI só expõe profundidade que o backend realmente suporta
- integração progressiva com estoque, billing e financeiro

---

## 5.5 Pilar E - Financeiro administrativo profundo

O Vetus ganha muito aqui. O CVG precisa atingir profundidade ERP real.

### E1. Módulos-alvo

- gaveta / caixa
- contas a receber
- contas a pagar
- pagamento antecipado
- transações de cartão
- contas adm. cartão
- cheques
- fluxo de caixa
- DRE
- dashboard financeiro
- linha do tempo financeira
- split
- bancos
- formas de pagamento
- centros de custo
- custos e despesas

### E2. Regra de modelagem

Financeiro não pode ser apenas “faturamento + caixa + PIX”.

Ele precisa comportar:

- operação diária
- conciliação
- visão gerencial
- parametrização administrativa

### E3. Definição de pronto

- o financeiro do CVG passa a suportar o backoffice que hoje o Vetus ancora no legado
- relatórios financeiros e cadastros auxiliares deixam de ser lacuna

---

## 5.6 Pilar F - RH, comissões e marketing operacional

### F1. RH administrativo completo

Entregas-alvo:

- usuários
- profissionais
- grupos de acesso
- profissões
- departamentos
- folgas
- MFA do usuário
- governança humana de acesso

### F2. Comissões

Entregas-alvo:

- regras de comissão
- cálculo de comissão
- produtividade
- trilha de auditoria do cálculo

### F3. Marketing operacional

Entregas-alvo:

- campanhas
- templates de e-mail
- SMS
- WhatsApp operacional
- preferências por canal
- consentimento de comunicação

### F4. Definição de pronto

- RH deixa de ser só identidade/acesso
- marketing deixa de ser só notificações técnicas

---

## 5.7 Pilar G - Relatórios por área

O grupo `Relatórios` só fecha quando deixar de ser superficial.

### G1. Portfólio mínimo

- relatórios de agenda
- relatórios de atendimento
- atendimento por profissional
- cadastros
- estoque
- financeiros
- fluxo de caixa
- produção
- plataforma / auditoria / LGPD

### G2. Regra

Relatórios devem refletir as macroáreas do shell, não ser um apêndice comercial isolado.

---

## 5.8 Pilar H - Produção real e baseline Enterprise confiável

Além da profundidade funcional, o CVG precisa fechar produção real.

### H1. Produção real

- remover dependências de `acc_cvg_demo`
- reduzir seeds de runtime
- eliminar modos `in-memory` críticos
- tornar multi-tenancy/RLS defensável para produção

### H2. Qualidade real

- corrigir escopo de `test:coverage`
- voltar a usar `release:check`
- continuar extração de `server.ts`

### H3. Runtime premium

- Redis rate limiter
- fallback seguro
- Unleash
- Helm
- secrets manager plan
- governança event-driven por domínio

---

## 6. Ordem correta de execução

## 6.1 P0 - Construção imediata

1. corrigir o gate de qualidade (`coverage` + `release:check`)
2. fechar produção real (`seeds`, `acc_cvg_demo`, `in-memory` crítico)
3. fechar fiscal API-backed
4. fechar laboratório backend-first
5. fechar agenda premium
6. fechar hubs completos de tutores e animais

## 6.2 P1 - Profundidade ERP

1. financeiro administrativo profundo
2. estoque operacional completo
3. relatórios por área
4. comissões
5. RH administrativo clássico
6. marketing operacional

## 6.3 P2 - Escala premium

1. runtime distribuído
2. feature flags
3. Helm / Kubernetes
4. secrets manager dedicado
5. AI/ML integrado aos fluxos reais

---

## 7. Definition of Done por domínio

Um domínio só pode ser marcado como `DONE` quando cumprir todos os pontos:

1. navegação oficial publicada
2. páginas principais utilizáveis
3. API real
4. persistência real
5. permissões e auditoria
6. telemetria / métricas mínimas
7. testes de contrato e fluxo
8. documentação atualizada em `docs/Enterprise`

Se qualquer ponto faltar, o domínio deve ficar como:

- `PARTIAL`
- `IN PROGRESS`
- ou `REVIEW`

nunca como `DONE` por aproximação.

---

## 8. Próximos passos recomendados

### Passo 1

Transformar este plano em backlog executável por frentes:

- Agenda premium
- Tutores
- Animais
- Laboratório
- Fiscal
- Financeiro profundo
- RH/Comissões
- Relatórios

### Passo 2

Atualizar a trilha viva de `docs/Enterprise` para incorporar este plano aos documentos:

- backlog
- sprints
- matriz de status
- próximos prompts de executor

### Passo 3

Executar por ordem:

1. qualidade e produção real
2. fiscal
3. laboratório
4. agenda + tutores + animais
5. financeiro
6. RH/comissões/marketing
7. relatórios

---

## 9. Conclusão executiva

O Vetus mostra **como organizar um ERP veterinário**.  
O CVG já mostra **como construir uma plataforma moderna e enterprise**.

O alvo correto do programa é:

> fazer o `cvg-his-v2` virar um ERP veterinário Enterprise Premium completo, com a profundidade funcional do Vetus e a arquitetura moderna, auditável e escalável que o Vetus não conseguiu consolidar.

Em termos práticos, isso significa:

- agenda premium real;
- cadastro de tutores completo;
- cadastro de animais completo;
- atendimento e internação de ponta a ponta;
- laboratório real;
- fiscal real;
- financeiro profundo de ERP;
- RH/comissões/marketing completos;
- relatórios por área;
- tudo rodando sobre a base premium do CVG, sem regressão para legado híbrido.
