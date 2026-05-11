import { cac } from "cac";
import type { CommandLineOptionValue } from "./option-value";

export type CommandLineOptionDefinition = Readonly<{
  rawName: string;
  description?: string;
}>;

export type CommandLineParsedOptions = Readonly<{
  options: Readonly<Record<string, CommandLineOptionValue>>;
  positionals: readonly string[];
}>;

export function parseOptions({
  argv,
  commandName,
  options,
}: {
  argv: string[];
  commandName: string;
  options: readonly CommandLineOptionDefinition[];
}): CommandLineParsedOptions {
  let parsedOptions: CommandLineParsedOptions | undefined;
  const cli = cac(commandName);
  const command = cli.command("[...positionals]");
  for (const option of options) {
    command.option(option.rawName, option.description ?? "");
  }
  command.action((positionals: string[], values: Record<string, CommandLineOptionValue>) => {
    parsedOptions = {
      options: values,
      positionals,
    };
  });

  cli.parse(["bun", commandName, ...argv]);
  if (!parsedOptions) {
    throw new Error(`failed to parse ${commandName} options`);
  }
  return parsedOptions;
}
