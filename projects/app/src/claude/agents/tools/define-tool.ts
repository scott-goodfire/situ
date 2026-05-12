import { createDefineTool } from "@situ/agent-tools";

import type { ClaudeAgentRole } from "../roles";
import type { ClaudeAgentToolContext } from "./types";

export const defineTool = createDefineTool<ClaudeAgentRole, ClaudeAgentToolContext>();
