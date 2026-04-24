# Relatório Executivo: Roadmap e Backlog por Fase do Domínio Laboratório

Data: 2026-04-24
Escopo: converter o plano de migração por ondas do domínio `Laboratório` em um roadmap executivo com `fases`, `épicos`, `dependências`, `critérios de aceite` e `ordem sugerida de execução`.

## 1. Síntese executiva

O domínio `Laboratório` já está suficientemente mapeado para sair da etapa de leitura estrutural e entrar em um plano executável.

O desenho correto não é:

- reimplementar telas soltas;
- abrir uma frente única e longa;
- tentar substituir o legado em big bang.

O desenho correto é:

- executar por fases curtas e fechadas;
- organizar cada fase por `capacidade operacional`;
- garantir `backend`, `estado`, `integração` e `saída clínica` antes de considerar a fase entregue.

## 2. Princípios do roadmap

Este roadmap assume sete princípios:

- `backend-first`;
- migração por `capacidades`, não por páginas;
- priorização da espinha `Exames -> Esteira -> Laudos`;
- especialização explícita para `Hemogramas`, `Urina` e `Bioquímico`;
- integração transversal desde o início com `animal`, `cliente`, `atendimento` e `internação`;
- rollout progressivo com convivência controlada entre `beta` e `legacy`;
- critérios de aceite operacionais, e não apenas visuais.

## 3. Ordem sugerida de execução

Sequência executiva recomendada:

1. `Fase 0` - Fundação e contratos de domínio
2. `Fase 1` - Core operacional mínimo
3. `Fase 2` - Resultados quantitativos
4. `Fase 3` - Resultado clínico-estruturado
5. `Fase 4` - Valores de referência
6. `Fase 5` - Equipamentos e governança técnica
7. `Fase 6` - Integrações transversais e reflexos econômicos
8. `Fase 7` - Rollout, corte controlado e desativação progressiva do legado

## 4. Fase 0 - Fundação e contratos de domínio

Objetivo:

- criar o domínio laboratorial como capacidade real no target.

Épicos:

- `LAB-001` Arquitetura de domínio do laboratório
- `LAB-002` Persistência de ordens, estados e laudos
- `LAB-003` Contratos de integração com domínios-base
- `LAB-004` Permissão, auditoria e rastreabilidade

Backlog executivo:

- definir agregados mínimos do laboratório;
- criar persistência para ordem de exame;
- criar persistência para estado da esteira;
- criar persistência para laudo e tipo de laudo;
- formalizar vínculos com `animal`, `cliente`, `atendimento` e `internação`;
- definir transições de estado permitidas;
- registrar eventos auditáveis críticos.

Dependências:

- domínio de identidade e permissão disponível;
- entidades `animal` e `cliente` já estáveis;
- capacidade de auditoria já existente no target.

Critérios de aceite:

- existe API laboratorial real;
- ordens, estados e laudos persistem sem fallback local;
- integrações-base estão contratuais e testáveis;
- o domínio pode ser usado por outros módulos sem dependência de tela legacy.

## 5. Fase 1 - Core operacional mínimo

Objetivo:

- fechar a primeira jornada ponta a ponta do laboratório fora do legado.

Épicos:

- `LAB-101` Ordens de exame
- `LAB-102` Esteira de exames
- `LAB-103` Emissão e consulta de laudos
- `LAB-104` Tipos e templates de laudo

Backlog executivo:

- implementar listagem e detalhe de `Exames`;
- implementar fluxo operacional da `Esteira de Exames`;
- permitir emissão, edição controlada e consulta de `Laudos`;
- implementar gestão de `Tipos de Laudo`;
- garantir vínculo explícito entre ordem, estado e laudo.

Dependências:

- `Fase 0` concluída;
- contratos de estados e eventos já estáveis.

Critérios de aceite:

- o fluxo `requisição -> esteira -> laudo` opera no target;
- usuários conseguem localizar, acompanhar e concluir uma ordem;
- a esteira controla o status operacional sem depender de UI legacy;
- o laudo é emitido com rastreabilidade da ordem de origem.

## 6. Fase 2 - Resultados quantitativos

Objetivo:

- migrar a parte analítica tabular de maior densidade operacional.

Épicos:

- `LAB-201` Hemogramas
- `LAB-202` Bioquímico
- `LAB-203` Motor de parâmetros quantitativos

Backlog executivo:

- criar modelo de resultado tabular parametrizado;
- implementar captura, edição e leitura de `Hemogramas`;
- implementar captura, edição e leitura de `Bioquímico`;
- preparar vínculo com valores de referência;
- expor resultados estruturados para composição de laudo.

Dependências:

- `Fase 1` concluída;
- estrutura de laudo pronta para consumir resultado analítico.

Critérios de aceite:

- `Hemogramas` e `Bioquímico` funcionam fora do legado;
- resultados ficam vinculados à ordem correta;
- parâmetros podem ser persistidos e reabertos com consistência;
- o laudo consegue consumir os resultados sem retrabalho manual estrutural.

## 7. Fase 3 - Resultado clínico-estruturado

Objetivo:

- migrar a trilha analítica que exige modelagem diferente da tabular.

Épicos:

- `LAB-301` Urina
- `LAB-302` Motor de seções clínicas estruturadas

Backlog executivo:

- implementar modelo com camadas `física`, `química` e `microscópica`;
- suportar dados descritivos e semi-quantitativos;
- integrar o resultado ao fluxo da esteira;
- integrar o resultado à emissão de laudo.

Dependências:

- `Fase 1` concluída;
- idealmente `Fase 2` já estabilizada para reaproveitar padrões laboratoriais comuns.

Critérios de aceite:

- `Urina` opera no target com modelagem própria;
- o módulo não depende de adaptação forçada do modelo tabular;
- resultado, ordem e laudo permanecem coerentes entre si.

## 8. Fase 4 - Valores de referência

Objetivo:

- dar contexto clínico automático aos resultados quantitativos.

Épicos:

- `LAB-401` Referências de hemograma
- `LAB-402` Referências de bioquímico
- `LAB-403` Aplicação automática de faixa e desvio

Backlog executivo:

- implementar cadastro de `Vlr. Ref. Hemograma`;
- implementar cadastro de `Vlr. Ref. Bioquímico`;
- modelar referência por espécie, tipo, parâmetro e idade;
- aplicar automaticamente faixas nos módulos quantitativos;
- destacar desvios com previsibilidade.

Dependências:

- `Fase 2` concluída ou suficientemente madura.

Critérios de aceite:

- resultados quantitativos deixam de ser números isolados;
- o sistema identifica desvios com base normativa persistida;
- a regra de interpretação é reproduzível e auditável.

## 9. Fase 5 - Equipamentos e governança técnica

Objetivo:

- formalizar a base técnica que sustenta a confiança operacional do laboratório.

Épicos:

- `LAB-501` Cadastro de equipamentos
- `LAB-502` Manutenção
- `LAB-503` Calibração

Backlog executivo:

- implementar cadastro de equipamentos laboratoriais;
- implementar histórico de manutenção preventiva e corretiva;
- implementar controle de calibração;
- relacionar ativos com contexto laboratorial quando aplicável.

Dependências:

- `Fase 0` concluída;
- idealmente `Fase 2` e `Fase 4` já em andamento ou estáveis.

Critérios de aceite:

- existe inventário formal de ativos laboratoriais;
- manutenção e calibração deixam rastro utilizável;
- a operação laboratorial ganha sustentação técnica explícita.

## 10. Fase 6 - Integrações transversais e reflexos econômicos

Objetivo:

- fechar o laboratório como domínio transversal completo.

Épicos:

- `LAB-601` Integração com atendimento
- `LAB-602` Integração com internação
- `LAB-603` Contexto relacional de cliente e animal
- `LAB-604` Reflexo financeiro e comercial
- `LAB-605` Entrega e comunicação

Backlog executivo:

- vincular origem do exame ao contexto assistencial;
- ligar exames e laudos ao ciclo de `internação` quando aplicável;
- consolidar leitura de `animal` como paciente e `cliente` como titular;
- mapear origem econômica da execução laboratorial;
- fechar entrega documental e pontos de comunicação.

Dependências:

- `Fase 1` concluída;
- `Fase 2` a `Fase 4` suficientemente maduras;
- integração financeira disponível no target.

Critérios de aceite:

- o laboratório conversa corretamente com `atendimento` e `internação`;
- a origem e o impacto econômico ficam rastreáveis;
- cliente e animal aparecem de forma coerente ao longo da jornada;
- a entrega do resultado fecha o ciclo operacional.

## 11. Fase 7 - Rollout e transição controlada

Objetivo:

- trocar dependência do legado por uso real do target sem ruptura operacional.

Épicos:

- `LAB-701` Habilitação progressiva
- `LAB-702` Observabilidade e suporte
- `LAB-703` Desativação progressiva do legado

Backlog executivo:

- definir estratégia de liberação por unidade, perfil ou capacidade;
- monitorar uso, erro, regressão e bloqueio operacional;
- manter trilha de fallback controlado enquanto necessário;
- desligar superfícies legacy por blocos já absorvidos.

Dependências:

- `Fase 1` a `Fase 6` com maturidade suficiente;
- observabilidade e suporte operacional disponíveis.

Critérios de aceite:

- grupos-piloto operam no target sem ruptura relevante;
- indicadores mínimos de estabilidade estão dentro do esperado;
- o legado começa a ser desligado por capacidade absorvida, e não por conveniência de interface.

## 12. Mapa resumido de dependências

Dependência estrutural principal:

- `Fase 0` sustenta todas as demais.

Dependência operacional principal:

- `Fase 1` é pré-requisito real para qualquer migração clínica utilizável.

Dependências funcionais:

- `Fase 2` depende de `Fase 1`;
- `Fase 3` depende de `Fase 1`;
- `Fase 4` depende de `Fase 2`;
- `Fase 5` depende de `Fase 0`;
- `Fase 6` depende da maturidade de `Fase 1` e da estabilidade analítica das fases especializadas;
- `Fase 7` depende da maturidade combinada das fases anteriores.

## 13. Critério executivo de priorização

Prioridade imediata:

- `Fase 0`
- `Fase 1`

Prioridade de profundidade clínica:

- `Fase 2`
- `Fase 3`

Prioridade de robustez técnica:

- `Fase 4`
- `Fase 5`

Prioridade de fechamento de produto:

- `Fase 6`
- `Fase 7`

## 14. Recomendação executiva final

Recomendação objetiva:

- iniciar pelo bloco `Fase 0 + Fase 1` como programa único;
- tratar `Fase 2` e `Fase 3` como segunda onda de profundidade clínica;
- não abrir `Fase 6` antes de o core laboratorial estar operacionalmente estável;
- usar `Fase 7` como disciplina de corte progressivo, não como evento final improvisado.

Conclusão:

- a migração do `Laboratório` já pode ser tratada como programa entregável;
- o sucesso depende de respeitar a ordem de dependências;
- a troca correta é por capacidade operacional absorvida, e não por quantidade de telas refeitas.
