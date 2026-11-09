import { createContext, useContext, useEffect, useState } from "react";
export const StorageScope = createContext("");
export function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function useStored<T>(key: string, initial: T) {
  const scope = useContext(StorageScope);
  key = scope ? `sift-root:${scope}:${key}` : key;
  const [value, setValue] = useState<T>(() => read(key, initial));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Browsing remains available when browser storage is full. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
export function saveFile(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function parentPath(file: { relativePath?: string }) {
  return file.relativePath?.split("/").slice(0, -1).join("/") || "Root folder";
}
