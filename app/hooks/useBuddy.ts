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

// Minimum time between LLM calls to avoid spamming during rapid input
const COOLDOWN_MS = 8_000;
// Probability of showing the generated comment (40%)
const SHOW_PROBABILITY = 0.4;

export function useBuddy(transcripts: TranscriptEntry[], lang: Lang) {
  const [buddyMessage, setBuddyMessage] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

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
        if (data.message) {
          if (Math.random() < SHOW_PROBABILITY) {
            setBuddyMessage(data.message);
          }
        }
      } catch {
        // buddy stays silent
      } finally {
        isFetchingRef.current = false;
        setIsThinking(false);
        lastFetchTimeRef.current = Date.now();
      }
    },
    [lang]
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

  return { buddyMessage, isThinking, dismissMessage, reset };
}
