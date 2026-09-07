# Cadência de evidências

A equipe LT/QA revisa semanalmente os documentos vigentes, o ledger de execução, o manifesto de cobertura, a matriz de dependências externas e os riscos. Uma alteração de código que afete um critério exige nova execução do gate correspondente e atualização do SHA no ledger antes de qualquer decisão.

`pnpm evidence:check` verifica que os documentos governados têm owner, ciclo de revisão e data válida. `pnpm docs:validate` verifica a fonte documental única e links locais; os scripts de governança e de dependências geram os bundles reproduzíveis. A ausência de sandbox, ambiente-alvo ou aceite humano aparece como bloqueio explícito; arquivo presente ou score estrutural não encerra um ticket.
