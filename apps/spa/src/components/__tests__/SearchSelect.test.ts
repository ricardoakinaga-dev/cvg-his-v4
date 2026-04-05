import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SearchSelect from '../SearchSelect.vue';

const options = [
  { label: 'João Silva', value: '1' },
  { label: 'Maria Santos', value: '2' },
  { label: 'Pedro Oliveira', value: '3' },
  { label: 'Ana Costa', value: '4' }
];

describe('SearchSelect', () => {
  it('renders with placeholder', () => {
    const wrapper = mount(SearchSelect, {
      props: { options, placeholder: 'Buscar...' }
    });
    expect(wrapper.find('input').attributes('placeholder')).toBe('Buscar...');
  });

  it('shows all options when focused', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    const dropdownItems = wrapper.findAll('.search-select__option');
    expect(dropdownItems.length).toBe(4);
  });

  it('filters options based on search query', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    const input = wrapper.find('input');
    await input.setValue('Maria');
    await wrapper.vm.$nextTick();
    const dropdownItems = wrapper.findAll('.search-select__option');
    expect(dropdownItems.length).toBe(1);
    expect(dropdownItems[0].text()).toBe('Maria Santos');
  });

  it('emits update:modelValue when selecting an option', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.search-select__option')[0].trigger('mousedown');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['1']);
  });

  it('emits change event when selecting an option', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.search-select__option')[0].trigger('mousedown');
    expect(wrapper.emitted('change')).toBeTruthy();
    expect(wrapper.emitted('change')![0]).toEqual([{ label: 'João Silva', value: '1' }]);
  });

  it('clears selection when clear button is clicked', async () => {
    const wrapper = mount(SearchSelect, {
      props: { options, modelValue: '1' }
    });
    await wrapper.find('.search-select__clear').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['']);
  });

  it('shows empty state when no options match', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    const input = wrapper.find('input');
    await input.setValue('zzzzz');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.search-select__empty').exists()).toBe(true);
    expect(wrapper.find('.search-select__empty').text()).toBe('Nenhum resultado encontrado');
  });

  it('highlights next option on arrow down', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    await wrapper.find('input').trigger('keydown.down');
    expect((wrapper.vm as any).highlightedIndex).toBe(1);
  });

  it('highlights previous option on arrow up', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).highlightedIndex = 2;
    await wrapper.find('input').trigger('keydown.up');
    expect((wrapper.vm as any).highlightedIndex).toBe(1);
  });

  it('selects highlighted option on enter', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).highlightedIndex = 1;
    await wrapper.find('input').trigger('keydown.enter');
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['2']);
  });

  it('closes dropdown on escape', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).isOpen).toBe(true);
    await wrapper.find('input').trigger('keydown.escape');
    expect((wrapper.vm as any).isOpen).toBe(false);
  });

  it('shows loading spinner when loading prop is true', () => {
    const wrapper = mount(SearchSelect, {
      props: { options, loading: true }
    });
    expect(wrapper.find('.search-select__spinner').exists()).toBe(true);
  });

  it('disables input when disabled prop is true', () => {
    const wrapper = mount(SearchSelect, {
      props: { options, disabled: true }
    });
    expect(wrapper.find('input').attributes('disabled')).toBe('');
  });

  it('pre-populates searchQuery with selected option label', () => {
    const wrapper = mount(SearchSelect, {
      props: { options, modelValue: '2' }
    });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Maria Santos');
  });

  it('does not emit when no matching option on enter', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    await wrapper.find('input').setValue('zzz');
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).highlightedIndex = 0;
    await wrapper.find('input').trigger('keydown.enter');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('case-insensitive filtering works', async () => {
    const wrapper = mount(SearchSelect, { props: { options } });
    const input = wrapper.find('input');
    await input.setValue('ANA');
    await wrapper.vm.$nextTick();
    const dropdownItems = wrapper.findAll('.search-select__option');
    expect(dropdownItems.length).toBe(1);
    expect(dropdownItems[0].text()).toBe('Ana Costa');
  });

  it('applies selected class to matching option', async () => {
    const wrapper = mount(SearchSelect, {
      props: { options, modelValue: '3' }
    });
    await wrapper.find('input').trigger('focus');
    await wrapper.vm.$nextTick();
    const optionElements = wrapper.findAll('.search-select__option');
    const selectedOption = optionElements.find((el) =>
      el.classes().includes('search-select__option--selected')
    );
    expect(selectedOption).toBeTruthy();
    expect(selectedOption!.text()).toBe('Pedro Oliveira');
  });
});
