import {
  SlashCommandBooleanOption,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "discord.js";

type PrivateOptionArgs = {
  description?: string;
};

type QueryOptionArgs = {
  autocomplete?: boolean;
  description?: string;
  maxLength?: number;
  minLength?: number;
  required?: boolean;
};

type LimitOptionArgs = {
  choices?: Array<{ name: string; value: number }>;
  description?: string;
  max?: number;
  min?: number;
  required?: boolean;
};

type UserOptionArgs = {
  description?: string;
  required?: boolean;
};

export function addPrivateOption(
  option: SlashCommandBooleanOption,
  args: PrivateOptionArgs = {},
): SlashCommandBooleanOption {
  return option
    .setName("private")
    .setDescription(args.description ?? "Only show to you")
    .setRequired(false);
}

export function addQueryOption(
  option: SlashCommandStringOption,
  args: QueryOptionArgs = {},
): SlashCommandStringOption {
  const configured = option
    .setName("query")
    .setDescription(args.description ?? "What are you looking for?")
    .setRequired(args.required ?? false);

  if (typeof args.minLength === "number") configured.setMinLength(args.minLength);
  if (typeof args.maxLength === "number") configured.setMaxLength(args.maxLength);
  if (args.autocomplete) configured.setAutocomplete(true);

  return configured;
}

export function addLimitOption(
  option: SlashCommandIntegerOption,
  args: LimitOptionArgs = {},
): SlashCommandIntegerOption {
  const configured = option
    .setName("limit")
    .setDescription(args.description ?? "How many to show")
    .setRequired(args.required ?? false);

  if (typeof args.min === "number") configured.setMinValue(args.min);
  if (typeof args.max === "number") configured.setMaxValue(args.max);
  if (args.choices?.length) configured.addChoices(...args.choices);

  return configured;
}

export function addUserOption(
  option: SlashCommandUserOption,
  args: UserOptionArgs = {},
): SlashCommandUserOption {
  return option
    .setName("user")
    .setDescription(args.description ?? "User")
    .setRequired(args.required ?? false);
}
