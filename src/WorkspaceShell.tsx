import { useEffect, useState, type ReactNode } from "react";
import { StorageScope, read } from "./workspace";
export type RootChoice = { id: string; name: string };
export type RootProps = {
  rootId: string;
  roots: RootChoice[];
  onRootChange: (id: string) => void;
};
export default function WorkspaceShell({
  children,
}: {
  children: (props: RootProps) => ReactNode;
}) {
  const [roots, setRoots] = useState<RootChoice[]>([
    { id: "default", name: "Downloads" },
  ]);
  const [active, setActive] = useState(() =>
    read("sift-active-root", "default"),
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/roots", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((data) => {
        setRoots(data.roots);
        setActive((previous) =>
          data.roots.some((root: RootChoice) => root.id === previous)
            ? previous
            : "default",
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    return () => controller.abort();
  }, []);
  function choose(id: string) {
    setActive(id);
    try {
      localStorage.setItem("sift-active-root", JSON.stringify(id));
    } catch {}
  }
  if (!ready)
    return (
      <div className="workspace-start" role="status">
        Connecting to local folders…
      </div>
    );
  return (
    <StorageScope.Provider value={active === "default" ? "" : active}>
      <div key={active}>
        {children({ rootId: active, roots, onRootChange: choose })}
      </div>
    </StorageScope.Provider>
  );
}
