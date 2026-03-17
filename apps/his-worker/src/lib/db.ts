import { closeDbConnection, db } from '@cvg-his/db';

export const workerDb = db;

export { closeDbConnection };

export type WorkerDb = typeof db;
export type WorkerPgClient = typeof db.$client;
