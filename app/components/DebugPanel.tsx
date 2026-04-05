"use client";

import { useCallback, useEffect, useState } from "react";
import type { BuddyDebugInfo } from "../hooks/useBuddy";

type ServerStatus = {
  reachable: boolean;
  httpStatus?: number;
  latencyMs: number;
  upstreamUrl: string;
  configuredModel?: string;
  models?: string[];
  error?: string;
};

export default function DebugPanel({
  lastDebug,
  callCount,
  onClose,
}: {
  lastDebug: BuddyDebugInfo | null;
  callCount: number;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/buddy");
      const data = (await res.json()) as ServerStatus;
      setStatus(data);
    } catch (e) {
      setStatus({
        reachable: false,
        latencyMs: 0,
        upstreamUrl: "?",
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="fixed bottom-4 right-4 z-20 w-[26rem] max-h-[75vh] overflow-auto rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-2xl text-xs font-mono text-zinc-700 dark:text-zinc-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/95 dark:bg-zinc-900/95">
        <span className="font-semibold tracking-wider">DEBUG — LLM</span>
        <div className="flex gap-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
          >
            {loading ? "refreshing…" : "refresh"}
          </button>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label="Close debug panel"
          >
            close
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        <section>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
            llama.cpp server
          </div>
          {status ? (
            <div className="space-y-0.5">
              <div>
                status:{" "}
                <span
                  className={
                    status.reachable
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {status.reachable ? "UP" : "DOWN"}
                </span>
                {status.httpStatus != null && ` (HTTP ${status.httpStatus})`}
              </div>
              <div className="break-all">url: {status.upstreamUrl}</div>
              <div>latency: {status.latencyMs}ms</div>
              {status.configuredModel && (
                <div>configured model: {status.configuredModel}</div>
              )}
              {status.models && status.models.length > 0 && (
                <div>loaded models: [{status.models.join(", ")}]</div>
              )}
              {status.error && (
                <div className="text-red-600 dark:text-red-400 break-words">
                  error: {status.error}
                </div>
              )}
            </div>
          ) : (
            <div className="text-zinc-400">loading…</div>
          )}
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
            last call (total: {callCount})
          </div>
          {lastDebug ? (
            <div className="space-y-1">
              <div>ts: {lastDebug.timestamp}</div>
              <div>model: {lastDebug.model}</div>
              <div>
                http: {lastDebug.httpStatus ?? "-"} · latency:{" "}
                {lastDebug.latencyMs}ms
              </div>
              {lastDebug.requestParams && (
                <div>
                  params: max_tokens={lastDebug.requestParams.max_tokens},
                  temperature={lastDebug.requestParams.temperature}
                </div>
              )}
              <div>
                shown:{" "}
                {lastDebug.shown ? (
                  <span className="text-green-600 dark:text-green-400">yes</span>
                ) : (
                  <span className="text-zinc-400">
                    no {lastDebug.extractedMessage ? "(random skip)" : "(empty)"}
                  </span>
                )}
              </div>
              <div className="break-words">
                reply: {lastDebug.extractedMessage || <span className="text-zinc-400">∅</span>}
              </div>
              {lastDebug.error && (
                <div className="text-red-600 dark:text-red-400 break-words">
                  error: {lastDebug.error}
                </div>
              )}
              {lastDebug.requestMessages && lastDebug.requestMessages.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    request.messages ({lastDebug.requestMessages.length})
                  </summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] bg-zinc-50 dark:bg-zinc-950 rounded p-2 max-h-64 overflow-auto">
                    {JSON.stringify(lastDebug.requestMessages, null, 2)}
                  </pre>
                </details>
              )}
              {lastDebug.rawResponse !== undefined && (
                <details>
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    raw response
                  </summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] bg-zinc-50 dark:bg-zinc-950 rounded p-2 max-h-64 overflow-auto">
                    {JSON.stringify(lastDebug.rawResponse, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <div className="text-zinc-400">no calls yet — say something first</div>
          )}
        </section>
      </div>
    </div>
  );
}
