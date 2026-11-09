import { open } from "node:fs/promises";
import { decode, safePath, walkFiles, listFiles } from "./workspace.mjs";
const extensions = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "css",
  "html",
  "xml",
  "yaml",
  "yml",
  "log",
  "sh",
  "java",
  "c",
  "cpp",
  "rs",
  "go",
  "toml",
  "sql",
]);
export async function searchContents(
  root,
  relative,
  recursive,
  query,
  { maxFiles = 2000, maxBytes = 32_000_000, perFile = 64000, signal } = {},
) {
  if (!query.trim() || query.length > 200)
    throw Error("Search text must be 1–200 characters");
  const index = recursive
    ? await walkFiles(root, relative)
    : { files: await listFiles(root, relative), truncated: false, skipped: 0 };
  const candidates = index.files.filter(
    (file) => !file.folder && extensions.has(file.ext),
  );
  const matches = [];
  let inspected = 0,
    totalBytes = 0,
    skipped = index.skipped;
  for (const file of candidates) {
    if (signal?.aborted) throw Error("Search cancelled");
    if (inspected >= maxFiles || totalBytes >= maxBytes) break;
    let handle;
    try {
      handle = await open(await safePath(root, decode(file.id)), "r");
      const buffer = Buffer.alloc(Math.min(perFile, maxBytes - totalBytes));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      totalBytes += bytesRead;
      inspected++;
      const text = buffer.subarray(0, bytesRead).toString("utf8");
      const at = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
      if (at >= 0)
        matches.push({
          ...file,
          snippet: text
            .slice(Math.max(0, at - 45), at + query.length + 90)
            .replace(/\s+/g, " "),
        });
    } catch {
      skipped++;
    } finally {
      await handle?.close();
    }
  }
  return {
    matches,
    inspected,
    skipped,
    partial:
      index.truncated ||
      inspected + skipped < candidates.length ||
      candidates.some((file) => file.size > perFile),
    bytesRead: totalBytes,
  };
}
