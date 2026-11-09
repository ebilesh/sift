import http from "node:http";
import { searchContents } from "./content-search.mjs";
import { availableRoots } from "./roots.mjs";
import { lstat, open } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  decode,
  safePath,
  listFiles,
  walkFiles,
  findDuplicates,
} from "./workspace.mjs";
export { listFiles } from "./workspace.mjs";
const defaultRoot =
  process.env.DOWNLOADS_DIR || path.join(os.homedir(), "Downloads");
const textExtensions = [
  "txt",
  "csv",
  "py",
  "md",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
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
];
const types = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};
export function createHandler(
  defaultDirectory = defaultRoot,
  staticDirectory = null,
  options = {},
) {
  let choices;
  const getRoots = () =>
    (choices ||= availableRoots(defaultDirectory, options.home));
  let scanning = false;
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    try {
      if (
        req.headers?.host &&
        !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host)
      ) {
        res.writeHead(403);
        return res.end("Local requests only");
      }
      if (req.headers?.origin) {
        const origin = new URL(req.headers.origin);
        if (!["localhost", "127.0.0.1"].includes(origin.hostname)) {
          res.writeHead(403);
          return res.end("Local requests only");
        }
      }
      const url = new URL(req.url, "http://localhost");
      if (req.method !== "GET") {
        res.writeHead(405);
        return res.end("Read-only API");
      }
      const json = (data) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      };
      if (url.pathname === "/api/roots")
        return json({
          roots: (await getRoots()).map(({ id, name }) => ({ id, name })),
        });
      let root = defaultDirectory;
      const rootId = url.searchParams.get("root");
      if (rootId && rootId !== "default") {
        const choice = (await getRoots()).find(
          (choice) => choice.id === rootId,
        );
        if (!choice) {
          res.writeHead(400);
          return json({ error: "Unknown workspace folder" });
        }
        root = choice.path;
      }
      if (url.pathname === "/api/search-content") {
        const query = url.searchParams.get("q") || "";
        if (!query.trim() || query.length > 200) {
          res.writeHead(400);
          return json({ error: "Search text must be 1–200 characters" });
        }
        const controller = new AbortController();
        res.on("close", () => {
          if (!res.writableFinished) controller.abort();
        });
        return json(
          await searchContents(
            root,
            decode(url.searchParams.get("dir") || ""),
            url.searchParams.get("recursive") === "1",
            query,
            { signal: controller.signal },
          ),
        );
      }
      if (url.pathname === "/api/files") {
        const relative = decode(url.searchParams.get("dir") || "");
        const recursive = url.searchParams.get("recursive") === "1";
        const result = recursive
          ? await walkFiles(root, relative)
          : {
              files: await listFiles(root, relative),
              truncated: false,
              skipped: 0,
            };
        return json({
          ...result,
          source: "local",
          path: relative,
          rootName: path.basename(path.resolve(root)),
        });
      }
      if (url.pathname === "/api/duplicates") {
        if (scanning) {
          res.writeHead(409);
          return res.end("A scan is already running");
        }
        scanning = true;
        const controller = new AbortController();
        res.on("close", () => {
          if (!res.writableFinished) controller.abort();
        });
        try {
          const relative = decode(url.searchParams.get("dir") || "");
          const result =
            url.searchParams.get("recursive") === "1"
              ? await walkFiles(root, relative)
              : {
                  files: await listFiles(root, relative),
                  truncated: false,
                  skipped: 0,
                };
          const matches = await findDuplicates(
            root,
            result.files,
            controller.signal,
          );
          return json({
            ...matches,
            files: result.files,
            truncated: result.truncated,
            skipped: result.skipped + matches.skipped,
          });
        } finally {
          scanning = false;
        }
      }
      if (url.pathname === "/api/preview" || url.pathname === "/api/download") {
        const relative = decode(url.searchParams.get("id") || "");
        if (!relative) {
          res.writeHead(404);
          return res.end("File unavailable");
        }
        const filename = await safePath(root, relative);
        const stat = await lstat(filename);
        if (!stat.isFile()) {
          res.writeHead(404);
          return res.end("File unavailable");
        }
        const ext = path.extname(filename).slice(1).toLowerCase();
        const download = url.pathname === "/api/download";
        const isText = textExtensions.includes(ext);
        const type = isText ? "text/plain; charset=utf-8" : types[ext];
        if (!download && !type) {
          res.writeHead(415);
          return res.end("Preview unavailable for this format");
        }
        res.setHeader(
          "Content-Type",
          download ? "application/octet-stream" : type,
        );
        res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
        if (download)
          res.setHeader(
            "Content-Disposition",
            `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(filename))}`,
          );
        if (isText && !download) {
          const handle = await open(filename, "r");
          try {
            const buffer = Buffer.alloc(64000);
            const { bytesRead } = await handle.read(
              buffer,
              0,
              buffer.length,
              0,
            );
            res.setHeader("X-Preview-Truncated", String(stat.size > bytesRead));
            return res.end(buffer.subarray(0, bytesRead));
          } finally {
            await handle.close();
          }
        }
        res.setHeader("Accept-Ranges", "bytes");
        let start = 0,
          end = stat.size - 1;
        if (req.headers?.range) {
          const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if (range) {
            if (!range[1] && range[2])
              start = Math.max(0, stat.size - Number(range[2]));
            else {
              start = Number(range[1]);
              if (range[2]) end = Math.min(end, Number(range[2]));
            }
          }
          if (
            !range ||
            (!range[1] && !range[2]) ||
            !Number.isSafeInteger(start) ||
            start > end ||
            start < 0
          ) {
            res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
            return res.end();
          }
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Content-Length": end - start + 1,
          });
        } else res.setHeader("Content-Length", stat.size);
        if (!stat.size) return res.end();
        await pipeline(createReadStream(filename, { start, end }), res);
        return;
      }
      if (staticDirectory && !url.pathname.startsWith("/api/")) {
        const relative =
          decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
        const filename = await safePath(staticDirectory, relative);
        const stat = await lstat(filename);
        if (!stat.isFile()) {
          res.writeHead(404);
          return res.end("Not found");
        }
        const staticTypes = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".png": "image/png",
        };
        res.setHeader(
          "Content-Type",
          staticTypes[path.extname(filename)] || "application/octet-stream",
        );
        await pipeline(createReadStream(filename), res);
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error:
              "Could not read this folder. Check directory access and refresh.",
          }),
        );
      } else if (!res.destroyed) res.destroy();
    }
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = http.createServer(
    createHandler(
      defaultRoot,
      process.argv.includes("--production")
        ? path.join(path.dirname(fileURLToPath(import.meta.url)), "dist")
        : null,
    ),
  );
  server.on("error", (error) => {
    console.error(`Cannot start local API: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(4318, "127.0.0.1", () =>
    console.log("Sift local API: http://127.0.0.1:4318"),
  );
}
