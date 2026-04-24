# Relatório de Gaps, Riscos e Prioridades de Migração do Domínio Laboratório

Data: 2026-04-24
Escopo: leitura de transição do domínio `Laboratório`, saindo da inspeção para uma visão estruturada de `gaps`, `riscos` e `prioridades de migração`.

## 1. Síntese executiva

O domínio `Laboratório` do Vetus está funcionalmente maduro no `legacy`, mas permanece pouco migrado para o `beta`.

Leitura consolidada:

- o domínio já está bem definido funcionalmente;
- a operação real ainda depende do legado;
- o shell beta atua mais como entrada e encaminhamento do que como suíte laboratorial completa;
- o principal risco de migração não é falta de entendimento do domínio, mas profundidade operacional, consistência entre módulos e transição segura do legado para o core novo.

Conclusão objetiva:

- o laboratório já está suficientemente mapeado para priorização de migração;
- a migração deve ser feita por camadas, não por tela isolada.

## 2. Gaps principais

### 2.1 Gap de superfície beta

O maior gap atual é entre:

- robustez funcional no legado;
- baixa cobertura operacional real no beta.

Sinais confirmados:

- `Laboratório` continua majoritariamente fora do core beta;
- os módulos laboratoriais observados seguem em `JSF + PrimeFaces`;
- o shell beta não entrega hoje uma suíte laboratorial operacional equivalente.

Leitura:

- existe entendimento do domínio;
- falta profundidade de produto no front novo.

### 2.2 Gap de fluxo ponta a ponta

O domínio está mapeado em camadas, mas a nova superfície ainda não materializa o ciclo completo:

- ordem;
- esteira;
- coleta;
- resultado;
- referência;
- laudo;
- entrega.

Leitura:

- há módulos legados coerentes;
- falta uma jornada integrada no target.

### 2.3 Gap de operação vs dashboard

O Vetus beta já amadureceu bem em alguns domínios como `agenda`, `comandas`, `cadastros` e partes de `estoque`.

No laboratório, o gap permanece:

- operação real fica no legado;
- a superfície nova ainda não substitui a rotina crítica.

### 2.4 Gap de profundidade nas trilhas especializadas

O laboratório não é um módulo único. Ele contém famílias diferentes de resultado:

- `Hemogramas`;
- `Urina`;
- `Bioquímico`.

Gap observado:

- migrar apenas `Exames` ou apenas `Laudos` não fecha o domínio;
- as trilhas especializadas têm modelagens diferentes e exigem desenho próprio.

### 2.5 Gap de sustentação normativa e técnica

O domínio depende de:

- `Vlr. Ref. Hemograma`;
- `Vlr. Ref. Bioquímico`;
- `Equipamentos`.

Gap:

- migrar só as telas de resultado sem essa base produz um laboratório superficial e sem governança.

### 2.6 Gap de integração transversal

O laboratório conversa com:

- `atendimento`;
- `internação`;
- `cliente`;
- `animal`;
- `financeiro`;
- reflexos comerciais.

Gap:

- a migração do laboratório precisa nascer já conectada a esses domínios;
- uma migração isolada criaria um módulo tecnicamente bonito, mas operacionalmente cego.

## 3. Riscos principais de migração

### 3.1 Risco de migrar por telas em vez de por capacidades

Se a migração for feita só por tela, há risco de:

- reconstruir listagens sem fechar o fluxo;
- criar superfícies novas sem capacidade operacional real;
- manter dependências ocultas no legado.

Esse é o risco estrutural mais importante.

### 3.2 Risco de quebrar a esteira operacional

`Esteira de Exames` é a espinha do fluxo.

Risco:

- migrar resultados ou laudos antes da coordenação operacional pode gerar:
  - duplicidade de estado;
  - perda de rastreabilidade;
  - inconsistência entre requisição, coleta, análise e entrega.

### 3.3 Risco de submodelar resultados

As famílias `Hemogramas`, `Urina` e `Bioquímico` não compartilham exatamente o mesmo desenho.

Risco:

- tentar encaixar tudo em um único formulário genérico;
- perder diferenciação entre modelo tabular e modelo clínico-estruturado;
- reduzir aderência ao uso real.

### 3.4 Risco de ignorar referência e equipamento

Se a equipe migrar apenas `exam_results`, sem `exam_reference_values` e sem `equipment`, o laboratório novo pode:

- registrar números;
- mas não interpretar bem;
- nem sustentar governança operacional.

Isso produziria um domínio incompleto.

### 3.5 Risco de desacoplamento do financeiro

O laboratório não é um domínio estritamente clínico.

Risco:

- não mapear `valor`, `origem`, `comanda` ou títulos;
- perder a ponte entre exame executado e reflexo econômico;
- deixar o financeiro sem rastreabilidade de origem.

### 3.6 Risco de migração big bang

Uma troca completa e abrupta do legado para o beta seria arriscada porque:

- o domínio é profundo;
- há múltiplas superfícies especializadas;
- existe acoplamento transversal com módulos críticos;
- a operação clínica é sensível a regressão.

## 4. Prioridades de migração

### 4.1 Prioridade P0: fechar o core operacional mínimo

Primeira prioridade:

- `Exames`
- `Esteira de Exames`
- `Laudos`

Justificativa:

- esse trio fecha o mínimo operacional do ciclo;
- sem ele não existe jornada ponta a ponta no target;
- é a base para tirar o laboratório da condição de apenas “grupo visível”.

### 4.2 Prioridade P0: consolidar backend-first

A migração precisa nascer no backend como domínio real.

Prioridade:

- contratos claros;
- persistência real;
- estados explícitos;
- integração consistente com `cliente`, `animal`, `atendimento` e `internação`.

Justificativa:

- o maior risco atual é shell forte com profundidade irregular;
- laboratório não tolera front sem base transacional sólida.

### 4.3 Prioridade P1: migrar resultados especializados

Segunda frente:

- `Hemogramas`
- `Bioquímico`
- `Urina`

Justificativa:

- eles dão densidade real ao laboratório;
- precisam ser migrados respeitando seus padrões distintos;
- fecham a execução analítica após a ordem e a esteira.

### 4.4 Prioridade P1: migrar a camada de referência

Terceira frente:

- `Vlr. Ref. Hemograma`
- `Vlr. Ref. Bioquímico`

Justificativa:

- essa camada transforma resultado bruto em leitura qualificada;
- permite comparação automática;
- reduz risco de um laboratório “bonito”, porém raso.

### 4.5 Prioridade P1: migrar equipamentos

Quarta frente:

- `Equipamentos`
- manutenção;
- calibração.

Justificativa:

- fecha a base operacional e normativa do domínio;
- aumenta governança e aderência à operação real;
- prepara o sistema para crescer sem perder confiabilidade técnica.

### 4.6 Prioridade P2: acabamento de integração e entrega

Depois do core:

- entrega ao cliente;
- integração com comunicação;
- relatórios e monitoramento operacional;
- aprofundamento do reflexo financeiro e comercial.

Justificativa:

- importante, mas não deve vir antes do fluxo clínico-operacional principal.

## 5. Sequência recomendada de migração

Sequência mais segura:

1. modelar o domínio backend real de `laboratório`;
2. fechar `Exames -> Esteira -> Laudos`;
3. integrar `animal`, `cliente`, `atendimento` e `internação`;
4. migrar `Hemogramas` e `Bioquímico`;
5. migrar `Urina` com modelagem própria;
6. migrar `Vlr. Ref. ...`;
7. migrar `Equipamentos`;
8. fechar entrega, relatórios e refinamentos financeiros.

Leitura:

- isso preserva a espinha operacional primeiro;
- adiciona profundidade depois;
- reduz risco de reconstrução parcial sem valor real.

## 6. O que não fazer

Evitar:

- migrar só a casca visual do laboratório;
- tratar `Urina` como simples variante de `Hemogramas`;
- ignorar referências por espécie e idade;
- deixar `Equipamentos` para um futuro indefinido;
- migrar tudo em big bang;
- adiar a integração com `atendimento` e `internação`.

Esses atalhos parecem rápidos, mas aumentam o risco de regressão funcional e de uma migração incompleta.

## 7. Leitura final de transição

O domínio `Laboratório` já está pronto para sair da fase de descoberta e entrar na fase de transição arquitetural.

O diagnóstico consolidado é:

- o problema principal não é entendimento do domínio;
- o problema principal é priorização correta da migração;
- a migração deve tratar o laboratório como capacidade operacional crítica e não como um conjunto disperso de telas.

## 8. Conclusão final

Os maiores `gaps` do laboratório estão na distância entre a robustez do legado e a cobertura real do beta.

Os maiores `riscos` estão em:

- migrar por tela;
- perder a esteira;
- submodelar resultados;
- ignorar referência, equipamento e integração transversal.

As maiores `prioridades` são:

- fechar o core operacional primeiro;
- consolidar backend real;
- migrar resultados especializados por família;
- migrar referência e equipamento antes de chamar o domínio de concluído.

Essa leitura já é suficiente para abrir uma próxima fase de planejamento executivo de migração.
