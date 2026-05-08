import type { JsonRpcNotification } from "@situ/protocol";

type NotificationHandler = (notification: JsonRpcNotification) => void;

type RpcResponse<TResult> =
  | { result: TResult; error?: never }
  | { result?: never; error: { message: string } };

type HttpJsonRpcClientOptions = {
  baseUrl: string;
  token?: string;
  workspace?: string;
  projectId?: string;
};

type JsonRpcRequestOptions<TParams> = {
  method: string;
  params?: TParams;
};

export class HttpJsonRpcClient {
  private notificationAbort: AbortController | null = null;
  private notificationHandlers = new Set<NotificationHandler>();
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly workspace: string | undefined;
  private readonly projectId: string | undefined;

  constructor({ baseUrl, token, workspace, projectId }: HttpJsonRpcClientOptions) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.workspace = workspace;
    this.projectId = projectId;
  }

  async health(): Promise<boolean> {
    const url = new URL("/health", this.baseUrl);
    this.applyScopeQuery({ url });
    const response = await fetch(url, {
      headers: this.authHeaders(),
    });
    return response.ok;
  }

  async request<TResult, TParams = unknown>({
    method,
    params,
  }: JsonRpcRequestOptions<TParams>): Promise<TResult> {
    const response = await fetch(new URL("/rpc", this.baseUrl), {
      method: "POST",
      headers: {
        ...this.authHeaders(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        method,
        params,
        workspace: this.workspace,
        project_id: this.projectId,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as RpcResponse<TResult>;
    if ("error" in payload && payload.error) {
      throw new Error(payload.error.message);
    }
    return payload.result;
  }

  onNotification({ handler }: { handler: NotificationHandler }): () => void {
    this.notificationHandlers.add(handler);
    if (!this.notificationAbort) {
      this.startNotifications();
    }

    return () => {
      this.notificationHandlers.delete(handler);
      if (this.notificationHandlers.size === 0) {
        this.notificationAbort?.abort();
        this.notificationAbort = null;
      }
    };
  }

  close(): void {
    this.notificationAbort?.abort();
    this.notificationAbort = null;
    this.notificationHandlers.clear();
  }

  reconnectNotifications(): void {
    this.notificationAbort?.abort();
    this.notificationAbort = null;
    if (this.notificationHandlers.size > 0) {
      this.startNotifications();
    }
  }

  private authHeaders(): Record<string, string> {
    return this.token ? { authorization: `Bearer ${this.token}` } : {};
  }

  private applyScopeQuery({ url }: { url: URL }): void {
    if (this.workspace) {
      url.searchParams.set("workspace", this.workspace);
    }
    if (this.projectId) {
      url.searchParams.set("project_id", this.projectId);
    }
  }

  private startNotifications(): void {
    const abort = new AbortController();
    this.notificationAbort = abort;

    const url = new URL("/events", this.baseUrl);
    if (this.token) {
      url.searchParams.set("token", this.token);
    }
    this.applyScopeQuery({ url });

    void this.readEventStream({
      url,
      signal: abort.signal,
    }).catch((error: unknown) => {
      if (abort.signal.aborted) {
        return;
      }
      if (this.notificationAbort === abort) {
        this.notificationAbort = null;
      }

      const message = errorMessage({ error });

      for (const handler of this.notificationHandlers) {
        handler({
          method: "client.error",
          params: { message },
        });
      }
    });
  }

  private async readEventStream({
    url,
    signal,
  }: {
    url: URL;
    signal: AbortSignal;
  }): Promise<void> {
    const response = await fetch(url, { signal });
    if (!response.ok || !response.body) {
      throw new Error(`event stream failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) {
        throw new Error("event stream closed");
      }
      buffer += decoder.decode(value, { stream: true });

      let splitIndex = buffer.indexOf("\n\n");
      while (splitIndex !== -1) {
        const rawEvent = buffer.slice(0, splitIndex);
        buffer = buffer.slice(splitIndex + 2);
        this.dispatchRawEvent({ rawEvent });
        splitIndex = buffer.indexOf("\n\n");
      }
    }
  }

  private dispatchRawEvent({ rawEvent }: { rawEvent: string }): void {
    const dataLines = rawEvent
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart());
    if (dataLines.length === 0) {
      return;
    }

    const notification = JSON.parse(dataLines.join("\n")) as JsonRpcNotification;
    for (const handler of this.notificationHandlers) {
      handler(notification);
    }
  }
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
