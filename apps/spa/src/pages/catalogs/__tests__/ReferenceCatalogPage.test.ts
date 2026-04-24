import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ReferenceCatalogPage from '../ReferenceCatalogPage.vue';

describe('ReferenceCatalogPage', () => {
  it.each([
    ['breeds', 'Raças', 'Buscar por raça, espécie ou código', 'Shih-tzu'],
    ['species', 'Espécies', 'Buscar por espécie ou código', 'Canina'],
    ['coat-colors', 'Cores', 'Buscar por cor, pelagem ou código', 'Tricolor']
  ] as const)('renders the %s catalog with search and stable data', async (kind, title, placeholder, expectedItem) => {
    const wrapper = mount(ReferenceCatalogPage, {
      props: { kind }
    });

    expect(wrapper.text()).toContain(title);
    expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe(placeholder);
    expect(wrapper.text()).toContain(expectedItem);

    await wrapper.find('input[type="search"]').setValue(expectedItem);
    expect(wrapper.text()).toContain(expectedItem);
  });
});
