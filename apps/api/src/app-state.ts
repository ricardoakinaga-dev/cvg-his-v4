export type PersistenceMode = 'database' | 'in-memory' | 'not-initialized';

export interface AppState {
  persistenceMode: PersistenceMode;
  databaseConfigured: boolean;
  databaseHealthy: boolean;
  databaseDetail: string;
  repositoriesReady: boolean;
  repositoryCount: number;
  workerReady: boolean;
  workerDetail: string;
  productionReady: boolean;
  initialized: boolean;
}

let appState: AppState = {
  persistenceMode: 'not-initialized',
  databaseConfigured: false,
  databaseHealthy: false,
  databaseDetail: 'Not initialized',
  repositoriesReady: false,
  repositoryCount: 0,
  workerReady: false,
  workerDetail: 'Worker status not initialized',
  productionReady: false,
  initialized: false
};

export function setAppState(state: Partial<AppState>): void {
  appState = { ...appState, ...state };
}

export function getAppState(): AppState {
  return appState;
}

export function isAppInitialized(): boolean {
  return appState.initialized;
}

export function areRepositoriesReady(): boolean {
  return appState.repositoriesReady;
}

export function isProductionReady(): boolean {
  return appState.productionReady;
}

export function getPersistenceMode(): PersistenceMode {
  return appState.persistenceMode;
}
