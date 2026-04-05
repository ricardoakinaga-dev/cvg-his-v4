import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: false,
    loading: false,
    pageTitle: ''
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    setLoading(loading: boolean) {
      this.loading = loading;
    },

    setPageTitle(title: string) {
      this.pageTitle = title;
    }
  }
});
