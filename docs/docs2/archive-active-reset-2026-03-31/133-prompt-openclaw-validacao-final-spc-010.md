Você está atuando como agente principal de validação operacional do projeto `cvg-his-v2`.

Objetivo:
Executar a rodada final de aplicação e validação manual do `SPC-010`, garantindo que setores, leitos e bedmap estejam aplicados nos ambientes persistentes reais e funcionando no domínio publicado.

MISSÃO CENTRAL
Levar o `SPC-010` de “validado no banco de teste e no build” para “validado no ambiente persistente real e no frontend publicado”.

ESCOPO EXCLUSIVO
Trabalhar apenas em:
- aplicação da migration `005_sectors_beds.sql` nos ambientes persistentes reais
- validação manual/publicada de:
  - `/sectors`
  - `/beds`
  - `/bed-map`
  - fluxo de internação com `assign-bed`
  - fluxo de internação com `transfer-bed`

Não abrir novas frentes.
Não iniciar `SPC-001`.
Não iniciar `SPC-004`.
Não corrigir ainda o bloqueio externo da suíte DB, apenas registrar se ele continuar existindo.
Não mexer em legado.

REGRA INEGOCIÁVEL
- Não declarar o `SPC-010` como totalmente validado no ambiente real sem:
  - migration aplicada no banco persistente
  - frontend publicado funcionando
  - validação manual das rotas novas
  - validação manual do fluxo de leito na internação
- Se a infraestrutura impedir alguma validação, registrar isso explicitamente

MISSÃO
1. Aplicar a migration:
- `packages/shared/database/src/migrations/005_sectors_beds.sql`
nos bancos persistentes reais do ambiente publicado

2. Confirmar no banco real que existem:
- tabela `sectors`
- tabela `beds`
- colunas em `inpatient_stays`:
  - `sector_id`
  - `bed_id`
  - `transfer_to_sector_id`
  - `transfer_to_bed_id`

3. Confirmar que o frontend publicado no domínio responde corretamente:
- `/sectors`
- `/beds`
- `/bed-map`

4. Executar validação manual do fluxo:
- criar setor
- criar leito
- admitir ou usar stay existente
- fazer `assign-bed`
- fazer `transfer-bed`
- confirmar que o `bed-map` reflete a ocupação corretamente

5. Registrar o resultado com honestidade

BLOCO A - MIGRATION NO AMBIENTE REAL
Aplicar a migration `005_sectors_beds.sql` no banco persistente real usado pelo ambiente publicado.

Confirmar:
- aplicação sem erro
- sem conflito com schema existente
- sem quebra do runtime atual

BLOCO B - CHECAGEM ESTRUTURAL
Validar no banco real:
- `sectors` existe
- `beds` existe
- `inpatient_stays` contém as novas colunas

Se possível, registrar evidência curta e objetiva.

BLOCO C - VALIDAÇÃO NO DOMÍNIO
Validar manualmente ou por requisição HTTP:
- `/sectors`
- `/beds`
- `/bed-map`

Critério:
- as páginas devem abrir
- sem erro estrutural de cliente
- sem falha imediata de API que impeça o uso

BLOCO D - VALIDAÇÃO FUNCIONAL
Executar um cenário mínimo real:
1. cadastrar setor
2. cadastrar leito vinculado
3. atribuir leito a uma internação
4. transferir a internação para outro leito/setor quando possível
5. confirmar atualização no bedmap
6. confirmar liberação do leito anterior

BLOCO E - REGISTRO DE BLOQUEIOS
Se algo falhar, classificar exatamente:
- banco/migration
- frontend publicado
- fluxo de assign-bed
- fluxo de transfer-bed
- infraestrutura do ambiente
- bloqueio externo não relacionado ao `SPC-010`

CRITÉRIO DE ACEITE
Esta rodada só fica `Concluida` se:
1. migration estiver aplicada no banco real
2. `/sectors`, `/beds` e `/bed-map` estiverem operacionais no domínio
3. `assign-bed` funcionar
4. `transfer-bed` funcionar
5. o bedmap refletir a ocupação corretamente

Se algum desses itens não for provado no ambiente real, classificar como `Parcial` ou `Bloqueado`.

FORMATO DE SAÍDA
Responder assim:
1. Item executado
2. Migration aplicada no ambiente real
3. Estrutura confirmada no banco
4. Validação das rotas publicadas
5. Validação manual de assign-bed
6. Validação manual de transfer-bed
7. Status final: `Concluido`, `Parcial` ou `Bloqueado`
8. Bloqueio real encontrado, se existir
9. Próximo passo recomendado

REGRA FINAL
- O objetivo não é revalidar o banco de teste.
- O objetivo é provar o `SPC-010` no ambiente persistente real e no domínio publicado.
- Não expandir escopo.

COMECE AGORA POR:
1. aplicar `005_sectors_beds.sql` no banco real
2. confirmar a estrutura criada
3. abrir `/sectors`, `/beds`, `/bed-map`
4. validar assign-bed e transfer-bed
5. registrar o resultado final
