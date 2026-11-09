import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Download,
  Search,
  Folder,
  Files,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  AppWindow,
  HardDrive,
  Copy,
  Star,
  Clock,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  Check,
  MoreHorizontal,
  Command,
  PanelRight,
  RefreshCw,
  CheckCheck,
  FolderPlus,
  Menu,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Keyboard,
  CheckCircle2,
  FolderOpen,
  Loader2,
} from "lucide-react";
import StorageChart from "./StorageChart";
import { icons, IconButton, FileIcon, Modal } from "./components";
import FilePreview from "./FilePreview";
import ContentSearch, { type ContentMatch } from "./ContentSearch";
import WorkspaceShell, { type RootProps } from "./WorkspaceShell";
import { reconcileIndex, remapMetadata } from "./reconcile";
import {
  type FileItem,
  type Category,
  categories,
  category,
  colors,
  bytes,
  date,
  demo,
  searchFiles,
  sortFiles,
  toCsv,
  textExtensions,
  parseBackup,
  type Annotation,
} from "./model";
import { useStored, saveFile, parentPath } from "./workspace";
import "./styles.css";
function App({ rootId, roots, onRootChange }: RootProps) {
  const [contentRevision, setContentRevision] = useState(0);
  const [contentMatches, setContentMatches] = useState<ContentMatch[] | null>(
    null,
  );
  const [files, setFiles] = useState<FileItem[]>([]),
    [loading, setLoading] = useState(true),
    [source, setSource] = useState("local"),
    [error, setError] = useState("");
  const [page, setPage] = useState("All files"),
    [query, setQuery] = useState(""),
    [view, setView] = useStored<"list" | "grid">("dos-view", "list"),
    [sort, setSort] = useState("modified"),
    [size, setSize] = useState("any"),
    [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set()),
    [detail, setDetail] = useState<FileItem | null>(null),
    [mobile, setMobile] = useState(false),
    [palette, setPalette] = useState(false),
    [command, setCommand] = useState(""),
    [toast, setToast] = useState("");
  const [stars, setStars] = useStored<string[]>("dos-stars", []),
    [collections, setCollections] = useStored<Record<string, string[]>>(
      "dos-collections",
      {},
    ),
    [collectionDialog, setCollectionDialog] = useState(false),
    [newCollection, setNewCollection] = useState("");
  const [theme, setTheme] = useStored("dos-theme", "dark"),
    [density, setDensity] = useStored("dos-density", "comfortable"),
    [duplicates, setDuplicates] = useState<string[][]>([]),
    [scanning, setScanning] = useState(false),
    [scanned, setScanned] = useState(false),
    [preview, setPreview] = useState(false),
    [textPreview, setTextPreview] = useState<string | null>(null),
    [previewError, setPreviewError] = useState("");
  const [knownFiles, setKnownFiles] = useStored<FileItem[]>(
    "dos-file-index",
    [],
  );
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [recursive, setRecursive] = useState(false),
    [rootName, setRootName] = useState("Downloads"),
    [indexNotice, setIndexNotice] = useState("");
  const [extension, setExtension] = useState(""),
    [age, setAge] = useState(""),
    [tagFilter, setTagFilter] = useState(""),
    [ascending, setAscending] = useState(false),
    [foldersFirst, setFoldersFirst] = useStored("sift-folders-first", true);
  const [annotations, setAnnotations] = useStored<Record<string, Annotation>>(
      "sift-annotations",
      {},
    ),
    [tagInput, setTagInput] = useState("");
  const [savedSearches, setSavedSearches] = useStored<
    { name: string; query: string }[]
  >("sift-searches", []);
  const requestVersion = useRef(0),
    previewVersion = useRef(0),
    scanController = useRef<AbortController | null>(null);
  const [scanFiles, setScanFiles] = useState<FileItem[]>([]),
    [scanNotice, setScanNotice] = useState("");
  const [resultPage, setResultPage] = useState(0);
  const [backup, setBackup] = useState<ReturnType<typeof parseBackup> | null>(
    null,
  );
  const [manageCollection, setManageCollection] = useState(""),
    [renameValue, setRenameValue] = useState("");
  const [chartMode, setChartMode] = useState<"size" | "count">("size");
  const [detailOverlay, setDetailOverlay] = useState(
    () => matchMedia("(max-width:1200px)").matches,
  );
  const inspectorRef = useRef<HTMLElement>(null);
  const latestDetail = useRef(detail);
  latestDetail.current = detail;
  const inspectorInvoker = useRef<{
    id: string;
    control: HTMLElement | null;
  } | null>(null);
  useEffect(() => {
    if (!detail || preview) return;
    const panel = inspectorRef.current;
    if (inspectorInvoker.current?.id !== detail.id)
      inspectorInvoker.current = {
        id: detail.id,
        control: document.activeElement as HTMLElement | null,
      };
    const invokingControl = inspectorInvoker.current.control;
    const main = document.querySelector<HTMLElement>(".main");
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const media = matchMedia("(max-width:1200px)");
    function update() {
      setDetailOverlay(media.matches);
      if (main) main.inert = media.matches;
      if (sidebar) sidebar.inert = media.matches;
    }
    function trap(event: KeyboardEvent) {
      if (
        !media.matches ||
        event.key !== "Tab" ||
        document.querySelector("dialog[open]")
      )
        return;
      const controls = Array.from(
        panel?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href],input,textarea,select",
        ) || [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    update();
    panel?.querySelector<HTMLElement>("button")?.focus();
    media.addEventListener("change", update);
    document.addEventListener("keydown", trap);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("keydown", trap);
      if (main) main.inert = false;
      if (sidebar) sidebar.inert = matchMedia("(max-width:900px)").matches;
      if (invokingControl?.isConnected) invokingControl.focus();
      else if (latestDetail.current)
        document
          .querySelector<HTMLElement>(
            `[aria-label="Details for ${CSS.escape(latestDetail.current.name)}"]`,
          )
          ?.focus();
    };
  }, [!!detail, preview]);
  useEffect(() => {
    if (!detail) inspectorInvoker.current = null;
  }, [detail?.id]);
  const [autoRefresh, setAutoRefresh] = useStored("sift-auto-refresh", true);
  const refreshing = useRef(false);
  const loadCurrent = useRef<(background?: boolean) => Promise<void>>(
    async () => {},
  );
  const notify = (s: string) => setToast(s);
  async function load(
    dir = folderPath.at(-1)?.id || "",
    deep = recursive,
    background = false,
  ) {
    const version = ++requestVersion.current;
    if (!background) {
      setLoading(true);
      setSelected(new Set());
      setDetail(null);
      setResultPage(0);
      scanController.current?.abort();
    }
    setError("");
    try {
      const r = await fetch(
        `/api/files?root=${encodeURIComponent(rootId)}&dir=${encodeURIComponent(dir)}&recursive=${deep ? 1 : 0}`,
      );
      if (!r.ok) throw Error();
      const data = await r.json();
      if (version !== requestVersion.current) return;
      setRootName(data.rootName || "Downloads");
      setIndexNotice(
        data.truncated
          ? "Index limit reached (20,000 entries or 24 folder levels). Narrow the folder to see more."
          : data.skipped
            ? `${data.skipped} folders could not be read.`
            : "",
      );
      if (background && JSON.stringify(files) === JSON.stringify(data.files))
        return;
      setFiles(data.files);
      setContentRevision((value) => value + 1);
      const reconciled = reconcileIndex(
        knownFiles,
        data.files,
        data.path || "",
        deep,
        !data.truncated && !data.skipped,
      );
      setKnownFiles(reconciled.files);
      if (Object.keys(reconciled.remapped).length) {
        const metadata = remapMetadata(
          stars,
          collections,
          annotations,
          reconciled.remapped,
        );
        setStars(metadata.stars);
        setCollections(metadata.collections);
        setAnnotations(metadata.annotations);
      }
      if (background) {
        setSelected(
          (previous) =>
            new Set(
              [...previous]
                .map((id) => reconciled.remapped[id] || id)
                .filter((id) =>
                  data.files.some((file: FileItem) => file.id === id),
                ),
            ),
        );
        setDetail((previous) =>
          previous
            ? reconciled.files.find(
                (file) =>
                  file.id === (reconciled.remapped[previous.id] || previous.id),
              ) || { ...previous, missing: true }
            : null,
        );
        setResultPage(0);
      }
      if (dir) {
        const parts = String(data.path).split("/").filter(Boolean);
        setFolderPath(
          parts.map((name, i) => ({
            name,
            id: btoa(
              String.fromCharCode(
                ...new TextEncoder().encode(parts.slice(0, i + 1).join("/")),
              ),
            )
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, ""),
          })),
        );
      } else setFolderPath([]);
      setSource(data.source);
      setScanned(false);
      setDuplicates([]);
    } catch {
      if (version !== requestVersion.current) return;
      if (!background) setFiles([]);
      if (!background) setSource("offline");
      setError(
        "Cannot connect to the local server. Start Sift locally, then retry. You can also explore the sample workspace.",
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      requestVersion.current++;
      scanController.current?.abort();
    };
  }, []);
  loadCurrent.current = async (background = false) => {
    await load(undefined, recursive, background);
  };
  useEffect(() => {
    if (!autoRefresh || source !== "local") return;
    async function refresh() {
      if (
        document.hidden ||
        loading ||
        refreshing.current ||
        scanning ||
        document.querySelector("dialog[open]")
      )
        return;
      refreshing.current = true;
      try {
        await loadCurrent.current(true);
      } finally {
        refreshing.current = false;
      }
    }
    const timer = setInterval(() => void refresh(), 8000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [autoRefresh, source, scanning, loading]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
  }, [theme, density]);
  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const main = document.querySelector<HTMLElement>(".main");
    const media = matchMedia("(max-width:900px)");
    const previous = document.activeElement as HTMLElement | null;
    const update = () => {
      const overlay =
        !!document.querySelector(".inspector") &&
        matchMedia("(max-width:1200px)").matches;
      if (sidebar) sidebar.inert = overlay || (media.matches && !mobile);
      if (main) main.inert = overlay || (media.matches && mobile);
    };
    update();
    media.addEventListener("change", update);
    if (mobile && media.matches)
      sidebar?.querySelector<HTMLElement>("a,button")?.focus();
    function trap(e: KeyboardEvent) {
      if (!mobile || !media.matches || e.key !== "Tab") return;
      const items = Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a[href],input",
        ) || [],
      );
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("keydown", trap);
      if (main) main.inert = false;
      if (mobile) previous?.focus();
    };
  }, [mobile]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  function navigate(p: string) {
    if (p === "All files" && folderPath.length) {
      setFolderPath([]);
      void load("");
    }
    setPage(p);
    setContentMatches(null);
    setQuery("");
    setSize("any");
    setExtension("");
    setAge("");
    setTagFilter("");
    setSelected(new Set());
    setDetail(null);
    setPreview(false);
    setMobile(false);
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
        setDetail(null);
        setPreview(false);
        setSelected(new Set());
        setMobile(false);
      }
      if (
        e.key === "/" &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault();
        document
          .querySelector<HTMLInputElement>('[aria-label="Search files"]')
          ?.focus();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "a" &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) &&
        !["Settings", "Storage", "Duplicates"].includes(page)
      ) {
        e.preventDefault();
        setSelected(new Set(visible.map((f) => f.id)));
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const stats = useMemo(
    () =>
      categories
        .slice(1)
        .map((name) => {
          const items = files.filter((f) => category(f) === name);
          return {
            name,
            size: items.reduce((s, f) => s + (f.folder ? 0 : f.size), 0),
            count: items.length,
            color: colors[name],
          };
        })
        .filter((s) => s.count),
    [files],
  );
  const total = stats.reduce((s, x) => s + x.size, 0),
    count = files.filter((f) => !f.folder).length;
  const indexedFiles = useMemo(
    () => (source === "demo" ? demo : knownFiles),
    [source, knownFiles],
  );
  const base = useMemo(
    () =>
      page === "Starred"
        ? indexedFiles.filter((f) => stars.includes(f.id))
        : page === "Recent"
          ? files.filter(
              (f) =>
                Date.now() - new Date(f.modified).getTime() < 30 * 86400000,
            )
          : page.startsWith("collection:")
            ? indexedFiles.filter((f) =>
                (collections[page.slice(11)] || []).includes(f.id),
              )
            : files,
    [files, indexedFiles, page, stars, collections],
  );
  const visible = useMemo(
    () =>
      sortFiles(
        searchFiles(
          contentMatches
            ? base.filter((file) =>
                contentMatches.some((match) => match.id === file.id),
              )
            : base,
          query,
          categories.includes(page as Category) ? page : "All files",
          size,
          { extension, age, tag: tagFilter, annotations },
        ),
        sort,
        ascending,
        foldersFirst,
      ),
    [
      base,
      query,
      page,
      size,
      sort,
      extension,
      age,
      tagFilter,
      annotations,
      ascending,
      foldersFirst,
      contentMatches,
    ],
  );
  useEffect(() => {
    setSelected(new Set());
    setResultPage(0);
  }, [
    query,
    size,
    extension,
    age,
    tagFilter,
    page,
    sort,
    ascending,
    contentMatches,
  ]);
  const displayed = visible.slice(resultPage * 100, (resultPage + 1) * 100);
  const title =
    page === "All files" && folderPath.length
      ? folderPath.at(-1)!.name
      : page.startsWith("collection:")
        ? page.slice(11)
        : page === "All files"
          ? rootName
          : page;
  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function star(ids: string[]) {
    const all = ids.every((id) => stars.includes(id));
    setStars((prev) =>
      all
        ? prev.filter((id) => !ids.includes(id))
        : [...new Set([...prev, ...ids])],
    );
    notify(all ? "Removed from starred" : "Added to starred");
  }
  function addToCollection(name: string) {
    const ids = [...selected];
    setCollections((prev) => ({
      ...prev,
      [name]: [
        ...new Set([...(Object.hasOwn(prev, name) ? prev[name] : []), ...ids]),
      ],
    }));
    setCollectionDialog(false);
    setNewCollection("");
    notify(
      ids.length
        ? `${ids.length} ${ids.length === 1 ? "file" : "files"} added to ${name}`
        : `${name} collection created`,
    );
    setSelected(new Set());
  }
  function removeFromCollection(name: string, ids: string[]) {
    setCollections((prev) => ({
      ...prev,
      [name]: (prev[name] || []).filter((id) => !ids.includes(id)),
    }));
    setSelected(new Set());
    notify(`Removed from ${name}. Source files are unchanged.`);
  }
  function browseFolder(f: FileItem) {
    if (f.missing) {
      notify("Folder unavailable. Refresh its parent folder to locate it.");
      return;
    }
    if (source !== "local") {
      notify("Sample folder only. Connect locally to browse folder contents.");
      return;
    }
    setDetail(null);
    setSelected(new Set());
    setPage("All files");
    setQuery("");
    void load(f.id);
  }
  function goUp() {
    const next = folderPath.slice(0, -1);
    setFolderPath(next);
    setDetail(null);
    setSelected(new Set());
    void load(next.at(-1)?.id || "");
  }
  async function scan() {
    setScanning(true);
    setScanNotice("");
    const controller = new AbortController();
    scanController.current = controller;
    try {
      if (source === "offline") {
        notify("Connect to the local server before scanning.");
        return;
      }
      if (source === "demo") {
        setDuplicates([["demo-2", "demo-10"]]);
        setScanFiles(demo);
      } else {
        const r = await fetch(
          `/api/duplicates?root=${encodeURIComponent(rootId)}&dir=${encodeURIComponent(folderPath.at(-1)?.id || "")}&recursive=${recursive ? 1 : 0}`,
          { signal: controller.signal },
        );
        if (!r.ok) throw Error();
        const d = await r.json();
        setDuplicates(d.groups);
        setScanFiles(d.files);
        setScanNotice(
          [
            d.truncated
              ? "Scan reached the index limit. Results are partial."
              : "",
            d.skipped
              ? `${d.skipped} unreadable or changing files/folders skipped.`
              : "",
            `${d.hashed} files hashed.`,
          ]
            .filter(Boolean)
            .join(" "),
        );
      }
      setScanned(true);
    } catch {
      if (!controller.signal.aborted)
        notify("Scan failed. Check the local server and try again.");
      else notify("Scan cancelled.");
    } finally {
      setScanning(false);
      scanController.current = null;
    }
  }
  function updateAnnotation(id: string, patch: Partial<Annotation>) {
    setAnnotations((previous) => ({
      ...previous,
      [id]: { ...(previous[id] || { tags: [], note: "" }), ...patch },
    }));
  }
  function exportMetadata() {
    saveFile(
      "sift-files.csv",
      toCsv(
        selected.size ? visible.filter((f) => selected.has(f.id)) : visible,
      ),
      "text/csv;charset=utf-8",
    );
    notify("Exported file metadata as CSV.");
  }
  function saveSearch() {
    const name = query.trim();
    if (!name) return;
    setSavedSearches((previous) =>
      [
        ...previous.filter((s) => s.query !== name),
        { name, query: name },
      ].slice(-12),
    );
    notify("Search saved.");
  }

  async function openPreview(f: FileItem) {
    if (f.missing) {
      notify(
        "File unavailable. Browse its folder or enable subfolders to locate it.",
      );
      return;
    }
    const version = ++previewVersion.current;
    setDetail(f);
    setPreview(true);
    setTextPreview(null);
    setPreviewError("");
    if (source === "demo") {
      setPreviewError(
        "Sample file only. Connect your local Downloads folder to preview actual content.",
      );
      return;
    }
    if (textExtensions.includes(f.ext)) {
      try {
        const r = await fetch(
          `/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(f.id)}`,
        );
        if (!r.ok) throw Error();
        const text = await r.text();
        if (version === previewVersion.current) setTextPreview(text);
      } catch {
        if (version === previewVersion.current)
          setPreviewError(
            "This file could not be loaded. Close the preview and retry.",
          );
      }
    }
  }
  const nav = (name: string, I: typeof Files, badge?: number) => (
    <button
      key={name}
      className={`nav-item ${page === name ? "current" : ""}`}
      onClick={() => navigate(name)}
    >
      <I size={17} />
      <span>{name}</span>
      {badge !== undefined && <small>{badge}</small>}
    </button>
  );
  const categoryCards = (
    <div className="storage-breakdown">
      {stats
        .slice()
        .sort((a, b) => b.size - a.size)
        .map((s) => (
          <button key={s.name} onClick={() => navigate(s.name)}>
            <i style={{ background: s.color }} />
            <span>{s.name}</span>
            <strong>{bytes(s.size)}</strong>
          </button>
        ))}
    </div>
  );
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        aria-label="Primary navigation"
        className={`sidebar ${mobile ? "open" : ""}`}
      >
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("All files");
          }}
        >
          <span className="brand-mark">
            <Download size={20} strokeWidth={2} />
          </span>
          <span>Sift</span>
        </a>
        <label className="workspace folder-picker">
          <Folder size={17} />
          <span>
            <span>Workspace folder</span>
            <select
              aria-label="Workspace folder"
              value={rootId}
              onChange={(event) => onRootChange(event.target.value)}
            >
              {roots.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <button className="sidebar-search" onClick={() => setPalette(true)}>
          <Search size={15} />
          <span>Find files</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="nav-group">
          <span className="nav-label">Workspace</span>
          {nav("All files", Files, files.length)}
          {nav("Recent", Clock)}
          {nav("Starred", Star, stars.length || undefined)}
        </div>
        <div className="nav-group">
          <span className="nav-label">File types</span>
          {categories
            .slice(1, 7)
            .map((c) =>
              nav(c, icons[c], files.filter((f) => category(f) === c).length),
            )}
        </div>
        <div className="nav-group">
          <span className="nav-label">Tools</span>
          {nav("Storage", HardDrive)}
          {nav("Duplicates", Copy, scanned ? duplicates.length : undefined)}
        </div>
        <div className="nav-group collections-nav">
          <div className="nav-label">
            Collections
            <IconButton
              label="Create collection"
              onClick={() => {
                setSelected(new Set());
                setCollectionDialog(true);
              }}
            >
              <Plus size={14} />
            </IconButton>
          </div>
          {Object.entries(collections).map(([name, ids], i) => (
            <button
              key={name}
              className={`nav-item ${page === `collection:${name}` ? "current" : ""}`}
              onClick={() => navigate(`collection:${name}`)}
            >
              <span className={`collection-dot tone-${i % 3}`} />
              <span>{name}</span>
              {ids.length > 0 && <small>{ids.length}</small>}
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="local-status">
            <span className="status-dot" />
            <span>
              {source === "local"
                ? `Connected to ${rootName}`
                : source === "demo"
                  ? "Sample workspace"
                  : "Disconnected"}
              <small>
                {source === "local"
                  ? "Read-only access"
                  : source === "demo"
                    ? "Sample data"
                    : "Start the local server"}
              </small>
            </span>
            <ShieldCheck size={15} />
          </div>
          {nav("Settings", Settings)}
        </div>
      </aside>
      <main className={`main ${detail && !preview ? "with-inspector" : ""}`}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu size={19} />
            </button>
            <Folder size={15} />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="read-only">
              <ShieldCheck size={13} />
              Read-only
            </span>
            <IconButton
              label="Open command palette"
              onClick={() => setPalette(true)}
            >
              <Command size={16} />
            </IconButton>
            <span className="topbar-divider" />
            <button
              className="user-avatar"
              aria-label="Open settings"
              onClick={() => navigate("Settings")}
            >
              <Settings size={15} />
            </button>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>
                {page === "Storage"
                  ? "File sizes and categories in the current scope."
                  : page === "Duplicates"
                    ? "Compare file contents to find exact copies."
                    : page === "Settings"
                      ? "Appearance, browsing, and local data."
                      : page === "Starred"
                        ? "Files you starred across visited folders."
                        : page.startsWith("collection:")
                          ? "A saved group of files. Originals stay in their folders."
                          : `${recursive ? "Including subfolders" : "Current folder only"} · ${source === "local" ? (autoRefresh ? "Auto-refresh on" : "Local files") : source === "demo" ? "Sample files" : "Offline"}`}
              </p>
            </div>
            <div className="heading-actions">
              {!["Settings", "Storage", "Duplicates"].includes(page) && (
                <>
                  <button
                    className="button quiet"
                    onClick={() => {
                      setSelected(new Set());
                      setCollectionDialog(true);
                    }}
                  >
                    <FolderPlus size={15} />
                    New collection
                  </button>
                  <button
                    className="button"
                    disabled={loading}
                    onClick={() => void load()}
                  >
                    <RefreshCw size={14} className={loading ? "spin" : ""} />
                    <span>Refresh</span>
                  </button>
                </>
              )}
              {page === "Storage" && (
                <button className="button" onClick={() => void load()}>
                  <RefreshCw size={14} />
                  Refresh
                </button>
              )}
              {page === "Duplicates" && (
                <button
                  className="button primary"
                  onClick={() => void scan()}
                  disabled={scanning}
                >
                  {scanning ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <Copy size={15} />
                  )}{" "}
                  {scanning
                    ? "Comparing files…"
                    : scanned
                      ? "Scan again"
                      : "Scan for duplicates"}
                </button>
              )}
            </div>
          </div>
          {indexNotice && (
            <div className="connection-notice" role="status">
              {indexNotice}
            </div>
          )}
          {error && (
            <div className="connection-notice">
              <AlertCircle size={15} />
              <span>{error}</span>
              <button onClick={() => void load()}>Retry connection</button>
              <button
                onClick={() => {
                  requestVersion.current++;
                  setSource("demo");
                  setFiles(demo);
                  setError("");
                  setLoading(false);
                  setFolderPath([]);
                }}
              >
                Explore sample files
              </button>
            </div>
          )}
          {page === "Settings" ? (
            <div className="settings-page">
              <section className="settings-section">
                <h2>Appearance</h2>
                <p>Choose how Sift looks on this device.</p>
                <div className="theme-options">
                  {[
                    ["dark", Moon, "Dark", "Charcoal surfaces."],
                    ["light", Sun, "Light", "Light surfaces."],
                    ["system", Monitor, "System", "Follow your device."],
                  ].map(([value, I, label, desc]) => {
                    const Ic = I as typeof Moon;
                    return (
                      <button
                        key={String(value)}
                        className={`theme-option ${theme === value ? "chosen" : ""}`}
                        onClick={() => setTheme(String(value))}
                      >
                        <div className={`theme-mini ${value}`}>
                          <span />
                          <div>
                            <i />
                            <i />
                            <i />
                          </div>
                        </div>
                        <span>
                          <Ic size={15} />
                          {String(label)}
                          {theme === value && <CheckCircle2 size={15} />}
                        </span>
                        <small>{String(desc)}</small>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="settings-section">
                <h2>Layout</h2>
                <div className="setting-row">
                  <span>
                    Default file view
                    <small>Saved automatically on this device.</small>
                  </span>
                  <div className="segmented">
                    <button
                      className={view === "list" ? "active" : ""}
                      onClick={() => setView("list")}
                    >
                      <List size={15} />
                      List
                    </button>
                    <button
                      className={view === "grid" ? "active" : ""}
                      onClick={() => setView("grid")}
                    >
                      <LayoutGrid size={15} />
                      Grid
                    </button>
                  </div>
                </div>
                <div className="setting-row">
                  <span>
                    Row density
                    <small>Fit more files into your workspace.</small>
                  </span>
                  <select
                    aria-label="Row density"
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>
              </section>
              <section className="settings-section">
                <h2>Browsing and backup</h2>
                <div className="setting-row">
                  <span>
                    Automatic refresh
                    <small>
                      Check the current folder every 8 seconds and when this
                      window regains focus.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Automatic refresh"
                    checked={autoRefresh}
                    onChange={(event) => setAutoRefresh(event.target.checked)}
                  />
                </div>
                <div className="setting-row">
                  <span>
                    Folders first
                    <small>Keep folders above files in every view.</small>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Folders first"
                    checked={foldersFirst}
                    onChange={(e) => setFoldersFirst(e.target.checked)}
                  />
                </div>
                <div className="setting-row">
                  <span>
                    Workspace metadata
                    <small>
                      Export stars, collections, tags, notes, and saved searches
                      as JSON.
                    </small>
                  </span>
                  <button
                    className="button"
                    onClick={() =>
                      saveFile(
                        "sift-workspace.json",
                        JSON.stringify(
                          {
                            version: 1,
                            stars,
                            collections,
                            annotations,
                            savedSearches,
                          },
                          null,
                          2,
                        ),
                        "application/json",
                      )
                    }
                  >
                    Export backup
                  </button>
                </div>
                <div className="setting-row">
                  <span>
                    Restore a backup
                    <small>
                      Merge collections, stars, tags, notes, and saved searches.
                    </small>
                  </span>
                  <label className="button" htmlFor="backup-import">
                    Choose backup
                  </label>
                  <input
                    id="backup-import"
                    className="sr-only"
                    type="file"
                    accept=".json,application/json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (file.size > 5_000_000) {
                        notify("Backup is too large. Maximum size is 5 MB.");
                        return;
                      }
                      try {
                        setBackup(parseBackup(await file.text()));
                      } catch {
                        notify(
                          "Invalid Sift backup. Choose a version 1 workspace JSON file.",
                        );
                      }
                    }}
                  />
                </div>
                <p className="subtle">
                  Metadata belongs to this browser and uses paths relative to
                  your configured root. A backup contains filenames and your
                  notes.
                </p>
              </section>
              <section className="settings-section">
                <h2>Local connection</h2>
                <div className="setting-row">
                  <span>
                    Downloads folder
                    <small>
                      {source === "local"
                        ? "Connected through the local read-only API."
                        : "Sample mode. Start the local API to connect."}
                    </small>
                  </span>
                  <span className="tag">
                    {source === "local" ? "Connected" : "Demo"}
                  </span>
                </div>
                <div className="privacy-note">
                  <ShieldCheck size={20} />
                  <p>
                    Local storage
                    <small>
                      Sift reads file metadata and previews locally. Collections
                      and preferences are saved in this browser. Source files
                      are never changed.
                    </small>
                  </p>
                </div>
              </section>
              <section className="settings-section">
                <h2>Keyboard shortcuts</h2>
                {[
                  ["Open command palette", "⌘ / Ctrl K"],
                  ["Select all matching files", "⌘ / Ctrl A"],
                  ["Close panel or clear selection", "Esc"],
                ].map(([label, key]) => (
                  <div className="shortcut-row" key={key}>
                    <span>{label}</span>
                    <kbd>{key}</kbd>
                  </div>
                ))}
              </section>
            </div>
          ) : page === "Storage" ? (
            <div className="analytics-page">
              <section className="storage-overview">
                <div className="section-title">
                  <h2>Current scope</h2>
                  <span className="subtle">
                    {source === "demo" ? "Sample data" : "Live folder metadata"}
                  </span>
                </div>
                <div className="storage-total">
                  <span>{bytes(total)}</span>
                  <p>
                    across {count} files
                    <small>Folder entries are excluded from size totals.</small>
                  </p>
                </div>
                <div className="storage-bar tall">
                  {stats
                    .filter((s) => s.size)
                    .map((s) => (
                      <button
                        key={s.name}
                        style={{
                          width: `${(s.size / total) * 100}%`,
                          background: s.color,
                        }}
                        title={`${s.name}: ${bytes(s.size)}`}
                        onClick={() => navigate(s.name)}
                      />
                    ))}
                </div>
                {categoryCards}
              </section>
              <section className="chart-section">
                <div className="section-title">
                  <div>
                    <h2>Space by file type</h2>
                    <p>Choose a category to browse its files.</p>
                  </div>
                  <div className="segmented">
                    <button
                      className={chartMode === "size" ? "active" : ""}
                      onClick={() => setChartMode("size")}
                    >
                      Size
                    </button>
                    <button
                      className={chartMode === "count" ? "active" : ""}
                      onClick={() => setChartMode("count")}
                    >
                      Files
                    </button>
                  </div>
                </div>
                <StorageChart
                  stats={stats}
                  mode={chartMode}
                  onSelect={navigate}
                />
              </section>
              <section className="largest-section">
                <div className="section-title">
                  <h2>Largest files</h2>
                  <button
                    className="text-button"
                    onClick={() => {
                      navigate("All files");
                      setSort("size");
                    }}
                  >
                    View all
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                {files
                  .filter((f) => !f.folder)
                  .sort((a, b) => b.size - a.size)
                  .slice(0, 5)
                  .map((f, i) => (
                    <button
                      className="largest-row"
                      key={f.id}
                      onClick={() => {
                        setDetail(f);
                        setPreview(false);
                      }}
                    >
                      <span className="rank">{i + 1}</span>
                      <FileIcon file={f} />
                      <span>
                        {f.name}
                        {f.missing && (
                          <small className="missing-label">
                            Unavailable · refresh its folder
                          </small>
                        )}
                        <small>{category(f)}</small>
                      </span>
                      <strong>{bytes(f.size)}</strong>
                      <ChevronRight size={15} />
                    </button>
                  ))}
              </section>
            </div>
          ) : page === "Duplicates" ? (
            <div className="duplicates-page">
              <div className="scope-toolbar">
                <label>
                  <input
                    type="checkbox"
                    checked={recursive}
                    disabled={scanning}
                    onChange={(e) => {
                      setRecursive(e.target.checked);
                      setScanned(false);
                      if (source === "local")
                        void load(undefined, e.target.checked);
                    }}
                  />
                  Include subfolders
                </label>
                <span>
                  {folderPath.length
                    ? folderPath.map((f) => f.name).join(" / ")
                    : rootName}
                </span>
              </div>
              <div className="safety-banner">
                <ShieldCheck size={21} />
                <div>
                  <strong>Exact content comparison</strong>
                  <p>
                    Files are compared using SHA-256 content hashes. Scanning
                    never changes or deletes anything.
                  </p>
                </div>
              </div>
              {scanNotice && (
                <p role="status" className="scan-notice">
                  {scanNotice}
                </p>
              )}
              {scanning ? (
                <div className="scan-state">
                  <Loader2 size={28} className="spin" />
                  <h2>Looking for identical files</h2>
                  <p>
                    Comparing content, not just file names. Large files may take
                    a moment.
                  </p>
                  <button
                    className="button"
                    onClick={() => scanController.current?.abort()}
                  >
                    Cancel scan
                  </button>
                </div>
              ) : !scanned ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <Copy size={30} />
                  </span>
                  <h2>Find duplicate files</h2>
                  <p>
                    Scan the current scope to find exact duplicates.
                    <br />
                    You can review each group before deciding what to keep.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => void scan()}
                  >
                    Scan for duplicates
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              ) : duplicates.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    <CheckCheck size={30} />
                  </span>
                  <h2>No identical files found</h2>
                  <p>
                    Every scanned file has unique content.
                    <br />
                    Run another scan after adding more downloads.
                  </p>
                </div>
              ) : (
                <>
                  <div className="duplicate-summary">
                    <h2>
                      {duplicates.length} duplicate{" "}
                      {duplicates.length === 1 ? "group" : "groups"}
                    </h2>
                    <p>
                      {bytes(
                        duplicates.reduce(
                          (sum, group) =>
                            sum +
                            (scanFiles.find((f) => f.id === group[0])?.size ||
                              0) *
                              (group.length - 1),
                          0,
                        ),
                      )}{" "}
                      in extra copies. Select files to group for review.
                    </p>
                  </div>
                  {duplicates.map((group, i) => (
                    <section className="duplicate-group" key={i}>
                      <div className="section-title">
                        <h3>Identical content · {group.length} copies</h3>
                        <span className="tag">SHA-256 match</span>
                      </div>
                      {group
                        .map((id) => scanFiles.find((f) => f.id === id))
                        .filter((f): f is FileItem => !!f)
                        .map((f) => (
                          <div className="duplicate-row" key={f.id}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${f.name}`}
                              checked={selected.has(f.id)}
                              onChange={() => toggle(f.id)}
                            />
                            <FileIcon file={f} />
                            <button
                              onClick={() => {
                                setDetail(f);
                                setPreview(false);
                              }}
                            >
                              {f.name}
                              {f.missing && (
                                <small className="missing-label">
                                  Unavailable · refresh its folder
                                </small>
                              )}
                              <small>
                                {parentPath(f)} · {date(f.modified)}
                              </small>
                            </button>
                            <span>{bytes(f.size)}</span>
                          </div>
                        ))}
                    </section>
                  ))}
                  {selected.size > 0 && (
                    <div className="duplicate-actions">
                      <span>{selected.size} selected</span>
                      <button
                        className="button primary"
                        onClick={() => setCollectionDialog(true)}
                      >
                        <FolderPlus size={15} />
                        Add to collection
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="file-toolbar">
                <div className="file-tabs">
                  {["All files", "Documents", "Images", "Folders"].map((c) => (
                    <button
                      key={c}
                      className={page === c ? "active" : ""}
                      onClick={() => navigate(c)}
                    >
                      {c}
                      {c === "All files" && <span>{files.length}</span>}
                    </button>
                  ))}
                </div>
                <div className="toolbar-controls">
                  <IconButton
                    label="Show advanced filters"
                    active={showFilters}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <SlidersHorizontal size={16} />
                  </IconButton>
                  <span className="toolbar-divider" />
                  <div className="view-switch">
                    <IconButton
                      label="List view"
                      active={view === "list"}
                      onClick={() => setView("list")}
                    >
                      <List size={17} />
                    </IconButton>
                    <IconButton
                      label="Grid view"
                      active={view === "grid"}
                      onClick={() => setView("grid")}
                    >
                      <LayoutGrid size={16} />
                    </IconButton>
                  </div>
                </div>
              </div>
              <div className="scope-toolbar">
                <label>
                  <input
                    type="checkbox"
                    checked={recursive}
                    onChange={(e) => {
                      setRecursive(e.target.checked);
                      if (source === "local")
                        void load(undefined, e.target.checked);
                      setScanned(false);
                    }}
                  />
                  Include subfolders
                </label>
                <span>
                  {folderPath.length
                    ? rootName +
                      " / " +
                      folderPath.map((f) => f.name).join(" / ")
                    : rootName}
                </span>
                <button
                  className="text-button"
                  onClick={exportMetadata}
                  disabled={!visible.length}
                >
                  Export {selected.size ? "selected" : "view"} CSV
                </button>
                {page.startsWith("collection:") && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setManageCollection(page.slice(11));
                      setRenameValue(page.slice(11));
                    }}
                  >
                    Manage collection
                  </button>
                )}
              </div>
              <div className="search-sort">
                {folderPath.length > 0 && (
                  <IconButton label="Back to parent folder" onClick={goUp}>
                    <ArrowLeft size={17} />
                  </IconButton>
                )}
                <label className="search-input">
                  <Search size={16} />
                  <input
                    aria-label="Search files"
                    placeholder={`Search ${title.toLowerCase()}…`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                  <kbd>/</kbd>
                </label>
                <label className="sort-control">
                  Sort by{" "}
                  <select
                    aria-label="Sort files"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="modified">Last modified</option>
                    <option value="name">Name</option>
                    <option value="size">File size</option>
                  </select>
                </label>
                <IconButton
                  label={ascending ? "Sort descending" : "Sort ascending"}
                  onClick={() => setAscending(!ascending)}
                >
                  {ascending ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </IconButton>
              </div>
              <div className="search-help">
                <span>
                  Search: <code>ext:pdf larger:1mb</code> ·{" "}
                  <code>"project notes"</code> · <code>in:school</code>
                </span>
                {query.trim() && (
                  <button className="text-button" onClick={saveSearch}>
                    Save search
                  </button>
                )}
              </div>
              {savedSearches.length > 0 && (
                <div className="saved-searches">
                  {savedSearches.map((search) => (
                    <span key={search.query}>
                      <button onClick={() => setQuery(search.query)}>
                        {search.name}
                      </button>
                      <button
                        aria-label={`Remove saved search ${search.name}`}
                        onClick={() =>
                          setSavedSearches((previous) =>
                            previous.filter(
                              (item) => item.query !== search.query,
                            ),
                          )
                        }
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <ContentSearch
                revision={contentRevision}
                rootId={rootId}
                dir={folderPath.at(-1)?.id || ""}
                recursive={recursive}
                enabled={source === "local"}
                onResults={setContentMatches}
              />
              {showFilters && (
                <div className="filter-panel">
                  <span>
                    <SlidersHorizontal size={14} />
                    Advanced filters
                  </span>
                  <label>
                    File size
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                    >
                      <option value="any">Any size</option>
                      <option value="large">10 MB or larger</option>
                      <option value="small">Under 10 MB</option>
                    </select>
                  </label>
                  <label>
                    Extension
                    <select
                      aria-label="Filter extension"
                      value={extension}
                      onChange={(e) => setExtension(e.target.value)}
                    >
                      <option value="">Any extension</option>
                      {[
                        ...new Set(
                          base.filter((f) => !f.folder).map((f) => f.ext),
                        ),
                      ]
                        .sort()
                        .map((ext) => (
                          <option key={ext} value={ext}>
                            {ext || "No extension"}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Modified
                    <select
                      aria-label="Filter modified date"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    >
                      <option value="">Any time</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="365">Last year</option>
                    </select>
                  </label>
                  <label>
                    Tag
                    <select
                      aria-label="Filter tag"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                    >
                      <option value="">Any tag</option>
                      {[
                        ...new Set(
                          Object.values(annotations).flatMap((a) => a.tags),
                        ),
                      ]
                        .sort()
                        .map((tag) => (
                          <option key={tag}>{tag}</option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSize("any");
                      setQuery("");
                      setExtension("");
                      setAge("");
                      setTagFilter("");
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
              {selected.size > 0 && (
                <div className="selection-bar">
                  <button
                    className="text-button"
                    onClick={() => setSelected(new Set())}
                  >
                    <X size={15} />
                    {selected.size} selected
                  </button>
                  <div>
                    {page.startsWith("collection:") && (
                      <button
                        onClick={() =>
                          removeFromCollection(page.slice(11), [...selected])
                        }
                      >
                        <X size={14} />
                        Remove from collection
                      </button>
                    )}
                    <button onClick={() => star([...selected])}>
                      <Star size={14} />
                      Star
                    </button>
                    <button onClick={() => setCollectionDialog(true)}>
                      <FolderPlus size={14} />
                      Add to collection
                    </button>
                  </div>
                </div>
              )}
              {loading ? (
                <div
                  className="skeleton-list"
                  aria-label="Loading files"
                  aria-busy="true"
                >
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i}>
                      <span />
                      <i />
                      <i />
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    {query ? <Search size={30} /> : <FolderOpen size={30} />}
                  </span>
                  <h2>
                    {query
                      ? "No files match your search"
                      : page === "Starred"
                        ? "No starred files"
                        : "No files in this view"}
                  </h2>
                  <p>
                    {query
                      ? "Try a different name or clear your filters."
                      : page === "Starred"
                        ? "Use the star beside a file to find it here."
                        : page.startsWith("collection:")
                          ? "Select files in Downloads and add them to this collection."
                          : "No files in this view yet."}
                  </p>
                  {query || size !== "any" ? (
                    <button
                      className="button"
                      onClick={() => {
                        setQuery("");
                        setSize("any");
                      }}
                    >
                      Clear filters
                    </button>
                  ) : (
                    page !== "All files" && (
                      <button
                        className="button"
                        onClick={() => navigate("All files")}
                      >
                        Browse Downloads
                        <ArrowUpRight size={14} />
                      </button>
                    )
                  )}
                </div>
              ) : view === "list" ? (
                <table className="file-table" aria-label="Files">
                  <thead>
                    <tr className="table-head">
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Select all matching files"
                          checked={
                            visible.length > 0 &&
                            visible.every((f) => selected.has(f.id))
                          }
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? new Set(visible.map((f) => f.id))
                                : new Set(),
                            )
                          }
                        />
                      </th>
                      <th>
                        <button
                          onClick={() => {
                            setAscending(sort === "name" ? !ascending : true);
                            setSort("name");
                          }}
                        >
                          Name
                          {sort === "name" &&
                            (ascending ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            ))}
                        </button>
                      </th>
                      <th className="type-cell">Type</th>
                      <th className="size-cell">
                        <button
                          onClick={() => {
                            setAscending(sort === "size" ? !ascending : false);
                            setSort("size");
                          }}
                        >
                          Size
                          {sort === "size" &&
                            (ascending ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            ))}
                        </button>
                      </th>
                      <th className="date-cell">
                        <button
                          onClick={() => {
                            setAscending(
                              sort === "modified" ? !ascending : false,
                            );
                            setSort("modified");
                          }}
                        >
                          Last modified
                          {sort === "modified" &&
                            (ascending ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            ))}
                        </button>
                      </th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((f) => (
                      <tr
                        className={`file-row ${selected.has(f.id) ? "selected" : ""} ${detail?.id === f.id ? "inspected" : ""}`}
                        key={f.id}
                      >
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${f.name}`}
                            checked={selected.has(f.id)}
                            onChange={() => toggle(f.id)}
                          />
                        </td>
                        <td>
                          <button
                            className="file-name"
                            onClick={() => {
                              setDetail(f);
                              setPreview(false);
                            }}
                            onDoubleClick={() =>
                              f.folder ? browseFolder(f) : void openPreview(f)
                            }
                          >
                            <FileIcon file={f} />
                            <span>
                              {f.name}
                              {f.missing && (
                                <small className="missing-label">
                                  Unavailable · refresh its folder
                                </small>
                              )}
                              {recursive && <small>{parentPath(f)}</small>}
                              {!recursive && f.folder && <small>Folder</small>}
                              {contentMatches?.find(
                                (match) => match.id === f.id,
                              )?.snippet && (
                                <small className="content-snippet">
                                  {
                                    contentMatches.find(
                                      (match) => match.id === f.id,
                                    )!.snippet
                                  }
                                </small>
                              )}
                            </span>
                          </button>
                        </td>
                        <td className="type-cell file-type">
                          {f.folder ? "Folder" : f.ext.toUpperCase() || "File"}
                        </td>
                        <td className="size-cell">
                          {f.folder ? "—" : bytes(f.size)}
                        </td>
                        <td className="date-cell">{date(f.modified)}</td>
                        <td className="row-actions">
                          <IconButton
                            label={`${stars.includes(f.id) ? "Unstar" : "Star"} ${f.name}`}
                            active={stars.includes(f.id)}
                            onClick={() => star([f.id])}
                          >
                            <Star
                              size={14}
                              fill={
                                stars.includes(f.id) ? "currentColor" : "none"
                              }
                            />
                          </IconButton>
                          <IconButton
                            label={`Details for ${f.name}`}
                            onClick={() => {
                              setDetail(f);
                              setPreview(false);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="file-grid">
                  {displayed.map((f) => (
                    <article
                      className={`file-card ${selected.has(f.id) ? "selected" : ""}`}
                      key={f.id}
                    >
                      <input
                        className="card-checkbox"
                        type="checkbox"
                        aria-label={`Select ${f.name}`}
                        checked={selected.has(f.id)}
                        onChange={() => toggle(f.id)}
                      />
                      <button
                        className="card-open"
                        onClick={() => {
                          setDetail(f);
                          setPreview(false);
                        }}
                      >
                        <div className="card-preview">
                          {source === "local" &&
                          ["png", "jpg", "jpeg", "webp", "gif"].includes(
                            f.ext,
                          ) ? (
                            <img
                              loading="lazy"
                              src={`/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(f.id)}`}
                              alt={f.name}
                            />
                          ) : (
                            <FileIcon file={f} large />
                          )}
                        </div>
                        <strong>{f.name}</strong>
                        <span>
                          {f.folder ? "Folder" : bytes(f.size)}
                          <i /> {category(f)}
                        </span>
                      </button>
                      <button
                        className={`card-star ${stars.includes(f.id) ? "active" : ""}`}
                        aria-label={`${stars.includes(f.id) ? "Unstar" : "Star"} ${f.name}`}
                        onClick={() => star([f.id])}
                      >
                        <Star
                          size={15}
                          fill={stars.includes(f.id) ? "currentColor" : "none"}
                        />
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <footer className="file-footer">
                <span>
                  {visible.length} {visible.length === 1 ? "item" : "items"}
                  {query && ` matching “${query}”`}
                  <i />
                  {bytes(
                    visible
                      .filter((f) => !f.folder)
                      .reduce((s, f) => s + f.size, 0),
                  )}
                </span>
                {visible.length > 100 && (
                  <div className="pagination">
                    <button
                      className="button"
                      disabled={resultPage === 0}
                      onClick={() => setResultPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      Page {resultPage + 1} of {Math.ceil(visible.length / 100)}
                    </span>
                    <button
                      className="button"
                      disabled={(resultPage + 1) * 100 >= visible.length}
                      onClick={() => setResultPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
                <span>
                  <ShieldCheck size={12} />
                  Source files stay untouched
                </span>
              </footer>
            </>
          )}
        </div>
      </main>
      {detail && !preview && (
        <aside
          ref={inspectorRef}
          className="inspector"
          role={detailOverlay ? "dialog" : undefined}
          aria-modal={detailOverlay ? true : undefined}
          aria-label="File details"
        >
          <div className="inspector-head">
            <span>File details</span>
            <IconButton
              label="Close file details"
              onClick={() => setDetail(null)}
            >
              <X size={17} />
            </IconButton>
          </div>
          <div className="inspector-preview">
            {source === "local" &&
            ["png", "jpg", "jpeg", "webp", "gif"].includes(detail.ext) ? (
              <img
                src={`/api/preview?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(detail.id)}`}
                alt={detail.name}
              />
            ) : (
              <FileIcon file={detail} large />
            )}
          </div>
          <div className="inspector-content">
            <h2>{detail.name}</h2>
            {detail.missing && (
              <p className="missing-label" role="status">
                File unavailable at its last known location. Its tags and notes
                are preserved.
              </p>
            )}
            <p>
              {category(detail)}
              <span>·</span>
              {detail.ext.toUpperCase() || "Folder"}
            </p>
            <div className="inspector-buttons">
              <button
                className="button primary"
                onClick={() =>
                  detail.folder
                    ? browseFolder(detail)
                    : void openPreview(detail)
                }
              >
                {detail.folder ? (
                  <FolderOpen size={14} />
                ) : (
                  <PanelRight size={14} />
                )}{" "}
                {detail.folder ? "Open folder" : "Preview"}
              </button>
              <IconButton
                label={stars.includes(detail.id) ? "Remove star" : "Add star"}
                active={stars.includes(detail.id)}
                onClick={() => star([detail.id])}
              >
                <Star size={16} />
              </IconButton>
            </div>
            <h3>Information</h3>
            <dl>
              {[
                [
                  "Kind",
                  detail.folder ? "Folder" : `${detail.ext.toUpperCase()} file`,
                ],
                [
                  "Size",
                  detail.folder ? "Contents not indexed" : bytes(detail.size),
                ],
                ["Modified", date(detail.modified)],
                ["Created", date(detail.created)],
                [
                  "Location",
                  parentPath(detail) === "Root folder"
                    ? rootName
                    : rootName + " / " + parentPath(detail),
                ],
                ["Access", "Read-only"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {source === "local" && !detail.folder && !detail.missing && (
              <a
                className="button download-link"
                href={`/api/download?root=${encodeURIComponent(rootId)}&id=${encodeURIComponent(detail.id)}`}
                download={detail.name}
              >
                <Download size={14} />
                Download a copy
              </a>
            )}
            <h3>Tags</h3>
            <div className="annotation-tags">
              {(annotations[detail.id]?.tags || []).map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    updateAnnotation(detail.id, {
                      tags: (annotations[detail.id]?.tags || []).filter(
                        (t) => t !== tag,
                      ),
                    })
                  }
                  title="Remove tag"
                >
                  {tag}
                  <X size={12} />
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const tag = tagInput.trim().toLowerCase();
                if (tag) {
                  updateAnnotation(detail.id, {
                    tags: [
                      ...new Set([
                        ...(annotations[detail.id]?.tags || []),
                        tag,
                      ]),
                    ].slice(0, 20),
                  });
                  setTagInput("");
                }
              }}
            >
              <label className="sr-only" htmlFor="file-tag">
                New tag
              </label>
              <div className="tag-input">
                <input
                  id="file-tag"
                  placeholder="Add a tag"
                  maxLength={32}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                />
                <button
                  type="submit"
                  aria-label="Add tag"
                  disabled={!tagInput.trim()}
                >
                  <Plus size={15} />
                </button>
              </div>
            </form>
            <label className="notes-label" htmlFor="file-note">
              Notes
            </label>
            <textarea
              id="file-note"
              placeholder="Notes about this file"
              maxLength={4000}
              value={annotations[detail.id]?.note || ""}
              onChange={(e) =>
                updateAnnotation(detail.id, { note: e.target.value })
              }
            />
            <small className="subtle">
              Saved in this browser. File contents stay unchanged.
            </small>
            <h3>Collections</h3>
            <div className="detail-collections">
              {Object.entries(collections)
                .filter(([, ids]) => ids.includes(detail.id))
                .map(([name]) => (
                  <span className="tag collection-tag" key={name}>
                    {name}
                    <IconButton
                      label={`Remove ${detail.name} from ${name}`}
                      onClick={() => removeFromCollection(name, [detail.id])}
                    >
                      <X size={12} />
                    </IconButton>
                  </span>
                ))}
              <button
                className="text-button"
                onClick={() => {
                  setSelected(new Set([detail.id]));
                  setCollectionDialog(true);
                }}
              >
                <Plus size={14} />
                Add to collection
              </button>
            </div>
            <div className="inspector-safe">
              <ShieldCheck size={16} />
              <span>
                Preview safely.
                <small>Opening this panel never changes your file.</small>
              </span>
            </div>
          </div>
        </aside>
      )}
      {palette && (
        <Modal
          label="Command palette"
          onClose={() => {
            setPalette(false);
            setCommand("");
          }}
          wide
        >
          <div className="command-search">
            <Search size={20} />
            <input
              autoFocus
              placeholder="Search files or jump to…"
              aria-label="Search commands and files"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <button className="escape-key" onClick={() => setPalette(false)}>
              Esc
            </button>
          </div>
          <div className="command-results">
            <span className="command-label">Navigate</span>
            {[
              ["All files", Files],
              ["Storage", HardDrive],
              ["Duplicates", Copy],
              ["Starred", Star],
              ["Settings", Settings],
            ]
              .filter(([label]) =>
                String(label).toLowerCase().includes(command.toLowerCase()),
              )
              .map(([label, I]) => {
                const Ic = I as typeof Files;
                return (
                  <button
                    key={String(label)}
                    onClick={() => {
                      navigate(String(label));
                      setPalette(false);
                      setCommand("");
                    }}
                  >
                    <Ic size={17} />
                    <span>{String(label)}</span>
                    <ChevronRight size={14} />
                  </button>
                );
              })}
            {command && (
              <>
                <span className="command-label">Files</span>
                {files
                  .filter((f) =>
                    f.name.toLowerCase().includes(command.toLowerCase()),
                  )
                  .slice(0, 8)
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setDetail(f);
                        setPreview(false);
                        setPalette(false);
                        setCommand("");
                      }}
                    >
                      <FileIcon file={f} />
                      <span>{f.name}</span>
                      <small>{bytes(f.size)}</small>
                    </button>
                  ))}
                {!files.some((f) =>
                  f.name.toLowerCase().includes(command.toLowerCase()),
                ) && (
                  <p className="command-empty">
                    No matching files. Try another name.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="command-footer">
            <span>
              <Keyboard size={13} />
              Tab to navigate · Enter to open
            </span>
            <span>Sift</span>
          </div>
        </Modal>
      )}
      {backup && (
        <Modal label="Restore workspace backup" onClose={() => setBackup(null)}>
          <div className="modal-header">
            <h2>Restore workspace metadata?</h2>
          </div>
          <p className="backup-explanation">
            This backup contains {Object.keys(backup.collections).length}{" "}
            collections, {backup.stars.length} stars, and{" "}
            {Object.keys(backup.annotations).length} file notes or tag entries.
            Collections and stars merge. Imported notes replace existing notes
            for matching file paths. Source files stay unchanged.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setBackup(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                setStars((previous) => [
                  ...new Set([...previous, ...backup.stars]),
                ]);
                setCollections((previous) =>
                  Object.fromEntries(
                    [
                      ...new Set([
                        ...Object.keys(previous),
                        ...Object.keys(backup.collections),
                      ]),
                    ].map((name) => [
                      name,
                      [
                        ...new Set([
                          ...(previous[name] || []),
                          ...(backup.collections[name] || []),
                        ]),
                      ],
                    ]),
                  ),
                );
                setAnnotations((previous) => ({
                  ...previous,
                  ...backup.annotations,
                }));
                setSavedSearches((previous) =>
                  [
                    ...new Map(
                      [...previous, ...backup.savedSearches].map((item) => [
                        item.query,
                        item,
                      ]),
                    ).values(),
                  ].slice(-12),
                );
                setBackup(null);
                notify("Workspace metadata restored.");
              }}
            >
              Restore metadata
            </button>
          </div>
        </Modal>
      )}
      {manageCollection && (
        <Modal
          label="Manage collection"
          onClose={() => setManageCollection("")}
        >
          <div className="modal-header">
            <h2>Manage collection</h2>
            <IconButton
              label="Close collection management"
              onClick={() => setManageCollection("")}
            >
              <X size={18} />
            </IconButton>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = renameValue.trim();
              if (
                !name ||
                (name !== manageCollection && Object.hasOwn(collections, name))
              )
                return;
              setCollections((previous) => {
                const next = {
                  ...previous,
                  [name]: previous[manageCollection],
                };
                if (name !== manageCollection) delete next[manageCollection];
                return next;
              });
              setPage("collection:" + name);
              setManageCollection("");
              notify("Collection renamed.");
            }}
          >
            <label className="field-label" htmlFor="rename-collection">
              Collection name
            </label>
            <input
              id="rename-collection"
              className="text-field"
              value={renameValue}
              maxLength={48}
              onChange={(e) => setRenameValue(e.target.value)}
            />
            <p className="subtle">
              Removing a collection leaves all source files untouched.
            </p>
            <div className="modal-actions">
              <button
                className="button"
                type="button"
                onClick={() => {
                  setCollections((previous) =>
                    Object.fromEntries(
                      Object.entries(previous).filter(
                        ([name]) => name !== manageCollection,
                      ),
                    ),
                  );
                  setManageCollection("");
                  navigate("All files");
                  notify("Collection removed. Source files unchanged.");
                }}
              >
                Remove collection
              </button>
              <button
                className="button primary"
                disabled={
                  !renameValue.trim() ||
                  (renameValue.trim() !== manageCollection &&
                    Object.hasOwn(collections, renameValue.trim()))
                }
              >
                Save name
              </button>
            </div>
          </form>
        </Modal>
      )}
      {collectionDialog && (
        <Modal
          label="Add to collection"
          onClose={() => setCollectionDialog(false)}
        >
          <div className="modal-header">
            <div>
              <h2>
                {selected.size ? "Add to collection" : "Create a collection"}
              </h2>
              <p>
                {selected.size
                  ? `${selected.size} selected files. No source files will be moved.`
                  : "Keep related files together, wherever they live."}
              </p>
            </div>
            <IconButton
              label="Close collection dialog"
              onClick={() => setCollectionDialog(false)}
            >
              <X size={18} />
            </IconButton>
          </div>
          {selected.size > 0 && (
            <div className="collection-choices">
              {Object.keys(collections).map((name) => (
                <button key={name} onClick={() => addToCollection(name)}>
                  <Folder size={18} />
                  {name}
                  <Plus size={16} />
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newCollection.trim()) addToCollection(newCollection.trim());
            }}
          >
            <label className="field-label" htmlFor="collection-name">
              {selected.size ? "Or create a new collection" : "Collection name"}
            </label>
            <input
              id="collection-name"
              className="text-field"
              autoFocus
              placeholder="e.g. Next project"
              value={newCollection}
              maxLength={48}
              onChange={(e) => setNewCollection(e.target.value)}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                onClick={() => setCollectionDialog(false)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={
                  !newCollection.trim() ||
                  Object.hasOwn(collections, newCollection.trim())
                }
                type="submit"
              >
                {selected.size ? "Create & add files" : "Create collection"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {preview && detail && (
        <FilePreview
          detail={detail}
          rootId={rootId}
          previewError={previewError}
          textPreview={textPreview}
          onClose={() => setPreview(false)}
          onError={setPreviewError}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorkspaceShell>{(props) => <App {...props} />}</WorkspaceShell>
  </React.StrictMode>,
);
