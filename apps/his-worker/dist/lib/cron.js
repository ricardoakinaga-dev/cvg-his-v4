export function startCron(input) {
    let stopped = false;
    let running = false;
    const runTick = async () => {
        if (stopped) {
            return;
        }
        if (running) {
            input.logger?.warn?.('cron tick skipped: previous run still in progress', {
                cron: input.name
            });
            return;
        }
        running = true;
        try {
            await input.onTick();
        }
        catch (error) {
            input.logger?.warn?.('cron tick failed', {
                cron: input.name,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        finally {
            running = false;
        }
    };
    if (input.runOnStart) {
        void runTick();
    }
    const timer = setInterval(() => {
        void runTick();
    }, input.intervalMs);
    input.logger?.info?.('cron started', {
        cron: input.name,
        intervalMs: input.intervalMs,
        runOnStart: Boolean(input.runOnStart)
    });
    return {
        stop() {
            stopped = true;
            clearInterval(timer);
            input.logger?.info?.('cron stopped', {
                cron: input.name
            });
        }
    };
}
//# sourceMappingURL=cron.js.map