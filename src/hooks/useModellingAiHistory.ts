import { useCallback, useEffect, useState } from "react";
import type { ModellingAiAction, ModellingAiInsight } from "@/lib/api/modellingAi";

export interface ModellingAiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  insight?: ModellingAiInsight;
}

export interface ModellingAiHistoryEntry {
  id: string;
  sessionId: string | null;
  parentAction: ModellingAiAction | null;
  title: string;
  messages: ModellingAiMessage[];
  registryId: number | string;
  updatedAt: string;
}

const STORAGE_PREFIX = "modelling-ai-history";

function storageKey(userId: string, registryId: number | string) {
  return `${STORAGE_PREFIX}:${userId}:${registryId}`;
}

function readEntries(userId: string, registryId: number | string): ModellingAiHistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, registryId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ModellingAiHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(userId: string, registryId: number | string, entries: ModellingAiHistoryEntry[]) {
  localStorage.setItem(storageKey(userId, registryId), JSON.stringify(entries.slice(0, 30)));
}

export function useModellingAiHistory(userId: string | undefined, registryId: number | null) {
  const [entries, setEntries] = useState<ModellingAiHistoryEntry[]>([]);

  useEffect(() => {
    if (!userId || registryId == null) {
      setEntries([]);
      return;
    }
    setEntries(readEntries(userId, registryId));
  }, [userId, registryId]);

  const saveConversation = useCallback(
    (entry: Omit<ModellingAiHistoryEntry, "updatedAt">) => {
      if (!userId || registryId == null) return;
      const next: ModellingAiHistoryEntry = { ...entry, updatedAt: new Date().toISOString() };
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.id !== entry.id);
        const merged = [next, ...filtered].slice(0, 30);
        writeEntries(userId, registryId, merged);
        return merged;
      });
    },
    [userId, registryId],
  );

  const removeEntry = useCallback(
    (id: string) => {
      if (!userId || registryId == null) return;
      setEntries((prev) => {
        const merged = prev.filter((e) => e.id !== id);
        writeEntries(userId, registryId, merged);
        return merged;
      });
    },
    [userId, registryId],
  );

  return { entries, saveConversation, removeEntry };
}
