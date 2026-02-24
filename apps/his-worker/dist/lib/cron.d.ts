type CronLogger = {
    info?: (message: string, extra?: Record<string, unknown>) => void;
    warn?: (message: string, extra?: Record<string, unknown>) => void;
};
type StartCronInput = {
    name: string;
    intervalMs: number;
    runOnStart?: boolean;
    onTick: () => Promise<void>;
    logger?: CronLogger;
};
export type CronHandle = {
    stop: () => void;
};
export declare function startCron(input: StartCronInput): CronHandle;
export {};
//# sourceMappingURL=cron.d.ts.map