import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

export async function exportData(): Promise<void> {
  // Get data from Rust backend
  const json = await invoke<string>("export_data");

  const filePath = await save({
    defaultPath: `loikka-backup-${new Date().toISOString().split("T")[0]}.json`,
    filters: [
      {
        name: "JSON",
        extensions: ["json"],
      },
    ],
  });

  if (filePath) {
    await writeTextFile(filePath, json);
  }
}

export async function importData(): Promise<void> {
  const filePath = await open({
    filters: [
      {
        name: "JSON",
        extensions: ["json"],
      },
    ],
    multiple: false,
  });

  if (filePath && typeof filePath === "string") {
    const content = await readTextFile(filePath);

    // Import data via Rust backend
    await invoke<boolean>("import_data", { json: content });
  }
}
