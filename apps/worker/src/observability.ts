import { randomUUID } from 'node:crypto';

import { SpanStatusCode, trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT
} from '@opentelemetry/semantic-conventions';

export interface WorkerObservabilityOptions {
  readonly enabled: boolean;
  readonly serviceName: string;
  readonly environment: string;
  readonly serviceVersion: string;
  readonly otlpProtocol: string;
  readonly otlpTracesEndpoint?: string;
  readonly otlpHeaders: Readonly<Record<string, string>>;
}

export interface WorkerObservabilityRuntime {
  readonly enabled: boolean;
  readonly exporter: 'otlp-http' | 'disabled';
  readonly endpoint?: string;
  shutdown(): Promise<void>;
}

export async function startWorkerObservability(
  options: WorkerObservabilityOptions
): Promise<WorkerObservabilityRuntime> {
  if (!options.enabled) {
    return {
      enabled: false,
      exporter: 'disabled',
      async shutdown() {}
    };
  }

  if (options.otlpProtocol !== 'http/protobuf') {
    throw new Error(
      `Unsupported OTLP protocol for worker observability: ${options.otlpProtocol}`
    );
  }

  if (!options.otlpTracesEndpoint) {
    throw new Error(
      'OTLP traces endpoint is required when worker observability is enabled'
    );
  }

  const traceExporter = new OTLPTraceExporter({
    url: options.otlpTracesEndpoint,
    headers: options.otlpHeaders
  });

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: options.serviceName,
      [ATTR_SERVICE_VERSION]: options.serviceVersion,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: options.environment,
      [ATTR_SERVICE_INSTANCE_ID]: `${options.serviceName}-${process.pid}-${randomUUID()}`
    }),
    traceExporter
  });

  await Promise.resolve(sdk.start());

  return {
    enabled: true,
    exporter: 'otlp-http',
    endpoint: options.otlpTracesEndpoint,
    shutdown: async () => {
      await sdk.shutdown();
    }
  };
}

export async function withWorkerSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  return await trace
    .getTracer('cvg-his-v2.worker')
    .startActiveSpan(name, { attributes }, async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        span.end();
      }
    });
}
