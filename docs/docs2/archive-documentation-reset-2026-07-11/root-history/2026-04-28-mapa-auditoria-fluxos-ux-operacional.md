# Mapa de Auditoria de Fluxos e UX Operacional

Data: 2026-04-28
Status: rascunho para leitura e ajuste do responsavel
Escopo: `apps/spa` como frontend canonico do `cvg-his-v2`

## 1. Objetivo

Este documento organiza a proxima frente de evolucao do `cvg-his-v2`: testar, auditar e redesenhar os principais fluxos operacionais do ERP embrionario, com foco em usabilidade diaria, reducao de friccao e maturidade visual.

A intencao nao e reimplementar tudo, nem trocar a arquitetura. A intencao e criar uma base clara para decidir o que deve ser observado, medido, redesenhado e depois entregue por agentes executores.

## 2. Direcao de produto

O `cvg-his-v2` deve evoluir de uma interface "premium arrojada" para uma interface mais operacional, sobria, precisa e intima.

Direcao visual desejada:

- Inspiracao alema: ordem, clareza, rigor, previsibilidade e baixa ornamentacao.
- Ambiente clinico-administrativo: serio, confiavel, silencioso e rapido de operar.
- ERP de uso diario: densidade informacional adequada, sem excesso de cards decorativos.
- Hospital veterinario: foco em seguranca do paciente, rastreabilidade, atendimento e financeiro.
- Premium discreto: qualidade percebida por acabamento, consistencia e ergonomia, nao por efeitos visuais.

## 3. Problema percebido

O estado atual ja tem superficie de ERP, mas a experiencia ainda pode transmitir um tom visual infantilizado ou excessivamente ludico em pontos estruturais.

Sinais observados que reforcam essa percepcao:

- Uso intenso de emojis como icones de navegacao, rotas, cards e acoes.
- Gradientes azulados, brilho, glassmorphism e fundos decorativos no shell.
- Muitos elementos em formato pill, raio alto e botoes arredondados demais.
- Contraste entre telas operacionais densas e uma moldura visual mais promocional.
- Menu lateral com muitos itens, alguns longos, competindo por atencao.
- Uso de "premium" na linguagem visual de forma mais estetica do que operacional.

## 4. Principios de redesenho

### 4.1 Clareza antes de ornamento

Toda tela deve responder rapidamente:

- Onde estou?
- Qual e o proximo passo?
- Qual informacao exige atencao agora?
- O que esta pendente, atrasado, critico ou bloqueado?

### 4.2 Fluxo antes de modulo

O usuario nao pensa em arquitetura de software. Ele pensa em trabalho:

- "Chegou um cliente."
- "Preciso abrir atendimento."
- "Preciso registrar triagem."
- "Preciso cobrar."
- "Preciso dar alta."

A navegacao deve apoiar essas jornadas, nao apenas listar modulos.

### 4.3 Sobriedade visual

Reduzir:

- emojis como linguagem principal;
- gradientes decorativos;
- sombras amplas;
- microanimacoes sem funcao;
- cards excessivamente grandes;
- arredondamento exagerado;
- textos promocionais ou autoexplicativos demais.

Manter ou ampliar:

- contraste funcional;
- hierarquia tipografica;
- estados vazios objetivos;
- labels operacionais;
- tabelas e listas escaneaveis;
- acoes principais bem posicionadas;
- estados de erro, loading e bloqueio.

### 4.4 Densidade controlada

O ERP deve ser eficiente em desktop e tablet de bancada. Telas de operacao devem mostrar muita informacao, mas com hierarquia.

Regra pratica:

- Dashboard pode ser mais resumido.
- Atendimento, fila, prontuario, internacao, laboratorio e financeiro devem priorizar produtividade.
- Cadastro pode ser mais limpo, mas nao deve esconder o que o usuario usa todo dia.

### 4.5 Uma acao primaria por tela

Cada tela deve ter uma acao primaria inequivoca no header. As demais ficam como secundarias, ghost ou menus.

Exemplos:

- Agenda: "Criar agendamento"
- Fila: "Novo check-in" ou "Chamar proximo"
- Prontuario: "Registrar evolucao"
- Internacao: "Admitir paciente"
- Comanda: "Fechar comanda"

## 5. Criterio de priorizacao

Os fluxos serao priorizados por impacto operacional, nao por facilidade tecnica.

| Criterio | Peso | Pergunta de avaliacao |
| --- | ---: | --- |
| Frequencia | 5 | Quantas vezes por dia esse fluxo acontece? |
| Risco clinico | 5 | Uma falha pode afetar seguranca do paciente? |
| Risco financeiro | 4 | Uma falha pode causar perda de receita, cobranca errada ou retrabalho? |
| Friccao atual | 4 | O usuario precisa dar muitos cliques, procurar informacao ou repetir cadastro? |
| Dependencias | 3 | Esse fluxo alimenta outros modulos? |
| Visibilidade | 3 | Esse fluxo e percebido diretamente pela equipe ou gestao? |

## 6. Ranking inicial

| Prioridade | Fluxo | Impacto | Risco | Motivo |
| ---: | --- | --- | --- | --- |
| 1 | Recepcao em 60 segundos | Muito alto | Alto | Porta de entrada do ERP; se falha, toda operacao atrasa. |
| 2 | Atendimento clinico | Muito alto | Critico | Conecta fila, triagem, prontuario, prescricao e comanda. |
| 3 | Internacao | Alto | Critico | Exige controle continuo, visibilidade e seguranca assistencial. |
| 4 | Financeiro/comanda | Alto | Alto | Fecha a jornada operacional e garante recebimento. |
| 5 | Laboratorio | Medio/alto | Alto | Impacta diagnostico, resultado e continuidade do atendimento. |

Observacao: laboratorio fica como prioridade 5 apenas por frequencia relativa. Em risco clinico, ele continua alto.

## 6.1 Jornadas por colaborador

A usabilidade do `cvg-his-v2` deve ser desenhada por jornada de colaborador, nao apenas por modulo. O mesmo atendimento passa por varios papeis, e cada papel precisa enxergar apenas o que precisa decidir naquele momento.

### Jornada da recepcao

Fluxo base para cliente novo:

1. Novo cliente chega na recepcao.
2. Recepcao cadastra tutor.
3. Recepcao cadastra paciente/animal.
4. Recepcao abre comanda vinculada ao atendimento.
5. Recepcao envia paciente para a esteira de atendimento.
6. Paciente aguarda atendimento veterinario.
7. Veterinario conclui a parte clinica e devolve para a esteira da recepcao.
8. Recepcao pega o atendimento na esteira para finalizacao.
9. Recepcao consulta o orcamento aprovado ou indicado pelo veterinario.
10. Recepcao faz os lancamentos na comanda.
11. Recepcao realiza a cobranca.
12. Se houver venda de balcao, recepcao adiciona a venda vinculada ou complementar.
13. Recepcao fecha a comanda.

Principio de UX:

- A recepcao precisa de uma visao de funil: entrada -> em atendimento -> aguardando finalizacao -> cobranca -> comanda fechada.
- A tela da recepcao nao deve parecer prontuario clinico.
- A recepcao precisa enxergar status, pendencias, orcamento, comanda e cobranca sem procurar em varias rotas.
- Cadastro de tutor e paciente deve ser rapido, com dados minimos primeiro e complementacao depois.
- A comanda deve nascer cedo o suficiente para acumular itens, mas nao deve atrapalhar a abertura rapida do atendimento.

### Jornada do veterinario clinico

Fluxo base do atendimento clinico:

1. Veterinario pega a ficha do paciente na esteira de atendimento (`Queue`).
2. Veterinario abre o prontuario do animal.
3. Veterinario registra anamnese e ficha de atendimento.
4. A partir da ficha, o atendimento pode gerar varios desdobramentos:
   - coleta de exames durante o atendimento;
   - agendamento de exames;
   - aplicacao de medicacoes durante o atendimento;
   - prescricao de medicacoes para casa ou continuidade;
   - elaboracao ou indicacao de orcamento;
   - emissao de guias de exames;
   - emissao de receitas;
   - orientacoes e encaminhamentos.
5. Veterinario envia o atendimento de volta para a esteira da recepcao.

Principio de UX:

- O veterinario precisa de uma visao de cockpit clinico: historico, anamnese, exame fisico, conduta, exames, prescricoes, orcamento e encaminhamento.
- A tela do veterinario nao deve parecer caixa nem cadastro administrativo.
- O prontuario deve permitir registrar rapidamente a consulta e abrir desdobramentos sem perder o contexto do paciente.
- Orcamento, guias, receitas e prescricoes devem nascer do atendimento clinico, mas seguir para a recepcao quando exigirem finalizacao operacional ou financeira.
- O envio de volta para a recepcao deve ser uma acao explicita, com pendencias visiveis.

### Fluxos especializados

O atendimento clinico comum nao deve ser usado como molde unico para todos os setores. Internacao, cirurgia, ultrassom, raio-x, especialidades e exames laboratoriais precisam de fluxos customizados.

Diretriz:

- Cada area especializada deve ter sua propria jornada, seus status e suas telas de trabalho.
- A esteira pode ser compartilhada como conceito, mas a experiencia interna de cada area deve respeitar a rotina real.
- O prontuario deve ser o ponto clinico comum, mas nao deve concentrar todas as operacoes de todos os setores.
- A recepcao deve receber de volta apenas o que precisa finalizar: cobranca, agendamento, orientacao, documento, comanda ou proximo passo.

### Decisoes preliminares de modelagem UX

- A `Queue` deve ser a esteira operacional central. Nao deve existir uma fila paralela da recepcao desconectada da esteira.
- O `Encounter` deve ser tratado como item de fila. Exemplo de item: esteira da clinica, enviado por Mauricio, tutor Joaquim, horario de entrada, motivo do atendimento, status atual e proxima responsabilidade.
- A busca operacional deve aceitar identificadores reais do atendimento: ID, telefone, RG, CPF, nome do tutor, nome do animal e, quando existir, codigo interno do paciente.
- Comanda de retorno pode existir com ou sem animal presente. Em alguns casos, o tutor vem apenas conversar sobre um caso, retirar orientacao, aprovar orcamento ou comprar algo relacionado.
- Orcamento pode ser isolado do atendimento presencial. Deve ser possivel gerar orcamento por contato de WhatsApp, telefone ou conversa presencial sem o animal estar na clinica.
- Venda de produto de balcao pode ser desconectada da comanda de atendimento.
- Venda de servico deve abrir comanda de atendimento, porque servico pressupoe relacao operacional com cliente/paciente ou gera lead qualificado para o hospital.
- Venda de balcao com comanda aberta pode ser usada estrategicamente para gerar lead e historico, pois obriga cadastro do cliente.
- O desenho de CTAs deve considerar o uso global da ferramenta. Uma tela isolada pode parecer correta, mas falhar se a acao primaria nao empurrar o fluxo completo para frente.

## 7. Fluxo 1: Recepcao em 60 segundos

### Objetivo operacional

Permitir que a recepcao registre ou encontre rapidamente cliente e animal, abra comanda, envie para a esteira de atendimento e depois finalize orcamento, lancamentos, cobranca, venda de balcao e fechamento da comanda com o minimo de friccao.

### Usuarios principais

- Recepcionista
- Auxiliar administrativo
- Gestor de atendimento

### Superficies provaveis

- `/owners`
- `/patients`
- `/appointments`
- `/queue`
- `/encounters`
- `/counter-sales`
- `/billing`
- `/cash`
- `/sales`
- Busca global / command palette

### Historia ideal

O cliente chega. A recepcao busca por ID, telefone, RG, CPF, nome do tutor, nome do animal ou codigo interno do paciente. Se existir cadastro, confirma dados minimos. Se nao existir, faz cadastro rapido de tutor + animal sem trocar de contexto. Em seguida, abre comanda quando o caso exigir, cria ou atualiza o `Encounter` como item da `Queue`, envia o paciente para a esteira de atendimento e acompanha o status. Quando o veterinario devolve o atendimento para a recepcao, a equipe pega o item na `Queue`, consulta orcamento, lanca itens na comanda, faz a cobranca, adiciona eventual venda de balcao quando fizer sentido e fecha a comanda.

### Pontos de auditoria

- O usuario consegue buscar cliente/animal por ID, telefone, RG, CPF, nome do tutor, nome do animal ou codigo interno?
- Existe cadastro rapido unificado cliente + animal?
- O fluxo diferencia emergencia, consulta agendada e atendimento espontaneo?
- O usuario consegue abrir atendimento sem navegar por varios modulos?
- A comanda pode ser aberta cedo e permanecer vinculada ao atendimento?
- O `Encounter` aparece como item de `Queue` com origem, responsavel, tutor, horario, motivo e status?
- A `Queue` mostra quais pacientes estao aguardando atendimento e quais voltaram para finalizacao?
- O orcamento do veterinario chega para a recepcao de forma clara?
- O sistema permite orcamento isolado por WhatsApp, telefone ou conversa presencial sem animal presente?
- Os lancamentos na comanda podem ser feitos sem recadastrar dados do atendimento?
- Venda de produto de balcao pode ficar desconectada da comanda de atendimento quando for apenas produto?
- Venda de servico abre comanda de atendimento, mesmo quando nasce na recepcao?
- O fechamento da comanda mostra pendencias antes de concluir?
- Campos obrigatorios sao realmente minimos para a recepcao?
- Existe prevencao de duplicidade de cliente/animal?
- O check-in gera entrada coerente na fila operacional?
- O usuario entende se o animal esta ativo, internado, em atendimento ou com pendencia?

### Sintomas de friccao

- Troca obrigatoria entre tela de clientes e tela de animais.
- Cadastro completo exigido antes de resolver a chegada.
- Busca limitada a uma entidade ou sem suporte a ID, telefone, RG e CPF.
- Falta de estado claro apos criar atendimento porque o `Encounter` nao vira item operacional da `Queue`.
- Comanda sem entendimento de retorno com ou sem animal presente.
- Recepcao tentando operar uma fila propria quando o correto e a `Queue` central.
- Orcamento clinico ou comercial chegando por comunicacao informal ou fora do sistema.
- Orcamento de WhatsApp ou contato presencial sem animal presente sem fluxo proprio.
- Venda de produto e venda de servico tratadas como se tivessem a mesma regra operacional.
- CTA primario pensado para a tela isolada, nao para mover a jornada global.

### Alvo de melhoria

- Criar conceito de "Recepcao Rapida" ou "Entrada de Atendimento".
- Busca transversal por ID, telefone, RG, CPF, tutor, animal e codigo interno.
- Cadastro minimo progressivo.
- Abertura direta de agendamento, check-in, atendimento, retorno ou orcamento.
- `Encounter` como item da `Queue`, com estado, origem, responsavel, tutor, horario e motivo.
- Estados na `Queue`: novo, aguardando atendimento, em atendimento, aguardando finalizacao, em cobranca, fechado.
- Comanda vinculada quando houver atendimento, servico, cobranca ou retorno operacional.
- Orcamento isolado para WhatsApp, telefone ou conversa presencial, com possibilidade de virar atendimento/comanda depois.
- Orcamento e itens sugeridos pelo veterinario chegando como pendencia operacional na `Queue`.
- Fechamento guiado da comanda, separando produto de balcao, servico e atendimento clinico.
- Feedback claro: "Atendimento aberto", "Entrou na fila", "Agendamento confirmado".

### Aceite funcional de UX

- Um usuario treinado deve conseguir abrir um atendimento simples em ate 60 segundos.
- O fluxo nao deve exigir abrir mais de tres telas.
- O usuario deve ver claramente o proximo passo ao final.
- Duplicidades devem ser sinalizadas antes de salvar cadastro novo.
- A recepcao deve conseguir identificar rapidamente na `Queue` o que voltou do veterinario para finalizacao.
- Uma comanda nao deve ser fechada sem mostrar itens, pagamentos e pendencias relevantes.
- Venda de produto sem atendimento pode ser concluida sem forcar fluxo clinico.
- Venda de servico deve gerar comanda de atendimento ou lead operacional rastreavel.

## 8. Fluxo 2: Atendimento clinico

### Objetivo operacional

Conduzir o atendimento do veterinario clinico desde a retirada da ficha na esteira ate prontuario, anamnese, ficha de atendimento, desdobramentos clinicos, orcamento, guias, receitas e devolucao para a esteira da recepcao.

### Usuarios principais

- Veterinario
- Auxiliar
- Recepcao
- Coordenador clinico

### Superficies provaveis

- `/queue`
- `/triage`
- `/encounters`
- `/medical-records`
- `/prescriptions`
- `/prescription-executions`
- `/diagnostics`
- `/exam-orders`
- `/laboratory/orders`
- `/counter-sales`
- `/billing`

### Historia ideal

O veterinario pega a ficha do paciente na esteira de atendimento, abre o prontuario do animal, registra anamnese e ficha de atendimento. A partir do mesmo contexto, pode coletar exames, agendar exames, aplicar medicacoes durante o atendimento, prescrever medicacoes, passar orcamento, emitir guias de exames e receitas. Ao concluir a parte clinica, envia o atendimento para a esteira da recepcao com pendencias e proximos passos claros.

### Pontos de auditoria

- A fila deixa claro quem esta aguardando, em atendimento, atrasado ou critico?
- A triagem esta conectada ao prontuario e ao atendimento ativo?
- O prontuario mostra informacoes clinicas recentes sem excesso de blocos abertos?
- A anamnese e a ficha de atendimento sao rapidas de registrar?
- Coleta de exame, pedido de exame e guia de exame podem nascer do atendimento ativo?
- Medicacoes aplicadas durante o atendimento ficam separadas de prescricoes para casa?
- Prescricao e execucao sao rastreaveis e visiveis no contexto do atendimento?
- Orcamento pode ser criado ou indicado sem tirar o veterinario do prontuario?
- Receitas podem ser emitidas a partir da conduta registrada?
- O envio para recepcao carrega pendencias, orcamento, documentos e cobrancas sugeridas?
- Itens consumidos ou servicos executados entram na comanda sem recadastro?
- O usuario sabe quando o atendimento esta incompleto?
- O sistema diferencia salvar rascunho, finalizar atendimento e encaminhar para cobranca?

### Sintomas de friccao

- Fila e prontuario desconectados visualmente.
- Prontuario com excesso de informacao aberta de uma vez.
- Acoes clinicas espalhadas em varias telas sem trilha clara.
- Prescricao sem destaque de risco, pendencia ou execucao.
- Comanda tratada como modulo isolado e nao como consequencia do atendimento.
- Guia, receita, exame, orcamento e medicacao competindo como acoes soltas.
- Cabecalho do prontuario cheio de informacao e botoes, sem separar localizacao, contexto e proximos passos.
- Veterinario sem acao clara de "enviar para recepcao".

### Alvo de melhoria

- Criar cockpit de atendimento ativo.
- Mostrar trilha: Esteira -> Prontuario -> Anamnese/Ficha -> Desdobramentos -> Enviar para recepcao.
- Priorizar resumo clinico, alertas, ultimas evolucoes, pendencias e acoes.
- Trocar cabecalho pesado por trilha operacional clicavel alinhada a esquerda e sugestoes de proximos passos alinhadas a direita.
- Integrar servicos/produtos usados no atendimento com comanda.
- Separar visualmente: aplicado no atendimento, prescrito para casa, solicitado como exame, agendado, orcado e enviado para recepcao.
- Tornar pendencias visiveis antes de finalizar.

### Aceite funcional de UX

- O profissional deve entender o estado do atendimento em ate 5 segundos.
- A proxima acao clinica deve estar no primeiro viewport.
- O prontuario nao deve obrigar rolagem extensa para registrar evolucao simples.
- Prescricoes pendentes devem ser visiveis e acionaveis.
- O envio para recepcao deve deixar claro o que a recepcao precisa finalizar.
- O veterinario nao deve precisar abrir modulo financeiro completo para indicar orcamento ou itens cobraveis.

## 9. Fluxo 3: Internacao

### Objetivo operacional

Controlar admissao, leito, evolucao, prescricoes, execucoes, transferencia e alta de pacientes internados.

### Usuarios principais

- Veterinario internista
- Enfermagem
- Recepcao
- Coordenador hospitalar

### Superficies provaveis

- `/inpatient`
- `/inpatient/board`
- `/beds`
- `/sectors`
- `/medical-records`
- `/prescriptions`
- `/prescription-executions`
- `/discharges`

### Historia ideal

O paciente e admitido a partir de atendimento existente, recebe setor/leito, aparece no mapa de internacao com status clinico e pendencias. A equipe registra evolucao, acompanha medicacoes e procedimentos, transfere leito quando necessario e gera alta com rastreabilidade.

### Pontos de auditoria

- A admissao parte do atendimento correto?
- O mapa de leitos mostra ocupacao, criticidade, pendencias e responsaveis?
- A equipe consegue registrar evolucao rapidamente por paciente?
- Prescricoes e execucoes aparecem no contexto da internacao?
- Transferencia de leito e alta sao acoes claras e auditaveis?
- Existe diferenciacao visual entre leito livre, ocupado, higienizacao, bloqueado e alta prevista?
- O usuario consegue operar em tela de bancada sem abrir muitos modais?

### Sintomas de friccao

- Mapa de leitos bonito, mas pouco operacional.
- Dificuldade de enxergar pendencias por paciente.
- Evolucao, prescricao e execucao em rotas separadas sem contexto.
- Alta sem checklist ou sem impacto claro no leito.

### Alvo de melhoria

- Mapa de leitos como painel de comando, nao apenas visualizacao.
- Cards compactos com status, prioridade, proxima medicacao e pendencias.
- Drawer de paciente internado com resumo e acoes.
- Checklist de alta: evolucao, prescricoes pendentes, financeiro, orientacoes.
- Estados visuais sobrios e sem emojis.

### Aceite funcional de UX

- A equipe deve identificar leitos criticos e pendencias sem abrir detalhe.
- Transferencia e alta devem exigir confirmacao clara.
- O estado do leito deve atualizar de forma previsivel apos acao.
- Informacao clinica sensivel deve ter hierarquia e nao competir com decoracao.

## 10. Fluxo 4: Laboratorio

### Objetivo operacional

Conectar pedido de exame, coleta/execucao, resultado/laudo e retorno ao atendimento/prontuario.

### Usuarios principais

- Veterinario solicitante
- Laboratorio
- Auxiliar tecnico
- Recepcao, quando acompanha status para o cliente

### Superficies provaveis

- `/laboratory`
- `/laboratory/orders`
- `/laboratory/results`
- `/laboratory/hemograms`
- `/laboratory/urinalysis`
- `/laboratory/biochemistry`
- `/diagnostics`
- `/exam-orders`
- `/exam-results`
- `/medical-records`

### Historia ideal

O veterinario solicita exame a partir do atendimento. O laboratorio visualiza fila de pedidos, registra coleta/execucao, publica resultado/laudo e o prontuario recebe o evento com status claro para o profissional.

### Pontos de auditoria

- O pedido nasce do atendimento/prontuario ou exige ida ao modulo de laboratorio?
- A fila do laboratorio separa solicitado, coletado, em analise, liberado e cancelado?
- Laudo e resultado voltam para o prontuario automaticamente?
- Hemograma, urina e bioquimico seguem padrao visual comum?
- Existem estados vazios e erros claros?
- O usuario entende quando um resultado exige acao clinica?

### Sintomas de friccao

- Exames tratados como cadastro isolado.
- Duplicidade entre laboratorio, diagnostico e exam-orders.
- Falta de status operacional de ponta a ponta.
- Resultado visivel no laboratorio mas pouco destacado no prontuario.

### Alvo de melhoria

- Linha de status do exame.
- Fila tecnica por etapa.
- Padrao unico para resultado/laudo.
- Retorno claro ao prontuario e notificacao ao responsavel.
- Menos cards decorativos, mais lista operacional.

### Aceite funcional de UX

- Um pedido deve ser rastreavel do atendimento ate o resultado.
- O laboratorio deve conseguir filtrar pendencias rapidamente.
- Resultado liberado deve aparecer no contexto clinico do paciente.
- Estados tecnicos devem usar labels consistentes.

## 11. Fluxo 5: Financeiro/comanda

### Objetivo operacional

Garantir que produtos, servicos, procedimentos e consumos gerados durante o atendimento sejam cobrados corretamente e fechados com baixa/recebimento coerente.

### Usuarios principais

- Recepcao/caixa
- Veterinario
- Gestor financeiro
- Estoque, quando ha consumo de produto

### Superficies provaveis

- `/counter-sales`
- `/sales`
- `/billing`
- `/cash`
- `/payment-methods`
- `/products`
- `/services`
- `/inventory`

### Historia ideal

Durante o atendimento, itens sao adicionados automaticamente ou por acao assistida. Ao final, a recepcao revisa comanda, aplica pagamento, gera recebivel/caixa e encerra o atendimento com rastreabilidade.

### Pontos de auditoria

- A comanda nasce automaticamente do atendimento ou precisa ser aberta manualmente?
- Servicos e produtos usados no atendimento aparecem para cobranca?
- O usuario consegue identificar itens pendentes, pagos, cancelados ou em aberto?
- O fechamento financeiro deixa claro forma de pagamento, desconto, recebivel e caixa?
- Ha prevencao contra atendimento finalizado sem cobranca de itens obrigatorios?
- O fluxo conversa com estoque quando ha consumo?

### Sintomas de friccao

- Atendimento e comanda como mundos separados.
- Caixa sem visao do contexto clinico/comercial.
- Itens cobraveis esquecidos.
- Fechamento com muitas etapas ou feedback pouco claro.
- Relatorios financeiros desconectados da rotina diaria.

### Alvo de melhoria

- Comanda como consequencia operacional do atendimento.
- Revisao de itens antes do fechamento.
- Status financeiro visivel no atendimento.
- Fluxo de caixa com estados objetivos.
- Alertas de inconsistencia antes de finalizar.

### Aceite funcional de UX

- A recepcao deve conseguir fechar comanda sem procurar manualmente o atendimento.
- Itens assistenciais cobraveis devem aparecer de forma rastreavel.
- O fechamento deve deixar claro o status financeiro final.
- O sistema deve sinalizar divergencias antes da finalizacao.

## 12. Auditoria visual transversal

Esta auditoria deve rodar em paralelo aos fluxos, porque os problemas visuais se repetem no shell e nos componentes.

### 12.1 Navegacao

Verificar:

- excesso de itens por grupo;
- labels longos;
- ordem real de uso diario;
- duplicidade entre modulos parecidos;
- utilidade real de favoritos e recentes;
- uso de emojis como icones estruturais.

Direcao:

- substituir emojis por icones lineares consistentes;
- reduzir descricao secundaria dentro do menu;
- manter grupos principais alinhados ao Vetus quando fizer sentido;
- criar atalhos operacionais para fluxos, nao apenas rotas.

### 12.2 Shell visual

Verificar:

- gradientes;
- brilho/glass;
- sombras;
- fundos decorativos;
- arredondamento excessivo;
- altura da topbar;
- densidade da sidebar.

Direcao:

- fundo neutro e estavel;
- bordas discretas;
- sombras minimas;
- topbar mais compacta;
- sidebar mais tecnica;
- foco na area de trabalho.

### 12.3 Cabecalho contextual de pagina

O cabecalho atual das paginas principais nao deve concentrar informacao demais nem virar uma barra cheia de botoes. Para uma direcao mais sobria e operacional, o cabecalho deve separar tres responsabilidades: localizacao, contexto e proximo passo.

Modelo proposto:

- Alinhado a esquerda: trilha operacional clicavel, por exemplo `Inicio > Cliente > Animal > Atendimento > Anamnese`.
- Centro ou segunda linha discreta: contexto minimo do item atual, somente quando necessario, como tutor, animal, horario, status ou responsavel.
- Alinhado a direita: sugestoes contextuais de proximos passos, como `Receita`, `Exames`, `Internacao`, `Orcamento` ou `Enviar para recepcao`.

Regras:

- A trilha deve ser clicavel e refletir a jornada real, nao apenas a URL tecnica.
- O cabecalho deve evitar muitos botoes simultaneos.
- Proximos passos devem ser sugeridos por contexto, nao exibidos todos ao mesmo tempo.
- A acao primaria deve empurrar a jornada global para frente.
- Acoes secundarias devem ir para menus, drawers ou areas especificas do fluxo.
- Em telas clinicas, o cabecalho deve ajudar o veterinario a entender onde esta no atendimento e o que pode fazer depois.
- Em telas da recepcao, o cabecalho deve ajudar a entender status de fila, comanda, cobranca e finalizacao.

### 12.4 Componentes

Verificar:

- botoes;
- campos;
- badges;
- cards;
- tabelas;
- drawers/modais;
- empty states;
- loading/error states.

Direcao:

- raio entre 4px e 8px na maioria dos componentes;
- menos cards aninhados;
- tabelas mais densas;
- badges com semantica clara;
- botoes sem movimento decorativo;
- focus state acessivel e discreto.

### 12.5 Linguagem

Verificar:

- termos promocionais;
- labels tecnicos demais;
- sinonimos para a mesma rotina;
- CTAs genericos;
- textos longos no primeiro viewport.

Direcao:

- copiar o vocabulario operacional do usuario;
- manter consistencia com `docs/navigation-copy-and-breadcrumb-conventions.md`;
- uma CTA primaria por tela;
- estados vazios com proxima acao util.

## 13. Metodo de auditoria

Cada fluxo deve ser avaliado em quatro camadas.

### 13.1 Caminho real

Registrar a jornada tela a tela:

- rota inicial;
- acao executada;
- tela/modal/drawer aberto;
- campos preenchidos;
- feedback recebido;
- proxima tela.

### 13.2 Tempo e cliques

Medir:

- tempo ate concluir;
- numero de telas;
- numero de cliques;
- numero de campos obrigatorios;
- pontos de espera/loading;
- erros ou bloqueios.

### 13.3 Carga cognitiva

Avaliar:

- o usuario entende onde esta?
- o usuario entende a proxima acao?
- informacao critica esta visivel?
- ha informacao demais no primeiro viewport?
- nomes de rotas e CTAs batem com o trabalho real?

### 13.4 Maturidade visual

Avaliar:

- a tela parece ERP hospitalar adulto?
- existe excesso de decoracao?
- ha emojis em pontos estruturais?
- contraste e espacamento ajudam ou atrapalham?
- a interface parece feita para uso repetido durante o dia?

## 14. Artefatos esperados por fluxo

Para cada fluxo auditado, produzir:

- mapa atual da jornada;
- gargalos encontrados;
- screenshot ou referencia visual;
- lista de ajustes de UX;
- lista de ajustes visuais;
- riscos clinicos/financeiros;
- backlog executavel para agentes;
- criterios de aceite;
- plano de verificacao.

## 15. Orquestracao sugerida de agentes executores

Quando o responsavel autorizar execucao, dividir em trilhas.

### Agente 1: Explorador de fluxo

Responsabilidade:

- navegar read-only pela SPA;
- documentar rotas, telas e friccoes;
- medir cliques e telas;
- nao alterar codigo.

Entregavel:

- relatorio por fluxo com evidencias e gargalos.

### Agente 2: Auditor visual/design system

Responsabilidade:

- inventariar emojis, gradientes, sombras, pills e inconsistencias;
- propor tokens e regras visuais;
- nao alterar codigo sem autorizacao posterior.

Entregavel:

- matriz de componentes e recomendacoes de redesign.

### Agente 3: Planejador de backlog

Responsabilidade:

- transformar auditoria em tarefas pequenas;
- separar quick wins de mudancas estruturais;
- definir criterios de aceite e verificacao.

Entregavel:

- backlog priorizado por fluxo, risco e impacto.

### Agente 4: Executor

Responsabilidade:

- implementar somente tarefas autorizadas;
- respeitar design system e rotas existentes;
- validar com teste, lint, typecheck ou Playwright conforme o caso.

Entregavel:

- patch pequeno, verificacao e resumo.

## 16. Fases recomendadas

### Fase 0: Alinhamento visual

Objetivo: fechar direcao de design antes de mexer nas telas.

Decisoes:

- paleta;
- icones;
- raio;
- sombras;
- densidade;
- topbar/sidebar;
- tom de linguagem.

### Fase 1: Auditoria sem codigo

Objetivo: testar os cinco fluxos e documentar gargalos.

Saida:

- matriz de fluxo atual;
- prioridades;
- riscos;
- quick wins.

### Fase 2: Fundacao visual

Objetivo: ajustar shell e design system para reduzir infantilizacao.

Escopo provavel:

- navegacao;
- `AppLayout`;
- `AppPageHeader`;
- `DsButton`;
- `DsCard`;
- `DataTable`;
- estados vazios.

### Fase 3: Fluxos criticos

Objetivo: melhorar os fluxos por impacto operacional.

Ordem sugerida:

1. Recepcao em 60 segundos.
2. Atendimento clinico.
3. Internacao.
4. Financeiro/comanda.
5. Laboratorio.

### Fase 4: Verificacao operacional

Objetivo: validar que as mudancas ajudam o usuario real.

Verificacoes:

- walkthrough manual;
- screenshots desktop/tablet;
- testes de rotas criticas;
- smoke dos fluxos principais;
- revisao de acessibilidade basica.

## 17. Matriz de decisao inicial

| Item | Decisao proposta | Precisa validacao do responsavel |
| --- | --- | --- |
| Emojis estruturais | Remover gradualmente da navegacao e CTAs | Sim |
| Iconografia | Adotar icones lineares consistentes | Sim |
| Paleta | Reduzir azul vivo; usar neutros e azul petroleo discreto | Sim |
| Gradientes | Remover do shell principal | Sim |
| Raio | Reduzir pills; manter 4px-8px como padrao | Sim |
| Menu | Priorizar rotas de uso diario e atalhos de fluxo | Sim |
| Prontuario | Manter conteudo colapsavel e orientado por resumo | Sim |
| Recepcao | Criar conceito de entrada rapida | Sim |
| Comanda | Conectar mais fortemente ao atendimento | Sim |

## 18. Perguntas para revisao do responsavel

1. A direcao "alema, sobria, precisa e intima" esta correta para o CVG?
2. Recepcao deve ser tratada como uma tela propria ou como fluxo distribuido entre busca, agenda e fila?
3. A prioridade correta e realmente Recepcao -> Atendimento -> Internacao -> Financeiro -> Laboratorio?
4. O sistema deve se aproximar visualmente mais de ERP hospitalar, sistema bancario, prontuario clinico ou backoffice industrial?
5. Quais telas voce considera mais "infantilizadas" hoje?
6. Quais telas voce considera mais proximas do ideal hoje?
7. A equipe usa mais desktop, notebook, tablet de bancada ou mobile?
8. O maior problema atual e encontrar telas, preencher formularios, entender status ou fechar fluxo?

## 19. Proximo passo

Depois da revisao deste documento, o proximo artefato deve ser um dos dois:

- `Brief visual do CVG-HIS-V2`: define paleta, iconografia, densidade, shell e componentes.
- `Roteiro de teste de fluxos operacionais`: define passo a passo para auditar cada fluxo na SPA.

Recomendacao: fechar primeiro o brief visual, porque ele evita que cada fluxo seja redesenhado com criterios diferentes.
