# Modelo oficial de estados de rotina

Data: 2026-04-22
Status: oficial para Sprint 1
Objetivo: padronizar como o produto comunica rotinas prontas, parciais, bloqueadas ou planejadas.

## 1. Estados oficiais

### 1.1 Funcional
Definição:
- rotina disponível e operacional no SPA.

Uso:
- entra normalmente na árvore do menu;
- deve possuir breadcrumb, header e CTA coerentes;
- pode exibir estado vazio de dados, mas não estado de indisponibilidade.

### 1.2 Em construção
Definição:
- rotina prevista e já exposta, mas ainda sem entrega funcional completa.

Uso:
- pode aparecer no menu apenas se houver justificativa clara de roadmap;
- deve usar placeholder específico da rotina;
- deve explicar o que já existe e o que ainda falta.

### 1.3 Sem permissão
Definição:
- rotina existe e está funcional, mas a sessão atual não pode acessá-la.

Uso:
- não usar texto de construção;
- informar bloqueio de acesso e, se possível, caminho administrativo.

### 1.4 Sem integração
Definição:
- a interface existe, mas depende de backend, serviço externo ou feature flag ainda indisponível.

Uso:
- comunicar dependência de integração;
- não confundir com bug ou remoção da página.

### 1.5 Planejado
Definição:
- rotina aprovada na arquitetura, mas ainda não implementada.

Uso:
- em regra, não aparece no menu principal;
- pode existir apenas na documentação ou em backlog.

### 1.6 Legado mapeado
Definição:
- rotina conhecida no benchmark/legado, mas ainda sem equivalência moderna estável no SPA.

Uso:
- serve como estado transitório documental e de roadmap;
- só deve aparecer no menu se existir estratégia explícita de transição.

## 2. Regras de exposição no menu

- Funcional: pode aparecer normalmente
- Em construção: pode aparecer com justificativa explícita
- Sem permissão: aparece conforme política de produto e RBAC
- Sem integração: pode aparecer se a experiência explicar claramente a limitação
- Planejado: não deve aparecer no menu principal
- Legado mapeado: preferencialmente não aparece no menu principal, salvo transição controlada

## 3. Regras de copy por estado

### Funcional
Mensagem base:
- não usar placeholder estrutural

### Em construção
Mensagem base:
- “Esta rotina está em construção no novo shell do CVG-HIS V2.”
- complementar com o que já está disponível e o que virá em seguida

### Sem permissão
Mensagem base:
- “Sua sessão não possui permissão para acessar esta rotina.”

### Sem integração
Mensagem base:
- “Esta rotina depende de uma integração que ainda não está disponível neste ambiente.”

### Planejado
Mensagem base:
- normalmente sem UI exposta; se houver tela interna, marcar como roadmap e não como página quebrada

### Legado mapeado
Mensagem base:
- “Esta rotina já foi mapeada no benchmark operacional, mas ainda não possui equivalente estável no SPA.”

## 4. CTA por estado

### Em construção
CTA sugerida:
- Voltar ao subdomínio
- Ir para rotina correlata já funcional

### Sem permissão
CTA sugerida:
- Voltar
- Solicitar acesso, se o fluxo existir

### Sem integração
CTA sugerida:
- Voltar ao domínio
- Ver rotina correlata

### Legado mapeado
CTA sugerida:
- Voltar ao domínio
- Abrir rotina moderna correlata, se existir

## 5. Exemplos práticos

- Pacotes: Em construção ou Planejado, conforme decisão do menu
- Esteira: Em construção
- Esteira de Exames: Em construção
- Vacinas e Vermífugos: Em construção
- Contas a Receber: Planejado até existir superfície inicial
- Regras de Comissão: Planejado até existir superfície inicial
- Grupos de Acesso: Planejado ou Sem integração, conforme backend

## 6. Implicações técnicas

`PlaceholderPage.vue` deve evoluir para suportar ao menos:
- tipo de estado
- copy específica da rotina
- CTA contextual
- distinção semântica entre indisponível, bloqueado e planejado

## 7. Proibição explícita

Não usar como mensagem padrão:
- “página quebrada”
- “página removida”
- “módulo indisponível”

exceto quando o erro for realmente técnico e não um estado de roadmap.

## 8. Uso deste documento

Este documento orienta:
- placeholders
- políticas de exibição do menu
- backlog da Fase A
- critérios de aceite de rotinas incompletas
