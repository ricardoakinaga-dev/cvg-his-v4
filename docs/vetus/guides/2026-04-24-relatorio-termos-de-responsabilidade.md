# Vetus ERP — Relatório da Rotina `Termos de Responsabilidade`

**Data:** 24/04/2026  
**Página-alvo:** `https://erp.vetus.com.br/Sistema/Cadastros/Termos.htm`  
**Trilha:** gap documental prioritário do domínio `Atendimento > Cadastros`

## 1. Escopo e limite de evidência

Esta rotina está confirmada no acervo como item real do menu legado do Vetus:

- nome do item: `Termos de Responsabilidade`;
- rota: `/Sistema/Cadastros/Termos.htm`;
- posicionamento: grupo `Atendimento > Cadastros`.

Nesta rodada, o acervo local **não possui captura direta da tela aberta** de `Termos.htm`. Por isso, este relatório não descreve campos concretos de formulário já lidos visualmente; ele consolida:

- posicionamento funcional confirmado no sistema;
- papel documental/legal inferido com base forte;
- relações com módulos já mapeados;
- leitura operacional do uso da rotina dentro do hospital/clínica.

## 2. Confirmações objetivas já existentes

### 2.1 Existência da rotina

A rotina aparece explicitamente em:

- [02-ANALISE-SISTEMA-VETUS.md](/root/cvg-his-v2/docs/vetus/guides/02-ANALISE-SISTEMA-VETUS.md:108), com a linha:
  - `Termos de Responsabilidade | .../Cadastros/Termos.htm | Legado`
- artefatos de menu legacy já preservados no acervo;
- inventário global de módulos e rotas do shell híbrido.

### 2.2 Natureza funcional

O documento de planejamento já descreve o item como:

- `Termos de Responsabilidade: Documentos legais`

Isso aparece em [01-PLANEJAMENTO-ERP-ENTERPRISE.md](/root/cvg-his-v2/docs/vetus/guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md:377).

### 2.3 Posicionamento no produto

A escolha de colocar `Termos de Responsabilidade` dentro de `Atendimento > Cadastros` não parece acidental. Ela mostra que o Vetus trata o termo como cadastro/artefato operacional recorrente do atendimento, não apenas como documento administrativo isolado.

## 3. Leitura de produto

`Termos de Responsabilidade` deve ser entendido como a camada documental-jurídica que acompanha procedimentos e eventos assistenciais em que:

- há consentimento do tutor;
- há assunção de risco;
- há autorização formal;
- ou há necessidade de lastro legal da decisão clínica/operacional.

Na prática, isso significa que o módulo existe para permitir que a operação clínica não dependa de documentos soltos fora do ERP.

## 4. Papel operacional da rotina

Mesmo sem a captura direta da tela, o papel da rotina dentro do Vetus fica bastante plausível e forte:

- padronizar documentos legais reutilizáveis;
- reduzir improviso de texto em procedimentos sensíveis;
- apoiar atendimento com documentação formal do tutor;
- sustentar rastreabilidade e defesa jurídica da clínica/hospital;
- servir como insumo para impressão, assinatura ou anexação em prontuário/comanda.

## 5. Relações mais prováveis com outros módulos

## 5.1 Relação com `Animal` e `Cliente`

O termo tende a depender de contexto identificável de:

- tutor/cliente responsável;
- animal/paciente;
- procedimento ou situação clínica associada.

Isso faz sentido porque o documento legal raramente existe “solto”; ele costuma estar ligado a um caso, um responsável e um paciente.

## 5.2 Relação com `Comanda`

Embora não exista, nesta rodada, prova visual direta da integração, a leitura arquitetural é forte:

- a `Comanda` já é o centro transacional do atendimento;
- procedimentos e serviços relevantes costumam gerar necessidade de termo;
- logo, o vínculo entre termo e comanda é altamente plausível.

Leitura correta:

- **relação provável e muito forte**;
- **não comprovada diretamente nesta passada por UI aberta da tela de termos**.

## 5.3 Relação com `Prontuário` / detalhe do animal

No acervo geral do Vetus, o detalhe do animal já funciona como cockpit clínico longitudinal. Em um desenho maduro, `Termos de Responsabilidade` tende a dialogar com esse eixo porque:

- termo faz parte do histórico assistencial formal;
- pode precisar ser consultado em retorno;
- pode compor lastro documental do caso clínico.

### 5.4 Relação com `Internação`

Essa é uma das conexões mais fortes do ponto de vista hospitalar. A própria existência de `Boxes de Internação` e de um domínio de `Internação` robusto indica que o Vetus cobre cenários clínicos de maior risco/complexidade. Nesses cenários, termos são especialmente relevantes para:

- autorização de internação;
- ciência de riscos;
- consentimento para procedimentos;
- responsabilidade sobre conduta e permanência.

## 6. Papel jurídico e de governança

Este módulo fecha uma lacuna que muitos ERPs assistenciais deixam aberta: a do documento legal operacionalizado.

Ele é importante por pelo menos quatro razões:

### 6.1 Segurança jurídica

Ajuda a formalizar consentimento e ciência do tutor.

### 6.2 Padronização institucional

Evita que cada profissional ou unidade use textos informais ou divergentes.

### 6.3 Auditabilidade

Permite rastrear qual modelo documental existe no sistema e, potencialmente, qual documento foi usado.

### 6.4 Integração com a operação

Mantém o documento dentro do fluxo do atendimento, e não em um repositório paralelo de arquivos avulsos.

## 7. O que a tela provavelmente contém

Sem inventar detalhe visual inexistente, a estrutura mínima mais provável de uma rotina com esse papel é:

- listagem de termos cadastrados;
- identificação/nome do termo;
- corpo textual/modelo do documento;
- status ativo/inativo ou equivalente;
- ações de criar, editar, excluir ou imprimir;
- possivelmente classificação por tipo de uso.

Essa inferência é coerente com o padrão legado do Vetus e com a natureza de “documento legal” persistido como cadastro.

## 8. Por que esse gap é prioritário

Entre os gaps remanescentes, `Termos de Responsabilidade` é prioritário porque não é um cadastro auxiliar puramente cosmético. Ele toca:

- atendimento;
- prontuário;
- clínica;
- governança;
- risco jurídico.

Ou seja, ele fica em uma borda do produto que é silenciosa, mas crítica.

## 9. Cobertura atual vs cobertura desejada

### 9.1 Cobertura atual

Hoje, a cobertura documental do tema é:

- existência confirmada;
- rota confirmada;
- grupo de menu confirmado;
- natureza legal confirmada;
- conexões operacionais inferidas com boa base.

### 9.2 O que ainda falta para fechar totalmente

Para transformar a cobertura em prova forte, ainda faltaria uma passada específica com:

- captura direta da tela `Termos.htm`;
- leitura da listagem;
- leitura do formulário de cadastro/edição;
- confirmação de campos e ações;
- verificação de integração com impressão, comanda ou prontuário, se visíveis.

## 10. Conclusão

`Termos de Responsabilidade` é um módulo legado de natureza jurídica-operacional, posicionado no bloco de cadastros do atendimento e desenhado para sustentar documentação legal dentro da jornada clínica do Vetus.  

Mesmo sem a tela aberta nesta rodada, o acervo já permite concluir que ele não é um cadastro periférico: ele ocupa uma função crítica de padronização documental, rastreabilidade e cobertura legal do atendimento.

Na nova trilha de documentação, ele deve ser tratado como:

- módulo de apoio assistencial;
- ponte entre operação clínica e segurança jurídica;
- peça importante para hospitais e clínicas com procedimentos de maior risco e necessidade de consentimento formal.
