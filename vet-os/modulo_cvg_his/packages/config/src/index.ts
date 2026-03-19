export type AppConfig = {
  nodeEnv: string;
  logLevel: string;
};

export const defaultConfig: AppConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info'
};
