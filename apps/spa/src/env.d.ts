declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly NODE_ENV?: 'development' | 'test' | 'staging' | 'production' | 'prod' | 'stage';
  readonly VITE_APP_NAME?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PROXY_API_TARGET?: string;
  readonly VITE_DISABLE_PWA?: '0' | '1' | 'true' | 'false';
  readonly VITE_ACCOUNT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
