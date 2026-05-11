import { describe, expect, test } from "bun:test";

import type { ClaudeAgentRole } from "../roles";
import {
  claudeAgentToolDefinitionByName,
  claudeAgentToolDefinitionForRole,
  claudeAgentToolDefinitions,
  claudeAgentToolParamsForRole,
} from ".";

const recordToolTriples = [
  ["research_task", "get_research_task", "list_research_tasks", "search_research_tasks"],
  ["hypothesis", "get_hypothesis", "list_hypotheses", "search_hypotheses"],
  ["baseline", "get_baseline", "list_baselines", "search_baselines"],
  ["experiment", "get_experiment", "list_experiments", "search_experiments"],
  ["evaluation", "get_evaluation", "list_evaluations", "search_evaluations"],
  ["measurement", "get_measurement", "list_measurements", "search_measurements"],
  ["artifact", "get_artifact", "list_artifacts", "search_artifacts"],
  ["entity_link", "get_entity_link", "list_entity_links", "search_entity_links"],
  ["compute_target", "get_compute_target", "list_compute_targets", "search_compute_targets"],
] as const;

const transitionTools = [
  "accept_baseline",
  "submit_baseline",
  "complete_baseline",
  "cancel_baseline",
  "fail_baseline",
  "accept_experiment",
  "submit_experiment",
  "complete_experiment",
  "cancel_experiment",
  "fail_experiment",
  "accept_evaluation",
  "submit_evaluation",
  "complete_evaluation",
  "cancel_evaluation",
  "fail_evaluation",
  "submit_research_task_for_verification",
  "record_research_task_verification",
  "fail_research_task",
] as const;

const retiredHypothesisLifecycleTools = [
  "accept_hypothesis",
  "submit_hypothesis",
  "complete_hypothesis",
  "cancel_hypothesis",
  "fail_hypothesis",
  "add_hypothesis_comment",
] as const;

describe("Claude agent tool registry", () => {
  test("registers unique, executable custom tools", () => {
    const names = claudeAgentToolDefinitions.map((definition) => definition.name);
    expect(new Set(names).size).toBe(names.length);

    for (const definition of claudeAgentToolDefinitions) {
      expect(definition.type).toBe("custom");
      expect(definition.description.trim().length).toBeGreaterThan(0);
      expect(definition.roles.length).toBeGreaterThan(0);
      expect(definition.input_schema.type).toBe("object");
      expect(typeof definition.handler).toBe("function");
    }
  });

  test("exposes get/list/search tools for every durable record type", () => {
    const names = toolNameSet();

    for (const [, getTool, listTool, searchTool] of recordToolTriples) {
      expect(names.has(getTool)).toBe(true);
      expect(names.has(listTool)).toBe(true);
      expect(names.has(searchTool)).toBe(true);
    }
  });

  test("exposes comments and status transitions for verifier-owned science records", () => {
    const names = toolNameSet();

    for (const toolName of transitionTools) {
      expect(names.has(toolName)).toBe(true);
    }
    for (const toolName of [
      "add_baseline_comment",
      "add_experiment_comment",
      "add_evaluation_comment",
    ]) {
      expect(names.has(toolName)).toBe(true);
    }
  });

  test("keeps hypothesis lifecycle writes out of the agent tool surface", () => {
    const names = toolNameSet();
    const managerTools = roleToolNames({ role: "manager" });
    const verifierTools = roleToolNames({ role: "verifier" });

    expect(managerTools.has("create_hypothesis")).toBe(true);
    expect(roleToolNames({ role: "scientist" }).has("create_hypothesis")).toBe(true);

    for (const toolName of retiredHypothesisLifecycleTools) {
      expect(names.has(toolName)).toBe(false);
      expect(managerTools.has(toolName)).toBe(false);
      expect(verifierTools.has(toolName)).toBe(false);
    }
  });

  test("keeps the workspace surface bash-first", () => {
    const names = toolNameSet();

    expect(names.has("run_readonly_workspace_command")).toBe(true);
    expect(names.has("run_workspace_command")).toBe(true);
  });

  test("keeps read visibility broad and write visibility role-scoped", () => {
    const managerTools = roleToolNames({ role: "manager" });
    expect(managerTools.has("search_experiments")).toBe(true);
    expect(managerTools.has("list_artifacts")).toBe(true);
    expect(managerTools.has("ask_user_question")).toBe(true);
    expect(managerTools.has("create_project_baseline")).toBe(true);
    expect(managerTools.has("present_baseline_for_confirmation")).toBe(true);
    expect(managerTools.has("create_research_task")).toBe(true);
    expect(managerTools.has("get_planning_advice")).toBe(true);
    expect(managerTools.has("complete_research_project")).toBe(true);
    expect(managerTools.has("fail_research_project")).toBe(true);
    expect(managerTools.has("run_readonly_workspace_command")).toBe(true);
    expect(managerTools.has("run_workspace_command")).toBe(false);
    expect(managerTools.has("create_artifact")).toBe(false);
    expect(managerTools.has("record_measurement")).toBe(false);

    const scientistTools = roleToolNames({ role: "scientist" });
    for (const toolName of [
      "run_readonly_workspace_command",
      "run_workspace_command",
      "create_hypothesis",
      "create_baseline",
      "create_experiment",
      "create_evaluation",
      "record_measurement",
      "create_artifact",
      "create_entity_link",
      "submit_experiment",
      "submit_research_task_for_verification",
      "complete_experiment",
      "record_experiment_comparison",
      "get_compute_target",
      "list_compute_targets",
    ]) {
      expect(scientistTools.has(toolName)).toBe(true);
    }

    const verifierTools = roleToolNames({ role: "verifier" });
    expect(verifierTools.has("run_readonly_workspace_command")).toBe(true);
    expect(verifierTools.has("run_workspace_command")).toBe(false);
    expect(verifierTools.has("record_research_task_verification")).toBe(true);
    expect(verifierTools.has("complete_experiment")).toBe(false);
    expect(verifierTools.has("add_evaluation_comment")).toBe(false);
  });

  test("hides user-question tool from headless manager tool params", () => {
    const managerTools = roleToolNames({ role: "manager", executionMode: "headless" });

    expect(managerTools.has("ask_user_question")).toBe(false);
    expect(managerTools.has("create_project_baseline")).toBe(true);
    expect(managerTools.has("present_baseline_for_confirmation")).toBe(true);
    expect(managerTools.has("create_research_task")).toBe(true);
    expect(managerTools.has("fail_research_project")).toBe(true);
  });

  test("guides record-writing tools toward short human prose", () => {
    expect(
      toolInputDescription({ toolName: "create_research_task", fieldName: "workerPrompt" }),
    ).toContain("Compact worker checklist");
    expect(
      toolInputDescription({ toolName: "create_research_task", fieldName: "workerPrompt" }),
    ).toContain("For type verify this is the Verifier assignment");
    expect(
      toolInputDescription({ toolName: "create_research_task", fieldName: "workerPrompt" }),
    ).toContain("separate ResearchTasks");
    expect(toolInputDescription({ toolName: "create_artifact", fieldName: "path" })).toContain(
      "Optional local or logical artifact path",
    );
    expect(
      toolInputDescription({ toolName: "create_research_task", fieldName: "title" }),
    ).toContain("Natural human action title");
    expect(toolInputDescription({ toolName: "create_hypothesis", fieldName: "summary" })).toContain(
      "Compact human-sounding summary note",
    );
    expect(toolInputDescription({ toolName: "create_experiment", fieldName: "summary" })).toContain(
      "Compact human-sounding summary note",
    );
    expect(
      toolInputDescription({ toolName: "create_experiment", fieldName: "associatedHypothesisId" }),
    ).toContain("Required unless");
    expect(toolInputDescription({ toolName: "record_measurement", fieldName: "body" })).toContain(
      "Compact human-sounding measurement note",
    );
    expect(
      toolInputDescription({
        toolName: "submit_research_task_for_verification",
        fieldName: "evidenceSummary",
      }),
    ).toContain("Compact human-sounding evidence summary");
    expect(
      toolInputDescription({
        toolName: "record_research_task_verification",
        fieldName: "judgment",
      }),
    ).toContain("One short human-sounding evidence-backed judgment");
    expect(toolInputDescription({ toolName: "create_artifact", fieldName: "body" })).toContain(
      "human-sounding, sectioned, and evidence-backed",
    );
  });

  test("rejects role-scoped tool lookup for other roles", () => {
    expect(
      claudeAgentToolDefinitionForRole({
        name: "create_artifact",
        role: "manager",
      }),
    ).toBeUndefined();
    expect(
      claudeAgentToolDefinitionForRole({
        name: "create_artifact",
        role: "scientist",
      })?.name,
    ).toBe("create_artifact");
  });
});

function toolNameSet(): Set<string> {
  return new Set(claudeAgentToolDefinitions.map((definition) => definition.name));
}

function roleToolNames({
  role,
  executionMode,
}: {
  role: ClaudeAgentRole;
  executionMode?: "interactive" | "headless";
}): Set<string> {
  return new Set(
    claudeAgentToolParamsForRole({ role, executionMode }).map((definition) => definition.name),
  );
}

function toolInputDescription({
  toolName,
  fieldName,
}: {
  toolName: string;
  fieldName: string;
}): string {
  const definition = claudeAgentToolDefinitionByName({ name: toolName });
  const schema = definition?.input_schema as
    | { properties?: Record<string, { description?: string }> }
    | undefined;
  return schema?.properties?.[fieldName]?.description ?? "";
}
