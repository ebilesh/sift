import { bytes } from "./model";
type Entry = { name: string; size: number; count: number; color: string };
export default function StorageChart({
  stats,
  mode,
  onSelect,
}: {
  stats: Entry[];
  mode: "size" | "count";
  onSelect: (name: string) => void;
}) {
  const maximum = Math.max(1, ...stats.map((entry) => entry[mode]));
  return (
    <div
      className="category-chart"
      aria-label={
        mode === "size" ? "Storage by category" : "File count by category"
      }
    >
      {stats.map((entry) => (
        <button
          key={entry.name}
          onClick={() => onSelect(entry.name)}
          aria-label={`Explore ${entry.name}: ${mode === "size" ? bytes(entry.size) : entry.count + " files"}`}
        >
          <span>{entry.name}</span>
          <span className="chart-track">
            <i
              style={{
                width: `${(entry[mode] / maximum) * 100}%`,
                background: entry.color,
              }}
            />
          </span>
          <strong>{mode === "size" ? bytes(entry.size) : entry.count}</strong>
        </button>
      ))}
    </div>
  );
}
