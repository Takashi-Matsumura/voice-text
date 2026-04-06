"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { DictionaryEntry } from "../lib/applyDictionary";

export function useDictionary() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const entriesRef = useRef<DictionaryEntry[]>([]);

  // Keep ref in sync with state
  const updateEntries = useCallback((next: DictionaryEntry[]) => {
    setEntries(next);
    entriesRef.current = next;
  }, []);

  // Load on mount
  useEffect(() => {
    fetch("/api/dictionary")
      .then((res) => res.json())
      .then((data: { entries: DictionaryEntry[] }) => {
        updateEntries(data.entries);
      })
      .catch(() => {});
  }, [updateEntries]);

  const addEntry = useCallback(
    async (patterns: string[], replacement: string) => {
      const res = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patterns, replacement }),
      });
      const entry = (await res.json()) as DictionaryEntry;
      updateEntries([...entriesRef.current, entry]);
    },
    [updateEntries]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await fetch("/api/dictionary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      updateEntries(entriesRef.current.filter((e) => e.id !== id));
    },
    [updateEntries]
  );

  const toggleEntry = useCallback(
    async (id: string) => {
      const next = entriesRef.current.map((e) =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      );
      updateEntries(next);
      await fetch("/api/dictionary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: next }),
      });
    },
    [updateEntries]
  );

  return { entries, entriesRef, addEntry, removeEntry, toggleEntry };
}
