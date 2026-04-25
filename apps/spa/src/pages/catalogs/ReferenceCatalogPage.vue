<template>
  <section class="reference-catalog">
    <header class="catalog-hero">
      <div>
        <p class="eyebrow">Cadastros auxiliares</p>
        <h1>{{ catalog.title }}</h1>
        <p>{{ catalog.description }}</p>
      </div>
      <div class="hero-card">
        <strong>{{ filteredItems.length }}</strong>
        <span>registros ativos</span>
      </div>
    </header>

    <div class="catalog-toolbar">
      <input
        v-model="query"
        type="search"
        :placeholder="catalog.placeholder"
        class="catalog-search"
      />
      <span class="catalog-note">Catálogo estável para formularios de animais e migração Vetus.</span>
    </div>

    <div class="catalog-grid">
      <article v-for="item in filteredItems" :key="item.code" class="catalog-card">
        <div>
          <span class="item-code">{{ item.code }}</span>
          <h2>{{ item.name }}</h2>
        </div>
        <p>{{ item.description }}</p>
        <span class="item-meta">{{ item.meta }}</span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type CatalogKind = 'species' | 'coat-colors';

interface ReferenceItem {
  code: string;
  name: string;
  description: string;
  meta: string;
}

interface ReferenceCatalog {
  title: string;
  description: string;
  placeholder: string;
  items: ReferenceItem[];
}

const props = defineProps<{
  kind: CatalogKind;
}>();

const catalogs: Record<CatalogKind, ReferenceCatalog> = {
  species: {
    title: 'Espécies',
    description: 'Catálogo base de espécies aceitas no cadastro de animais e nos filtros clínicos.',
    placeholder: 'Buscar por espécie ou código',
    items: [
      { code: 'CANINE', name: 'Canina', description: 'Pacientes cães.', meta: 'Pequenos animais' },
      { code: 'FELINE', name: 'Felina', description: 'Pacientes gatos.', meta: 'Pequenos animais' },
      { code: 'AVIAN', name: 'Ave', description: 'Pacientes aves ornamentais ou silvestres autorizadas.', meta: 'Exóticos' },
      { code: 'LAGOMORPH', name: 'Lagomorfo', description: 'Coelhos e espécies relacionadas.', meta: 'Exóticos' }
    ]
  },
  'coat-colors': {
    title: 'Cores',
    description: 'Tabela de pelagens para normalizar fichas, identificação visual e relatórios cadastrais.',
    placeholder: 'Buscar por cor, pelagem ou código',
    items: [
      { code: 'BLACK', name: 'Preta', description: 'Pelagem predominantemente preta.', meta: 'Sólida' },
      { code: 'WHITE', name: 'Branca', description: 'Pelagem predominantemente branca.', meta: 'Sólida' },
      { code: 'CARAMEL', name: 'Caramelo', description: 'Pelagem caramelo ou castanho claro.', meta: 'Sólida' },
      { code: 'TRICOLOR', name: 'Tricolor', description: 'Composição de três cores na pelagem.', meta: 'Composta' },
      { code: 'BRINDLE', name: 'Rajada', description: 'Pelagem rajada ou tigrada.', meta: 'Composta' }
    ]
  }
};

const query = ref('');
const catalog = computed(() => catalogs[props.kind]);
const filteredItems = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return catalog.value.items;
  return catalog.value.items.filter((item) =>
    [item.code, item.name, item.description, item.meta].some((value) =>
      value.toLowerCase().includes(term)
    )
  );
});
</script>

<style scoped>
.reference-catalog {
  display: grid;
  gap: 1.5rem;
}

.catalog-hero {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 24px;
  color: #10231f;
  background:
    radial-gradient(circle at top right, rgba(51, 124, 103, 0.26), transparent 34%),
    linear-gradient(135deg, #f0f8f4 0%, #e4efe9 100%);
  border: 1px solid #c7ddd1;
}

.catalog-hero h1 {
  margin: 0.25rem 0;
  font-size: clamp(2rem, 5vw, 4rem);
  letter-spacing: -0.06em;
}

.catalog-hero p {
  max-width: 680px;
  margin: 0;
  color: #456158;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.75rem;
  font-weight: 800;
}

.hero-card {
  min-width: 150px;
  align-self: stretch;
  display: grid;
  place-content: center;
  text-align: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(40, 89, 72, 0.18);
}

.hero-card strong {
  font-size: 2.5rem;
}

.catalog-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.catalog-search {
  flex: 1;
  min-width: 220px;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid #bed3c9;
  background: #ffffff;
}

.catalog-note,
.item-meta,
.item-code {
  color: #5d726b;
  font-size: 0.85rem;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.catalog-card {
  display: grid;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #dbe8e1;
  box-shadow: 0 16px 40px rgba(21, 47, 38, 0.08);
}

.catalog-card h2 {
  margin: 0.15rem 0 0;
  font-size: 1.2rem;
}

.catalog-card p {
  margin: 0;
  color: #455c54;
}

.item-code {
  font-weight: 800;
  letter-spacing: 0.08em;
}

@media (max-width: 760px) {
  .catalog-hero,
  .catalog-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
