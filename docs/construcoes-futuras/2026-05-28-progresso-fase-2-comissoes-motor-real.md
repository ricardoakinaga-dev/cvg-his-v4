# Progresso Fase 2 - Motor Real de Comissoes

Data: 2026-05-28

## Escopo entregue

- Criado o modulo `@cvg-his-v2/module-commissions`.
- Implementado dominio real para:
  - regras de comissao por escopo global, departamento, cargo ou profissional;
  - percentual por tipo de item (`service`, `product`, `procedure`, `exam`, `other` ou `any`);
  - calculo por linhas de producao com origem auditavel;
  - filtro por periodo;
  - selecao da regra ativa mais especifica;
  - fechamento em rascunho;
  - revisao;
  - marcacao como pago;
  - cancelamento antes do pagamento.
- Integrada a API com rotas operacionais:
  - `GET /commission-rules`
  - `POST /commission-rules`
  - `GET /commission-calculations`
  - `POST /commission-calculations`
  - `GET /commission-calculations/{id}`
  - `POST /commission-calculations/{id}/review`
  - `POST /commission-calculations/{id}/pay`
  - `POST /commission-calculations/{id}/cancel`
- Adicionada auditoria para criacao de regra, calculo, revisao, pagamento e cancelamento.
- O runtime da API passou a instanciar `CommissionsService`.

## Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-commissions build`
- `pnpm --filter @cvg-his-v2/module-commissions test`
- `pnpm --filter @cvg-his-v2/module-packages build`
- `pnpm --filter @cvg-his-v2/api build`
- `node --test dist/routes/commission-routes.test.js` em `apps/api`

Resultado: todos os comandos passaram.

## Observacoes tecnicas

- Este incremento entrega o contrato de dominio e API em memoria. Persistencia PostgreSQL/RLS para comissoes ainda deve ser adicionada em um incremento posterior, seguindo o padrao recem-aplicado em pacotes.
- A regra vencedora usa especificidade: profissional > cargo > departamento > global, com desempate por tipo de item especifico contra `any`.
- Pagamento exige calculo revisado. Calculos pagos nao podem ser cancelados.

## Proximo passo recomendado

Conectar a SPA de RH (`/commission-rules` e `/commission-calculations`) ao novo contrato de API, removendo o modo apenas preditivo dessas telas e mantendo as acoes de pagamento protegidas por permissao e auditoria.
