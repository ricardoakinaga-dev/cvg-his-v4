# Módulo Tutores — Checklist de Implementação

## 1. Banco

- [ ] Revisar schema atual de `owners`.
- [ ] Definir campos novos do Tutor.
- [ ] Definir estratégia de `contacts` estruturado.
- [ ] Manter compatibilidade com `name`, `documentType`, `documentNumber`, `email`, `phone`.
- [ ] Atualizar `packages/shared/database/src/schemas/index.ts`.
- [ ] Criar migration incremental.
- [ ] Garantir defaults ou adaptação para registros legados.
- [ ] Planejar índice de duplicidade por documento normalizado.

## 2. Backend

- [ ] Atualizar contratos compartilhados em `packages/shared/contracts/src/index.ts`.
- [ ] Atualizar tipos compartilhados em `packages/shared/types/src/index.ts`.
- [ ] Adaptar `POST /owners`.
- [ ] Adaptar `PATCH /owners/:id`.
- [ ] Adaptar `GET /owners` para busca e paginação.
- [ ] Adaptar `GET /owners/:id` para detalhe expandido.
- [ ] Integrar pacientes vinculados ao detalhe do tutor.
- [ ] Padronizar erros com `code`, `message`, `details`.
- [ ] Implementar proteção de duplicidade por documento.
- [ ] Reforçar auditoria mínima nas ações críticas.

## 3. Frontend

- [ ] Revisar estrutura atual de `apps/web/src/pages/owners.ts`.
- [ ] Adaptar consumo da listagem paginada.
- [ ] Implementar busca por múltiplas chaves.
- [ ] Adicionar filtros mínimos.
- [ ] Reestruturar formulário em blocos.
- [ ] Adicionar múltiplos contatos.
- [ ] Adicionar endereço estruturado.
- [ ] Adicionar status, origem e observações administrativas.
- [ ] Exibir mensagens de loading, error e success.
- [ ] Ajustar payload enviado à API.

## 4. Integração

- [ ] Exibir detalhe completo do tutor.
- [ ] Exibir pacientes vinculados no detalhe.
- [ ] Adicionar ação `Adicionar paciente`.
- [ ] Garantir pré-condição de tutor salvo.
- [ ] Ajustar `apps/web/src/pages/patients.ts` para contexto de tutor pré-selecionado.
- [ ] Evitar fluxo regular com digitação manual de id.
- [ ] Preservar coerência com `owner-patient-links`.

## 5. Testes

- [ ] Cobrir create/list/detail/update do backend.
- [ ] Cobrir busca por nome/documento/telefone/e-mail.
- [ ] Cobrir erro de duplicidade.
- [ ] Cobrir detalhe com pacientes vinculados.
- [ ] Cobrir fluxo tutor -> paciente.
- [ ] Validar cenários manuais prioritários.
- [ ] Revisar regressão em módulos que consomem `ownerId`.

## 6. Hardening

- [ ] Revisar mensagens de erro para operação.
- [ ] Revisar auditoria mínima.
- [ ] Revisar consistência entre `owner` e `Tutor`.
- [ ] Revisar coerência entre `ownerId` e `tutorId`.
- [ ] Revisar performance mínima de busca.
- [ ] Revisar comportamento com dados legados.
- [ ] Validar critérios de aceite do módulo.
- [ ] Aplicar gate antes de liberar para auditoria.
