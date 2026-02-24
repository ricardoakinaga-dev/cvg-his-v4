# Documentação do CVG-HIS

> **Última Atualização:** 2026-02-24
> **Versão do Sistema:** 0.1.0

---

## Índice de Documentação

### Documentos Principais

| Documento | Descrição |
|-----------|-----------|
| [Auditoria Completa](./AUDITORIA_COMPLETA_CVG_HIS.md) | Relatório completo de auditoria do sistema |
| [Arquitetura](./ARCHITECTURE.md) | Visão arquitetural e padrões utilizados |
| [Segurança](./SECURITY.md) | Políticas e implementações de segurança |
| [Testes](./TESTING.md) | Guia de testes e cobertura |
| [Contribuição](./CONTRIBUTING.md) | Guia para contribuidores |
| [Runbook](./RUNBOOK.md) | Procedimentos operacionais |

### Documentos de Fase

| Documento | Fase |
|-----------|------|
| [PHASE0_DONE.md](./PHASE0_DONE.md) | Fase 0 - Setup inicial |
| [PHASE1_DONE.md](./PHASE1_DONE.md) | Fase 1 - Core features |
| [PHASE2_DONE.md](./PHASE2_DONE.md) | Fase 2 - Clinical validation |
| [PHASE3_DONE.md](./PHASE3_DONE.md) | Fase 3 - Inpatient stays |
| [PHASE4_DONE.md](./PHASE4_DONE.md) | Fase 4 - Enhancements |
| [PHASE5_DONE.md](./PHASE5_DONE.md) | Fase 5 - Final polish |

### Documentos de Integração

| Documento | Descrição |
|-----------|-----------|
| [INTEGRATION_REPORT.md](./integration/INTEGRATION_REPORT.md) | Relatório de integração API-Web |
| [INTEGRATION_MAP.md](./integration/INTEGRATION_MAP.md) | Mapeamento de endpoints |
| [ROUTES_API.md](./integration/ROUTES_API.md) | Documentação de rotas da API |
| [CALLS_WEB.md](./integration/CALLS_WEB.md) | Chamadas do frontend |
| [ISSUES.md](./integration/ISSUES.md) | Problemas conhecidos |

### Documentos de Deploy

| Documento | Descrição |
|-----------|-----------|
| [EASYPANEL_CHECKLIST.md](./EASYPANEL_CHECKLIST.md) | Checklist para deploy |
| [deploy_web.md](./deploy/deploy_web.md) | Guia de deploy do frontend |

### Documentos de Módulos

| Documento | Módulo |
|-----------|--------|
| [AGENDA_MODULE.md](./AGENDA_MODULE.md) | Módulo de Agenda |
| [AUDIT_EVENTS.md](./AUDIT_EVENTS.md) | Eventos de auditoria |
| [API_CONTRACT.md](./API_CONTRACT.md) | Contratos de API |
| [RBAC_FRONT.md](./RBAC_FRONT.md) | RBAC no frontend |

---

## Visão Geral do Sistema

### O que é o CVG-HIS?

CVG-HIS é um sistema de informação hospitalar veterinário desenvolvido com tecnologias modernas e arquitetura robusta.

### Stack Tecnológica

- **Backend**: Fastify + TypeScript + Drizzle ORM
- **Frontend**: Next.js 14+ App Router
- **Worker**: BullMQ para processamento assíncrono
- **Banco de Dados**: PostgreSQL
- **Cache/Filas**: Redis

### Características Principais

- ✅ Multi-tenancy com isolamento de dados
- ✅ RBAC com 80+ permissões granulares
- ✅ Auditoria completa de operações
- ✅ Validação rigorosa com Zod
- ✅ TypeScript strict mode
- ✅ API REST documentada

---

## Módulos do Sistema

### Cadastros
- Clientes
- Animais/Pacientes
- Tutores
- Colaboradores

### Assistencial
- Prontuário eletrônico
- Protocolos clínicos
- Notas SOAP

### Internação
- Mapa de leitos
- MAR (Medication Administration Record)
- Passagem de plantão
- Prescrições

### Laboratório
- Pedidos de exames
- Coleta de amostras
- Resultados
- Laudos

### Imagem
- Pedidos de exames
- Estudos
- Laudos

### Financeiro
- Faturas
- Caixa
- Serviços
- Faturamento

### Agenda
- Agendamentos
- Tipos de consulta
- Recursos
- Disponibilidade

### Administração
- Usuários
- Perfis/Roles
- Permissões
- Auditoria

---

## Status do Projeto

### Classificação Geral

| Categoria | Status |
|-----------|--------|
| Arquitetura | ⭐⭐⭐⭐⭐ Excelente |
| Segurança | ⭐⭐⭐⭐ Muito Boa |
| Qualidade de Código | ⭐⭐⭐⭐ Muito Boa |
| Testes | ⭐⭐⭐ Regular |
| Documentação | ⭐⭐⭐⭐ Muito Boa |

### Métricas

| Métrica | Valor |
|---------|-------|
| Arquivos TypeScript | 1.155+ |
| Endpoints de API | 150+ |
| Migrações de BD | 25 |
| Arquivos de Teste | 33 |
| Permissões RBAC | 80+ |

---

## Links Úteis

- [Repositório](https://github.com/your-org/cvg-his)
- [Issues](https://github.com/your-org/cvg-his/issues)
- [Pull Requests](https://github.com/your-org/cvg-his/pulls)

---

## Contato

Para dúvidas ou sugestões sobre a documentação, abra uma issue no repositório.

---

*Documentação atualizada em 2026-02-24*
