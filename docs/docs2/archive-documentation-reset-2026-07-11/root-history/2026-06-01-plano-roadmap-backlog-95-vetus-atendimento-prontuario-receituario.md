# Plano executivo, roadmap e backlog 95/100 - Vetus-like atendimento, prontuario e receituario

Data: 2026-06-01  
Origem: `docs/2026-06-01-relatorio-equivalencia-vetus-atendimento-prontuario-receituario.md`  
Objetivo: levar fluxo de atendimento, prontuario e receituario do CVG-HIS para equivalencia real minima de `95/100`, considerando nao apenas existencia de modulos, mas uso operacional com a mesma leitura de cockpit/esteira/prontuario observada no Vetus.

## 1. Norte executivo

O CVG-HIS ja possui as pecas principais: recepcao, agenda, esteira, atendimento, prontuario, cockpit do animal, prescricoes, execucao de prescricoes, billing e comanda. O problema a resolver e composicao operacional.

Meta final:

| Dominio | Nota atual estimada | Meta | Diferenca que precisa fechar |
| --- | ---: | ---: | --- |
| Fluxo de atendimento | 82 funcional / 70 experiencia | 95 | Estado operacional explicito, setor/responsavel persistidos, historico de transferencia e handoff completo ate financeiro. |
| Prontuario | 86 funcional / 76 experiencia | 95 | Animal como cockpit primario, prontuario longitudinal real, drawers contextuais e continuidade sem troca de contexto. |
| Receituario | 78 funcional / 62 experiencia | 95 | Receita como documento operacional no card do animal: ver, imprimir, editar, salvar, cancelar/arquivar e auditar. |

Principio de produto:

> O usuario deve conseguir operar pelo detalhe do animal e pela esteira sem sentir que esta pulando entre modulos soltos.

## Status de implementacao em 2026-06-01

Primeira fatia implementada: Onda 1 / atendimento operacional P0.

Entregue nesta rodada:

- `ATT-001`: `scheduling_queue_entries` agora carrega tipo de entrada, setor atual, responsavel, proximo setor e estados operacional/clinico/financeiro/handoff.
- `ATT-002`: foi criada persistencia de historico de transferencia em `scheduling_queue_transfers`, com envio, recebimento, responsavel, destino, motivo e urgencia.
- `ATT-003`: transferencia de fila exposta no servico e na API em `POST /scheduling/queue/:id/transfer`, com auditoria.
- `ATT-004`: a fila do SPA passa a preferir setor/responsavel/proximo setor persistidos, em vez de inferir tudo por status.
- Persistencia validada em migracao principal e migracao espelhada de `shared/database`.

Complemento implementado na rodada final:

- `HOFF-101` a `HOFF-105`: handoff clinico passou a ter pendencias estruturadas, resolucao, devolucao para clinica e envio ao financeiro com bloqueio por pendencia critica aberta.
- `PRONT-001` a `PRONT-005`: cockpit do animal validado como superficie primaria com anamnese/prontuario, timeline longitudinal, alertas clinicos persistidos e historico clinico editavel.
- `RX-001` a `RX-006`: receita ganhou modelo documental imprimivel, visualizacao no cockpit, impressao, edicao versionada com motivo e arquivamento auditavel.
- `QA-001`: criado gate `pnpm vetus:clinical-parity`, com atendimento, prontuario e receituario >= 95.
- `QA-004`: persistencia critica validada por testes de modulo e migracoes `0055`/`0056`.

Pendencias residuais fora do criterio P0 de 95:

- E2E Playwright integrado completo ainda pode ser ampliado para anexar evidencia visual formal desktop/tablet.
- Relatorio operacional exportavel da esteira permanece P2.

## 2. Definicao de 95/100

Um dominio so pode ser considerado `95/100` se cumprir cinco dimensoes:

| Dimensao | Peso | Como medir |
| --- | ---: | --- |
| Modelo operacional | 25 | Dados persistidos representam o que a tela mostra, sem inferencia fraca. |
| UX Vetus-like | 25 | Fluxo trabalha por cockpit, cards, acoes diretas e contexto preservado. |
| Integracao ponta a ponta | 20 | Recepcao, esteira, atendimento, prontuario, receita e comanda conversam sem redigitacao. |
| Auditoria e seguranca | 15 | Toda acao critica tem ator, motivo quando aplicavel, versao e trilha auditavel. |
| Validacao operacional | 15 | Existe walkthrough por papel, e2e critico, testes de API e evidencia visual. |

Formula de aceite:

- `95/100` nao e gate automatico de arquivos.
- `95/100` exige demo operacional reproduzivel.
- Nenhum P0 aberto.
- No maximo dois P1 abertos, desde que nao afetem fluxo principal.
- Fluxos principais devem passar depois de restart local da API quando houver persistencia envolvida.

## 3. Plano executivo

### Fase A - Fundacao operacional da esteira

Objetivo: fazer a esteira deixar de ser apenas uma leitura visual derivada e virar fonte operacional persistida.

Entregas:

- Expandir `QueueEntry` ou entidade operacional correlata com:
  - `entryType`;
  - `currentSector`;
  - `currentResponsibleUserId`;
  - `currentResponsibleStaffId`;
  - `nextSector`;
  - `operationalStatus`;
  - `clinicalStatus`;
  - `billingStatus`;
  - `handoffStatus`;
  - `lastTransferredAt`;
  - `lastTransferredByUserId`.
- Criar historico de movimentacao da esteira:
  - `fromSector`;
  - `toSector`;
  - `sentByUserId`;
  - `sentAt`;
  - `receivedByUserId`;
  - `receivedAt`;
  - `reason`;
  - `urgency`;
  - `encounterId`;
  - `counterSaleId` ou `billingRecordId`, quando houver.
- Atualizar `QueuePage` para mostrar dados persistidos, nao apenas inferidos.
- Expor no atendimento/comanda o bloco `Historico de Esteira`.
- Permitir acao `Encaminhar Esteira` com destino, responsavel e motivo.

Resultado esperado:

- Fluxo de atendimento sobe para faixa `88-91`.
- Base tecnica pronta para handoff e finalizacao operacional.

### Fase B - Handoff operacional completo ate recepcao/financeiro

Objetivo: fechar o ciclo clinica -> recepcao -> financeiro sem automacao indevida.

Entregas:

- Evoluir `ClinicalHandoff` alem do minimo atual:
  - `sent_to_reception`;
  - `acknowledged_by_reception`;
  - `waiting_pending_resolution`;
  - `returned_to_clinic`;
  - `sent_to_finance`.
- Criar pendencias estruturadas:
  - tipo;
  - criticidade;
  - dono;
  - motivo;
  - bloqueia financeiro;
  - resolucao;
  - timestamps.
- Implementar acoes:
  - marcar pendencia;
  - resolver pendencia;
  - devolver para clinica;
  - reenviar para recepcao;
  - enviar ao financeiro.
- Atualizar inbox da recepcao com filtros por status, criticidade, dono, atraso e pendencia.
- Bloquear envio ao financeiro se houver pendencia critica aberta.
- Registrar auditoria para cada transicao.

Resultado esperado:

- Fluxo de atendimento sobe para faixa `92-95`.
- Operacao deixa de depender de comunicacao informal.

### Fase C - Prontuario longitudinal centrado no animal

Objetivo: tornar `Detalhes do Animal` a superficie primaria de trabalho clinico, como no Vetus.

Entregas:

- Manter `PatientDetailPage` como cockpit principal do animal.
- Abrir anamnese, exame fisico, avaliacao, plano, conduta e historico em drawer contextual.
- Gravar essas acoes como entradas reais de prontuario vinculadas ao atendimento focal.
- Mostrar historico longitudinal por animal, consolidando multiplos atendimentos.
- Exibir alertas clinicos persistidos:
  - doenca cronica;
  - alergia;
  - temperamento;
  - ultima consulta;
  - prescricoes ativas;
  - exames pendentes;
  - internacao ativa.
- Reduzir dependencia de navegar para `MedicalRecordsDetailPage` para operacoes simples.
- Manter `MedicalRecordsDetailPage` como ficha completa, auditoria e edicao detalhada.

Resultado esperado:

- Prontuario sobe para faixa `91-95`.
- Usuario passa a reconhecer o cockpit do animal como prontuario Vetus-like.

### Fase D - Receituario documental completo

Objetivo: transformar prescricao tecnica em receita operacional perceptivel e imprimivel.

Entregas:

- Criar visualizacao documental de receita:
  - cabecalho da clinica;
  - tutor/cliente;
  - animal;
  - especie/raca;
  - peso quando disponivel;
  - medicamento;
  - posologia;
  - via;
  - frequencia;
  - duracao;
  - orientacoes;
  - profissional emissor;
  - data/hora;
  - identificador;
  - assinatura/rodape.
- No card `Receituario` do animal, adicionar:
  - `Ver Receita`;
  - `Imprimir`;
  - `Editar`;
  - `Arquivar/Cancelar`;
  - `Incluir Nova Receita`.
- Implementar drawer/modal de nova receita dentro do contexto do animal.
- Implementar versionamento e auditoria de alteracoes.
- Separar semanticamente:
  - prescricao domiciliar/receita;
  - medicacao aplicada no hospital;
  - execucao de prescricao.
- Criar fluxo de impressao responsivo e testavel.

Resultado esperado:

- Receituario sobe para faixa `90-95`.
- Fecha a maior lacuna de percepcao Vetus.

### Fase E - Validacao operacional e gate 95

Objetivo: provar que os tres dominios chegaram a `95/100`.

Entregas:

- Walkthrough por papel:
  - recepcao;
  - veterinario;
  - financeiro;
  - laboratorio/imagem quando envolver exames;
  - internacao quando envolver leito.
- Testes E2E:
  - detalhe do animal -> receita -> imprimir;
  - esteira -> atendimento -> prontuario -> handoff -> recepcao -> financeiro;
  - atendimento -> exame -> retorno ao prontuario;
  - atendimento -> comanda -> historico de esteira.
- Relatorio de evidencia visual:
  - desktop;
  - tablet;
  - mobile quando aplicavel;
  - ausencia de sobreposicao;
  - leitura do primeiro viewport.
- Gate novo `vetus:clinical-parity` ou extensao do `vetus:parity` com criterios focados.

Resultado esperado:

- Atingir e sustentar `95/100` nos tres indicadores.

## 4. Roadmap por ondas

### Onda 0 - Preparacao e metricas

Prazo sugerido: 2 a 3 dias.

Objetivo: congelar criterio de nota e evitar falso positivo.

Entregas:

- Criar matriz de pontuacao `95/100`.
- Definir fixtures operacionais:
  - tutor;
  - animal;
  - agenda;
  - entrada na esteira;
  - atendimento;
  - receita;
  - comanda.
- Criar cenarios de teste base.
- Atualizar `scripts/check-vetus-parity.mjs` ou criar script focado em atendimento/prontuario/receituario.

Saida:

- Baseline reproduzivel com notas atuais.

### Onda 1 - Esteira operacional persistida

Prazo sugerido: 1 a 2 semanas.

Objetivo: transformar a esteira em fonte de verdade operacional.

Entregas:

- Migration de campos operacionais da fila.
- Migration de historico de transferencias.
- Repositorio e servico atualizados.
- API para encaminhar esteira.
- UI da esteira usando dados persistidos.
- Bloco de historico no atendimento/comanda.
- Testes unitarios, API e E2E do caminho recepcao -> esteira -> atendimento.

Meta ao final:

- Fluxo de atendimento >= 90.
- Prontuario sem regressao.
- Receituario sem regressao.

### Onda 2 - Handoff e inbox de finalizacao

Prazo sugerido: 1 a 2 semanas.

Objetivo: fechar retorno da clinica para recepcao e envio ao financeiro.

Entregas:

- Pendencias estruturadas.
- Acoes de ACK, pendencia, resolucao, devolucao e envio ao financeiro.
- Filtros da inbox.
- Bloqueios por permissao efetiva.
- Auditoria completa.
- E2E: atendimento -> handoff -> recepcao -> pendencia -> resolucao -> financeiro.

Meta ao final:

- Fluxo de atendimento >= 95.

### Onda 3 - Cockpit do animal como prontuario longitudinal

Prazo sugerido: 1 a 2 semanas.

Objetivo: reduzir fragmentacao entre animal, atendimento e prontuario.

Entregas:

- Drawers contextuais no detalhe do animal.
- Criacao de entradas clinicas a partir do cockpit.
- Timeline longitudinal consolidada por animal.
- Alertas clinicos e pendencias de preenchimento.
- Acoes rapidas preservando contexto do animal.
- E2E: animal -> anamnese -> exame fisico -> plano -> historico longitudinal.

Meta ao final:

- Prontuario >= 95.

### Onda 4 - Receituario documental Vetus-like

Prazo sugerido: 1 a 2 semanas.

Objetivo: tornar receita uma entidade documental clara e operavel no card do animal.

Entregas:

- Template imprimivel.
- Drawer de nova receita.
- Visualizacao de receita.
- Edicao versionada.
- Arquivamento/cancelamento com motivo.
- Impressao.
- Auditoria.
- E2E: animal -> incluir receita -> ver -> imprimir -> editar -> auditar.

Meta ao final:

- Receituario >= 95.

### Onda 5 - Hardening e gate 95

Prazo sugerido: 3 a 5 dias.

Objetivo: provar o resultado.

Entregas:

- E2E completo integrado.
- Testes de persistencia apos restart local.
- Teste visual Playwright para cockpit, esteira e receita.
- Relatorio de aceite.
- Atualizacao do `vetus:parity` com recorte clinico.

Meta ao final:

- Atendimento >= 95.
- Prontuario >= 95.
- Receituario >= 95.
- Nenhum P0 aberto.

## 5. Backlog priorizado

### Epic A - Esteira operacional persistida

| ID | Prioridade | Item | Criterio de aceite |
| --- | --- | --- | --- |
| ATT-001 | P0 | Adicionar campos operacionais persistidos em Queue/Encounter | Fila salva e recupera setor atual, responsavel atual, proximo setor e status operacional apos restart. |
| ATT-002 | P0 | Criar historico de transferencia da esteira | Cada encaminhamento registra origem, destino, ator, horario, motivo e urgencia. |
| ATT-003 | P0 | API `encaminhar esteira` | Endpoint valida destino, responsavel, permissao, estado e grava historico. |
| ATT-004 | P0 | Atualizar `QueuePage` para dados reais | Tela nao infere setor/responsavel quando houver dado persistido. |
| ATT-005 | P1 | Bloco `Historico de Esteira` no atendimento | Atendimento mostra transferencias em ordem cronologica. |
| ATT-006 | P1 | Bloco `Historico de Esteira` na comanda/cobranca | Comanda mostra origem operacional e atendimento relacionado. |
| ATT-007 | P1 | Filtros avancados da esteira | Filtrar por setor, responsavel, prioridade, atraso, status e texto. |
| ATT-008 | P1 | SLA visual por etapa | Linha da esteira marca normal, atencao e atrasado sem transicao automatica. |
| ATT-009 | P2 | Relatorio operacional da esteira | Exportar/consultar tempos por setor e responsavel. |

### Epic B - Handoff clinico, recepcao e financeiro

| ID | Prioridade | Item | Criterio de aceite |
| --- | --- | --- | --- |
| HOFF-101 | P0 | Modelar pendencias estruturadas do handoff | Pendencia tem tipo, criticidade, dono, motivo, bloqueio financeiro e status. |
| HOFF-102 | P0 | Implementar marcar pendencia | Recepcao/clinica registra pendencia com auditoria. |
| HOFF-103 | P0 | Implementar resolver pendencia | Pendencia resolvida exige resolucao e ator. |
| HOFF-104 | P0 | Implementar devolver para clinica | Caso volta para clinica com motivo e destino sem editar prontuario. |
| HOFF-105 | P0 | Implementar enviar ao financeiro | So permite envio sem pendencia critica aberta e com origem financeira rastreavel. |
| HOFF-106 | P0 | Bloqueios por permissao efetiva | Acoes usam access-control, nao cargo fixo. |
| HOFF-107 | P1 | Inbox da recepcao completa | Filtros por status, criticidade, dono, atraso e busca operacional. |
| HOFF-108 | P1 | Auditoria completa de transicoes | Eventos append-only com estado anterior/novo, ator e timestamp. |
| HOFF-109 | P1 | E2E handoff completo | Fluxo clinica -> recepcao -> pendencia -> resolucao -> financeiro passa. |

### Epic C - Prontuario longitudinal no cockpit do animal

| ID | Prioridade | Item | Criterio de aceite |
| --- | --- | --- | --- |
| PRONT-001 | P0 | Drawer de anamnese no detalhe do animal | Cria entrada `anamnesis` sem sair do animal e aparece no card. |
| PRONT-002 | P0 | Drawer de exame fisico | Cria entrada `physical_exam` e atualiza resumo do prontuario. |
| PRONT-003 | P0 | Drawer de avaliacao/plano/conduta | Cria entradas `assessment`, `plan`, `conduct` no atendimento focal. |
| PRONT-004 | P0 | Timeline longitudinal por animal | Lista entradas de multiplos atendimentos em ordem e com filtro por tipo. |
| PRONT-005 | P0 | Alertas clinicos no cockpit | Alergia, doenca cronica, temperamento, prescricao ativa e exame pendente visiveis. |
| PRONT-006 | P1 | Pendencias de preenchimento clinico | Mostra campos minimos ausentes antes de handoff/fechamento. |
| PRONT-007 | P1 | Templates clinicos opcionais | Permite modelos de anamnese/retorno/emergencia sem bloquear texto livre. |
| PRONT-008 | P1 | Revisoes e auditoria acessiveis | Usuario autorizado ve versoes de entradas criticas. |
| PRONT-009 | P2 | Resumo clinico imprimivel | Gera resumo de atendimento sem substituir receita. |

### Epic D - Receituario documental

| ID | Prioridade | Item | Criterio de aceite |
| --- | --- | --- | --- |
| RX-001 | P0 | Modelo de receita documental | Receita inclui dados de clinica, tutor, animal, profissional, medicamento, posologia e orientacoes. |
| RX-002 | P0 | Drawer `Incluir Nova Receita` no animal | Receita criada sem sair do cockpit e aparece no card imediatamente. |
| RX-003 | P0 | Acao `Ver Receita` | Abre visualizacao documental completa da receita. |
| RX-004 | P0 | Acao `Imprimir` | Impressao gera layout limpo e testado para receita. |
| RX-005 | P0 | Edicao versionada | Alterar receita cria nova versao com motivo quando exigido. |
| RX-006 | P0 | Arquivar/cancelar receita | Cancelamento exige motivo, ator e auditoria. |
| RX-007 | P1 | Separar receita domiciliar e medicacao aplicada | UI diferencia prescricao para tutor de execucao hospitalar. |
| RX-008 | P1 | Receita por paciente e por atendimento | Listagem do animal mostra longitudinal; atendimento mostra recorte atual. |
| RX-009 | P1 | Assinatura profissional | Receita exibe profissional emissor e identidade configurada. |
| RX-010 | P2 | Templates de posologia | Sugestoes aceleram digitacao sem remover texto livre. |

### Epic E - Integracao, testes e evidencias

| ID | Prioridade | Item | Criterio de aceite |
| --- | --- | --- | --- |
| QA-001 | P0 | Script de paridade clinica | Gate pontua atendimento, prontuario e receituario separadamente. |
| QA-002 | P0 | E2E fluxo atendimento 95 | Recepcao -> esteira -> atendimento -> prontuario -> handoff -> financeiro passa. |
| QA-003 | P0 | E2E receituario 95 | Animal -> nova receita -> ver -> imprimir -> editar -> auditar passa. |
| QA-004 | P0 | Testes API de persistencia | Dados criticos persistem depois de restart local. |
| QA-005 | P1 | Teste visual cockpit/esteira/receita | Screenshots desktop e tablet sem sobreposicao. |
| QA-006 | P1 | Relatorio de aceite operacional | Documento final registra evidencias e notas por dimensao. |
| QA-007 | P1 | Coverage minimo por dominio | Cobertura dos modulos alterados >= 80%. |

## 6. Dependencias tecnicas

| Dependencia | Impacto |
| --- | --- |
| Migrations de Queue/Handoff/RX | Necessarias para persistencia real e auditoria. |
| Access-control efetivo | Necessario para acoes de handoff, receita e edicao clinica. |
| Staff/profissional | Necessario para responsavel atual, assinatura de receita e identidade clinica. |
| Billing/CounterSales | Necessario para comanda e envio ao financeiro sem automacao indevida. |
| Audit events | Necessario para provar alteracoes e cancelamentos. |
| Playwright | Necessario para validar fluxo e experiencia visual. |

## 7. Riscos e mitigacoes

| Risco | Mitigacao |
| --- | --- |
| Empilhar UI sem modelo persistido | Comecar pela Onda 1, com migration e API antes do polimento. |
| Receita duplicada entre prontuario e prescriptions | Definir fonte canonica e expor views distintas para receita, prescricao e execucao. |
| Handoff virar financeiro automatico | Manter regra: encaminhar ao financeiro nao cria cobranca nem pagamento. |
| Prontuario ficar burocratico demais | Usar pendencias e templates opcionais, nao formulario rigido excessivo. |
| Quebrar fluxo existente | E2E de regressao antes e depois de cada onda. |
| Pontuacao virar falso positivo | Gate 95 deve exigir walkthrough e evidencia visual, nao so existencia de arquivo. |

## 8. Gate final 95/100

Para declarar atendimento, prontuario e receituario como `95/100`, executar e anexar evidencias:

| Gate | Evidencia minima |
| --- | --- |
| `pnpm vetus:parity` | Continua >= 91 e sem regressao global. |
| `pnpm vetus:clinical-parity` ou equivalente | Atendimento, prontuario e receituario >= 95 individualmente. |
| E2E atendimento | Fluxo completo passa em ambiente local limpo. |
| E2E receituario | Receita criada, visualizada, impressa, editada e auditada. |
| Persistencia | Restart local nao perde fila, atendimento, prontuario, receita ou handoff. |
| Visual | Screenshots desktop/tablet aprovados para cockpit, esteira e receita. |
| Walkthrough por papel | Recepcao, veterinario e financeiro aprovados; laboratorio/internacao quando aplicavel. |
| Auditoria | Transicoes, edicoes e cancelamentos rastreaveis por ator e timestamp. |

## 9. Sequencia recomendada de execucao

1. Criar gate de paridade clinica e fixtures base.
2. Implementar esteira persistida e historico de transferencia.
3. Implementar handoff completo ate envio ao financeiro.
4. Centralizar operacoes do prontuario no cockpit do animal.
5. Implementar receituario documental completo.
6. Rodar E2E, visual, persistencia e walkthrough.
7. Publicar relatorio final de aceite 95/100.

## 10. Resultado esperado

Ao final, o usuario deve conseguir abrir o detalhe do animal e enxergar imediatamente:

- quem e o cliente/tutor;
- qual animal esta sendo atendido;
- riscos clinicos;
- onde o caso esta na esteira;
- quem e o responsavel atual;
- quais foram os atendimentos anteriores;
- qual prontuario longitudinal existe;
- quais receitas existem;
- qual receita pode ser aberta/impressa/editada;
- qual comanda/cobranca esta vinculada;
- qual proximo passo operacional precisa acontecer.

Esse e o ponto em que o CVG-HIS deixa de apenas possuir modulos semelhantes e passa a operar com equivalencia Vetus-like real em atendimento, prontuario e receituario.
