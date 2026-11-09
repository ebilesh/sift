import React, { useRef, useEffect } from "react";
import {
  Files,
  Folder,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  AppWindow,
} from "lucide-react";
import { type FileItem, category, colors } from "./model";
export const icons: Record<string, typeof Files> = {
  "All files": Files,
  Documents: FileText,
  Images: Image,
  Video: Film,
  Audio: Music,
  Archives: Archive,
  Applications: AppWindow,
  Folders: Folder,
  Other: Files,
};
export function IconButton({
  label,
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? "active" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function FileIcon({
  file,
  large = false,
}: {
  file: FileItem;
  large?: boolean;
}) {
  const cat = category(file),
    I = icons[cat];
  return (
    <span
      className={`file-icon ${large ? "large" : ""}`}
      style={{ "--file-color": colors[cat] } as React.CSSProperties}
    >
      <I size={large ? 36 : 21} strokeWidth={1.5} />
      {large && !file.folder && <span>{file.ext.toUpperCase()}</span>}
    </span>
  );
}
export function Modal({
  children,
  onClose,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={wide ? "modal wide" : "modal"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
