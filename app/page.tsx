"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useBuddy } from "./hooks/useBuddy";
import { useDictionary } from "./hooks/useDictionary";
import { applyDictionary, type TextSegment } from "./lib/applyDictionary";
import Buddy from "./components/Buddy";
import DebugPanel from "./components/DebugPanel";
import DictionaryPanel from "./components/DictionaryPanel";

type Lang = "ja-JP" | "en-US";

type TranscriptEntry = {
  id: number;
  text: string;
  rawText?: string; // original text before dictionary replacement
  segments?: TextSegment[]; // segments with replacement info
  timestamp: Date;
  lang: Lang;
  isBuddy?: boolean;
};

const LANG_CONFIG: Record<Lang, { label: string; flag: string }> = {
  "ja-JP": { label: "日本語", flag: "JP" },
  "en-US": { label: "English", flag: "EN" },
};

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("ja-JP");
  const [debugMode, setDebugMode] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [dictPopup, setDictPopup] = useState<{
    selectedText: string;
    x: number;
    y: number;
  } | null>(null);
  const [dictFormText, setDictFormText] = useState("");
  const [dictFormReplacement, setDictFormReplacement] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const idRef = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const dictionary = useDictionary();
  const buddy = useBuddy(transcripts, lang, { debugMode });

  // Add buddy messages to the transcript timeline
  useEffect(() => {
    if (buddy.buddyMessage) {
      setTranscripts((prev) => [
        ...prev,
        {
          id: ++idRef.current,
          text: buddy.buddyMessage!,
          timestamp: new Date(),
          lang,
          isBuddy: true,
        },
      ]);
      mainRef.current?.scrollTo(0, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buddy.buddyMessage]);

  const startRecording = useCallback(() => {
    setError(null);

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(
        lang === "ja-JP"
          ? "お使いのブラウザは音声認識に対応していません。Chrome または Edge をお使いください。"
          : "Your browser does not support speech recognition. Please use Chrome or Edge."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const rawText = result[0].transcript.trim();
          const { text, segments } = applyDictionary(rawText, dictionary.entriesRef.current);
          if (text) {
            const currentLang = recognition.lang as Lang;
            const hasDictChanges = segments.some((s) => s.original);
            setTranscripts((prev) => [
              ...prev,
              {
                id: ++idRef.current,
                text,
                ...(hasDictChanges ? { rawText, segments } : {}),
                timestamp: new Date(),
                lang: currentLang,
              },
            ]);
            mainRef.current?.scrollTo(0, 0);
          }
          setInterim("");
        } else {
          interimText += result[0].transcript;
        }
      }
      if (interimText) {
        setInterim(interimText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        setError(
          lang === "ja-JP"
            ? `音声認識エラー: ${event.error}`
            : `Speech recognition error: ${event.error}`
        );
      }
      setIsRecording(false);
      isRecordingRef.current = false;
    };

    recognition.onend = () => {
      setIsRecording(false);
      isRecordingRef.current = false;
      setInterim("");
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    isRecordingRef.current = true;
  }, [lang]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    isRecordingRef.current = false;
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setInterim("");
    buddy.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dict popup on outside click
  useEffect(() => {
    if (!dictPopup) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dict-popup]")) {
        setDictPopup(null);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [dictPopup]);

  // Space hold to record, release to stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        if (!isRecordingRef.current) {
          startRecording();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        if (isRecordingRef.current) {
          stopRecording();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startRecording, stopRecording]);

  // Text selection → dictionary registration
  const handleTextSelect = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text) return;

    const range = selection?.getRangeAt(0);
    if (!range) return;

    const rect = range.getBoundingClientRect();
    setDictPopup({
      selectedText: text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setDictFormText(text);
    setDictFormReplacement("");
  }, []);

  const handleDictRegister = useCallback(() => {
    const patterns = dictFormText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (patterns.length === 0 || !dictFormReplacement.trim()) return;
    dictionary.addEntry(patterns, dictFormReplacement.trim());
    setDictPopup(null);
    window.getSelection()?.removeAllRanges();
  }, [dictFormText, dictFormReplacement, dictionary]);

  const closeDictPopup = useCallback(() => {
    setDictPopup(null);
  }, []);

  // Revert a transcript entry to its original (pre-dictionary) text
  const revertDictEntry = useCallback((entryId: number) => {
    setTranscripts((prev) =>
      prev.map((t) =>
        t.id === entryId && t.rawText
          ? { ...t, text: t.rawText, rawText: undefined, segments: undefined }
          : t
      )
    );
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const isJa = lang === "ja-JP";

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans">
      <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {isJa ? "音声文字起こし" : "Voice Transcription"}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              {(Object.entries(LANG_CONFIG) as [Lang, { label: string; flag: string }][]).map(
                ([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (isRecording) stopRecording();
                      setLang(key);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      lang === key
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {config.flag} {config.label}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setDebugMode((v) => !v)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-mono font-medium transition-colors ${
                debugMode
                  ? "bg-amber-400 border-amber-500 text-zinc-900"
                  : "bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title={isJa ? "デバッグ表示を切り替え" : "Toggle debug panel"}
            >
              DEBUG
            </button>
            <button
              onClick={() => setShowDictionary((v) => !v)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-mono font-medium transition-colors ${
                showDictionary
                  ? "bg-blue-400 border-blue-500 text-white"
                  : "bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title={isJa ? "辞書パネルを切り替え" : "Toggle dictionary panel"}
            >
              DICT
            </button>
            <Buddy
              buddyMessage={buddy.buddyMessage}
              isThinking={buddy.isThinking}
              dismissMessage={buddy.dismissMessage}
            />
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto mt-3">
          <div
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium select-none transition-all ${
              isRecording
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
            }`}
          >
            {isRecording ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                </span>
                {isJa ? "録音中... スペースを離すと停止" : "Recording... Release Space to stop"}
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
                {isJa ? "スペース長押しで録音" : "Hold Space to record"}
              </>
            )}
          </div>

          {transcripts.length > 0 && (
            <button
              onClick={clearTranscripts}
              className="rounded-full px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
            >
              {isJa ? "クリア" : "Clear"}
            </button>
          )}
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {transcripts.length === 0 && !interim && !isRecording && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
            <p className="text-lg">
              {isJa ? "スペースキーを長押しで録音" : "Hold Space to record"}
            </p>
          </div>
        )}

        <div className="space-y-3 max-w-2xl mx-auto">
          {interim && (
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3 border border-dashed border-zinc-300 dark:border-zinc-700">
              <p className="text-zinc-500 dark:text-zinc-400 italic">
                {interim}
              </p>
            </div>
          )}

          {[...transcripts].reverse().map((entry) => (
            <div
              key={entry.id}
              onMouseUp={entry.isBuddy ? undefined : handleTextSelect}
              className={`rounded-lg px-4 py-3 shadow-sm border ${
                entry.isBuddy
                  ? "bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 select-text"
              }`}
            >
              <p className={entry.isBuddy ? "text-pink-700 dark:text-pink-300" : "text-zinc-900 dark:text-zinc-100"}>
                {entry.isBuddy && (
                  <span className="mr-1.5" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                    (・ω・)
                  </span>
                )}
                {entry.segments ? (
                  entry.segments.map((seg, i) =>
                    seg.original ? (
                      <span
                        key={i}
                        className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-0.5 border-b border-blue-300 dark:border-blue-700 cursor-help"
                        title={`${isJa ? "元のテキスト" : "Original"}: ${seg.original}`}
                      >
                        {seg.text}
                      </span>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )
                ) : (
                  entry.text
                )}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-400 dark:text-zinc-600">
                  {formatTime(entry.timestamp)}
                </span>
                {entry.isBuddy ? (
                  <span className="text-xs text-pink-300 dark:text-pink-700">BUDDY</span>
                ) : (
                  <span className="text-xs text-zinc-300 dark:text-zinc-700">
                    {LANG_CONFIG[entry.lang].flag}
                  </span>
                )}
                {entry.rawText && (
                  <button
                    onClick={() => revertDictEntry(entry.id)}
                    className="text-xs text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
                    title={isJa ? "辞書置換を元に戻す" : "Revert dictionary replacement"}
                  >
                    {isJa ? "元に戻す" : "revert"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {debugMode && (
        <DebugPanel
          lastDebug={buddy.lastDebug}
          callCount={buddy.callCount}
          onClose={() => setDebugMode(false)}
        />
      )}

      {/* Dictionary registration popup from text selection */}
      {dictPopup && (
        <div
          className="fixed z-30"
          style={{
            left: dictPopup.x,
            top: dictPopup.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div data-dict-popup className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl border border-zinc-200 dark:border-zinc-700 p-3 w-64">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              {isJa ? "辞書に登録" : "Add to dictionary"}
            </div>
            <div className="space-y-1.5">
              <input
                type="text"
                value={dictFormText}
                onChange={(e) => setDictFormText(e.target.value)}
                placeholder={isJa ? "パターン（カンマ区切り）" : "Patterns (comma separated)"}
                className="w-full px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-xs"
                autoFocus
              />
              <input
                type="text"
                value={dictFormReplacement}
                onChange={(e) => setDictFormReplacement(e.target.value)}
                placeholder={isJa ? "正しい表記" : "Correct text"}
                className="w-full px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) handleDictRegister();
                  if (e.key === "Escape") closeDictPopup();
                }}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleDictRegister}
                  className="flex-1 py-1.5 rounded bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                >
                  {isJa ? "登録" : "Add"}
                </button>
                <button
                  onClick={closeDictPopup}
                  className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  {isJa ? "閉じる" : "Cancel"}
                </button>
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-white dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700" />
          </div>
        </div>
      )}

      {showDictionary && (
        <DictionaryPanel
          entries={dictionary.entries}
          onAdd={dictionary.addEntry}
          onRemove={dictionary.removeEntry}
          onToggle={dictionary.toggleEntry}
          onClose={() => setShowDictionary(false)}
        />
      )}
    </div>
  );
}
