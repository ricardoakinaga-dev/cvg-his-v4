/**
 * Build Stamp - Rastreabilidade de build
 *
 * Este módulo expõe informações de build que são injetadas no momento da compilação.
 * Útil para debugging e verificação de versão em produção.
 */

export interface BuildStamp {
  buildId: string;
  gitSha: string;
  buildTime: string;
  env: string;
}

/**
 * Retorna o stamp de build atual
 * Valores são injetados via next.config.js no momento do build
 */
export function getBuildStamp(): BuildStamp {
  return {
    buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
    gitSha: process.env.NEXT_PUBLIC_GIT_SHA || 'unknown',
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
    env: process.env.NODE_ENV || 'development',
  };
}

/**
 * Formata o build stamp para exibição
 * Formato: "build: <build-id> | sha: <short-sha> | env: <environment>"
 */
export function formatBuildStamp(): string {
  const stamp = getBuildStamp();
  const shortSha = stamp.gitSha.substring(0, 7);
  return `build: ${stamp.buildId} | sha: ${shortSha} | env: ${stamp.env}`;
}

/**
 * Retorna informações completas de build para API
 */
export function getBuildInfo(): BuildStamp {
  return getBuildStamp();
}
