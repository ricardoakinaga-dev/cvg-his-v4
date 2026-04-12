import type { Preview } from '@storybook/vue';
import '../src/tokens/variables.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f0f4f8', description: 'Light theme background' },
        { name: 'dark', value: '#0f172a', description: 'Dark theme background' }
      ]
    },
    docs: {
      theme: undefined
    }
  },
  decorators: [
    (story, context) => {
      const theme =
        (context.globals as Record<string, string>)?.theme ||
        (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light');

      return {
        components: { story },
        template: `<div :data-theme="theme" style="padding: 16px; min-height: 100px; border-radius: 8px; transition: background 250ms ease, color 250ms ease;"><story /></div>`,
        setup() {
          return { theme };
        }
      };
    }
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for stories',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light mode' },
          { value: 'dark', icon: 'moon', title: 'Dark mode' }
        ],
        showName: true,
        dynamicTitle: true
      }
    }
  }
};

export default preview;
