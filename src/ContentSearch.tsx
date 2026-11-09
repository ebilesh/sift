import { useEffect, useState, useRef } from "react";
import type { FileItem } from "./model";
export type ContentMatch = FileItem & { snippet: string };
export default function ContentSearch({
  revision,
  rootId,
  dir,
  recursive,
  enabled,
  onResults,
}: {
  revision: number;
  rootId: string;
  dir: string;
  recursive: boolean;
  enabled: boolean;
  onResults: (files: ContentMatch[] | null) => void;
}) {
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const lastSubmitted = useRef("");
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    controller.current?.abort();
    lastSubmitted.current = "";
    setBusy(false);
    setMessage("");
    onResults(null);
  }, [rootId, dir, recursive]);
  useEffect(() => {
    if (lastSubmitted.current && enabled) void search(lastSubmitted.current);
  }, [revision]);
  async function search(term = text) {
    lastSubmitted.current = term;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/search-content?root=${encodeURIComponent(rootId)}&dir=${encodeURIComponent(dir)}&recursive=${recursive ? 1 : 0}&q=${encodeURIComponent(term)}`,
        { signal: request.signal },
      );
      if (!response.ok) throw Error();
      const data = await response.json();
      if (request.signal.aborted) return;
      onResults(data.matches);
      setMessage(
        `${data.matches.length} ${data.matches.length === 1 ? "match" : "matches"} in ${data.inspected} text ${data.inspected === 1 ? "file" : "files"}.${data.partial ? " Partial search: first 64 KB per file; up to 2,000 files / 32 MB." : ""}${data.skipped ? ` ${data.skipped} unreadable entries skipped.` : ""}`,
      );
    } catch {
      if (!request.signal.aborted)
        setMessage(
          "Could not search file contents. Check the connection and retry.",
        );
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  return (
    <details className="content-search">
      <summary>Search inside text and code files</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim() && !busy) void search();
        }}
      >
        <label htmlFor="content-query">Text to find</label>
        <input
          id="content-query"
          value={text}
          maxLength={200}
          placeholder="Search file contents…"
          onChange={(event) => setText(event.target.value)}
        />
        <button className="button" disabled={!enabled || busy || !text.trim()}>
          {busy ? "Searching…" : "Search contents"}
        </button>
        <button
          className="button quiet"
          type="button"
          onClick={() => {
            controller.current?.abort();
            lastSubmitted.current = "";
            setBusy(false);
            onResults(null);
            setMessage("");
          }}
        >
          Clear results
        </button>
      </form>
      <p className="subtle">
        Plain-text formats only, including code, Markdown, CSV, and JSON. PDF
        and Word contents are excluded.
      </p>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
