import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import type { JsonRpcId, JsonRpcNotification, JsonRpcResponse } from "@almanac/protocol";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type NotificationHandler = (notification: JsonRpcNotification) => void;

export class StdioJsonRpcClient {
  private nextId = 1;
  private pending = new Map<JsonRpcId, PendingRequest>();
  private notificationHandlers = new Set<NotificationHandler>();

  constructor(private readonly child: ChildProcessWithoutNullStreams) {
    const lines = createInterface({ input: child.stdout });

    lines.on("line", (line) => {
      this.handleLine(line);
    });

    child.on("exit", (code, signal) => {
      const reason = signal ? `signal ${signal}` : `code ${code ?? "unknown"}`;
      this.rejectAll(new Error(`JSON-RPC process exited with ${reason}`));
    });
  }

  static spawn(command: string, args: string[], cwd: string): StdioJsonRpcClient {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    return new StdioJsonRpcClient(child);
  }

  request<TResult, TParams = unknown>(method: string, params?: TParams): Promise<TResult> {
    const id = String(this.nextId++);
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as TResult),
        reject,
      });

      this.child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (!error) {
          return;
        }

        this.pending.delete(id);
        reject(error);
      });
    });
  }

  onNotification(handler: NotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => {
      this.notificationHandlers.delete(handler);
    };
  }

  close(): void {
    this.child.stdin.end();
    this.child.kill();
  }

  private handleLine(line: string): void {
    let message: JsonRpcResponse | JsonRpcNotification;
    try {
      message = JSON.parse(line) as JsonRpcResponse | JsonRpcNotification;
    } catch (error) {
      this.rejectAll(new Error(`invalid JSON-RPC response: ${String(error)}`));
      return;
    }

    if ("method" in message && !("id" in message)) {
      for (const handler of this.notificationHandlers) {
        handler(message);
      }
      return;
    }

    const response = message as JsonRpcResponse;
    const id = response.id ?? null;
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }

    this.pending.delete(id);

    if (response.error) {
      pending.reject(new Error(response.error.message));
      return;
    }

    pending.resolve(response.result);
  }

  private rejectAll(error: Error): void {
    for (const request of this.pending.values()) {
      request.reject(error);
    }
    this.pending.clear();
  }
}
