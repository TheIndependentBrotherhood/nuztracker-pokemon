"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiffItem {
  key?: string;
  name?: string;
  id?: number;
  current?: unknown;
  incoming?: unknown;
  value?: unknown;
  [key: string]: unknown;
}

export interface SyncDiffResult {
  added: DiffItem[];
  modified: DiffItem[];
  deleted: DiffItem[];
  incoming: unknown;
  info?: string;
}

export interface ProgressEvent {
  type: "progress";
  message: string;
  current?: number;
  total?: number;
}

export interface DiffEvent {
  type: "diff";
  added: DiffItem[];
  modified: DiffItem[];
  deleted: DiffItem[];
  incoming: unknown;
  info?: string;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

type SseEvent = ProgressEvent | DiffEvent | ErrorEvent | { type: "done" };

interface SelectionState {
  added: Set<number>;
  modified: Set<number>;
  deleted: Set<number>;
}

interface Props {
  step: string;
  title: string;
  outputFile: string;
  description?: string;
  renderItem?: (
    item: DiffItem,
    kind: "added" | "modified" | "deleted",
  ) => React.ReactNode;
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getLabel(item: DiffItem): string {
  return (
    (item.name as string) ||
    (item.key as string) ||
    (item.id !== undefined ? `#${item.id}` : "?")
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function DiffSection({
  title,
  color,
  items,
  selected,
  onToggle,
  onToggleAll,
  renderItem,
  kind,
}: {
  title: string;
  color: string;
  items: DiffItem[];
  selected: Set<number>;
  onToggle: (idx: number) => void;
  onToggleAll: (all: boolean) => void;
  renderItem?: (
    item: DiffItem,
    kind: "added" | "modified" | "deleted",
  ) => React.ReactNode;
  kind: "added" | "modified" | "deleted";
}) {
  if (items.length === 0) return null;
  const allChecked = items.every((_, i) => selected.has(i));

  return (
    <div
      style={{
        marginBottom: 20,
        border: `1px solid ${color}33`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: `${color}22`,
          borderBottom: `1px solid ${color}33`,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => onToggleAll(e.target.checked)}
          style={{ width: 14, height: 14, cursor: "pointer" }}
        />
        <span style={{ color, fontWeight: 700, fontSize: 13 }}>
          {title} ({items.length})
        </span>
        <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto" }}>
          {selected.size} sélectionné(s)
        </span>
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 12px",
              borderBottom:
                idx < items.length - 1 ? "1px solid #1e293b" : undefined,
              background: selected.has(idx) ? "#0f1f33" : "transparent",
              cursor: "pointer",
            }}
            onClick={() => onToggle(idx)}
          >
            <input
              type="checkbox"
              checked={selected.has(idx)}
              onChange={() => onToggle(idx)}
              style={{
                width: 14,
                height: 14,
                cursor: "pointer",
                marginTop: 2,
                flexShrink: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 600 }}>
                {getLabel(item)}
              </div>
              {renderItem ? (
                renderItem(item, kind)
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    marginTop: 2,
                    maxHeight: 60,
                    overflow: "hidden",
                  }}
                >
                  {JSON.stringify(item, null, 2).slice(0, 200)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SyncPanel({
  step,
  title,
  outputFile,
  description,
  renderItem,
}: Props) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [diff, setDiff] = useState<SyncDiffResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    added: new Set(),
    modified: new Set(),
    deleted: new Set(),
  });
  const abortRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLogs]);

  const startSync = useCallback(async () => {
    setStatus("running");
    setProgressLogs([]);
    setProgressCurrent(0);
    setProgressTotal(0);
    setDiff(null);
    setErrorMsg(null);
    setSelection({ added: new Set(), modified: new Set(), deleted: new Set() });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/dev/sync/${step}`, {
        method: "POST",
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          const event: SseEvent = JSON.parse(raw);

          if (event.type === "progress") {
            const pe = event as ProgressEvent;
            setProgressLogs((prev) => [...prev.slice(-99), pe.message]);
            if (pe.total) setProgressTotal(pe.total);
            if (pe.current !== undefined) setProgressCurrent(pe.current);
          } else if (event.type === "diff") {
            const de = event as DiffEvent;
            const result: SyncDiffResult = {
              added: de.added ?? [],
              modified: de.modified ?? [],
              deleted: de.deleted ?? [],
              incoming: de.incoming,
              info: de.info,
            };
            setDiff(result);
            // Pre-select all added + modified by default
            setSelection({
              added: new Set(result.added.map((_, i) => i)),
              modified: new Set(result.modified.map((_, i) => i)),
              deleted: new Set(),
            });
          } else if (event.type === "error") {
            setErrorMsg((event as ErrorEvent).message);
            setStatus("error");
            return;
          } else if (event.type === "done") {
            setStatus("done");
          }
        }
      }
      setStatus("done");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    }
  }, [step]);

  const toggle = useCallback((kind: keyof SelectionState, idx: number) => {
    setSelection((prev) => {
      const next = { ...prev, [kind]: new Set(prev[kind]) };
      if (next[kind].has(idx)) next[kind].delete(idx);
      else next[kind].add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (kind: keyof SelectionState, items: DiffItem[], checked: boolean) => {
      setSelection((prev) => ({
        ...prev,
        [kind]: checked ? new Set(items.map((_, i) => i)) : new Set<number>(),
      }));
    },
    [],
  );

  const handleExport = useCallback(() => {
    if (!diff?.incoming) return;

    const incomingData = diff.incoming as Record<string, unknown>;

    // Determine the root array key
    const rootKey = Object.keys(incomingData).find((k) =>
      Array.isArray(incomingData[k]),
    );
    if (!rootKey) {
      // No array structure, export as-is with selected patches applied
      downloadJson(incomingData, outputFile);
      return;
    }

    const incomingItems = incomingData[rootKey] as DiffItem[];

    // Build a map of incoming items by name/key
    const incomingByLabel = new Map(
      incomingItems.map((item) => [getLabel(item), item]),
    );

    // Apply selections:
    // - Added: include if selected
    // - Modified: use incoming version if selected, else current version
    // - Deleted: include if NOT selected (keep if user didn't select delete)

    const addedSelected = diff.added.filter((_, i) => selection.added.has(i));
    const modifiedSelected = diff.modified.filter((_, i) =>
      selection.modified.has(i),
    );
    const deletedSelected = diff.deleted.filter((_, i) =>
      selection.deleted.has(i),
    );

    const deletedNames = new Set(deletedSelected.map((item) => getLabel(item)));
    const modifiedNames = new Set(
      modifiedSelected.map((item) =>
        getLabel((item.incoming as DiffItem) ?? item),
      ),
    );

    // Start from incoming (which contains all unchanged + modified items)
    const filtered = incomingItems.filter((item) => {
      const label = getLabel(item);
      // Exclude deleted items that user chose to delete
      if (deletedNames.has(label)) return false;
      return true;
    });

    // For modified items user didn't select, revert to current version
    const unselectedModifiedNames = new Set(
      diff.modified
        .filter((_, i) => !selection.modified.has(i))
        .map((item) => getLabel((item.incoming as DiffItem) ?? item)),
    );

    const result = filtered.map((item) => {
      const label = getLabel(item);
      if (unselectedModifiedNames.has(label)) {
        // User kept current version for this modified item
        const modItem = diff.modified.find(
          (m) => getLabel((m.incoming as DiffItem) ?? m) === label,
        );
        return (modItem?.current as DiffItem) ?? item;
      }
      return item;
    });

    // Add newly added items user selected
    for (const item of addedSelected) {
      const label = getLabel(item);
      if (!incomingByLabel.has(label)) {
        result.push(item);
      }
    }

    const finalData = {
      ...incomingData,
      [rootKey]: result,
    };

    downloadJson(finalData, outputFile);
  }, [diff, selection, outputFile]);

  const totalSelected =
    selection.added.size + selection.modified.size + selection.deleted.size;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <h1
          style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}
        >
          {title}
        </h1>
        <span
          style={{
            fontSize: 12,
            color: "#64748b",
            fontFamily: "monospace",
            background: "#1e293b",
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          → {outputFile}
        </span>
      </div>

      {description && (
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>
          {description}
        </p>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button
          onClick={startSync}
          disabled={status === "running"}
          style={{
            background: status === "running" ? "#334155" : "#0284c7",
            color: "#f1f5f9",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: status === "running" ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {status === "running" ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid #64748b",
                  borderTopColor: "#38bdf8",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Synchronisation…
            </>
          ) : (
            "🔄 Synchroniser"
          )}
        </button>

        {diff && (
          <button
            onClick={handleExport}
            style={{
              background: "#059669",
              color: "#f1f5f9",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            💾 Exporter ({totalSelected} change{totalSelected !== 1 ? "s" : ""})
          </button>
        )}
      </div>

      {/* Progress bar */}
      {status === "running" && progressTotal > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              height: 6,
              background: "#1e293b",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#0284c7",
                width: `${(progressCurrent / progressTotal) * 100}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {progressCurrent} / {progressTotal}
          </div>
        </div>
      )}

      {/* Logs */}
      {progressLogs.length > 0 && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: 12,
            maxHeight: 160,
            overflowY: "auto",
            marginBottom: 20,
            fontSize: 11,
            color: "#64748b",
            fontFamily: "monospace",
          }}
        >
          {progressLogs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div
          style={{
            background: "#1c0a0a",
            border: "1px solid #ef4444",
            borderRadius: 8,
            padding: 12,
            color: "#ef4444",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          ❌ {errorMsg}
        </div>
      )}

      {/* Info banner */}
      {diff?.info && (
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 12,
            color: "#94a3b8",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          ℹ️ {diff.info}
        </div>
      )}

      {/* Diff results */}
      {diff && (
        <div>
          {/* Summary */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Ajoutés",
                count: diff.added.length,
                color: "#22c55e",
              },
              {
                label: "Modifiés",
                count: diff.modified.length,
                color: "#f59e0b",
              },
              {
                label: "Supprimés",
                count: diff.deleted.length,
                color: "#ef4444",
              },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                style={{
                  background: `${color}11`,
                  border: `1px solid ${color}33`,
                  borderRadius: 8,
                  padding: "10px 16px",
                  minWidth: 100,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700, color }}>
                  {count}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
              </div>
            ))}
          </div>

          <DiffSection
            title="✅ Ajoutés"
            color="#22c55e"
            items={diff.added}
            selected={selection.added}
            onToggle={(idx) => toggle("added", idx)}
            onToggleAll={(all) => toggleAll("added", diff.added, all)}
            renderItem={renderItem}
            kind="added"
          />
          <DiffSection
            title="✏️ Modifiés"
            color="#f59e0b"
            items={diff.modified}
            selected={selection.modified}
            onToggle={(idx) => toggle("modified", idx)}
            onToggleAll={(all) => toggleAll("modified", diff.modified, all)}
            renderItem={renderItem}
            kind="modified"
          />
          <DiffSection
            title="🗑️ Supprimés"
            color="#ef4444"
            items={diff.deleted}
            selected={selection.deleted}
            onToggle={(idx) => toggle("deleted", idx)}
            onToggleAll={(all) => toggleAll("deleted", diff.deleted, all)}
            renderItem={renderItem}
            kind="deleted"
          />

          {diff.added.length === 0 &&
            diff.modified.length === 0 &&
            diff.deleted.length === 0 &&
            !diff.info && (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "#22c55e",
                  fontSize: 16,
                }}
              >
                ✅ Aucun changement — le fichier est à jour
              </div>
            )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
