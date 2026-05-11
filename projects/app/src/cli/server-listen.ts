const defaultPortFallbackAttempts = 50;

type ServeFetch = (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response>;
type ServeResult = ReturnType<typeof Bun.serve>;

export function serveWithPortFallback({
  hostname,
  port,
  fetch,
  idleTimeout,
  allowPortFallback,
  maxAttempts = defaultPortFallbackAttempts,
}: {
  hostname: string;
  port: number;
  fetch: ServeFetch;
  idleTimeout?: number;
  allowPortFallback: boolean;
  maxAttempts?: number;
}): ServeResult {
  const attempts = allowPortFallback ? Math.max(1, maxAttempts) : 1;
  const lastPort = Math.min(65535, port + attempts - 1);
  let lastError: unknown;

  for (let candidatePort = port; candidatePort <= lastPort; candidatePort += 1) {
    try {
      const serveOptions = {
        hostname,
        port: candidatePort,
        fetch,
        ...(idleTimeout === undefined ? {} : { idleTimeout }),
      };
      return Bun.serve(serveOptions);
    } catch (error) {
      if (!allowPortFallback || !isPortInUseError({ error })) {
        throw error;
      }
      lastError = error;
    }
  }

  throw new Error(
    `No available port found for ${hostname}:${port}-${lastPort}. Last error: ${errorMessage({
      error: lastError,
    })}`,
  );
}

function isPortInUseError({ error }: { error: unknown }): boolean {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE";
}

function errorMessage({ error }: { error: unknown }): string {
  return error instanceof Error ? error.message : String(error);
}
