import {
  context,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
  type SpanOptions,
} from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

import { observabilityServiceName, otlpTraceEndpoint } from "../config/observability";
import { installInfo } from "../config/install-info";
import type { SituSpanName } from "./names";

export type ObservabilityRuntime = Readonly<{
  close: () => Promise<void>;
}>;

export type SpanFnInput = Readonly<{
  span: Span;
}>;

let sdk: NodeSDK | undefined;

export function initObservability(): ObservabilityRuntime {
  if (sdk) {
    return { close: shutdownObservability };
  }

  const endpoint = otlpTraceEndpoint();
  if (!endpoint) {
    return { close: async () => {} };
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: observabilityServiceName,
      [ATTR_SERVICE_VERSION]: installInfo().version,
    }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint }))],
  });
  sdk.start();
  return { close: shutdownObservability };
}

async function shutdownObservability(): Promise<void> {
  if (!sdk) {
    return;
  }
  const activeSdk = sdk;
  sdk = undefined;
  await activeSdk.shutdown();
}

function tracer({ name = "situ" }: { name?: string } = {}): ReturnType<typeof trace.getTracer> {
  return trace.getTracer(name);
}

export async function withSpan<T>({
  name,
  attributes,
  options,
  fn,
}: {
  name: SituSpanName;
  attributes?: Attributes;
  options?: SpanOptions;
  fn: (input: SpanFnInput) => Promise<T>;
}): Promise<T> {
  const span = tracer().startSpan(name, { ...options, attributes });
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn({ span });
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
