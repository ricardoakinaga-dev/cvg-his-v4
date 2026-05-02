<template>
  <div class="counter-sales-page">
    <AppPageHeader
      title="Comandas"
      :breadcrumbs="['Início', 'Atendimento', 'Atendimentos', 'Comandas']"
      subtitle="Atendimento > Atendimentos > Comandas. Cards operacionais para localizar, abrir, compor, encaminhar e finalizar a cobrança do atendimento."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loadingPage" @click="loadPage">Atualizar</DsButton>
        <DsButton variant="primary" @click="openCreateModal">+ Abrir Nova Comanda</DsButton>
      </template>
    </AppPageHeader>

    <section class="counter-sales-kpis">
      <DsStatCard :label="`${openSalesCount} aberta(s)`" value="" icon="🟠" />
      <DsStatCard :label="`${closedSalesCount} fechada(s)`" value="" icon="🟢" />
      <DsStatCard :label="formatCurrency(openBalanceTotal)" value="" icon="💰" />
      <DsStatCard :label="formatCurrency(grossSalesTotal)" value="" icon="📈" />
    </section>

    <details class="counter-sales-report">
      <summary class="counter-sales-report__summary">
        <span>Relatório executivo próprio</span>
        <small>Indicadores e análise ficam recolhidos para não disputar atenção com a comanda.</small>
      </summary>
      <DsCard title="Relatório executivo próprio">
        <div class="report-toolbar">
          <DsInput v-model="reportFilters.dateFrom" type="date" label="Recorte de" />
          <DsInput v-model="reportFilters.dateTo" type="date" label="até" />
          <DsButton variant="secondary" :loading="loadingDashboard" @click="loadExecutiveDashboard">
            Atualizar leitura executiva
          </DsButton>
        </div>

        <DsAlert
          v-if="dashboardWarning"
          variant="warning"
          dismissible
          @dismiss="dashboardWarning = ''"
        >
          {{ dashboardWarning }}
        </DsAlert>

        <div v-if="commercialDashboard" class="executive-report">
          <div class="summary-grid">
            <div v-for="card in executiveSummaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>

          <div class="executive-report__grid">
            <article class="report-panel">
              <div class="report-panel__header">
                <div>
                  <span class="workbench-section__eyebrow">Leitura do caixa comercial</span>
                  <h3>Mix financeiro do período</h3>
                </div>
                <span class="report-panel__hint">{{ reportWindowLabel }}</span>
              </div>

              <div v-if="commercialDashboard.salesByPaymentMethod.length > 0" class="rank-list">
                <div
                  v-for="item in commercialDashboard.salesByPaymentMethod"
                  :key="item.method"
                  class="rank-list__item"
                >
                  <div>
                    <strong>{{ paymentMethodLabel(item.method) }}</strong>
                    <div class="rank-list__meta">
                      {{ paymentMethodShare(item.total) }} do total monitorado
                    </div>
                  </div>
                  <strong>{{ formatCurrency(item.total) }}</strong>
                </div>
              </div>
              <div v-else class="counter-sales-empty">
                Nenhum pagamento fechado encontrado no recorte informado.
              </div>
            </article>

            <article class="report-panel">
              <div class="report-panel__header">
                <div>
                  <span class="workbench-section__eyebrow">Performance do balcão</span>
                  <h3>Itens líderes</h3>
                </div>
                <span class="report-panel__hint">Top produtos e serviços</span>
              </div>

              <div class="leaderboard-grid">
                <div class="leaderboard-block">
                  <strong class="leaderboard-block__title">Produtos</strong>
                  <div v-if="commercialDashboard.topProducts.length > 0" class="rank-list">
                    <div
                      v-for="item in commercialDashboard.topProducts.slice(0, 5)"
                      :key="`product-${item.name}`"
                      class="rank-list__item"
                    >
                      <div>
                        <strong>{{ item.name }}</strong>
                        <div class="rank-list__meta">{{ item.quantity }} un.</div>
                      </div>
                      <strong>{{ formatCurrency(item.revenue) }}</strong>
                    </div>
                  </div>
                  <div v-else class="counter-sales-empty">Sem produtos fechados no recorte.</div>
                </div>

                <div class="leaderboard-block">
                  <strong class="leaderboard-block__title">Serviços</strong>
                  <div v-if="commercialDashboard.topServices.length > 0" class="rank-list">
                    <div
                      v-for="item in commercialDashboard.topServices.slice(0, 5)"
                      :key="`service-${item.name}`"
                      class="rank-list__item"
                    >
                      <div>
                        <strong>{{ item.name }}</strong>
                        <div class="rank-list__meta">{{ item.quantity }} ocorrência(s)</div>
                      </div>
                      <strong>{{ formatCurrency(item.revenue) }}</strong>
                    </div>
                  </div>
                  <div v-else class="counter-sales-empty">Sem serviços fechados no recorte.</div>
                </div>
              </div>
            </article>

            <article class="report-panel">
              <div class="report-panel__header">
                <div>
                  <span class="workbench-section__eyebrow">Operação e reposição</span>
                  <h3>Monitor de risco comercial</h3>
                </div>
                <span class="report-panel__hint">Quotes, conversão e estoque</span>
              </div>

              <div class="risk-stack">
                <div class="summary-card">
                  <span class="summary-card__label">Pipeline aprovado</span>
                  <strong class="summary-card__value">{{ approvedQuotesCount }}</strong>
                  <span class="summary-card__hint">Orçamentos aprovados ainda convertíveis</span>
                </div>
                <div class="summary-card">
                  <span class="summary-card__label">Taxa de conversão</span>
                  <strong class="summary-card__value">{{ quoteConversionRateLabel }}</strong>
                  <span class="summary-card__hint">Quotes convertidos em comanda</span>
                </div>
                <div v-if="lowStockAlerts.length > 0" class="alert-stack">
                  <div
                    v-for="alert in lowStockAlerts.slice(0, 4)"
                    :key="alert.code"
                    class="inline-alert"
                  >
                    <strong>{{ alert.name }}</strong>
                    <span>SKU {{ alert.code }} · {{ alert.onHand }}/{{ alert.reorderLevel }}</span>
                  </div>
                </div>
                <div v-else class="counter-sales-empty">
                  Nenhum alerta crítico de reposição retornado pelo dashboard.
                </div>
              </div>
            </article>
          </div>
        </div>

        <div v-else-if="loadingDashboard" class="counter-sales-empty">
          Carregando leitura executiva de comandas...
        </div>
        <div v-else class="counter-sales-empty">
          O relatório executivo não está disponível neste momento.
        </div>
      </DsCard>
    </details>

    <section v-if="integrationWarnings.length > 0" class="counter-sales-alerts">
      <DsAlert
        v-for="warning in integrationWarnings"
        :key="warning"
        variant="warning"
        dismissible
      >
        {{ warning }}
      </DsAlert>
    </section>

    <section v-if="operationalAlerts.length > 0" class="counter-sales-alerts">
      <DsAlert
        v-for="alert in operationalAlerts"
        :key="alert.title"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> — {{ alert.message }}
      </DsAlert>
    </section>

    <section
      v-if="workflowContext.ownerId"
      class="counter-sales-context"
      aria-label="Contexto da recepcao para comanda"
    >
      <div>
        <span class="counter-sales-context__eyebrow">Recepção</span>
        <h2>Comanda preparada pela recepção</h2>
        <p>
          Tutor {{ contextualOwnerLabel }} indicado para abertura manual.
          <span v-if="workflowContext.patientId">Paciente {{ contextualPatientLabel }}.</span>
          <span v-if="workflowContext.encounterId">Atendimento {{ workflowContext.encounterId }}.</span>
          Nenhuma comanda foi criada automaticamente.
        </p>
      </div>
      <div class="counter-sales-context__actions">
        <DsButton
          v-if="workflowContext.patientId"
          variant="ghost"
          tag="a"
          :to="`/patients/${encode(workflowContext.patientId)}`"
        >
          Paciente
        </DsButton>
        <DsButton
          v-if="workflowContext.encounterId"
          variant="ghost"
          tag="a"
          :to="`/encounters/${encode(workflowContext.encounterId)}`"
        >
          Atendimento
        </DsButton>
        <DsButton
          v-if="workflowContext.encounterId"
          variant="ghost"
          tag="a"
          :to="`/medical-records/${encode(workflowContext.encounterId)}`"
        >
          Prontuário
        </DsButton>
        <DsButton variant="secondary" @click="openCreateModal">Abrir comanda manualmente</DsButton>
      </div>
    </section>

    <section class="counter-sales-actions">
      <DsCard title="Ações rápidas" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" @click="openCreateModal">+ Abrir Nova Comanda</DsButton>
          <DsButton variant="secondary" tag="a" to="/appointments/new">Novo agendamento</DsButton>
          <DsButton variant="secondary" tag="a" to="/encounters/new">Novo atendimento</DsButton>
          <DsButton variant="secondary" tag="a" to="/billing">Faturamento</DsButton>
          <DsButton variant="secondary" tag="a" to="/cash">Caixa</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="counter-sales-toolbar">
      <DsInput
        v-model="filters.search"
        type="search"
        label="Buscar comanda"
        placeholder="Buscar por Nome, CPF, E-mail ou ID"
      />
      <DsInput v-model="filters.status" type="select" label="Status">
        <option value="all">Todos</option>
        <option value="open">Abertas</option>
        <option value="closed">Fechadas</option>
        <option value="cancelled">Canceladas</option>
      </DsInput>
      <DsInput v-model="filters.dateFrom" type="date" label="Período de" />
      <DsInput v-model="filters.dateTo" type="date" label="até" />
      <div class="counter-sales-toolbar__actions">
        <DsButton variant="secondary" :loading="loadingPage" @click="loadPage">
          Filtrar
        </DsButton>
      </div>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert
      v-if="successMessage"
      variant="success"
      dismissible
      @dismiss="successMessage = ''"
    >
      {{ successMessage }}
    </DsAlert>

    <div class="counter-sales-layout">
      <section class="counter-sales-list">
        <DsCard title="Comandas">
          <div v-if="loadingPage" class="counter-sales-empty">Carregando comandas...</div>
          <EmptyState
            v-else-if="filteredSales.length === 0"
            icon="🧾"
            title="Nenhuma comanda encontrada"
            description="Abra uma nova comanda ou ajuste os filtros para localizar eventos de balcão."
          />

          <div v-else class="counter-sales-cards">
            <article
              v-for="sale in filteredSales"
              :key="sale.id"
              class="counter-sale-card"
              :class="{ 'counter-sale-card--selected': sale.id === selectedSaleId }"
            >
              <div class="counter-sale-card__header">
                <DsBadge :variant="statusBadgeVariant(sale.status)">
                  {{ statusLabel(sale.status) }}
                </DsBadge>
                <div class="counter-sale-card__field">
                  <span>ID da Comanda:</span>
                  <strong>{{ sale.number }}</strong>
                </div>
                <div class="counter-sale-card__field">
                  <span>Abertura:</span>
                  <strong>{{ formatDateTime(sale.createdAt) }}</strong>
                </div>
                <div class="counter-sale-card__field">
                  <span>Fechamento:</span>
                  <strong>{{ sale.closedAt ? formatDateTime(sale.closedAt) : '-' }}</strong>
                </div>
                <div class="counter-sale-card__field">
                  <span>Cliente:</span>
                  <strong>{{ ownerName(sale.ownerId) }}</strong>
                </div>
                <div class="counter-sale-card__field counter-sale-card__field--total">
                  <span>Valor Total:</span>
                  <strong>{{ formatCurrency(sale.total) }}</strong>
                </div>
                <DsButton size="sm" variant="primary" @click="selectSale(sale.id)">
                  Ver comanda
                </DsButton>
              </div>

              <div class="counter-sale-card__mobile-context">
                <span>{{ ownerPrimaryContactLabel(sale.ownerId) }}</span>
                <span>{{ ownerPatientsLabel(sale.ownerId) }}</span>
                <span>{{ openedByLabel(sale.openedByUserId) }}</span>
                <span>{{ accountLabel(sale.accountId) }}</span>
              </div>

              <div class="counter-sale-card__grid">
                <div class="summary-card">
                  <span class="summary-card__label">Total</span>
                  <strong class="summary-card__value">{{ formatCurrency(sale.total) }}</strong>
                </div>
                <div class="summary-card">
                  <span class="summary-card__label">Pago</span>
                  <strong class="summary-card__value">{{ formatCurrency(sale.paidAmount) }}</strong>
                </div>
                <div class="summary-card">
                  <span class="summary-card__label">Saldo</span>
                  <strong class="summary-card__value">{{ formatCurrency(sale.balanceDue) }}</strong>
                </div>
              </div>

              <p v-if="sale.notes" class="counter-sale-card__notes">{{ sale.notes }}</p>

              <details class="counter-sale-card__details">
                <summary>Informações do cliente</summary>
                <div class="counter-sale-card__details-grid">
                  <span>{{ ownerName(sale.ownerId) }}</span>
                  <span>{{ ownerPrimaryContactLabel(sale.ownerId) }}</span>
                  <span>{{ ownerPatientsLabel(sale.ownerId) }}</span>
                </div>
              </details>

              <details class="counter-sale-card__details">
                <summary>Serviços / Produtos</summary>
                <div class="counter-sale-card__details-grid">
                  <span>{{ saleItemsCountLabel(sale) }}</span>
                  <span>Produtos: {{ formatCurrency(saleItemsTotal(sale, 'product')) }}</span>
                  <span>Serviços: {{ formatCurrency(saleItemsTotal(sale, 'service')) }}</span>
                </div>
              </details>

              <div class="counter-sale-card__actions">
                <DsButton size="sm" variant="primary" @click="selectSale(sale.id)">
                  {{ sale.id === selectedSaleId ? 'Atualizar comanda' : 'Ver comanda' }}
                </DsButton>
                <DsButton
                  v-if="sale.ownerId"
                  size="sm"
                  variant="ghost"
                  tag="a"
                  :to="`/owners/${sale.ownerId}`"
                >
                  Ver tutor
                </DsButton>
              </div>
            </article>
          </div>
        </DsCard>
      </section>

      <section class="counter-sales-workbench">
        <DsCard v-if="selectedSale" title="Detalhes da Comanda">
          <div class="workbench-shell">
            <div class="workbench-main">
              <section class="workbench-section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">Contexto assistencial</span>
                    <h3>Animais Vinculados na Comanda</h3>
                  </div>
                  <span class="workbench-section__hint">
                    {{ selectedPatientContexts.length }} animal(is)
                  </span>
                  <DsButton
                    v-if="selectedSale.ownerId"
                    size="sm"
                    variant="ghost"
                    tag="a"
                    :to="`/patients?ownerId=${selectedSale.ownerId}`"
                  >
                    Ver cadastro
                  </DsButton>
                </header>

                <div v-if="selectedPatientContexts.length > 0" class="patient-context-grid">
                  <article
                    v-for="context in selectedPatientContexts"
                    :key="context.patient.id"
                    class="patient-context-card"
                  >
                    <div class="patient-context-card__summary">
                      <div>
                        <strong>{{ context.patient.name }}</strong>
                        <div class="patient-context-card__meta">
                          {{ context.patient.species }}
                          <span v-if="context.patient.breed">· {{ context.patient.breed }}</span>
                        </div>
                      </div>

                      <div class="patient-context-card__badges">
                        <DsBadge :variant="context.encounter ? 'success' : 'default'">
                          {{ encounterBadgeLabel(context) }}
                        </DsBadge>
                        <DsBadge :variant="context.medicalRecord ? 'warning' : 'default'">
                          {{ medicalRecordBadgeLabel(context) }}
                        </DsBadge>
                      </div>
                    </div>

                    <div class="patient-context-card__journey">
                      <div class="journey-pill">
                        <span class="summary-card__label">Atendimento</span>
                        <strong>{{ patientEncounterSubtitle(context) }}</strong>
                      </div>
                      <div class="journey-pill">
                        <span class="summary-card__label">Prontuário</span>
                        <strong>{{ patientMedicalRecordSubtitle(context) }}</strong>
                      </div>
                    </div>

                    <div class="patient-context-card__actions">
                      <DsButton size="sm" variant="ghost" tag="a" :to="`/patients/${context.patient.id}`">
                        Cadastro
                      </DsButton>
                      <DsButton
                        size="sm"
                        variant="secondary"
                        tag="a"
                        :to="patientEncounterLink(context)"
                      >
                        {{ patientEncounterActionLabel(context) }}
                      </DsButton>
                      <DsButton
                        size="sm"
                        variant="primary"
                        tag="a"
                        :to="patientMedicalRecordLink(context)"
                      >
                        {{ patientMedicalRecordActionLabel(context) }}
                      </DsButton>
                    </div>
                  </article>
                </div>
                <div v-else class="counter-sales-empty">
                  Nenhum animal relacionado ao tutor desta comanda.
                </div>
              </section>

              <section class="workbench-section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">Execução assistencial</span>
                    <h3>Serviços</h3>
                  </div>
                  <span class="workbench-section__hint">
                    Total: {{ formatCurrency(selectedServicesTotal) }}
                  </span>
                </header>

                <div v-if="selectedPatientContexts.length > 0" class="service-patient-list">
                  <article
                    v-for="context in selectedPatientContexts"
                    :key="`service-${context.patient.id}`"
                    class="service-patient-card"
                  >
                    <div>
                      <strong>{{ context.patient.name }}</strong>
                      <div class="patient-context-card__meta">
                        {{ context.patient.species }}
                        <span v-if="context.patient.breed">· {{ context.patient.breed }}</span>
                      </div>
                    </div>
                    <div class="service-patient-card__actions">
                      <DsButton
                        size="sm"
                        variant="ghost"
                        tag="a"
                        :to="`/patients/${context.patient.id}`"
                      >
                        Ver Detalhes do Animal
                      </DsButton>
                      <DsButton size="sm" variant="primary" @click="focusCatalogType('service')">
                        Incluir Serviços
                      </DsButton>
                    </div>
                  </article>
                </div>
                <div v-else class="counter-sales-empty">
                  Vincule um animal para lançar serviços contextualizados na comanda.
                </div>
              </section>

              <section class="workbench-section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">Lançamento operacional</span>
                    <h3>Produtos</h3>
                  </div>
                </header>

                <div class="catalog-toolbar">
                  <DsInput
                    v-model="catalogForm.search"
                    type="search"
                    label="Catálogo"
                    placeholder="Nome, código de barras, SKU ou serviço"
                  />
                  <DsInput v-model="catalogForm.itemType" type="select" label="Tipo">
                    <option value="all">Todos</option>
                    <option value="product">Produtos</option>
                    <option value="service">Serviços</option>
                  </DsInput>
                  <DsInput
                    v-model.number="catalogForm.quantity"
                    type="number"
                    label="Quantidade"
                    min="1"
                  />
                  <DsInput
                    v-model.number="catalogForm.discountAmount"
                    type="number"
                    label="Desconto"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div class="barcode-toolbar">
                  <DsInput
                    v-model="barcodeForm.code"
                    label="Código de barras"
                    placeholder="Bipar ou digitar código de barras"
                    @keyup.enter="addItemByBarcode"
                  />
                  <DsInput
                    v-model.number="barcodeForm.quantity"
                    type="number"
                    label="Qtd código"
                    min="1"
                  />
                  <DsButton variant="primary" :loading="savingItem" @click="addItemByBarcode">
                    Adicionar Produtos
                  </DsButton>
                </div>

                <div v-if="barcodeMatchedOption" class="barcode-match">
                  <strong>{{ barcodeMatchedOption.name }}</strong>
                  <span>
                    {{ barcodeMatchedOption.type === 'product' ? 'Produto' : 'Serviço' }}
                    <span v-if="barcodeMatchedOption.code">· {{ barcodeMatchedOption.code }}</span>
                    · {{ formatCurrency(barcodeMatchedOption.basePrice) }}
                  </span>
                </div>
                <div v-else-if="barcodeForm.code.trim()" class="counter-sales-empty">
                  Nenhum item do catálogo corresponde ao código digitado.
                </div>

                <div class="catalog-results">
                  <article
                    v-for="option in visibleCatalogOptions"
                    :key="`${option.type}-${option.id}`"
                    class="catalog-card"
                  >
                    <div class="catalog-card__header">
                      <div>
                        <h4>{{ option.name }}</h4>
                        <div class="catalog-card__meta">
                          <span>{{ option.type === 'product' ? 'Produto' : 'Serviço' }}</span>
                          <span v-if="option.code">{{ option.code }}</span>
                          <span v-if="option.type === 'product'">
                            Estoque {{ option.onHandQuantity ?? '—' }}
                          </span>
                        </div>
                      </div>
                      <strong>{{ formatCurrency(option.basePrice) }}</strong>
                    </div>

                    <p class="catalog-card__hint">
                      {{ option.description || 'Sem descrição operacional cadastrada.' }}
                    </p>

                    <DsButton
                      size="sm"
                      variant="primary"
                      :loading="savingItem"
                      @click="addCatalogOption(option)"
                    >
                      Adicionar na comanda
                    </DsButton>
                  </article>

                  <div v-if="visibleCatalogOptions.length === 0" class="counter-sales-empty">
                    Nenhum item de catálogo encontrado para o filtro atual.
                  </div>
                </div>
              </section>

              <section class="workbench-section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">Painel esquerdo</span>
                    <h3>Serviços / Produtos</h3>
                  </div>
                </header>

                <div class="item-total-grid">
                  <div class="summary-card">
                    <span class="summary-card__label">Produtos</span>
                    <strong class="summary-card__value">{{ formatCurrency(selectedProductsTotal) }}</strong>
                  </div>
                  <div class="summary-card">
                    <span class="summary-card__label">Serviços</span>
                    <strong class="summary-card__value">{{ formatCurrency(selectedServicesTotal) }}</strong>
                  </div>
                </div>

                <div v-if="selectedSale.items.length > 0" class="item-list">
                  <article
                    v-for="item in selectedSale.items"
                    :key="item.id"
                    class="line-item-card"
                  >
                    <div class="line-item-card__header">
                      <div>
                        <strong>{{ item.nameSnapshot }}</strong>
                        <div class="line-item-card__meta">
                          <span>{{ item.itemType === 'product' ? 'Produto' : 'Serviço' }}</span>
                          <span v-if="item.codeSnapshot">{{ item.codeSnapshot }}</span>
                          <span>{{ formatCurrency(item.unitPrice) }}/un</span>
                        </div>
                      </div>
                      <strong>{{ formatCurrency(item.lineTotal) }}</strong>
                    </div>

                    <div class="line-item-card__controls">
                      <DsButton
                        size="sm"
                        variant="ghost"
                        :disabled="savingItem || item.quantity <= 1"
                        @click="changeItemQuantity(item, item.quantity - 1)"
                      >
                        -
                      </DsButton>
                      <span class="line-item-card__quantity">{{ item.quantity }}</span>
                      <DsButton
                        size="sm"
                        variant="ghost"
                        :disabled="savingItem"
                        @click="changeItemQuantity(item, item.quantity + 1)"
                      >
                        +
                      </DsButton>
                      <DsButton
                        size="sm"
                        variant="secondary"
                        :disabled="savingItem"
                        @click="applyDefaultDiscount(item)"
                      >
                        Editar desconto
                      </DsButton>
                      <DsButton
                        size="sm"
                        variant="danger"
                        :disabled="savingItem"
                        @click="removeItem(item.id)"
                      >
                        Excluir
                      </DsButton>
                    </div>

                    <div class="line-item-card__footer">
                      <span>Desconto atual: {{ formatCurrency(item.discountAmount) }}</span>
                      <span v-if="item.notes">{{ item.notes }}</span>
                    </div>
                  </article>
                </div>
                <div v-else class="counter-sales-empty">
                  Nenhum item lançado ainda. Use o catálogo acima para montar a cobrança.
                </div>
              </section>

              <section class="workbench-section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">chat</span>
                    <h3>Observações Gerais</h3>
                  </div>
                  <span class="workbench-section__hint">{{ selectedSaleNotesLength }} / 1000</span>
                </header>
                <p class="counter-sale-observations">
                  {{ selectedSale.notes || 'Esta comanda ainda não possui observações gerais.' }}
                </p>
              </section>

              <section class="workbench-section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">medical_services</span>
                    <h3>Histórico de Esteira</h3>
                  </div>
                </header>
                <div v-if="selectedTimelineItems.length > 0" class="timeline-stack">
                  <article
                    v-for="event in selectedTimelineItems"
                    :key="event.key"
                    class="timeline-card"
                  >
                    <strong>{{ event.title }}</strong>
                    <span>{{ event.description }}</span>
                  </article>
                </div>
                <div v-else class="counter-sales-empty">Nenhum registro de esteira para esta comanda.</div>
              </section>
            </div>

            <aside class="workbench-sidebar">
              <section class="workbench-sidebar__section">
                <div class="sidebar-summary">
                  <div class="sidebar-summary__header">
                    <div>
                      <span class="workbench-section__eyebrow">Resumo da Conta</span>
                      <h3>Comanda ID: {{ selectedSale.number }}</h3>
                    </div>
                    <DsBadge :variant="statusBadgeVariant(selectedSale.status)">
                      {{ statusLabel(selectedSale.status) }}
                    </DsBadge>
                  </div>

                  <div class="sidebar-summary__grid">
                    <div class="summary-card">
                      <span class="summary-card__label">Subtotal</span>
                      <strong class="summary-card__value">
                        {{ formatCurrency(selectedSale.subtotal) }}
                      </strong>
                    </div>
                    <div class="summary-card">
                      <span class="summary-card__label">Desconto</span>
                      <strong class="summary-card__value">
                        {{ formatCurrency(selectedSale.discountAmount) }}
                      </strong>
                    </div>
                    <div class="summary-card">
                      <span class="summary-card__label">Pago</span>
                      <strong class="summary-card__value">
                        {{ formatCurrency(selectedSale.paidAmount) }}
                      </strong>
                    </div>
                    <div class="summary-card">
                      <span class="summary-card__label">Total a pagar</span>
                      <strong class="summary-card__value">
                        {{ formatCurrency(selectedSale.balanceDue) }}
                      </strong>
                    </div>
                  </div>

                  <div class="sidebar-owner">
                    <div>
                      <span class="summary-card__label">Cliente</span>
                      <strong>{{ selectedOwner?.fullName || 'Comanda sem tutor' }}</strong>
                    </div>
                    <div class="sidebar-owner__meta">
                      <span>{{ ownerPrimaryContactLabel(selectedSale.ownerId) }}</span>
                      <span>ID {{ selectedSale.id }}</span>
                      <span>Abertura {{ formatDateTime(selectedSale.createdAt) }}</span>
                      <span>Aberta por: {{ openedByLabel(selectedSale.openedByUserId) }}</span>
                      <span>{{ accountLabel(selectedSale.accountId) }}</span>
                    </div>
                    <details class="sidebar-contact">
                      <summary>Ver Informações de Contato</summary>
                      <p>{{ ownerContactsSummary(selectedSale.ownerId) }}</p>
                    </details>
                    <div class="sidebar-owner__actions">
                      <DsButton
                        v-if="selectedSale.ownerId"
                        size="sm"
                        variant="ghost"
                        tag="a"
                        :to="`/owners/${selectedSale.ownerId}`"
                      >
                        Ver cadastro do cliente
                      </DsButton>
                      <DsButton
                        size="sm"
                        variant="secondary"
                        :loading="printingSale"
                        @click="printSelectedSale"
                      >
                        Impressão operacional
                      </DsButton>
                      <DsButton size="sm" variant="ghost" tag="a" to="/queue">
                        Encaminhar Esteira
                      </DsButton>
                    </div>
                  </div>

                  <div class="sidebar-actions">
                    <DsButton
                      v-if="selectedSale.status === 'open'"
                      variant="secondary"
                      :disabled="savingItem"
                      @click="applySaleAdjustment('expense')"
                    >
                      Incluir Despesa Extra
                    </DsButton>
                    <DsButton
                      v-if="selectedSale.status === 'open'"
                      variant="secondary"
                      :disabled="savingItem"
                      @click="applySaleAdjustment('discount')"
                    >
                      Incluir Desconto
                    </DsButton>
                    <DsButton
                      v-if="selectedSale.status === 'open'"
                      variant="primary"
                      :loading="transitioningSale"
                      @click="closeSale"
                    >
                      Finalizar Comanda
                    </DsButton>
                    <DsButton
                      v-if="selectedSale.status === 'open'"
                      variant="danger"
                      :loading="transitioningSale"
                      @click="cancelSale"
                    >
                      Cancelar Comanda
                    </DsButton>
                    <DsButton
                      v-if="selectedSale.status === 'closed'"
                      variant="secondary"
                      :loading="transitioningSale"
                      @click="reopenSale"
                    >
                      Reabrir Comanda
                    </DsButton>
                  </div>
                </div>
              </section>

              <section class="workbench-sidebar__section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">Painel direito</span>
                    <h3>Registrar pagamento</h3>
                  </div>
                </header>

                <div class="payment-form">
                  <DsInput v-model="paymentForm.method" type="select" label="Método">
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro</option>
                    <option value="debit_card">Cartão débito</option>
                    <option value="credit_card">Cartão crédito</option>
                    <option value="bank_transfer">Transferência</option>
                    <option value="check">Cheque</option>
                    <option value="insurance">Convênio</option>
                    <option value="other">Outro</option>
                  </DsInput>
                  <DsInput
                    v-model.number="paymentForm.amount"
                    type="number"
                    label="Valor"
                    min="0.01"
                    step="0.01"
                  />
                  <DsInput
                    v-model.number="paymentForm.installments"
                    type="number"
                    label="Parcelas"
                    min="1"
                    max="12"
                  />
                  <DsInput v-model="paymentForm.reference" label="Referência" />
                  <DsInput v-model="paymentForm.notes" type="textarea" label="Observação" :rows="3" />

                  <DsButton
                    variant="secondary"
                    :loading="savingPayment"
                    :disabled="selectedSale.status !== 'open'"
                    @click="submitPayment"
                  >
                    Registrar pagamento
                  </DsButton>
                </div>
              </section>

              <section class="workbench-sidebar__section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">Histórico financeiro</span>
                    <h3>Pagamentos já lançados</h3>
                  </div>
                </header>

                <div v-if="selectedSale.payments.length > 0" class="payment-list">
                  <article
                    v-for="payment in selectedSale.payments"
                    :key="payment.id"
                    class="payment-card"
                  >
                    <div class="payment-card__header">
                      <strong>{{ paymentMethodLabel(payment.method) }}</strong>
                      <strong>{{ formatCurrency(payment.amount) }}</strong>
                    </div>
                    <div class="payment-card__meta">
                      <span>{{ formatDateTime(payment.createdAt) }}</span>
                      <span v-if="payment.reference">{{ payment.reference }}</span>
                      <span>{{ payment.installments }}x</span>
                    </div>
                  </article>
                </div>
                <div v-else class="counter-sales-empty">
                  Nenhum pagamento registrado para esta comanda.
                </div>
              </section>

              <section v-if="selectedOwnerQuotes.length > 0" class="workbench-sidebar__section">
                <header class="workbench-section__header">
                  <div>
                    <span class="workbench-section__eyebrow">Pipeline comercial</span>
                    <h3>Orçamentos aprovados do tutor</h3>
                  </div>
                </header>

                <div class="quote-list">
                  <article
                    v-for="quote in selectedOwnerQuotes"
                    :key="quote.id"
                    class="quote-card"
                  >
                    <div class="quote-card__header">
                      <strong>{{ quote.number }}</strong>
                      <strong>{{ formatCurrency(quote.total) }}</strong>
                    </div>
                    <div class="quote-card__meta">
                      <span>{{ quote.validUntil || 'Sem validade' }}</span>
                      <span>{{ quote.convertedToSaleId ? 'Convertido' : 'Pronto para conversão' }}</span>
                    </div>
                    <DsButton
                      size="sm"
                      variant="ghost"
                      :disabled="Boolean(quote.convertedToSaleId)"
                      @click="convertQuote(quote.id)"
                    >
                      Converter em comanda
                    </DsButton>
                  </article>
                </div>
              </section>
            </aside>
          </div>

          <div class="command-bottom-actions">
            <DsButton variant="ghost" @click="selectedSaleId = ''">
              Voltar para Comandas
            </DsButton>
            <DsButton variant="secondary" tag="a" to="/queue">
              Encaminhar Esteira
            </DsButton>
            <DsButton variant="secondary" :loading="printingSale" @click="printSelectedSale">
              Imprimir
            </DsButton>
            <DsButton
              v-if="selectedSale.status === 'open'"
              variant="primary"
              :loading="transitioningSale"
              @click="closeSale"
            >
              Finalizar Comanda
            </DsButton>
          </div>
        </DsCard>

        <DsCard v-else title="Workbench de comanda">
          <EmptyState
            icon="🛒"
            title="Selecione uma comanda"
            description="Abra uma comanda existente ou crie uma nova para iniciar o workbench operacional."
          />
        </DsCard>
      </section>
    </div>

    <DsModal :open="createModalOpen" title="Abrir nova comanda" size="lg" @close="closeCreateModal">
      <div class="create-sale-modal">
        <div class="create-sale-modal__tabs" role="tablist" aria-label="Fluxo de abertura de comanda">
          <button
            type="button"
            class="create-sale-modal__tab"
            :class="{ 'create-sale-modal__tab--active': createModalTab === 'registered' }"
            @click="createModalTab = 'registered'"
          >
            Cliente Cadastrado
          </button>
          <button
            type="button"
            class="create-sale-modal__tab"
            :class="{ 'create-sale-modal__tab--active': createModalTab === 'new' }"
            @click="createModalTab = 'new'"
          >
            Novo Cliente
          </button>
        </div>

        <template v-if="createModalTab === 'registered'">
          <div class="create-sale-modal__search">
            <DsInput
              v-model="ownerSearch"
              type="search"
              label="Buscar cliente"
              placeholder="Nome, id, CPF, telefone ou e-mail"
              @keyup.enter="loadModalOwners(1)"
            />
            <DsButton variant="secondary" :loading="ownersLoading" @click="loadModalOwners(1)">
              Filtrar
            </DsButton>
          </div>

          <div v-if="ownersLoading" class="counter-sales-empty">Carregando clientes...</div>
          <div v-else-if="modalOwners.length === 0" class="counter-sales-empty">
            Nenhum cliente encontrado para a busca atual.
          </div>
          <div v-else class="modal-owner-list">
            <article
              v-for="owner in modalOwners"
              :key="owner.id"
              class="modal-owner-card"
              :class="{ 'modal-owner-card--selected': selectedOwnerId === owner.id }"
            >
              <div class="modal-owner-card__header">
                <strong>{{ owner.fullName }}</strong>
                <span>{{ ownerPrimaryContactLabel(owner.id) }}</span>
              </div>
              <div class="modal-owner-card__meta">
                <span>{{ owner.documentId || 'Documento não informado' }}</span>
                <span>{{ ownerPatientsLabel(owner.id) }}</span>
              </div>
              <div class="modal-owner-card__actions">
                <DsButton
                  size="sm"
                  variant="secondary"
                  @click="selectedOwnerId = owner.id"
                >
                  {{ selectedOwnerId === owner.id ? 'Cliente selecionado' : 'Selecionar cliente' }}
                </DsButton>
                <DsButton
                  size="sm"
                  variant="ghost"
                  @click="toggleOwnerDetails(owner.id)"
                >
                  {{ expandedOwnerId === owner.id ? 'Ocultar informações' : 'Ver mais informações' }}
                </DsButton>
              </div>
              <div v-if="expandedOwnerId === owner.id" class="modal-owner-card__details">
                <div class="detail-pill">
                  <span class="summary-card__label">Responsável financeiro</span>
                  <strong>{{ owner.financialResponsible ? 'Sim' : 'Não' }}</strong>
                </div>
                <div class="detail-pill">
                  <span class="summary-card__label">Observação administrativa</span>
                  <strong>{{ owner.administrativeNotes || 'Sem anotação' }}</strong>
                </div>
                <div class="detail-pill">
                  <span class="summary-card__label">Contatos</span>
                  <strong>{{ ownerContactsSummary(owner.id) }}</strong>
                </div>
              </div>
            </article>
          </div>

          <div v-if="modalTotalPages > 1" class="modal-pagination">
            <DsButton
              size="sm"
              variant="ghost"
              :disabled="modalPage <= 1 || ownersLoading"
              @click="loadModalOwners(modalPage - 1)"
            >
              Página anterior
            </DsButton>
            <span>Página {{ modalPage }} de {{ modalTotalPages }}</span>
            <DsButton
              size="sm"
              variant="ghost"
              :disabled="modalPage >= modalTotalPages || ownersLoading"
              @click="loadModalOwners(modalPage + 1)"
            >
              Próxima página
            </DsButton>
          </div>
        </template>

        <template v-else>
          <div class="create-sale-modal__new-grid">
            <DsInput v-model="newOwnerDraft.fullName" label="Nome completo" required />
            <DsInput v-model="newOwnerDraft.documentId" label="CPF/Documento" />
            <DsInput v-model="newOwnerDraft.email" label="E-mail" />
            <DsInput v-model="newOwnerDraft.whatsapp" label="WhatsApp" />
            <DsInput v-model="newOwnerDraft.phone" label="Telefone" />
          </div>
        </template>

        <DsInput
          v-model="createSaleNotes"
          type="textarea"
          label="Observação da comanda"
          :rows="3"
          placeholder="Contexto do balcão, vendedor, convênio ou nota operacional."
        />
      </div>

      <template #footer>
        <DsButton variant="ghost" @click="closeCreateModal">Cancelar</DsButton>
        <DsButton
          v-if="createModalTab === 'registered'"
          variant="primary"
          :loading="creatingSale"
          :disabled="!selectedOwnerId"
          @click="createSaleForSelectedOwner"
        >
          Criar comanda
        </DsButton>
        <DsButton v-else variant="primary" :loading="creatingSale" @click="createOwnerAndSale">
          Criar cliente e comanda
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import {
  counterSalesService,
  type CounterSaleDetail,
  type CounterSaleItemSummary,
  type CounterSalePaymentMethod,
  type CounterSaleStatus,
  type CounterSalesCommercialDashboard
} from '@/services/counterSales';
import { encounterService } from '@/services/encounter';
import { inventoryService } from '@/services/inventory';
import { medicalRecordsService } from '@/services/medicalRecords';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { productsService, type ProductSummary } from '@/services/products';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { EncounterSummary } from '@/types/encounter';
import type { InventoryItemSummary } from '@/types/inventory';
import type { MedicalRecordListSummary } from '@/types/medicalRecords';
import type { CreateOwnerRequest, OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';

type CatalogItemType = 'all' | 'product' | 'service';

interface CatalogOption {
  id: string;
  type: 'product' | 'service';
  name: string;
  code: string | null;
  description: string | null;
  basePrice: number;
  onHandQuantity?: number;
}

interface OperationalAlert {
  title: string;
  message: string;
  variant: 'info' | 'warning' | 'danger';
}

interface SelectedPatientContext {
  patient: PatientSummary;
  encounter: EncounterSummary | null;
  medicalRecord: MedicalRecordListSummary | null;
}

interface TimelineItem {
  key: string;
  title: string;
  description: string;
}

const loadingPage = ref(false);
const loadingDashboard = ref(false);
const creatingSale = ref(false);
const savingItem = ref(false);
const savingPayment = ref(false);
const transitioningSale = ref(false);
const ownersLoading = ref(false);
const printingSale = ref(false);
const error = ref('');
const successMessage = ref('');
const dashboardWarning = ref('');

const sales = ref<CounterSaleDetail[]>([]);
const selectedSaleId = ref('');
const workflowContext = readWorkflowContext();

const ownerMap = ref<Record<string, OwnerSummary>>({});
const patientMap = ref<Record<string, PatientSummary[]>>({});
const quotes = ref<QuoteSummary[]>([]);
const products = ref<ProductSummary[]>([]);
const serviceCatalog = ref<ServiceSummary[]>([]);
const inventoryItems = ref<InventoryItemSummary[]>([]);
const encounters = ref<EncounterSummary[]>([]);
const medicalRecords = ref<MedicalRecordListSummary[]>([]);
const commercialDashboard = ref<CounterSalesCommercialDashboard | null>(null);
const integrationWarnings = ref<string[]>([]);

const filters = reactive({
  search: '',
  status: 'all' as CounterSaleStatus | 'all',
  dateFrom: '',
  dateTo: ''
});

const reportFilters = reactive({
  dateFrom: '',
  dateTo: ''
});

const catalogForm = reactive({
  search: '',
  itemType: 'all' as CatalogItemType,
  quantity: 1,
  discountAmount: 0
});

const barcodeForm = reactive({
  code: '',
  quantity: 1
});

const paymentForm = reactive({
  method: 'pix' as CounterSalePaymentMethod,
  amount: 0,
  installments: 1,
  reference: '',
  notes: ''
});

const createModalOpen = ref(false);
const createModalTab = ref<'registered' | 'new'>('registered');
const ownerSearch = ref('');
const createSaleNotes = ref('');
const selectedOwnerId = ref('');
const expandedOwnerId = ref('');
const modalPage = ref(1);
const modalTotalPages = ref(1);
const modalOwners = ref<OwnerSummary[]>([]);
const newOwnerDraft = reactive({
  fullName: '',
  documentId: '',
  email: '',
  whatsapp: '',
  phone: ''
});

const selectedSale = computed(
  () => sales.value.find((sale) => sale.id === selectedSaleId.value) ?? null
);
const selectedOwner = computed(() => {
  const ownerId = selectedSale.value?.ownerId;
  return ownerId ? ownerMap.value[ownerId] ?? null : null;
});
const selectedOwnerPatients = computed(() => {
  const ownerId = selectedSale.value?.ownerId;
  return ownerId ? patientMap.value[ownerId] ?? [] : [];
});
const selectedOwnerQuotes = computed(() => {
  const ownerId = selectedSale.value?.ownerId;
  if (!ownerId) return [];
  return quotes.value.filter((quote) => quote.ownerId === ownerId);
});
const contextualOwnerLabel = computed(() => {
  if (!workflowContext.ownerId) return 'não informado';
  return ownerMap.value[workflowContext.ownerId]?.fullName || workflowContext.ownerId;
});
const contextualPatientLabel = computed(() => {
  if (!workflowContext.patientId) return 'não informado';
  const patients = Object.values(patientMap.value).flat();
  return patients.find((patient) => patient.id === workflowContext.patientId)?.name || workflowContext.patientId;
});
const selectedProductItems = computed(() =>
  selectedSale.value?.items.filter((item) => item.itemType === 'product') ?? []
);
const selectedServiceItems = computed(() =>
  selectedSale.value?.items.filter((item) => item.itemType === 'service') ?? []
);
const selectedProductsTotal = computed(() =>
  selectedProductItems.value.reduce((sum, item) => sum + item.lineTotal, 0)
);
const selectedServicesTotal = computed(() =>
  selectedServiceItems.value.reduce((sum, item) => sum + item.lineTotal, 0)
);
const selectedSaleNotesLength = computed(() => selectedSale.value?.notes?.length ?? 0);

const selectedPatientContexts = computed<SelectedPatientContext[]>(() => {
  const recordByEncounterId = new Map(
    medicalRecords.value.map((record) => [record.record.encounterId, record] as const)
  );

  return selectedOwnerPatients.value.map((patient) => {
    const patientEncounters = encounters.value
      .filter((encounter) => encounter.patientId === patient.id)
      .slice()
      .sort((left, right) => {
        const leftWeight = left.status === 'closed' ? 0 : 1;
        const rightWeight = right.status === 'closed' ? 0 : 1;
        if (leftWeight !== rightWeight) {
          return rightWeight - leftWeight;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });
    const encounter = patientEncounters[0] ?? null;

    return {
      patient,
      encounter,
      medicalRecord: encounter ? recordByEncounterId.get(encounter.id) ?? null : null
    };
  });
});
const selectedTimelineItems = computed<TimelineItem[]>(() => {
  const sale = selectedSale.value;
  if (!sale) return [];

  const patientEvents = selectedPatientContexts.value.map((context) => ({
    key: `patient-${context.patient.id}`,
    title: `${context.patient.name} · ${context.encounter ? encounterStatusLabel(context.encounter.status) : 'Aguardando entrada'}`,
    description: context.encounter
      ? `Entrada: ${formatDateTime(context.encounter.openedAt)} · Setor receptor: Atendimento`
      : 'Urgência: Aguardando · Setor receptor: Clínica'
  }));

  const paymentEvents = sale.payments.map((payment) => ({
    key: `payment-${payment.id}`,
    title: `Pagamento ${paymentMethodLabel(payment.method)}`,
    description: `${formatCurrency(payment.amount)} registrado em ${formatDateTime(payment.createdAt)}`
  }));

  return [...patientEvents, ...paymentEvents];
});

const inventoryBySku = computed(
  () => new Map(inventoryItems.value.map((item) => [item.sku, item]))
);

const lowStockAlerts = computed(() => commercialDashboard.value?.lowStockAlerts ?? []);
const approvedQuotesCount = computed(
  () => quotes.value.filter((quote) => quote.status === 'approved' && !quote.convertedToSaleId).length
);
const convertedQuotesCount = computed(
  () => quotes.value.filter((quote) => Boolean(quote.convertedToSaleId)).length
);
const quoteConversionRateLabel = computed(() => {
  const totalQuotes = quotes.value.length;
  if (totalQuotes === 0) return '0%';
  return formatPercent((convertedQuotesCount.value / totalQuotes) * 100);
});
const paymentMixTotal = computed(() =>
  (commercialDashboard.value?.salesByPaymentMethod ?? []).reduce((sum, item) => sum + item.total, 0)
);
const reportWindowLabel = computed(() => {
  if (!reportFilters.dateFrom && !reportFilters.dateTo) {
    return 'Janela padrão';
  }
  const from = reportFilters.dateFrom || 'início';
  const to = reportFilters.dateTo || 'agora';
  return `${from} → ${to}`;
});
const executiveSummaryCards = computed(() => {
  if (!commercialDashboard.value) return [];

  return [
    {
      label: 'Abertas agora',
      value: String(commercialDashboard.value.openSales),
      hint: 'Comandas ainda em operação'
    },
    {
      label: 'Fechadas hoje',
      value: String(commercialDashboard.value.closedToday),
      hint: 'Venda concluída no dia operacional'
    },
    {
      label: 'Receita bruta',
      value: formatCurrency(commercialDashboard.value.grossRevenueToday),
      hint: 'Produção comercial do dia'
    },
    {
      label: 'Receita líquida',
      value: formatCurrency(commercialDashboard.value.netRevenueToday),
      hint: 'Valor efetivamente capturado'
    },
    {
      label: 'Ticket médio',
      value: formatCurrency(commercialDashboard.value.avgTicket),
      hint: 'Média das comandas fechadas'
    },
    {
      label: 'Quotes convertidos',
      value: quoteConversionRateLabel.value,
      hint: `${convertedQuotesCount.value} de ${quotes.value.length} orçamento(s)`
    }
  ];
});

const catalogOptions = computed<CatalogOption[]>(() => {
  const productOptions = products.value.map((product) => ({
    id: product.id,
    type: 'product' as const,
    name: product.name,
    code: product.code,
    description: product.description,
    basePrice: product.basePrice,
    onHandQuantity: product.code ? inventoryBySku.value.get(product.code)?.onHandQuantity : undefined
  }));
  const serviceOptions = serviceCatalog.value.map((service) => ({
    id: service.id,
    type: 'service' as const,
    name: service.name,
    code: service.code,
    description: service.description,
    basePrice: service.basePrice
  }));

  return [...productOptions, ...serviceOptions];
});

const visibleCatalogOptions = computed(() => {
  const search = catalogForm.search.trim().toLowerCase();
  return catalogOptions.value
    .filter((option) => {
      const matchesType =
        catalogForm.itemType === 'all' || option.type === catalogForm.itemType;
      const matchesSearch =
        !search ||
        option.name.toLowerCase().includes(search) ||
        (option.code ?? '').toLowerCase().includes(search) ||
        (option.description ?? '').toLowerCase().includes(search);
      return matchesType && matchesSearch;
    })
    .slice(0, 12);
});

const barcodeMatchedOption = computed(() => {
  const normalizedCode = normalizeCatalogCode(barcodeForm.code);
  if (!normalizedCode) return null;

  return (
    catalogOptions.value.find((option) => normalizeCatalogCode(option.code ?? '') === normalizedCode) ??
    null
  );
});

const filteredSales = computed(() => {
  const search = filters.search.trim().toLowerCase();
  return sales.value.filter((sale) => {
    const owner = sale.ownerId ? ownerMap.value[sale.ownerId] : null;
    const matchesSearch =
      !search ||
      sale.number.toLowerCase().includes(search) ||
      (sale.notes ?? '').toLowerCase().includes(search) ||
      (owner?.fullName ?? '').toLowerCase().includes(search) ||
      ownerPrimaryContactLabel(sale.ownerId).toLowerCase().includes(search);
    const matchesStatus = filters.status === 'all' || sale.status === filters.status;
    const matchesDateFrom =
      !filters.dateFrom || sale.createdAt >= `${filters.dateFrom}T00:00:00`;
    const matchesDateTo =
      !filters.dateTo || sale.createdAt <= `${filters.dateTo}T23:59:59`;
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });
});

const openSalesCount = computed(
  () => sales.value.filter((sale) => sale.status === 'open').length
);
const closedSalesCount = computed(
  () => sales.value.filter((sale) => sale.status === 'closed').length
);
const openBalanceTotal = computed(() =>
  sales.value
    .filter((sale) => sale.status === 'open')
    .reduce((sum, sale) => sum + sale.balanceDue, 0)
);
const grossSalesTotal = computed(() =>
  sales.value.reduce((sum, sale) => sum + sale.total, 0)
);

const operationalAlerts = computed<OperationalAlert[]>(() => {
  const alerts: OperationalAlert[] = [];

  if (openSalesCount.value > 0) {
    alerts.push({
      title: 'Comandas em aberto',
      message: `${openSalesCount.value} comanda(s) ainda dependem de fechamento financeiro.`,
      variant: 'warning'
    });
  }

  const lowStock = visibleCatalogOptions.value.filter(
    (option) => option.type === 'product' && option.onHandQuantity !== undefined && option.onHandQuantity <= 3
  );
  if (lowStock.length > 0) {
    alerts.push({
      title: 'Estoque crítico',
      message: `${lowStock.length} produto(s) exibem estoque baixo no catálogo da comanda.`,
      variant: 'info'
    });
  }

  if (approvedQuotesCount.value > 0) {
    alerts.push({
      title: 'Pipeline comercial pronto',
      message: `${approvedQuotesCount.value} orçamento(s) aprovados ainda podem virar comanda.`,
      variant: 'info'
    });
  }

  if (lowStockAlerts.value.length > 0) {
    alerts.push({
      title: 'Reposição prioritária',
      message: `${lowStockAlerts.value.length} SKU(s) vieram do dashboard executivo com sinal de baixa cobertura.`,
      variant: 'warning'
    });
  }

  return alerts;
});

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  loadingPage.value = true;
  error.value = '';
  integrationWarnings.value = [];

  try {
    const [
      salesResult,
      quotesResult,
      productsResult,
      servicesResult,
      inventoryResult,
      encountersResult,
      recordsResult
    ] = await Promise.allSettled([
      counterSalesService.list({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined
      }),
      quoteService.list(undefined, 'approved'),
      productsService.list(),
      servicesService.list(),
      inventoryService.list(),
      encounterService.list(),
      medicalRecordsService.listAll()
    ]);

    if (salesResult.status === 'fulfilled') {
      sales.value = [];
      await hydrateSales(salesResult.value);
    } else {
      throw salesResult.reason;
    }

    quotes.value = quotesResult.status === 'fulfilled' ? quotesResult.value : [];
    products.value = productsResult.status === 'fulfilled' ? productsResult.value : [];
    serviceCatalog.value = servicesResult.status === 'fulfilled' ? servicesResult.value : [];
    inventoryItems.value = inventoryResult.status === 'fulfilled' ? inventoryResult.value : [];
    encounters.value = encountersResult.status === 'fulfilled' ? encountersResult.value : [];
    medicalRecords.value = recordsResult.status === 'fulfilled' ? recordsResult.value : [];

    const warnings: string[] = [];
    if (quotesResult.status !== 'fulfilled') {
      warnings.push('Pipeline comercial indisponível; a comanda continua operando sem quotes.');
    }
    if (encountersResult.status !== 'fulfilled') {
      warnings.push('Contexto de atendimento indisponível; os atalhos assistenciais foram reduzidos.');
    }
    if (recordsResult.status !== 'fulfilled') {
      warnings.push('Prontuário não respondeu; o vínculo clínico está em visão parcial.');
    }
    integrationWarnings.value = warnings;

    await loadExecutiveDashboard();

    const contextualSale = workflowContext.ownerId
      ? sales.value.find((sale) => sale.ownerId === workflowContext.ownerId)
      : null;

    if (selectedSaleId.value) {
      await selectSale(selectedSaleId.value);
    } else if (contextualSale) {
      await selectSale(contextualSale.id);
    } else if (sales.value[0]) {
      await selectSale(sales.value[0].id);
    }
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Erro ao carregar comandas';
  } finally {
    loadingPage.value = false;
  }
}

async function loadExecutiveDashboard() {
  loadingDashboard.value = true;
  dashboardWarning.value = '';

  try {
    commercialDashboard.value = await counterSalesService.getCommercialDashboard({
      dateFrom: reportFilters.dateFrom || undefined,
      dateTo: reportFilters.dateTo || undefined
    });
  } catch (loadError) {
    commercialDashboard.value = null;
    dashboardWarning.value =
      loadError instanceof Error
        ? loadError.message
        : 'Não foi possível atualizar o relatório executivo de comandas.';
  } finally {
    loadingDashboard.value = false;
  }
}

async function hydrateSales(inputSales: Awaited<ReturnType<typeof counterSalesService.list>>) {
  const details = await Promise.all(inputSales.map((sale) => counterSalesService.getById(sale.id)));
  sales.value = details;

  const ownerIds = [...new Set(details.map((sale) => sale.ownerId).filter(Boolean))] as string[];
  await Promise.all(ownerIds.map(async (ownerId) => ensureOwnerLoaded(ownerId)));
}

async function ensureOwnerLoaded(ownerId: string) {
  if (ownerMap.value[ownerId]) {
    return;
  }

  const owner = await ownerService.getById(ownerId);
  ownerMap.value = {
    ...ownerMap.value,
    [ownerId]: owner
  };

  await ensurePatientsLoaded(ownerId);
}

async function ensurePatientsLoaded(ownerId: string) {
  if (patientMap.value[ownerId]) {
    return;
  }

  const response = await patientService.listPage({
    ownerId,
    page: 1,
    pageSize: 50
  });

  patientMap.value = {
    ...patientMap.value,
    [ownerId]: response.items ?? []
  };
}

async function selectSale(saleId: string) {
  selectedSaleId.value = saleId;
  const detail = await counterSalesService.getById(saleId);
  sales.value = sales.value.map((sale) => (sale.id === detail.id ? detail : sale));
  if (detail.ownerId) {
    await ensureOwnerLoaded(detail.ownerId);
  }
  paymentForm.amount = Math.max(detail.balanceDue, 0);
}

function ownerName(ownerId: string | null) {
  if (!ownerId) return 'Comanda sem tutor';
  return ownerMap.value[ownerId]?.fullName ?? `Tutor ${ownerId}`;
}

function ownerPrimaryContactLabel(ownerId: string | null) {
  if (!ownerId) return 'Sem contato';
  const owner = ownerMap.value[ownerId];
  const primary = owner?.contacts.find((contact) => contact.primary) ?? owner?.contacts[0];
  return primary ? `${primary.label}: ${primary.value}` : 'Sem contato principal';
}

function ownerPatientsLabel(ownerId: string | null) {
  if (!ownerId) return 'Sem vínculo animal';
  const patients = patientMap.value[ownerId] ?? [];
  if (patients.length === 0) return 'Sem animais cadastrados';
  if (patients.length === 1) return `1 animal: ${patients[0].name}`;
  return `${patients.length} animais vinculados`;
}

function ownerContactsSummary(ownerId: string | null) {
  if (!ownerId) return 'Sem contatos';
  const owner = ownerMap.value[ownerId];
  if (!owner || owner.contacts.length === 0) return 'Sem contatos';
  return owner.contacts.map((contact) => `${contact.label}: ${contact.value}`).join(' · ');
}

function saleItemsCountLabel(sale: CounterSaleDetail) {
  const products = sale.items.filter((item) => item.itemType === 'product').length;
  const services = sale.items.filter((item) => item.itemType === 'service').length;
  return `${products} produto(s) · ${services} serviço(s)`;
}

function saleItemsTotal(sale: CounterSaleDetail, type: CounterSaleItemSummary['itemType']) {
  return sale.items
    .filter((item) => item.itemType === type)
    .reduce((sum, item) => sum + item.lineTotal, 0);
}

function openedByLabel(userId: string) {
  return `Operador ${userId}`;
}

function accountLabel(accountId: string) {
  return `Empresa ${accountId}`;
}

function encounterBadgeLabel(context: SelectedPatientContext) {
  if (!context.encounter) return 'Sem atendimento';
  return encounterStatusLabel(context.encounter.status);
}

function medicalRecordBadgeLabel(context: SelectedPatientContext) {
  if (!context.medicalRecord) return 'Sem prontuário';
  return context.medicalRecord.record.status === 'open' ? 'Prontuário ativo' : 'Prontuário fechado';
}

function patientEncounterSubtitle(context: SelectedPatientContext) {
  if (!context.encounter) return 'Nenhum episódio clínico aberto';
  return `${encounterStatusLabel(context.encounter.status)} · ${formatDateTime(context.encounter.updatedAt)}`;
}

function patientMedicalRecordSubtitle(context: SelectedPatientContext) {
  if (!context.medicalRecord) return 'Abrirá junto com o atendimento';
  return `${context.medicalRecord.entryCount} entrada(s) · ${formatDateTime(context.medicalRecord.record.updatedAt)}`;
}

function patientEncounterLink(context: SelectedPatientContext) {
  if (context.encounter) {
    return `/encounters/${context.encounter.id}`;
  }
  return `/encounters/new?patientId=${encodeURIComponent(context.patient.id)}&ownerId=${encodeURIComponent(context.patient.primaryOwnerId)}`;
}

function patientEncounterActionLabel(context: SelectedPatientContext) {
  return context.encounter ? 'Atendimento' : 'Abrir atendimento';
}

function patientMedicalRecordLink(context: SelectedPatientContext) {
  if (context.encounter) {
    return `/medical-records/${context.encounter.id}`;
  }
  return `/encounters/new?patientId=${encodeURIComponent(context.patient.id)}&ownerId=${encodeURIComponent(context.patient.primaryOwnerId)}`;
}

function patientMedicalRecordActionLabel(context: SelectedPatientContext) {
  return context.medicalRecord ? 'Prontuário' : 'Abrir prontuário';
}

function encode(value: string) {
  return encodeURIComponent(value);
}

async function addCatalogOption(option: CatalogOption) {
  if (!selectedSale.value) return;

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.addItem(selectedSale.value.id, {
      itemType: option.type,
      catalogItemId: option.id,
      nameSnapshot: option.name,
      codeSnapshot: option.code,
      unitPrice: option.basePrice,
      quantity: catalogForm.quantity,
      discountAmount: catalogForm.discountAmount,
      notes: null
    });
    successMessage.value = `${option.name} adicionado à comanda ${selectedSale.value.number}.`;
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao adicionar item';
  } finally {
    savingItem.value = false;
  }
}

function focusCatalogType(type: Exclude<CatalogItemType, 'all'>) {
  catalogForm.itemType = type;
  catalogForm.search = '';
}

async function addItemByBarcode() {
  const option = barcodeMatchedOption.value;
  if (!option) {
    error.value = 'Código de barras não localizado no catálogo operacional.';
    return;
  }
  if (!selectedSale.value) return;

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.addItem(selectedSale.value.id, {
      itemType: option.type,
      catalogItemId: option.id,
      nameSnapshot: option.name,
      codeSnapshot: option.code,
      unitPrice: option.basePrice,
      quantity: barcodeForm.quantity > 0 ? barcodeForm.quantity : 1,
      discountAmount: 0,
      notes: 'Lançado por código de barras'
    });
    successMessage.value = `${option.name} lançado por código na comanda ${selectedSale.value.number}.`;
    barcodeForm.code = '';
    barcodeForm.quantity = 1;
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao lançar item por código';
  } finally {
    savingItem.value = false;
  }
}

async function changeItemQuantity(item: CounterSaleItemSummary, quantity: number) {
  if (!selectedSale.value || quantity < 1) return;

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.updateItem(selectedSale.value.id, item.id, {
      quantity
    });
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao atualizar item';
  } finally {
    savingItem.value = false;
  }
}

async function applyDefaultDiscount(item: CounterSaleItemSummary) {
  if (!selectedSale.value) return;

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.updateItem(selectedSale.value.id, item.id, {
      discountAmount: Math.round(item.unitPrice * 0.1 * 100) / 100
    });
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao aplicar desconto';
  } finally {
    savingItem.value = false;
  }
}

async function applySaleAdjustment(kind: 'expense' | 'discount') {
  if (!selectedSale.value) return;

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.addItem(selectedSale.value.id, {
      itemType: 'service',
      catalogItemId: null,
      nameSnapshot: kind === 'expense' ? 'Despesa extra' : 'Desconto operacional',
      codeSnapshot: kind === 'expense' ? 'AJUSTE-DESPESA' : 'AJUSTE-DESCONTO',
      unitPrice: kind === 'expense' ? 10 : 0,
      quantity: 1,
      discountAmount: kind === 'expense' ? 0 : 10,
      notes: kind === 'expense' ? 'Ajuste lançado pelo resumo da conta' : 'Desconto lançado pelo resumo da conta'
    });
    successMessage.value =
      kind === 'expense' ? 'Despesa extra incluída na comanda.' : 'Desconto incluído na comanda.';
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao lançar ajuste na comanda';
  } finally {
    savingItem.value = false;
  }
}

async function removeItem(itemId: string) {
  if (!selectedSale.value) return;

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.removeItem(selectedSale.value.id, itemId);
    successMessage.value = 'Item removido da comanda.';
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao remover item';
  } finally {
    savingItem.value = false;
  }
}

async function submitPayment() {
  if (!selectedSale.value || selectedSale.value.status !== 'open') return;

  savingPayment.value = true;
  error.value = '';
  try {
    await counterSalesService.addPayment(selectedSale.value.id, {
      method: paymentForm.method,
      amount: paymentForm.amount,
      installments: paymentForm.installments,
      reference: paymentForm.reference || null,
      notes: paymentForm.notes || null
    });
    successMessage.value = 'Pagamento registrado com sucesso.';
    paymentForm.reference = '';
    paymentForm.notes = '';
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao registrar pagamento';
  } finally {
    savingPayment.value = false;
  }
}

async function closeSale() {
  if (!selectedSale.value) return;
  transitioningSale.value = true;
  error.value = '';
  try {
    await counterSalesService.close(selectedSale.value.id);
    successMessage.value = `Comanda ${selectedSale.value.number} finalizada.`;
    await loadPage();
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao fechar comanda';
  } finally {
    transitioningSale.value = false;
  }
}

async function cancelSale() {
  if (!selectedSale.value) return;
  transitioningSale.value = true;
  error.value = '';
  try {
    await counterSalesService.cancel(selectedSale.value.id);
    successMessage.value = `Comanda ${selectedSale.value.number} cancelada.`;
    await loadPage();
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao cancelar comanda';
  } finally {
    transitioningSale.value = false;
  }
}

async function reopenSale() {
  if (!selectedSale.value) return;
  transitioningSale.value = true;
  error.value = '';
  try {
    await counterSalesService.reopen(selectedSale.value.id);
    successMessage.value = `Comanda ${selectedSale.value.number} reaberta.`;
    await loadPage();
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao reabrir comanda';
  } finally {
    transitioningSale.value = false;
  }
}

async function convertQuote(quoteId: string) {
  try {
    const conversion = await quoteService.convertToSale(quoteId);
    successMessage.value = `Orçamento convertido em comanda ${conversion.counterSaleId}.`;
    await loadPage();
    await selectSale(conversion.counterSaleId);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao converter orçamento';
  }
}

function openCreateModal() {
  createModalOpen.value = true;
  createModalTab.value = 'registered';
  ownerSearch.value = workflowContext.ownerId || '';
  createSaleNotes.value = '';
  selectedOwnerId.value = '';
  expandedOwnerId.value = '';
  modalPage.value = 1;
  modalTotalPages.value = 1;
  resetNewOwnerDraft();
  void loadModalOwners(1);
}

function closeCreateModal() {
  createModalOpen.value = false;
  expandedOwnerId.value = '';
}

function resetNewOwnerDraft() {
  newOwnerDraft.fullName = '';
  newOwnerDraft.documentId = '';
  newOwnerDraft.email = '';
  newOwnerDraft.whatsapp = '';
  newOwnerDraft.phone = '';
}

function toggleOwnerDetails(ownerId: string) {
  expandedOwnerId.value = expandedOwnerId.value === ownerId ? '' : ownerId;
}

async function loadModalOwners(page = modalPage.value) {
  ownersLoading.value = true;
  try {
    const response = await ownerService.listPage({
      search: ownerSearch.value.trim() || undefined,
      page,
      pageSize: 8,
      status: 'active'
    });
    modalPage.value = page;
    modalTotalPages.value = response.totalPages ?? 1;
    modalOwners.value = response.items ?? [];
    selectedOwnerId.value = modalOwners.value[0]?.id ?? '';
    expandedOwnerId.value = '';
    for (const owner of modalOwners.value) {
      ownerMap.value = {
        ...ownerMap.value,
        [owner.id]: owner
      };
      await ensurePatientsLoaded(owner.id);
    }
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Erro ao buscar clientes';
  } finally {
    ownersLoading.value = false;
  }
}

async function createSaleForSelectedOwner() {
  if (!selectedOwnerId.value) return;

  creatingSale.value = true;
  try {
    const sale = await counterSalesService.create({
      ownerId: selectedOwnerId.value,
      notes: createSaleNotes.value || null
    });
    successMessage.value = `Comanda ${sale.number} aberta com sucesso.`;
    createModalOpen.value = false;
    await loadPage();
    await selectSale(sale.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao abrir comanda';
  } finally {
    creatingSale.value = false;
  }
}

async function createOwnerAndSale() {
  if (!newOwnerDraft.fullName.trim()) {
    error.value = 'Nome completo é obrigatório para abrir a comanda.';
    return;
  }

  creatingSale.value = true;
  try {
    const contacts: CreateOwnerRequest['contacts'] = [];

    const appendContact = (contact: CreateOwnerRequest['contacts'][number]) => {
      contacts.push(contact);
    };

    if (newOwnerDraft.whatsapp) {
      appendContact({
        label: 'WhatsApp',
        value: newOwnerDraft.whatsapp,
        type: 'whatsapp',
        primary: true
      });
    }

    if (newOwnerDraft.phone) {
      appendContact({
        label: 'Telefone',
        value: newOwnerDraft.phone,
        type: 'phone'
      });
    }

    if (newOwnerDraft.email) {
      appendContact({
        label: 'E-mail',
        value: newOwnerDraft.email,
        type: 'email'
      });
    }

    const owner = await ownerService.create({
      fullName: newOwnerDraft.fullName.trim(),
      documentId: newOwnerDraft.documentId || undefined,
      contacts,
      financialResponsible: true
    });
    ownerMap.value = {
      ...ownerMap.value,
      [owner.id]: owner
    };

    const sale = await counterSalesService.create({
      ownerId: owner.id,
      notes: createSaleNotes.value || null
    });
    successMessage.value = `Cliente e comanda ${sale.number} criados com sucesso.`;
    createModalOpen.value = false;
    await loadPage();
    await selectSale(sale.id);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao criar cliente e comanda';
  } finally {
    creatingSale.value = false;
  }
}

async function printSelectedSale() {
  if (!selectedSale.value || typeof window === 'undefined') return;

  printingSale.value = true;
  error.value = '';
  try {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=780');
    if (!printWindow) {
      throw new Error('Não foi possível abrir a janela de impressão.');
    }

    const html = buildOperationalPrintHtml(
      selectedSale.value,
      selectedOwner.value,
      selectedPatientContexts.value
    );
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    successMessage.value = `Impressão operacional preparada para a comanda ${selectedSale.value.number}.`;
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao preparar impressão da comanda';
  } finally {
    printingSale.value = false;
  }
}

function buildOperationalPrintHtml(
  sale: CounterSaleDetail,
  owner: OwnerSummary | null,
  patientContexts: readonly SelectedPatientContext[]
) {
  const ownerContact = owner
    ? owner.contacts.find((contact) => contact.primary) ?? owner.contacts[0] ?? null
    : null;
  const patientLines = patientContexts
    .map((context) => {
      const encounterLabel = context.encounter
        ? `${encounterStatusLabel(context.encounter.status)} (${context.encounter.id})`
        : 'Sem atendimento ativo';
      const recordLabel = context.medicalRecord
        ? `${context.medicalRecord.entryCount} entrada(s)`
        : 'Sem prontuário carregado';
      return `
        <tr>
          <td>${escapeHtml(context.patient.name)}</td>
          <td>${escapeHtml(context.patient.species)}${context.patient.breed ? ` · ${escapeHtml(context.patient.breed)}` : ''}</td>
          <td>${escapeHtml(encounterLabel)}</td>
          <td>${escapeHtml(recordLabel)}</td>
        </tr>
      `;
    })
    .join('');

  const itemLines = sale.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.nameSnapshot)}</td>
          <td>${escapeHtml(item.itemType === 'product' ? 'Produto' : 'Serviço')}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.discountAmount)}</td>
          <td>${formatCurrency(item.lineTotal)}</td>
        </tr>
      `
    )
    .join('');

  const paymentLines = sale.payments
    .map(
      (payment) => `
        <tr>
          <td>${escapeHtml(paymentMethodLabel(payment.method))}</td>
          <td>${payment.installments}x</td>
          <td>${escapeHtml(payment.reference ?? '—')}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${escapeHtml(formatDateTime(payment.createdAt))}</td>
        </tr>
      `
    )
    .join('');

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Impressão operacional ${escapeHtml(sale.number)}</title>
      <style>
        body { font-family: "Segoe UI", sans-serif; color: #0f172a; margin: 24px; }
        h1, h2, h3 { margin: 0; }
        .header, .block { margin-bottom: 24px; }
        .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
        .headline { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
        .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
        .metric { border: 1px solid #d7dee8; border-radius: 14px; padding: 12px; background: #f8fafc; }
        .metric strong { display: block; margin-top: 6px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 10px 8px; font-size: 13px; }
        th { color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; }
        .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #e2e8f0; font-size: 12px; font-weight: 700; }
        .note { margin-top: 12px; color: #475569; font-size: 13px; }
        @media print {
          body { margin: 12px; }
        }
      </style>
    </head>
    <body>
      <section class="header">
        <div>
          <div class="headline">Comandas premium enterprise</div>
          <h1>${escapeHtml(sale.number)}</h1>
          <p class="note">Impressão operacional gerada em ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
        </div>
        <div>
          <div class="badge">${escapeHtml(statusLabel(sale.status))}</div>
          <p class="note">Abertura ${escapeHtml(formatDateTime(sale.createdAt))}</p>
        </div>
      </section>

      <section class="block">
        <div class="headline">Cliente e contexto</div>
        <h2>${escapeHtml(owner?.fullName ?? 'Comanda sem tutor')}</h2>
        <p class="note">
          ${escapeHtml(ownerContact ? `${ownerContact.label}: ${ownerContact.value}` : 'Sem contato principal')}
          · ID ${escapeHtml(sale.id)}
        </p>
        <div class="grid">
          <div class="metric"><span>Subtotal</span><strong>${formatCurrency(sale.subtotal)}</strong></div>
          <div class="metric"><span>Desconto</span><strong>${formatCurrency(sale.discountAmount)}</strong></div>
          <div class="metric"><span>Pago</span><strong>${formatCurrency(sale.paidAmount)}</strong></div>
          <div class="metric"><span>Saldo</span><strong>${formatCurrency(sale.balanceDue)}</strong></div>
        </div>
      </section>

      <section class="block">
        <div class="headline">Vínculo assistencial por animal</div>
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Espécie</th>
              <th>Atendimento</th>
              <th>Prontuário</th>
            </tr>
          </thead>
          <tbody>${patientLines || '<tr><td colspan="4">Sem animais vinculados.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="block">
        <div class="headline">Itens da comanda</div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Unitário</th>
              <th>Desconto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${itemLines || '<tr><td colspan="6">Sem itens lançados.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="block">
        <div class="headline">Pagamentos</div>
        <table>
          <thead>
            <tr>
              <th>Método</th>
              <th>Parcelas</th>
              <th>Referência</th>
              <th>Valor</th>
              <th>Momento</th>
            </tr>
          </thead>
          <tbody>${paymentLines || '<tr><td colspan="5">Sem pagamentos lançados.</td></tr>'}</tbody>
        </table>
      </section>

      ${sale.notes ? `<p class="note"><strong>Observação:</strong> ${escapeHtml(sale.notes)}</p>` : ''}
    </body>
  </html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function encounterStatusLabel(status: EncounterSummary['status']): string {
  return {
    reception: 'Na recepção',
    in_triage: 'Em triagem',
    in_care: 'Em atendimento',
    observation: 'Em observação',
    closed: 'Encerrado'
  }[status];
}

function statusLabel(status: CounterSaleStatus): string {
  return {
    open: 'Aberta',
    closed: 'Fechada',
    cancelled: 'Cancelada'
  }[status];
}

function statusBadgeVariant(status: CounterSaleStatus): 'warning' | 'success' | 'danger' {
  if (status === 'open') return 'warning';
  if (status === 'closed') return 'success';
  return 'danger';
}

function paymentMethodLabel(method: CounterSalePaymentMethod | string): string {
  return {
    cash: 'Dinheiro',
    credit_card: 'Cartão crédito',
    debit_card: 'Cartão débito',
    pix: 'PIX',
    bank_transfer: 'Transferência',
    check: 'Cheque',
    insurance: 'Convênio',
    other: 'Outro'
  }[method as CounterSalePaymentMethod] ?? method;
}

function paymentMethodShare(total: number): string {
  if (paymentMixTotal.value <= 0) return '0%';
  return formatPercent((total / paymentMixTotal.value) * 100);
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function normalizeCatalogCode(value: string) {
  return value.trim().toLowerCase();
}

function readWorkflowContext() {
  if (typeof window === 'undefined') {
    return { encounterId: '', patientId: '', ownerId: '' };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    encounterId: params.get('encounterId')?.trim() || '',
    patientId: params.get('patientId')?.trim() || '',
    ownerId: params.get('ownerId')?.trim() || ''
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}
</script>

<style scoped>
.counter-sales-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.counter-sales-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.counter-sales-alerts,
.counter-sales-actions,
.counter-sales-toolbar,
.counter-sales-report {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.counter-sales-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px 180px 180px max-content;
  gap: 12px;
}

.counter-sales-report__summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  font-weight: 700;
}

.counter-sales-report__summary small {
  color: var(--color-text-muted, #64748b);
  font-weight: 500;
}

.counter-sales-toolbar__actions {
  display: flex;
  align-items: end;
}

.counter-sales-context {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #bfdbfe;
  border-left: 4px solid #2563eb;
  border-radius: 8px;
  background: #eff6ff;
}

.counter-sales-context__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.counter-sales-context h2 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
}

.counter-sales-context p {
  margin: 4px 0 0;
  color: #475569;
  font-size: 13px;
}

.counter-sales-context__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.report-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 180px)) max-content;
  gap: 12px;
  align-items: end;
}

.executive-report,
.risk-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.executive-report__grid,
.leaderboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.report-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(215, 222, 232, 0.85);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(244, 248, 252, 0.96)),
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.08), transparent 38%);
}

.report-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.report-panel__header h3 {
  margin: 4px 0 0;
}

.report-panel__hint,
.rank-list__meta,
.summary-card__hint,
.counter-sales-empty {
  color: var(--color-text-muted, #64748b);
}

.leaderboard-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaderboard-block__title {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rank-list__item,
.inline-alert {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.alert-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inline-alert {
  align-items: flex-start;
  flex-direction: column;
}

.counter-sales-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.counter-sales-cards,
.item-list,
.payment-list,
.quote-list,
.catalog-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.counter-sale-card,
.catalog-card,
.line-item-card,
.patient-context-card,
.payment-card,
.quote-card,
.modal-owner-card {
  border: 1px solid var(--color-border, #d7dee8);
  border-radius: 18px;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 248, 252, 0.95)),
    radial-gradient(circle at top right, rgba(241, 144, 42, 0.08), transparent 42%);
}

.counter-sale-card--selected {
  border-color: rgba(241, 144, 42, 0.65);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
}

.counter-sale-card__header {
  display: grid;
  grid-template-columns: 110px minmax(120px, 0.85fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(180px, 1.35fr) minmax(130px, 0.8fr) max-content;
  align-items: center;
}

.counter-sale-card__field {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.counter-sale-card__field span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.counter-sale-card__field strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  color: var(--color-text, #0f172a);
}

.counter-sale-card__field--total strong {
  font-weight: 800;
}

.counter-sale-card__mobile-context {
  display: none;
}

.catalog-card__header,
.line-item-card__header,
.payment-card__header,
.quote-card__header,
.modal-owner-card__header,
.sidebar-summary__header,
.workbench-section__header,
.patient-context-card__summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.counter-sale-card__header h3,
.catalog-card__header h4,
.workbench-section__header h3,
.sidebar-summary__header h3 {
  margin: 4px 0 0;
}

.counter-sale-card__eyebrow,
.workbench-section__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.counter-sale-card__meta,
.catalog-card__meta,
.line-item-card__meta,
.payment-card__meta,
.quote-card__meta,
.modal-owner-card__meta,
.sidebar-owner__meta,
.patient-context-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.counter-sale-card__grid,
.sidebar-summary__grid,
.summary-grid,
.item-total-grid,
.patient-context-grid,
.create-sale-modal__new-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.summary-card__label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  font-size: 18px;
}

.counter-sale-card__notes,
.catalog-card__hint,
.counter-sale-observations {
  margin: 0;
  color: var(--color-text-muted, #64748b);
}

.counter-sale-card__details,
.sidebar-contact {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
}

.counter-sale-card__details summary,
.sidebar-contact summary {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.counter-sale-card__details-grid {
  display: grid;
  gap: 6px;
  padding: 0 12px 12px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.sidebar-contact p {
  margin: 0;
  padding: 0 12px 12px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.counter-sale-card__actions,
.line-item-card__controls,
.sidebar-actions,
.sidebar-owner__actions,
.patient-context-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workbench-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.workbench-main,
.workbench-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.workbench-section,
.workbench-sidebar__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workbench-section__hint {
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 700;
}

.patient-context-card,
.patient-context-card__journey,
.timeline-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-patient-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-patient-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.service-patient-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.patient-context-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.patient-context-card__journey {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.barcode-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px max-content;
  gap: 12px;
  align-items: end;
}

.barcode-match {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(15, 118, 110, 0.32);
  background: rgba(240, 253, 250, 0.9);
  color: #115e59;
}

.journey-pill {
  padding: 12px;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.timeline-card {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-left: 4px solid rgba(14, 165, 233, 0.7);
  border-radius: 14px;
  background: rgba(240, 249, 255, 0.76);
}

.timeline-card span {
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.catalog-toolbar,
.create-sale-modal__search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px 140px 140px;
  gap: 12px;
  align-items: end;
}

.line-item-card__controls {
  align-items: center;
}

.line-item-card__quantity {
  min-width: 32px;
  text-align: center;
  font-weight: 700;
}

.line-item-card__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.sidebar-summary,
.sidebar-owner,
.payment-form,
.create-sale-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.create-sale-modal__tabs {
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: var(--color-bg-subtle, #eef2f7);
}

.create-sale-modal__tab {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  background: transparent;
  font-weight: 700;
  cursor: pointer;
}

.create-sale-modal__tab--active {
  background: #ffffff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.modal-owner-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-owner-card {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-owner-card__actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-start;
}

.modal-owner-card__details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.detail-pill {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.modal-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.modal-owner-card--selected {
  border-color: rgba(15, 118, 110, 0.5);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.command-bottom-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(226, 232, 240, 0.92);
}

@media (max-width: 1100px) {
  .workbench-shell {
    grid-template-columns: 1fr;
  }

  .counter-sale-card__header {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .counter-sale-card__mobile-context {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    color: var(--color-text-muted, #64748b);
    font-size: 13px;
  }
}

@media (max-width: 720px) {
  .counter-sales-toolbar,
  .catalog-toolbar,
  .barcode-toolbar,
  .create-sale-modal__search,
  .report-toolbar {
    grid-template-columns: 1fr;
  }

  .service-patient-card,
  .counter-sales-context,
  .command-bottom-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .service-patient-card__actions {
    justify-content: flex-start;
  }

  .counter-sales-context__actions {
    justify-content: flex-start;
  }
}
</style>
