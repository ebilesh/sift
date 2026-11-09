# Sift

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React, TypeScript, Tailwind CSS, Vite. Local Node server for read-only file metadata, previews, downloads, and duplicate scans within a configured root (Downloads by default). Category charts use native HTML/CSS bars; no Recharts dependency.

## Users
People browsing, inspecting, and organizing their downloaded files on desktop, with responsive access on smaller screens.

## Product Purpose
Make a crowded Downloads folder understandable through search, previews, categories, storage insights, and duplicate detection.

## Capabilities and Constraints
- Browse folders in grid or list view, with a named root and explicit current-folder scope. Including subfolders is opt-in; recursive results show parent locations. Sort by name, size, or modification date and page through results in groups of 100.
- Combine filename terms and quoted phrases with `type:`, `ext:`, `in:`, `larger:`, and `smaller:` search operators. Category, extension, size, age, and tag filters compose with search. Save and reuse searches.
- Inspect metadata and supported image, text/code, PDF, audio, and video previews. Media playback depends on browser codec support. Local files offer download-copy links; downloading does not alter the source.
- Find exact duplicates, inspect category storage or file counts through actionable native bars, select files, export file listings, and organize stars and named collections.
- Persist stars, collections, per-file tags and notes, saved searches, and preferences in browser storage. Export organization metadata as a version 1 JSON backup. Restore requires review and confirmation: stars and collection membership merge, imported annotation entries replace matching entries, and saved searches merge by query (up to 12 retained). Backups contain metadata and notes, not file contents.
- Connection failure shows an explicit offline state and retry action. Sample files appear only after choosing the labeled sample workspace; they do not silently replace local results.
- Settings, appearance modes, keyboard shortcuts, and a command palette support the workspace. No model features are used.

This version reads source files and writes organization metadata only to browser storage or an exported backup. Existing files must never be moved, renamed, overwritten, or deleted without explicit confirmation. Clearing browser storage can remove organization metadata unless it has been backed up.

## Brand Commitments
Sift. Premium charcoal interface, subtle violet accents, inspired by Linear, Raycast and Arc. Precise typography and spacing; no generic gradients or excessive glass.

## Evidence on Hand
Read-only local Downloads directory metadata. No commercial claims or testimonials.

## Product Principles
- Make file state and source clear.
- Preserve source files.
- Make keyboard and pointer workflows equally useful.
- Show meaningful data before decoration.
