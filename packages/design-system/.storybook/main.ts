import type { StorybookConfig } from '@storybook/vue3-vite';
import vue from '@vitejs/plugin-vue';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx|vue)'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs'
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: { docgen: false }
  },
  docs: {
    autodocs: 'tag'
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), vue()],
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@': '/src',
        '@cvg-his-v2/design-system/vue': '/src/vue',
        '@cvg-his-v2/design-system/src/vue': '/src/vue'
      }
    }
  })
};

export default config;
