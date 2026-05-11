export const obs = {
  span: {
    scheduler: {
      job: "situ.scheduler.job",
    },
    workItem: {
      handle: "situ.work_item.handle",
    },
    claude: {
      turn: "situ.claude.turn",
      session: {
        ensure: "situ.claude.session.ensure",
      },
      stream: {
        events: "situ.claude.stream.events",
      },
      tool: {
        execute: "situ.claude.tool.execute",
        sendResult: "situ.claude.tool.send_result",
      },
    },
  },
  log: {
    http: {
      requestFailed: "situ.http.request.failed",
    },
    sync: {
      pokeListenerFailed: "situ.sync.poke_listener.failed",
      replicachePokeStreamFailed: "situ.sync.replicache_poke_stream.failed",
    },
    scheduler: {
      jobFailed: "situ.scheduler.job.failed",
    },
    shutdown: {
      signalReceived: "situ.shutdown.signal_received",
      closeableFailed: "situ.shutdown.closeable.failed",
    },
    workItem: {
      leaseExtensionFailed: "situ.work_item.lease_extension.failed",
      computeHeartbeatFailed: "situ.work_item.compute_heartbeat.failed",
    },
    claude: {
      sessionReplaced: "situ.claude.session.replaced",
      toolFailed: "situ.claude.tool.failed",
    },
  },
  attr: {
    scheduler: {
      job: "situ.scheduler.job",
    },
    shutdown: {
      signal: "situ.shutdown.signal",
    },
    workItem: {
      id: "situ.work_item.id",
      purpose: "situ.work_item.purpose",
      attempt: "situ.work_item.attempt",
      targetKind: "situ.work_item.target_kind",
    },
    claude: {
      runId: "situ.claude.run.id",
      agentId: "situ.claude.agent.id",
      role: "situ.claude.agent.role",
      sessionId: "situ.claude.session.id",
      eventCount: "situ.claude.event.count",
      eventType: "situ.claude.event.type",
      assistantMessageCount: "situ.claude.assistant_message.count",
      assistantTextLength: "situ.claude.assistant_text.length",
      toolName: "situ.claude.tool.name",
      toolUseId: "situ.claude.tool_use.id",
      toolUseCount: "situ.claude.tool_use.count",
      toolResultIsError: "situ.claude.tool_result.is_error",
    },
  },
} as const;

type LeafValues<T> = T extends string
  ? T
  : T extends Readonly<Record<string, unknown>>
    ? { [K in keyof T]: LeafValues<T[K]> }[keyof T]
    : never;

export type SituSpanName = LeafValues<typeof obs.span>;
export type SituLogEvent = LeafValues<typeof obs.log>;
export type SituAttributeName = LeafValues<typeof obs.attr>;
