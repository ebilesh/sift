# How Sift works

The browser requests file metadata from a Node server bound to localhost. File contents are read only when generating a preview, downloading a copy, or comparing duplicate candidates. Search and sorting run in the browser over the current index.

## Traversal

`walkFiles` walks directories breadth first. It skips hidden entries and symbolic links, handles unreadable child folders, and stops at 20,000 entries or 24 levels. The response tells the UI when the result is partial. A flat listing is the default; recursive indexing requires an explicit choice.

This avoids a background database and watcher process. The cost is that external changes require Refresh, and large folder trees can exceed the indexing limit. A persistent index would need invalidation rules, rename tracking, and a strategy for files changing during scans.

## Duplicate comparison

Files are grouped by byte size first. Singleton groups need no content reads. Candidates in the remaining groups are hashed sequentially with SHA-256 streams; equal hashes form a duplicate group. The scan checks size and modification time around each read, skips changed or unreadable files, and accepts cancellation when the client disconnects.

For n metadata entries and B bytes in equal-size candidate groups, comparison costs O(n + B) time. Hashing holds stream chunks rather than whole files in memory. This identifies exact copies; it does not identify similar photos, edited documents, or near-duplicate audio.

## Previews and downloads

Text and code are delivered as plain text, capped at 64,000 bytes, and rendered in a React text node. HTML is also served as plain text. Binary previews have an explicit type allowlist. Byte-range responses let native browser audio/video players seek without fetching an entire file. Unsupported codecs fall back to downloading a copy.

Resolved paths must stay inside the configured root. Non-local Host headers and foreign browser origins are rejected, and previews use a sandbox policy and `nosniff`. The server has no filesystem mutation route. These controls suit a local utility; they do not provide authentication or isolation for a shared server.

## Browser metadata

Stars, collections, notes, and tags refer to root-relative file identifiers. They are separate from source contents and persist in localStorage. A JSON backup can be validated and merged after confirmation. CSV exports escape quotes and neutralize spreadsheet formula prefixes.

Relative identifiers make metadata portable when the same folder tree is moved, but they cannot follow external renames and can collide when unrelated roots contain the same relative paths. A future multi-root workspace should namespace identifiers and migrate existing metadata. For now, separate browser profiles keep unrelated roots separate.

## Interface and performance

Rows prioritize filenames and parent locations. Filters compose rather than reset each other. Pagination limits rendering to 100 entries; selection and export still cover all matching results. The inspector is a nonmodal rail on wide screens and a focus-contained sheet on narrow screens. Keyboard focus returns to the invoking file control when the sheet closes.

Category bars use HTML and CSS instead of a chart dependency. The production JavaScript bundle fell from roughly 675 KB to 294 KB before compression during this change. This measures bundle output, not a benchmark of startup time or folder scan speed.
