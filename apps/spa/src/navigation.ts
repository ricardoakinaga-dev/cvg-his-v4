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
    id: 'dashboards',
    label: 'Dashboards',
    icon: '📊',
    description: 'Painéis executivos, indicadores e visões consolidadas do negócio',
    sections: [
      {
        id: 'dashboards-paineis',
        label: 'Painéis',
        items: [
          { label: 'Dashboard Geral', path: '/', icon: '🏠', keywords: ['inicio', 'home', 'painel'] },
          { label: 'Financeiro', path: '/dashboards/financial', icon: '💰', keywords: ['dashboard financeiro', 'kpi'] },
          { label: 'Multifilial', path: '/dashboards/multifilial', icon: '🏢', keywords: ['multifilial', 'filiais'] },
          { label: 'Curva ABC', path: '/dashboards/curve-abc', icon: '📈', keywords: ['curva abc', 'abc'] }
        ]
      }
    ]
  },
  {
    id: 'atendimento',
    label: 'Atendimento',
    icon: '🩺',
    description: 'Operação clínica, comercial assistida e jornada do paciente',
    sections: [
      {
        id: 'atendimento-rotinas',
        label: 'Atendimentos',
        items: [
          { label: 'Agenda', path: '/appointments', icon: '📅', keywords: ['agenda', 'agendamentos'] },
          { label: 'Disponibilidade', path: '/appointments/availability', icon: '🕒', keywords: ['availability', 'disponibilidade'] },
          { label: 'Tipos de Agendamento', path: '/appointments/types', icon: '🧷', keywords: ['appointment types', 'tipos de agendamento'] },
          { label: 'Comandas', path: '/counter-sales', icon: '🧾', keywords: ['comandas', 'pdv', 'balcao'] },
          { label: 'Vendas', path: '/sales', icon: '💸', keywords: ['vendas', 'comercial'] },
          { label: 'Pacotes', path: '/packages', icon: '📦', keywords: ['pacotes', 'bundles'] },
          { label: 'Esteira', path: '/queue', icon: '🏥', keywords: ['esteira', 'fila', 'operacional'] },
          { label: 'Orçamentos', path: '/quotes', icon: '📝', keywords: ['orcamentos', 'quotes'] },
          { label: 'Fidelidade', path: '/loyalty', icon: '🎯', keywords: ['fidelidade', 'pontos'] },
          { label: 'Internação', path: '/inpatient', icon: '🛏️', keywords: ['internacao', 'hospitalizacao'] }
        ]
      },
      {
        id: 'atendimento-assistencial',
        label: 'Fluxo Assistencial',
        items: [
          { label: 'Atendimentos', path: '/encounters', icon: '🏥', keywords: ['atendimentos', 'encounters', 'consulta'] },
          { label: 'Prontuário', path: '/medical-records', icon: '📋', keywords: ['prontuario', 'medical records'] },
          { label: 'Triagem', path: '/triage', icon: '🏷️', keywords: ['triagem', 'classificacao'] },
          { label: 'Prescrições', path: '/prescriptions', icon: '💊', keywords: ['prescricoes', 'medicacao'] },
          { label: 'Execuções', path: '/prescription-executions', icon: '🩺', keywords: ['execucoes', 'prescricao'] },
          { label: 'Cirurgias', path: '/surgery', icon: '🔪', keywords: ['cirurgias', 'centro cirurgico'] },
          { label: 'Altas', path: '/discharges', icon: '🏠', keywords: ['altas', 'desospitalizacao'] }
        ]
      },
      {
        id: 'atendimento-internacao',
        label: 'Hospital',
        items: [
          { label: 'Mapa de Leitos', path: '/inpatient/board', icon: '🗺️', keywords: ['mapa de leitos', 'bed board'] },
          { label: 'Setores', path: '/sectors', icon: '🏢', keywords: ['setores', 'alas'] },
          { label: 'Leitos', path: '/beds', icon: '🛏️', keywords: ['leitos', 'camas'] }
        ]
      }
    ]
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: '🗂️',
    description: 'Cadastros mestres e tabelas auxiliares do ERP',
    sections: [
      {
        id: 'cadastros-principais',
        label: 'Cadastros',
        items: [
          { label: 'Animais', path: '/patients', icon: '🐾', keywords: ['animais', 'pets', 'pacientes'] },
          { label: 'Clientes', path: '/owners', icon: '👤', keywords: ['clientes', 'tutores'] },
          { label: 'Serviços', path: '/services', icon: '🛠️', keywords: ['servicos', 'catalogo'] },
          { label: 'Raças', path: '/breeds', icon: '🧬', keywords: ['racas', 'breed'] },
          { label: 'Espécies', path: '/species', icon: '🦴', keywords: ['especies', 'species'] },
          { label: 'Cores', path: '/coat-colors', icon: '🎨', keywords: ['cores', 'pelagem'] },
          { label: 'Webhooks', path: '/webhooks', icon: '🔗', keywords: ['webhooks', 'integracoes'] }
        ]
      },
      {
        id: 'cadastros-estoque',
        label: 'Cadastros Auxiliares',
        items: [
          { label: 'Fornecedores', path: '/suppliers', icon: '🚚', keywords: ['fornecedores', 'compras'] },
          { label: 'Fabricantes', path: '/manufacturers', icon: '🏭', keywords: ['fabricantes', 'marcas'] },
          { label: 'Grupos de Produto', path: '/product-groups', icon: '🗂️', keywords: ['grupos de produto', 'categorias'] },
          { label: 'Estoques', path: '/warehouses', icon: '🏬', keywords: ['estoques', 'almoxarifado', 'depositos'] }
        ]
      }
    ]
  },
  {
    id: 'laboratorio',
    label: 'Laboratório',
    icon: '🔬',
    description: 'Exames, laudos e rotinas técnicas do laboratório',
    sections: [
      {
        id: 'laboratorio-rotinas',
        label: 'Atendimentos',
        items: [
          { label: 'Exames', path: '/laboratory/orders', icon: '🧪', keywords: ['exames', 'pedidos'] },
          { label: 'Laudos', path: '/laboratory/results', icon: '📋', keywords: ['laudos', 'resultados'] },
          { label: 'Pedidos API', path: '/exam-orders', icon: '🧾', keywords: ['exam-orders', 'pedidos api'] },
          { label: 'Resultados API', path: '/exam-results', icon: '🧪', keywords: ['exam-results', 'resultados api'] },
          { label: 'Hemogramas', path: '/laboratory/hemograms', icon: '🩸', keywords: ['hemogramas', 'hematologia'] },
          { label: 'Urina', path: '/laboratory/urinalysis', icon: '💧', keywords: ['urina', 'urinario'] },
          { label: 'Bioquímico', path: '/laboratory/biochemistry', icon: '⚗️', keywords: ['bioquimico', 'bioquimica'] },
          { label: 'Equipamentos', path: '/laboratory/equipment', icon: '🔧', keywords: ['equipamentos', 'analisadores'] },
          { label: 'Central Diagnóstica', path: '/diagnostics', icon: '🧫', keywords: ['diagnostica', 'diagnosticos'] }
        ]
      },
      {
        id: 'laboratorio-configuracao',
        label: 'Cadastros',
        items: [
          { label: 'Hub do Laboratório', path: '/laboratory', icon: '🔬', keywords: ['hub', 'laboratorio'] },
          { label: 'Tipos de Laudo', path: '/laboratory/report-types', icon: '📄', keywords: ['tipos de laudo', 'templates'] },
          { label: 'Valores de Referência', path: '/laboratory/reference-values', icon: '📈', keywords: ['referencia', 'faixas'] }
        ]
      }
    ]
  },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: '📦',
    description: 'Produtos, movimentações, compras e governança operacional de estoque',
    sections: [
      {
        id: 'estoque-operacao',
        label: 'Controles',
        items: [
          { label: 'Estoque', path: '/inventory', icon: '📦', keywords: ['estoque', 'inventario'] },
          { label: 'Produtos', path: '/products', icon: '🏷️', keywords: ['produtos', 'catalogo'] },
          { label: 'Tabelas de Preço', path: '/tabelas-de-preco', icon: '🏷️', keywords: ['precos', 'tabelas de preco'] },
          { label: 'Pontos de Venda', path: '/pontos-de-venda', icon: '🧾', keywords: ['pdv', 'pontos de venda', 'sincronizacao'] },
          { label: 'NF', path: '/inventory/nf', icon: '🧾', keywords: ['nf', 'nota fiscal'] },
          { label: 'Transações', path: '/inventory/movements', icon: '📥', keywords: ['transacoes', 'movimentacoes'] },
          { label: 'Farmácia', path: '/inventory/pharmacy', icon: '💊', keywords: ['farmacia', 'medicamentos'] },
          { label: 'Validade', path: '/inventory/validity', icon: '📅', keywords: ['validade', 'lotes'] },
          { label: 'Auditoria', path: '/inventory/audit', icon: '🧾', keywords: ['auditoria', 'inventario'] },
          { label: 'Compras', path: '/inventory/purchases', icon: '🛒', keywords: ['compras', 'pedidos'] },
          { label: 'Transferências', path: '/inventory/transfers', icon: '🔄', keywords: ['transferencias'] }
        ]
      }
    ]
  },
  {
    id: 'fiscal',
    label: 'Fiscal',
    icon: '📋',
    description: 'Tributação, tabelas fiscais e conformidade documental',
    sections: [
      {
        id: 'fiscal-tributos',
        label: 'Tributos',
        items: [
          { label: 'Hub Fiscal', path: '/fiscal', icon: '📋', keywords: ['hub fiscal', 'fiscal'] },
          { label: 'ICMS', path: '/fiscal/icms', icon: '📊', keywords: ['icms'] },
          { label: 'IPI', path: '/fiscal/ipi', icon: '🏷️', keywords: ['ipi'] },
          { label: 'PIS', path: '/fiscal/pis', icon: '📈', keywords: ['pis'] },
          { label: 'COFINS', path: '/fiscal/cofins', icon: '📉', keywords: ['cofins'] },
          { label: 'CFOP', path: '/fiscal/cfop', icon: '🔢', keywords: ['cfop'] },
          { label: 'NFS-e', path: '/fiscal/nfse', icon: '📄', keywords: ['nfse'] },
          { label: 'IBS/CBS', path: '/fiscal/ibs-cbs', icon: '🧮', keywords: ['ibs', 'cbs'] }
        ]
      },
      {
        id: 'fiscal-avancado',
        label: 'Cadastros Fiscais',
        items: [
          { label: 'PIS / COFINS', path: '/fiscal/pis-cofins', icon: '📈', keywords: ['pis cofins', 'fiscal consolidado'] },
          { label: 'IBPT / NCM', path: '/fiscal/ncm', icon: '🏷️', keywords: ['ncm', 'ibpt'] },
          { label: 'Matriz ICMS', path: '/fiscal/icms-matrix', icon: '🧮', keywords: ['matriz icms', 'regras'] }
        ]
      }
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: '💰',
    description: 'Recebíveis, pagamentos, caixa e fluxo financeiro',
    sections: [
      {
        id: 'financeiro-operacao',
        label: 'Operação Financeira',
        items: [
          { label: 'Contas a Receber', path: '/billing', icon: '💵', keywords: ['receber', 'recebiveis', 'billing'] },
          { label: 'Contas a Pagar', path: '/finance/accounts-payable', icon: '💸', keywords: ['pagar', 'fornecedores'] },
          { label: 'Caixa', path: '/cash', icon: '🧾', keywords: ['caixa', 'gaveta'] },
          { label: 'Split', path: '/finance/split', icon: '🧩', keywords: ['split', 'repasse'] },
          { label: 'Cartões', path: '/cards', icon: '💳', keywords: ['cartoes', 'maquininha'] },
          { label: 'Cheques', path: '/finance/cheques', icon: '📄', keywords: ['cheques'] },
          { label: 'Fluxo de Caixa', path: '/finance/cash-flow', icon: '📈', keywords: ['fluxo de caixa', 'tesouraria'] }
        ]
      },
      {
        id: 'financeiro-governanca',
        label: 'Cadastros Financeiros',
        items: [
          { label: 'PIX', path: '/pix', icon: '💸', keywords: ['pix', 'qr code'] },
          { label: 'Formas de Pagamento', path: '/payment-methods', icon: '💳', keywords: ['formas de pagamento', 'meios'] },
          { label: 'Bancos', path: '/banks', icon: '🏦', keywords: ['bancos', 'contas bancarias'] },
          { label: 'Centros de Custo', path: '/cost-centers', icon: '📊', keywords: ['centros de custo', 'rateio'] },
          { label: 'Custos e Despesas', path: '/expenses', icon: '🧾', keywords: ['despesas', 'custos'] }
        ]
      }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: '📣',
    description: 'Relacionamento, campanhas e comunicação automatizada',
    sections: [
      {
        id: 'marketing-canais',
        label: 'Comunicação',
        items: [
          { label: 'SMS', path: '/marketing/sms', icon: '📱', keywords: ['sms'] },
          { label: 'Campanhas', path: '/notifications', icon: '🔔', keywords: ['campanhas', 'notificacoes'] },
          { label: 'WhatsApp Operacional', path: '/notifications/whatsapp', icon: '💬', keywords: ['whatsapp', 'mensageria'] },
          { label: 'Email de Vacina', path: '/marketing/vaccine-email', icon: '📧', keywords: ['email', 'vacina'] }
        ]
      }
    ]
  },
  {
    id: 'rh',
    label: 'RH',
    icon: '👥',
    description: 'Pessoas, comissões e governança operacional da equipe',
    sections: [
      {
        id: 'rh-pessoas',
        label: 'Cadastros e Regras',
        items: [
          { label: 'Profissionais', path: '/staff', icon: '🩺', keywords: ['profissionais', 'equipe'] },
          { label: 'Comissões', path: '/commission-calculations', icon: '🧮', keywords: ['comissoes', 'repasse'] },
          { label: 'Regras de Comissão', path: '/commission-rules', icon: '📐', keywords: ['regras de comissao', 'parametrizacao'] },
          { label: 'Folgas', path: '/time-off', icon: '🌴', keywords: ['folgas', 'escala'] },
          { label: 'Profissões', path: '/rh/professions', icon: '🪪', keywords: ['profissoes', 'funcoes'] }
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
        id: 'relatorios-principais',
        label: 'Indicadores',
        items: [
          { label: 'Visão por Domínio', path: '/reports', icon: '📈', keywords: ['relatorios por dominio', 'hub'] },
          { label: 'DRE', path: '/reports/dre', icon: '💰', keywords: ['dre', 'resultado'] },
          { label: 'Contas', path: '/reports/accounts', icon: '🧾', keywords: ['contas', 'financeiro'] },
          { label: 'Vendas', path: '/reports/sales', icon: '💸', keywords: ['vendas', 'comercial'] },
          { label: 'Produção', path: '/reports/production', icon: '🏭', keywords: ['producao'] },
          { label: 'Estoque', path: '/reports/inventory', icon: '📦', keywords: ['estoque'] },
          { label: 'NF', path: '/reports/nf', icon: '🧾', keywords: ['nf', 'nota fiscal'] }
        ]
      },
      {
        id: 'relatorios-avancados',
        label: 'Analíticos',
        items: [
          { label: 'Financeiro', path: '/reports/financial', icon: '💰', keywords: ['relatorios financeiros', 'financeiro'] },
          { label: 'Agenda', path: '/reports/appointments', icon: '📅', keywords: ['relatorios agenda', 'appointments'] },
          { label: 'Atendimento', path: '/reports/encounters', icon: '🩺', keywords: ['relatorios atendimento', 'encounters'] },
          { label: 'Cadastros', path: '/reports/registers', icon: '📋', keywords: ['relatorios cadastros', 'registers'] },
          { label: 'Hubs Administrativos', path: '/administrative-reports', icon: '📊', keywords: ['administrative reports', 'commercial reports'] }
        ]
      }
    ]
  },
  {
    id: 'administracao',
    label: 'Administração',
    icon: '⚙️',
    description: 'Usuários, acessos e configurações administrativas do sistema',
    sections: [
      {
        id: 'administracao-governanca',
        label: 'Segurança e Configuração',
        items: [
          { label: 'Usuários', path: '/users', icon: '👤', keywords: ['usuarios', 'login'] },
          { label: 'Grupos de Acesso', path: '/access-control', icon: '🔐', keywords: ['acesso', 'rbac', 'grupos'] },
          { label: 'Configurações', path: '/administration/settings', icon: '⚙️', keywords: ['configuracoes', 'parametros'] }
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
        { label: 'Auditoria', path: '/audit', icon: '🧾', keywords: ['logs', 'rastreamento', 'evidencia'] },
        { label: 'LGPD', path: '/lgpd', icon: '🔒', keywords: ['consentimento', 'privacidade', 'compliance'] }
      ]
    },
    {
      id: 'console-integracoes',
      label: 'Integrações',
      items: [
        { label: 'Chaves de API', path: '/api-keys', icon: '🗝️', keywords: ['apikey', 'token', 'integracao'] },
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
