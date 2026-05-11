import { INSTRUCTIONS_BODY } from "./instructions-body";

export async function runInstructionsCommand({ argv }: { argv: string[] }): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: situ instructions");
    console.log();
    console.log("Print a guided skill body for an AI coding agent (e.g. Claude Code) to follow,");
    console.log("covering Anthropic key setup, choosing a target directory, launching situ, and");
    console.log("streaming live status from the event log.");
    return 0;
  }
  process.stdout.write(INSTRUCTIONS_BODY);
  return 0;
}
