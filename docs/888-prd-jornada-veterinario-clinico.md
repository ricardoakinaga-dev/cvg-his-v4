# 888 - PRD da Jornada do Veterinario Clinico

Data: 2026-04-28
Status: PRD de produto para validacao, sem autorizacao de BUILD
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/881-roadmap-ux-operacional.md`, `docs/882-backlog-ux-operacional.md`, `docs/883-auditoria-ui-atual-ux-operacional.md`, `docs/885-spec-cabecalho-contextual.md`, `docs/886-modelo-operacional-queue-encounter.md`

## 0. Guardrail

Este PRD nao autoriza implementacao.

Ele nao define tela final, componente, rota, migration, API, schema clinico final, regra fiscal, regra financeira ou contrato tecnico. Ele descreve a jornada operacional desejada para validacao do responsavel.

Todo item DEV do cockpit clinico permanece bloqueado ate SPEC aprovada e autorizacao explicita.

## 0.1 Resumo operacional da jornada clinica

O veterinario trabalha a partir de uma ficha viva na `Queue`.

Essa ficha nao e apenas uma linha de espera. Ela representa um caso em andamento, com tutor, animal, motivo, prioridade, responsavel atual, estado operacional, pendencias e proximo passo.

O `Encounter` e o contexto unico do atendimento. Toda acao clinica relevante deve nascer dele ou estar vinculada a ele: anamnese, exame fisico, parametros, suspeita diagnostica, exames, terapeutica, prescricao, receita, orcamento, encaminhamento e devolucao para recepcao.

O cockpit clinico nao e apenas prontuario. Ele deve ser a superficie operacional onde o veterinario registra, decide, encaminha e devolve o caso para recepcao com pendencias claras.

O objetivo deste PRD e garantir continuidade entre clinica, recepcao, exames, internacao e financeiro. Este PRD nao autoriza BUILD, nao define schema tecnico final e nao libera `UX-DEV-004`.

## 1. Resumo

O veterinario clinico precisa operar a partir de uma ficha viva na `Queue`, abrir o prontuario do animal, registrar atendimento e gerar desdobramentos clinicos sem perder contexto.

A experiencia alvo deve funcionar como cockpit clinico: historico relevante, anamnese, exame fisico, parametros vitais, suspeita diagnostica, exames, terapeutica, prescricao, receita, orcamento, encaminhamento e retorno para recepcao.

## 2. Usuarios

Usuarios principais:

- veterinario clinico;
- veterinario plantonista;
- coordenador clinico.

Usuarios impactados:

- recepcao;
- laboratorio/imagem;
- internacao;
- financeiro;
- tutor, indiretamente pela qualidade da orientacao.

## 2.1 Contrato operacional do veterinario clinico

O veterinario clinico deve sempre:

- assumir ficha antes de registrar atendimento ativo;
- trabalhar dentro de um `Encounter`;
- registrar motivo/queixa principal;
- registrar anamnese minima ou justificativa operacional em emergencia;
- registrar exame fisico ou motivo de nao avaliacao;
- registrar parametros quando aplicavel;
- registrar suspeita, hipotese diagnostica ou diagnostico quando houver base suficiente;
- registrar conduta e proximos passos;
- indicar pendencias para recepcao;
- devolver o caso com proximo setor ou responsavel definido.

O veterinario clinico nao deve:

- criar cobranca final;
- operar financeiro completo;
- deixar caso sem proximo responsavel;
- solicitar exame sem vinculo com `Encounter`;
- enviar para recepcao sem resumo minimo;
- misturar medicacao aplicada no hospital com prescricao domiciliar;
- gerar item cobravel sem origem clinica;
- finalizar clinicamente caso que ainda exige decisao clinica sem marcar pendencia.

Regras de interpretacao:

- veterinario decide necessidade clinica; recepcao/financeiro finaliza valor, cobranca e pagamento;
- veterinario pode indicar itens cobraveis, mas nao deve substituir o fluxo financeiro;
- toda decisao que impacta recepcao deve sair em linguagem operacional, nao apenas em texto de prontuario;
- todo encaminhamento deve definir proximo setor ou responsavel.

## 3. Objetivos de produto

- Permitir que o veterinario entenda o caso em ate 5 segundos.
- Reduzir navegacao entre modulos desconectados durante atendimento.
- Separar registro clinico, conduta, exames, medicacao aplicada, prescricao e receita.
- Permitir indicar orcamento ou itens cobraveis sem abrir financeiro completo.
- Enviar atendimento para recepcao com pendencias claras.
- Manter `Encounter` como contexto operacional do atendimento.

## 4. Fora de escopo

- Implementar cockpit clinico.
- Alterar prontuario.
- Alterar prescricao ou receita.
- Alterar exames.
- Alterar financeiro/comanda.
- Criar rotas.
- Criar componentes.
- Criar migration.
- Definir schema clinico final.

## 5. Jornada principal

## 5.0 Campos clinicos minimos candidatos

Esta tabela ainda nao e schema tecnico. Ela define blocos minimos candidatos para orientar PRD, SPEC funcional e validacao clinica futura.

| Bloco | Campo minimo | Obrigatorio candidato | Observacao |
| --- | --- | --- | --- |
| Identificacao | Tutor, animal, especie | Sim | Pode vir do `Encounter` |
| Entrada | Motivo/queixa principal | Sim | Base da jornada |
| Anamnese | Relato do tutor | Sim candidato | Pode ser resumido em urgencia |
| Exame fisico | Estado geral | Sim candidato | Ajustar por tipo de consulta |
| Parametros | Peso/temperatura/FC/FR | Parcial | Depende do fluxo |
| Diagnostico | Suspeita ou hipotese | Sim candidato | Pode ser `em investigacao` |
| Conduta | Plano/terapeutica | Sim | Necessario para handoff |
| Proximo passo | Recepcao/exame/internacao/fechamento | Sim | Obrigatorio para `Queue` |

Regras:

- ausencia de campo minimo candidato deve gerar pendencia ou justificativa;
- emergencia pode permitir registro minimo inicial, mas nao deve apagar a obrigacao de complemento posterior;
- campos finais, obrigatoriedade tecnica e validacoes pertencem a SPEC futura;
- o cockpit deve mostrar pendencias de preenchimento sem transformar o atendimento em formulario excessivamente burocratico.

### 5.1 Pegar ficha

Historia:

Veterinario entra na fila clinica e assume um caso aguardando atendimento.

Fluxo alvo:

1. Veterinario visualiza fila com prioridade, tutor, animal, motivo, horario e espera.
2. Veterinario identifica responsavel atual e setor atual.
3. Veterinario aciona `Pegar ficha`.
4. Sistema muda responsabilidade atual para veterinario ou equipe clinica.
5. Caso entra em estado `em_atendimento`.

Regra deterministica:

- apenas ficha em estado elegivel pode ser assumida;
- estados elegiveis candidatos: `aguardando_atendimento`, `aguardando_finalizacao_clinica` quando devolvida para clinica, ou pendencia clinica atribuida;
- ao pegar ficha, `currentResponsible` muda para veterinario ou equipe clinica;
- ao pegar ficha, `operationalStatus` muda para `em_atendimento`;
- nao pode haver dois responsaveis primarios simultaneos;
- se a ficha foi assumida por engano, deve existir fluxo de devolucao formal com motivo;
- ficha assumida nao deve continuar aparecendo como livre para outro veterinario;
- coordenacao deve conseguir identificar fichas assumidas e paradas.

Lacunas:

- se auxiliar pode pegar ficha em nome do veterinario;
- como tratar fila por especialidade;
- como desfazer ficha assumida por engano;
- se existe limite de fichas simultaneas por profissional.

### 5.2 Abrir prontuario

Historia:

Ao assumir ficha, veterinario abre prontuario no contexto do `Encounter`.

Fluxo alvo:

1. Header mostra trilha `Queue > Atendimento > Prontuario`.
2. Contexto minimo mostra tutor, animal, especie, idade quando disponivel, prioridade e motivo.
3. Prontuario exibe historico relevante sem abrir tudo de uma vez.
4. Atendimento ativo fica destacado.

Lacunas:

- quais blocos do historico aparecem primeiro;
- quais alertas clinicos sao obrigatorios;
- como tratar animal sem historico;
- como proteger informacao sensivel por papel.

### 5.3 Anamnese

Historia:

Veterinario registra queixa principal e informacoes relatadas pelo tutor.

Fluxo alvo:

1. Sistema oferece area objetiva para queixa principal.
2. Campos de anamnese devem permitir registro rapido e complemento posterior.
3. Informacoes essenciais alimentam resumo do atendimento.
4. Rascunho pode existir sem finalizar jornada.

Regras:

- anamnese pode ser progressiva;
- emergencia pode permitir registro minimo inicial;
- atendimento nao deve ser finalizado sem pelo menos resumo clinico;
- anamnese incompleta deve aparecer como pendencia se o caso for enviado adiante;
- informacao essencial para recepcao deve ir ao handoff, nao ficar escondida apenas no texto clinico;
- rascunho clinico nao deve ser confundido com finalizacao clinica.

Campos candidatos:

- queixa principal;
- inicio dos sintomas;
- evolucao;
- alimentacao;
- hidratacao;
- eliminacoes;
- medicacoes recentes;
- alergias conhecidas;
- observacoes do tutor.

Lacunas:

- campos minimos por tipo de consulta;
- se anamnese deve ter templates;
- se emergencia permite pular campos;
- quando anamnese incompleta bloqueia finalizacao.

### 5.4 Exame fisico

Historia:

Veterinario registra achados objetivos do exame clinico.

Fluxo alvo:

1. Sistema separa exame fisico da anamnese.
2. Achados relevantes ficam resumidos para conduta.
3. Registro permite normal/alterado e observacao quando necessario.

Regras:

- exame fisico deve permitir `nao avaliado` com motivo;
- campos normal/alterado devem reduzir texto livre excessivo;
- achados criticos devem aparecer no resumo clinico e no handoff;
- exame fisico incompleto pode bloquear finalizacao conforme regra futura;
- achados relevantes devem alimentar conduta, exames, terapeutica ou encaminhamento;
- emergencia pode priorizar achados essenciais, mas deve preservar justificativa.

Campos candidatos:

- estado geral;
- mucosas;
- hidratacao;
- ausculta cardiaca;
- ausculta pulmonar;
- palpacao abdominal;
- linfonodos;
- dor;
- pele/pelagem;
- locomocao;
- observacoes.

Lacunas:

- padrao minimo por especie;
- campos obrigatorios por prioridade;
- quando usar template por especialidade.

### 5.5 Parametros vitais

Historia:

Veterinario ou auxiliar registra sinais vitais e medidas.

Fluxo alvo:

1. Parametros aparecem em area propria e escaneavel.
2. Valores alterados devem ter destaque sobrio.
3. Historico recente pode ser comparado sem poluir o primeiro viewport.

Regras:

- parametros podem ser registrados por veterinario ou auxiliar autorizado;
- valores alterados devem gerar alerta sobrio;
- ausencia de parametro obrigatorio deve virar pendencia;
- parametros nao devem poluir o cockpit quando nao aplicaveis;
- parametros criticos devem aparecer no resumo operacional do caso;
- a SPEC futura deve definir quais parametros sao obrigatorios por tipo de atendimento, especie, prioridade e setor.

Campos candidatos:

- peso;
- temperatura;
- frequencia cardiaca;
- frequencia respiratoria;
- pressao arterial;
- glicemia, quando aplicavel;
- dor;
- escore corporal;

Lacunas:

- quem pode registrar parametros;
- quais parametros sao obrigatorios por tipo de atendimento;
- quais faixas de alerta devem existir;
- se parametros alimentam internacao automaticamente.

### 5.6 Suspeita diagnostica

Historia:

Veterinario registra hipotese, suspeita ou diagnostico inicial.

Fluxo alvo:

1. Suspeita diagnostica fica vinculada ao atendimento.
2. Ela pode justificar exames, terapeutica e orcamento.
3. Atualizacoes devem ser rastreaveis.

Regras:

- suspeita diagnostica = hipotese em investigacao;
- diagnostico = conclusao clinica quando houver base suficiente;
- conclusao/orientacao = resumo final para tutor, recepcao ou continuidade operacional;
- o sistema deve permitir evolucao da hipotese sem apagar historico;
- suspeita pode ser `em investigacao` quando ainda nao houver base suficiente;
- exames e terapeutica devem conseguir apontar para a suspeita, diagnostico ou justificativa clinica.

Lacunas:

- vocabulario livre ou codificado;
- necessidade de CID/terminologia veterinaria futura;
- quando suspeita e obrigatoria antes de solicitar exames;
- como diferenciar suspeita, diagnostico e conclusao.

### 5.7 Exames

Historia:

Veterinario solicita, agenda ou registra coleta de exame a partir do atendimento.

Fluxo alvo:

1. Acao `Solicitar exame` nasce do atendimento ativo.
2. Pedido carrega tutor, animal, Encounter, justificativa e prioridade.
3. Laboratorio/imagem recebe item com setor atual e responsavel.
4. Resultado retorna para prontuario e responsavel clinico.

Regras:

- todo exame deve nascer de `Encounter` ativo ou fluxo autorizado;
- pedido de exame precisa ter justificativa minima;
- pedido deve informar prioridade;
- cancelamento exige motivo;
- resultado critico deve notificar responsavel clinico;
- exame solicitado e nao realizado deve voltar como pendencia;
- pedido deve indicar se gera cobranca, orcamento, coleta imediata ou agendamento;
- resultado liberado deve retornar ao prontuario e ao contexto operacional do caso.

Lacunas:

- exames que exigem coleta imediata vs agendamento;
- exames externos;
- quem pode cancelar pedido;
- como cobrar exame solicitado e nao realizado;
- como notificar resultado critico.

### 5.8 Terapeutica

Historia:

Veterinario registra conduta terapeutica do atendimento.

Fluxo alvo:

1. Sistema separa terapeutica de prescricao formal.
2. Medicacao aplicada no atendimento fica diferente de medicacao prescrita para casa.
3. Itens aplicados ou consumidos podem gerar pendencia de comanda.

Regras:

- terapeutica e plano/conduta clinica;
- medicacao aplicada e execucao assistencial no hospital;
- prescricao e orientacao para uso domiciliar;
- receita e documento formal quando aplicavel;
- itens aplicados ou consumidos devem gerar pendencia financeira quando cabivel;
- terapeutica pode justificar exame, internacao, prescricao, receita ou orcamento;
- terapeutica nao deve substituir registro de execucao quando houve aplicacao real no hospital.

Lacunas:

- quem confirma execucao de medicacao aplicada;
- como controlar estoque;
- como tratar dose, via, frequencia e responsavel;
- quando terapeutica exige receita.

### 5.8.1 Regra de separacao medicamentosa

| Tipo | Significado | Quem registra | Impacto |
| --- | --- | --- | --- |
| Terapeutica | Plano clinico | Veterinario | Orienta conduta |
| Medicacao aplicada | Executada no hospital | Veterinario/auxiliar autorizado | Pode gerar estoque/comanda |
| Prescricao | Uso domiciliar | Veterinario | Orienta tutor |
| Receita | Documento formal | Veterinario | Pode exigir assinatura/validade |

Regras:

- uma mesma substancia pode aparecer em mais de um tipo, mas cada registro deve ter finalidade distinta;
- medicacao aplicada deve indicar execucao, responsavel e impacto operacional quando cabivel;
- prescricao deve orientar tutor e continuidade fora do hospital;
- receita deve existir quando houver exigencia formal, legal, operacional ou documental;
- separar visualmente esses tipos e obrigatorio para evitar erro clinico e financeiro.

### 5.9 Prescricao e receita

Historia:

Veterinario prescreve medicacao, orientacao ou receita a partir da conduta.

Fluxo alvo:

1. Prescricao nasce do atendimento ativo.
2. Receita pode ser gerada quando houver necessidade documental.
3. Prescricao para casa fica separada de medicacao aplicada.
4. Recepcao recebe pendencias quando houver entrega, impressao, cobranca ou orientacao.

Lacunas:

- tipos de receita;
- assinatura e validade;
- impressao/envio digital;
- medicamentos controlados;
- relacao com estoque e farmacia interna.

### 5.10 Orcamento

Historia:

Veterinario indica exames, procedimentos, internacao ou condutas que precisam de aprovacao financeira.

Fluxo alvo:

1. Veterinario indica itens ou pacote sem operar financeiro completo.
2. Orcamento segue para recepcao/financeiro com origem clinica.
3. Status de aprovacao retorna ao atendimento quando afetar conduta.

Regras:

- veterinario indica necessidade clinica;
- recepcao/financeiro monta valor final;
- aprovacao parcial deve voltar ao veterinario quando afetar conduta;
- orcamento recusado deve registrar decisao do tutor;
- veterinario nao deve operar checkout financeiro completo;
- item indicado para orcamento deve carregar origem clinica, justificativa e prioridade quando relevante.

Lacunas:

- veterinario pode informar valor ou apenas indicar item;
- quem monta valor final;
- aprovacao parcial;
- conduta que depende de aprovacao antes de continuar.

### 5.11 Encaminhamento

Historia:

Veterinario encaminha para internacao, laboratorio, imagem, cirurgia, especialidade ou retorno.

Fluxo alvo:

1. Encaminhamento define proximo setor e motivo.
2. Sistema cria pendencia ou item especializado na `Queue`.
3. Recepcao e setor destino enxergam origem e responsavel.

Lacunas:

- quais setores podem receber encaminhamento direto;
- quando recepcao precisa intermediar;
- como tratar encaminhamento externo;
- quando encaminhamento fecha atendimento atual.

### 5.12 Retorno para recepcao

Historia:

Veterinario conclui parte clinica e devolve caso para recepcao com orientacoes e pendencias.

Fluxo alvo:

1. CTA primaria candidata: `Enviar para recepcao`.
2. Antes de enviar, sistema mostra pendencias clinicas, documentos, exames, orcamento e itens cobraveis.
3. Veterinario informa resumo para recepcao.
4. Responsabilidade atual muda para recepcao.
5. Proximo passo fica visivel para recepcao: orientar, cobrar, agendar, aguardar exame, internar ou fechar.

Lacunas:

- quais campos bloqueiam envio para recepcao;
- quando permitir enviar com rascunho;
- como recepcao devolve para veterinario;
- como tratar atendimento abandonado ou tutor desistente.

### 5.12.1 Regra de devolucao para recepcao

Antes de enviar para recepcao, o caso deve conter:

- resumo clinico;
- proximos passos;
- pendencias clinicas;
- pendencias financeiras;
- exames solicitados ou pendentes;
- receitas ou prescricoes a entregar;
- orientacao ao tutor;
- proximo setor ou responsavel.

Regra:

- se faltar item obrigatorio, o sistema deve bloquear ou marcar pendencia explicita;
- recepcao nao deve precisar interpretar prontuario inteiro para saber o que fazer;
- o resumo para recepcao deve ser operacional, curto e acionavel;
- pendencia deve ter dono;
- se o caso precisa voltar para clinica, o proximo setor deve ser clinica, nao recepcao generica;
- se o caso segue para cobranca, origem dos itens cobraveis deve estar clara.

## 6. Cockpit clinico alvo

O cockpit clinico deve priorizar:

- contexto do paciente;
- fila/estado do Encounter;
- queixa principal;
- alertas clinicos;
- anamnese;
- exame fisico;
- parametros vitais;
- suspeita diagnostica;
- conduta e terapeutica;
- exames;
- prescricao/receita;
- orcamento;
- encaminhamento;
- pendencias para recepcao.

O cockpit nao deve tentar mostrar todo prontuario historico no primeiro viewport.

## 6.1 Estados clinicos candidatos

Estados clinicos candidatos, ainda nao finais:

- `em_avaliacao`;
- `aguardando_exame`;
- `aguardando_resultado`;
- `em_conduta`;
- `aguardando_aprovacao_tutor`;
- `pronto_para_recepcao`;
- `necessita_internacao`;
- `encaminhado_especialidade`;
- `finalizado_clinicamente`.

Regras:

- `clinicalStatus` nao substitui `operationalStatus`;
- quem move a `Queue` e o status operacional;
- estado clinico ajuda o veterinario a organizar raciocinio e conduta;
- estado operacional ajuda a equipe a saber onde o caso esta e quem deve agir;
- divergencia entre estado clinico e operacional deve gerar pendencia ou revisao;
- estados clinicos finais precisam ser validados em SPEC funcional futura.

## 7. Dependencias

| Area | Dependencia |
| --- | --- |
| Queue | Pegar ficha, assumir responsavel e devolver para recepcao |
| Encounter | Contexto operacional unico do atendimento |
| Prontuario | Historico e registro clinico |
| Exames | Pedido, coleta, resultado e retorno |
| Prescricao | Medicacao para casa, receita e orientacoes |
| Prescricao/execucao | Medicacao aplicada e rastreabilidade |
| Orcamento | Itens indicados pela clinica e aprovacao |
| Financeiro/comanda | Itens cobraveis e origem da cobranca |
| Internacao | Encaminhamento e continuidade assistencial |
| Recepcao | Finalizacao pos-clinica e comunicacao com tutor |

## 7.1 Handoff clinico para recepcao

Tudo que o veterinario envia precisa ser compreensivel para recepcao.

Recepcao nao deve interpretar prontuario para saber o que fazer. O resumo clinico-operacional deve dizer se a recepcao deve:

- orientar;
- cobrar;
- agendar;
- aguardar exame;
- internar;
- fechar;
- devolver para clinica.

Regras:

- o handoff deve ser escrito em linguagem operacional;
- pendencias devem estar separadas do texto clinico livre;
- item cobravel deve ter origem clinica;
- exame pendente deve indicar status e responsavel;
- prescricao/receita deve indicar se precisa entregar, imprimir, enviar ou apenas registrar;
- encaminhamento deve indicar setor destino;
- recepcao deve enxergar proximo passo sem abrir modulos paralelos.

## 8. Regras candidatas de UX

- Veterinario deve saber estado do atendimento em ate 5 segundos.
- A primeira tela apos pegar ficha deve mostrar paciente, tutor, motivo, prioridade e proximo passo.
- Anamnese, exame fisico e parametros devem ser registraveis sem sair do contexto.
- Acoes clinicas devem nascer do atendimento ativo.
- Orcamento indicado pelo veterinario deve seguir para recepcao/financeiro.
- Prescricao para casa e medicacao aplicada devem ter diferenca visual e operacional.
- Envio para recepcao deve carregar pendencias.
- Atendimento nao deve fechar sem responsavel pelo proximo passo.

## 9. Criterios de aceite

O PRD do veterinario clinico sera considerado aprovado quando:

- pegar ficha estiver definido;
- abrir prontuario no contexto do Encounter estiver validado;
- anamnese estiver definida em nivel operacional;
- exame fisico estiver definido em nivel operacional;
- parametros vitais estiverem definidos em nivel operacional;
- suspeita diagnostica estiver validada;
- exames tiverem origem e retorno claros;
- terapeutica separar aplicado de prescrito;
- prescricao/receita tiverem relacao com conduta;
- orcamento clinico tiver responsavel de finalizacao;
- encaminhamento tiver proximo setor claro;
- retorno para recepcao carregar pendencias;
- lacunas clinicas tiverem dono;
- `UX-DEV-004` permanecer bloqueado.

## 9.1 Checklist operacional do atendimento clinico

- [ ] Ficha assumida?
- [ ] `Encounter` ativo?
- [ ] Queixa/motivo registrado?
- [ ] Anamnese minima registrada?
- [ ] Exame fisico registrado ou justificado?
- [ ] Parametros registrados quando aplicavel?
- [ ] Suspeita/diagnostico registrado?
- [ ] Conduta registrada?
- [ ] Exames solicitados com justificativa?
- [ ] Terapeutica/prescricao separadas?
- [ ] Pendencias para recepcao registradas?
- [ ] Proximo setor definido?

## 9.2 Validacao UX por papel - HOFF-033

Para a clinica, o walkthrough pre-BUILD deve validar:

- preparar handoff com resumo minimo, instrucoes para recepcao e pendencias declaradas;
- enviar para recepcao sem criar cobranca, comanda, baixa ou pagamento;
- receber devolucao clinica com motivo claro, complementar apenas documentacao/conduta permitida e reenviar;
- manter escrita clinica dentro das rotinas e permissoes configuradas, sem depender de nome fixo de setor ou grupo;
- tratar caminho feliz, sem permissao, dados incompletos, retorno da recepcao, erro e atraso;
- registrar resultado `Aprovado`, `Bloqueado`, `Ajustar` ou `Nao se aplica` com evidencia e permissao efetiva.

## 10. Metricas candidatas

- tempo para assumir ficha;
- tempo para registrar atendimento simples;
- numero de telas usadas por atendimento;
- porcentagem de atendimentos devolvidos com pendencias claras;
- quantidade de prescricoes sem contexto de Encounter;
- quantidade de exames sem retorno visivel ao prontuario;
- tempo entre finalizacao clinica e acao da recepcao;
- quantidade de itens cobraveis adicionados manualmente apos atendimento.

## 11. Riscos

| Risco | Impacto | Mitigacao documental |
| --- | --- | --- |
| Cockpit virar tela excessivamente densa | Baixa produtividade clinica | Priorizar resumo e etapas progressivas |
| Registro clinico ficar superficial | Risco assistencial | Definir minimos por etapa |
| Orcamento tirar veterinario da clinica | Perda de foco | Veterinario indica; recepcao/financeiro finaliza |
| Exames ficarem soltos | Perda de continuidade | Pedido deve nascer do Encounter |
| Recepcao receber caso sem contexto | Retrabalho e falha de cobranca | Envio para recepcao exige resumo e pendencias |

## 11.1 Erros operacionais criticos

- registrar atendimento fora de `Encounter`;
- enviar para recepcao sem resumo;
- solicitar exame sem justificativa;
- misturar medicacao aplicada com prescricao;
- deixar item sem proximo responsavel;
- finalizar clinicamente sem pendencias visiveis;
- gerar item cobravel sem origem clinica;
- pegar ficha sem mudar responsavel atual;
- manter ficha assumida por dois responsaveis primarios;
- liberar resultado critico sem notificar responsavel clinico;
- encaminhar para internacao ou especialidade sem proximo setor definido.

## 12. Lacunas para validacao do responsavel

- Quais campos clinicos sao obrigatorios por consulta simples?
- Qual e o fluxo real de urgencia/emergencia?
- Veterinario pode enviar para recepcao com anamnese incompleta?
- Quais exames podem ser solicitados sem orcamento aprovado?
- Como tratar retorno clinico sem animal presente?
- Quem decide internacao?
- Quem informa valores ao tutor?
- O que recepcao precisa receber exatamente ao final do atendimento?

## 13. Proximos passos

1. Validar este PRD com responsavel clinico e operacional.
2. Cruzar com PRD da recepcao para definir handoff.
3. Validar campos minimos com veterinarios.
4. Criar SPEC funcional somente apos aprovacao.
5. Manter `UX-DEV-004` bloqueado.

## 14. Guardrail final

Este PRD nao autoriza BUILD.

Ele depende de SPEC funcional futura, validacao clinica, validacao operacional e aprovacao explicita do responsavel.

Agentes nao devem implementar codigo, criar telas, alterar componentes, criar rotas, criar migrations ou definir schema tecnico final com base neste documento.

Qualquer execucao futura exige aprovacao explicita do responsavel. `UX-DEV-004` permanece bloqueado.
