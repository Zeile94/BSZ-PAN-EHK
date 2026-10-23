import { createHash } from "node:crypto";

const GITHUB_OWNER = "Zeile94";
const GITHUB_REPO = "BSZ-PAN-EHK";
const GITHUB_BRANCH = "main";
const GITHUB_DATA_PATH = "data";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 512;

const CACHE_DURATION_MS = 60 * 60 * 1000;
const MAX_INDEX_CHUNKS = 10000;

const DEFAULT_MIN_SCORE = 0.25;
const DEFAULT_MAX_PASSAGES = 18;

let cachedIndex = null;
let cachedIndexTime = 0;
let indexPromise = null;

const embeddingCache = new Map();

export class LearningError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "LearningError";
    this.status = status;
  }
}

function configuredMinScore() {
  const raw = process.env.LEARNING_MIN_SCORE;

  if (raw === undefined || raw === "") {
    return DEFAULT_MIN_SCORE;
  }

  const value = Number(raw);

  return Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
      ? value
      : DEFAULT_MIN_SCORE;
}

async function requestJson(
  url,
  options = {},
  timeoutMs = 45000
) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new LearningError(
        "Ein externer Dienst hat keine lesbare Antwort geliefert.",
        502
      );
    }

    if (!response.ok) {
      console.error(
        "Lernmaterialien: externer Dienst",
        response.status
      );

      throw new LearningError(
        "Die Unterrichtsmaterialien konnten gerade nicht verarbeitet werden.",
        502
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new LearningError(
        "Die Materialverarbeitung hat zu lange gedauert. Bitte erneut versuchen.",
        504
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function githubUrl(filePath) {
  const encodedPath = filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return (
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${encodedPath}` +
    `?ref=${encodeURIComponent(GITHUB_BRANCH)}`
  );
}

function githubHeaders(raw = false) {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: raw
      ? "application/vnd.github.raw+json"
      : "application/vnd.github+json",
    "User-Agent": "CWE-Learning-Cards"
  };
}

async function listTxtFiles(directory) {
  const entries = await requestJson(
    githubUrl(directory),
    {
      headers: githubHeaders()
    }
  );

  if (!Array.isArray(entries)) {
    throw new LearningError(
      "Das GitHub-Materialverzeichnis konnte nicht gelesen werden.",
      502
    );
  }

  const files = [];

  for (const entry of entries) {
    if (entry.type === "dir") {
      files.push(
        ...await listTxtFiles(entry.path)
      );
    } else if (
      entry.type === "file" &&
      entry.name.toLowerCase().endsWith(".txt")
    ) {
      files.push({
        path: entry.path,
        name: entry.name
      });
    }
  }

  return files;
}

async function readGithubText(filePath) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    30000
  );

  try {
    const response = await fetch(
      githubUrl(filePath),
      {
        headers: githubHeaders(true),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      console.error(
        "Lernmaterialien: GitHub-Datei HTTP",
        response.status
      );

      throw new LearningError(
        "Eine Unterrichtsmaterialdatei konnte nicht geladen werden.",
        502
      );
    }

    return await response.text();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new LearningError(
        "Das Laden der Unterrichtsmaterialien hat zu lange gedauert.",
        504
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function chunkText(
  text,
  size = 1400,
  overlap = 200
) {
  const value = String(text || "")
    .replace(/\r\n/g, "\n")
    .trim();

  const chunks = [];

  for (let start = 0; start < value.length;) {
    let end = Math.min(
      start + size,
      value.length
    );

    if (end < value.length) {
      const boundary = value.lastIndexOf(
        " ",
        end
      );

      if (boundary > start + size / 2) {
        end = boundary;
      }
    }

    const chunk = value
      .slice(start, end)
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end === value.length) {
      break;
    }

    start = Math.max(
      start + 1,
      end - overlap
    );
  }

  return chunks;
}

function hashText(text) {
  return createHash("sha256")
    .update(text)
    .digest("hex");
}

async function embedTexts(texts) {
  const result = new Array(texts.length);
  const missing = [];

  texts.forEach((text, index) => {
    const key = hashText(text);

    if (embeddingCache.has(key)) {
      result[index] = embeddingCache.get(key);
    } else {
      missing.push({
        text,
        index,
        key
      });
    }
  });

  for (
    let start = 0;
    start < missing.length;
    start += 32
  ) {
    const batch = missing.slice(
      start,
      start + 32
    );

    const data = await requestJson(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          dimensions: EMBEDDING_DIMENSIONS,
          encoding_format: "float",
          input: batch.map(item => item.text)
        })
      },
      60000
    );

    for (const item of data.data || []) {
      const original = batch[item.index];

      if (
        !original ||
        !Array.isArray(item.embedding)
      ) {
        continue;
      }

      result[original.index] =
        item.embedding;

      embeddingCache.set(
        original.key,
        item.embedding
      );
    }
  }

  if (
    result.some(vector =>
      !Array.isArray(vector)
    )
  ) {
    throw new LearningError(
      "Die Materialsuche konnte nicht vollständig vorbereitet werden.",
      502
    );
  }

  return result;
}

function cosineSimilarity(a, b) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length !== b.length
  ) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  const denominator =
    Math.sqrt(normA) * Math.sqrt(normB);

  return denominator
    ? dot / denominator
    : 0;
}

async function rebuildIndex() {
  const files = await listTxtFiles(
    GITHUB_DATA_PATH
  );

  if (!files.length) {
    throw new LearningError(
      "Im Materialverzeichnis wurden keine TXT-Unterrichtsmaterialien gefunden.",
      503
    );
  }

  const chunks = [];

  for (const file of files) {
    const text = await readGithubText(
      file.path
    );

    const parts = chunkText(text);

    parts.forEach((content, index) => {
      chunks.push({
        file: file.path,
        section: index + 1,
        text: content
      });
    });

    if (chunks.length > MAX_INDEX_CHUNKS) {
      throw new LearningError(
        "Der Materialbestand ist für diesen Arbeitsspeicher-Index zu groß.",
        503
      );
    }
  }

  if (!chunks.length) {
    throw new LearningError(
      "Die Unterrichtsmaterialien enthalten keinen auswertbaren Text.",
      503
    );
  }

  const vectors = await embedTexts(
    chunks.map(chunk =>
      `${chunk.file}\n${chunk.text}`
    )
  );

  const newIndex = chunks.map(
    (chunk, index) => ({
      ...chunk,
      vector: vectors[index]
    })
  );

  cachedIndex = newIndex;
  cachedIndexTime = Date.now();

  console.log(
    "Lernmaterialindex bereit:",
    files.length,
    "Dateien,",
    newIndex.length,
    "Abschnitte"
  );

  return newIndex;
}

async function getIndex() {
  if (!process.env.GITHUB_TOKEN) {
    throw new LearningError(
      "Die Verbindung zu den Unterrichtsmaterialien ist noch nicht eingerichtet.",
      503
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new LearningError(
      "Der KI-Dienst ist noch nicht eingerichtet.",
      503
    );
  }

  if (
    cachedIndex &&
    Date.now() - cachedIndexTime <
      CACHE_DURATION_MS
  ) {
    return cachedIndex;
  }

  if (!indexPromise) {
    indexPromise = rebuildIndex()
      .finally(() => {
        indexPromise = null;
      });
  }

  return indexPromise;
}

export async function findLearningMaterial(
  topic,
  maxPassages = DEFAULT_MAX_PASSAGES
) {
  const index = await getIndex();

  const [queryVector] = await embedTexts([
    topic.slice(0, 500)
  ]);

  const minScore = configuredMinScore();

  const matches = index
    .map(chunk => ({
      text: chunk.text,
      file: chunk.file,
      section: chunk.section,
      score: cosineSimilarity(
        queryVector,
        chunk.vector
      )
    }))
    .sort((a, b) => b.score - a.score)
    .filter(item => item.score >= minScore)
    .slice(0, maxPassages);

  if (!matches.length) {
    throw new LearningError(
      "Zu diesem Thema wurden keine ausreichend passenden Unterrichtsmaterialien gefunden. Bitte formuliere das Thema genauer.",
      422
    );
  }

  return {
    passages: matches.map((match, index) => ({
      id: `M${index + 1}`,
      text: match.text
    })),

    passageCount: matches.length
  };
}

export function validSourceIds(
  sourceIds,
  passages
) {
  if (
    !Array.isArray(sourceIds) ||
    !sourceIds.length ||
    new Set(sourceIds).size !==
      sourceIds.length
  ) {
    return false;
  }

  const allowedIds = new Set(
    passages.map(passage => passage.id)
  );

  return sourceIds.every(id =>
    allowedIds.has(id)
  );
}

export function parseRequestBody(value) {
  return typeof value === "string"
    ? JSON.parse(value)
    : value;
}

export function extractOutputText(data) {
  return (data.output || [])
    .filter(item =>
      item.type === "message"
    )
    .flatMap(item =>
      item.content || []
    )
    .filter(part =>
      part.type === "output_text"
    )
    .map(part =>
      part.text || ""
    )
    .join("\n")
    .trim();
}

export async function generateLearningJson({
  instructions,
  input,
  schema,
  schemaName,
  maxOutputTokens = 6000
}) {
  const data = await requestJson(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization:
          `Bearer ${process.env.OPENAI_API_KEY}`
      },

      body: JSON.stringify({
        model: "gpt-5-mini",
        store: false,

        reasoning: {
          effort: "low"
        },

        instructions,
        input: JSON.stringify(input),

        max_output_tokens: maxOutputTokens,

        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema
          }
        }
      })
    },
    90000
  );

  if (data.status !== "completed") {
    throw new LearningError(
      "Das Lernangebot wurde nicht vollständig erzeugt. Bitte erneut oder mit weniger Karten versuchen.",
      502
    );
  }

  let result;

  try {
    result = JSON.parse(
      extractOutputText(data)
    );
  } catch {
    throw new LearningError(
      "Der KI-Dienst hat kein gültiges Lernangebot geliefert.",
      502
    );
  }

  return result;
}

export function sendLearningError(
  res,
  error
) {
  console.error(
    "Lernangebot:",
    error.name,
    error instanceof LearningError
      ? error.message
      : "Unerwarteter Fehler"
  );

  const status =
    error instanceof LearningError
      ? error.status
      : 500;

  const message =
    error instanceof LearningError
      ? error.message
      : "Das Lernangebot konnte gerade nicht erstellt werden.";

  return res.status(status).json({
    error: message
  });
}
