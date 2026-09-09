<template>
  <div class="access-control-page">
    <AppPageHeader
      :breadcrumbs="['Console Enterprise', 'Governança', 'Governança de Acesso']"
      title="Grupos de Acesso"
      subtitle="Políticas coletivas de autorização, rotinas e permissões efetivas"
    >
      <template #actions>
        <DsBadge variant="info" size="md"
          >{{ displayAccessCount(catalog?.permissions.length) }} permissões</DsBadge
        >
        <DsBadge variant="info" size="md">{{ displayAccessCount(catalog?.users.length) }} usuários</DsBadge>
        <DsButton
          type="button"
          variant="secondary"
          :loading="loading"
          aria-label="Atualizar catálogo de governança de acesso"
          @click="reload"
        >
          Atualizar
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info" title="Escopo desta tela">
      Aqui você consulta o catálogo atual e altera somente grupos, setores, vínculos de usuários e
      grants expostos pela API de controle de acesso. MFA, sessões, chaves de API e auditoria são
      apenas referências de governança; não são editáveis nesta tela.
    </DsAlert>

    <section class="access-control-page__overview">
      <div class="overview-grid">
        <div class="overview-card">
          <span class="overview-card__value">{{ displayAccessCount(catalog?.roles.length) }}</span>
          <span class="overview-card__label">Roles legadas</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ displayAccessCount(catalog?.permissions.length) }}</span>
          <span class="overview-card__label">Permissões ativas</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ displayAccessCount(routineRows.length) }}</span>
          <span class="overview-card__label">Rotinas mapeadas</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ displayAccessCount(catalog?.teams.length) }}</span>
          <span class="overview-card__label">Grupos de Acesso</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ displayAccessCount(catalog?.sectors.length) }}</span>
          <span class="overview-card__label">Setores</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ displayAccessCount(catalog?.users.length) }}</span>
          <span class="overview-card__label">Usuários</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ displayAccessCount(assignmentCount) }}</span>
          <span class="overview-card__label">Grants diretos</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value"
            >{{ accessDenied ? '—' : `${enterpriseMatrixCompleteCount}/${enterpriseMatrixRows.length}` }}</span
          >
          <span class="overview-card__label">Módulos RBAC completos</span>
        </div>
      </div>
    </section>

    <div
      v-if="catalog && !accessDenied"
      class="access-control-page__segments"
      role="tablist"
      aria-label="Seções de governança"
    >
      <DsButton
        v-for="tab in tabs"
        :key="tab.value"
        :id="`access-tab-${tab.value}`"
        type="button"
        :variant="activeTab === tab.value ? 'primary' : 'secondary'"
        role="tab"
        :aria-selected="activeTab === tab.value"
        :aria-controls="`access-panel-${tab.value}`"
        :tabindex="activeTab === tab.value ? 0 : -1"
        size="sm"
        @keydown="handleTabKey($event, tab.value)"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </DsButton>
    </div>

    <DsAlert
      v-if="error"
      ref="errorAlert"
      variant="danger"
      title="Não foi possível concluir esta operação"
      :dismissible="!accessDenied"
      tabindex="-1"
      @dismiss="clearError"
    >
      <strong v-if="accessDenied">Sem permissão para governança de acesso.</strong>
      {{ error }}
      <DsButton
        v-if="accessDenied"
        type="button"
        variant="secondary"
        size="sm"
        aria-label="Tentar novamente o carregamento de governança de acesso"
        @click="reload"
      >
        Tentar novamente
      </DsButton>
    </DsAlert>
    <DsAlert
      v-if="successMessage"
      variant="success"
      title="Alteração concluída"
      dismissible
      @dismiss="successMessage = ''"
    >
      {{ successMessage }}
    </DsAlert>

    <section
      v-if="!loading && catalog && activeTab === 'summary'"
      id="access-panel-summary"
      role="tabpanel"
      aria-labelledby="access-tab-summary"
      class="access-control-page__section"
    >
      <DsCard title="Mapa Vetus IAM" title-tag="h2" class="panel">
        <div class="governance-grid">
          <article v-for="layer in governanceLayers" :key="layer.title" class="governance-card">
            <span class="governance-card__eyebrow">{{ layer.scope }}</span>
            <strong>{{ layer.title }}</strong>
            <p>{{ layer.description }}</p>
          </article>
        </div>
      </DsCard>

      <DsCard title="Permissão por rotina" title-tag="h2" class="panel">
        <div class="routine-grid">
          <article v-for="control in securityControls" :key="control.title" class="routine-card">
            <strong>{{ control.title }}</strong>
            <p>{{ control.description }}</p>
          </article>
        </div>
      </DsCard>

      <DsCard title="Matriz enterprise por módulo, perfil e unidade" title-tag="h2" class="panel">
        <p class="section-hint">
          Evidência F3-01: cobertura de ações por módulo, perfis que concedem acesso e overrides por
          equipe/setor/usuário.
        </p>
        <div class="module-grid">
          <article v-for="entry in enterpriseMatrixRows" :key="entry.module" class="module-card">
            <div class="module-card__header">
              <div>
                <strong>{{ entry.module.toUpperCase() }}</strong>
                <p>
                  {{ entry.permissionCodes.length }} permissões ·
                  {{ entry.rolesAllowed.length }} perfil(is)
                </p>
              </div>
              <DsBadge
                :variant="
                  entry.coverageStatus === 'complete'
                    ? 'success'
                    : entry.coverageStatus === 'partial'
                      ? 'warning'
                      : 'info'
                "
                size="sm"
              >
                {{ coverageLabel(entry.coverageStatus) }}
              </DsBadge>
            </div>
            <div class="action-chip-list">
              <span
                v-for="action in enterpriseActions"
                :key="`${entry.module}:${action.key}`"
                :class="['action-chip', { 'action-chip--on': entry.actions[action.key] }]"
                :aria-label="`${action.label}: ${entry.actions[action.key] ? 'Sim' : 'Não'}`"
              >
                <span>{{ action.label }}</span>
                <strong>{{ entry.actions[action.key] ? 'Sim' : 'Não' }}</strong>
              </span>
            </div>
            <p class="muted">
              Overrides: {{ entry.teamOverrideCount }} equipe(s),
              {{ entry.sectorOverrideCount }} setor(es), {{ entry.userOverrideCount }} usuário(s)
            </p>
          </article>
        </div>
      </DsCard>

      <DsCard title="Catálogo de permissões" title-tag="h2" class="panel">
        <div class="panel__toolbar">
          <DsInput
            v-model="permissionQuery"
            id="access-permission-filter"
            label="Filtrar catálogo de permissões"
            hint="Busca por código, módulo ou descrição. Não altera permissões."
            placeholder="Filtrar permissões por código, módulo ou descrição"
          />
        </div>
        <div class="module-grid">
          <article
            v-for="group in filteredPermissionGroups"
            :key="group.module"
            class="module-card"
          >
            <div class="module-card__header">
              <div>
                <strong>{{ group.moduleLabel }}</strong>
                <p>{{ group.items.length }} permissões</p>
              </div>
              <DsBadge variant="info" size="sm">{{ group.items.length }}</DsBadge>
            </div>
            <ul class="permission-sample">
              <li v-for="permission in group.items.slice(0, 5)" :key="permission.code">
                <code>{{ permission.code }}</code>
                <span>{{ permission.description }}</span>
              </li>
            </ul>
          </article>
        </div>
      </DsCard>

      <DsCard title="Roles legadas" title-tag="h2" class="panel">
        <div class="role-grid">
          <article v-for="role in catalog.roles" :key="role.id" class="role-card">
            <div class="role-card__header">
              <div>
                <strong>{{ role.name }}</strong>
                <p>{{ role.code }}</p>
              </div>
              <DsBadge variant="info" size="sm">{{ role.permissionCodes.length }}</DsBadge>
            </div>
            <p class="role-card__description">{{ role.description }}</p>
          </article>
        </div>
        <div class="matrix-wrapper" tabindex="0" role="region" aria-label="Matriz de roles legadas">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Permissão</th>
                <th v-for="role in catalog.roles" :key="role.id">{{ role.code }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="permission in filteredPermissions" :key="permission.code">
                <td>
                  <strong>{{ permission.code }}</strong>
                  <div class="muted">{{ permission.description }}</div>
                </td>
                <td
                  v-for="role in catalog.roles"
                  :key="`${role.id}:${permission.code}`"
                  class="matrix-table__cell"
                >
                  {{ role.permissionCodes.includes(permission.code) ? '✅' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DsCard>

      <DsCard title="Governança avançada" title-tag="h2" class="panel">
        <div class="enterprise-grid">
          <div>
            <strong>RH operacional</strong>
            <p>
              Usuários, profissionais e grupos de acesso ficam descobríveis para o dia a dia
              administrativo.
            </p>
          </div>
          <div>
            <strong>Console Enterprise</strong>
            <p>MFA, auditoria, sessões, API keys e compliance mantêm a camada técnica separada.</p>
          </div>
          <div>
            <strong>Tenant e auditoria</strong>
            <p>
              Cada decisão de acesso deve ser isolada por organização e rastreável por usuário,
              entidade e ação.
            </p>
          </div>
        </div>
      </DsCard>
    </section>

    <section
      v-else-if="!loading && catalog && activeTab === 'users'"
      id="access-panel-users"
      role="tabpanel"
      aria-labelledby="access-tab-users"
      class="access-control-page__section"
    >
      <DsAlert variant="info" title="O que pode ser alterado">
        Selecione um usuário para consultar suas permissões efetivas e salvar vínculos de roles,
        equipes e setores. A lista de permissões efetivas é calculada pela API e não é editada
        diretamente aqui.
      </DsAlert>
      <div class="subject-toolbar">
        <label class="field">
          <span>Usuário</span>
          <select
            id="access-user-select"
            v-model="selectedUserId"
            aria-describedby="access-user-select-hint"
          >
            <option v-for="user in catalog.users" :key="user.id" :value="user.id">
              {{ user.displayName }} - {{ user.roleCode }}
            </option>
          </select>
          <small id="access-user-select-hint"
            >Trocar o usuário recarrega o efetivo e seus vínculos.</small
          >
        </label>
        <DsButton
          type="button"
          variant="secondary"
          :loading="userSaving"
          aria-label="Atualizar permissões efetivas do usuário selecionado"
          @click="reloadUserEffective"
          >Atualizar efetivo</DsButton
        >
      </div>

      <div v-if="selectedUser" class="user-layout">
        <DsCard title="Perfil e herança" title-tag="h2" class="panel">
          <div class="profile-card">
            <strong>{{ selectedUser.displayName }}</strong>
            <p>{{ selectedUser.email }}</p>
            <div class="profile-tags">
              <DsBadge variant="info" size="sm">{{ selectedUser.username }}</DsBadge>
              <DsBadge
                :variant="selectedUser.status === 'active' ? 'success' : 'neutral'"
                size="sm"
              >
                {{ selectedUser.status }}
              </DsBadge>
              <DsBadge variant="warning" size="sm">{{ selectedUser.roleCode }}</DsBadge>
            </div>
          </div>

          <div class="identity-grid" aria-label="Governança da identidade">
            <div v-for="item in selectedUserGovernance" :key="item.label" class="identity-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.hint }}</p>
            </div>
          </div>

          <form class="membership-form" @submit.prevent="saveUserMemberships">
            <div class="membership-grid">
              <fieldset class="membership-panel">
                <legend>Roles legadas</legend>
                <div class="checklist">
                  <div v-for="role in catalog.roles" :key="role.id" class="checklist__item">
                    <input
                      :id="`access-user-role-${role.id}`"
                      v-model="draftRoleCodes"
                      type="checkbox"
                      :value="role.code"
                    />
                    <label :for="`access-user-role-${role.id}`">{{ role.name }}</label>
                  </div>
                </div>
              </fieldset>

              <fieldset class="membership-panel">
                <legend>Equipes</legend>
                <div class="checklist">
                  <div v-for="team in catalog.teams" :key="team.id" class="checklist__item">
                    <input
                      :id="`access-user-team-${team.id}`"
                      v-model="draftTeamIds"
                      type="checkbox"
                      :value="team.id"
                    />
                    <label :for="`access-user-team-${team.id}`">{{ team.name }}</label>
                  </div>
                </div>
              </fieldset>

              <fieldset class="membership-panel">
                <legend>Setores</legend>
                <div class="checklist">
                  <div v-for="sector in catalog.sectors" :key="sector.id" class="checklist__item">
                    <input
                      :id="`access-user-sector-${sector.id}`"
                      v-model="draftSectorIds"
                      type="checkbox"
                      :value="sector.id"
                    />
                    <label :for="`access-user-sector-${sector.id}`">{{ sector.name }}</label>
                  </div>
                </div>
              </fieldset>
            </div>

            <div class="actions-row">
              <DsButton type="submit" :loading="userSaving">Salvar vínculos do usuário</DsButton>
            </div>
          </form>
        </DsCard>

        <DsCard title="Permissões efetivas" title-tag="h2" class="panel">
          <div class="matrix-wrapper" tabindex="0" role="region" aria-label="Tabela de permissões efetivas">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>Permissão</th>
                  <th>Efetivo</th>
                  <th>Direto</th>
                  <th>Origens</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="permission in effectivePermissions" :key="permission.permissionCode">
                  <td>
                    <strong>{{ permission.permissionCode }}</strong>
                    <div class="muted">{{ permission.description }}</div>
                  </td>
                  <td>
                    <DsBadge :variant="permission.effective ? 'success' : 'neutral'" size="sm">
                      {{ permission.effective ? 'Permitido' : 'Negado' }}
                    </DsBadge>
                  </td>
                  <td>{{ permission.direct ? 'Sim' : 'Não' }}</td>
                  <td>
                    <div class="source-list">
                      <span
                        v-for="source in permission.sources"
                        :key="`${source.kind}:${source.sourceId}`"
                        class="source-chip"
                      >
                        {{ source.sourceCode }} · {{ source.effect }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </DsCard>
      </div>
    </section>

    <section
      v-else-if="!loading && catalog && activeTab === 'teams'"
      id="access-panel-teams"
      role="tabpanel"
      aria-labelledby="access-tab-teams"
      class="access-control-page__section"
    >
      <div class="creation-grid">
        <DsCard
          :title="editingTeamId ? 'Editar grupo de acesso' : 'Novo grupo de acesso'"
          title-tag="h2"
          class="panel"
        >
          <form class="entity-form" @submit.prevent="saveTeam">
            <p class="section-hint">
              {{
                editingTeamId
                  ? 'Edite o grupo selecionado e confirme para persistir.'
                  : 'Crie um grupo reutilizável para vincular usuários.'
              }}
              Alterações afetam apenas este grupo de acesso.
            </p>
            <div class="form-grid">
              <DsInput
                id="access-team-code"
                v-model="teamForm.code"
                label="Código do grupo de acesso"
                hint="Identificador técnico; não concede acesso sozinho."
                placeholder="grupo_cirurgico"
                required
                :disabled="teamSaving"
              />
              <DsInput
                id="access-team-name"
                v-model="teamForm.name"
                label="Nome do grupo de acesso"
                hint="Nome exibido para quem administra vínculos."
                placeholder="Grupo Cirúrgico"
                required
                :disabled="teamSaving"
              />
              <DsInput
                id="access-team-description"
                v-model="teamForm.description"
                label="Descrição do alcance"
                hint="Explique a finalidade; permissões são atribuídas separadamente na matriz."
                placeholder="Política coletiva de acesso"
                :disabled="teamSaving"
              />
            </div>
            <div class="actions-row">
              <DsButton type="submit" :loading="teamSaving">
                {{ editingTeamId ? 'Salvar alterações do grupo' : 'Criar grupo de acesso' }}
              </DsButton>
              <DsButton
                v-if="editingTeamId"
                type="button"
                variant="secondary"
                :disabled="teamSaving"
                aria-label="Cancelar edição do grupo de acesso"
                @click="resetTeamForm"
              >
                Cancelar edição
              </DsButton>
            </div>
          </form>
        </DsCard>

        <DsCard title="Grupos de acesso cadastrados" title-tag="h2" class="panel">
          <div class="entity-list">
            <article v-for="team in catalog.teams" :key="team.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <strong>{{ team.name }}</strong>
                  <p>{{ team.code }}</p>
                </div>
                <DsBadge :variant="team.status === 'active' ? 'success' : 'warning'" size="sm">
                  {{ team.status }}
                </DsBadge>
              </div>
              <p>{{ team.description || 'Sem descrição' }}</p>
              <div class="actions-row entity-card__actions">
                <DsButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  :aria-label="`Editar ${team.name}`"
                  @click="beginEditTeam(team)"
                >
                  Editar
                </DsButton>
                <DsButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  :aria-label="`${team.status === 'active' ? 'Desativar' : 'Ativar'} ${team.name}`"
                  @click="toggleTeam(team)"
                >
                  {{ team.status === 'active' ? 'Desativar' : 'Ativar' }}
                </DsButton>
              </div>
            </article>
          </div>
        </DsCard>
      </div>
    </section>

    <section
      v-else-if="!loading && catalog && activeTab === 'sectors'"
      id="access-panel-sectors"
      role="tabpanel"
      aria-labelledby="access-tab-sectors"
      class="access-control-page__section"
    >
      <div class="creation-grid">
        <DsCard :title="editingSectorId ? 'Editar setor' : 'Novo setor'" title-tag="h2" class="panel">
          <form class="entity-form" @submit.prevent="saveSector">
            <p class="section-hint">
              {{
                editingSectorId
                  ? 'Edite o setor selecionado e confirme para persistir.'
                  : 'Cadastre um setor organizacional para vínculos de usuários.'
              }}
              Alterações afetam apenas este setor.
            </p>
            <div class="form-grid">
              <DsInput
                id="access-sector-code"
                v-model="sectorForm.code"
                label="Código do setor"
                hint="Identificador técnico; não concede acesso sozinho."
                placeholder="administrativo"
                required
                :disabled="sectorSaving"
              />
              <DsInput
                id="access-sector-name"
                v-model="sectorForm.name"
                label="Nome do setor"
                hint="Nome usado nos vínculos e na auditoria operacional."
                placeholder="Administrativo"
                required
                :disabled="sectorSaving"
              />
              <DsInput
                id="access-sector-description"
                v-model="sectorForm.description"
                label="Descrição do alcance"
                hint="Explique a finalidade; permissões são atribuídas separadamente na matriz."
                placeholder="Área organizacional"
                :disabled="sectorSaving"
              />
            </div>
            <div class="actions-row">
              <DsButton type="submit" :loading="sectorSaving">
                {{ editingSectorId ? 'Salvar alterações do setor' : 'Criar setor' }}
              </DsButton>
              <DsButton
                v-if="editingSectorId"
                type="button"
                variant="secondary"
                :disabled="sectorSaving"
                aria-label="Cancelar edição do setor"
                @click="resetSectorForm"
              >
                Cancelar edição
              </DsButton>
            </div>
          </form>
        </DsCard>

      <DsCard title="Setores cadastrados" title-tag="h2" class="panel">
          <div class="entity-list">
            <article v-for="sector in catalog.sectors" :key="sector.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <strong>{{ sector.name }}</strong>
                  <p>{{ sector.code }}</p>
                </div>
                <DsBadge :variant="sector.status === 'active' ? 'success' : 'warning'" size="sm">
                  {{ sector.status }}
                </DsBadge>
              </div>
              <p>{{ sector.description || 'Sem descrição' }}</p>
              <div class="actions-row entity-card__actions">
                <DsButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  :aria-label="`Editar ${sector.name}`"
                  @click="beginEditSector(sector)"
                >
                  Editar
                </DsButton>
                <DsButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  :aria-label="`${sector.status === 'active' ? 'Desativar' : 'Ativar'} ${sector.name}`"
                  @click="toggleSector(sector)"
                >
                  {{ sector.status === 'active' ? 'Desativar' : 'Ativar' }}
                </DsButton>
              </div>
            </article>
          </div>
        </DsCard>
      </div>
    </section>

    <section
      v-else-if="!loading && catalog && activeTab === 'matrix'"
      id="access-panel-matrix"
      role="tabpanel"
      aria-labelledby="access-tab-matrix"
      class="access-control-page__section"
    >
      <DsCard title="Cobertura CRUD por rotina" title-tag="h2" class="panel">
        <p class="section-hint">
          Leitura operacional Vetus: o poder efetivo deve ser auditável por rotina e por ação
          clássica Consultar, Inserir, Alterar e Excluir.
        </p>
        <div class="matrix-wrapper" tabindex="0" role="region" aria-label="Matriz CRUD por rotina">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Rotina</th>
                <th v-for="action in routineActions" :key="action.key">{{ action.label }}</th>
                <th>Permissões</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="routine in routineRows" :key="routine.module">
                <td>
                  <strong>{{ routine.module }}</strong>
                  <div class="muted">{{ routine.permissions.length }} permissão(ões)</div>
                </td>
                <td v-for="action in routineActions" :key="`${routine.module}:${action.key}`">
                  <DsBadge :variant="routine.actions[action.key] ? 'success' : 'neutral'" size="sm">
                    {{ routine.actions[action.key] ? 'Sim' : 'Não' }}
                  </DsBadge>
                </td>
                <td>
                  <div class="source-list">
                    <span
                      v-for="permission in routine.permissions"
                      :key="permission"
                      class="source-chip"
                    >
                      {{ permission }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DsCard>

      <DsCard title="Matriz de permissões" title-tag="h2" class="panel">
        <div class="subject-toolbar">
          <label class="field">
            <span>Tipo</span>
            <select id="access-matrix-subject-type" v-model="matrixSubjectType" :disabled="loading || grantSaving">
              <option value="user">Usuário</option>
              <option value="team">Equipe</option>
              <option value="sector">Setor</option>
            </select>
          </label>
          <label class="field">
            <span>Alvo</span>
            <select
              id="access-matrix-subject-id"
              v-model="matrixSubjectId"
              :disabled="loading || grantSaving"
              aria-describedby="access-matrix-scope-hint"
            >
              <option v-for="subject in matrixSubjects" :key="subject.id" :value="subject.id">
                {{ subject.name }}
              </option>
            </select>
          </label>
          <DsInput
            v-model="permissionQuery"
            id="access-matrix-filter"
            label="Filtrar permissões da matriz"
            placeholder="Filtrar permissões da matriz"
          />
        </div>
        <p id="access-matrix-scope-hint" class="section-hint">
          A escolha de estado salva imediatamente o grant do alvo selecionado. “Herdar” remove o
          override direto; a permissão efetiva continua sendo calculada pela API.
        </p>
        <div class="matrix-wrapper" tabindex="0" role="region" aria-label="Matriz de permissões do alvo">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Permissão</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="permission in filteredPermissions" :key="permission.code">
                <td>
                  <strong>{{ permission.code }}</strong>
                  <div class="muted">{{ permission.description }}</div>
                </td>
                <td>
                  <select
                    :value="getAssignment(matrixSubjectType, matrixSubjectId, permission.code)"
                    :aria-label="`Estado de ${permission.code} para ${matrixSubjectName}`"
                    :disabled="loading || grantSaving"
                    @change="
                      updateGrant(permission.code, ($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option value="inherit">Herdar</option>
                    <option value="allow">Conceder</option>
                    <option value="deny">Negar</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DsCard>
    </section>

    <DsCard v-else-if="!loading && !accessDenied" title="Governança de acesso" title-tag="h2" class="panel">
      <div class="empty-state">
        <div class="empty-state__title">Nenhum dado disponível.</div>
        <div class="empty-state__description">
          Atualize a página para carregar o catálogo de acesso.
        </div>
      </div>
    </DsCard>

    <div v-if="loading" class="loading-panel">
      <DsCard class="panel">
        <div class="empty-state">
          <div class="empty-state__title">Carregando governança de acesso...</div>
        </div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { accessControlService } from '@/services/accessControl';
import type {
  AccessControlResponse,
  AccessModulePermissionMatrixResponse
} from '@/services/accessControl';
import type {
  AccessModulePermissionMatrixEntry,
  AccessRoutineAction,
  EffectivePermissionSummary,
  PermissionDefinition
} from '@cvg-his-v2/shared-types';

type TabKey = 'summary' | 'users' | 'teams' | 'sectors' | 'matrix';
type MatrixSubjectType = 'user' | 'team' | 'sector';
type RoutineActionKey = 'consult' | 'insert' | 'update' | 'delete';
type AccessTeam = AccessControlResponse['teams'][number];
type AccessSector = AccessControlResponse['sectors'][number];

const tabs: Array<{ value: TabKey; label: string }> = [
  { value: 'summary', label: 'Resumo' },
  { value: 'users', label: 'Usuários' },
  { value: 'teams', label: 'Grupos' },
  { value: 'sectors', label: 'Setores' },
  { value: 'matrix', label: 'Matriz' }
];

const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const activeTab = ref<TabKey>('summary');
const catalog = ref<AccessControlResponse | null>(null);
const modulePermissionMatrix = ref<AccessModulePermissionMatrixResponse | null>(null);
const permissionQuery = ref('');
const selectedUserId = ref('');
const matrixSubjectType = ref<MatrixSubjectType>('team');
const matrixSubjectId = ref('');
const effectivePermissions = ref<EffectivePermissionSummary[]>([]);
const userSaving = ref(false);
const teamSaving = ref(false);
const sectorSaving = ref(false);
const grantSaving = ref(false);
const editingTeamId = ref<string | null>(null);
const editingSectorId = ref<string | null>(null);
const accessDenied = ref(false);
const errorAlert = ref<{ $el?: Element } | null>(null);
let catalogRequestGeneration = 0;
let effectiveRequestGeneration = 0;

const teamForm = reactive({ code: '', name: '', description: '' });
const sectorForm = reactive({ code: '', name: '', description: '' });
const draftRoleCodes = ref<string[]>([]);
const draftTeamIds = ref<string[]>([]);
const draftSectorIds = ref<string[]>([]);

const governanceLayers = [
  {
    scope: 'Identidade',
    title: 'Usuário autenticável',
    description: 'Conta operacional com status, vínculo humano e contexto da organização.'
  },
  {
    scope: 'Autorização',
    title: 'Grupo de Acesso',
    description: 'Política reaplicável para onboarding, troca de função e revisão periódica.'
  },
  {
    scope: 'Capacidade',
    title: 'Rotina',
    description: 'Catálogo explícito do que pode ser consultado, inserido, alterado ou excluído.'
  },
  {
    scope: 'Segurança',
    title: 'Sessão',
    description: 'Uso autenticado rastreável, com expiração e base para revogação.'
  },
  {
    scope: 'Compliance',
    title: 'Auditoria',
    description: 'Registro de quem fez o quê, em qual entidade, tenant e contexto técnico.'
  }
];

const securityControls = [
  {
    title: 'Consultar',
    description: 'Permite ler registros e navegar pela rotina sem alterar dados.'
  },
  {
    title: 'Inserir',
    description: 'Autoriza criação de novos registros na rotina selecionada.'
  },
  {
    title: 'Alterar',
    description: 'Autoriza edição, transição operacional e manutenção de registros.'
  },
  {
    title: 'Excluir',
    description: 'Operação sensível que deve ser concedida explicitamente e auditada.'
  }
];

const routineActions: Array<{ key: RoutineActionKey; label: string }> = [
  { key: 'consult', label: 'Consultar' },
  { key: 'insert', label: 'Inserir' },
  { key: 'update', label: 'Alterar' },
  { key: 'delete', label: 'Excluir' }
];

const enterpriseActions: Array<{ key: AccessRoutineAction; label: string }> = [
  { key: 'consult', label: 'Consultar' },
  { key: 'insert', label: 'Inserir' },
  { key: 'update', label: 'Alterar' },
  { key: 'delete', label: 'Excluir' },
  { key: 'execute', label: 'Executar' },
  { key: 'admin', label: 'Admin' }
];

const filteredPermissions = computed(() => {
  const needle = permissionQuery.value.trim().toLowerCase();
  const items = catalog.value?.permissions ?? [];
  if (!needle) return [...items];
  return items.filter((permission) =>
    [permission.code, permission.module, permission.description].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(needle)
    )
  );
});

const filteredPermissionGroups = computed(() => {
  const grouped = new Map<string, PermissionDefinition[]>();
  for (const permission of filteredPermissions.value) {
    const key = permission.module || 'outros';
    const current = grouped.get(key) ?? [];
    current.push(permission);
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .map(([module, items]) => ({
      module,
      moduleLabel: module.replace(/_/g, ' ').toUpperCase(),
      items: [...items].sort((a, b) => a.code.localeCompare(b.code))
    }))
    .sort((a, b) => a.module.localeCompare(b.module));
});

const routineRows = computed(() => {
  const grouped = new Map<
    string,
    { module: string; permissions: string[]; actions: Record<RoutineActionKey, boolean> }
  >();

  for (const permission of catalog.value?.permissions ?? []) {
    const module = permission.module || permission.code.split('.')[0] || 'outros';
    const current =
      grouped.get(module) ??
      ({
        module,
        permissions: [],
        actions: { consult: false, insert: false, update: false, delete: false }
      } satisfies {
        module: string;
        permissions: string[];
        actions: Record<RoutineActionKey, boolean>;
      });

    current.permissions.push(permission.code);
    for (const action of resolvePermissionActions(permission.code)) {
      current.actions[action] = true;
    }
    grouped.set(module, current);
  }

  return [...grouped.values()].sort((a, b) => a.module.localeCompare(b.module));
});

const enterpriseMatrixRows = computed<readonly AccessModulePermissionMatrixEntry[]>(() =>
  [...(modulePermissionMatrix.value?.items ?? [])].sort((a, b) => {
    const statusRank = { complete: 0, partial: 1, 'read-only': 2 } satisfies Record<string, number>;
    return (
      statusRank[a.coverageStatus] - statusRank[b.coverageStatus] ||
      a.module.localeCompare(b.module)
    );
  })
);

const enterpriseMatrixCompleteCount = computed(
  () => enterpriseMatrixRows.value.filter((entry) => entry.coverageStatus === 'complete').length
);

const selectedUser = computed(
  () => (catalog.value?.users ?? []).find((user) => user.id === selectedUserId.value) ?? null
);

const selectedUserGovernance = computed(() => {
  const user = selectedUser.value;
  if (!user) return [];
  return [
    {
      label: 'Identidade operacional',
      value: user.username,
      hint: 'Usuário autenticável separado do profissional de agenda.'
    },
    {
      label: 'Último login',
      value: user.updatedAt ? formatDateTime(user.updatedAt) : 'Não informado',
      hint: 'Indicador operacional até existir histórico dedicado de sessão.'
    },
    {
      label: 'MFA',
      value: 'Governança Enterprise',
      hint: 'Controle preservado no Console Enterprise para política sensível.'
    },
    {
      label: 'Tenant',
      value: user.accountId || 'Contexto atual',
      hint: 'Permissões e auditoria devem permanecer isoladas por organização.'
    }
  ];
});

const matrixSubjects = computed(() => {
  if (!catalog.value) return [];
  if (matrixSubjectType.value === 'user') {
    return catalog.value.users.map((user) => ({
      id: user.id,
      name: `${user.displayName} (${user.roleCode})`
    }));
  }
  if (matrixSubjectType.value === 'team') {
    return catalog.value.teams.map((team) => ({ id: team.id, name: team.name }));
  }
  return catalog.value.sectors.map((sector) => ({ id: sector.id, name: sector.name }));
});

const matrixSubjectName = computed(() => {
  return (
    matrixSubjects.value.find((subject) => subject.id === matrixSubjectId.value)?.name ??
    'alvo selecionado'
  );
});

const assignmentCount = computed(() => {
  const assignments = catalog.value?.assignments;
  return (
    (assignments?.userPermissions.length ?? 0) +
    (assignments?.teamPermissions.length ?? 0) +
    (assignments?.sectorPermissions.length ?? 0)
  );
});

function isForbiddenError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status?: unknown }).status === 403
  );
}

function displayAccessCount(value: number | undefined): string | number {
  return accessDenied.value ? '—' : (value ?? 0);
}

function showError(message: string, forbidden = false) {
  error.value = message;
  accessDenied.value = forbidden;
  void nextTick(() => {
    const element = errorAlert.value?.$el;
    if (element instanceof HTMLElement) {
      element.focus({ preventScroll: true });
    }
  });
  setTimeout(() => {
    if (error.value === message && !accessDenied.value) error.value = '';
  }, 7000);
}

function clearError() {
  error.value = '';
  accessDenied.value = false;
}

function reportError(err: unknown, fallback: string) {
  if (isForbiddenError(err)) {
    showError(
      'Seu perfil não pode consultar ou alterar este catálogo. Solicite a um administrador a permissão de governança de acesso.',
      true
    );
    return;
  }
  showError(err instanceof Error ? err.message : fallback);
}

function handleTabKey(event: KeyboardEvent, tab: TabKey) {
  const index = tabs.findIndex((item) => item.value === tab);
  if (
    index < 0 ||
    !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)
  ) {
    return;
  }
  event.preventDefault();
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index +
            (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) +
            tabs.length) %
          tabs.length;
  const nextTab = tabs[nextIndex].value;
  activeTab.value = nextTab;
  void nextTick(() => document.getElementById(`access-tab-${nextTab}`)?.focus());
}

function showSuccess(message: string) {
  successMessage.value = message;
  setTimeout(() => {
    if (successMessage.value === message) successMessage.value = '';
  }, 5000);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function resolvePermissionActions(code: string): RoutineActionKey[] {
  const normalized = code.toLowerCase();
  if (normalized.includes('.admin') || normalized.includes('.manage')) {
    return ['consult', 'insert', 'update', 'delete'];
  }
  const actions = new Set<RoutineActionKey>();
  if (
    normalized.includes('.read') ||
    normalized.includes('.view') ||
    normalized.includes('.consult')
  ) {
    actions.add('consult');
  }
  if (
    normalized.includes('.write') ||
    normalized.includes('.create') ||
    normalized.includes('.insert')
  ) {
    actions.add('insert');
    actions.add('update');
  }
  if (normalized.includes('.update') || normalized.includes('.edit')) {
    actions.add('update');
  }
  if (normalized.includes('.delete') || normalized.includes('.remove')) {
    actions.add('delete');
  }
  return actions.size ? [...actions] : ['consult'];
}

function defaultUserDrafts() {
  const userId = selectedUserId.value;
  if (!catalog.value || !userId) return;

  draftRoleCodes.value = (
    catalog.value.legacyRoles.find((entry) => entry.userId === userId)?.roleCodes ?? []
  ).slice();
  draftTeamIds.value = (catalog.value.memberships.userTeams ?? [])
    .filter((item) => item.userId === userId)
    .map((item) => item.teamId);
  draftSectorIds.value = (catalog.value.memberships.userSectors ?? [])
    .filter((item) => item.userId === userId)
    .map((item) => item.sectorId);
}

async function loadCatalog() {
  const generation = ++catalogRequestGeneration;
  loading.value = true;
  error.value = '';
  accessDenied.value = false;
  try {
    const [catalogPayload, matrixPayload] = await Promise.all([
      accessControlService.getCatalog(),
      accessControlService.getModulePermissionMatrix()
    ]);
    if (generation !== catalogRequestGeneration) return;
    catalog.value = catalogPayload;
    modulePermissionMatrix.value = matrixPayload;
    const nextUserId = catalog.value.users.some((user) => user.id === selectedUserId.value)
      ? selectedUserId.value
      : (catalog.value.users[0]?.id ?? '');
    const selectedUserChanged = nextUserId !== selectedUserId.value;
    selectedUserId.value = nextUserId;
    matrixSubjectId.value = matrixSubjects.value.some(
      (subject) => subject.id === matrixSubjectId.value
    )
      ? matrixSubjectId.value
      : (matrixSubjects.value[0]?.id ?? '');
    defaultUserDrafts();
    // The watcher performs the request when the selected user changes. This
    // avoids two effective-permission requests during the initial load.
    if (!selectedUserChanged) await reloadUserEffective();
  } catch (err: unknown) {
    if (generation !== catalogRequestGeneration) return;
    reportError(err, 'Falha ao carregar governança de acesso');
  } finally {
    if (generation === catalogRequestGeneration) loading.value = false;
  }
}

function coverageLabel(status: AccessModulePermissionMatrixEntry['coverageStatus']) {
  if (status === 'complete') return 'Completo';
  if (status === 'partial') return 'Parcial';
  return 'Somente leitura';
}

async function reload() {
  await loadCatalog();
}

async function reloadUserEffective() {
  const userId = selectedUserId.value;
  const generation = ++effectiveRequestGeneration;
  if (!userId) {
    effectivePermissions.value = [];
    userSaving.value = false;
    return;
  }

  userSaving.value = true;
  try {
    const response = await accessControlService.getEffectivePermissions(userId);
    if (generation !== effectiveRequestGeneration || selectedUserId.value !== userId) return;
    effectivePermissions.value = [...response.effectivePermissions];
    if (catalog.value) {
      const user = catalog.value.users.find((item) => item.id === userId);
      if (user) {
        draftRoleCodes.value =
          catalog.value.legacyRoles.find((entry) => entry.userId === user.id)?.roleCodes?.slice() ??
          [];
        draftTeamIds.value =
          (catalog.value.memberships.userTeams ?? [])
            .filter((item) => item.userId === user.id)
            .map((item) => item.teamId) ?? [];
        draftSectorIds.value =
          (catalog.value.memberships.userSectors ?? [])
            .filter((item) => item.userId === user.id)
            .map((item) => item.sectorId) ?? [];
      }
    }
  } catch (err: unknown) {
    if (generation !== effectiveRequestGeneration || selectedUserId.value !== userId) return;
    reportError(err, 'Falha ao carregar permissões efetivas');
  } finally {
    if (generation === effectiveRequestGeneration && selectedUserId.value === userId) {
      userSaving.value = false;
    }
  }
}

function getAssignment(subjectType: MatrixSubjectType, subjectId: string, permissionCode: string) {
  if (!catalog.value) return 'inherit';
  const pool =
    subjectType === 'user'
      ? catalog.value.assignments.userPermissions
      : subjectType === 'team'
        ? catalog.value.assignments.teamPermissions
        : catalog.value.assignments.sectorPermissions;
  const assignment = pool.find(
    (item) => item.subjectId === subjectId && item.permissionCode === permissionCode
  );
  return assignment?.effect ?? 'inherit';
}

async function updateGrant(permissionCode: string, effect: string) {
  if (!matrixSubjectId.value || grantSaving.value || loading.value) return;
  const catalogGenerationAtStart = catalogRequestGeneration;
  grantSaving.value = true;
  try {
    await accessControlService.setGrant({
      subjectType: matrixSubjectType.value,
      subjectId: matrixSubjectId.value,
      permissionCode,
      effect: effect === 'inherit' ? 'inherit' : effect === 'allow' ? 'allow' : 'deny'
    });
    if (catalogGenerationAtStart !== catalogRequestGeneration) return;
    showSuccess('Permissão atualizada com sucesso');
    await loadCatalog();
  } catch (err: unknown) {
    reportError(err, 'Falha ao salvar grant');
  } finally {
    grantSaving.value = false;
  }
}

async function saveUserMemberships() {
  if (!selectedUserId.value) return;
  userSaving.value = true;
  try {
    await accessControlService.replaceUserMemberships(selectedUserId.value, {
      roleCodes: [...draftRoleCodes.value],
      teamIds: [...draftTeamIds.value],
      sectorIds: [...draftSectorIds.value]
    });
    showSuccess('Vínculos do usuário atualizados');
    await loadCatalog();
  } catch (err: unknown) {
    reportError(err, 'Falha ao salvar vínculos do usuário');
  } finally {
    userSaving.value = false;
  }
}

function resetTeamForm() {
  editingTeamId.value = null;
  teamForm.code = '';
  teamForm.name = '';
  teamForm.description = '';
}

function beginEditTeam(team: AccessTeam) {
  editingTeamId.value = team.id;
  teamForm.code = team.code;
  teamForm.name = team.name;
  teamForm.description = team.description ?? '';
  void nextTick(() => document.getElementById('access-team-name')?.focus());
}

function beginEditSector(sector: AccessSector) {
  editingSectorId.value = sector.id;
  sectorForm.code = sector.code;
  sectorForm.name = sector.name;
  sectorForm.description = sector.description ?? '';
  void nextTick(() => document.getElementById('access-sector-name')?.focus());
}

function validateEntityForm(code: string, name: string, label: string): boolean {
  if (!code.trim()) {
    showError(`Informe o código do ${label}`);
    return false;
  }
  if (!name.trim()) {
    showError(`Informe o nome do ${label}`);
    return false;
  }
  return true;
}

async function saveTeam() {
  const code = teamForm.code.trim();
  const name = teamForm.name.trim();
  const description = teamForm.description.trim();
  if (!validateEntityForm(code, name, 'grupo')) return;

  teamSaving.value = true;
  try {
    if (editingTeamId.value) {
      const current = catalog.value?.teams.find((team) => team.id === editingTeamId.value);
      if (!current) {
        showError('Grupo de acesso não encontrado no catálogo atual');
        return;
      }
      await accessControlService.updateTeam(editingTeamId.value, {
        code,
        name,
        description: description || null,
        isActive: current.status === 'active'
      });
      resetTeamForm();
      showSuccess('Grupo de acesso atualizado');
    } else {
      await accessControlService.createTeam({
        code,
        name,
        description: description || undefined
      });
      resetTeamForm();
      showSuccess('Equipe criada com sucesso');
    }
    await loadCatalog();
  } catch (err: unknown) {
    reportError(err, 'Falha ao salvar grupo');
  } finally {
    teamSaving.value = false;
  }
}

async function toggleTeam(team: AccessTeam) {
  teamSaving.value = true;
  try {
    await accessControlService.updateTeam(team.id, { isActive: team.status !== 'active' });
    showSuccess(
      team.status === 'active' ? 'Grupo de acesso desativado' : 'Grupo de acesso ativado'
    );
    await loadCatalog();
  } catch (err: unknown) {
    reportError(err, 'Falha ao alterar estado do grupo');
  } finally {
    teamSaving.value = false;
  }
}

function resetSectorForm() {
  editingSectorId.value = null;
  sectorForm.code = '';
  sectorForm.name = '';
  sectorForm.description = '';
}

async function saveSector() {
  const code = sectorForm.code.trim();
  const name = sectorForm.name.trim();
  const description = sectorForm.description.trim();
  if (!validateEntityForm(code, name, 'setor')) return;

  sectorSaving.value = true;
  try {
    if (editingSectorId.value) {
      const current = catalog.value?.sectors.find((sector) => sector.id === editingSectorId.value);
      if (!current) {
        showError('Setor não encontrado no catálogo atual');
        return;
      }
      await accessControlService.updateSector(editingSectorId.value, {
        code,
        name,
        description: description || null,
        isActive: current.status === 'active'
      });
      resetSectorForm();
      showSuccess('Setor atualizado');
    } else {
      await accessControlService.createSector({
        code,
        name,
        description: description || undefined
      });
      resetSectorForm();
      showSuccess('Setor criado com sucesso');
    }
    await loadCatalog();
  } catch (err: unknown) {
    reportError(err, 'Falha ao salvar setor');
  } finally {
    sectorSaving.value = false;
  }
}

async function toggleSector(sector: AccessSector) {
  sectorSaving.value = true;
  try {
    await accessControlService.updateSector(sector.id, { isActive: sector.status !== 'active' });
    showSuccess(sector.status === 'active' ? 'Setor desativado' : 'Setor ativado');
    await loadCatalog();
  } catch (err: unknown) {
    reportError(err, 'Falha ao alterar estado do setor');
  } finally {
    sectorSaving.value = false;
  }
}

watch(selectedUserId, () => {
  defaultUserDrafts();
  void reloadUserEffective();
});

watch(matrixSubjectType, () => {
  if (!catalog.value) return;
  matrixSubjectId.value = matrixSubjects.value[0]?.id ?? '';
});

onMounted(loadCatalog);
</script>

<style scoped>
.access-control-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(
    180deg,
    var(--color-surface, #ffffff),
    var(--color-bg-subtle, #f8fafc)
  );
}

.overview-card__value {
  display: block;
  font-size: 28px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.access-control-page__segments,
.subject-toolbar,
.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.access-control-page__segments [role='tab'] {
  flex: 0 0 auto;
}

.entity-form,
.membership-form {
  display: grid;
  gap: 14px;
}

.access-control-page__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.panel__toolbar {
  margin-bottom: 12px;
}

.module-grid,
.role-grid,
.entity-list,
.creation-grid,
.governance-grid,
.routine-grid,
.enterprise-grid,
.identity-grid {
  display: grid;
  gap: 12px;
}

.module-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.role-grid,
.entity-list,
.governance-grid,
.routine-grid,
.enterprise-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.creation-grid {
  grid-template-columns: 1fr;
}

.module-card,
.role-card,
.entity-card,
.governance-card,
.routine-card,
.identity-card,
.enterprise-grid > div {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.governance-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.04), rgba(14, 165, 233, 0.08));
}

.governance-card__eyebrow,
.identity-card span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.governance-card p,
.routine-card p,
.identity-card p,
.enterprise-grid p,
.section-hint {
  margin: 8px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

.identity-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-top: 12px;
}

.module-card__header,
.role-card__header,
.entity-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.module-card__header p,
.role-card__header p,
.entity-card__header p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
}

.permission-sample {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 8px;
}

.permission-sample li {
  display: grid;
  gap: 2px;
}

.permission-sample code {
  font-size: 12px;
}

.action-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.action-chip {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.action-chip--on {
  border-color: var(--color-success-border, #86efac);
  background: var(--color-success-surface, #dcfce7);
  color: var(--color-success-text, #166534);
}

.role-card__description,
.entity-card p {
  color: var(--color-text-muted, #64748b);
}

.user-layout {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 16px;
}

.profile-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08));
}

.profile-card p {
  margin: 6px 0 0;
  color: var(--color-text-muted, #64748b);
}

.profile-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.membership-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.membership-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-subtle, #f8fafc);
}

.membership-panel legend {
  padding: 0 4px;
  font-weight: 700;
}

.checklist {
  display: grid;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.checklist__item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.matrix-wrapper {
  overflow-x: auto;
  border-radius: 12px;
}

.matrix-wrapper:focus-visible {
  outline: 3px solid var(--color-focus, #2563eb);
  outline-offset: 3px;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
}

.matrix-table th,
.matrix-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  vertical-align: top;
}

.matrix-table th {
  text-align: left;
  background: var(--color-bg-subtle, #f8fafc);
  white-space: nowrap;
}

.matrix-table__cell {
  text-align: center;
  white-space: nowrap;
}

.muted {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  margin-top: 4px;
}

.source-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.source-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--color-text, #0f172a);
  font-size: 12px;
}

.empty-state {
  padding: 36px 18px;
  text-align: center;
}

.empty-state__title {
  font-weight: 700;
}

.empty-state__description {
  margin-top: 6px;
  color: var(--color-text-muted, #64748b);
}

.loading-panel {
  min-height: 120px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.field small {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  line-height: 1.4;
}

.field select {
  min-width: 220px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #fff);
  color: inherit;
}

@media (max-width: 960px) {
  .user-layout {
    grid-template-columns: 1fr;
  }

  .access-control-page__segments {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }
}
</style>
