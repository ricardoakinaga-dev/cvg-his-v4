import { nowIso } from "@cvg-his-v2/shared-utils";

export interface LogContext {
  readonly service?: string;
  readonly correlationId?: string;
  readonly [key: string]: unknown;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

function write(level: "INFO" | "ERROR", message: string, context?: LogContext) {
  const payload = {
    level,
    message,
    timestamp: nowIso(),
    ...context,
  };

  const line = JSON.stringify(payload);
  if (level === "ERROR") {
    console.error(line);
    return;
  }

  console.log(line);
}

export function createLogger(service: string): Logger {
  return {
    info(message, context) {
      write("INFO", message, { service, ...context });
    },
    error(message, context) {
      write("ERROR", message, { service, ...context });
    },
  };
}
