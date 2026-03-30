# Módulo Tutores — Plano de Implementação

## 1. Objetivo

Organizar a implementação do módulo Tutores em fases executáveis, com dependências, riscos e critérios de conclusão.

## 2. Fase de banco

### Objetivo

Adequar a persistência para suportar o contrato documental.

### Arquivos provavelmente alterados

- `packages/shared/database/src/schemas/index.ts`
- `packages/shared/database/src/migrations/*`
- eventuais seeds ou utilitários de dados

### Dependências

- contrato de dados fechado;
- decisão sobre `jsonb` vs tabelas auxiliares para contatos;
- compatibilidade com dados atuais de `owners`.

### Ordem recomendada

1. definir shape final da entidade;
2. decidir estratégia de contatos/endereço;
3. criar migration incremental;
4. preservar compatibilidade com registros existentes.

### Riscos

- quebrar leitura de `owners` atuais;
- migration incompatível com produção;
- duplicação de informação entre colunas antigas e novas.

### Critérios de conclusão

- schema atualizado;
- migration aplicável;
- estratégia de retrocompatibilidade documentada;
- sem perda de dados existentes.

## 3. Fase de backend

### Objetivo

Evoluir rotas, validações, busca, respostas e auditoria.

### Arquivos provavelmente alterados

- `apps/api/src/server.ts`
- módulos/serviços/repositórios futuros, se forem extraídos
- `packages/shared/contracts/src/index.ts`
- `packages/shared/types/src/index.ts`

### Dependências

- fase de banco concluída ou mockada;
- contrato de dados consolidado.

### Ordem recomendada

1. ajustar tipos e contratos compartilhados;
2. implementar normalização/validação;
3. ampliar listagem e busca;
4. ampliar detalhe com pacientes vinculados;
5. implementar fluxo rápido de paciente, se entrar nesta rodada;
6. reforçar auditoria.

### Riscos

- resposta quebrar frontend atual;
- inconsistência entre listagem e detalhe;
- validação permissiva demais.

### Critérios de conclusão

- `create`, `list`, `detail`, `update` robustos;
- erros estruturados;
- busca por nome/documento/telefone/e-mail;
- auditoria mínima funcionando.

## 4. Fase de frontend

### Objetivo

Reescrever a experiência de Tutores para uso hospitalar real.

### Arquivos provavelmente alterados

- `apps/web/src/pages/owners.ts`
- `apps/web/src/pages/patients.ts`
- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

### Dependências

- contratos de API definidos;
- backend estável o suficiente para integração;
- enums e tipos compartilhados.

### Ordem recomendada

1. reconstruir listagem;
2. reconstruir formulário de criação;
3. implementar detalhe/edição;
4. integrar pacientes vinculados;
5. implementar ação `Salvar e adicionar paciente`.

### Riscos

- UI aceitar campos sem suporte backend;
- regressão de navegação;
- experiência complexa demais para recepção.

### Critérios de conclusão

- listagem operacional;
- criação e edição funcionais;
- detalhe útil;
- integração com paciente iniciável pela UI.

## 5. Fase de integração

### Objetivo

Fechar a sincronização entre Tutores e Pacientes.

### Arquivos provavelmente alterados

- `apps/api/src/server.ts`
- `apps/web/src/pages/patients.ts`
- `apps/web/src/pages/owners.ts`
- contratos compartilhados

### Dependências

- backend e frontend básicos concluídos.

### Ordem recomendada

1. retorno do tutor criado com id estável;
2. navegação para criação de paciente;
3. pré-preenchimento do vínculo;
4. listagem de pacientes no detalhe do tutor;
5. eventual vínculo secundário.

### Riscos

- divergência entre `ownerId` e `tutorId`;
- vínculo principal duplicado;
- fluxo quebrado entre páginas.

### Critérios de conclusão

- tutor salvo permite criar paciente rapidamente;
- paciente nasce vinculado corretamente;
- detalhe do tutor mostra pacientes.

## 6. Fase de testes

### Objetivo

Validar integridade funcional, técnica e operacional.

### Arquivos provavelmente alterados

- testes de API;
- testes de integração frontend;
- documentação de testes;
- fixtures.

### Dependências

- fases anteriores executadas.

### Ordem recomendada

1. testes de validação backend;
2. testes de integração API;
3. testes de fluxo frontend;
4. testes de vínculo com pacientes;
5. testes de regressão.

### Riscos

- ausência de cobertura para duplicidade;
- ausência de testes de integração fullstack;
- staging sem dados representativos.

### Critérios de conclusão

- plano de testes executado;
- bugs críticos corrigidos;
- critérios de aceite majoritariamente atendidos.

## 7. Fase de hardening

### Objetivo

Preparar o módulo para staging avançado e futura produção.

### Arquivos provavelmente alterados

- ajustes finos em backend e frontend;
- observabilidade/auditoria;
- documentação de aceite;
- configuração de índices e performance.

### Dependências

- testes executados;
- feedback operacional inicial.

### Ordem recomendada

1. corrigir desvios de contrato;
2. revisar auditoria;
3. revisar performance de busca;
4. revisar mensagens de erro;
5. fechar checklist de aceite.

### Riscos

- débito técnico residual;
- inconsistência entre staging e contrato;
- falsa sensação de prontidão.

### Critérios de conclusão

- módulo coerente com a documentação;
- fluxo tutor -> paciente estável;
- auditoria mínima validada;
- staging apto para homologação.

## 8. Ordem global recomendada

1. banco
2. contratos compartilhados
3. backend
4. frontend tutores
5. integração com pacientes
6. testes
7. hardening

## 9. Dependências externas

- decisão sobre naming de negócio vs naming técnico;
- estratégia de migração dos registros de `owners`;
- disponibilidade de ambiente de staging;
- prioridade do módulo Pacientes para consumir o novo contrato.

## 10. Definição de pronto por fase

Nenhuma fase será considerada concluída apenas por compilar. Cada fase precisa:

- aderir ao contrato documental;
- preservar integridade de dados;
- reduzir atrito operacional;
- não criar divergência entre frontend, backend e banco.
