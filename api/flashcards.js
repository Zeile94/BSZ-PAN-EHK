import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const directory = path.dirname(filename);
const cardsPath = path.join(directory, "..", "public", "flashcards.json");

let cache = null;
let cacheTime = 0;
const CACHE_MS = 60 * 1000;

export const config = { maxDuration: 30 };

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function loadCards() {
  if (cache && Date.now() - cacheTime < CACHE_MS) {
    return cache;
  }

  const raw = await readFile(cardsPath, "utf8");
  const data = JSON.parse(raw);

  if (data.schemaVersion !== 1) {
    throw new Error("Ungültige Lernkartendatei.");
  }

  cache = data;
  cacheTime = Date.now();
  return cache;
}

function findTopic(data, requestedTopic) {
  const wanted = normalize(requestedTopic);

  for (const grade of data.grades || []) {
    for (const subject of grade.subjects || []) {
      for (const field of subject.fields || []) {
        for (const topic of field.topics || []) {
          const topicId = normalize(topic.id);
          const topicTitle = normalize(topic.title);

          if (
            wanted === topicId ||
            wanted === topicTitle ||
            wanted.includes(topicId) ||
            wanted.includes(topicTitle)
          ) {
            return topic;
          }
        }
      }
    }
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Nur POST ist erlaubt." });
  }

  let body;

  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Ungültige Anfrage." });
  }

  const topic = String(body?.topic || "").trim();

  if (!topic || topic.length > 500) {
    return res.status(400).json({
      error: "Bitte ein Thema mit höchstens 500 Zeichen angeben."
    });
  }

  try {
    const data = await loadCards();
    const found = findTopic(data, topic);

    if (!found || !Array.isArray(found.cards) || !found.cards.length) {
      return res.status(422).json({
        error: "Für dieses Thema sind derzeit keine Lernkarten hinterlegt.",
        code: "NO_CARDS_AVAILABLE"
      });
    }

    return res.status(200).json({
      deck: {
        topic: found.title,
        cards: found.cards.map(card => ({
          question: card.front,
          answer: card.back
        }))
      },
      materialContext: {
        basis: "stored_cards",
        materialUsed: true,
        materialState: "sufficient",
        materialUnavailable: false,
        materialErrorCode: null,
        materialSearch: {
          completed: true,
          matchingChunks: found.cards.length,
          candidateCount: found.cards.length,
          relevantCount: found.cards.length,
          initiallySufficient: true,
          reason: "Feste Lernkartenbibliothek"
        },
        materialFiles: [],
        materialReferences: [],
        webSearchUsed: false,
        webSearchPerformed: false,
        webSearchReason: null,
        researchedAt: null,
        currentCheckRequired: false,
        currentCheckPerformed: false,
        sourceUsage: {
          materialBasedTasks: found.cards.length,
          webBasedTasks: 0
        },
        message: "Alle hinterlegten Lernkarten zu diesem Thema wurden geladen. Keine Internetrecherche.",
        sources: []
      },
      sources: []
    });
  } catch (error) {
    console.error("Lernkarten konnten nicht geladen werden:", error);
    return res.status(503).json({
      error: "Die Lernkarten konnten gerade nicht geladen werden. Bitte später erneut versuchen."
    });
  }
}