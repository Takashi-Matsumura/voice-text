"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Lang = "ja-JP" | "en-US";

type TranscriptEntry = {
  id: number;
  text: string;
  timestamp: Date;
  lang: Lang;
  isBuddy?: boolean;
};

export type BuddyDebugInfo = {
  timestamp: string;
  upstreamUrl: string;
  model: string;
  httpStatus?: number;
  latencyMs: number;
  requestMessages?: { role: string; content: string }[];
  requestParams?: { max_tokens: number; temperature: number };
  rawResponse?: unknown;
  error?: string;
  extractedMessage: string;
  shown: boolean;
};

// Minimum time between LLM calls to avoid spamming during rapid input
const COOLDOWN_MS = 8_000;
// Probability of showing the generated comment (40%)
const SHOW_PROBABILITY = 0.4;

export function useBuddy(
  transcripts: TranscriptEntry[],
  lang: Lang,
  options: { debugMode?: boolean } = {}
) {
  const { debugMode = false } = options;
  const showProbability = debugMode ? 1.0 : SHOW_PROBABILITY;
  const [buddyMessage, setBuddyMessage] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [lastDebug, setLastDebug] = useState<BuddyDebugInfo | null>(null);
  const [callCount, setCallCount] = useState(0);

  const lastSeenCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const lastBuddyIndexRef = useRef(-1); // index of last buddy entry in transcripts
  const isFetchingRef = useRef(false);

  const fetchBuddyComment = useCallback(
    async (context: { buddyHistory: string[]; newTranscripts: string[] }) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsThinking(true);

      try {
        const res = await fetch("/api/buddy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buddyHistory: context.buddyHistory,
            newTranscripts: context.newTranscripts,
            lang,
          }),
        });
        const data = await res.json();
        const extracted: string = data.message ?? "";
        const shown = Boolean(extracted) && Math.random() < showProbability;
        if (shown) {
          setBuddyMessage(extracted);
        }
        setLastDebug({
          timestamp: new Date().toISOString(),
          upstreamUrl: data.debug?.upstreamUrl ?? "?",
          model: data.debug?.model ?? "?",
          httpStatus: data.debug?.httpStatus,
          latencyMs: data.debug?.latencyMs ?? 0,
          requestMessages: data.debug?.requestMessages,
          requestParams: data.debug?.requestParams,
          rawResponse: data.debug?.rawResponse,
          error: data.debug?.error,
          extractedMessage: extracted,
          shown,
        });
        setCallCount((c) => c + 1);
      } catch (e) {
        setLastDebug({
          timestamp: new Date().toISOString(),
          upstreamUrl: "/api/buddy",
          model: "?",
          latencyMs: 0,
          extractedMessage: "",
          shown: false,
          error: e instanceof Error ? e.message : String(e),
        });
        setCallCount((c) => c + 1);
      } finally {
        isFetchingRef.current = false;
        setIsThinking(false);
        lastFetchTimeRef.current = Date.now();
      }
    },
    [lang, showProbability]
  );

  // Trigger on every new user transcript
  useEffect(() => {
    const userTranscripts = transcripts.filter((t) => !t.isBuddy);
    const currentCount = userTranscripts.length;

    if (currentCount <= lastSeenCountRef.current) return;
    lastSeenCountRef.current = currentCount;

    // Skip if still fetching or within cooldown
    if (isFetchingRef.current) return;
    if (Date.now() - lastFetchTimeRef.current < COOLDOWN_MS) return;

    // Collect buddy's past messages (up to last 5)
    const buddyHistory = transcripts
      .filter((t) => t.isBuddy)
      .slice(-5)
      .map((t) => t.text);

    // Collect only user transcripts AFTER the last buddy entry
    const lastBuddyIdx = transcripts.reduce(
      (acc, t, i) => (t.isBuddy ? i : acc),
      -1
    );
    const newTranscripts = transcripts
      .slice(lastBuddyIdx + 1)
      .filter((t) => !t.isBuddy)
      .map((t) => t.text);

    if (newTranscripts.length === 0) return;

    lastBuddyIndexRef.current = transcripts.length - 1;
    fetchBuddyComment({ buddyHistory, newTranscripts });
  }, [transcripts, fetchBuddyComment]);

  const dismissMessage = useCallback(() => {
    setBuddyMessage(null);
  }, []);

  const reset = useCallback(() => {
    setBuddyMessage(null);
    setIsThinking(false);
    lastSeenCountRef.current = 0;
    lastFetchTimeRef.current = 0;
    lastBuddyIndexRef.current = -1;
  }, []);

  return { buddyMessage, isThinking, dismissMessage, reset, lastDebug, callCount };
}
