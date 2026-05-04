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

// ─── Diff Viewer ─────────────────────────────────────────────────────────────

// Recursively find paths of changed properties
function getChangedPaths(
  current: unknown,
  incoming: unknown,
  path = "",
): Set<string> {
  const changed = new Set<string>();

  // Different types
  if (typeof current !== typeof incoming) {
    changed.add(path || "root");
    return changed;
  }

  // Different primitives
  if (typeof current !== "object" || current === null || incoming === null) {
    if (current !== incoming) {
      changed.add(path || "root");
    }
    return changed;
  }

  // Both are arrays
  if (Array.isArray(current) && Array.isArray(incoming)) {
    if (current.length !== incoming.length) {
      changed.add(path || "root");
    }
    const minLen = Math.min(current.length, incoming.length);
    for (let i = 0; i < minLen; i++) {
      const pathKey = `${path}[${i}]`;
      if (JSON.stringify(current[i]) !== JSON.stringify(incoming[i])) {
        changed.add(pathKey);
      }
    }
    return changed;
  }

  // Both are objects
  if (typeof current === "object" && typeof incoming === "object") {
    const allKeys = new Set([
      ...Object.keys(current as Record<string, unknown>),
      ...Object.keys(incoming as Record<string, unknown>),
    ]);

    for (const key of allKeys) {
      const currentVal = (current as Record<string, unknown>)[key];
      const incomingVal = (incoming as Record<string, unknown>)[key];
      const pathKey = path ? `${path}.${key}` : key;

      // For nested objects/arrays, recurse to find deep changes
      if (typeof currentVal === "object" && typeof incomingVal === "object") {
        const deepChanges = getChangedPaths(currentVal, incomingVal, pathKey);
        for (const change of deepChanges) {
          changed.add(change);
        }
      } else if (JSON.stringify(currentVal) !== JSON.stringify(incomingVal)) {
        // For primitives, add the key if different
        changed.add(pathKey);
      }
    }
  }

  return changed;
}

// Build a map of line number to JSON path context using indentation tracking
function buildLineToPathMap(lines: string[]): Map<number, string> {
  const lineToPath = new Map<number, string>();
  const indentStack: Array<{ indent: number; key: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and closing braces/brackets
    if (!trimmed || trimmed.startsWith("}") || trimmed.startsWith("]")) {
      // Pop from stack if indentation decreased
      const currentIndent = line.search(/\S/);
      while (
        indentStack.length > 0 &&
        indentStack[indentStack.length - 1].indent >= currentIndent
      ) {
        indentStack.pop();
      }
      continue;
    }

    // Extract key from lines like "  "name": value"
    const keyMatch = line.match(/"([^"]+)"\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      const currentIndent = line.search(/\S/);

      // Pop items from stack if we're at same or less indentation
      while (
        indentStack.length > 0 &&
        indentStack[indentStack.length - 1].indent >= currentIndent
      ) {
        indentStack.pop();
      }

      // Build the full path
      const fullPath = [...indentStack.map((item) => item.key), key].join(".");
      lineToPath.set(i, fullPath);

      // Push this key to stack if line has object/array
      if (trimmed.includes("{") || trimmed.includes("[")) {
        indentStack.push({ indent: currentIndent, key });
      }
    }
  }

  return lineToPath;
}

// Find lines that contain any of the changed property keys
function getChangedLineNumbers(
  lines: string[],
  changedPaths: Set<string>,
): Set<number> {
  const changedLines = new Set<number>();
  const lineToPath = buildLineToPathMap(lines);

  for (let i = 0; i < lines.length; i++) {
    const linePath = lineToPath.get(i);
    if (linePath && changedPaths.has(linePath)) {
      changedLines.add(i);
    }
  }

  return changedLines;
}

function DiffViewer({
  current,
  incoming,
}: {
  current: unknown;
  incoming: unknown;
}) {
  const currentStr = JSON.stringify(current, null, 2);
  const incomingStr = JSON.stringify(incoming, null, 2);

  const currentLines = currentStr.split("\n");
  const incomingLines = incomingStr.split("\n");

  // Compute property-aware diff
  const changedPaths = getChangedPaths(current, incoming);
  const changedCurrentLines = getChangedLineNumbers(currentLines, changedPaths);
  const changedIncomingLines = getChangedLineNumbers(
    incomingLines,
    changedPaths,
  );

  // If no paths changed but strings differ, fall back to line-by-line
  if (changedPaths.size === 0 && currentStr !== incomingStr) {
    for (
      let i = 0;
      i < Math.max(currentLines.length, incomingLines.length);
      i++
    ) {
      if ((currentLines[i] || "") !== (incomingLines[i] || "")) {
        changedCurrentLines.add(i);
        changedIncomingLines.add(i);
      }
    }
  }

  const maxLines = Math.max(currentLines.length, incomingLines.length);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1px",
        background: "#1e293b",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Left side - Current */}
      <div style={{ background: "#0f172a", overflow: "auto" }}>
        <div
          style={{
            background: "#1e293b",
            padding: "8px 12px",
            borderBottom: "1px solid #334155",
            fontSize: 11,
            fontWeight: 600,
            color: "#ef4444",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          ← Actuel (current)
        </div>
        <pre
          style={{
            margin: 0,
            padding: "12px",
            fontSize: 10,
            color: "#cbd5e1",
            fontFamily: "monospace",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {currentLines.map((line, i) => {
            const isChanged = changedCurrentLines.has(i);
            return (
              <div
                key={i}
                style={{
                  background: isChanged ? "#1c0a0a" : "transparent",
                  color: isChanged ? "#fca5a5" : "#cbd5e1",
                }}
              >
                {line}
              </div>
            );
          })}
        </pre>
      </div>

      {/* Right side - Incoming */}
      <div style={{ background: "#0f172a", overflow: "auto" }}>
        <div
          style={{
            background: "#1e293b",
            padding: "8px 12px",
            borderBottom: "1px solid #334155",
            fontSize: 11,
            fontWeight: 600,
            color: "#22c55e",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          → Nouveau (incoming)
        </div>
        <pre
          style={{
            margin: 0,
            padding: "12px",
            fontSize: 10,
            color: "#cbd5e1",
            fontFamily: "monospace",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {incomingLines.map((line, i) => {
            const isChanged = changedIncomingLines.has(i);
            return (
              <div
                key={i}
                style={{
                  background: isChanged ? "#0a2e0a" : "transparent",
                  color: isChanged ? "#86efac" : "#cbd5e1",
                }}
              >
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function JsonModal({
  item,
  kind,
  onClose,
}: {
  item: DiffItem | null;
  kind: "added" | "modified" | "deleted";
  onClose: () => void;
}) {
  if (!item) return null;

  let title: string = "";
  let showDiff = false;
  let jsonContent = "";

  if (kind === "modified") {
    title = `Modification: ${getLabel(item)}`;
    showDiff = true;
    // Content will be rendered in DiffViewer
  } else {
    title =
      kind === "added"
        ? `Nouveau: ${getLabel(item)}`
        : `Supprimé: ${getLabel(item)}`;
    jsonContent = JSON.stringify(
      kind === "deleted" ? item.value : item,
      null,
      2,
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 12,
          maxWidth: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, color: "#f1f5f9" }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 20,
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "16px 20px",
          }}
        >
          {showDiff && item.current && item.incoming ? (
            <DiffViewer current={item.current} incoming={item.incoming} />
          ) : (
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                color: "#cbd5e1",
                fontFamily: "Menlo, Monaco, monospace",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {jsonContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #1e293b",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          {!showDiff && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(jsonContent);
                alert("Copié!");
              }}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                background: "#1e293b",
                color: "#94a3b8",
                border: "1px solid #334155",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Copier
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
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
  onViewDetail,
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
  onViewDetail: (item: DiffItem) => void;
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail(item);
              }}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                background: "#1e293b",
                color: "#60a5fa",
                border: "1px solid #334155",
                borderRadius: 4,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Voir JSON
            </button>
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
  const [modalItem, setModalItem] = useState<DiffItem | null>(null);
  const [modalKind, setModalKind] = useState<"added" | "modified" | "deleted">(
    "added",
  );
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
      const res = await fetch(`/api/dev/sync/${step}/`, {
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
      {status === "running" && (
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
            {progressTotal > 0 ? (
              <div
                style={{
                  height: "100%",
                  background: "#0284c7",
                  width: `${(progressCurrent / progressTotal) * 100}%`,
                  transition: "width 0.3s",
                }}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  background: "#0284c7",
                  animation: "pulse 1.5s ease-in-out infinite",
                  opacity: 0.6,
                }}
              />
            )}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {progressTotal > 0
              ? `${progressCurrent} / ${progressTotal}`
              : "En cours…"}
          </div>
        </div>
      )}

      {/* Logs */}
      {status === "running" || progressLogs.length > 0 ? (
        <div
          style={{
            background: "#0f172a",
            border: `1px solid ${status === "running" ? "#0284c7" : "#1e293b"}`,
            borderRadius: 8,
            padding: 12,
            maxHeight: 200,
            overflowY: "auto",
            marginBottom: 20,
            fontSize: 11,
            color: "#64748b",
            fontFamily: "monospace",
          }}
        >
          {progressLogs.length === 0 && status === "running" ? (
            <div style={{ color: "#38bdf8" }}>
              Démarrage de la synchronisation…
            </div>
          ) : (
            progressLogs.map((log, i) => (
              <div
                key={i}
                style={{ marginBottom: i === progressLogs.length - 1 ? 0 : 2 }}
              >
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      ) : null}

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
            onViewDetail={(item) => {
              setModalItem(item);
              setModalKind("added");
            }}
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
            onViewDetail={(item) => {
              setModalItem(item);
              setModalKind("modified");
            }}
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
            onViewDetail={(item) => {
              setModalItem(item);
              setModalKind("deleted");
            }}
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

      <JsonModal
        item={modalItem}
        kind={modalKind}
        onClose={() => setModalItem(null)}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
