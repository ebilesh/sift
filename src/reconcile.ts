import type { FileItem, Annotation } from "./model";
// Reconcile only a complete refreshed scope; retain unavailable entries so notes are recoverable.
export function reconcileIndex(
  previous: FileItem[],
  incoming: FileItem[],
  scope: string,
  recursive: boolean,
  complete: boolean,
) {
  const identities = new Map<string, FileItem[]>();
  const oldCounts = new Map<string, number>();
  for (const file of incoming)
    if (file.identity)
      identities.set(file.identity, [
        ...(identities.get(file.identity) || []),
        file,
      ]);
  for (const file of previous)
    if (file.identity)
      oldCounts.set(file.identity, (oldCounts.get(file.identity) || 0) + 1);
  const byId = new Map(incoming.map((file) => [file.id, file]));
  const remapped: Record<string, string> = {};
  const index = new Map<string, FileItem>();
  for (const old of previous) {
    const samePath = byId.get(old.id);
    if (samePath && (!old.identity || old.identity === samePath.identity))
      continue;
    const matches = old.identity ? identities.get(old.identity) : undefined;
    const current =
      matches?.length === 1 && oldCounts.get(old.identity!) === 1
        ? matches[0]
        : undefined;
    if (current) {
      remapped[old.id] = current.id;
      continue;
    }
    const parent = old.relativePath?.split("/").slice(0, -1).join("/") || "";
    const inScope = recursive
      ? !scope || old.relativePath?.startsWith(scope + "/")
      : parent === scope;
    const replaced = !!samePath && !!old.identity;
    const id = replaced ? `${old.id}~${old.identity}` : old.id;
    if (replaced) remapped[old.id] = id;
    index.set(id, {
      ...old,
      id,
      missing: replaced || (complete && inScope) ? true : old.missing,
    });
  }
  for (const file of incoming) index.set(file.id, { ...file, missing: false });
  return { files: [...index.values()], remapped };
}
export function remapMetadata(
  stars: string[],
  collections: Record<string, string[]>,
  annotations: Record<string, Annotation>,
  mapping: Record<string, string>,
) {
  const id = (value: string) => mapping[value] || value;
  return {
    stars: [...new Set(stars.map(id))],
    collections: Object.fromEntries(
      Object.entries(collections).map(([name, ids]) => [
        name,
        [...new Set(ids.map(id))],
      ]),
    ),
    annotations: Object.fromEntries(
      Object.entries(annotations)
        .sort(([a], [b]) => Number(!!mapping[b]) - Number(!!mapping[a]))
        .map(([key, value]) => [id(key), value]),
    ),
  };
}
