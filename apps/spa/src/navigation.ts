import type { NavItem } from '@/types';
import { navigationPermissionCodes } from './navigation-permission-catalog';

export { navigationPermissionCodes } from './navigation-permission-catalog';

export interface AppNavItem extends NavItem {
  keywords?: string[];
  /** Legacy URLs that should resolve to this canonical menu item. */
  aliases?: string[];
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
    icon: 'home',
    description: 'Entrada operacional, atalhos e indicadores de abertura do dia',
    sections: [
      {
        id: 'inicio-principal',
        label: 'Início',
        items: [
          { label: 'Início', path: '/', icon: 'home', keywords: ['inicio', 'home', 'painel'] }
        ]
      }
    ]
  },
  {
    id: 'atendimento',
    label: 'Atendimento',
    icon: 'stethoscope',
    description: 'Operação clínica, comercial assistida e jornada do paciente',
    sections: [
      {
        id: 'atendimento-rotinas',
        label: 'Atendimentos',
        items: [
          {
            label: 'Recepção',
            path: '/reception',
            icon: 'reception',
            keywords: ['recepcao', 'recepção', 'entrada', 'gateway']
          },
          {
            label: 'Agenda',
            path: '/appointments',
            icon: 'calendar',
            keywords: ['agenda', 'agendamentos']
          },
          {
            label: 'Comandas',
            path: '/counter-sales',
            icon: 'receipt',
            aliases: ['/comandas'],
            keywords: ['comandas', 'pdv', 'balcao']
          },
          { label: 'Vendas', path: '/sales', icon: 'money', keywords: ['vendas', 'comercial'] },
          {
            label: 'Pacotes',
            path: '/packages',
            icon: 'package',
            keywords: ['pacotes', 'bundles']
          },
          {
            label: 'Esteira',
            path: '/queue',
            icon: 'hospital',
            aliases: ['/esteira', '/atendimento/esteira', '/atendimento/atendimentos/esteira'],
            keywords: ['esteira', 'fila', 'operacional']
          },
          {
            label: 'Esteira de Exames',
            path: '/exam-orders',
            icon: 'test-tube',
            keywords: ['esteira de exames', 'exames']
          },
          {
            label: 'Vacinas e Vermífugos',
            path: '/vaccines-dewormers',
            icon: 'syringe',
            keywords: ['vacinas', 'vermifugos']
          },
          {
            label: 'Orçamentos',
            path: '/quotes',
            icon: 'file',
            keywords: ['orcamentos', 'quotes']
          },
          {
            label: 'Resgate de Pontos',
            path: '/loyalty',
            icon: 'target',
            keywords: ['fidelidade', 'pontos', 'resgate']
          },
          { label: 'Vendas (beta)', path: '/sales/beta', icon: 'money', keywords: ['vendas beta'] }
        ]
      },
      {
        id: 'atendimento-internacao',
        label: 'Internação',
        items: [
          {
            label: 'Internação',
            path: '/inpatient',
            icon: 'bed',
            keywords: ['internacao', 'hospitalizacao']
          },
          {
            label: 'Diárias de Internação',
            path: '/inpatient/daily-charges',
            icon: 'money',
            keywords: ['diarias internacao', 'faturamento internacao', 'hospitalizacao']
          },
          {
            label: 'Setores',
            path: '/sectors',
            icon: 'building',
            keywords: ['setores internacao', 'unidades hospitalares']
          }
        ]
      },
      {
        id: 'atendimento-cadastros',
        label: 'Cadastros',
        items: [
          {
            label: 'Pacientes',
            path: '/patients',
            icon: 'paw',
            keywords: ['pacientes', 'animais', 'pets']
          },
          { label: 'Tutores', path: '/owners', icon: 'user', keywords: ['tutores', 'clientes'] },
          {
            label: 'Serviços',
            path: '/services',
            icon: 'tools',
            keywords: ['servicos', 'catalogo']
          },
          {
            label: 'Importar Dados Serviços',
            path: '/services/import',
            icon: 'upload',
            keywords: ['importar servicos']
          },
          {
            label: 'Importação Assistida Vetus',
            path: '/vetus-imports',
            icon: 'upload',
            keywords: ['vetus', 'importacao', 'legado']
          },
          {
            label: 'Termos de Responsabilidade',
            path: '/responsibility-terms',
            icon: 'file',
            keywords: ['termos', 'responsabilidade']
          },
          { label: 'Raças', path: '/breeds', icon: 'dna', keywords: ['racas', 'breed'] },
          { label: 'Espécies', path: '/species', icon: 'bone', keywords: ['especies', 'species'] },
          { label: 'Cores', path: '/coat-colors', icon: 'palette', keywords: ['cores', 'pelagem'] },
          {
            label: 'Grupos de Clientes',
            path: '/customer-groups',
            icon: 'users',
            keywords: ['grupos de clientes']
          },
          {
            label: 'Boxes de Internação',
            path: '/beds',
            icon: 'bed',
            keywords: ['boxes', 'leitos', 'camas']
          }
        ]
      },
      {
        id: 'atendimento-cvg-assistencial',
        label: 'Fluxo Assistencial CVG',
        items: [
          {
            label: 'Pendências clínicas',
            path: '/workflow-tasks',
            icon: 'clipboard',
            keywords: ['pendencias', 'tarefas', 'lembretes', 'workflow', 'retornos']
          },
          {
            label: 'Atendimentos',
            path: '/encounters',
            icon: 'hospital',
            keywords: ['atendimentos', 'encounters', 'consulta']
          },
          {
            label: 'Prontuário',
            path: '/medical-records',
            icon: 'clipboard',
            keywords: ['prontuario', 'medical records']
          },
          {
            label: 'Triagem',
            path: '/triage',
            icon: 'tag',
            keywords: ['triagem', 'classificacao']
          },
          {
            label: 'Prescrições',
            path: '/prescriptions',
            icon: 'clipboard',
            keywords: ['prescricoes', 'medicacao']
          },
          {
            label: 'Execuções',
            path: '/prescription-executions',
            icon: 'stethoscope',
            keywords: ['execucoes', 'prescricao']
          },
          {
            label: 'Cirurgias',
            path: '/surgery',
            icon: 'tools',
            keywords: ['cirurgias', 'centro cirurgico']
          },
          {
            label: 'Altas',
            path: '/discharges',
            icon: 'home',
            keywords: ['altas', 'desospitalizacao']
          },
          {
            label: 'Mapa de Leitos',
            path: '/inpatient/board',
            icon: 'map',
            keywords: ['mapa de leitos', 'bed board']
          }
        ]
      }
    ]
  },
  {
    id: 'laboratorio',
    label: 'Laboratório',
    icon: 'microscope',
    description: 'Exames, laudos e rotinas técnicas do laboratório',
    sections: [
      {
        id: 'laboratorio-rotinas',
        label: 'Atendimentos',
        items: [
          {
            label: 'Exames',
            path: '/laboratory/orders',
            icon: 'test-tube',
            keywords: ['exames', 'pedidos']
          },
          {
            label: 'Laudos',
            path: '/laboratory/results',
            icon: 'clipboard',
            keywords: ['laudos', 'resultados']
          },
          {
            label: 'Hemogramas',
            path: '/laboratory/hemograms',
            icon: 'droplet',
            keywords: ['hemogramas', 'hematologia']
          },
          {
            label: 'Urina',
            path: '/laboratory/urinalysis',
            icon: 'droplet',
            keywords: ['urina', 'urinario']
          },
          {
            label: 'Bioquímico',
            path: '/laboratory/biochemistry',
            icon: 'flask',
            keywords: ['bioquimico', 'bioquimica']
          }
        ]
      },
      {
        id: 'laboratorio-configuracao',
        label: 'Cadastros',
        items: [
          {
            label: 'Equipamentos',
            path: '/laboratory/equipment',
            icon: 'wrench',
            keywords: ['equipamentos', 'analisadores']
          },
          {
            label: 'Tipos de Laudo',
            path: '/laboratory/report-types',
            icon: 'file',
            keywords: ['tipos de laudo', 'templates']
          },
          {
            label: 'Vlr. Ref. Hemograma',
            path: '/laboratory/hemogram-reference-values',
            icon: 'chart',
            keywords: ['referencia hemograma']
          },
          {
            label: 'Vlr. Ref. Bioquímico',
            path: '/laboratory/biochemistry-reference-values',
            icon: 'flask',
            keywords: ['referencia bioquimico']
          }
        ]
      },
      {
        id: 'laboratorio-integracoes',
        label: 'Integrações CVG',
        items: [
          {
            label: 'Hub do Laboratório',
            path: '/laboratory',
            icon: 'microscope',
            keywords: ['hub', 'laboratorio']
          },
          {
            label: 'Pedidos API',
            path: '/exam-orders',
            icon: 'receipt',
            keywords: ['exam-orders', 'pedidos api']
          },
          {
            label: 'Resultados API',
            path: '/exam-results',
            icon: 'test-tube',
            keywords: ['exam-results', 'resultados api']
          },
          {
            label: 'Central Diagnóstica',
            path: '/diagnostics',
            icon: 'flask',
            keywords: ['diagnostica', 'diagnosticos']
          }
        ]
      }
    ]
  },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: 'package',
    description: 'Produtos, movimentações, compras e governança operacional de estoque',
    sections: [
      {
        id: 'estoque-operacao',
        label: 'Controles',
        items: [
          {
            label: 'Consulta de Preços',
            path: '/inventory/price-consultation',
            icon: 'search',
            keywords: ['consulta de precos']
          },
          {
            label: 'Entrada de Nota Fiscal',
            path: '/inventory/nf',
            icon: 'receipt',
            keywords: ['nf', 'nota fiscal']
          },
          {
            label: 'Transação no Estoque',
            path: '/inventory/movements',
            icon: 'inbox',
            keywords: ['transacoes', 'movimentacoes']
          },
          {
            label: 'Requisição à Farmácia',
            path: '/inventory/pharmacy',
            icon: 'clipboard',
            keywords: ['farmacia', 'medicamentos']
          },
          {
            label: 'Validade de Produtos',
            path: '/inventory/validity',
            icon: 'calendar',
            keywords: ['validade', 'lotes']
          },
          {
            label: 'Auditoria de Estoque',
            path: '/inventory/audit',
            icon: 'receipt',
            keywords: ['auditoria', 'inventario']
          },
          {
            label: 'Auditoria de Preços',
            path: '/inventory/price-audit',
            icon: 'tag',
            keywords: ['auditoria de precos']
          },
          {
            label: 'Transferência entre Estoques',
            path: '/inventory/transfers',
            icon: 'refresh',
            keywords: ['transferencias']
          },
          {
            label: 'Compras',
            path: '/inventory/purchases',
            icon: 'package',
            keywords: ['compras', 'pedidos']
          },
          {
            label: 'Reajuste de Preços',
            path: '/inventory/price-adjustments',
            icon: 'chart',
            keywords: ['reajuste de precos']
          },
          {
            label: 'Coletores de Dados',
            path: '/inventory/data-collectors',
            icon: 'activity',
            keywords: ['coletores']
          }
        ]
      },
      {
        id: 'estoque-cadastros',
        label: 'Cadastros',
        items: [
          { label: 'Produtos', path: '/products', icon: 'tag', keywords: ['produtos', 'catalogo'] },
          {
            label: 'Importar Dados Produtos',
            path: '/products/import',
            icon: 'upload',
            keywords: ['importar produtos']
          },
          {
            label: 'Fornecedores e Despesas',
            path: '/suppliers',
            icon: 'truck',
            keywords: ['fornecedores', 'despesas']
          },
          {
            label: 'Estoques',
            path: '/warehouses',
            icon: 'building',
            keywords: ['estoques', 'almoxarifado', 'depositos']
          },
          {
            label: 'Fabricantes',
            path: '/manufacturers',
            icon: 'factory',
            keywords: ['fabricantes', 'marcas']
          },
          {
            label: 'Grupos de Produtos',
            path: '/product-groups',
            icon: 'file',
            keywords: ['grupos de produto', 'categorias']
          },
          {
            label: 'Setores da Empresa',
            path: '/company-sectors',
            icon: 'building',
            keywords: ['setores da empresa']
          },
          {
            label: 'Unidades de Medida',
            path: '/measurement-units',
            icon: 'tools',
            keywords: ['unidades de medida']
          },
          {
            label: 'Tabelas de Preço',
            path: '/tabelas-de-preco',
            icon: 'tag',
            keywords: ['precos', 'tabelas de preco']
          },
          {
            label: 'Ponto de Venda',
            path: '/pontos-de-venda',
            icon: 'receipt',
            keywords: ['pdv', 'pontos de venda', 'sincronizacao']
          }
        ]
      },
      {
        id: 'estoque-fiscal',
        label: 'Configurações Fiscais',
        items: [
          { label: 'Tabela ICMS', path: '/fiscal/icms', icon: 'chart', keywords: ['icms'] },
          {
            label: 'Tabela IPI',
            path: '/fiscal/ipi',
            icon: 'tag',
            keywords: ['ipi', 'tabela ipi']
          },
          {
            label: 'Tabela PIS',
            path: '/fiscal/pis',
            icon: 'chart',
            keywords: ['pis', 'tabela pis']
          },
          {
            label: 'Tabela COFINS',
            path: '/fiscal/cofins',
            icon: 'chart',
            keywords: ['cofins', 'tabela cofins']
          },
          {
            label: 'Tabela CFOP',
            path: '/fiscal/cfop',
            icon: 'chart',
            keywords: ['cfop', 'tabela cfop']
          },
          { label: 'Tabela NFS-e', path: '/fiscal/nfse', icon: 'file', keywords: ['nfse'] },
          {
            label: 'Matriz Estado ICMS',
            path: '/fiscal/icms-matrix',
            icon: 'chart',
            keywords: ['matriz icms', 'regras']
          },
          {
            label: 'Tabela IBS/CBS',
            path: '/fiscal/ibs-cbs',
            icon: 'chart',
            keywords: ['ibs', 'cbs']
          }
        ]
      }
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: 'money',
    description: 'Recebíveis, pagamentos, caixa e fluxo financeiro',
    sections: [
      {
        id: 'financeiro-gaveta',
        label: 'Gaveta',
        items: [{ label: 'Gaveta', path: '/cash', icon: 'receipt', keywords: ['caixa', 'gaveta'] }]
      },
      {
        id: 'financeiro-controles',
        label: 'Controles',
        items: [
          {
            label: 'Contas a Receber',
            path: '/billing',
            icon: 'money',
            keywords: ['receber', 'recebiveis', 'billing', 'contas a receber']
          },
          {
            label: 'Contas a Pagar',
            path: '/finance/accounts-payable',
            icon: 'money',
            keywords: ['pagar', 'fornecedores', 'contas a pagar']
          },
          {
            label: 'Conciliação Financeira',
            path: '/finance/reconciliation',
            icon: 'receipt',
            keywords: [
              'conciliacao financeira',
              'conciliação financeira',
              'pix cartao pagaveis',
              'banco'
            ]
          },
          {
            label: 'Pagamento Antecipado',
            path: '/finance/advance-payments',
            icon: 'arrow-right',
            keywords: ['pagamento antecipado', 'adiantamento', 'credito cliente']
          },
          {
            label: 'Contas Adm. Cartão',
            path: '/finance/card-accounts',
            icon: 'credit-card',
            keywords: [
              'contas cartao',
              'contas adm cartao',
              'administracao cartao',
              'conciliacao cartao'
            ]
          },
          {
            label: 'Cheques',
            path: '/finance/cheques',
            icon: 'file',
            keywords: ['cheques', 'cheque recebido', 'cheque emitido', 'baixa cheque']
          },
          {
            label: 'Fluxo de Caixa',
            path: '/finance/cash-flow',
            icon: 'chart',
            keywords: ['fluxo de caixa', 'tesouraria', 'saldo projetado', 'receitas despesas']
          },
          {
            label: 'Curva ABC Clientes',
            path: '/dashboards/curve-abc-clients',
            icon: 'chart',
            keywords: [
              'curva abc clientes',
              'clientes abc',
              'ranking clientes',
              'faturamento clientes'
            ]
          },
          {
            label: 'Curva ABC Produtos',
            path: '/dashboards/curve-abc',
            icon: 'chart',
            keywords: [
              'curva abc produtos',
              'produtos abc',
              'ranking produtos',
              'faturamento produtos'
            ]
          },
          {
            label: 'DashBoard do Multifilial',
            path: '/dashboards/multifilial',
            icon: 'building',
            keywords: [
              'multifilial',
              'filiais',
              'unidades',
              'comparativo filial',
              'dashboard multifilial'
            ]
          },
          {
            label: 'Dashboard Financeiro',
            path: '/dashboards/financial',
            icon: 'money',
            keywords: [
              'dashboard financeiro',
              'kpi',
              'indicadores financeiros',
              'recebiveis caixa pix'
            ]
          },
          {
            label: 'Linha do Tempo',
            path: '/finance/timeline',
            icon: 'clock',
            keywords: [
              'linha do tempo',
              'timeline financeira',
              'eventos financeiros',
              'vencimentos recebimentos'
            ]
          }
        ]
      },
      {
        id: 'financeiro-maquininha',
        label: 'Maquininha de Cartão',
        items: [
          {
            label: 'Configuração do Split',
            path: '/finance/split',
            icon: 'settings',
            keywords: [
              'split',
              'configuracao',
              'configuração do split',
              'recebedores',
              'repasse',
              'maquininha'
            ]
          },
          {
            label: 'Maquininhas',
            path: '/finance/card-machines',
            icon: 'credit-card',
            keywords: ['maquininhas', 'terminais', 'pos', 'provedor cartao', 'maquininha de cartao']
          },
          {
            label: 'Simulador de Split',
            path: '/finance/split/simulator',
            icon: 'chart',
            keywords: [
              'simulador split',
              'simulação split',
              'taxa mdr',
              'repasse simulado',
              'recebedores'
            ]
          },
          {
            label: 'Transações de Cartão',
            path: '/finance/card-transactions',
            icon: 'credit-card',
            keywords: [
              'transacoes cartao',
              'transações de cartão',
              'capturas cartão',
              'autorização cartão',
              'conciliacao cartao'
            ]
          },
          {
            label: 'Exportador de Split',
            path: '/finance/split/export',
            icon: 'upload',
            keywords: [
              'exportador split',
              'exportação split',
              'arquivo split',
              'repasse split',
              'csv split'
            ]
          },
          {
            label: 'Habilitar Pagamento',
            path: '/finance/payment-enablement',
            icon: 'check-circle',
            keywords: [
              'habilitar pagamento',
              'credenciamento pagamento',
              'domicilio bancario',
              'provedor pagamento',
              'ativar maquininha'
            ]
          },
          {
            label: 'Pagamento Dashboard',
            path: '/finance/payments-dashboard',
            icon: 'chart',
            keywords: [
              'pagamento dashboard',
              'dashboard pagamentos',
              'captura pagamento',
              'conciliacao pagamento',
              'repasse pagamento'
            ]
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
            icon: 'credit-card',
            keywords: [
              'formas de pagamento',
              'meios',
              'cadastro pagamento',
              'tef',
              'maquininha',
              'pix',
              'dinheiro'
            ]
          },
          {
            label: 'Centros de Custo',
            path: '/cost-centers',
            icon: 'chart',
            keywords: [
              'centros de custo',
              'rateio',
              'cadastro centro custo',
              'classificacao custo',
              'rateio financeiro',
              'custos despesas'
            ]
          },
          {
            label: 'Custos e Despesas',
            path: '/expenses',
            icon: 'receipt',
            keywords: [
              'despesas',
              'custos',
              'custos e despesas',
              'cadastro despesas',
              'centro de custo',
              'contas a pagar'
            ]
          },
          {
            label: 'Cartões Débito/Crédito',
            path: '/cards',
            icon: 'credit-card',
            keywords: [
              'cartoes',
              'cartões',
              'debito credito',
              'débito crédito',
              'bandeira',
              'administradora',
              'maquininha'
            ]
          },
          {
            label: 'Bancos',
            path: '/banks',
            icon: 'building',
            keywords: [
              'bancos',
              'contas bancarias',
              'contas bancárias',
              'agencia',
              'agência',
              'conta corrente',
              'domicilio bancario'
            ]
          }
        ]
      },
      {
        id: 'financeiro-cvg-pagamentos',
        label: 'Pagamentos CVG',
        items: [{ label: 'PIX', path: '/pix', icon: 'money', keywords: ['pix', 'qr code'] }]
      }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: 'message',
    description: 'Relacionamento, campanhas e comunicação automatizada',
    sections: [
      {
        id: 'marketing-envios',
        label: 'Envios',
        items: [
          {
            label: 'Envio de SMS Simples',
            path: '/marketing/sms',
            icon: 'message',
            keywords: ['sms']
          },
          {
            label: 'Campanhas de Marketing',
            path: '/marketing/campaigns',
            icon: 'message',
            keywords: [
              'campanhas',
              'notificacoes',
              'sms marketing',
              'whatsapp marketing',
              'email marketing'
            ]
          }
        ]
      },
      {
        id: 'marketing-configuracoes',
        label: 'Configurações',
        items: [
          {
            label: 'Layout de Email de Vacina',
            path: '/marketing/vaccine-email',
            icon: 'message',
            keywords: ['email', 'vacina']
          },
          {
            label: 'Configurações de SMS',
            path: '/marketing/sms-settings',
            icon: 'settings',
            keywords: ['configuracoes sms']
          }
        ]
      },
      {
        id: 'marketing-cvg-canais',
        label: 'Canais CVG',
        items: [
          {
            label: 'Notificações',
            path: '/notifications',
            icon: 'bell',
            keywords: ['notificacoes', 'alertas', 'sms']
          },
          {
            label: 'WhatsApp Operacional',
            path: '/notifications/whatsapp',
            icon: 'message',
            keywords: ['whatsapp', 'mensageria']
          }
        ]
      }
    ]
  },
  {
    id: 'rh',
    label: 'RH',
    icon: 'users',
    description: 'Pessoas, comissões e governança operacional da equipe',
    sections: [
      {
        id: 'rh-usuarios',
        label: 'Usuários',
        items: [
          { label: 'Usuários', path: '/users', icon: 'user', keywords: ['usuarios', 'login'] }
        ]
      },
      {
        id: 'rh-comissoes',
        label: 'Comissões',
        items: [
          {
            label: 'Cálculo de Comissões',
            path: '/commission-calculations',
            icon: 'chart',
            keywords: ['comissoes', 'repasse']
          }
        ]
      },
      {
        id: 'rh-cadastros',
        label: 'Cadastros',
        items: [
          {
            label: 'Profissionais',
            path: '/staff',
            icon: 'stethoscope',
            keywords: ['profissionais', 'equipe']
          },
          {
            label: 'Regras de Comissão',
            path: '/commission-rules',
            icon: 'tools',
            keywords: ['regras de comissao', 'parametrizacao']
          },
          { label: 'Folgas', path: '/time-off', icon: 'activity', keywords: ['folgas', 'escala'] },
          {
            label: 'Profissões',
            path: '/rh/professions',
            icon: 'user',
            keywords: ['profissoes', 'funcoes']
          }
        ]
      }
    ]
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: 'chart',
    description: 'Análises por domínio e visão gerencial da operação',
    sections: [
      {
        id: 'relatorios-auditorias',
        label: 'Relatórios de Auditorias',
        items: [
          {
            label: 'Auditoria de Agendamentos',
            path: '/reports/audit/appointments',
            icon: 'receipt',
            aliases: ['/relatorios/auditoria/agendamentos'],
            keywords: ['auditoria agendamentos']
          }
        ]
      },
      {
        id: 'relatorios-financeiros',
        label: 'Relatórios Financeiros',
        items: [
          {
            label: 'Gaveta',
            path: '/reports/cash-drawer',
            icon: 'receipt',
            aliases: ['/relatorios/financeiros/gaveta'],
            keywords: ['gaveta', 'caixa']
          },
          {
            label: 'Fluxo de Caixa',
            path: '/reports/financial',
            icon: 'chart',
            aliases: ['/relatorios/financeiros/fluxo-de-caixa'],
            keywords: ['fluxo de caixa']
          },
          {
            label: 'DRE - Demonstrativo de Resultados',
            path: '/reports/dre',
            icon: 'money',
            aliases: ['/relatorios/financeiros/dre'],
            keywords: ['dre', 'resultado']
          },
          {
            label: 'Pacotes',
            path: '/reports/packages',
            icon: 'package',
            aliases: ['/relatorios/financeiros/pacotes'],
            keywords: ['pacotes']
          },
          {
            label: 'Contas a Receber',
            path: '/reports/accounts-receivable',
            icon: 'money',
            aliases: ['/relatorios/financeiros/contas-a-receber'],
            keywords: ['contas a receber']
          },
          {
            label: 'Contas Recebidas',
            path: '/reports/received-accounts',
            icon: 'check-circle',
            aliases: ['/relatorios/financeiros/contas-recebidas'],
            keywords: ['contas recebidas']
          },
          {
            label: 'Contas a Pagar',
            path: '/reports/accounts-payable',
            icon: 'money',
            aliases: ['/relatorios/financeiros/contas-a-pagar'],
            keywords: ['contas a pagar']
          },
          {
            label: 'Contas Pagas',
            path: '/reports/paid-accounts',
            icon: 'check-circle',
            aliases: ['/relatorios/financeiros/contas-pagas'],
            keywords: ['contas pagas']
          },
          {
            label: 'Cheques',
            path: '/reports/cheques',
            icon: 'file',
            aliases: ['/relatorios/financeiros/cheques'],
            keywords: ['cheques']
          },
          {
            label: 'Pagamento Antecipado',
            path: '/reports/advance-payments',
            icon: 'arrow-right',
            aliases: ['/relatorios/financeiros/pagamento-antecipado'],
            keywords: ['pagamento antecipado']
          }
        ]
      },
      {
        id: 'relatorios-atendimentos',
        label: 'Relatórios de Atendimentos',
        items: [
          {
            label: 'Comandas/Vendas',
            path: '/reports/sales',
            icon: 'money',
            aliases: ['/relatorios/atendimentos/comandas-vendas'],
            keywords: ['comandas', 'vendas']
          },
          {
            label: 'Produtos/Serviços Produzidos',
            path: '/reports/produced-items',
            icon: 'tools',
            aliases: ['/relatorios/atendimentos/produtos-servicos-produzidos'],
            keywords: ['produtos servicos produzidos']
          },
          {
            label: 'Produção',
            path: '/reports/production',
            icon: 'factory',
            aliases: ['/relatorios/atendimentos/producao'],
            keywords: ['producao']
          },
          {
            label: 'Agenda',
            path: '/reports/appointments',
            icon: 'calendar',
            aliases: ['/relatorios/atendimentos/agenda'],
            keywords: ['relatorios agenda', 'appointments']
          },
          {
            label: 'Atendimento por Profissional',
            path: '/reports/professional-care',
            icon: 'stethoscope',
            aliases: ['/relatorios/atendimentos/atendimento-por-profissional'],
            keywords: ['atendimento profissional']
          }
        ]
      },
      {
        id: 'relatorios-personalizados',
        label: 'Relatórios Personalizados',
        items: [
          {
            label: 'Relatório de NF de Serviços Prestados',
            path: '/reports/nf',
            icon: 'receipt',
            aliases: ['/relatorios/personalizados/relatorio-de-nf-de-servicos-prestados'],
            keywords: ['nf servicos prestados']
          }
        ]
      },
      {
        id: 'relatorios-cadastros',
        label: 'Relatórios de Cadastros',
        items: [
          {
            label: 'Serviços',
            path: '/reports/registers/services',
            icon: 'tools',
            aliases: ['/relatorios/cadastros/servicos'],
            keywords: ['servicos']
          },
          {
            label: 'Tutores',
            path: '/reports/registers/owners',
            icon: 'user',
            aliases: ['/relatorios/cadastros/clientes'],
            keywords: ['tutores', 'clientes']
          },
          {
            label: 'Pacientes',
            path: '/reports/registers/patients',
            icon: 'paw',
            aliases: ['/relatorios/cadastros/animais'],
            keywords: ['pacientes', 'animais']
          },
          {
            label: 'Fornecedores',
            path: '/reports/registers/suppliers',
            icon: 'truck',
            aliases: ['/relatorios/cadastros/fornecedores'],
            keywords: ['fornecedores']
          },
          {
            label: 'Exclusão de Vendas e Comandas',
            path: '/reports/deleted-sales-counter-sales',
            icon: 'receipt',
            aliases: ['/relatorios/cadastros/exclusao-de-vendas-e-comandas'],
            keywords: ['exclusao vendas comandas']
          }
        ]
      },
      {
        id: 'relatorios-estoque',
        label: 'Relatórios de Estoque',
        items: [
          { label: 'Estoque', path: '/reports/inventory', icon: 'package', keywords: ['estoque'] },
          {
            label: 'Movimentações no Estoque',
            path: '/reports/inventory-movements',
            icon: 'inbox',
            aliases: ['/relatorios/estoque/movimentacoes-no-estoque'],
            keywords: ['movimentacoes estoque']
          },
          {
            label: 'Entrada de NF',
            path: '/reports/inventory-invoices',
            icon: 'receipt',
            aliases: ['/relatorios/estoque/entrada-de-nf'],
            keywords: ['entrada nf']
          },
          {
            label: 'Relatório de Produtos',
            path: '/reports/inventory-products',
            icon: 'tag',
            aliases: ['/relatorios/estoque/relatorio-de-produtos'],
            keywords: ['relatorio produtos']
          }
        ]
      },
      {
        id: 'relatorios-hub',
        label: 'Hubs CVG',
        items: [
          {
            label: 'Visão por Domínio',
            path: '/reports',
            icon: 'chart',
            keywords: ['relatorios por dominio', 'hub']
          },
          {
            label: 'Motor Enterprise',
            path: '/reports/engine',
            icon: 'chart',
            keywords: ['motor enterprise', 'relatorios premium', 'exportacao', 'agendamento']
          },
          {
            label: 'Hubs Administrativos',
            path: '/administrative-reports',
            icon: 'chart',
            keywords: ['administrative reports', 'commercial reports']
          }
        ]
      }
    ]
  }
];

export const enterpriseConsole: AppNavGroup = {
  id: 'console-enterprise',
  label: 'Console Enterprise',
  icon: 'compass',
  description: 'Governança, conformidade, integrações e superfícies avançadas da plataforma',
  sections: [
    {
      id: 'console-governanca',
      label: 'Governança',
      items: [
        {
          label: 'Grupos de Acesso',
          path: '/access-control',
          icon: 'shield',
          keywords: ['acesso', 'rbac', 'grupos', 'permissoes']
        },
        {
          label: 'Auditoria',
          path: '/audit',
          icon: 'receipt',
          keywords: ['logs', 'rastreamento', 'evidencia']
        },
        {
          label: 'LGPD',
          path: '/lgpd',
          icon: 'lock',
          keywords: ['consentimento', 'privacidade', 'compliance']
        }
      ]
    },
    {
      id: 'console-integracoes',
      label: 'Integrações',
      items: [
        {
          label: 'Chaves de API',
          path: '/api-keys',
          icon: 'key',
          keywords: ['apikey', 'token', 'integracao']
        },
        {
          label: 'Cliente de API',
          path: '/api-client',
          icon: 'tools',
          keywords: ['client', 'request', 'api']
        },
        {
          label: 'Webhooks',
          path: '/webhooks',
          icon: 'link',
          aliases: ['/webhook', '/cadastro/webhooks', '/cadastros/webhooks'],
          keywords: ['webhooks', 'integracoes']
        }
      ]
    },
    {
      id: 'console-plataforma',
      label: 'Plataforma',
      items: [
        {
          label: 'Configurações',
          path: '/administration/settings',
          icon: 'settings',
          keywords: ['configuracoes', 'parâmetros', 'administracao']
        }
      ]
    },
    {
      id: 'console-utilidades',
      label: 'Utilidades',
      items: [
        {
          label: 'Busca Mestre',
          path: '/master-search',
          icon: 'search',
          keywords: ['busca', 'global', 'search']
        }
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

export function findNavItem(
  path: string,
  groups: AppNavGroup[] = navGroups
): AppNavItem | undefined {
  const normalizedPath = normalizeNavPath(path);
  return flattenAllNavItems(groups).find((item) =>
    navPathCandidates(item).some((candidate) => normalizeNavPath(candidate) === normalizedPath)
  );
}

function normalizeNavPath(path: string): string {
  const [pathname] = path.split(/[?#]/, 1);
  return pathname || '/';
}

function navPathCandidates(item: AppNavItem): string[] {
  return [item.path, ...(item.aliases ?? [])];
}

function matchesNavPath(path: string, item: AppNavItem): boolean {
  const normalizedPath = normalizeNavPath(path);
  return navPathCandidates(item).some((candidate) => {
    const normalizedCandidate = normalizeNavPath(candidate);
    if (normalizedCandidate === '/') return normalizedPath === '/';
    return (
      normalizedPath === normalizedCandidate || normalizedPath.startsWith(`${normalizedCandidate}/`)
    );
  });
}

function navPathSpecificity(item: AppNavItem): number {
  return Math.max(
    ...navPathCandidates(item).map((candidate) => normalizeNavPath(candidate).length)
  );
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

  const sorted = [...locations].sort(
    (a, b) => navPathSpecificity(b.item) - navPathSpecificity(a.item)
  );
  return sorted.find((location) => matchesNavPath(path, location.item));
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
