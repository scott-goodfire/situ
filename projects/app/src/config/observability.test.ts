import { afterEach, describe, expect, test } from "bun:test";

import { isOtlpTracingEnabled, observabilityServiceName, otlpTraceEndpoint } from "./observability";

const originalEnv = {
  SITU_OTEL_EXPORTER_OTLP_ENDPOINT: process.env.SITU_OTEL_EXPORTER_OTLP_ENDPOINT,
};

describe("observability config", () => {
  afterEach(() => {
    setEnv("SITU_OTEL_EXPORTER_OTLP_ENDPOINT", originalEnv.SITU_OTEL_EXPORTER_OTLP_ENDPOINT);
  });

  test("turns tracing on only when an OTLP endpoint is configured", () => {
    delete process.env.SITU_OTEL_EXPORTER_OTLP_ENDPOINT;

    expect(otlpTraceEndpoint()).toBeUndefined();
    expect(isOtlpTracingEnabled()).toBe(false);

    process.env.SITU_OTEL_EXPORTER_OTLP_ENDPOINT = " http://localhost:4318/v1/traces ";

    expect(otlpTraceEndpoint()).toBe("http://localhost:4318/v1/traces");
    expect(isOtlpTracingEnabled()).toBe(true);
  });

  test("uses the fixed Situ service name", () => {
    expect(observabilityServiceName).toBe("situ");
  });
});

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
