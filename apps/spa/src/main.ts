import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './app/App.vue';
import { router } from './router';
import '@cvg-his-v2/design-system/src/tokens/variables.css';
import './styles/main.css';

const disablePwa =
  import.meta.env.VITE_DISABLE_PWA === '1' ||
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

if (disablePwa && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  });

  if ('caches' in window) {
    void caches.keys().then((keys) => {
      for (const key of keys) {
        void caches.delete(key);
      }
    });
  }
}

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.mount('#app');
