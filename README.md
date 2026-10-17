# Sift

[GitHub repository](https://github.com/ebilesh/sift)

Find your files. Keep your focus.

A local-first, read-only file workspace built with React, TypeScript, Tailwind CSS, Lucide and Recharts.

## Run locally

Requires Node.js 22.6 or newer and npm.

```bash
cd ~/Downloads/downloads-os
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The read-only API listens on port 4318 and Vite proxies `/api` requests to it. Both bind only to the loopback interface.

To use another directory:

```bash
DOWNLOADS_DIR="/absolute/path/to/folder" npm run dev
```

`npm run build` type-checks and creates `dist/`. For a production-build preview, run `npm run api` in one terminal and `npm run preview` in another. Vite preview proxies `/api` to the same local API.

## Features

- Grid and list explorer, nested folder browsing, smart categories, recent and starred files.
- Name search combined with category and size filters; sorting by name, size or modification time.
- Metadata inspector, image/PDF previews and text previews (first 64 KB).
- Storage composition, interactive category bar chart, largest-file explorer.
- Exact duplicate detection using streaming SHA-256 hashes.
- Multi-select, select-all, and app-local collections with membership removal; theme, view and density preferences.
- Command palette (`Ctrl/⌘ K`), search shortcut (`/`), select-all (`Ctrl/⌘ A`), Escape dismissal.
- Labeled demo fallback when the local API is unavailable.

## File safety and scope

The API accepts GET only. It does not provide move, rename, overwrite or delete operations. Collections and stars save file identifiers in browser localStorage; source files remain untouched. Nothing is uploaded. Hidden files, symlinks and the `downloads-os` project folder are excluded. Resolved preview and folder paths are confined to the configured Downloads root. Requests with non-local Host headers are rejected.

Explorer data, analytics and duplicate scans cover the currently open directory; folder contents are browsable but are not recursively included in totals. Duplicate scans can take time for large files. PDFs depend on the browser's PDF viewer; open-in-new-tab and download-copy links remain available when the embedded viewer is blank. Unrecognized formats show metadata rather than execute native files. Starred files and collections use a browser-local metadata index of previously visited directories. Collections do not move files, and external file renames may leave old collection entries.

## Validation

```bash
npm test
npm run build
```

The API and model tests run without installing dependencies using Node's TypeScript type stripping. They cover read-only routing, filtering, nested browsing, real content hashing, preview response safety and path confinement.

The production build (`npm run build`) and API/model tests (`npm test`) pass. Browser inspection covered desktop (1440px), phone (390px), search/filtering, grid/list, previews, collection persistence/removal, command palette dismissal, mobile drawer focus restoration, chart pointer/keyboard navigation and duplicate scanning. Embedded PDF rendering was blank in the inspection browser; fallback links are provided. Cross-platform testing and OS-level reduced-motion emulation remain unverified. Chart animation is disabled for all users. The production build currently emits a bundle-size advisory for the chart-heavy main chunk. See `.impeccable/review/review.md` for the source review and historical environment limits.
