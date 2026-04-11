import type { Meta, StoryObj } from '@storybook/vue';
import DsButton from '../src/vue/DsButton.vue';

const meta: Meta<typeof DsButton> = {
  title: 'Design System/Components/DsButton',
  component: DsButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'danger', 'ghost', 'warning'],
      description: 'Visual style variant'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size'
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner'
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button'
    },
    tag: {
      control: 'select',
      options: ['button', 'a', 'router-link'],
      description: 'HTML tag to render'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  }
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success Button'
  }
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger Button'
  }
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button'
  }
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading...'
  }
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled'
  }
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small Button'
  }
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Large Button'
  }
};
