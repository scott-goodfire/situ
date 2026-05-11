import { isHelpFlag } from "./is-help-flag";
import { booleanOption, optionalStringOption } from "./option-value";
import { parseOptions } from "./parse-options";
import { portNumber } from "./port-number";
import { positiveInteger } from "./positive-integer";
import { requireValue } from "./require-value";

export const commandLineModule = {
  booleanOption,
  isHelpFlag,
  optionalStringOption,
  parseOptions,
  portNumber,
  positiveInteger,
  requireValue,
} as const;
