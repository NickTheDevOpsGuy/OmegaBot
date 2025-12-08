import fs from "fs";
import path from "path";

export async function loadCommands(client) {
  const basePath = path.join(process.cwd(), "src/commands");
  const groups = fs.readdirSync(basePath);

  for (const group of groups) {
    const groupPath = path.join(basePath, group);
    if (!fs.statSync(groupPath).isDirectory()) continue;

    const files = fs.readdirSync(groupPath);
    for (const file of files) {
      if (!file.endsWith(".js")) continue;

      const fullPath = path.join(groupPath, file);
      const mod = await import(fullPath);

      if (mod.data && mod.execute) {
        client.commands.set(mod.data.name, mod);
      }
    }
  }
}