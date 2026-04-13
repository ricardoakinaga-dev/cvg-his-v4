import { randomUUID } from 'node:crypto';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT
} from '@opentelemetry/semantic-conventions';

export interface ApiObservabilityOptions {
  readonly enabled: boolean;
  readonly serviceName: string;
  readonly environment: string;
  readonly serviceVersion: string;
  readonly otlpProtocol: string;
  readonly otlpTracesEndpoint?: string;
  readonly otlpHeaders: Readonly<Record<string, string>>;
}

export interface ObservabilityRuntime {
  readonly enabled: boolean;
  readonly exporter: 'otlp-http' | 'disabled';
  readonly endpoint?: string;
  shutdown(): Promise<void>;
}

export async function startApiObservability(
  options: ApiObservabilityOptions
): Promise<ObservabilityRuntime> {
  if (!options.enabled) {
    return {
      enabled: false,
      exporter: 'disabled',
      async shutdown() {}
    };
  }

  if (options.otlpProtocol !== 'http/protobuf') {
    throw new Error(
      `Unsupported OTLP protocol for API observability: ${options.otlpProtocol}`
    );
  }

  if (!options.otlpTracesEndpoint) {
    throw new Error(
      'OTLP traces endpoint is required when API observability is enabled'
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
