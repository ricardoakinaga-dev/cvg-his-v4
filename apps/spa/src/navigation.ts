import type { NavItem } from '@/types';

export interface AppNavItem extends NavItem {
  keywords?: string[];
}

export interface AppNavSection {
  id: string;
  label: string;
  items: AppNavItem[];
}

export interface AppNavGroup {
  id: string;
  label: string;
  icon: string;
  description: string;
  sections: AppNavSection[];
}

export interface AppNavLocation {
  area: 'main' | 'enterprise';
  group: AppNavGroup;
  section: AppNavSection;
  item: AppNavItem;
}

export const navGroups: AppNavGroup[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: '🏠',
    description: 'Entrada operacional, visão geral e atalhos do dia',
    sections: [
      {
        id: 'inicio-visao-geral',
        label: 'Visão geral',
        items: [
          { label: 'Dashboard', path: '/', icon: '📊', keywords: ['inicio', 'home', 'painel'] }
        ]
      }
    ]
  },
  {
    id: 'atendimento',
    label: 'Atendimento',
    icon: '🩺',
    description: 'Recepção, jornada clínica, internação e cadastros assistenciais',
    sections: [
      {
        id: 'atendimento-cadastros',
        label: 'Cadastros',
        items: [
          { label: 'Pacientes', path: '/patients', icon: '🐾', keywords: ['animais', 'pet', 'cadastro'] },
          { label: 'Tutores', path: '/owners', icon: '👤', keywords: ['clientes', 'owners', 'responsaveis'] },
          { label: 'Serviços', path: '/services', icon: '🛠️', keywords: ['catalogo', 'procedimentos'] }
        ]
      },
      {
        id: 'atendimento-atendimentos',
        label: 'Atendimentos',
        items: [
          { label: 'Agenda', path: '/appointments', icon: '📅', keywords: ['agendamentos', 'calendario'] },
          {
            label: 'Fila Operacional',
            path: '/queue',
            icon: '🏥',
            keywords: ['fila', 'esteira', 'recepcao', 'care queue', 'fila operacional']
          },
          {
            label: 'Atendimentos',
            path: '/encounters',
            icon: '🩺',
            keywords: ['consulta', 'encounter', 'atendimento']
          },
          {
            label: 'Triagem',
            path: '/triage',
            icon: '🏷️',
            keywords: ['classificacao', 'acolhimento']
          },
          {
            label: 'Prontuário',
            path: '/medical-records',
            icon: '📋',
            keywords: ['prontuario', 'historico clinico', 'medical record']
          },
          {
            label: 'Cirurgias',
            path: '/surgery',
            icon: '🔪',
            keywords: ['cirurgia', 'bloco cirurgico']
          },
          {
            label: 'Comandas',
            path: '/counter-sales',
            icon: '🧾',
            keywords: ['comandas', 'balcao', 'vendas', 'counter sales', 'pdv']
          }
        ]
      },
      {
        id: 'atendimento-internacao',
        label: 'Internação',
        items: [
          {
            label: 'Internação',
            path: '/inpatient',
            icon: '🛏️',
            keywords: ['hospitalizacao', 'stay']
          },
          {
            label: 'Mapa de Leitos',
            path: '/inpatient/board',
            icon: '🗺️',
            keywords: ['bed board', 'ocupacao', 'boxes']
          },
          { label: 'Setores', path: '/sectors', icon: '🏢', keywords: ['alas', 'unidades'] },
          { label: 'Leitos', path: '/beds', icon: '🛌', keywords: ['camas', 'boxes'] },
          { label: 'Altas', path: '/discharges', icon: '🏠', keywords: ['alta clinica', 'discharge'] }
        ]
      }
    ]
  },
  {
    id: 'laboratorio',
    label: 'Laboratório',
    icon: '🔬',
    description: 'Exames, diagnósticos e rotinas laboratoriais',
    sections: [
      {
        id: 'laboratorio-visao-geral',
        label: 'Visão geral',
        items: [
          {
            label: 'Laboratório',
            path: '/laboratory',
            icon: '🔬',
            keywords: ['hub', 'laboratorio', 'visao geral', 'painel laboratorial']
          }
        ]
      },
      {
        id: 'laboratorio-atendimentos',
        label: 'Atendimentos',
        items: [
          {
            label: 'Pedidos de Exame',
            path: '/laboratory/orders',
            icon: '🧪',
            keywords: ['pedidos', 'solicitacoes', 'ordens', 'exam orders']
          },
          {
            label: 'Resultados',
            path: '/laboratory/results',
            icon: '📋',
            keywords: ['laudos', 'resultados', 'analises', 'exam results']
          },
          {
            label: 'Central de Diagnósticos',
            path: '/diagnostics',
            icon: '🔬',
            keywords: ['diagnostics', 'exames', 'laudos', 'ponte laboratorial', 'laboratorio']
          },
          {
            label: 'Prescrições',
            path: '/prescriptions',
            icon: '💊',
            keywords: ['prescricao', 'medicacao', 'protocolos']
          },
          {
            label: 'Execuções',
            path: '/prescription-executions',
            icon: '💉',
            keywords: ['execucao', 'administracao', 'aplicacao']
          }
        ]
      },
      {
        id: 'laboratorio-cadastrados',
        label: 'Cadastrados',
        items: [
          {
            label: 'Equipamentos',
            path: '/laboratory/equipment',
            icon: '🔧',
            keywords: ['equipamentos', 'maquinas', 'analisadores']
          },
          {
            label: 'Tipos de Laudo',
            path: '/laboratory/report-types',
            icon: '📄',
            keywords: ['tipos de laudo', 'templates', 'modelos']
          },
          {
            label: 'Valores de Referência',
            path: '/laboratory/reference-values',
            icon: '📈',
            keywords: ['referencia', 'parametros', 'faixas', 'valores']
          }
        ]
      }
    ]
  },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: '📦',
    description: 'Inventário, catálogo de produtos e controles de abastecimento',
    sections: [
      {
        id: 'estoque-controles',
        label: 'Controles',
        items: [
          {
            label: 'Estoque',
            path: '/inventory',
            icon: '📦',
            keywords: ['inventario', 'consumo', 'reposicao']
          },
          {
            label: 'Movimentações',
            path: '/inventory/movements',
            icon: '📥',
            keywords: ['entradas', 'saidas', 'transferencias', 'movimentacao']
          },
          {
            label: 'Validade e Lotes',
            path: '/inventory/validity',
            icon: '📅',
            keywords: ['validade', 'lotes', 'vencimento']
          }
        ]
      },
      {
        id: 'estoque-cadastrados',
        label: 'Cadastrados',
        items: [
          { label: 'Produtos', path: '/products', icon: '🏷️', keywords: ['catalogo', 'sku', 'item'] },
          { label: 'Fornecedores', path: '/suppliers', icon: '🚚', keywords: ['fornecedor', 'compras', 'despesas'] },
          { label: 'Fabricantes', path: '/manufacturers', icon: '🏭', keywords: ['fabricante', 'marca', 'laboratorio'] },
          { label: 'Grupos de Produto', path: '/product-groups', icon: '🗂️', keywords: ['grupo', 'categoria', 'classificacao'] },
          { label: 'Estoques', path: '/warehouses', icon: '🏬', keywords: ['estoques', 'almoxarifado', 'geladeira'] }
        ]
      },
      {
        id: 'estoque-configuracoes-fiscais',
        label: 'Configurações Fiscais',
        items: [
          {
            label: 'Configuração Fiscal',
            path: '/fiscal',
            icon: '📋',
            keywords: ['fiscal', 'tributario', 'icms', 'nfse']
          },
          {
            label: 'ICMS',
            path: '/fiscal/icms',
            icon: '📊',
            keywords: ['icms', 'tributacao', 'aliquota']
          },
          {
            label: 'NFS-e',
            path: '/fiscal/nfse',
            icon: '📄',
            keywords: ['nfse', 'nota fiscal', 'servicos']
          }
        ]
      }
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: '💰',
    description: 'Faturamento, caixa, PIX e controles de receita',
    sections: [
      {
        id: 'financeiro-gaveta',
        label: 'Gaveta',
        items: [
          { label: 'Caixa', path: '/cash', icon: '🧾', keywords: ['gaveta', 'abertura', 'fechamento'] }
        ]
      },
      {
        id: 'financeiro-controles',
        label: 'Controles',
        items: [
          {
            label: 'Faturamento',
            path: '/billing',
            icon: '💳',
            keywords: ['billing', 'comanda', 'cobranca']
          },
          {
            label: 'Orçamentos',
            path: '/quotes',
            icon: '📝',
            keywords: ['orcamento', 'proposta', 'quote']
          }
        ]
      },
      {
        id: 'financeiro-maquininha-cartao',
        label: 'Maquininha de Cartão',
        items: [
          {
            label: 'PIX',
            path: '/pix',
            icon: '💸',
            keywords: ['qrcode', 'pagamento instantaneo', 'recebimento']
          }
        ]
      },
      {
        id: 'financeiro-cadastros',
        label: 'Cadastros',
        items: [
          {
            label: 'Formas de Pagamento',
            path: '/payment-methods',
            icon: '💳',
            keywords: ['pagamento', 'meio de pagamento', 'forma de pagamento']
          },
          {
            label: 'Bancos',
            path: '/banks',
            icon: '🏦',
            keywords: ['bancos', 'conta bancária', 'bank']
          },
          {
            label: 'Centros de Custo',
            path: '/cost-centers',
            icon: '📊',
            keywords: ['centro de custo', 'rateio', 'custos']
          },
          {
            label: 'Cartões',
            path: '/cards',
            icon: '💳',
            keywords: ['cartões', 'bandeira', 'administradora']
          },
          {
            label: 'Custos e Despesas',
            path: '/expenses',
            icon: '🧾',
            keywords: ['custos', 'despesas', 'cadastro financeiro']
          }
        ]
      }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: '📣',
    description: 'Comunicação operacional, campanhas e relacionamento',
    sections: [
      {
        id: 'marketing-envios',
        label: 'Envios',
        items: [
          {
            label: 'Central de Notificações',
            path: '/notifications',
            icon: '🔔',
            keywords: ['sms', 'email', 'alertas', 'campanhas']
          },
          {
            label: 'WhatsApp Operacional',
            path: '/notifications/whatsapp',
            icon: '🟢',
            keywords: ['whatsapp', 'mensagens', 'relacionamento']
          }
        ]
      }
    ]
  },
  {
    id: 'rh',
    label: 'RH',
    icon: '👥',
    description: 'Usuários, equipe e organização humana',
    sections: [
      {
        id: 'rh-usuarios',
        label: 'Usuários',
        items: [
          { label: 'Usuários', path: '/users', icon: '👤', keywords: ['login', 'acesso', 'usuarios'] },
          { label: 'Equipe', path: '/staff', icon: '🩺', keywords: ['profissionais', 'staff', 'colaboradores'] }
        ]
      },
      {
        id: 'rh-comissoes',
        label: 'Comissões',
        items: [
          {
            label: 'Regras de Comissão',
            path: '/commission-rules',
            icon: '📐',
            keywords: ['comissão', 'regra', 'repasse']
          },
          {
            label: 'Cálculo de Comissões',
            path: '/commission-calculations',
            icon: '🧮',
            keywords: ['comissão', 'cálculo', 'apuração']
          }
        ]
      },
      {
        id: 'rh-cadastros',
        label: 'Cadastros',
        items: [
          {
            label: 'Folgas',
            path: '/time-off',
            icon: '🌴',
            keywords: ['folga', 'escala', 'indisponibilidade']
          }
        ]
      }
    ]
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: '📈',
    description: 'Análises por domínio e visão gerencial da operação',
    sections: [
      {
        id: 'relatorios-visao-dominio',
        label: 'Visão por Domínio',
        items: [
          {
            label: 'Relatórios por Domínio',
            path: '/reports',
            icon: '📈',
            keywords: ['relatórios', 'domínio', 'analítico']
          }
        ]
      },
      {
        id: 'relatorios-financeiro',
        label: 'Financeiro',
        items: [
          {
            label: 'Relatórios Financeiros',
            path: '/reports/financial',
            icon: '💰',
            keywords: ['financeiro', 'recebíveis', 'caixa']
          }
        ]
      },
      {
        id: 'relatorios-agenda',
        label: 'Agenda',
        items: [
          {
            label: 'Relatórios de Agenda',
            path: '/reports/appointments',
            icon: '📅',
            keywords: ['agenda', 'capacidade', 'no-show']
          }
        ]
      },
      {
        id: 'relatorios-atendimento',
        label: 'Atendimento',
        items: [
          {
            label: 'Relatórios de Atendimento',
            path: '/reports/encounters',
            icon: '🩺',
            keywords: ['atendimento', 'produtividade', 'assistencial']
          }
        ]
      },
      {
        id: 'relatorios-cadastros',
        label: 'Cadastros',
        items: [
          {
            label: 'Relatórios de Cadastros',
            path: '/reports/registers',
            icon: '📋',
            keywords: ['cadastros', 'pacientes', 'tutores', 'serviços']
          }
        ]
      },
      {
        id: 'relatorios-estoque',
        label: 'Estoque',
        items: [
          {
            label: 'Relatórios de Estoque',
            path: '/reports/inventory',
            icon: '📦',
            keywords: ['estoque', 'giro', 'validade', 'consumo']
          }
        ]
      },
      {
        id: 'relatorios-producao',
        label: 'Produção',
        items: [
          {
            label: 'Relatórios de Produção',
            path: '/reports/production',
            icon: '🏭',
            keywords: ['produção', 'produtividade', 'assistencial', 'profissional']
          }
        ]
      },
      {
        id: 'relatorios-executivo',
        label: 'Executivo',
        items: [
          {
            label: 'Hubs Administrativos',
            path: '/administrative-reports',
            icon: '📊',
            keywords: ['analytics', 'dashboard administrativo', 'financeiro', 'comercial', 'fiscal']
          }
        ]
      }
    ]
  }
];

export const enterpriseConsole: AppNavGroup = {
  id: 'console-enterprise',
  label: 'Console Enterprise',
  icon: '🧭',
  description: 'Governança, conformidade, integrações e superfícies avançadas da plataforma',
  sections: [
    {
      id: 'console-governanca',
      label: 'Governança',
      items: [
        {
          label: 'Governança de Acesso',
          path: '/access-control',
          icon: '🔐',
          keywords: ['acesso', 'rbac', 'abac', 'perfil']
        },
        { label: 'Auditoria', path: '/audit', icon: '🧾', keywords: ['logs', 'rastreamento', 'evidencia'] },
        { label: 'LGPD', path: '/lgpd', icon: '🔒', keywords: ['consentimento', 'privacidade', 'compliance'] }
      ]
    },
    {
      id: 'console-integracoes',
      label: 'Integrações',
      items: [
        { label: 'Chaves de API', path: '/api-keys', icon: '🗝️', keywords: ['apikey', 'token', 'integracao'] },
        { label: 'Webhooks', path: '/webhooks', icon: '🔗', keywords: ['eventos', 'callback', 'webhook'] },
        { label: 'Cliente de API', path: '/api-client', icon: '🛠️', keywords: ['client', 'request', 'api'] }
      ]
    },
    {
      id: 'console-utilidades',
      label: 'Utilidades',
      items: [
        { label: 'Busca Mestre', path: '/master-search', icon: '🔎', keywords: ['busca', 'global', 'search'] }
      ]
    }
  ]
};

function flattenGroupItems(group: AppNavGroup): AppNavItem[] {
  return group.sections.flatMap((section) => section.items);
}

export function flattenNavGroups(groups: AppNavGroup[] = navGroups): AppNavItem[] {
  return groups.flatMap((group) => flattenGroupItems(group));
}

export function flattenEnterpriseItems(group: AppNavGroup = enterpriseConsole): AppNavItem[] {
  return flattenGroupItems(group);
}

export function flattenAllNavItems(groups: AppNavGroup[] = navGroups): AppNavItem[] {
  return [...flattenNavGroups(groups), ...flattenEnterpriseItems()];
}

export function findNavItem(path: string, groups: AppNavGroup[] = navGroups): AppNavItem | undefined {
  return flattenAllNavItems(groups).find((item) => item.path === path);
}

export function findMatchingNavLocation(
  path: string,
  groups: AppNavGroup[] = navGroups
): AppNavLocation | undefined {
  const locations: AppNavLocation[] = [
    ...groups.flatMap((group) =>
      group.sections.flatMap((section) =>
        section.items.map((item) => ({ area: 'main' as const, group, section, item }))
      )
    ),
    ...enterpriseConsole.sections.flatMap((section) =>
      section.items.map((item) => ({
        area: 'enterprise' as const,
        group: enterpriseConsole,
        section,
        item
      }))
    )
  ];

  const sorted = [...locations].sort((a, b) => b.item.path.length - a.item.path.length);
  return sorted.find((location) => path === location.item.path || path.startsWith(`${location.item.path}/`));
}

export function findMatchingNavItem(
  path: string,
  groups: AppNavGroup[] = navGroups
): AppNavItem | undefined {
  return findMatchingNavLocation(path, groups)?.item;
}

export function findMatchingNavGroup(
  path: string,
  groups: AppNavGroup[] = navGroups
): AppNavGroup | undefined {
  const location = findMatchingNavLocation(path, groups);
  if (!location || location.area !== 'main') return groups[0];
  return location.group;
}
