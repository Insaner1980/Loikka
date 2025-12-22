import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

export async function exportData(): Promise<boolean> {
  // Get data from Rust backend
  console.log("1. Getting data from backend...");
  const json = await invoke<string>("export_data");
  console.log("2. Got data, length:", json?.length);

  console.log("3. Opening save dialog...");
  const filePath = await save({
    defaultPath: `loikka-backup-${new Date().toISOString().split("T")[0]}.json`,
    filters: [
      {
        name: "JSON",
        extensions: ["json"],
      },
    ],
  });
  console.log("4. Save dialog returned:", filePath);

  if (filePath) {
    console.log("5. Writing file...");
    try {
      await writeTextFile(filePath, json);
      console.log("6. File written successfully!");
      return true;
    } catch (err) {
      console.error("Write error:", err);
      throw err;
    }
  }
  console.log("5. No file path, user cancelled");
  return false;
}

export async function importData(): Promise<boolean> {
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
    return true;
  }
  return false;
}
