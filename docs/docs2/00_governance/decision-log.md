# Decision Log

## DL-0001 - O legado nao sera promovido a baseline do V2

- Status: aprovado
- Data: 2026-03-24
- Motivacao: evitar continuidade de acoplamentos antigos
- Impacto: implementacoes novas devem nascer apenas na arvore alvo do V2

## DL-0002 - Arquitetura orientada por bounded contexts e modulos

- Status: aprovado
- Data: 2026-03-24
- Motivacao: garantir fronteiras claras entre identidades, cadastro mestre, assistencial, administrativo e suporte transversal
- Impacto: cada modulo tera ownership explicito, contratos e dependencias permitidas

## DL-0003 - Regras clinicas materialmente relevantes pertencem ao backend e ao dominio

- Status: aprovado
- Data: 2026-03-24
- Motivacao: seguranca assistencial, auditabilidade e consistencia
- Impacto: frontend apenas orquestra experiencia, nao valida soberanamente condutas, assinaturas ou integridade de prontuario

## DL-0004 - Autorizacao sera centralizada em policy layer

- Status: aprovado
- Data: 2026-03-24
- Motivacao: evitar permissao hardcoded em tela, rota ou componente isolado
- Impacto: `access-control` sera dependencia obrigatoria de modulos protegidos

## DL-0005 - Toda fase gera evidencia documental

- Status: aprovado
- Data: 2026-03-24
- Motivacao: manter rastreabilidade de progresso, risco e validacao
- Impacto: cada fase deve atualizar `docs/08_reports`
