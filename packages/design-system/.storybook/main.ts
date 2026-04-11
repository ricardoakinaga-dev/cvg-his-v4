import type { StorybookConfig } from '@storybook/vue-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx|vue)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-actions',
    '@storybook/addon-controls',
    '@storybook/addon-docs'
  ],
  framework: {
    name: '@storybook/vue-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => ({
    ...config,
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
