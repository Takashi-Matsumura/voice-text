export type DictionaryEntry = {
  id: string;
  patterns: string[];
  replacement: string;
  enabled: boolean;
};

export type TextSegment = {
  text: string;
  original?: string; // present only if this segment was replaced by dictionary
};

/**
 * Apply dictionary replacements to transcribed text.
 * Returns the replaced string and segment info for highlighting.
 */
export function applyDictionary(
  text: string,
  entries: DictionaryEntry[]
): { text: string; segments: TextSegment[] } {
  const pairs: { pattern: string; replacement: string }[] = [];
  for (const entry of entries) {
    if (!entry.enabled) continue;
    for (const pattern of entry.patterns) {
      if (pattern) pairs.push({ pattern, replacement: entry.replacement });
    }
  }
  pairs.sort((a, b) => b.pattern.length - a.pattern.length);

  // Build segments by finding all replacements with their positions
  // We work on the original text and track replacement ranges
  type Replacement = { start: number; end: number; original: string; replacement: string };
  const replacements: Replacement[] = [];

  let working = text;
  for (const { pattern, replacement } of pairs) {
    let searchFrom = 0;
    while (true) {
      const idx = working.indexOf(pattern, searchFrom);
      if (idx === -1) break;
      // Check no overlap with existing replacements
      const overlaps = replacements.some(
        (r) => idx < r.end && idx + pattern.length > r.start
      );
      if (!overlaps) {
        replacements.push({
          start: idx,
          end: idx + pattern.length,
          original: pattern,
          replacement,
        });
      }
      searchFrom = idx + pattern.length;
    }
  }

  if (replacements.length === 0) {
    return { text, segments: [{ text }] };
  }

  // Sort by position
  replacements.sort((a, b) => a.start - b.start);

  // Build segments and result text
  const segments: TextSegment[] = [];
  let resultText = "";
  let pos = 0;

  for (const r of replacements) {
    if (r.start > pos) {
      const plain = text.slice(pos, r.start);
      segments.push({ text: plain });
      resultText += plain;
    }
    segments.push({ text: r.replacement, original: r.original });
    resultText += r.replacement;
    pos = r.end;
  }

  if (pos < text.length) {
    const tail = text.slice(pos);
    segments.push({ text: tail });
    resultText += tail;
  }

  return { text: resultText, segments };
}
