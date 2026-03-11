// src/commands/fun/fun.ts
// Fun command: definition, autocomplete (autocomplete.ts), execute (execute.ts).

import { buildFunCommand } from "./funSubcommands/index.js";
import { autocomplete as funAutocomplete } from "./autocomplete.js";
import { execute as funExecute } from "./execute.js";

export const data = buildFunCommand();

export const autocomplete = funAutocomplete;
export const execute = funExecute;
