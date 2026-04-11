import type { Meta, StoryObj } from '@storybook/vue';
import DsCard from '../src/vue/DsCard.vue';

const meta: Meta<typeof DsCard> = {
  title: 'Design System/Components/DsCard',
  component: DsCard,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text', description: 'Card title' },
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined'],
      description: 'Card visual variant'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Card Title',
    default: 'Card content goes here'
  }
};

export const Elevated: Story = {
  args: {
    title: 'Elevated Card',
    variant: 'elevated',
    default: 'This card has elevated shadow styling'
  }
};

export const Outlined: Story = {
  args: {
    title: 'Outlined Card',
    variant: 'outlined',
    default: 'This card has an outlined border'
  }
};
