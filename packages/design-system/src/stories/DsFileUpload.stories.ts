import type { Meta, StoryObj } from '@storybook/vue3';
import DsFileUpload from '../vue/DsFileUpload.vue';

const meta = {
  title: 'Design System/Components/FileUpload',
  component: DsFileUpload,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    multiple: { control: 'boolean' },
    required: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Upload de arquivos do Design System CVG HIS. Suporta drag-drop, validacao de tamanho e multiplos arquivos.'
      }
    }
  }
} satisfies Meta<typeof DsFileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Anexar arquivo',
    hint: 'PNG, JPG ou PDF ate 10MB'
  },
  render: (args) => ({
    components: { DsFileUpload },
    setup: () => ({ args }),
    template: '<DsFileUpload v-bind="args" />'
  })
};

export const Required: Story = {
  args: {
    label: 'Documento obligatorio',
    hint: 'Envie um PDF valido',
    required: true
  },
  render: (args) => ({
    components: { DsFileUpload },
    setup: () => ({ args }),
    template: '<DsFileUpload v-bind="args" />'
  })
};

export const WithError: Story = {
  args: {
    label: 'Arquivo',
    error: 'Arquivo excede o tamanho maximo de 10MB'
  },
  render: (args) => ({
    components: { DsFileUpload },
    setup: () => ({ args }),
    template: '<DsFileUpload v-bind="args" />'
  })
};

export const Disabled: Story = {
  args: {
    label: 'Arquivo desabilitado',
    disabled: true
  },
  render: (args) => ({
    components: { DsFileUpload },
    setup: () => ({ args }),
    template: '<DsFileUpload v-bind="args" />'
  })
};

export const Multiple: Story = {
  args: {
    label: 'Multiplos arquivos',
    hint: 'Ate 5 arquivos, 10MB cada',
    multiple: true,
    maxFiles: 5
  },
  render: (args) => ({
    components: { DsFileUpload },
    setup: () => ({ args }),
    template: '<DsFileUpload v-bind="args" />'
  })
};

export const SpecificFormat: Story = {
  args: {
    label: 'Imagem do perfil',
    hint: 'Apenas PNG ou JPG',
    accept: '.png,.jpg,.jpeg'
  },
  render: (args) => ({
    components: { DsFileUpload },
    setup: () => ({ args }),
    template: '<DsFileUpload v-bind="args" />'
  })
};

export const SmallMaxSize: Story = {
  args: {
    label: 'Logo da empresa',
    hint: 'Maximo 500KB',
    maxSize: 500 * 1024,
    accept: '.png,.jpg'
  },
  render: (args) => ({
    components: { DsFileUpload },
    setup: () => ({ args }),
    template: '<DsFileUpload v-bind="args" />'
  })
};

export const AllStates: Story = {
  name: 'All States',
  render: () => ({
    components: { DsFileUpload },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <DsFileUpload label="Upload basico" />
        <DsFileUpload label="Obrigatorio" required />
        <DsFileUpload label="Com erro" error="Arquivo invalido" />
        <DsFileUpload label="Desabilitado" disabled />
        <DsFileUpload label="Multiplos arquivos" multiple :max-files="3" />
        <DsFileUpload label="Formato especifico" accept=".pdf" hint="Apenas PDF" />
      </div>
    `
  })
};
