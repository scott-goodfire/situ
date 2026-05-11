export const observabilityServiceName = "situ";

export function otlpTraceEndpoint(): string | undefined {
  return process.env.SITU_OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || undefined;
}

export function isOtlpTracingEnabled(): boolean {
  return otlpTraceEndpoint() !== undefined;
}
