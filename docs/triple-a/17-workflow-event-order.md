# Ordem persistida dos eventos de workflow

Defeito confirmado em PostgreSQL: `ORDER BY occurred_at, id` pode inverter criação,
claim e conclusão. UUID é aleatório e o relógio do produtor pode empatar ou recuar.
A regressão determinística anterior à correção retornou completed, claimed, created
(`/tmp/cvg-workflow-clock-red.log`).

A migração 0169 acrescenta task_revision nullable. Um trigger invoker, com search_path
fixo e consulta qualificada por conta/tarefa, bloqueia a tarefa e deriva sua revisão
para cada novo evento, inclusive inserts de binários antigos. Todos os seis writers
existentes já alteram/bloqueiam essa tarefa e acrescentam o evento na mesma transação.
A unicidade por conta/tarefa/revisão formaliza um evento por transição; renovações de
lease sem evento deixam lacunas legítimas. O reader usa revisão antes do timestamp.
A projeção pública permanece igual.

Alternativas rejeitadas: aumentar precisão do relógio ou desempatar por UUID não
prova causalidade. Sequência de append serviria para múltiplos eventos por revisão,
mas adicionaria grants de sequência e perderia a relação direta com a revisão da tarefa.
Nenhum serviço, broker, cache ou dependência adicional é necessário.

Eventos históricos permanecem NULL e aparecem como prefixo, com o desempate anterior
entre si. **Sua ordem causal não é reconstruída nem certificada.** Não há backfill
ou alteração de payload, identidade ou timestamp histórico.

Aplicar a migração canônica antes dos novos binários; readiness exige coluna, trigger
habilitado e unicidade. Writers antigos continuam compatíveis; readers antigos ainda
usam a ordenação defeituosa até serem atualizados. Rollback de aplicação preserva os
dados novos, mas reintroduz o defeito de leitura; preferir roll-forward. A migração é
atômica pelo runner existente. Lock timeout de 5s aborta aquisição demorada; criação
normal do índice único ainda requer janela dimensionada ao volume real. Não há prova
de duração/impacto para uma base de produção, nem autorização de execução nela.

Verificação local: relógio regressivo via serviço/repository reais; UUIDs invertidos
com timestamp igual em fixture SQL; aplicação da migração sobre evento legado;
inserts omitindo revisão ou fornecendo NULL/999 sob RLS; rollback integral quando
há dois eventos na mesma revisão. O teste SQL exercita trigger/reader, não certifica
semântica clínica dos eventos inseridos manualmente. O contrato de processo com roles
reconciliadas verifica os writers restritos de API/worker. A evidência é de escopo;
a certificação global continua pendente.
