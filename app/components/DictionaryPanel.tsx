"use client";

import { useState, useMemo } from "react";
import type { DictionaryEntry } from "../lib/applyDictionary";

export default function DictionaryPanel({
  entries,
  onAdd,
  onRemove,
  onToggle,
  onClose,
}: {
  entries: DictionaryEntry[];
  onAdd: (patterns: string[], replacement: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [newPatterns, setNewPatterns] = useState("");
  const [newReplacement, setNewReplacement] = useState("");
  const [filter, setFilter] = useState("");

  const handleAdd = () => {
    const patterns = newPatterns
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (patterns.length === 0 || !newReplacement.trim()) return;
    onAdd(patterns, newReplacement.trim());
    setNewPatterns("");
    setNewReplacement("");
  };

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const q = filter.trim().toLowerCase();
    return entries.filter(
      (e) =>
        e.patterns.some((p) => p.toLowerCase().includes(q)) ||
        e.replacement.toLowerCase().includes(q)
    );
  }, [entries, filter]);

  return (
    <div className="fixed bottom-4 left-4 z-20 w-[28rem] max-h-[75vh] overflow-auto rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-2xl text-xs font-mono text-zinc-700 dark:text-zinc-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/95 dark:bg-zinc-900/95 z-10">
        <span className="font-semibold tracking-wider">
          DICTIONARY
          <span className="ml-1.5 font-normal text-zinc-400">({entries.length})</span>
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          aria-label="Close dictionary panel"
        >
          close
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Add form */}
        <div className="space-y-1.5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
            add entry
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newPatterns}
              onChange={(e) => setNewPatterns(e.target.value)}
              placeholder="patterns (comma separated)"
              className="flex-1 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs"
            />
            <input
              type="text"
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              placeholder="replacement"
              className="flex-1 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAdd();
              }}
            />
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-80 transition-opacity shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        {/* Filter */}
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter..."
          className="w-full px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs"
        />

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-zinc-400 text-center py-2">
            {entries.length === 0 ? "no entries" : "no matches"}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <th className="pb-1.5 font-medium">Pattern</th>
                <th className="pb-1.5 font-medium">Replacement</th>
                <th className="pb-1.5 font-medium w-12 text-center">ON/OFF</th>
                <th className="pb-1.5 w-6" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-zinc-100 dark:border-zinc-800 ${
                    entry.enabled ? "" : "opacity-40"
                  }`}
                >
                  <td className="py-1.5 pr-2 break-words text-zinc-500 dark:text-zinc-400">
                    {entry.patterns.join(", ")}
                  </td>
                  <td className="py-1.5 pr-2 break-words font-semibold">
                    {entry.replacement}
                  </td>
                  <td className="py-1.5 text-center">
                    <button
                      onClick={() => onToggle(entry.id)}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        entry.enabled
                          ? "bg-blue-500"
                          : "bg-zinc-300 dark:bg-zinc-600"
                      }`}
                      role="switch"
                      aria-checked={entry.enabled}
                    >
                      <span
                        className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                          entry.enabled ? "translate-x-[13px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-1.5 text-center">
                    <button
                      onClick={() => onRemove(entry.id)}
                      className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
                      aria-label="Delete entry"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
