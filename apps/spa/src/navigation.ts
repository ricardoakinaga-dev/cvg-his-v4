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
    description: 'Entrada operacional, atalhos e indicadores de abertura do dia',
    sections: [
      {
        id: 'inicio-principal',
        label: 'Início',
        items: [
          { label: 'Início', path: '/', icon: '🏠', keywords: ['inicio', 'home', 'painel'] }
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
          { label: 'Recepção', path: '/reception', icon: 'RC', keywords: ['recepcao', 'recepção', 'entrada', 'gateway'] },
          { label: 'Agenda', path: '/appointments', icon: '📅', keywords: ['agenda', 'agendamentos'] },
          { label: 'Comandas', path: '/counter-sales', icon: '🧾', keywords: ['comandas', 'pdv', 'balcao'] },
          { label: 'Vendas', path: '/sales', icon: '💸', keywords: ['vendas', 'comercial'] },
          { label: 'Pacotes', path: '/packages', icon: '📦', keywords: ['pacotes', 'bundles'] },
          { label: 'Esteira', path: '/queue', icon: '🏥', keywords: ['esteira', 'fila', 'operacional'] },
          { label: 'Esteira de Exames', path: '/exam-orders', icon: '🧪', keywords: ['esteira de exames', 'exames'] },
          { label: 'Vacinas e Vermífugos', path: '/vaccines-dewormers', icon: '💉', keywords: ['vacinas', 'vermifugos'] },
          { label: 'Orçamentos', path: '/quotes', icon: '📝', keywords: ['orcamentos', 'quotes'] },
          { label: 'Resgate de Pontos', path: '/loyalty', icon: '🎯', keywords: ['fidelidade', 'pontos', 'resgate'] },
          { label: 'Vendas (beta)', path: '/sales/beta', icon: '💸', keywords: ['vendas beta'] }
        ]
      },
      {
        id: 'atendimento-internacao',
        label: 'Internação',
        items: [
          { label: 'Internação', path: '/inpatient', icon: '🛏️', keywords: ['internacao', 'hospitalizacao'] },
          { label: 'Diárias de Internação', path: '/inpatient/daily-charges', icon: '💵', keywords: ['diarias internacao', 'faturamento internacao', 'hospitalizacao'] }
        ]
      },
      {
        id: 'atendimento-cadastros',
        label: 'Cadastros',
        items: [
          { label: 'Animais', path: '/patients', icon: '🐾', keywords: ['animais', 'pets', 'pacientes'] },
          { label: 'Clientes', path: '/owners', icon: '👤', keywords: ['clientes', 'tutores'] },
          { label: 'Serviços', path: '/services', icon: '🛠️', keywords: ['servicos', 'catalogo'] },
          { label: 'Importar Dados Serviços', path: '/services/import', icon: '⬆️', keywords: ['importar servicos'] },
          { label: 'Importação Assistida Vetus', path: '/vetus-imports', icon: '⬆️', keywords: ['vetus', 'importacao', 'legado'] },
          { label: 'Termos de Responsabilidade', path: '/responsibility-terms', icon: '📄', keywords: ['termos', 'responsabilidade'] },
          { label: 'Raças', path: '/breeds', icon: '🧬', keywords: ['racas', 'breed'] },
          { label: 'Espécies', path: '/species', icon: '🦴', keywords: ['especies', 'species'] },
          { label: 'Cores', path: '/coat-colors', icon: '🎨', keywords: ['cores', 'pelagem'] },
          { label: 'Grupos de Clientes', path: '/customer-groups', icon: '👥', keywords: ['grupos de clientes'] },
          { label: 'Boxes de Internação', path: '/beds', icon: '🛏️', keywords: ['boxes', 'leitos', 'camas'] },
          { label: 'Webhooks', path: '/webhooks', icon: '🔗', keywords: ['webhooks', 'integracoes'] }
        ]
      },
      {
        id: 'atendimento-cvg-assistencial',
        label: 'Fluxo Assistencial CVG',
        items: [
          { label: 'Atendimentos', path: '/encounters', icon: '🏥', keywords: ['atendimentos', 'encounters', 'consulta'] },
          { label: 'Prontuário', path: '/medical-records', icon: '📋', keywords: ['prontuario', 'medical records'] },
          { label: 'Triagem', path: '/triage', icon: '🏷️', keywords: ['triagem', 'classificacao'] },
          { label: 'Prescrições', path: '/prescriptions', icon: '💊', keywords: ['prescricoes', 'medicacao'] },
          { label: 'Execuções', path: '/prescription-executions', icon: '🩺', keywords: ['execucoes', 'prescricao'] },
          { label: 'Cirurgias', path: '/surgery', icon: '🔪', keywords: ['cirurgias', 'centro cirurgico'] },
          { label: 'Altas', path: '/discharges', icon: '🏠', keywords: ['altas', 'desospitalizacao'] },
          { label: 'Mapa de Leitos', path: '/inpatient/board', icon: '🗺️', keywords: ['mapa de leitos', 'bed board'] }
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
          { label: 'Hemogramas', path: '/laboratory/hemograms', icon: '🩸', keywords: ['hemogramas', 'hematologia'] },
          { label: 'Urina', path: '/laboratory/urinalysis', icon: '💧', keywords: ['urina', 'urinario'] },
          { label: 'Bioquímico', path: '/laboratory/biochemistry', icon: '⚗️', keywords: ['bioquimico', 'bioquimica'] }
        ]
      },
      {
        id: 'laboratorio-configuracao',
        label: 'Cadastros',
        items: [
          { label: 'Equipamentos', path: '/laboratory/equipment', icon: '🔧', keywords: ['equipamentos', 'analisadores'] },
          { label: 'Tipos de Laudo', path: '/laboratory/report-types', icon: '📄', keywords: ['tipos de laudo', 'templates'] },
          { label: 'Vlr. Ref. Hemograma', path: '/laboratory/hemogram-reference-values', icon: '📈', keywords: ['referencia hemograma'] },
          { label: 'Vlr. Ref. Bioquímico', path: '/laboratory/biochemistry-reference-values', icon: '⚗️', keywords: ['referencia bioquimico'] }
        ]
      },
      {
        id: 'laboratorio-integracoes',
        label: 'Integrações CVG',
        items: [
          { label: 'Hub do Laboratório', path: '/laboratory', icon: '🔬', keywords: ['hub', 'laboratorio'] },
          { label: 'Pedidos API', path: '/exam-orders', icon: '🧾', keywords: ['exam-orders', 'pedidos api'] },
          { label: 'Resultados API', path: '/exam-results', icon: '🧪', keywords: ['exam-results', 'resultados api'] },
          { label: 'Central Diagnóstica', path: '/diagnostics', icon: '🧫', keywords: ['diagnostica', 'diagnosticos'] }
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
          { label: 'Consulta de Preços', path: '/inventory/price-consultation', icon: '🔎', keywords: ['consulta de precos'] },
          { label: 'Entrada de Nota Fiscal', path: '/inventory/nf', icon: '🧾', keywords: ['nf', 'nota fiscal'] },
          { label: 'Transação no Estoque', path: '/inventory/movements', icon: '📥', keywords: ['transacoes', 'movimentacoes'] },
          { label: 'Requisição à Farmácia', path: '/inventory/pharmacy', icon: '💊', keywords: ['farmacia', 'medicamentos'] },
          { label: 'Validade de Produtos', path: '/inventory/validity', icon: '📅', keywords: ['validade', 'lotes'] },
          { label: 'Auditoria de Estoque', path: '/inventory/audit', icon: '🧾', keywords: ['auditoria', 'inventario'] },
          { label: 'Auditoria de Preços', path: '/inventory/price-audit', icon: '🏷️', keywords: ['auditoria de precos'] },
          { label: 'Transferência entre Estoques', path: '/inventory/transfers', icon: '🔄', keywords: ['transferencias'] },
          { label: 'Compras', path: '/inventory/purchases', icon: '🛒', keywords: ['compras', 'pedidos'] },
          { label: 'Reajuste de Preços', path: '/inventory/price-adjustments', icon: '📈', keywords: ['reajuste de precos'] },
          { label: 'Coletores de Dados', path: '/inventory/data-collectors', icon: '📟', keywords: ['coletores'] }
        ]
      },
      {
        id: 'estoque-cadastros',
        label: 'Cadastros',
        items: [
          { label: 'Produtos', path: '/products', icon: '🏷️', keywords: ['produtos', 'catalogo'] },
          { label: 'Importar Dados Produtos', path: '/products/import', icon: '⬆️', keywords: ['importar produtos'] },
          { label: 'Fornecedores e Despesas', path: '/suppliers', icon: '🚚', keywords: ['fornecedores', 'despesas'] },
          { label: 'Estoques', path: '/warehouses', icon: '🏬', keywords: ['estoques', 'almoxarifado', 'depositos'] },
          { label: 'Fabricantes', path: '/manufacturers', icon: '🏭', keywords: ['fabricantes', 'marcas'] },
          { label: 'Grupos de Produtos', path: '/product-groups', icon: '🗂️', keywords: ['grupos de produto', 'categorias'] },
          { label: 'Setores da Empresa', path: '/company-sectors', icon: '🏢', keywords: ['setores da empresa'] },
          { label: 'Unidades de Medida', path: '/measurement-units', icon: '📏', keywords: ['unidades de medida'] },
          { label: 'Tabelas de Preço', path: '/tabelas-de-preco', icon: '🏷️', keywords: ['precos', 'tabelas de preco'] },
          { label: 'Ponto de Venda', path: '/pontos-de-venda', icon: '🧾', keywords: ['pdv', 'pontos de venda', 'sincronizacao'] }
        ]
      },
      {
        id: 'estoque-fiscal',
        label: 'Configurações Fiscais',
        items: [
          { label: 'Tabela ICMS', path: '/fiscal/icms', icon: '📊', keywords: ['icms'] },
          { label: 'Tabela IPI', path: '/fiscal/ipi', icon: '🏷️', keywords: ['ipi', 'tabela ipi'] },
          { label: 'Tabela PIS', path: '/fiscal/pis', icon: '📈', keywords: ['pis', 'tabela pis'] },
          { label: 'Tabela COFINS', path: '/fiscal/cofins', icon: '📉', keywords: ['cofins', 'tabela cofins'] },
          { label: 'Tabela CFOP', path: '/fiscal/cfop', icon: '🔢', keywords: ['cfop', 'tabela cfop'] },
          { label: 'Tabela NFS-e', path: '/fiscal/nfse', icon: '📄', keywords: ['nfse'] },
          { label: 'Matriz Estado ICMS', path: '/fiscal/icms-matrix', icon: '🧮', keywords: ['matriz icms', 'regras'] },
          { label: 'Tabela IBS/CBS', path: '/fiscal/ibs-cbs', icon: '🧮', keywords: ['ibs', 'cbs'] }
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
        id: 'financeiro-gaveta',
        label: 'Gaveta',
        items: [
          { label: 'Gaveta', path: '/cash', icon: '🧾', keywords: ['caixa', 'gaveta'] }
        ]
      },
      {
        id: 'financeiro-controles',
        label: 'Controles',
        items: [
          { label: 'Contas a Receber', path: '/billing', icon: '💵', keywords: ['receber', 'recebiveis', 'billing', 'contas a receber'] },
          { label: 'Contas a Pagar', path: '/finance/accounts-payable', icon: '💸', keywords: ['pagar', 'fornecedores', 'contas a pagar'] },
          { label: 'Conciliação Financeira', path: '/finance/reconciliation', icon: '🧾', keywords: ['conciliacao financeira', 'conciliação financeira', 'pix cartao pagaveis', 'banco'] },
          { label: 'Pagamento Antecipado', path: '/finance/advance-payments', icon: '⏩', keywords: ['pagamento antecipado', 'adiantamento', 'credito cliente'] },
          { label: 'Contas Adm. Cartão', path: '/finance/card-accounts', icon: '💳', keywords: ['contas cartao', 'contas adm cartao', 'administracao cartao', 'conciliacao cartao'] },
          { label: 'Cheques', path: '/finance/cheques', icon: '📄', keywords: ['cheques', 'cheque recebido', 'cheque emitido', 'baixa cheque'] },
          { label: 'Fluxo de Caixa', path: '/finance/cash-flow', icon: '📈', keywords: ['fluxo de caixa', 'tesouraria', 'saldo projetado', 'receitas despesas'] },
          { label: 'Curva ABC Clientes', path: '/dashboards/curve-abc-clients', icon: '📊', keywords: ['curva abc clientes', 'clientes abc', 'ranking clientes', 'faturamento clientes'] },
          { label: 'Curva ABC Produtos', path: '/dashboards/curve-abc', icon: '📈', keywords: ['curva abc produtos', 'produtos abc', 'ranking produtos', 'faturamento produtos'] },
          { label: 'DashBoard do Multifilial', path: '/dashboards/multifilial', icon: '🏢', keywords: ['multifilial', 'filiais', 'unidades', 'comparativo filial', 'dashboard multifilial'] },
          { label: 'Dashboard Financeiro', path: '/dashboards/financial', icon: '💰', keywords: ['dashboard financeiro', 'kpi', 'indicadores financeiros', 'recebiveis caixa pix'] },
          { label: 'Linha do Tempo', path: '/finance/timeline', icon: '🕒', keywords: ['linha do tempo', 'timeline financeira', 'eventos financeiros', 'vencimentos recebimentos'] }
        ]
      },
      {
        id: 'financeiro-maquininha',
        label: 'Maquininha de Cartão',
        items: [
          { label: 'Configuração do Split', path: '/finance/split', icon: '🧩', keywords: ['split', 'configuracao', 'configuração do split', 'recebedores', 'repasse', 'maquininha'] },
          { label: 'Maquininhas', path: '/finance/card-machines', icon: '💳', keywords: ['maquininhas', 'terminais', 'pos', 'provedor cartao', 'maquininha de cartao'] },
          { label: 'Simulador de Split', path: '/finance/split/simulator', icon: '🧮', keywords: ['simulador split', 'simulação split', 'taxa mdr', 'repasse simulado', 'recebedores'] },
          {
            label: 'Transações de Cartão',
            path: '/finance/card-transactions',
            icon: '💳',
            keywords: ['transacoes cartao', 'transações de cartão', 'capturas cartão', 'autorização cartão', 'conciliacao cartao']
          },
          {
            label: 'Exportador de Split',
            path: '/finance/split/export',
            icon: '📤',
            keywords: ['exportador split', 'exportação split', 'arquivo split', 'repasse split', 'csv split']
          },
          {
            label: 'Habilitar Pagamento',
            path: '/finance/payment-enablement',
            icon: '✅',
            keywords: ['habilitar pagamento', 'credenciamento pagamento', 'domicilio bancario', 'provedor pagamento', 'ativar maquininha']
          },
          {
            label: 'Pagamento Dashboard',
            path: '/finance/payments-dashboard',
            icon: '📊',
            keywords: ['pagamento dashboard', 'dashboard pagamentos', 'captura pagamento', 'conciliacao pagamento', 'repasse pagamento']
          }
        ]
      },
      {
        id: 'financeiro-governanca',
        label: 'Cadastros',
        items: [
          {
            label: 'Formas de Pagamento',
            path: '/payment-methods',
            icon: '💳',
            keywords: ['formas de pagamento', 'meios', 'cadastro pagamento', 'tef', 'maquininha', 'pix', 'dinheiro']
          },
          {
            label: 'Centros de Custo',
            path: '/cost-centers',
            icon: '📊',
            keywords: ['centros de custo', 'rateio', 'cadastro centro custo', 'classificacao custo', 'rateio financeiro', 'custos despesas']
          },
          {
            label: 'Custos e Despesas',
            path: '/expenses',
            icon: '🧾',
            keywords: ['despesas', 'custos', 'custos e despesas', 'cadastro despesas', 'centro de custo', 'contas a pagar']
          },
          {
            label: 'Cartões Débito/Crédito',
            path: '/cards',
            icon: '💳',
            keywords: ['cartoes', 'cartões', 'debito credito', 'débito crédito', 'bandeira', 'administradora', 'maquininha']
          },
          {
            label: 'Bancos',
            path: '/banks',
            icon: '🏦',
            keywords: ['bancos', 'contas bancarias', 'contas bancárias', 'agencia', 'agência', 'conta corrente', 'domicilio bancario']
          }
        ]
      },
      {
        id: 'financeiro-cvg-pagamentos',
        label: 'Pagamentos CVG',
        items: [
          { label: 'PIX', path: '/pix', icon: '💸', keywords: ['pix', 'qr code'] }
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
        id: 'marketing-envios',
        label: 'Envios',
        items: [
          { label: 'Envio de SMS Simples', path: '/marketing/sms', icon: '📱', keywords: ['sms'] },
          { label: 'Campanhas de Marketing', path: '/marketing/campaigns', icon: '📣', keywords: ['campanhas', 'notificacoes', 'sms marketing', 'whatsapp marketing', 'email marketing'] }
        ]
      },
      {
        id: 'marketing-configuracoes',
        label: 'Configurações',
        items: [
          { label: 'Layout de Email de Vacina', path: '/marketing/vaccine-email', icon: '📧', keywords: ['email', 'vacina'] },
          { label: 'Configurações de SMS', path: '/marketing/sms-settings', icon: '⚙️', keywords: ['configuracoes sms'] }
        ]
      },
      {
        id: 'marketing-cvg-canais',
        label: 'Canais CVG',
        items: [
          { label: 'WhatsApp Operacional', path: '/notifications/whatsapp', icon: '💬', keywords: ['whatsapp', 'mensageria'] }
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
        id: 'rh-usuarios',
        label: 'Usuários',
        items: [
          { label: 'Usuários', path: '/users', icon: '👤', keywords: ['usuarios', 'login'] },
          { label: 'Grupos de Acesso', path: '/access-control', icon: '🔐', keywords: ['acesso', 'rbac', 'grupos'] }
        ]
      },
      {
        id: 'rh-comissoes',
        label: 'Comissões',
        items: [
          { label: 'Cálculo de Comissões', path: '/commission-calculations', icon: '🧮', keywords: ['comissoes', 'repasse'] }
        ]
      },
      {
        id: 'rh-cadastros',
        label: 'Cadastros',
        items: [
          { label: 'Profissionais', path: '/staff', icon: '🩺', keywords: ['profissionais', 'equipe'] },
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
        id: 'relatorios-auditorias',
        label: 'Relatórios de Auditorias',
        items: [
          { label: 'Auditoria de Agendamentos', path: '/reports/audit/appointments', icon: '🧾', keywords: ['auditoria agendamentos'] }
        ]
      },
      {
        id: 'relatorios-financeiros',
        label: 'Relatórios Financeiros',
        items: [
          { label: 'Gaveta', path: '/reports/cash-drawer', icon: '🧾', keywords: ['gaveta', 'caixa'] },
          { label: 'Fluxo de Caixa', path: '/reports/financial', icon: '📈', keywords: ['fluxo de caixa'] },
          { label: 'DRE - Demonstrativo de Resultados', path: '/reports/dre', icon: '💰', keywords: ['dre', 'resultado'] },
          { label: 'Pacotes', path: '/reports/packages', icon: '📦', keywords: ['pacotes'] },
          { label: 'Contas a Receber', path: '/reports/accounts-receivable', icon: '💵', keywords: ['contas a receber'] },
          { label: 'Contas Recebidas', path: '/reports/received-accounts', icon: '✅', keywords: ['contas recebidas'] },
          { label: 'Contas a Pagar', path: '/reports/accounts-payable', icon: '💸', keywords: ['contas a pagar'] },
          { label: 'Contas Pagas', path: '/reports/paid-accounts', icon: '✅', keywords: ['contas pagas'] },
          { label: 'Cheques', path: '/reports/cheques', icon: '📄', keywords: ['cheques'] },
          { label: 'Pagamento Antecipado', path: '/reports/advance-payments', icon: '⏩', keywords: ['pagamento antecipado'] }
        ]
      },
      {
        id: 'relatorios-atendimentos',
        label: 'Relatórios de Atendimentos',
        items: [
          { label: 'Comandas/Vendas', path: '/reports/sales', icon: '💸', keywords: ['comandas', 'vendas'] },
          { label: 'Produtos/Serviços Produzidos', path: '/reports/produced-items', icon: '🛠️', keywords: ['produtos servicos produzidos'] },
          { label: 'Produção', path: '/reports/production', icon: '🏭', keywords: ['producao'] },
          { label: 'Agenda', path: '/reports/appointments', icon: '📅', keywords: ['relatorios agenda', 'appointments'] },
          { label: 'Atendimento por Profissional', path: '/reports/professional-care', icon: '🩺', keywords: ['atendimento profissional'] }
        ]
      },
      {
        id: 'relatorios-personalizados',
        label: 'Relatórios Personalizados',
        items: [
          { label: 'Relatório de NF de Serviços Prestados', path: '/reports/nf', icon: '🧾', keywords: ['nf servicos prestados'] }
        ]
      },
      {
        id: 'relatorios-cadastros',
        label: 'Relatórios de Cadastros',
        items: [
          { label: 'Serviços', path: '/reports/registers/services', icon: '🛠️', keywords: ['servicos'] },
          { label: 'Clientes', path: '/reports/registers/owners', icon: '👤', keywords: ['clientes'] },
          { label: 'Animais', path: '/reports/registers/patients', icon: '🐾', keywords: ['animais'] },
          { label: 'Fornecedores', path: '/reports/registers/suppliers', icon: '🚚', keywords: ['fornecedores'] },
          { label: 'Exclusão de Vendas e Comandas', path: '/reports/deleted-sales-counter-sales', icon: '🧾', keywords: ['exclusao vendas comandas'] }
        ]
      },
      {
        id: 'relatorios-estoque',
        label: 'Relatórios de Estoque',
        items: [
          { label: 'Estoque', path: '/reports/inventory', icon: '📦', keywords: ['estoque'] },
          { label: 'Movimentações no Estoque', path: '/reports/inventory-movements', icon: '📥', keywords: ['movimentacoes estoque'] },
          { label: 'Entrada de NF', path: '/reports/inventory-invoices', icon: '🧾', keywords: ['entrada nf'] },
          { label: 'Relatório de Produtos', path: '/reports/inventory-products', icon: '🏷️', keywords: ['relatorio produtos'] }
        ]
      },
      {
        id: 'relatorios-hub',
        label: 'Hubs CVG',
        items: [
          { label: 'Visão por Domínio', path: '/reports', icon: '📈', keywords: ['relatorios por dominio', 'hub'] },
          { label: 'Motor Enterprise', path: '/reports/engine', icon: '📊', keywords: ['motor enterprise', 'relatorios premium', 'exportacao', 'agendamento'] },
          { label: 'Hubs Administrativos', path: '/administrative-reports', icon: '📊', keywords: ['administrative reports', 'commercial reports'] }
        ]
      }
    ]
  },
  {
    id: 'administracao',
    label: 'Administração',
    icon: '⚙️',
    description: 'Configurações administrativas fora da operação Vetus-like',
    sections: [
      {
        id: 'administracao-governanca',
        label: 'Configuração',
        items: [
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
