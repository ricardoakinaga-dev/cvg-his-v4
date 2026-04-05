import { config } from '@vue/test-utils';

config.global.stubs = {
  RouterLink: true,
  DsAlert: {
    template: '<div class="ds-alert-stub" role="alert"><slot /></div>'
  },
  DsSpinner: true
};
