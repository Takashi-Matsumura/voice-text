import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { DictionaryEntry } from "../../lib/applyDictionary";

const DICT_PATH = join(process.cwd(), "dictionary.json");

type DictionaryData = { entries: DictionaryEntry[] };

async function readDict(): Promise<DictionaryData> {
  try {
    const raw = await readFile(DICT_PATH, "utf-8");
    return JSON.parse(raw) as DictionaryData;
  } catch {
    return { entries: [] };
  }
}

async function writeDict(data: DictionaryData): Promise<void> {
  await writeFile(DICT_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function GET() {
  const data = await readDict();
  return Response.json(data);
}

// PUT: replace entire dictionary
export async function PUT(req: Request) {
  const body = (await req.json()) as DictionaryData;
  await writeDict(body);
  return Response.json(body);
}

// POST: add a single entry
export async function POST(req: Request) {
  const { patterns, replacement } = (await req.json()) as {
    patterns: string[];
    replacement: string;
  };
  const data = await readDict();
  const entry: DictionaryEntry = {
    id: crypto.randomUUID(),
    patterns,
    replacement,
    enabled: true,
  };
  data.entries.push(entry);
  await writeDict(data);
  return Response.json(entry);
}

// DELETE: remove an entry by id
export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: string };
  const data = await readDict();
  data.entries = data.entries.filter((e) => e.id !== id);
  await writeDict(data);
  return Response.json({ ok: true });
}
