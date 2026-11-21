import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
  type RoleResolvable,
} from "discord.js";
import {
  getSelfAssignableRole,
  listSelfAssignableRoles,
  removeSelfAssignableRole,
  upsertSelfAssignableRole,
} from "../../../services/stores/roles/selfAssignableRoleStore.js";

export const data = new SlashCommandBuilder()
  .setName("roles")
  .setDescription("Choose self-assignable server roles")
  .addSubcommand((sub) => sub.setName("list").setDescription("List roles you can choose"))
  .addSubcommand((sub) =>
    sub
      .setName("choose")
      .setDescription("Give yourself a configured role")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("Role to add").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove one of your self-assignable roles")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("Role to remove").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("enable")
      .setDescription("Allow members to choose a role")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("Role members can choose").setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("description")
          .setDescription("Optional short label shown in /roles list")
          .setMaxLength(120),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("disable")
      .setDescription("Stop offering a self-assignable role")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("Role to disable").setRequired(true),
      ),
  );

export const group = "core";

function canManageRoles(interaction: ChatInputCommandInteraction): boolean {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles));
}

async function getSelectedRole(
  interaction: ChatInputCommandInteraction,
): Promise<Role | null> {
  const selected = interaction.options.getRole("role", true) as RoleResolvable;
  const roleId = typeof selected === "string" ? selected : selected.id;
  return (await interaction.guild?.roles.fetch(roleId).catch(() => null)) ?? null;
}

function memberHasRole(
  interaction: ChatInputCommandInteraction,
  roleId: string,
): boolean {
  const roles = (interaction.member as { roles?: unknown } | null)?.roles;
  if (Array.isArray(roles)) return roles.includes(roleId);
  if (roles && typeof roles === "object" && "cache" in roles) {
    const cache = (roles as { cache?: { has?: (id: string) => boolean } }).cache;
    return Boolean(cache?.has?.(roleId));
  }
  return false;
}

function roleProblem(role: Role): string | null {
  if (role.id === role.guild.id) return "The @everyone role cannot be self-assigned.";
  if (role.managed) return "Managed integration roles cannot be self-assigned.";
  if (!role.editable) {
    return "I cannot manage that role. Move my bot role above it and give me Manage Roles.";
  }
  return null;
}

async function requireGuild(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.guildId && interaction.guild) return true;
  await interaction.reply({
    content: "Role selection only works in a server.",
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

async function requireAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (canManageRoles(interaction)) return true;
  await interaction.reply({
    content: "You need Manage Roles to configure self-assignable roles.",
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const roles = listSelfAssignableRoles(interaction.guildId!);
  if (roles.length === 0) {
    await interaction.reply({
      content: "No self-assignable roles are configured yet.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const lines = roles.slice(0, 25).map((entry) => {
    const note = entry.description ? ` - ${entry.description}` : "";
    return `<@&${entry.roleId}>${note}`;
  });

  await interaction.reply({
    content: `Choose one with \`/roles choose role:@Role\`.\n\n${lines.join("\n")}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleChoose(interaction: ChatInputCommandInteraction): Promise<void> {
  const role = await getSelectedRole(interaction);
  if (!role) {
    await interaction.reply({
      content: "I could not find that role in this server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const configured = getSelfAssignableRole(interaction.guildId!, role.id);

  if (!configured) {
    await interaction.reply({
      content: "That role is not self-assignable. Use `/roles list` to see choices.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const problem = roleProblem(role);
  if (problem) {
    await interaction.reply({ content: problem, flags: MessageFlags.Ephemeral });
    return;
  }

  if (memberHasRole(interaction, role.id)) {
    await interaction.reply({
      content: `You already have **${role.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.guild!.members.addRole({
    user: interaction.user.id,
    role: role.id,
    reason: "Self-assignable role selected with /roles choose",
  });
  await interaction.reply({
    content: `Added **${role.name}** to you.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const role = await getSelectedRole(interaction);
  if (!role) {
    await interaction.reply({
      content: "I could not find that role in this server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const configured = getSelfAssignableRole(interaction.guildId!, role.id);

  if (!configured) {
    await interaction.reply({
      content: "That role is not managed by `/roles`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const problem = roleProblem(role);
  if (problem) {
    await interaction.reply({ content: problem, flags: MessageFlags.Ephemeral });
    return;
  }

  if (!memberHasRole(interaction, role.id)) {
    await interaction.reply({
      content: `You do not have **${role.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.guild!.members.removeRole({
    user: interaction.user.id,
    role: role.id,
    reason: "Self-assignable role removed with /roles remove",
  });
  await interaction.reply({
    content: `Removed **${role.name}** from you.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEnable(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireAdmin(interaction))) return;

  const role = await getSelectedRole(interaction);
  if (!role) {
    await interaction.reply({
      content: "I could not find that role in this server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const problem = roleProblem(role);
  if (problem) {
    await interaction.reply({ content: problem, flags: MessageFlags.Ephemeral });
    return;
  }

  const description = interaction.options.getString("description", false);
  upsertSelfAssignableRole({
    guildId: interaction.guildId!,
    roleId: role.id,
    description,
    createdBy: interaction.user.id,
  });

  await interaction.reply({
    content: `Members can now choose **${role.name}** with \`/roles choose\`.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleDisable(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireAdmin(interaction))) return;

  const role = await getSelectedRole(interaction);
  if (!role) {
    await interaction.reply({
      content: "I could not find that role in this server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const removed = removeSelfAssignableRole(interaction.guildId!, role.id);

  await interaction.reply({
    content: removed
      ? `**${role.name}** is no longer self-assignable. Existing members keep the role.`
      : `**${role.name}** was not configured as self-assignable.`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGuild(interaction))) return;

  const sub = interaction.options.getSubcommand();
  if (sub === "list") {
    await handleList(interaction);
  } else if (sub === "choose") {
    await handleChoose(interaction);
  } else if (sub === "remove") {
    await handleRemove(interaction);
  } else if (sub === "enable") {
    await handleEnable(interaction);
  } else if (sub === "disable") {
    await handleDisable(interaction);
  } else {
    await interaction.reply({
      content: "Unknown role action.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
