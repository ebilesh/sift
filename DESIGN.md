---
name: Sift
description: A precise charcoal and violet workspace for downloaded files.
colors:
  primary: "#b2a2ff"
  accent-bg: "#292438"
  accent-ink: "#171322"
  bg: "#171719"
  sidebar: "#121214"
  panel: "#1d1d20"
  raised: "#252529"
  hover: "#242427"
  text: "#e9e9ed"
  secondary: "#b0afb8"
  muted: "#92919d"
  border: "#2b2b30"
  green: "#8db89c"
typography:
  headline:
    fontFamily: "Inter, SF Pro Text, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "27px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter, SF Pro Text, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 550
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, SF Pro Text, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Inter, SF Pro Text, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 500
rounded:
  badge: "4px"
  control: "6px"
  surface: "8px"
  card: "10px"
  dialog: "13px"
spacing:
  compact: "8px"
  control: "12px"
  section: "20px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    height: "33px"
    padding: "0 12px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "33px"
  file-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.card}"
  nav-active:
    backgroundColor: "{colors.accent-bg}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    height: "34px"
---

# Design System: Sift

## Overview

**Creative North Star: "The editing room"**

The editing room brings professional media-browser precision to a personal file workspace. Charcoal layers keep filenames and metadata prominent; pale violet marks actions and selection. Controls are compact, restrained, and consistently framed.

The system uses quiet tonal separation, thin borders, and a single sans-serif family. The approved brand direction rejects generic gradients and excessive glass. Light and system appearance modes also exist in the implementation; dark charcoal is the default.

**Key Characteristics:**

- Dense file browsing with clear names and metadata.
- Restrained violet actions and selection.
- Tonal surfaces with structural overlay shadows.

This document records `src/styles.css` and `src/main.tsx`, supported by PRODUCT.md and the accepted workspace brief. Initial browser verification was unavailable. Subsequent inspection covered desktop at 1440px and phone at 390px. Values below describe implementation evidence; cross-platform testing remains pending.

## Colors

A cool charcoal neutral ladder supports one pale violet interaction accent. Frontmatter values are normative and describe the default dark theme.

### Primary

- **Editing Violet** (`primary`): primary buttons, focus outlines, selected navigation, starred files, and active tab underlines.
- **Violet Wash** (`accent-bg`): selected file rows, selection toolbar, and active navigation backgrounds.
- **Deep Violet Ink** (`accent-ink`): text on filled primary buttons.

### Neutral

- **Workspace Charcoal** (`bg`): main application canvas.
- **Rail Charcoal** (`sidebar`): fixed navigation and preview wells.
- **Panel Charcoal** (`panel`): inputs, cards, dialogs, and inspector.
- **Raised Graphite** (`raised`): nested controls, badges, placeholder shapes.
- **Hover Graphite** (`hover`): pointer feedback on rows and navigation.
- **Soft White** (`text`): filenames, headings, and essential controls.
- **Silver Gray** (`secondary`): secondary controls and metadata.
- **Muted Gray** (`muted`): captions and low-emphasis labels.
- **Graphite Line** (`border`): dividers and container outlines.

Muted green (`green`) signals local status. File categories have distinct colors supplied by the model; they communicate file types rather than competing primary actions. Light and system-light themes replace all semantic root colors with the explicit light palette in the stylesheet.

**The Interaction Accent Rule.** Violet identifies actionable or selected state across otherwise neutral surfaces.

## Typography

**Display Font:** Inter, with SF Pro Text and system sans-serif fallbacks.
**Body Font:** The same stack; no downloaded font asset is declared.
**Label/Mono Font:** Labels and keyboard hints use the same sans-serif stack; numeric metadata uses tabular figures.

### Hierarchy

- **Headline:** page h1; tight tracking and semibold weight from frontmatter, reduced to (25px) on phones.
- **Title:** section h2; compact medium weight from frontmatter.
- **Body:** root text from frontmatter; file names are (12px) in desktop lists.
- **Label:** controls and metadata generally (10–12px); small captions and badges reach (8–10px). These are observed sizes, not a claim that every caption is comfortably readable.

## Layout

A fixed left rail (224px) anchors the desktop shell. The top toolbar is (61px) high; main content has a maximum width (1650px) with default padding (35px 34px 20px). The optional details rail is (300px), reserving main-content space on wide screens. List rows use a six-column grid and a minimum height (61px); file grids auto-fill columns with a minimum width (175px).

At widths at or below (1200px), content padding and metadata columns tighten and the inspector overlays the main area. At or below (900px), navigation becomes an off-canvas drawer with a scrim. At or below (600px), type and date list columns hide, file cards use two equal columns, and the inspector becomes a full-width bottom sheet beginning at (12vh). At widths at or above (1500px), content gutters and row height increase. Coarse pointers enlarge key icon and tab targets.

## Elevation & Depth

The main workspace relies on tonal layers and single-pixel borders. Shadows give structural separation to overlays: dialog (`0 24px 90px #0006`), toast (`0 10px 35px #0005`), intermediate-width inspector (`-15px 0 45px #0003`), and mobile sheet (`0 -20px 80px #0007`). The dialog backdrop uses translucent black (`#0008`). Search focus adds a narrow violet-wash ring.

## Shapes

Controls use gently curved corners; cards are slightly softer than buttons, and dialogs and the mobile details sheet have the largest corners. Most outlines are (1px). The brand mark is a small framed square, status indicators are circles, and category markers are compact squares. Image previews clip within their containing cards or wells.

## Components

### Buttons

Restrained compact controls. Primary buttons use Editing Violet with Deep Violet Ink; secondary buttons use Panel Charcoal with a border; quiet buttons remove the fill. Standard controls are (33px) high. Primary hover increases brightness; secondary hover raises the surface and strengthens the border. Disabled buttons use opacity (.45) and a disabled cursor.

### Chips

Small outlined tags use muted secondary text, a thin border, badge corners, and padding (4px 7px). Tab counts use raised neutral fills. Tags are labels, with no invented clickable state.

### Cards / Containers

File cards use Panel Charcoal, a single border, card corners, and an image/icon well on Rail Charcoal. Hover strengthens the border; selection uses Violet Wash and an accent outline. The folder overview uses a framed container with a proportional category storage bar rather than standalone KPI tiles.

### Inputs / Fields

Search uses a framed panel background and compact control corners. Focus changes the border to violet and adds a (2px) wash ring. The collection text field is (37px) high with workspace fill. Global keyboard focus is a (2px) accent outline offset (3px).

### Navigation

Navigation rows have a (34px) height with icons, labels, and optional tabular counts. Hover uses Hover Graphite; current navigation uses Violet Wash with violet text. The mobile rail enters horizontally and is backed by a scrim.

### File selection and details

Selecting files reveals an organization bar above the browser. Selected or inspected rows receive Violet Wash; row actions become visible on hover or keyboard focus. Details show a safe preview, filename, metadata, and collection add/remove controls. Selected files can also be removed from the current collection. PDF previews include open-in-new-tab and download-copy fallback links. The command palette uses a native modal dialog, focused search, and navigation/file results. Escape and backdrop dismissal are implemented.

Color and surface changes generally transition over (180ms ease-out); the drawer uses (200ms ease-out). Reduced-motion preferences disable CSS transitions and animations. Storage chart animation is disabled for every preference. Chart bars are focusable buttons with category/value labels and Enter/Space activation. Skeleton rows pulse while loading; connection failures show a labeled fallback notice and retry control; empty results use a centered explanation and available action.

## Do's and Don'ts

### Do:

- **Do** use violet to identify primary actions, focus, and selected items.
- **Do** preserve the compact filename-first hierarchy and tabular metadata.
- **Do** retain visible keyboard focus and reduced-motion behavior.

### Don't:

- **Don't** introduce generic gradients or excessive glass.
- **Don't** show unlabelled demo data as a live local folder.
- **Don't** claim browser visual verification from source inspection.
