import type { Meta, StoryObj } from '@storybook/vue';
import DsBadge from '../src/vue/DsBadge.vue';

const meta: Meta<typeof DsBadge> = {
  title: 'Design System/Components/DsBadge',
  component: DsBadge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'danger', 'info'],
      description: 'Badge color variant'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size'
    },
    label: { control: 'text', description: 'Badge text label' }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Default Badge' }
};

export const Primary: Story = {
  args: { label: 'Primary', variant: 'primary' }
};

export const Success: Story = {
  args: { label: 'Success', variant: 'success' }
};

export const Warning: Story = {
  args: { label: 'Warning', variant: 'warning' }
};

export const Danger: Story = {
  args: { label: 'Danger', variant: 'danger' }
};

export const Info: Story = {
  args: { label: 'Info', variant: 'info' }
};

export const Small: Story = {
  args: { label: 'Small Badge', size: 'sm' }
};

export const Large: Story = {
  args: { label: 'Large Badge', size: 'lg' }
};
