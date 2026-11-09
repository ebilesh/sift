import { readdir, realpath, lstat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
// Only the configured root and visible, direct child directories of home are selectable.
export async function availableRoots(defaultRoot, home = os.homedir()) {
  const canonical = await realpath(defaultRoot);
  const roots = [
    { id: "default", name: path.basename(canonical), path: canonical },
  ];
  let entries = [];
  try {
    entries = await readdir(home, { withFileTypes: true });
  } catch {
    return roots;
  }
  for (const entry of entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !entry.isSymbolicLink(),
    )
    .sort((a, b) => a.name.localeCompare(b.name))) {
    try {
      const filename = path.join(home, entry.name);
      const stat = await lstat(filename);
      if (stat.isSymbolicLink()) continue;
      const resolved = await realpath(filename);
      if (
        resolved === canonical ||
        path.dirname(resolved) !== (await realpath(home))
      )
        continue;
      roots.push({
        id: createHash("sha256").update(resolved).digest("hex").slice(0, 24),
        name: entry.name,
        path: resolved,
      });
    } catch {
      /* Folder may disappear between enumeration and inspection. */
    }
  }
  return roots;
}
