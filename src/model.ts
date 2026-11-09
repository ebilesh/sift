export type FileItem = {
  id: string;
  name: string;
  size: number;
  modified: string;
  created: string;
  folder: boolean;
  ext: string;
  relativePath?: string;
  identity?: string;
  missing?: boolean;
};
export type Category =
  | "All files"
  | "Documents"
  | "Images"
  | "Video"
  | "Audio"
  | "Archives"
  | "Applications"
  | "Folders"
  | "Other";
export const categories: Category[] = [
  "All files",
  "Documents",
  "Images",
  "Video",
  "Audio",
  "Archives",
  "Applications",
  "Folders",
  "Other",
];
export const colors: Record<string, string> = {
  Documents: "#9b8ad9",
  Images: "#6ea793",
  Video: "#bc8e70",
  Audio: "#879ac1",
  Archives: "#c3ac70",
  Applications: "#96949f",
  Folders: "#a79ce1",
  Other: "#777780",
};
export function category(f: FileItem): Category {
  if (f.folder) return "Folders";
  if (
    ["pdf", "doc", "docx", "txt", "csv", "xlsx", "xls", "md", "pptx"].includes(
      f.ext,
    )
  )
    return "Documents";
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "heic"].includes(f.ext))
    return "Images";
  if (["mp4", "mov", "mkv", "webm"].includes(f.ext)) return "Video";
  if (["mp3", "wav", "flac", "m4a", "mscz"].includes(f.ext)) return "Audio";
  if (["zip", "rar", "7z", "gz", "tar"].includes(f.ext)) return "Archives";
  if (["dmg", "exe", "rpm", "deb", "appimage"].includes(f.ext))
    return "Applications";
  if (
    [
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "rs",
      "go",
      "css",
      "html",
      "json",
      "yaml",
      "yml",
      "toml",
      "sql",
    ].includes(f.ext)
  )
    return "Documents";
  return "Other";
}
export function bytes(n: number) {
  if (n === 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), 4);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
export function date(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export const demo: FileItem[] = [
  ["Brand guidelines.pdf", 4800000],
  ["Editorial exploration.png", 3200000],
  ["Product walkthrough.mp4", 142000000],
  ["Website assets.zip", 28400000],
  ["Project notes.md", 12400],
  ["Workspace reference.jpg", 2180000],
  ["Quarterly report.xlsx", 870000],
  ["Ambient session.wav", 62000000],
  ["Presentation deck.pdf", 6300000],
  ["Design resources", 4096],
  ["Product walkthrough copy.mp4", 142000000],
  ["Installer.dmg", 246000000],
].map(([name, size], i) => ({
  id: `demo-${i}`,
  name: String(name),
  size: Number(size),
  modified: new Date(Date.now() - i * 36000000).toISOString(),
  created: new Date(Date.now() - i * 36000000).toISOString(),
  folder: i === 9,
  ext: String(name).split(".").pop() || "",
}));
export function filterFiles(
  files: FileItem[],
  query: string,
  cat: string,
  size: string,
) {
  return files.filter(
    (f) =>
      (cat === "All files" || category(f) === cat) &&
      f.name.toLowerCase().includes(query.toLowerCase()) &&
      (size === "any" ||
        (size === "large"
          ? f.size >= 10 * 1024 * 1024
          : f.size < 10 * 1024 * 1024)),
  );
}

export const textExtensions = [
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
export type Annotation = { tags: string[]; note: string };
export type SearchOptions = {
  extension?: string;
  age?: string;
  tag?: string;
  annotations?: Record<string, Annotation>;
};
// Quoted phrases and type:, ext:, larger:, smaller: and in: can be combined.
export function matchesQuery(file: FileItem, query: string) {
  const terms = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return terms.every((raw) => {
    const term = raw.replace(/"/g, "").toLowerCase();
    const colon = term.indexOf(":");
    const key = term.slice(0, colon),
      value = term.slice(colon + 1);
    if (colon > 0 && value) {
      if (key === "ext") return file.ext === value.replace(/^\./, "");
      if (key === "type")
        return (
          category(file).toLowerCase() === value ||
          category(file).toLowerCase() === `${value}s`
        );
      if (key === "in")
        return (file.relativePath || file.name).toLowerCase().includes(value);
      if (key === "larger" || key === "smaller") {
        const match = /^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/.exec(value);
        if (!match) return false;
        const amount =
          Number(match[1]) *
          1024 ** ["b", "kb", "mb", "gb"].indexOf(match[2] || "b");
        return (
          !file.folder &&
          (key === "larger" ? file.size > amount : file.size < amount)
        );
      }
    }
    return file.name.toLowerCase().includes(term);
  });
}
export function searchFiles(
  files: FileItem[],
  query: string,
  cat: string,
  size: string,
  options: SearchOptions = {},
) {
  return files.filter(
    (file) =>
      (cat === "All files" || category(file) === cat) &&
      matchesQuery(file, query) &&
      (size === "any" ||
        (!file.folder &&
          (size === "large"
            ? file.size >= 10 * 1024 * 1024
            : file.size < 10 * 1024 * 1024))) &&
      (!options.extension || file.ext === options.extension) &&
      (!options.age ||
        Date.now() - new Date(file.modified).getTime() <=
          Number(options.age) * 86400000) &&
      (!options.tag ||
        options.annotations?.[file.id]?.tags.includes(options.tag)),
  );
}
export function sortFiles(
  files: FileItem[],
  sort: string,
  ascending: boolean,
  foldersFirst: boolean,
) {
  return [...files].sort((a, b) => {
    if (foldersFirst && a.folder !== b.folder) return a.folder ? -1 : 1;
    const value =
      sort === "name"
        ? a.name.localeCompare(b.name, undefined, { numeric: true })
        : sort === "size"
          ? a.size - b.size
          : new Date(a.modified).getTime() - new Date(b.modified).getTime();
    return (ascending ? 1 : -1) * value || a.name.localeCompare(b.name);
  });
}
export function toCsv(files: FileItem[]) {
  const quote = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return [
    ["Name", "Relative path", "Type", "Bytes", "Modified"],
    ...files.map((f) => [
      f.name,
      f.relativePath || f.name,
      f.folder ? "Folder" : f.ext,
      f.folder ? "" : f.size,
      f.modified,
    ]),
  ]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
}
export type WorkspaceBackup = {
  version: 1;
  stars: string[];
  collections: Record<string, string[]>;
  annotations: Record<string, Annotation>;
  savedSearches: { name: string; query: string }[];
};
export function parseBackup(text: string): WorkspaceBackup {
  const data = JSON.parse(text);
  const strings = (value: unknown): value is string[] =>
    Array.isArray(value) &&
    value.length <= 20000 &&
    value.every((item) => typeof item === "string" && item.length <= 4096);
  const record = (value: unknown): value is Record<string, unknown> =>
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length <= 20000;
  if (
    data.version !== 1 ||
    !strings(data.stars) ||
    !record(data.collections) ||
    !record(data.annotations) ||
    !Array.isArray(data.savedSearches) ||
    data.savedSearches.length > 12
  )
    throw Error("Invalid workspace backup");
  for (const [name, ids] of Object.entries(data.collections))
    if (!name.trim() || name.length > 48 || !strings(ids))
      throw Error("Invalid collections");
  for (const item of Object.values(data.annotations) as Annotation[])
    if (
      !item ||
      !strings(item.tags) ||
      item.tags.length > 20 ||
      item.tags.some((tag) => tag.length > 32) ||
      typeof item.note !== "string" ||
      item.note.length > 4000
    )
      throw Error("Invalid notes or tags");
  for (const item of data.savedSearches)
    if (
      !item ||
      typeof item.name !== "string" ||
      typeof item.query !== "string" ||
      item.name.length > 2000 ||
      item.query.length > 2000
    )
      throw Error("Invalid saved searches");
  return data;
}
