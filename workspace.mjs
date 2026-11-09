import { createReadStream } from "node:fs";
import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export function decode(id = "") {
  const relative = Buffer.from(id, "base64url").toString();
  if (
    path.isAbsolute(relative) ||
    relative
      .split(/[\\/]/)
      .some((part) => part === ".." || part.startsWith(".")) ||
    relative.includes("\0")
  )
    throw new Error("Invalid path");
  return relative;
}
export async function safePath(root, relative) {
  const base = await realpath(root);
  const target = await realpath(path.resolve(base, relative));
  if (target !== base && !target.startsWith(base + path.sep))
    throw new Error("Outside workspace");
  return target;
}
export async function listFiles(root, relative = "") {
  const directory = await safePath(root, relative);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter(
        (entry) =>
          !entry.name.startsWith(".") &&
          !(relative === "" && entry.name === "downloads-os") &&
          !entry.isSymbolicLink(),
      )
      .map(async (entry) => {
        try {
          const relativePath = path.join(relative, entry.name);
          const stat = await lstat(path.join(directory, entry.name));
          if (stat.isSymbolicLink() || !(stat.isFile() || stat.isDirectory()))
            return null;
          return {
            id: Buffer.from(relativePath).toString("base64url"),
            name: entry.name,
            relativePath,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            created: stat.birthtime.toISOString(),
            folder: stat.isDirectory(),
            ext: path.extname(entry.name).slice(1).toLowerCase(),
          };
        } catch {
          return null;
        }
      }),
  );
  return files
    .filter(Boolean)
    .sort((a, b) => b.modified.localeCompare(a.modified));
}
// Breadth-first traversal has explicit bounds; symlink directories never enter the queue.
export async function walkFiles(
  root,
  relative = "",
  { limit = 20000, maxDepth = 24 } = {},
) {
  const queue = [{ relative, depth: 0 }];
  const files = [];
  let skipped = 0;
  let truncated = false;
  while (queue.length) {
    const current = queue.shift();
    let entries;
    try {
      entries = await listFiles(root, current.relative);
    } catch (error) {
      if (current.depth === 0) throw error;
      skipped++;
      continue;
    }
    for (const file of entries) {
      if (files.length >= limit) {
        truncated = true;
        break;
      }
      files.push(file);
      if (file.folder) {
        if (current.depth < maxDepth)
          queue.push({ relative: file.relativePath, depth: current.depth + 1 });
        else truncated = true;
      }
    }
    if (files.length >= limit) break;
  }
  return { files, truncated: truncated || queue.length > 0, skipped };
}
export async function findDuplicates(root, files, signal) {
  const buckets = new Map();
  for (const file of files.filter((file) => !file.folder)) {
    const bucket = buckets.get(file.size) || [];
    bucket.push(file);
    buckets.set(file.size, bucket);
  }
  const groups = [];
  let skipped = 0;
  let hashed = 0;
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    const hashes = new Map();
    for (const file of bucket) {
      if (signal?.aborted) throw new Error("Scan cancelled");
      try {
        const filename = await safePath(root, decode(file.id));
        const before = await lstat(filename);
        if (!before.isFile() || before.size !== file.size) {
          skipped++;
          continue;
        }
        const hash = crypto.createHash("sha256");
        for await (const chunk of createReadStream(filename, { signal }))
          hash.update(chunk);
        const after = await lstat(filename);
        if (after.mtimeMs !== before.mtimeMs || after.size !== before.size) {
          skipped++;
          continue;
        }
        const key = hash.digest("hex");
        const matches = hashes.get(key) || [];
        matches.push(file.id);
        hashes.set(key, matches);
        hashed++;
      } catch (error) {
        if (signal?.aborted) throw error;
        skipped++;
      }
    }
    for (const ids of hashes.values()) if (ids.length > 1) groups.push(ids);
  }
  return { groups, skipped, hashed };
}
