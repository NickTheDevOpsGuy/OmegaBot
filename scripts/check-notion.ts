import { env } from "../src/config/env.js";
import {
  createNotionClient,
  getNotionDatabaseStatus,
} from "../src/services/integrations/notion/notionWiki.js";

async function main(): Promise<void> {
  const { token, databaseId } = env.requireNotionConfig();
  const status = await getNotionDatabaseStatus({
    client: createNotionClient(token),
    databaseId,
  });

  console.log("Notion database check passed");
  console.log(`Database ID: ${databaseId}`);
  console.log(`Database title: ${status.databaseTitle ?? "(untitled database)"}`);
  console.log(`Data source ID: ${status.dataSourceId}`);
  console.log(`Title property: ${status.titleProperty}`);
  console.log(
    `Tag property: ${
      status.tagProperty
        ? `${status.tagProperty.name} (${status.tagProperty.type})`
        : "(not detected)"
    }`,
  );
}

main().catch((err: unknown) => {
  console.error("Notion database check failed");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
