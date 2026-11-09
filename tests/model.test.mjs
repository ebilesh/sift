import { test } from "node:test";
import assert from "node:assert/strict";
import { category, bytes, filterFiles, demo } from "../src/model.ts";
test("categories distinguish folders, media, archives and applications", () => {
  assert.equal(category(demo[0]), "Documents");
  assert.equal(category(demo[2]), "Video");
  assert.equal(category(demo[9]), "Folders");
  assert.equal(category(demo[11]), "Applications");
});
test("filter combines case insensitive name, type and size", () => {
  assert.equal(filterFiles(demo, "PRODUCT", "Video", "large").length, 2);
  assert.equal(filterFiles(demo, "PRODUCT", "Documents", "any").length, 0);
  assert.equal(filterFiles(demo, "", "All files", "small").length, 7);
});
test("human sizes handle zero and boundaries", () => {
  assert.equal(bytes(0), "0 B");
  assert.equal(bytes(1024), "1.0 KB");
  assert.equal(bytes(1024 ** 3), "1.0 GB");
});

import {
  matchesQuery,
  searchFiles,
  sortFiles,
  toCsv,
  parseBackup,
} from "../src/model.ts";
const nested = {
  id: "nested",
  name: "Project notes.txt",
  relativePath: "school/Project notes.txt",
  size: 2048,
  ext: "txt",
  folder: false,
  modified: new Date().toISOString(),
  created: new Date().toISOString(),
};
test("search composes phrases, extensions, types, paths and byte units", () => {
  assert.equal(
    matchesQuery(
      nested,
      '"project notes" ext:txt in:school larger:1kb smaller:3kb type:document',
    ),
    true,
  );
  assert.equal(matchesQuery(nested, "ext:pdf"), false);
  assert.equal(matchesQuery(nested, "larger:nonsense"), false);
  assert.equal(matchesQuery(nested, '"notes project"'), false);
  assert.equal(matchesQuery({ ...nested, folder: true }, "larger:1b"), false);
});
test("advanced filters combine tags, age and extension", () => {
  assert.equal(
    searchFiles([nested], "", "All files", "any", {
      extension: "txt",
      age: "7",
      tag: "class",
      annotations: { nested: { tags: ["class"], note: "" } },
    }).length,
    1,
  );
  assert.equal(
    searchFiles([nested], "", "All files", "any", { tag: "missing" }).length,
    0,
  );
  assert.equal(
    searchFiles(
      [{ ...nested, modified: "2020-01-01" }],
      "",
      "All files",
      "any",
      { age: "7" },
    ).length,
    0,
  );
});
test("sorting is numeric, reversible, and keeps folders first", () => {
  const a = { ...nested, id: "a", name: "File 2" },
    b = { ...nested, id: "b", name: "File 10" },
    folder = { ...nested, id: "f", name: "Z", folder: true };
  assert.deepEqual(
    sortFiles([b, folder, a], "name", true, true).map((f) => f.id),
    ["f", "a", "b"],
  );
  assert.deepEqual(
    sortFiles([a, b], "name", false, false).map((f) => f.id),
    ["b", "a"],
  );
});
test("CSV quotes names and neutralizes spreadsheet formula prefixes", () => {
  const csv = toCsv([{ ...nested, name: '=SUM(1,2)"' }]);
  assert.ok(csv.includes('"\'=SUM(1,2)"""'));
  assert.ok(csv.includes("school/Project notes.txt"));
});
test("backup validation rejects malformed data before restoring", () => {
  const backup = {
    version: 1,
    stars: ["a"],
    collections: { Class: ["a"] },
    annotations: { a: { tags: ["class"], note: "Review" } },
    savedSearches: [{ name: "PDF", query: "ext:pdf" }],
  };
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
  for (const bad of [
    { ...backup, version: 2 },
    { ...backup, stars: "a" },
    { ...backup, annotations: { a: { note: 42, tags: [] } } },
    { ...backup, collections: { Class: [1] } },
  ])
    assert.throws(() => parseBackup(JSON.stringify(bad)));
});

import { reconcileIndex, remapMetadata } from "../src/reconcile.ts";
const tracked = {
  ...nested,
  id: "old",
  identity: "1:2:3",
  relativePath: "school/old.txt",
};
test("rename reconciliation preserves stars, collections, tags and notes by file identity", () => {
  const moved = {
    ...tracked,
    id: "new",
    relativePath: "school/new.txt",
    name: "new.txt",
  };
  const result = reconcileIndex([tracked], [moved], "school", false, true);
  assert.deepEqual(result.remapped, { old: "new" });
  assert.equal(result.files.length, 1);
  const metadata = remapMetadata(
    ["old"],
    { Class: ["old"] },
    { old: { tags: ["school"], note: "Keep" } },
    result.remapped,
  );
  assert.deepEqual(metadata, {
    stars: ["new"],
    collections: { Class: ["new"] },
    annotations: { new: { tags: ["school"], note: "Keep" } },
  });
});
test("missing entries retain notes, partial scans do not invalidate, and unrelated scopes stay intact", () => {
  assert.equal(
    reconcileIndex([tracked], [], "school", false, true).files[0].missing,
    true,
  );
  assert.notEqual(
    reconcileIndex([tracked], [], "school", false, false).files[0].missing,
    true,
  );
  assert.notEqual(
    reconcileIndex([tracked], [], "other", false, true).files[0].missing,
    true,
  );
});
test("replacement at the same path does not inherit old metadata; ambiguous hard links are not guessed", () => {
  const replacement = { ...tracked, identity: "1:9:7" };
  const result = reconcileIndex(
    [tracked],
    [replacement],
    "school",
    false,
    true,
  );
  assert.equal(result.files.length, 2);
  assert.notEqual(result.remapped.old, "old");
  assert.equal(
    result.files.find((file) => file.id === result.remapped.old).missing,
    true,
  );
  const hardLink = { ...tracked, id: "link", relativePath: "school/link.txt" };
  const ambiguous = reconcileIndex(
    [tracked, hardLink],
    [{ ...tracked, id: "new" }],
    "school",
    false,
    true,
  );
  assert.deepEqual(ambiguous.remapped, {});
});
