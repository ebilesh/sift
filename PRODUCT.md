# Sift

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React, TypeScript, Tailwind CSS, Vite. Local Node server for read-only file metadata, previews, downloads, and duplicate scans within a configured root (Downloads by default). Category charts use native HTML/CSS bars; no Recharts dependency.

## Users
People browsing, inspecting, and organizing their downloaded files on desktop, with responsive access on smaller screens.

## Product Purpose
Make local folders understandable through filename and text-content search, previews, categories, storage insights, and duplicate detection.

## Capabilities and Constraints
- Switch workspace roots through the sidebar picker: the configured root (Downloads by default) and visible direct child directories of home. Arbitrary paths are not accepted by the picker. Stars, collections, annotations, saved searches, preferences, and the visited-file index are isolated per root; the default root retains existing browser-storage keys.
- Browse folders in grid or list view, with a named root and explicit current-folder scope. Including subfolders is opt-in; recursive results show parent locations. Sort by name, size, or modification date and page through results in groups of 100.
- Combine filename terms and quoted phrases with `type:`, `ext:`, `in:`, `larger:`, and `smaller:` search operators. Category, extension, size, age, and tag filters compose with search. Save and reuse searches.
- Explicitly search inside supported plain-text and code formats and inspect matching excerpts. Reads are bounded to the first 64,000 bytes per file, 2,000 candidates, and 32,000,000 bytes total, with partial-result reporting and cancellation. PDF and Word content extraction is excluded. An active content search reruns its submitted term after manual or automatic metadata refresh detects changes. Changing the root, folder, or recursive scope clears the active search.
- Inspect metadata and supported image, text/code, PDF, audio, and video previews. Media playback depends on browser codec support. Local files offer download-copy links; downloading does not alter the source.
- Find exact duplicates, inspect category storage or file counts through actionable native bars in the separate Storage view, select files, export file listings, and organize stars and named collections.
- Persist stars, collections, per-file tags and notes, saved searches, and preferences in browser storage. Export organization metadata as a version 1 JSON backup. Restore requires review and confirmation: stars and collection membership merge, imported annotation entries replace matching entries, and saved searches merge by query (up to 12 retained). Backups contain metadata and notes, not file contents.
- Automatic refresh polls the current scope every eight seconds while the page is visible and on window focus; it pauses during loading, open dialogs, and duplicate scans. Settings can disable polling. This is metadata polling rather than an OS watcher or persistent disk index.
- Reconcile metadata across unambiguous observed renames or moves within a root using filesystem device/inode/birth-time identity. Missing records retain recoverable notes and tags; replacement files at an old path have separate metadata. Ambiguous hard links are not guessed. Discovery depends on visited scopes, and copies or moves across filesystems are not tracked. Recursive traversal reports partial results at 20,000 entries or 24 directory levels.
- Connection failure shows an explicit offline state and retry action. Sample files appear only after choosing the labeled sample workspace; they do not silently replace local results.
- Settings, appearance modes, keyboard shortcuts, and a command palette support the workspace. No model features are used.

This version reads source files and writes organization metadata only to browser storage or an exported backup. Existing files must never be moved, renamed, overwritten, or deleted without explicit confirmation. Clearing browser storage can remove organization metadata unless it has been backed up.

## Brand Commitments
Sift. Premium charcoal interface, subtle violet accents, inspired by Linear, Raycast and Arc. Precise typography and spacing; no generic gradients or excessive glass.

## Evidence on Hand
Read-only local folder metadata and bounded text-content reads. No commercial claims or testimonials.

## Product Principles
- Make file state and source clear.
- Preserve source files.
- Make keyboard and pointer workflows equally useful.
- Show meaningful data before decoration.
