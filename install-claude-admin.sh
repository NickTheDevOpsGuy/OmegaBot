#!/bin/bash

set -e

echo "🚀 Installing Claude API & Admin Commands"
echo "=========================================="
echo ""

if [ ! -f "package.json" ]; then
    echo "❌ Run from OmegaBot root"
    exit 1
fi

# ============================================================
# Step 1: Install Anthropic SDK
# ============================================================
echo "1. Installing @anthropic-ai/sdk..."
npm install @anthropic-ai/sdk

# ============================================================
# Step 2: Create Claude Service
# ============================================================
echo ""
echo "2. Creating Claude API service..."

mkdir -p src/services/ai

cat > src/services/ai/claudeService.ts << 'CLAUDEEOF'
// src/services/ai/claudeService.ts
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../../utils/logger.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Call Claude API for text generation
 */
export async function callClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const {
    systemPrompt = "You are a helpful assistant.",
    maxTokens = 4096,
    temperature = 1.0,
  } = options;

  try {
    logger.info({ promptLength: prompt.length }, "Calling Claude API");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find((block) => block.type === "text");
    
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    logger.info(
      {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
      "Claude API call successful"
    );

    return textContent.text;
  } catch (error) {
    logger.error({ error }, "Claude API call failed");
    throw new Error("Failed to get response from Claude");
  }
}

/**
 * Summarize GitHub commit history
 */
export async function summarizeCommitHistory(commits: string): Promise<string> {
  const systemPrompt = \`You are a helpful assistant that summarizes git commit history. 
Be concise and focus on the most important changes. 
Group related commits together and highlight breaking changes or major features.\`;

  const prompt = \`Summarize the following commit history. Focus on major changes, features, and fixes:

\${commits}

Provide a clear, organized summary in bullet points.\`;

  return callClaude(prompt, {
    systemPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });
}

/**
 * Summarize GitHub PR/issue discussion
 */
export async function summarizeDiscussion(
  title: string,
  body: string,
  comments: string
): Promise<string> {
  const systemPrompt = \`You are a helpful assistant that summarizes GitHub discussions. 
Be objective and highlight key decisions, concerns, and action items.\`;

  const prompt = \`Summarize this GitHub discussion:

**Title:** \${title}

**Description:**
\${body}

**Comments:**
\${comments}

Provide a concise summary covering:
1. Main topic/purpose
2. Key points discussed
3. Decisions made (if any)
4. Action items or next steps\`;

  return callClaude(prompt, {
    systemPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });
}
CLAUDEEOF

echo "✓ Created src/services/ai/claudeService.ts"

# ============================================================
# Step 3: Create Admin Command
# ============================================================
echo ""
echo "3. Creating admin command..."

mkdir -p src/commands/admin

cat > src/commands/admin/admin.ts << 'ADMINEOF'
// src/commands/admin/admin.ts
import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../utils/logger.js";
import { getDb } from "../../services/database/db.js";
import { getFunUsageSnapshot } from "../../services/fun/funUsageStore.js";
import { EmbedColors } from "../../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Admin commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription("Show bot statistics (uptime, database, commands)")
  )
  .addSubcommand((sub) =>
    sub.setName("health").setDescription("Check bot and service health")
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  await interaction.deferReply();

  try {
    if (subcommand === "stats") {
      await handleStats(interaction);
    } else if (subcommand === "health") {
      await handleHealth(interaction);
    } else {
      await interaction.editReply("Unknown subcommand");
    }
  } catch (error) {
    logger.error({ error, subcommand }, "[admin] Command failed");
    await interaction.editReply("❌ Something went wrong");
  }
}

async function handleStats(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const db = getDb();

  // Get database stats
  const jokeCount = db.prepare("SELECT COUNT(*) as count FROM jokes").get() as {
    count: number;
  };

  const coinFlipCount = db
    .prepare("SELECT COUNT(*) as count FROM coin_flips")
    .get() as { count: number };

  // Get fun command usage
  const funUsage = await getFunUsageSnapshot();
  const totalCommands = Object.values(funUsage.totalsByCommand).reduce(
    (sum, count) => sum + count,
    0
  );

  // Calculate uptime
  const uptimeSeconds = process.uptime();
  const uptimeDays = Math.floor(uptimeSeconds / 86400);
  const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

  // Memory usage
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

  const embed = new EmbedBuilder()
    .setTitle("🤖 Bot Statistics")
    .setColor(EmbedColors.Info)
    .addFields(
      {
        name: "⏱️ Uptime",
        value: \`\${uptimeDays}d \${uptimeHours}h \${uptimeMinutes}m\`,
        inline: true,
      },
      {
        name: "💾 Memory",
        value: \`\${memUsedMB}MB / \${memTotalMB}MB\`,
        inline: true,
      },
      {
        name: "📊 Total Commands",
        value: totalCommands.toString(),
        inline: true,
      },
      {
        name: "🎭 Jokes",
        value: jokeCount.count.toString(),
        inline: true,
      },
      {
        name: "🪙 Coin Flips",
        value: coinFlipCount.count.toString(),
        inline: true,
      },
      {
        name: "👥 Unique Users",
        value: Object.keys(funUsage.totalsByUser).length.toString(),
        inline: true,
      }
    )
    .setFooter({ text: \`Node \${process.version}\` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  logger.info(
    { userId: interaction.user.id },
    "Admin viewed bot statistics"
  );
}

async function handleHealth(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const checks: { name: string; status: string; details?: string }[] = [];

  // Check database
  try {
    const db = getDb();
    db.prepare("SELECT 1").get();
    checks.push({ name: "Database", status: "✅ Healthy" });
  } catch (error) {
    checks.push({
      name: "Database",
      status: "❌ Error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Check environment variables
  const requiredEnvVars = [
    "DISCORD_TOKEN",
    "DISCORD_APP_ID",
    "GITHUB_TOKEN",
    "GITHUB_REPO_OWNER",
    "GITHUB_REPO_NAME",
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length === 0) {
    checks.push({ name: "Environment", status: "✅ All vars set" });
  } else {
    checks.push({
      name: "Environment",
      status: "⚠️ Missing vars",
      details: missingVars.join(", "),
    });
  }

  // Check API keys
  const optionalKeys = [
    { name: "Anthropic API", key: "ANTHROPIC_API_KEY" },
    { name: "Weather API", key: "WEATHER_API_KEY" },
  ];

  optionalKeys.forEach(({ name, key }) => {
    if (process.env[key]) {
      checks.push({ name, status: "✅ Configured" });
    } else {
      checks.push({ name, status: "⚠️ Not configured" });
    }
  });

  const embed = new EmbedBuilder()
    .setTitle("🏥 Health Check")
    .setColor(EmbedColors.Info)
    .setDescription(
      checks
        .map((c) =>
          c.details
            ? \`**\${c.name}:** \${c.status}\\n  \${c.details}\`
            : \`**\${c.name}:** \${c.status}\`
        )
        .join("\\n\\n")
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  logger.info({ userId: interaction.user.id }, "Admin viewed health check");
}
ADMINEOF

echo "✓ Created src/commands/admin/admin.ts"

# ============================================================
# Step 4: Update .env.example
# ============================================================
echo ""
echo "4. Updating .env.example..."

if ! grep -q "ANTHROPIC_API_KEY" .env.example 2>/dev/null; then
  cat >> .env.example << 'ENVEOF'

# ============================================================
# Claude AI (Optional)
# ============================================================
# Get your API key from: https://console.anthropic.com/
# Used for: /gh history, /gh summary (AI-powered summaries)
ANTHROPIC_API_KEY=
ENVEOF
  echo "✓ Added ANTHROPIC_API_KEY to .env.example"
else
  echo "✓ ANTHROPIC_API_KEY already in .env.example"
fi

# ============================================================
# Done!
# ============================================================
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✅ Installation Complete!                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Add your Anthropic API key to .env:"
echo "   ANTHROPIC_API_KEY=sk-ant-..."
echo "   Get it from: https://console.anthropic.com/"
echo ""
echo "2. Build and register:"
echo "   npm run build"
echo "   npm run register"
echo "   npm start"
echo ""
echo "3. Try the new commands:"
echo "   /admin stats     - Bot statistics"
echo "   /admin health    - Health check"
echo ""
echo "📝 Next: Update /gh history and /gh summary to use Claude"
echo ""
