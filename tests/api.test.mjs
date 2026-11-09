import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  mkdir,
  symlink,
  rm,
  readFile,
} from "node:fs/promises";
import { Writable } from "node:stream";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHandler, listFiles } from "../server.mjs";
class Response extends Writable {
  headers = {};
  status = 200;
  parts = [];
  setHeader(k, v) {
    this.headers[k] = v;
  }
  writeHead(status, headers = {}) {
    this.status = status;
    Object.assign(this.headers, headers);
  }
  _write(c, e, cb) {
    this.parts.push(c);
    cb();
  }
  get body() {
    return Buffer.concat(this.parts).toString();
  }
}
async function request(handler, url, method = "GET", host = "127.0.0.1:4318") {
  const response = new Response();
  await handler({ url, method, headers: { host } }, response);
  if (!response.writableFinished)
    await new Promise((resolve) => response.on("finish", resolve));
  return response;
}
test("read-only browsing, exact duplicates, safe previews and confinement", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dos-test-"));
  try {
    await mkdir(path.join(root, "nested"));
    await mkdir(path.join(root, "downloads-os"));
    await writeFile(path.join(root, "a.txt"), "same");
    await writeFile(path.join(root, "b.txt"), "same");
    await writeFile(path.join(root, "c.txt"), "diff");
    await writeFile(path.join(root, ".hidden"), "private");
    await writeFile(path.join(root, "nested", "notes.md"), "nested content");
    await symlink("/etc/passwd", path.join(root, "outside.txt"));
    const handler = createHandler(root);
    const files = await listFiles(root);
    assert.equal(files.length, 4);
    assert.ok(
      !files.some(
        (f) =>
          f.name.startsWith(".") ||
          f.name === "outside.txt" ||
          f.name === "downloads-os",
      ),
    );
    const a = files.find((f) => f.name === "a.txt");
    const before = await readFile(path.join(root, "a.txt"), "utf8");
    const response = await request(handler, "/api/duplicates");
    assert.deepEqual(
      JSON.parse(response.body).groups[0].sort(),
      [a.id, files.find((f) => f.name === "b.txt").id].sort(),
    );
    const preview = await request(handler, `/api/preview?id=${a.id}`);
    assert.equal(preview.body, "same");
    assert.equal(preview.headers["Content-Type"], "text/plain; charset=utf-8");
    const nested = files.find((f) => f.name === "nested");
    const listing = await request(handler, `/api/files?dir=${nested.id}`);
    assert.equal(JSON.parse(listing.body).files[0].name, "notes.md");
    assert.equal((await request(handler, "/api/files", "POST")).status, 405);
    assert.equal(
      (await request(handler, "/api/files", "GET", "evil.example")).status,
      403,
    );
    const escape = Buffer.from("../outside").toString("base64url");
    assert.equal(
      (await request(handler, `/api/preview?id=${escape}`)).status,
      500,
    );
    const link = Buffer.from("outside.txt").toString("base64url");
    assert.equal(
      (await request(handler, `/api/preview?id=${link}`)).status,
      500,
    );
    assert.equal(await readFile(path.join(root, "a.txt"), "utf8"), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { walkFiles } from "../workspace.mjs";
test("recursive indexing and scans include nested copies but skip hidden files and links", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sift-recursive-"));
  try {
    await mkdir(path.join(root, "school"));
    await mkdir(path.join(root, ".private"));
    await writeFile(path.join(root, "a.md"), "shared");
    await writeFile(path.join(root, "school", "copy.md"), "shared");
    await writeFile(path.join(root, ".private", "secret"), "secret");
    await symlink(root, path.join(root, "loop"));
    const index = await walkFiles(root);
    assert.equal(index.files.length, 3);
    assert.ok(index.files.some((f) => f.relativePath === "school/copy.md"));
    const bounded = await walkFiles(root, "", { limit: 1 });
    assert.equal(bounded.files.length, 1);
    assert.equal(bounded.truncated, true);
    const handler = createHandler(root);
    const scan = JSON.parse(
      (await request(handler, "/api/duplicates?recursive=1")).body,
    );
    assert.equal(scan.groups.length, 1);
    assert.equal(scan.groups[0].length, 2);
    assert.equal(scan.hashed, 2);
    assert.equal(scan.truncated, false);
    const flat = JSON.parse((await request(handler, "/api/duplicates")).body);
    assert.equal(flat.groups.length, 0);
    assert.equal(
      (
        await request(
          handler,
          "/api/preview?id=" +
            Buffer.from(".private/secret").toString("base64url"),
        )
      ).status,
      500,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("media ranges, downloads and truncated source previews are safe and accurate", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sift-media-"));
  try {
    await writeFile(path.join(root, "clip.mp4"), "0123456789");
    await writeFile(path.join(root, "source.ts"), "x".repeat(70000));
    await writeFile(path.join(root, "page.html"), "<script>alert(1)</script>");
    const handler = createHandler(root);
    const id = (name) => Buffer.from(name).toString("base64url");
    async function range(value) {
      const response = new Response();
      await handler(
        {
          url: "/api/preview?id=" + id("clip.mp4"),
          method: "GET",
          headers: { host: "127.0.0.1", range: value },
        },
        response,
      );
      if (!response.writableFinished)
        await new Promise((resolve) => response.on("finish", resolve));
      return response;
    }
    const partial = await range("bytes=2-5");
    assert.equal(partial.status, 206);
    assert.equal(partial.body, "2345");
    assert.equal(partial.headers["Content-Range"], "bytes 2-5/10");
    assert.equal((await range("bytes=-3")).body, "789");
    assert.equal((await range("bytes=100-")).status, 416);
    assert.equal((await range("bytes=-")).status, 416);
    const text = await request(handler, "/api/preview?id=" + id("source.ts"));
    assert.equal(text.body.length, 64000);
    assert.equal(text.headers["X-Preview-Truncated"], "true");
    const html = await request(handler, "/api/preview?id=" + id("page.html"));
    assert.match(html.headers["Content-Type"], /^text\/plain/);
    assert.equal(
      html.headers["Content-Security-Policy"],
      "default-src 'none'; sandbox",
    );
    const copy = await request(handler, "/api/download?id=" + id("page.html"));
    assert.equal(copy.body, "<script>alert(1)</script>");
    assert.match(copy.headers["Content-Disposition"], /^attachment/);
    assert.equal(copy.headers["Content-Type"], "application/octet-stream");
    const foreign = new Response();
    await handler(
      {
        url: "/api/files",
        method: "GET",
        headers: { host: "localhost", origin: "https://evil.example" },
      },
      foreign,
    );
    assert.equal(foreign.status, 403);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production mode serves built assets while confining paths and retaining read-only API", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sift-production-"));
  try {
    await mkdir(path.join(root, "dist"));
    await writeFile(path.join(root, "dist", "index.html"), "<main>Sift</main>");
    await writeFile(path.join(root, "dist", "app.js"), 'console.log("loaded")');
    await writeFile(path.join(root, "secret.txt"), "private");
    const handler = createHandler(root, path.join(root, "dist"));
    const index = await request(handler, "/");
    assert.equal(index.body, "<main>Sift</main>");
    assert.match(index.headers["Content-Type"], /^text\/html/);
    assert.match(
      (await request(handler, "/app.js")).headers["Content-Type"],
      /^text\/javascript/,
    );
    assert.equal((await request(handler, "/%2e%2e%2fsecret.txt")).status, 500);
    assert.equal((await request(handler, "/api/unknown")).status, 404);
    assert.equal((await request(handler, "/", "POST")).status, 405);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { availableRoots } from "../roots.mjs";
import { searchContents } from "../content-search.mjs";
import { rename } from "node:fs/promises";
test("root picker allows visible home folders and isolates API file scopes", async () => {
  const home = await mkdtemp(path.join(tmpdir(), "sift-roots-"));
  try {
    await mkdir(path.join(home, "Downloads"));
    await mkdir(path.join(home, "Documents"));
    await mkdir(path.join(home, ".private"));
    await symlink("/tmp", path.join(home, "outside"));
    await writeFile(
      path.join(home, "Documents", "class.txt"),
      "document content",
    );
    const choices = await availableRoots(path.join(home, "Downloads"), home);
    assert.deepEqual(
      choices.map((root) => root.name),
      ["Downloads", "Documents"],
    );
    const handler = createHandler(path.join(home, "Downloads"), null, { home });
    const roots = JSON.parse((await request(handler, "/api/roots")).body).roots;
    assert.ok(roots.every((root) => !Object.hasOwn(root, "path")));
    const documentRoot = roots.find((root) => root.name === "Documents");
    assert.equal(
      JSON.parse(
        (await request(handler, "/api/files?root=" + documentRoot.id)).body,
      ).files[0].name,
      "class.txt",
    );
    assert.equal(
      JSON.parse((await request(handler, "/api/files")).body).files.length,
      0,
    );
    assert.equal(
      (await request(handler, "/api/files?root=../../etc")).status,
      400,
    );
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
test("filesystem identity survives rename and changes for a new file at the old path", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sift-identity-"));
  try {
    await writeFile(path.join(root, "old.txt"), "old");
    const before = (await listFiles(root))[0];
    await rename(path.join(root, "old.txt"), path.join(root, "new.txt"));
    const renamed = (await listFiles(root))[0];
    assert.equal(renamed.identity, before.identity);
    assert.notEqual(renamed.id, before.id);
    await writeFile(path.join(root, "old.txt"), "replacement");
    const replacement = (await listFiles(root)).find(
      (file) => file.name === "old.txt",
    );
    assert.notEqual(replacement.identity, before.identity);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("content search checks text safely with scope and explicit limits", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sift-content-"));
  try {
    await mkdir(path.join(root, "nested"));
    await writeFile(
      path.join(root, "a.md"),
      "Meeting about partial derivatives",
    );
    await writeFile(
      path.join(root, "nested", "b.ts"),
      "// PARTIAL derivatives",
    );
    await writeFile(path.join(root, "no.pdf"), "partial");
    await writeFile(
      path.join(root, "large.txt"),
      "x".repeat(70000) + "partial",
    );
    const flat = await searchContents(root, "", false, "partial");
    assert.equal(flat.matches.length, 1);
    assert.equal(flat.partial, true);
    const recursive = await searchContents(root, "", true, "partial");
    assert.equal(recursive.matches.length, 2);
    assert.ok(recursive.matches[0].snippet);
    const limited = await searchContents(root, "", true, "partial", {
      maxFiles: 1,
    });
    assert.equal(limited.inspected, 1);
    assert.equal(limited.partial, true);
    assert.equal(
      (await request(createHandler(root), "/api/search-content?q=")).status,
      400,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
