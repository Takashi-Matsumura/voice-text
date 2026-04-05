"use client";

import { useEffect, useRef, useState } from "react";

type BuddyProps = {
  buddyMessage: string | null;
  isThinking: boolean;
  dismissMessage: () => void;
};

function BuddyCharacter({ isSpeaking, isThinking }: { isSpeaking: boolean; isThinking: boolean }) {
  const animClass = isSpeaking
    ? "buddy-wiggle"
    : isThinking
      ? "buddy-bounce"
      : "buddy-idle";

  const mouth = isSpeaking ? "○" : isThinking ? "～" : "ω";

  return (
    <div className={`relative ${animClass}`}>
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700">
        <pre className="text-xs leading-snug select-none text-pink-400 whitespace-pre text-center" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          {` ┌─────┐\n（ ・${mouth}・ ）\n  U   U`}
        </pre>
      </div>
    </div>
  );
}

export default function Buddy({ buddyMessage, isThinking, dismissMessage }: BuddyProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear existing timers
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    if (buddyMessage) {
      setVisible(true);
      setFading(false);

      // Start fade after 5s
      fadeTimerRef.current = setTimeout(() => {
        setFading(true);
      }, 5000);

      // Dismiss after 6s (5s visible + 1s fade)
      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
        setFading(false);
        dismissMessage();
      }, 6000);
    } else {
      setVisible(false);
      setFading(false);
    }

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [buddyMessage, dismissMessage]);

  const handleBubbleClick = () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setVisible(false);
    setFading(false);
    dismissMessage();
  };

  return (
    <div className="relative flex items-center">
      {/* Speech bubble */}
      {visible && buddyMessage && (
        <div
          onClick={handleBubbleClick}
          className={`absolute right-full mr-2 max-w-[220px] rounded-xl px-3 py-2 text-sm cursor-pointer
            bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800
            text-zinc-800 dark:text-zinc-200 shadow-md
            ${fading ? "bubble-fade" : "bubble-pop"}`}
        >
          {buddyMessage}
          {/* Bubble tail */}
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 rotate-45
            bg-amber-50 dark:bg-amber-900/20 border-r border-t border-amber-200 dark:border-amber-800" />
        </div>
      )}

      {/* Character */}
      <BuddyCharacter isSpeaking={visible && !!buddyMessage} isThinking={isThinking} />
    </div>
  );
}
