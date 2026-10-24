import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const compress = promisify(gzip);
const decompress = promisify(gunzip);
const OWNER = "Zeile94";
const REPO = "BSZ-PAN-EHK";
const REF = process.env.LEARNING_MATERIALS_REF || "main";
const ROOT = "data";
const MODEL = "text-embedding-3-small";
const DIMENSIONS = 512;
const CHUNK_SIZE = 1400;
const OVERLAP = 200;
const BATCH_SIZE = 32;
const MAX_CHUNKS = 10000;
const MAX_COMPRESSED_BYTES = 40 * 1024 * 1024;
const MAX_JSON_BYTES = 160 * 1024 * 1024;
const directory = fileURLToPath(new URL("../.learning-index/", import.meta.url));
const target = fileURLToPath(new URL("../.learning-index/material-index.json.gz", import.meta.url));
const signal = AbortSignal.timeout(10 * 60 * 1000);
const started = Date.now();
let phase = "Vorbereitung";
let totalTokens = 0;
let temporary;

function log(message) {
  console.log(`[${((Date.now() - started) / 1000).toFixed(1)} s] ${message}`);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function inputFor(chunk) {
  return `${chunk.path}\n${chunk.text}`;
}

function validVector(value) {
  return Array.isArray(value) && value.length === DIMENSIONS &&
    value.every(Number.isFinite) && value.some(number => number !== 0);
}

function githubHeaders(raw = false) {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
    "User-Agent": "Hakan-Materialindex"
  };
}

async function request(url, options = {}, timeout = 30000) {
  signal.throwIfAborted();
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)])
  });
  const text = await response.text();
  if (!response.ok) {
    let code = "";
    try {
      const data = JSON.parse(text);
      code = data.error?.code || data.error?.type || "";
    } catch {}
    throw new Error(`Externer Dienst: HTTP ${response.status}${code ? ` (${code})` : ""}`);
  }
  return text;
}

function contentUrl(path, commit) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encoded}?ref=${encodeURIComponent(commit)}`;
}

async function sourceCommit() {
  const text = await request(
    `https://api.github.com/repos/${OWNER}/${REPO}/commits/${encodeURIComponent(REF)}`,
    { headers: githubHeaders() }
  );
  const data = JSON.parse(text);
  if (typeof data.sha !== "string" || !/^[a-f0-9]{40}$/i.test(data.sha)) {
    throw new Error("Der GitHub-Quellstand konnte nicht eindeutig bestimmt werden.");
  }
  return data.sha;
}

async function listFiles(path, commit) {
  const entries = JSON.parse(await request(contentUrl(path, commit), {
    headers: githubHeaders()
  }));
  if (!Array.isArray(entries)) throw new Error("Ungültige GitHub-Dateiliste.");
  if (entries.length >= 1000) {
    throw new Error("Verzeichnisgrenze der Contents-API erreicht; Vollständigkeit nicht gesichert.");
  }
  const files = [];
  for (const entry of entries) {
    if (entry.type === "dir") files.push(...await listFiles(entry.path, commit));
    else if (entry.type === "file" && entry.name.toLowerCase().endsWith(".txt")) {
      files.push({ path: entry.path, githubBlobSha: entry.sha });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function chunkText(text) {
  const value = String(text || "").replace(/\r\n/g, "\n").trim();
  const chunks = [];
  for (let start = 0; start < value.length;) {
    let end = Math.min(start + CHUNK_SIZE, value.length);
    if (end < value.length) {
      const boundary = value.lastIndexOf(" ", end);
      if (boundary > start + CHUNK_SIZE / 2) end = boundary;
    }
    const chunk = value.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end === value.length) break;
    start = Math.max(start + 1, end - OVERLAP);
  }
  return chunks;
}

async function existingVectors() {
  let buffer;
  try { buffer = await readFile(target); }
  catch (error) {
    if (error.code === "ENOENT") return new Map();
    throw error;
  }
  const previous = JSON.parse((await decompress(buffer, {
    maxOutputLength: MAX_JSON_BYTES
  })).toString("utf8"));
  const reusable = new Map();
  if (previous.schemaVersion !== 1 || previous.embeddingModel !== MODEL ||
      previous.dimensions !== DIMENSIONS || !Array.isArray(previous.chunks)) {
    log("Vorhandener Index nicht kompatibel; Embeddings werden neu erstellt.");
    return reusable;
  }
  for (const chunk of previous.chunks) {
    if (typeof chunk.path !== "string" || typeof chunk.text !== "string") continue;
    const key = hash(inputFor(chunk));
    if (chunk.inputHash === key && validVector(chunk.vector)) {
      reusable.set(key, chunk.vector);
    }
  }
  return reusable;
}

async function embed(inputs) {
  const data = JSON.parse(await request("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL, dimensions: DIMENSIONS, encoding_format: "float", input: inputs
    })
  }, 45000));
  totalTokens += data.usage?.total_tokens || 0;
  const vectors = new Array(inputs.length);
  for (const item of data.data || []) {
    if (Number.isInteger(item.index) && item.index >= 0 && item.index < inputs.length &&
        validVector(item.embedding)) vectors[item.index] = item.embedding;
  }
  for (let i = 0; i < inputs.length; i++) {
    if (!validVector(vectors[i])) throw new Error("Embedding-Antwort unvollständig oder ungültig.");
  }
  return vectors;
}

try {
  if (!process.env.GITHUB_TOKEN || !process.env.OPENAI_API_KEY) {
    throw new Error("GITHUB_TOKEN oder OPENAI_API_KEY fehlt.");
  }
  console.log("\n===== SUCHINDEX ERSTELLEN =====");
  console.log("Quelle:", `${OWNER}/${REPO}`, REF, ROOT);
  console.log("Ausgabe: .learning-index/material-index.json.gz");
  console.log("Der Index enthält Unterrichtstexte. Nicht in public ablegen.");

  phase = "Vorhandenen Index prüfen";
  const vectors = await existingVectors();
  log(`${vectors.size} wiederverwendbare Embeddings aus vorhandenem Index.`);

  phase = "GitHub-Quellstand bestimmen";
  const commit = await sourceCommit();
  log(`Fester Quellstand: ${commit.slice(0, 12)}`);

  phase = "Dateiliste abrufen";
  const files = await listFiles(ROOT, commit);
  if (!files.length) throw new Error("Keine TXT-Unterrichtsdateien gefunden.");
  log(`${files.length} TXT-Dateien gefunden.`);

  phase = "Unterrichtsdateien laden und aufteilen";
  const chunks = [];
  const manifest = [];
  let characters = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const text = await request(contentUrl(file.path, commit), {
      headers: githubHeaders(true)
    });
    const pieces = chunkText(text);
    characters += text.length;
    manifest.push({ ...file, textHash: hash(text), characters: text.length, chunks: pieces.length });
    pieces.forEach((text, section) => {
      const chunk = { path: file.path, section: section + 1, text };
      chunk.inputHash = hash(inputFor(chunk));
      chunks.push(chunk);
    });
    if (chunks.length > MAX_CHUNKS) throw new Error("Mehr als 10.000 Abschnitte; Abbruch vor API-Verarbeitung.");
    log(`Datei ${i + 1}/${files.length} geladen.`);
  }
  if (!chunks.length) throw new Error("Kein nutzbarer Unterrichtstext gefunden.");

  const missing = new Map();
  let reused = 0;
  for (const chunk of chunks) {
    if (vectors.has(chunk.inputHash)) reused++;
    else if (!missing.has(chunk.inputHash)) missing.set(chunk.inputHash, inputFor(chunk));
  }
  const jobs = [...missing.entries()];
  log(`${chunks.length} Abschnitte, ${reused} bereits verfügbar, ${jobs.length} neue eindeutige Embeddings.`);

  phase = "Neue Embeddings erstellen";
  for (let start = 0; start < jobs.length; start += BATCH_SIZE) {
    const batch = jobs.slice(start, start + BATCH_SIZE);
    const generated = await embed(batch.map(([, input]) => input));
    batch.forEach(([key], index) => vectors.set(key, generated[index]));
    log(`Embedding-Anfrage ${Math.floor(start / BATCH_SIZE) + 1}/${Math.ceil(jobs.length / BATCH_SIZE)} abgeschlossen.`);
  }

  phase = "Index vollständig prüfen und speichern";
  const indexed = chunks.map(chunk => {
    const vector = vectors.get(chunk.inputHash);
    if (!validVector(vector)) throw new Error("Fehlender Vektor; vorhandener Index bleibt unverändert.");
    return { ...chunk, vector };
  });
  const index = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source: { owner: OWNER, repo: REPO, ref: REF, commit, root: ROOT },
    embeddingModel: MODEL,
    dimensions: DIMENSIONS,
    chunkSize: CHUNK_SIZE,
    overlap: OVERLAP,
    fileCount: files.length,
    chunkCount: indexed.length,
    files: manifest,
    chunks: indexed
  };
  const raw = Buffer.from(JSON.stringify(index), "utf8");
  if (raw.length > MAX_JSON_BYTES) throw new Error("Index überschreitet das vorgesehene Größenlimit.");
  const packed = await compress(raw, { level: 6 });
  if (packed.length > MAX_COMPRESSED_BYTES) throw new Error("Komprimierter Index ist größer als 40 MiB.");
  signal.throwIfAborted();
  await mkdir(directory, { recursive: true });
  temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, packed, { flag: "wx", mode: 0o600 });
  await rename(temporary, target);
  temporary = undefined;

  console.log("\n===== INDEX ERFOLGREICH GESPEICHERT =====");
  console.log("Datei: .learning-index/material-index.json.gz");
  console.log("Quelldateien:", files.length);
  console.log("Zeichen:", characters);
  console.log("Textabschnitte:", indexed.length);
  console.log("Wiederverwendete Abschnitte:", reused);
  console.log("Neu erstellte eindeutige Embeddings:", jobs.length);
  console.log("Gemeldete Embedding-Tokens dieses Laufs:", totalTokens);
  console.log("Größe unkomprimiert (MiB):", (raw.length / 1024 / 1024).toFixed(2));
  console.log("Größe komprimiert (MiB):", (packed.length / 1024 / 1024).toFixed(2));
  console.log("Gesamtdauer (Sekunden):", ((Date.now() - started) / 1000).toFixed(1));
  console.log("Keine Zugangsdaten im Index gespeichert.");
  console.log("Quiz und Lernkarten verwenden den Index erst nach Anpassung des Materialmoduls.");
} catch (error) {
  if (temporary) await unlink(temporary).catch(() => {});
  console.error("\n===== INDEX-ERSTELLUNG ABGEBROCHEN =====");
  console.error("Phase:", phase);
  console.error("Fehlerart:", error.name);
  console.error("Meldung:", error.message);
  console.error("Gemeldete Embedding-Tokens:", totalTokens);
  console.error("Ein bereits vorhandener fertiger Index wurde nicht ersetzt.");
  process.exitCode = 1;
}
